#!/usr/bin/env python3
# samaya-equipment.com (Shopify, 프랑스 산악 브랜드) 스크래퍼.
# 스펙은 제품 페이지의 metafield-rich_text_field 블록에 <strong>라벨 : </strong>값 형태로 서버렌더(프랑스어).
# products.json 으로 목록 → 각 제품 페이지에서 메타필드 파싱 → schema 행. 색상(Couleur) 변형별 1행.
# 사용: python3 samaya-global.py <out.json>
import html
import json
import re
import sys
import urllib.request

BASE = "https://www.samaya-equipment.com"
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"}

TYPE_CAT = {"Tente": "tent", "Sac à dos": "backpack", "Footprint": "tent_acc", "Vestibule": "tent_acc"}
COLOR_KO = {"Rose": "로즈", "Bleu": "블루", "Noir": "블랙", "White": "화이트", "Blanc": "화이트"}


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read().decode("utf-8", "replace")


def list_products():
    out = []
    for pg in range(1, 5):
        d = json.loads(get(f"{BASE}/products.json?limit=250&page={pg}")).get("products", [])
        if not d:
            break
        out += d
    return out


def parse_metafields(htmltext):
    # metafield-rich_text_field 블록에서 <strong>라벨 : </strong>값 쌍 추출
    pairs = {}
    for blk in re.findall(r'metafield-rich_text_field"?>(.*?)</div>', htmltext, re.S):
        for m in re.finditer(r"<strong>\s*([^<:]+?)\s*:\s*</strong>\s*([^<]*)", blk):
            label = re.sub(r"\s+", " ", html.unescape(m.group(1))).strip()
            val = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", m.group(2)))).strip()
            if label and val and label not in pairs:
                pairs[label] = val
    return pairs


def num(s):
    m = re.search(r"([\d\s.,]+)", s.replace(" ", " "))
    if not m:
        return ""
    return m.group(1)


def grams(s):
    m = re.search(r"([\d\s.,]+)\s*g\b", s.replace(" ", " "))
    if m:
        return round(float(m.group(1).replace(" ", "").replace(",", "")))
    return 0


def mm(s):
    m = re.search(r"([\d\s.,]+)\s*mm", s.replace(" ", " "))
    if m:
        return int(float(m.group(1).replace(" ", "").replace(",", "")))
    return ""


def intval(s):
    m = re.search(r"(\d+)", s)
    return int(m.group(1)) if m else ""


def slugify(name):
    return "samaya_" + re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def build(p, mf):
    cat = TYPE_CAT[p["product_type"]]
    title = p["title"]
    img = ""
    if p.get("images"):
        src = p["images"][0]["src"].split("?")[0]
        img = ("https:" + src) if src.startswith("//") else src
    variants = p.get("variants", [])
    # 색상 옵션
    colors = []
    for o in p.get("options", []):
        if o["name"].lower() in ("couleur", "color"):
            colors = o["values"]
    if not colors:
        colors = [""]
    grams_fallback = variants[0].get("grams", 0) if variants else 0

    if cat == "tent":
        single = "monoparoi" in (title + str(mf)).lower() or True  # samaya 텐트는 단벽
        specs = {
            "capacity": intval(mf.get("Capacité", "")),
            "wallStructure": "싱글월",
            "shape": "돔",
            "innerMaterial": mf.get("Tissu du sol et du toit amovible", "") or mf.get("Tissu du sol et du toit", ""),
            "flyMaterial": mf.get("Tissu des parois", ""),
            "poleMaterial": mf.get("Arceaux", ""),
            "waterproofRating": mm(mf.get("Imperméabilité des parois", "")) or mm(mf.get("Imperméabilité du sol", "")),
            "pitchType": "자립형",
            "vestibuleArea": "",
        }
        w = grams(mf.get("Poids minimum", "")) or grams_fallback
    elif cat == "backpack":
        vol = ""
        mv = re.search(r"(\d+)", mf.get("Volume", ""))
        if mv:
            vol = int(mv.group(1))
        specs = {
            "volume": vol,
            "material": mf.get("Corps", ""),
            "frameType": mf.get("Structure", ""),
            "backSystem": mf.get("Dos", ""),
            "hasHipBelt": True if "ventrale" in str(mf).lower() else False,
            "hasShoulderBottlePocket": False,
            "hasRainCover": False,
            "gender": "unisex",
        }
        w = grams(mf.get("Poids minimum", "")) or grams(mf.get("Poids", "")) or grams_fallback
    else:  # tent_acc (footprint / vestibule)
        specs = {
            "material": mf.get("Tissu du sol", "") or mf.get("Tissu", ""),
            "isWaterproof": bool(mm(mf.get("Imperméabilité du sol", "")) or mm(mf.get("Imperméabilité", ""))),
            "capacity": "",
        }
        w = grams(mf.get("Poids", "")) or grams(mf.get("Poids minimum", "")) or grams_fallback

    rows = []
    for c in colors:
        rows.append({
            "groupId": slugify(title),
            "category": cat,
            "company": "samaya",
            "companyKorean": "사마야",
            "name": re.sub(r"®|™", "", title).strip(),
            "nameKorean": "",
            "color": c,
            "colorKorean": COLOR_KO.get(c, ""),
            "size": "",
            "sizeKorean": "",
            "weight": w,
            "imageUrl": img,
            "specs": {k: v for k, v in specs.items() if v not in ("", None)},
            "_source": f"{BASE}/products/{p['handle']}",
        })
    return rows


def main():
    out_path = sys.argv[1]
    products = list_products()
    rows = []
    for p in products:
        if p["product_type"] not in TYPE_CAT:
            continue
        if "RE-USE" in p["title"].upper():
            continue
        try:
            mf = parse_metafields(get(f"{BASE}/products/{p['handle']}"))
        except Exception as e:
            print(f"FAIL {p['handle']}: {e}")
            continue
        r = build(p, mf)
        rows += r
        print(f"{p['handle']:34} {TYPE_CAT[p['product_type']]:9} w={r[0]['weight']:5} {len(r)}var")
    json.dump(rows, open(out_path, "w"), ensure_ascii=False, indent=2)
    print(f"\n{len(rows)} rows -> {out_path}")


if __name__ == "__main__":
    main()
