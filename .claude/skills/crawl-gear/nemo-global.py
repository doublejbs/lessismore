#!/usr/bin/env python3
# nemoequipment.com(글로벌) 제품 상세의 서버렌더 스펙 표를 파싱해 우리 schema 행으로 변환.
# 제품군 = 변형(사이즈) 표 → 변형마다 1행. 한국 제품명(KOR_MAP)을 매칭해 nameKorean 추가.
# 사용: python3 nemo-global.py <config.json> <out.json>
#   config = {"category":"mat","slugs":[...],"korMap":{slug:"한글명"},"typeMap":{slug:"타입"}}
import html
import json
import re
import subprocess
import sys
import time

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
BASE = "https://www.nemoequipment.com"


def fetch(url):
    # Shopify/Cloudflare WAF 가 urllib 의 TLS/헤더 지문을 403 으로 차단한다.
    # curl(브라우저 UA)로 받으면 통과 → subprocess 로 위임.
    # 429(rate limit) 는 지수 백오프로 재시도. 매 요청 사이 짧은 딜레이.
    time.sleep(0.8)
    last = ""
    for attempt in range(5):
        out = subprocess.run(
            ["curl", "-sS", "-f", "-A", UA, "-H", "Accept-Language: en-US,en;q=0.9", url],
            capture_output=True,
            timeout=60,
        )
        if out.returncode == 0:
            return out.stdout.decode("utf-8", "replace")
        last = out.stderr.decode("utf-8", "replace")[:200]
        if "429" in last:
            time.sleep(3 * (attempt + 1))
            continue
        break
    raise RuntimeError(last or "curl failed")


def strip(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s))).strip()


def meta(htmltext, prop):
    m = re.search(r'<meta[^>]+property=["\']' + prop + r'["\'][^>]+content=["\']([^"\']+)', htmltext)
    if not m:
        m = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']' + prop + r'["\']', htmltext)
    return m.group(1) if m else ""


def parse_product(htmltext):
    title = strip(meta(htmltext, "og:title")) or strip(re.search(r"<title>(.*?)</title>", htmltext, re.S).group(1) if re.search(r"<title>(.*?)</title>", htmltext, re.S) else "")
    title = re.sub(r"\s*[|–-]\s*NEMO.*$", "", title).strip()
    img = meta(htmltext, "og:image").split("?")[0]
    variants = []
    for tb in re.findall(r"<table[^>]*>(.*?)</table>", htmltext, re.S):
        variant = ""
        specs = {}
        is_spec = False
        for r in re.findall(r"<tr[^>]*>(.*?)</tr>", tb, re.S):
            cells = [strip(c) for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", r, re.S)]
            if len(cells) >= 2 and cells[0] == "Specs":
                variant = cells[1]
                is_spec = True
            elif len(cells) >= 2 and cells[0]:
                specs[cells[0]] = cells[1]
        if is_spec or "Minimum Weight" in specs or "R-Value" in specs:
            variants.append({"variant": variant, "specs": specs})
    return title, img, variants


def grams(s):
    # NEMO 표기는 "임페리얼 / 메트릭" (예: "1 lb 3 oz / 530 g", "2 lb 14 oz / 1.3 kg").
    # 슬래시 뒤 메트릭 값을 우선 사용.
    m = re.search(r"/\s*([\d.]+)\s*kg", s)
    if m:
        return round(float(m.group(1)) * 1000)
    m = re.search(r"/\s*([\d.]+)\s*g\b", s)
    if m:
        return round(float(m.group(1)))
    m = re.search(r"(\d+)\s*lb\s*(\d+)\s*oz", s)
    if m:
        return round(int(m.group(1)) * 453.6 + int(m.group(2)) * 28.35)
    m = re.search(r"([\d.]+)\s*oz", s)
    if m:
        return round(float(m.group(1)) * 28.35)
    return 0


def pick_weight(specs):
    # 텐트/침낭/매트는 "Minimum Weight"(트레일 무게)를 표준으로 우선.
    # 없으면 Packed Weight → Weight → Set Weight 순으로 폴백(스테이크/샤워/블랭킷 등).
    for label in ("Minimum Weight", "Packed Weight", "Weight", "Set Weight"):
        for k, v in specs.items():
            if k.strip().lower() == label.lower():
                g = grams(v)
                if g:
                    return g
    return 0


def in_to_mm(s):
    m = re.search(r"([\d.]+)\s*in", s)
    if m:
        return round(float(m.group(1)) * 25.4)
    m = re.search(r"([\d.]+)\s*cm", s)
    if m:
        return round(float(m.group(1)) * 10)
    return ""


SHAPE_KOR = {"mummy": "머미", "rectangular": "직사각", "tapered": "테이퍼드", "semi-rectangular": "세미직사각"}


def slugify(name):
    return "nemo_" + re.sub(r"[^a-z0-9가-힣]+", "-", re.sub(r"™|®", "", name).strip().lower()).strip("-")


def mat_type(title):
    t = title.lower()
    if "self-inflating" in t or "self inflating" in t:
        return "자동팽창"
    if "switchback" in t or "foam" in t:
        return "폼"
    if "non-insulated" in t:
        return "에어(비단열)"
    if "insulated" in t:
        return "인슐레이티드 에어"
    return "에어"


def build_mat(slug, title, img, variants, kor, ptype):
    rows = []
    for v in variants:
        s = v["specs"]
        sp = {"type": mat_type(title)}
        if s.get("Shape"):
            sp["shape"] = SHAPE_KOR.get(s["Shape"].lower(), s["Shape"])
        if s.get("Fabric"):
            sp["material"] = s["Fabric"]
        if s.get("R-Value"):
            try:
                sp["rValue"] = float(s["R-Value"])
            except ValueError:
                pass
        if s.get("Thickness"):
            t = in_to_mm(s["Thickness"])
            if t:
                sp["thickness"] = t
        if s.get("Dimensions"):
            sp["openSize"] = s["Dimensions"]
        elif s.get("Length") and s.get("Width"):
            sp["openSize"] = f"{s['Length']} x {s['Width']}"
        rows.append({
            "groupId": slugify(kor or title),
            "category": "mat",
            "company": "nemo",
            "companyKorean": "니모",
            "name": re.sub(r"™|®", "", title),
            "nameKorean": kor,
            "color": s.get("Color", ""),
            "colorKorean": "",
            "size": v["variant"],
            "sizeKorean": "",
            "weight": pick_weight(s),
            "imageUrl": img,
            "specs": sp,
            "_source": BASE + "/products/" + slug,
        })
    return rows


def make_row(slug, title, img, variant, color, weight, cat, kor, specs):
    return {
        "groupId": slugify(kor or title),
        "category": cat,
        "company": "nemo",
        "companyKorean": "니모",
        "name": re.sub(r"™|®", "", title),
        "nameKorean": kor,
        "color": color,
        "colorKorean": "",
        "size": variant,
        "sizeKorean": "",
        "weight": weight,
        "imageUrl": img,
        "specs": {k: v for k, v in specs.items() if v not in ("", None)},
        "_source": BASE + "/products/" + slug,
    }


def mm_max(*vals):
    best = ""
    for val in vals:
        m = re.search(r"([\d,]+)\s*mm", val or "")
        if m:
            n = int(m.group(1).replace(",", ""))
            if best == "" or n > best:
                best = n
    return best


def build_tent(slug, title, img, variants, kor, cat):
    rows = []
    for v in variants:
        s = v["specs"]
        cap = ""
        m = re.search(r"(\d+)", s.get("Capacity", ""))
        if m:
            cap = int(m.group(1))
        wp = mm_max(s.get("Rainfly Fabric", ""), s.get("Floor Fabric", ""))
        canopy = s.get("Canopy Fabric", "")
        fly = re.sub(r"\s*\([^)]*mm[^)]*\)", "", s.get("Rainfly Fabric", "")).strip()
        free = s.get("Freestanding", "")
        sp = {
            "capacity": cap,
            "wallStructure": "더블월" if canopy and fly else "",
            "innerMaterial": canopy,
            "flyMaterial": fly,
            "poleMaterial": "",
            "waterproofRating": wp,
            "pitchType": "자립형" if "free" in free.lower() else free,
            "vestibuleArea": s.get("Vestibule Area", ""),
        }
        rows.append(make_row(slug, title, img, v["variant"], s.get("Color", ""),
                             pick_weight(s), cat, kor, sp))
    return rows


def celsius(s):
    m = re.search(r"(-?\d+)\s*C", s or "")
    return int(m.group(1)) if m else ""


def build_bag(slug, title, img, variants, kor, cat):
    is_down = "down" in (slug + title).lower()
    shape = "퀼트" if "quilt" in title.lower() else ("머미" if "mummy" in title.lower() else "머미")
    rows = []
    for v in variants:
        s = v["specs"]
        fp = ""
        m = re.search(r"(\d+)\s*FP", s.get("Fill Type", ""))
        if m:
            fp = int(m.group(1))
        zl = s.get("Zipper Location", "")
        zk = {"left": "좌", "right": "우"}.get(zl.lower(), zl)
        sp = {
            "shape": shape,
            "fillMaterial": "down" if is_down else "synthetic",
            "fillWeight": grams(s.get("Fill Weight", "")),
            "fillPower": fp,
            "comfortTemp": celsius(s.get("ISO Comfort", "")),
            "limitTemp": celsius(s.get("ISO Limit", "")),
            "zipperSide": zk,
        }
        rows.append(make_row(slug, title, img, v["variant"], s.get("Color", ""),
                             pick_weight(s), cat, kor, sp))
    return rows


def find_key(s, *needles):
    for k, v in s.items():
        if any(n.lower() in k.lower() for n in needles):
            return v
    return ""


def build_furniture(slug, title, img, variants, kor, cat):
    rows = []
    for v in variants:
        s = v["specs"]
        load = find_key(s, "Max Load", "Maximum Weight", "Capacity", "Weight Capacity")
        if cat == "table":
            sp = {
                "topMaterial": find_key(s, "Top", "Tabletop"),
                "frameMaterial": s.get("Frame", ""),
                "maxLoad": load,
                "packedSize": s.get("Packed Size", ""),
                "isHeightAdjustable": "adjustable" in (title.lower()),
            }
        else:
            sp = {
                "material": find_key(s, "Fabric", "Seat"),
                "frameMaterial": s.get("Frame", ""),
                "maxLoad": load,
                "packedSize": s.get("Packed Size", ""),
            }
        rows.append(make_row(slug, title, img, v["variant"], s.get("Color", ""),
                             pick_weight(s), cat, kor, sp))
    return rows


def yn(s):
    return s.strip().lower() in ("yes", "true")


def build_pack(slug, title, img, variants, kor, cat):
    gender = "male" if "men" in slug and "women" not in slug else ("female" if "women" in slug else "unisex")
    rows = []
    for v in variants:
        s = v["specs"]
        vol = ""
        m = re.search(r"(\d+)\s*L", s.get("Volume", ""))
        if m:
            vol = int(m.group(1))
        hip = find_key(s, "Hip Belt")
        if cat == "backpack":
            sp = {
                "volume": vol,
                "material": find_key(s, "Fabric", "Main Material"),
                "frameType": find_key(s, "Frame"),
                "backSystem": find_key(s, "Back System", "Suspension"),
                "hasHipBelt": bool(hip) and hip.strip() not in ("0", "No", ""),
                "hasShoulderBottlePocket": False,
                "hasRainCover": yn(find_key(s, "Rain Cover", "Raincover")),
                "gender": gender,
            }
        else:  # pouch/duffel/backpack_cover
            if not vol:
                m2 = re.search(r"(\d+)\s*(?:-?\s*l(?:iter)?\b|L\b)", slug + " " + title, re.I)
                if m2:
                    vol = int(m2.group(1))
            sp = {
                "material": find_key(s, "Fabric", "Main Material"),
                "isWaterproof": yn(s.get("Waterproof", "")),
                "capacity": vol,
            }
        rows.append(make_row(slug, title, img, v["variant"], s.get("Color", ""),
                             pick_weight(s), cat, kor, sp))
    return rows


def build_simple(slug, title, img, variants, kor, cat):
    # pillow / etc / towel 등: material + size 만
    rows = []
    for v in variants:
        s = v["specs"]
        sp = {
            "material": find_key(s, "Fabric", "Material"),
            "size": s.get("Dimensions", "") or s.get("Packed Size", ""),
        }
        rows.append(make_row(slug, title, img, v["variant"], s.get("Color", ""),
                             pick_weight(s), cat, kor, sp))
    return rows


def main():
    cfg = json.load(open(sys.argv[1]))
    out_path = sys.argv[2]
    cat = cfg["category"]
    kor_map = cfg.get("korMap", {})
    type_map = cfg.get("typeMap", {})
    cat_map = cfg.get("catMap", {})  # 슬러그별 카테고리 오버라이드(풋프린트→tent_acc 등)
    rows = []
    for slug in cfg["slugs"]:
        try:
            title, img, variants = parse_product(fetch(BASE + "/products/" + slug))
        except Exception as e:
            print(f"FAIL {slug}: {e}")
            continue
        c = cat_map.get(slug, cat)
        kor = kor_map.get(slug, "")
        print(f"{slug}: {title} ({len(variants)} var) -> {c} kor={kor}")
        if c == "mat":
            rows += build_mat(slug, title, img, variants, kor, type_map.get(slug, ""))
        elif c in ("tent", "shelter", "tarp"):
            rows += build_tent(slug, title, img, variants, kor, c)
        elif c == "sleeping_bag":
            rows += build_bag(slug, title, img, variants, kor, c)
        elif c in ("chair", "table"):
            rows += build_furniture(slug, title, img, variants, kor, c)
        elif c in ("backpack", "pouch", "backpack_cover"):
            rows += build_pack(slug, title, img, variants, kor, c)
        elif c in ("pillow", "towel", "etc", "tent_acc"):
            rows += build_simple(slug, title, img, variants, kor, c)
        else:
            # 폴백: 무게+색상만
            for v in variants:
                s = v["specs"]
                rows.append(make_row(slug, title, img, v["variant"], s.get("Color", ""),
                                     pick_weight(s), c, kor, {}))
    json.dump(rows, open(out_path, "w"), ensure_ascii=False, indent=2)
    print(f"\n{len(rows)} rows -> {out_path}")


if __name__ == "__main__":
    main()
