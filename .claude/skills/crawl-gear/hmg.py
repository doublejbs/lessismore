#!/usr/bin/env python3
# 하이퍼라이트마운틴기어(HMG) 크롤 — Cafe24 한국 공식(hyperlitemountaingear.co.kr).
#  - 제품명 한글(정션 WD 등). 스펙은 상세 'SPECS & DIMENSIONS' 텍스트 블록.
#  - 볼륨별(40L/55L) 소재·무게(색상별 '무게-White 832.7g')·치수. 색상=무게 라인에서 파생.
#  - 변형: 볼륨(=사이즈) × 색상. Torso Length(핏 옵션)·애드온 포켓 옵션은 접음.
#  - 무게 소수점 유지(반올림 금지).
# 사용: python3 hmg.py out/hmg-FINAL.json [카테고리slug/no ...]
import html
import json
import re
import subprocess
import sys
import time

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
BASE = "https://hyperlitemountaingear.co.kr"

CATS = [("packs/24", "backpack"), ("shelterstents/25", "shelter"),
        ("stuffsacks/27", "pouch"), ("accessories/42", None)]

COLOR_KOR = {"white": "화이트", "black": "블랙", "green": "그린", "olive": "올리브", "grey": "그레이",
             "gray": "그레이", "tan": "탄", "orange": "오렌지", "blue": "블루", "red": "레드",
             "navy": "네이비", "spruce": "스프루스", "bone": "본"}
COLOR_KO = {"white": "화이트", "black": "블랙", "green": "그린", "olive": "올리브", "grey": "그레이",
            "spruce": "스프루스", "tan": "탄", "bone": "본"}


def curl(url):
    time.sleep(0.05)
    for _ in range(3):
        out = subprocess.run(["curl", "-sS", "-m", "30", "-A", UA, url], capture_output=True, timeout=35)
        if out.returncode == 0:
            return out.stdout.decode("utf-8", "replace")
        time.sleep(1)
    return ""


# 영문 제품명 매핑(hyperlitemountaingear.com 영문사이트 대조). KR 토큰 → EN.
KO_EN = {
    "정션": "Junction", "사우스웨스트": "Southwest", "윈드라이더": "Windrider", "언바운드": "Unbound",
    "애스펙트": "Aspect", "에어로": "Aero", "버텍스": "Vertex", "데이브레이크": "Daybreak",
    "페미루프": "Pemi", "노스림": "NorthRim", "아이스": "Ice", "포터": "Porter", "엘리베이트": "Elevate",
    "웨이포인트": "Waypoint", "프리즘": "Prism", "버사": "Versa", "바이스": "Vice", "서미트": "Summit",
    "울타미드": "UltaMid", "미드": "Mid", "크로스피크": "CrossPeak", "프리즘": "Prism",
    # 구조·부속어
    "그라운드": "Ground", "클로스": "Cloth", "인서트": "Insert", "하프": "Half", "바닥": "Bottomless",
    "없는": "", "없이": "", "메쉬": "Mesh", "팟": "Pod", "카메라": "Camera", "사이드": "Side",
    "엔트리": "Entry", "지피": "Zippy", "리팩": "RePack", "스터프": "Stuff", "색": "Sack",
    "필로우": "Pillow", "포켓": "Pocket", "블랙": "Black", "월렛": "Wallet", "미니멀리스트": "Minimalist",
    "리무버블": "Removable", "힙": "Hip", "벨트": "Belt", "가슴": "Chest", "스트랩": "Strap",
    "숄더": "Shoulder", "보틀": "Bottle", "인사이드": "Inside", "액세서리": "Accessory",
    "마이크로": "Micro", "카라비너": "Carabiner", "아이언": "Iron", "와이어": "wire", "인슐레이터": "Insulator",
    "다이니마": "Dyneema", "더플": "Duffel", "백": "Bag", "어프로치": "Approach", "리버": "River",
    "레스큐": "Rescue", "쓰로우": "Throw", "토트백": "Tote", "에센셜": "Essential", "우산": "Umbrella",
    "리퍼포즈": "Repurpose", "날진": "Nalgene", "퍼포즈": "Purpose", "빌트": "Built", "워터보틀": "Water Bottle",
    "홀더": "Holder", "카본": "Carbon", "텐트": "Tent", "폴": "Poles", "알루미늄": "Aluminum",
    "스테이크": "Stake", "펙": "", "가이라인": "Guyline", "코어": "Core", "온도계": "Thermometer",
    "야광": "Glow", "더": "The", "롤-탑": "Roll-Top", "팩": "Pack", "인": "", "빌트": "Built",
    "트레일": "Trail", "그레이": "Grey", "블루": "Blue", "바닥없는": "Bottomless", "화이트": "White",
    "퍼포즈빌트": "Purpose Built",
}


def english_name(kr):
    kr = re.sub(r"([가-힣])(\d)", r"\1 \2", kr)  # '울타미드2' → '울타미드 2'
    kr = re.sub(r"\(펙\)|\(pack\)", "", kr)
    out = [KO_EN.get(w, w) for w in kr.split()]
    return re.sub(r"\s+", " ", " ".join(o for o in out if o)).strip()


def slugify(name):
    return "hmg_" + re.sub(r"[^a-z0-9가-힣]+", "-", re.sub(r"[®™()]", " ", name).strip().lower()).strip("-")


def classify(name, base):
    n = name.lower()
    if base == "shelter":
        if re.search(r"타프|tarp", n):
            return "tarp"
        if re.search(r"텐트|tent|디리고|dirigo|미드|플랫", n) and not re.search(r"울타미드|ultamid|피라미드", n):
            return "tent"
        return "shelter"
    if base:
        return base
    # accessories: 이름으로
    if re.search(r"파우치|pouch|스터프|stuff|포드|pod|팩\s*포켓|보틀\s*포켓|케이스|주머니", n):
        return "pouch"
    if re.search(r"필로우|pillow|베개", n):
        return "pillow"
    return "etc"


def color_en(ko_or_en):
    m = {"화이트": "White", "블랙": "Black", "그린": "Green", "올리브": "Olive", "스프루스": "Spruce",
         "그레이": "Grey", "탄": "Tan", "본": "Bone"}
    return m.get(ko_or_en, ko_or_en)


COLOR_RE = re.compile(r"(White|Black|Green|Olive|Grey|Gray|Spruce|Tan|Bone|화이트|블랙|그린|올리브|스프루스|탄|본)", re.I)


def _weights(seg):
    """무게-White / 무게(화이트) / 무게(가이라인 포함) 530g / 무게 739.9g → {color_en: g}.
    '적재무게'(하중) 제외. 색상은 알려진 색상어일 때만(괄호주석은 무시). 소수점 유지."""
    ws = {}
    for cm in re.finditer(r"(?<!적재)무게([^\dg]{0,22}?)([\d.]+)\s*g", seg):
        label, w = cm.group(1), float(cm.group(2))
        if not (5 <= w <= 8000):
            continue
        mcol = COLOR_RE.search(label)
        col = color_en(mcol.group(1).title()) if mcol else ""
        ws[col] = w
    return ws


def parse_specs(t, name):
    """SPECS & DIMENSIONS 블록 → [{'vol', 'material', 'weights':{color:g}}]. 볼륨 순서·색상표기 변형 대응."""
    txt = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", t.replace("&nbsp;", " ")))
    m = re.search(r"SPECS\s*&(?:amp;)?\s*DIMENSIONS(.*?)(?:HIDE SPECS|사이즈\s*가이드|FEATURES|리뷰|Review|배송|교환|$)", txt, re.I)
    block = m.group(1) if m else txt
    block = re.sub(r"본체\s*(\d+(?:\.\d+)?)\s*L", r"\1L 본체", block)  # '본체 40L' → '40L 본체'(순서 통일)
    mat = re.search(r"소재\s+(.+?)(?:\s*(?:본체|외부|무게|적재|뒷면|높이|상단|치수))", block)
    material = re.sub(r"\s*&amp;\s*", " & ", mat.group(1)).strip()[:70] if mat else ""
    parts = re.split(r"(\d+(?:\.\d+)?)\s*L\s*본체", block)
    out = []
    if len(parts) >= 3:  # 다중 볼륨
        for i in range(1, len(parts), 2):
            seg = parts[i + 1] if i + 1 < len(parts) else ""
            out.append({"vol": float(parts[i]), "material": material, "weights": _weights(seg) or _weights(block), "cap": ""})
    else:  # 단일 볼륨: 스펙블록의 'NL 본체'만(이름 숫자는 build 에서 카테고리별로 판단 — 셸터는 인원수)
        vn = re.search(r"(\d+(?:\.\d+)?)\s*L\s*본체", block)
        vol = float(vn.group(1)) if vn else None
        out.append({"vol": vol, "material": material, "weights": _weights(block), "cap": _capacity(block)})
    return out


def _capacity(block):
    m = re.search(r"수용\s*인원\s*(\d+(?:\s*-\s*\d+)?)", block)
    return m.group(1).strip() if m else ""


def crawl():
    listing = {}
    for path, base in CATS:
        page = 1
        while page <= 20:
            t = curl(f"{BASE}/category/{path}/?page={page}")
            blocks = re.split(r"anchorBoxId_", t)[1:]
            if not blocks:
                break
            added = 0
            for b in blocks:
                mo = re.match(r"(\d+)", b)
                if not mo:
                    continue
                no = mo.group(1)
                if no in listing:
                    continue
                alt = re.search(r'alt="([^"]+)"', b)
                if not alt:
                    continue
                name = html.unescape(alt.group(1)).strip()
                if not name or re.search(r"결제|배송|적립|쿠폰|상품비교|Hyperlite Mountain Gear|이미지$", name):
                    continue
                img = re.search(r'src="(//[^"]+/web/product/(?:big|medium|small)[^"]+\.(?:jpg|png|gif))"', b)
                image = ("https:" + img.group(1).split("?")[0]) if img else ""
                listing[no] = (name, image, base)
                added += 1
            if added == 0:
                break
            page += 1
        print(f"  [{path}] 누적 {len(listing)}", flush=True)
    return listing


def build(listing):
    rows = []
    total = len(listing)
    for i, (no, (name_raw, image, base)) in enumerate(listing.items(), 1):
        t = curl(f"{BASE}/product/detail.html?product_no={no}")
        og = re.search(r'<meta property="og:title" content="([^"]+)"', t)
        name = html.unescape(og.group(1)).strip() if og else name_raw
        cat = classify(name, base)
        name_en = english_name(name)
        gid = slugify(name_en)
        specs_list = parse_specs(t, name)

        is_pack = cat in ("backpack", "vest_pack", "pouch")
        for sc in specs_list:
            vol = sc["vol"]
            # 팩류만 볼륨(L)을 사이즈로. 볼륨 없으면 이름 끝 숫자를 볼륨으로.
            mtn = re.search(r"(\d+(?:\.\d+)?)\s*$", name.strip())
            if is_pack and not vol and mtn:
                vol = float(mtn.group(1))
            size = (f"{int(vol)}L" if vol == int(vol) else f"{vol}L") if (is_pack and vol) else ""
            # 이름 끝 볼륨 숫자 중복 부착 방지(애스펙트 32 → '애스펙트 32L')
            base_nm = name
            if size and mtn and float(mtn.group(1)) == vol:
                base_nm = name[:name.rfind(mtn.group(1))].strip()
            base_en = english_name(base_nm)
            nm_ko = f"{base_nm} {size}".strip() if size else base_nm
            nm_en = f"{base_en} {size}".strip() if size else base_en
            # 셸터/텐트 인원수 → capacity (이름 끝 'N'/'Np' 또는 수용인원 표기)
            capacity = ""
            if cat in ("shelter", "tent", "tarp"):
                mc = re.search(r"(\d+(?:\s*-\s*\d+)?)\s*p?\s*$", name.strip())
                capacity = sc.get("cap") or (mc.group(1) if mc else "")
            for color_en_v, w in (sc["weights"] or {"": 0}).items():
                sp = {}
                if is_pack and vol:  # 스키마: 백팩=volume, 파우치=capacity
                    vv = int(vol) if vol == int(vol) else vol
                    sp["capacity" if cat == "pouch" else "volume"] = vv
                if capacity:
                    cn = re.findall(r"\d+", capacity)
                    if cn:
                        sp["capacity"] = int(cn[-1])
                if sc["material"]:  # 스키마: 셸터/텐트/타프=flyMaterial, 그 외=material
                    sp["flyMaterial" if cat in ("shelter", "tent", "tarp") else "material"] = sc["material"]
                ck = color_en_v.lower()
                rows.append({
                    "groupId": gid, "category": cat, "company": "hmg", "companyKorean": "하이퍼라이트마운틴기어",
                    "name": nm_en, "nameKorean": nm_ko,
                    "color": color_en_v, "colorKorean": COLOR_KOR.get(ck, color_en_v),
                    "size": size, "sizeKorean": size, "weight": w,
                    "imageUrl": image, "specs": sp,
                    "_source": f"{BASE}/product/detail.html?product_no={no}",
                })
        if i % 15 == 0 or i == total:
            print(f"  detail {i}/{total} (rows {len(rows)})", flush=True)
    return rows


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "out/hmg-FINAL.json"
    global CATS
    if len(sys.argv) > 2:
        CATS = [(p, b) for (p, b) in CATS if any(w in p for w in sys.argv[2:])]
    print(f"카테고리 {len(CATS)}개 크롤...", flush=True)
    listing = crawl()
    print(f"리스팅 {len(listing)}개 → 상세 수집", flush=True)
    rows = build(listing)
    # (groupId,color,size) 중복 제거
    best = {}
    for r in rows:
        k = (r["groupId"], r["color"], r["size"])
        if k not in best or (bool(r["weight"]), len(r["specs"])) > (bool(best[k]["weight"]), len(best[k]["specs"])):
            best[k] = r
    dd = list(best.values())
    json.dump(dd, open(out, "w"), ensure_ascii=False, indent=2)
    print(f"완료: {len(rows)}행 → 중복제거 {len(dd)}행 -> {out}", flush=True)


if __name__ == "__main__":
    main()
