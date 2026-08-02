#!/usr/bin/env python3
# 웨스턴마운티니어링(Western Mountaineering) 크롤 — WooCommerce(www.westernmountaineering.com).
#  - 전체 제품: wp-sitemap-posts-product-1.xml. 상세는 서버렌더라 curl 직접.
#  - 스펙: WooCommerce 'product-attributes' 표(label/value). 길이별 값은 nested insidetable.
#    침낭: Temp Rating(°F), Total Weight(길이별 'N lb M oz'), Fill Weight(길이별), Fill(850+ down), Shape, Color.
#    의류: Avg. Total Weight '6.5 oz (185g)'(그램 병기), Shell Fabric, Fill, 사이즈 XS~XL.
#  - 변형: 침낭=길이(지퍼 L/R 은 무게무관→접음), 의류=사이즈. 무게 lb/oz→g 변환.
# 사용: python3 wm.py out/wm-FINAL.json
import html
import json
import re
import subprocess
import sys
import time

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
BASE = "https://www.westernmountaineering.com"
SITEMAP = f"{BASE}/wp-sitemap-posts-product-1.xml"

FEET_CM = {"5'0\"": "150cm", "5'6\"": "165cm", "6'0\"": "180cm", "6'6\"": "200cm", "7'0\"": "215cm"}
COLOR_KOR = {
    "black": "블랙", "cranberry": "크랜베리", "navy": "네이비", "blue": "블루", "red": "레드",
    "green": "그린", "charcoal": "차콜", "grey": "그레이", "gray": "그레이", "tan": "탄",
    "olive": "올리브", "orange": "오렌지", "gold": "골드", "royal": "로열", "forest": "포레스트",
    "smoke": "스모크", "slate": "슬레이트", "burgundy": "버건디", "teal": "틸", "white": "화이트",
    "clay": "클레이", "copper": "코퍼", "crimson": "크림슨", "lime": "라임", "magma": "마그마",
    "mesh": "메쉬", "moss": "모스", "neon": "네온", "platinum": "플래티넘", "plum": "플럼",
    "sage": "세이지", "sand": "샌드", "silver": "실버", "sky": "스카이", "stone": "스톤",
    "turquoise": "터쿼이즈", "yellow": "옐로",
}

# 제품명 음역(KR 공식 수입사 표기 미확인 → 음역 생성). 모델 고유명 + 구조어. 미등재 단어는 영문 유지.
NAME_KO = {
    "alder": "앨더", "alpinlite": "알핀라이트", "antelope": "앤털로프", "apache": "아파치",
    "astralite": "아스트라라이트", "badger": "배저", "bison": "바이슨", "bristlecone": "브리슬콘",
    "caribou": "카리부", "cloudlite": "클라우드라이트", "cypress": "사이프러스", "dreamlite": "드림라이트",
    "everlite": "에버라이트", "flylite": "플라이라이트", "highlite": "하이라이트", "kodiak": "코디악",
    "lynx": "링스", "megalite": "메가라이트", "mitylite": "마이티라이트", "monolite": "모노라이트",
    "nanolite": "나노라이트", "ponderosa": "폰데로사", "puma": "퓨마", "sequoia": "세쿼이아",
    "summerlite": "서머라이트", "sycamore": "시카모어", "terralite": "테라라이트", "ultralite": "울트라라이트",
    "versalite": "버사라이트", "slinglite": "슬링라이트", "flash": "플래시", "flight": "플라이트",
    "ion": "이온", "meltdown": "멜트다운", "vapor": "베이퍼", "quickflash": "퀵플래시", "snojack": "스노잭",
    "hotsac": "핫색", "cloudrest": "클라우드레스트", "sonora": "소노라", "tioga": "티오가", "cloud": "클라우드",
    # 구조어
    "stormshield": "스톰실드", "comforter": "컴포터", "quilt": "퀼트", "top": "탑", "underquilt": "언더퀼트",
    "jacket": "재킷", "parka": "파카", "vest": "베스트", "pants": "팬츠", "hoody": "후디", "hooded": "후디드",
    "booties": "부티", "down": "다운", "pillows": "필로우", "pillow": "필로우", "liner": "라이너",
    "liners": "라이너", "sleeping": "슬리핑", "sleep": "슬립", "bag": "백", "expander": "익스팬더",
    "coupler": "커플러", "summer": "서머", "stuff": "스터프", "sack": "색", "storage": "스토리지",
    "overfill": "오버필", "expedition": "엑스페디션", "standard": "스탠다드", "hat": "모자", "shirt": "셔츠",
    "long": "롱", "sleeve": "슬리브", "t-shirts": "티셔츠", "tee": "티", "western": "웨스턴",
    "mountaineering": "마운티니어링", "logo": "로고", "weather": "웨더", "proof": "프루프", "winter": "윈터",
    "all": "올",
}
SIZE_KO = {"XS": "엑스스몰", "S": "스몰", "M": "미디엄", "L": "라지", "XL": "엑스라지",
           "XXL": "더블엑스라지", "XXXL": "트리플엑스라지"}


def kor_name(name):
    """영문 제품명 → 음역. MF/GWS/XR/VBL 등 코드·숫자는 유지."""
    out = []
    for w in name.split():
        key = re.sub(r"[^a-z0-9-]", "", w.lower())
        out.append(NAME_KO.get(key, w))
    return " ".join(out)


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
    return "/".join(" ".join(COLOR_KOR.get(w.lower(), w) for w in part.split())
                     for part in re.split(r"\s*/\s*", en))


def slugify(name):
    return "western-mountaineering_" + re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def classify(name, slug, attrs):
    # WM 침낭 이름엔 'bag' 이 없다(Antelope/Puma/Kodiak…) → 스펙(Temp Rating/Shape)·슬러그 접미로 판별.
    n = (name + " " + slug).lower()
    if re.search(r"boot", n):
        return "etc"
    if re.search(r"pillow", n):
        return "pillow"
    if re.search(r"jacket|parka|vest|pants|hoody|shirt|tee|t-shirt|\bhat\b|\bcap\b", n):
        return "clothing"
    if ("Temp Rating" in attrs or "Temperature Rating" in attrs or "Shape" in attrs
            or re.search(r"-(?:mf|gws|stormshield)\b|quilt|comforter|underquilt", n)):
        return "sleeping_bag"
    if re.search(r"stuff.sack|storage.sack", n):
        return "pouch"
    return "etc"  # 라이너/VBL/커플러/익스팬더/오버필 등


def _to_g(s):
    """'820 g' / '1 lb 13 oz' / '17 oz' / '6.5 oz (185g)' → grams(int). 미터법 병기/평문 우선."""
    mg = re.search(r"\((\d+)\s*g\)", s) or re.search(r"(?<![a-zA-Z])(\d+)\s*g\b", s)  # 그램(병기/평문) 우선
    if mg:
        return int(mg.group(1))
    lb = re.search(r"([\d.]+)\s*lb", s)
    oz = re.search(r"([\d.]+)\s*oz", s)
    g = 0.0
    if lb:
        g += float(lb.group(1)) * 453.592
    if oz:
        g += float(oz.group(1)) * 28.3495
    if g:
        return round(g)
    mb = re.fullmatch(r"\s*(\d+)\s*", s)  # 단위 없는 맨숫자(미터법 표에선 grams)
    if mb and 5 <= int(mb.group(1)) <= 8000:
        return int(mb.group(1))
    return 0


def _clean(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html.unescape(s))).strip()


def parse_attrs(t):
    """WooCommerce product-attributes 표 → {label: value}. value 는 문자열 또는 {길이: 값}.
    아이템 행 단위로 분할해야 nested insidetable(길이별 값)의 안쪽 </td> 에 안 걸린다."""
    attrs = {}
    for ch in re.split(r'<tr class="woocommerce-product-attributes-item[^"]*">', t)[1:]:
        ml = re.search(r'__label">(.*?)</td>', ch, re.S)
        mv = re.search(r'__value">(.*)', ch, re.S)
        if not (ml and mv):
            continue
        label = _clean(ml.group(1))
        vh = mv.group(1)
        if not label:
            continue
        if "insidetable" in vh:  # 길이별 nested table
            nested = vh.split("</table>")[0]
            sub = {}
            for k, v in re.findall(r"<td[^>]*>(.*?)</td>\s*<td[^>]*>(.*?)</td>", nested, re.S):
                kk, vv = _clean(k), _clean(v)
                if kk:
                    sub[kk] = vv
            if sub:
                attrs[label] = sub
                continue
        pv = re.match(r"(.*?)</td>", vh, re.S)  # 단일값: 첫 </td> 까지
        attrs[label] = _clean(pv.group(1) if pv else vh)
    return attrs


def build_specs(cat, attrs, name):
    specs = {}
    fill = attrs.get("Fill", "") if isinstance(attrs.get("Fill"), str) else ""
    if cat == "sleeping_bag":
        sh = attrs.get("Shape")
        if isinstance(sh, str) and sh:
            specs["shape"] = sh
        if re.search(r"down|goose|duck", fill, re.I):
            specs["fillMaterial"] = "down"
        mp = re.search(r"(\d{3})\+?\s*(?:power|fill)", fill, re.I)
        if mp:
            specs["fillPower"] = int(mp.group(1))
        tr = attrs.get("Temp Rating") or attrs.get("Temperature Rating")
        if isinstance(tr, str):
            mc = re.search(r"(-?\d+)\s*°?\s*C\b", tr)  # 미터법(°C) 우선
            mf = re.search(r"(-?\d+)\s*°?\s*F\b", tr)
            if mc:
                specs["limitTemp"] = int(mc.group(1))
            elif mf:
                specs["limitTemp"] = round((int(mf.group(1)) - 32) * 5 / 9)
    elif cat == "clothing":
        if re.search(r"down|goose|duck", fill, re.I):
            specs["fillMaterial"] = "down"
        sf = attrs.get("Shell Fabric") or attrs.get("Fabric")
        if isinstance(sf, str) and sf:
            specs["material"] = sf
        if re.search(r"jacket|parka", name, re.I):
            specs["type"] = "jacket"
        elif re.search(r"vest", name, re.I):
            specs["type"] = "vest"
        elif re.search(r"pants", name, re.I):
            specs["type"] = "pants"
        if re.search(r"hood", name, re.I):
            specs["hasHood"] = True
    return specs


SIZE_MAP = {"xs": "XS", "sm": "S", "s": "S", "md": "M", "m": "M", "lg": "L", "l": "L",
            "xl": "XL", "xxl": "XXL", "xxxl": "XXXL",
            "xsmall": "XS", "small": "S", "medium": "M", "large": "L", "xlarge": "XL", "xxlarge": "XXL"}


def garment_variants(t):
    """의류 variations 에서 (사이즈 목록, 대표 색상) 추출."""
    m = re.search(r'data-product_variations="([^"]+)"', t)
    if not m:
        return [], ""
    try:
        vs = json.loads(html.unescape(m.group(1)))
    except Exception:
        return [], ""
    sizes, colors = [], []
    for v in vs:
        a = v.get("attributes", {})
        for k, val in a.items():
            if "size" in k and val:
                sz = SIZE_MAP.get(val.lower(), val.upper())
                if sz not in sizes:
                    sizes.append(sz)
            if "color" in k and val:
                colors.append(val)
    color = ""
    if colors:
        color = "/".join(w.capitalize() for w in colors[0].split("-"))
    return sizes, color


def crawl():
    slugs = sorted(set(re.findall(r"/product/([a-z0-9-]+)/", curl(SITEMAP))))
    print(f"제품 {len(slugs)}개", flush=True)
    rows = []
    for i, slug in enumerate(slugs, 1):
        t = curl(f"{BASE}/product/{slug}/")
        mn = re.search(r'product_title[^>]*>([^<]+)</h1>', t)
        name = html.unescape(mn.group(1)).strip() if mn else slug
        attrs = parse_attrs(t)
        cat = classify(name, slug, attrs)
        # 이미지: WooCommerce 갤러리 data-large_image(풀사이즈) → wp-post-image src. og:image 없음.
        mi = re.search(r'data-large_image="([^"]+)"', t) or re.search(r'wp-post-image[^>]*?\bsrc="([^"]+)"', t)
        image = html.unescape(mi.group(1)).split("?")[0] if mi else ""
        # 색상
        color = attrs.get("Color", "") if isinstance(attrs.get("Color"), str) else ""
        # 무게(길이별 또는 단일)
        tw = attrs.get("Total Weight") or attrs.get("Avg. Total Weight") or attrs.get("Weight")
        fw = attrs.get("Fill Weight") or attrs.get("Avg. Fill Weight")
        specs0 = build_specs(cat, attrs, name)
        gid = slugify(name)

        name_ko = kor_name(name)

        def emit(size_en, size_ko, weight, fill_g):
            sp = dict(specs0)
            if fill_g and cat == "sleeping_bag":  # fillWeight 는 침낭 스키마에만 있음
                sp["fillWeight"] = fill_g
            nm = f"{name} {size_en}".strip() if size_en else name
            nm_ko = f"{name_ko} {size_ko}".strip() if size_ko else name_ko
            rows.append({
                "groupId": gid, "category": cat, "company": "western-mountaineering",
                "companyKorean": "웨스턴마운티니어링", "name": nm, "nameKorean": nm_ko,
                "color": color, "colorKorean": color_kor(color),
                "size": size_en, "sizeKorean": size_ko, "weight": weight,
                "imageUrl": image, "specs": sp,
                "_source": f"{BASE}/product/{slug}/",
            })

        if isinstance(tw, dict):  # 침낭: 길이별
            for length, wstr in tw.items():
                w = _to_g(wstr)
                fill_g = _to_g(fw[length]) if isinstance(fw, dict) and length in fw else (_to_g(fw) if isinstance(fw, str) else 0)
                size_ko = FEET_CM.get(length, length)
                emit(length, size_ko, w, fill_g)
        elif cat == "clothing":  # 의류: 사이즈별(무게는 단일 평균)
            w = _to_g(tw) if isinstance(tw, str) else 0
            fill_g = _to_g(fw) if isinstance(fw, str) else 0
            sizes, vcolor = garment_variants(t)
            if not color and vcolor:
                color = vcolor
            for sz in (sizes or [""]):
                emit(sz, SIZE_KO.get(sz, sz), w, fill_g)
        else:  # 단일(액세서리)
            w = _to_g(tw) if isinstance(tw, str) else 0
            fill_g = _to_g(fw) if isinstance(fw, str) else 0
            emit("", "", w, fill_g)
        if i % 10 == 0 or i == len(slugs):
            print(f"  {i}/{len(slugs)} (rows {len(rows)})", flush=True)
    return rows


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "out/wm-FINAL.json"
    rows = crawl()
    json.dump(rows, open(out, "w"), ensure_ascii=False, indent=2)
    print(f"완료: {len(rows)}행 -> {out}", flush=True)


if __name__ == "__main__":
    main()
