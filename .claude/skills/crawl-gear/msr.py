#!/usr/bin/env python3
# MSR 크롤 — 한국 공식 수입사(msrgear.co.kr, WooCommerce/Avada). MSR+써마레스트+플래티퍼스+팩타월.
#  - 상품 카드 .product-title 에 EN/KO 이름 둘 다(<p>EN<br>KO</p>). 링크 /상품/<slug>/.
#  - 스펙은 상세 '텍스트'(중량: 202g / 용량: 887ml / 수용인원 : 1 / 무게 : 1.20kg / 사이즈 R–..RW–..).
#  - 무게: 단일(무게/중량 Ng·Nkg) 또는 매트 사이즈별(중량: R – 680g / RW – Ng).
# 사용: python3 msr.py out/msr-FINAL.json
import html
import json
import re
import subprocess
import sys
import time

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
BASE = "http://www.msrgear.co.kr"
CATS = {"stoves": "stove", "tents": "tent", "cookware": "cookware_etc", "thermarest": "mat",
        "water": "bottle", "snow-pole": "trekking_pole", "packtowl": "towel"}


def curl(url):
    time.sleep(0.05)
    for _ in range(3):
        out = subprocess.run(["curl", "-sSL", "-m", "30", "-A", UA, url], capture_output=True, timeout=35)
        if out.returncode == 0:
            return out.stdout.decode("utf-8", "replace")
        time.sleep(1)
    return ""


# 색상 한글→영문(문구에 '(English)' 없을 때). 대부분은 '망고 (Mango)'처럼 영문 병기.
KO_COLOR_EN = {
    "망고": "Mango", "솔라": "Solar", "플레어": "Flare", "뉴": "New", "그린": "Green", "블랙": "Black",
    "그레이": "Grey", "레드": "Red", "블루": "Blue", "오렌지": "Orange", "옐로": "Yellow", "옐로우": "Yellow",
    "네이비": "Navy", "카키": "Khaki", "딥": "Deep", "퍼시픽": "Pacific", "마운틴": "Mountains",
    "마운틴스": "Mountains", "화이트": "White", "실버": "Silver", "골드": "Gold", "라임": "Lime",
    "포레스트": "Forest", "슬레이트": "Slate", "코랄": "Coral", "틸": "Teal", "퍼플": "Purple",
    "핑크": "Pink", "브라운": "Brown", "탄": "Tan", "샌드": "Sand", "올리브": "Olive", "차콜": "Charcoal",
    "울프": "Wolf", "웨이브": "Wave", "프린트": "Print", "트루퍼": "Trooper", "아우터스페이스": "Outer Space",
    "벨리": "Belly", "뷰": "View", "비종": "Bijou", "엠버": "Ember", "타이드": "Tide", "위트": "Wheat",
    "뉴그린": "New Green", "솔라플레어": "Solar Flare",
}
# 브랜드(멀티브랜드 몰): 카테고리·이름으로 판별
THERMAREST_RE = re.compile(r"thermarest|써마레스트|neoair|prolite|ridgerest|z\s*lite|z-?seat|trekker|luxurylite|honcho|argo|parsec|stellar|ohm|hyperion|space\s*cowboy|slacker|polar\s*ranger|air\s*head|compressible|trail\s*(pro|lite|scout)|네오에어|프로라이트|릿지레스트", re.I)
PLATYPUS_RE = re.compile(r"platypus|dromedary|dromlite|quickdraw|gravityworks|플래티퍼스|드로미더리|드롬라이트", re.I)
PACKTOWL_RE = re.compile(r"packtowl|팩타월|퍼스널\s*타월|리퍼스", re.I)


def brand_of(cat, en, ko):
    n = en + " " + ko
    if PLATYPUS_RE.search(n):
        return "platypus", "플래티퍼스"
    if PACKTOWL_RE.search(n) or cat == "towel":
        return "packtowl", "팩타월"
    if cat in ("mat", "pillow", "chair", "sleeping_bag") or THERMAREST_RE.search(n):
        return "thermarest", "써머레스트"
    return "msr", "엠에스알"


_COLOR_STOP = r"무게|중량|사용\s*인원|수용\s*인원|패킹|사이즈|\b폴\b|폴\s*수|입구|용량|수납|길이|너비|두께|재질|원단|원산지|카테고리|R\s*밸류|밸류|장바구니|₩|\|"


def parse_color(txt):
    """'색상: 망고 (Mango)' → (Mango, 망고). 영문 병기 없으면 한글→영문 사전. 뒤 스펙과 안 섞이게."""
    # 영문 병기형: '색상: 한글 (English)' — OCR 은 콜론을 빠뜨리므로 콜론 선택적(괄호 영문이 구분자)
    m = re.search(r"색상\s*[:：]?\s*([가-힣][가-힣 ]*?)\s*\(\s*([A-Za-z][A-Za-z /]*?)\s*\)", txt)
    if m:
        return m.group(2).strip(), m.group(1).strip()
    # 한글만: 스펙 라벨 직전까지
    m = re.search(r"색상\s*[:：]\s*([가-힣][가-힣,/ ]*?)\s*(?:" + _COLOR_STOP + r"|$)", txt)
    if m:
        ko = re.sub(r"\s+", " ", m.group(1)).strip().strip(",/ ")
        if not ko or len(ko) > 25:
            return "", ""
        en = " ".join(KO_COLOR_EN.get(w, w) for w in re.split(r"[ ,/]+", ko))
        return en, ko
    return "", ""


def slugify(name, company="msr"):
    return company + "_" + re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def _clean_nm(s):
    """이름 정리: 전체를 감싼 괄호 제거, ™® 앞 공백 제거."""
    s = s.strip()
    m = re.match(r"^[\(（]\s*(.+?)\s*[\)）]$", s)
    if m:
        s = m.group(1).strip()
    return re.sub(r"\s+([™®])", r"\1", s).strip()


def split_name(inner):
    """상품 카드 타이틀 → (영문, 한글). <br> 분리 우선, 없으면 '(한글)'·'EN한글' 형식 처리."""
    parts = [html.unescape(re.sub(r"<[^>]+>", "", p)).strip()
             for p in re.split(r"<br\s*/?>", re.sub(r"</?p[^>]*>", "", inner))]
    if len(parts) >= 2 and parts[0] and parts[1]:
        return _clean_nm(parts[0]), _clean_nm(parts[1])
    s = parts[0] if parts else ""
    m = re.match(r"^(.*?[A-Za-z0-9™®)])\s*[\(（]\s*([가-힣][^)）]*)[\)）]\s*$", s)  # 'English (한글)'
    if m:
        return _clean_nm(m.group(1)), _clean_nm(m.group(2))
    m = re.search(r"[가-힣]", s)  # 'English한글' → 첫 한글에서 분리
    if m and s[:m.start()].strip():
        return _clean_nm(s[:m.start()]), _clean_nm(s[m.start():])
    if m:  # '한글 English'(역순) → 첫 라틴에서 분리
        ml = re.search(r"[A-Za-z]", s)
        if ml and ml.start() > m.start():
            return _clean_nm(s[ml.start():]), _clean_nm(s[:ml.start()])
    return _clean_nm(s), _clean_nm(s)


def classify(cat, en, ko):
    n = (en + " " + ko).lower()
    # 머치/의류(50주년 비니·티셔츠 등)가 여러 카테고리에 섞임 → 이름으로 먼저 거른다
    if re.search(r"beanie|비니|t-?shirt|티셔츠|\btee\b|hoodie|후드|\bhat\b|\bcap\b|모자|sock|양말|jacket|자[켓캣]", n):
        return "clothing"
    if re.search(r"sticker|스티커|keychain|키링|키체인|patch|패치|캘린더|calendar|opener|오프너|mug\s*shot|굿즈", n):
        return "etc"
    if cat == "tent":
        if re.search(r"tarp|타프|wing|윙", n):
            return "tarp"
        # 텐트 부속(스테이크·코드·폴·지퍼풀·텐셔너·해머·풋프린트·기어쉐드)만 tent_acc.
        # ※ Shield/Mesh House/Bivy/Body 는 정식 텐트/셸터라 제외.
        if re.search(r"footprint|풋프린트|풋 프린트|gear\s*shed|기어\s*쉐드|\broom\b|fast\s*&|"
                     r"stake|스테이크|\bpeg\b|\b펙\b|\bcord\b|코드\s*텐셔너|텐셔너|tensioner|"
                     r"zipper\s*pull|지퍼\s*풀|guy\s*line|가이\s*라인|marker|마커|hammer|해머|"
                     r"adjustable\s*pole|어드져스터블\s*폴", n):
            return "tent_acc"
        return "tent"
    if cat == "cookware_etc":
        if re.search(r"\bmug\b|머그|\bcup\b|\b컵", n):
            return "cup"
        if re.search(r"\bbowl\b|보울|그릇", n):
            return "bowl"
        if re.search(r"spork|스포크|utensil|커틀러리|수저|스푼|포크", n):
            return "cutlery"
        return "cookware_etc"
    if cat == "mat":  # 써마레스트: 매트 외 침낭/베개/체어도 있음
        if re.search(r"sleeping\s*bag|침낭|quilt|퀼트|blanket|블랭킷|slp\b", n):
            return "sleeping_bag"
        if re.search(r"pillow|필로우|베개", n):
            return "pillow"
        if re.search(r"chair|체어|의자|cot|코트\b|seat|시트", n):
            return "chair"
        return "mat"
    if cat == "bottle":
        if re.search(r"filter|필터|purif|정수|퓨리|guardian|가디언|trailshot|미니웍스|워터웍스", n):
            return "etc"
        return "bottle"
    if cat == "trekking_pole":
        if re.search(r"snowshoe|스노슈|설피|스노\s*슈", n):
            return "microspikes"
        if re.search(r"pole|폴|스틱|스톡", n):
            return "trekking_pole"
        return "etc"
    return cat


def _to_g(val, unit):
    v = float(val.replace(",", ""))
    return round(v * 1000) if unit.lower() == "kg" else round(v)


def parse_weights(txt, sizes):
    """무게 → {size: g}. 매트 사이즈별(중량: R – 680g / RW – 790g) 또는 단일(무게/중량 Ng·Nkg)."""
    # 사이즈별: '중량: R – 680g / RW – 790g'
    m = re.search(r"(?:중량|무게)\s*[:：]?\s*((?:[A-Za-z]{1,3}\s*[–\-]\s*[\d,.]+\s*(?:kg|g)\s*/?\s*){2,})", txt)
    if m:
        d = {}
        for sm in re.finditer(r"([A-Za-z]{1,3})\s*[–\-]\s*([\d,.]+)\s*(kg|g)", m.group(1)):
            d[sm.group(1).upper()] = _to_g(sm.group(2), sm.group(3))
        if d:
            return d
    # 단일: '무게 : 1.20kg' / '중량: 202g' (원단 g/m² 제외)
    m = re.search(r"(?:중량|무게)\s*[:：]?\s*([\d,.]+)\s*(kg|g)\b(?!/|\s*/?\s*m)", txt)
    if m:
        g = _to_g(m.group(1), m.group(2))
        if 3 <= g <= 30000:
            return {"": g}
    return {}


def build_specs(cat, txt, en):
    sp = {}
    mc = re.search(r"수용\s*인원\s*[:：]?\s*(\d+)", txt) or re.search(r"(\d+)\s*인용", en)
    cap = int(mc.group(1)) if mc else None
    mv = re.search(r"용량\s*[:：]?\s*([\d,.]+)\s*(ml|L|리터)", txt, re.I)
    vol = None
    if mv:
        v = float(mv.group(1).replace(",", ""))
        vol = round(v) if mv.group(2).lower() == "ml" else round(v * 1000)
    if cat in ("tent", "tarp", "tent_acc"):
        if cap:
            sp["capacity"] = cap
    elif cat in ("bottle", "cup", "bowl", "cookware_etc"):
        if vol:
            sp["capacity"] = vol
    elif cat == "mat":
        mr = re.search(r"R-?\s*value\s*[:：]?\s*([\d.]+)", txt, re.I) or re.search(r"알\s*값\s*[:：]?\s*([\d.]+)", txt)
        if mr:
            sp["rValue"] = float(mr.group(1))
    return sp


def sizes_of(txt):
    """매트 등 사이즈별 표기 '사이즈: R – .. / RW – ..' → [R, RW]."""
    m = re.search(r"사이즈\s*[:：]?\s*((?:[A-Za-z]{1,3}\s*[–\-][^/]*/?\s*){2,})", txt)
    if not m:
        return []
    return list(dict.fromkeys(s.upper() for s in re.findall(r"([A-Za-z]{1,3})\s*[–\-]", m.group(1))))


def crawl():
    listing = {}  # url -> (en, ko, cat, image)
    for cat_slug, cat in CATS.items():
        for p in range(1, 15):
            u = f"{BASE}/product-category/{cat_slug}/" + (f"page/{p}/" if p > 1 else "")
            h = curl(u)
            cards = re.findall(r'product-title"><a href="([^"]+)">(.*?)</a>', h, re.S)
            if not cards:
                break
            for url, inner in cards:
                if url in listing:
                    continue
                en, ko = split_name(inner)
                if not en:
                    continue
                # 카드 이미지
                listing[url] = (en, ko, cat, "")
        print(f"  [{cat_slug}] 누적 {len(listing)}", flush=True)
    return listing


def build(listing):
    rows = []
    total = len(listing)
    for i, (url, (en, ko, cat0, _)) in enumerate(listing.items(), 1):
        h = curl(url)
        # 엔티티(&#8211; en-dash, &amp; 등) 반드시 unescape — 안 하면 사이즈별 중량 파싱 실패
        txt = html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", h.replace("&nbsp;", " "))))
        cat = classify(cat0, en, ko)
        company, company_ko = brand_of(cat, en, ko)
        color_en, color_ko = parse_color(txt)
        # 이미지: og:image(상품 대표) → data-large_image → wp-post-image
        mi = (re.search(r'<meta property="og:image" content="([^"]+)"', h)
              or re.search(r'data-large_image="([^"]+)"', h)
              or re.search(r'wp-post-image[^>]*?\bsrc="([^"]+)"', h))
        image = html.unescape(mi.group(1)).split("?")[0] if mi else ""
        wmap = parse_weights(txt, [])
        specs0 = build_specs(cat, txt, en)
        gid = slugify(en, company)
        real = [k for k in wmap if k] or sizes_of(txt) or [""]  # 사이즈는 무게맵 키 우선
        single = wmap.get("")
        for s in real:
            nm = f"{en} {s}".strip() if s else en
            nm_ko = f"{ko} {s}".strip() if s else ko
            rows.append({
                "groupId": gid, "category": cat, "company": company, "companyKorean": company_ko,
                "name": nm, "nameKorean": nm_ko, "color": color_en, "colorKorean": color_ko,
                "size": s, "sizeKorean": s,
                "weight": wmap.get(s, single) or 0,
                "imageUrl": image, "specs": specs0,
                "_source": url,
            })
        if i % 10 == 0 or i == total:
            print(f"  detail {i}/{total} (rows {len(rows)})", flush=True)
    return rows


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "out/msr-FINAL.json"
    listing = crawl()
    print(f"리스팅 {len(listing)}개 → 상세 수집", flush=True)
    rows = build(listing)
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
