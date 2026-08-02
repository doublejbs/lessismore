#!/usr/bin/env python3
# 케일(CAYL) 크롤 — Cafe24 단일소스(cayl.co.kr). 한국 트레일러닝/하이킹 브랜드.
#  - 색상은 '별도 product_no' + 이름 말미 ' / Color'. groupId = 베이스명(색상 제외).
#  - 사이즈는 상세 옵션 <li title="M"> 에 정적 존재 → 사이즈별 행 확장(이름 끝 부착).
#  - 무게/용량은 가방 상세 '텍스트'에 있음(무게 : 523 g / 용량 : 약 27L~32L) — OCR 불필요.
#  - shoes/129 는 타브랜드(ON/HOKA/뉴발란스/norda) 재판매라 제외.
# 사용: python3 cayl.py out/cayl-FINAL.json [카테고리slug/no ...]
import html
import json
import re
import subprocess
import sys
import time

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
BASE = "https://cayl.co.kr"

# (카테고리 경로, 내부 카테고리 또는 None=이름으로 분류)
CATS = [
    ("bag/43", "backpack"),
    ("sacoche-사코슈/62", "pouch"),
    ("jacket/30", "clothing"), ("top/31", "clothing"), ("bottom/42", "clothing"),
    ("shell/45", "clothing"), ("fleece/46", "clothing"), ("insulation/47", "clothing"),
    ("long/55", "clothing"), ("short/56", "clothing"), ("shirts/57", "clothing"),
    ("fleece-sweats/58", "clothing"), ("base-layer-tees/59", "clothing"),
    ("head-gear/60", "clothing"),
    ("etc/63", None), ("etc/61", None),
    ("collaboration/146", None), ("tail-x-cayl/89", None),
    ("cayl-x-new-balance/147", None), ("cayl-x-miwangyeong/149", None),
    ("cayl-x-manufact/154", None),
]

COLOR_KOR = {
    "black": "블랙", "white": "화이트", "grey": "그레이", "gray": "그레이", "green": "그린",
    "blue": "블루", "red": "레드", "orange": "오렌지", "yellow": "옐로", "navy": "네이비",
    "beige": "베이지", "brown": "브라운", "khaki": "카키", "olive": "올리브", "pink": "핑크",
    "cream": "크림", "charcoal": "차콜", "ivory": "아이보리", "sand": "샌드", "mix": "믹스",
    "forest": "포레스트", "melange": "멜란지", "light": "라이트", "dark": "다크", "foggy": "포기",
    "golden": "골든", "bean": "빈", "trans": "트랜스", "clear": "클리어", "grid": "그리드",
    "purple": "퍼플", "mint": "민트", "teal": "틸", "coral": "코랄", "burgundy": "버건디",
    "silver": "실버", "gold": "골드", "wine": "와인", "lime": "라임", "mustard": "머스타드",
    "denim": "데님", "stone": "스톤", "smoke": "스모크", "moss": "모스", "rust": "러스트",
}


def curl(url):
    time.sleep(0.05)
    for _ in range(3):
        out = subprocess.run(["curl", "-sS", "-m", "30", "-A", UA, url], capture_output=True, timeout=35)
        if out.returncode == 0:
            return out.stdout.decode("utf-8", "replace")
        time.sleep(1)
    return ""


def color_kor(en):
    if not en:
        return ""
    return " ".join(COLOR_KOR.get(w.lower(), w) for w in en.split())


def slugify(s):
    # 괄호 문자는 없애되 내용(원단 xpac/b-grid 등)은 유지 → 원단 변형이 서로 다른 groupId 가 되도록.
    # (원단을 지우면 'TAE BAEK (b-grid)'와 '(cayl grid)'가 같은 groupId 로 뭉쳐 변형이 덮어써짐.)
    s = re.sub(r"[™®()\[\]]", " ", s)
    return "cayl_" + re.sub(r"[^a-z0-9가-힣]+", "-", s.strip().lower()).strip("-")


FABRIC = {"xpac": "X-Pac", "x-pac": "X-Pac", "cordura": "Cordura", "b-grid": "Grid",
          "cayl grid": "Grid", "grid": "Grid", "ripstop": "Ripstop", "dyneema": "Dyneema",
          "ecopak": "EcoPak", "x-pac mix": "X-Pac"}


def classify(name, base):
    """base 카테고리(None 이면 이름으로) + 이름 기반 보정. pouch 를 bottle 보다 먼저(보틀파우치)."""
    n = name.lower()
    # vest_pack 은 '러닝 하이드레이션 팩'만. 다운/알파/플리스 조끼(의류)는 clothing.
    if re.search(r"vest", n) and re.search(r"back\s*pack|hydration|러닝\s*베스트|\brace\b|\d+\s*l\b", n):
        return "vest_pack"
    if re.search(r"fanny\s*pack|waist|힙색|웨이스트|사코슈|sacoche|파우치|pouch|holder|홀더", n):
        return "pouch"
    if re.search(r"\bcup\b|머그|\bmug\b", n):
        return "cup"
    if re.search(r"콜드브루|커피|\bcoffee\b|에너지바|스낵|\bsnack\b|\bgel\b|산들꽃", n):
        return "food"
    if re.search(r"\bband\b|밴드|beanie|비니|\bcap\b|캡|모자|\bhat\b|바라클라바|neck|넥게이터|워머|헤드", n):
        return "clothing"
    if re.search(r"belt|벨트|gaiter|게이터|sock|양말|towel|타월|strap|스트랩|키링|keyring|patch|패치", n):
        return "etc"  # 벨트(플라스크 포함형)를 bottle 로 오분류 방지 위해 bottle 앞에 둠
    if re.search(r"bottle|보틀|플라스크|flask|텀블러|tumbler", n):
        return "bottle"
    if base:
        return base
    if re.search(r"bag|백|팩|pack|roll\s*top", n):
        return "backpack"
    return "etc"


def material_from_name(name):
    m = re.search(r"\(([^)]+)\)", name)
    if m:
        return FABRIC.get(m.group(1).strip().lower(), "")
    return ""


FABRIC_TAIL = {"xpac", "x-pac", "x-pac mix", "cayl grid", "b-grid", "grid", "cordura",
               "mesh", "ripstop", "dyneema", "ecopak", "nylon"}


SIZE_TOK = re.compile(r"^(XXS|XS|S|M|L|XL|XXL|XXXL|F|Free|One ?Size|\d{2,3})$", re.I)


def clean_name_color(title):
    """og:title '이름 / Color - CAYL' → (name, color_en, material, size). 말미가 원단/사이즈면 각각."""
    t = re.sub(r"\s*-\s*CAYL\s*$", "", html.unescape(title)).strip()
    t = re.sub(r"\s*/\s*P0000[A-Z0-9]+\s*$", "", t)  # 말미 옵션코드 제거
    t = re.sub(r"\s*/\s*\d[\w-]*\s*$", "", t)  # 말미 상품코드(1147670-BBLC 등) 제거
    color = material = size = ""
    if " / " in t:
        head, tail = t.rsplit(" / ", 1)
        tail = tail.strip()
        if tail.lower() in FABRIC_TAIL:  # 색상이 아니라 원단
            material = FABRIC.get(tail.lower(), tail.title())
            t = head.strip()
        elif SIZE_TOK.match(tail):  # 색상이 아니라 사이즈(사이즈가 별도 product_no 인 제품)
            size = tail.upper() if len(tail) <= 3 else tail
            t = head.strip()
        elif tail and not re.match(r"^[A-Z0-9]{6,}$", tail) and not re.search(r"\d{3,}", tail):
            color = tail.title()  # 대소문자 통일(Title Case)
            t = head.strip()
    return t.strip(), color, material, size


def parse_sizes(t):
    """상세 옵션 <li ... title="M"> 에서 사이즈. 색상옵션/결제옵션 제외."""
    sizes = []
    for m in re.finditer(r'<li[^>]*option_value="[^"]*"[^>]*title="([^"]+)"', t):
        s = html.unescape(m.group(1)).strip()
        s = re.sub(r"\s*\[[^\]]*\]\s*$", "", s).strip()  # [Sold out] 제거
        s = re.sub(r"\s*\(.*?\)\s*$", "", s).strip()
        if not s or s in sizes:
            continue
        if re.search(r"결제|착불|선결제|수령", s):
            continue
        sizes.append(s)
    # 색상만 있는 옵션(색상=별도 product_no 인 CAYL 에선 사이즈 옵션만 의미)
    real = [s for s in sizes if re.match(r"^(XXS|XS|S|M|L|XL|XXL|XXXL|F|Free|FREE|One ?Size|\d{2,3})$", s, re.I)]
    return real


def _g_of(num, unit):
    v = float(num.replace(",", ""))
    return round(v * 1000) if unit.lower() == "kg" else round(v)


def parse_weight(t):
    # 제품무게 추출. CAYL 은 라벨/구분자/분해표기가 제각각이라 '유효한 무게/중량 헤더' 뒤 첫 무게값을 취함.
    #   지원: '중량 : 116 g' · '무게 - 334g' · '무게 (Weight) : SM - 933 g' · '중량 : ML 674 g'
    #        · 부품분해 '무게 (측정방식…) … 바디 : 734g …' · '중량 : 외피 61 g'
    #   제외: 적재하중(권장/패킹/최대 무게 … 미만/이하)·서술문(무게 분산/좌우/줄이도록)·원단(g/㎡).
    # 태그로 숫자·단위가 분리(<span>97</span><font>g</font>)되므로 태그를 공백으로 치환.
    t = re.sub(r"<[^>]+>", " ", t.replace("&nbsp;", " "))
    # 헤더: 무게/중량, 또는 영문 Weight(단독 단어; lightweight 등 제외)
    for lab in re.finditer(r"(.{0,10})(?:무게|중량|(?<![A-Za-z])[Ww]eight(?![A-Za-z]))", t):
        pre = lab.group(1)
        if re.search(r"권장|적정|하중|적재|최대|패킹|버클|수용", pre):
            continue  # 적재하중 헤더
        seg = t[lab.end():lab.end() + 130]
        if re.match(r"\s*(?:를|을|가|이|는|은|에|와|과|도|의|감|좌우|분산|중심|중앙|가까이|붙이|줄이|절약)", seg):
            continue  # 서술문(무게 분산/무게를 줄이도록 등)
        for m in re.finditer(r"([\d,.]+)\s*(kg|g)\b(?!/|\s*/?\s*(?:sqm|㎡|m2))([^\n]{0,10})", seg):
            if re.search(r"미만|이하|이상|미달", m.group(3)):
                continue
            g = _g_of(m.group(1), m.group(2))
            if 5 <= g <= 8000:  # 카라비너·코드 등 초경량(7.6g)도 포함
                return g
    return 0


def parse_volume(t):
    m = re.search(r"용량\s*[:：]\s*[약~\s]*(\d+)\s*L(?:\s*~\s*(\d+)\s*L)?", t)
    if m:
        return int(m.group(2) or m.group(1))  # 범위면 상한
    m = re.search(r"volume-value[^>]*>\s*(\d+)L", t)
    return int(m.group(1)) if m else ""


def parse_material(t):
    for m in re.finditer(r"원단\s*[:：]?\s*([A-Za-z가-힣][A-Za-z가-힣0-9%.\s]{2,40})", t):
        mat = re.sub(r"\s+", " ", html.unescape(m.group(1))).strip(" :·-")
        mat = re.sub(r"\s*\d+(?:\.\d+)?\s*g(?:/m2|/㎡)?\s*$", "", mat).strip()  # 끝 원단무게 제거
        if re.search(r"되었|증대|사양|특성|세탁|건조|수축|보풀|주의|바랍|대비|코팅", mat):
            continue
        if re.search(r"nylon|polyester|wool|cotton|spandex|polar|fleece|merino|폴리|나일론|울|코튼|면|스판|메리노|폴라|플리스|\d+\s*%", mat, re.I):
            return mat[:40]
    return ""


def crawl():
    listing = {}  # no -> (name_raw, image, base_cat)
    for path, base in CATS:
        page = 1
        while page <= 40:
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
                if not name or re.search(r"결제|배송|적립|쿠폰|이미지$", name):
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
        t = curl(f"{BASE}/product/detail.html?product_no={no}").replace("&nbsp;", " ")
        og = re.search(r'<meta property="og:title" content="([^"]+)"', t)
        name, color, mat_hint, size_hint = clean_name_color(og.group(1)) if og else clean_name_color(name_raw)
        if not name:
            name, color, mat_hint, size_hint = clean_name_color(name_raw)
        cat = classify(name, base)
        opt_sizes = parse_sizes(t)
        specs = {}
        weight = 0
        if cat in ("backpack", "vest_pack", "pouch"):
            weight = parse_weight(t)
            vol = parse_volume(t)
            if vol:
                specs["capacity" if cat == "pouch" else "volume"] = vol  # 스키마: pouch 는 capacity
            # 배낭/베스트팩은 토르소 사이즈가 없고 '용량이 곧 사이즈' → size 에 반영(이름 끝 부착)
            if cat in ("backpack", "vest_pack") and vol and not opt_sizes:
                opt_sizes = [f"{vol}L"]
            mat = mat_hint or material_from_name(name) or parse_material(t)
            if mat:
                specs["material"] = mat
        elif cat == "clothing":
            weight = parse_weight(t)  # 의류도 '중량 : NNN g (S size)' 표기 있음
            mat = mat_hint or parse_material(t)
            if mat:
                specs["material"] = mat
        else:
            weight = parse_weight(t)
        sizes = opt_sizes or ([size_hint] if size_hint else [""])
        gid = slugify(name)
        for sz in sizes:
            nm = f"{name} {sz}".strip() if sz else name
            rows.append({
                "groupId": gid,
                "category": cat,
                "company": "cayl",
                "companyKorean": "케일",
                "name": nm,
                "nameKorean": nm,
                "color": color,
                "colorKorean": color_kor(color),
                "size": sz,
                "sizeKorean": sz,
                "weight": weight,
                "imageUrl": image,
                "specs": specs,
                "_source": f"{BASE}/product/detail.html?product_no={no}",
            })
        if i % 25 == 0 or i == total:
            print(f"  detail {i}/{total} (rows {len(rows)})", flush=True)
    return rows


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "out/cayl-FINAL.json"
    global CATS
    if len(sys.argv) > 2:
        wanted = sys.argv[2:]
        CATS = [(p, b) for (p, b) in CATS if any(w in p for w in wanted)]
    print(f"카테고리 {len(CATS)}개 크롤...", flush=True)
    listing = crawl()
    print(f"리스팅 product_no {len(listing)}개 → 상세 수집", flush=True)
    rows = build(listing)
    # (groupId,color,size) 중복 제거(같은 제품 재등록 리스팅) — 무게·스펙 많은 행 우선.
    best = {}
    for r in rows:
        k = (r["groupId"], r["color"], r["size"])
        score = (bool(r["weight"]), len(r["specs"]))
        if k not in best or score > best[k][0]:
            best[k] = (score, r)
    deduped = [v[1] for v in best.values()]
    json.dump(deduped, open(out, "w"), ensure_ascii=False, indent=2)
    print(f"완료: {len(rows)}행 → 중복제거 {len(deduped)}행 -> {out}", flush=True)


if __name__ == "__main__":
    main()
