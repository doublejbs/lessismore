#!/usr/bin/env python3
# Zpacks (zpacks.com, Shopify) 크롤 — 핵심기어 + 지팩스 정품 액세서리.
#
# 무게: products.json `variant.grams`. 백팩은 grams=0 이라 상세 HTML 의
#   data-option1/2/3 + data-weight="X oz / Y g" 블록을 파싱해 변형별 g 매핑.
# 변형: 모든 옵션축 확장(색상 + 무게가 달라지는 사이즈/온도/토르소/스트랩/벨트).
#   "Color" 축 → color, 나머지 비색상 축 → size(` / ` join). "Color | Torso" 같은
#   결합 옵션명은 ` | `로 쪼개 부분축별로 분류.
# 제외: bargain/dummy/resale(타브랜드)/materials(원료)/repair/giftcard/add-on,
#   그리고 교체부품·스트랩·벨트 등 부속(스코프=핵심기어+정품 액세서리).
# 이미지: variant.featured_image → 없으면 product 대표. 백팩은 data-image.
# 한글: 지팩스 한국 공식 유통 없음 → 음역. companyKorean="지팩스".
#
# 사용: python3 zpacks.py out/zpacks-FINAL.json
import html
import json
import re
import subprocess
import sys
import time

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
BASE = "https://zpacks.com"


def curl(url):
    time.sleep(0.3)
    for attempt in range(5):
        out = subprocess.run(["curl", "-sS", "-f", "-A", UA, url], capture_output=True, timeout=90)
        if out.returncode == 0:
            return out.stdout.decode("utf-8", "replace")
        if b"429" in out.stderr:
            time.sleep(3 * (attempt + 1))
            continue
        break
    return ""


def fetch_all_products():
    products = []
    for pg in range(1, 14):
        raw = curl(f"{BASE}/products.json?limit=250&page={pg}")
        try:
            ps = json.loads(raw).get("products", [])
        except Exception:
            break
        if not ps:
            break
        products += ps
    return products


# ── 필터 ──────────────────────────────────────────────────────────
OTHER_BRANDS = re.compile(
    r"^\s*(Toaks|Evernew|Sawyer|Adotec|CNOC|Banana Boat|Granger|Nitecore|Therm[- ]?a[- ]?Rest|"
    r"NeoAir|BeFree|Katadyn|Vargo|Sea to Summit|Vaucluse|Glacial Gear|Possumdown|Brushtail)\b",
    re.I,
)
# 부속/교체부품/스트랩 등 — 완제품 아님(스코프 제외)
PART_RE = re.compile(
    r"(replacement|spare|repair|patch|tenacious tape|color band|"
    r"\bstraps?\b|\bbelt\b|strap pads?|lumbar pad|sternum|frame \+ sleeve|"
    r"holster|ice axe loop|webbing belt|closure straps?|top strap|stay holster|"
    r"back panel|trekking pole clasp|pole basket|flex (tent )?pole|titanium arch|"
    r"detachable|multi-pack straps?|insole|foot cap)",
    re.I,
)


def should_skip(p):
    t = p.get("product_type") or ""
    tags = [x.lower() for x in (p.get("tags") or [])]
    title = p.get("title", "")
    if "dummy" in tags or "all-bargains" in tags:
        return True
    if re.search(r"^(Bargain|Dummy|Repair|Gift Card|return|package_protection|Custom Payment)", t):
        return True
    if "Resale" in t or "Materials" in t:
        return True
    if re.search(r"add[- ]?on", title, re.I):
        return True
    if OTHER_BRANDS.search(title):
        return True
    if PART_RE.search(title):
        return True
    if re.search(r"^(Mystery Box|Bikepacking Collection|Did You Know)", title):
        return True
    return False


# ── 카테고리 분류 ──────────────────────────────────────────────────
def route_accessory(title):
    s = title.lower()
    if re.search(r"\bpants?\b|hoody|hoodie|jacket|\bvest\b|fleece|\bshirt\b|"
                 r"camp shoes?|windshell|wind shell|sun hoody|merino|base layer|leggings?", s):
        return "clothing"
    if re.search(r"stuff sack|dry bag|ditty|food bag|pole sack|stake sack|pack liner|"
                 r"packing cube|pack cover|zip pouch|belt pouch|shoulder pouch|"
                 r"bottle sleeve|side pocket|wallet|bear bag|gear nest|umbrella (stuff sack|holster)|"
                 r"rock stuff sack|cooking pot stuff sack|stove stuff sack|airplane case|utility pack", s):
        return "pouch"
    if re.search(r"stake|groundsheet|bathtub|tent pole", s):
        return "tent_acc"
    if re.search(r"\bspoon\b|spork|\bfork\b|cutlery", s):
        return "cutlery"
    if re.search(r"\bcup\b|\bmug\b", s):
        return "cup"
    if re.search(r"\bbowl\b", s):
        return "bowl"
    if re.search(r"\bpot\b|cookware|cook set", s):
        return "cookware_etc"
    if re.search(r"\bbottle\b", s):
        return "bottle"
    if re.search(r"staff|trekking pole(?!\s*(holster|clasp|basket))", s):
        return "trekking_pole"
    if re.search(r"pillow", s):
        return "pillow"
    if re.search(r"sit pad|foam.*pad", s):
        return "mat"
    if re.search(r"sunglass", s):
        return "sunglasses"
    if re.search(r"\bgaiter", s):
        return "gaiter"
    if re.search(r"glove|mitten", s):
        return "gloves"
    if re.search(r"\bhat\b|beanie|hood|cap\b|trucker", s):
        return "clothing"
    if re.search(r"whistle|carabiner|cord|hook|toggle|clip|loop|magnet|trowel|potty|"
                 r"brush|scissors|spray|dwr|sit|staff|stopper|hardware|key", s):
        return "etc"
    return "etc"


def categorize(p):
    t = p.get("product_type") or ""
    title = p.get("title", "")
    if t.startswith("Shelters : Tents"):
        return "tent"
    if t.startswith("Shelters : Tarps"):
        return "tarp"
    if t.startswith("Shelters : Ground") or t.startswith("Shelters : Shelter Acc"):
        return "tent_acc"
    if t.startswith("Backpacks : Accessories"):
        return route_accessory(title)
    if t.startswith("Backpacks"):
        return "backpack"
    if t.startswith("Sleeping Bags : Sleep"):
        return route_accessory(title)
    if t.startswith("Sleeping Bags"):
        return "sleeping_bag"
    if t.startswith("Clothing : Accessories"):
        return route_accessory(title)
    if t.startswith("Clothing"):
        return "clothing"
    # Accessories / 빈 타입 → 제목 라우팅
    return route_accessory(title)


# ── 변형 색상/사이즈 분리 ────────────────────────────────────────────
def classify_axis(name):
    return "color" if "color" in name.lower() else "size"


# 벨트 길이는 순수 허리 사이즈(무게 ~10g 차이)라 변형으로 전개하지 않고 접는다.
# size 에서 제외 → 같은 (색상, size) 로 묶여 대표 1개만 남는다.
def is_collapse_axis(name):
    return "belt" in name.lower()


def variant_color_size(product, variant):
    """variant 의 option1/2/3 을 product.options 의 name(결합축 ' | ' 분해)에 맞춰 color/size 로 분리.
    벨트 축은 size 에서 제외(접기)."""
    colors, sizes = [], []

    def push(value, is_color):
        # "Blue w/ Lite Floor" 같은 색상+구성 결합값은 색상/사이즈로 분리
        if " w/ " in value:
            parts = value.split(" w/ ")
            colors.append(parts[0].strip())
            sizes.append(" w/ ".join(parts[1:]).strip())
        else:
            (colors if is_color else sizes).append(value)

    ovals = [variant.get("option1"), variant.get("option2"), variant.get("option3")]
    for opt, val in zip(product.get("options", []), ovals):
        if not val:
            continue
        name = opt["name"]
        if "|" in name:
            subnames = [s.strip() for s in name.split("|")]
            subvals = [s.strip() for s in val.split(" / ")]
            for sn, sv in zip(subnames, subvals):
                if is_collapse_axis(sn):
                    continue
                push(sv, classify_axis(sn) == "color")
        else:
            if is_collapse_axis(name):
                continue
            push(val, classify_axis(name) == "color")
    color = " / ".join([c for c in colors if c])
    size = " / ".join([s for s in sizes if s and s != "Default Title"])
    return color, size


# ── 백팩 HTML data-weight/이미지 ────────────────────────────────────
def backpack_weights(slug):
    """상세 HTML 의 data-option*/data-weight/data-image 블록 → {(o1,o2,o3): (grams, image)}."""
    t = curl(f"{BASE}/products/{slug}")
    out = {}
    for m in re.finditer(r'data-option1="([^"]*)"[\s\S]{0,600}?data-weight="([^"]*)"(?:[\s\S]{0,200}?data-image="([^"]*)")?', t):
        pass  # option2/3 가 option1 앞에 올 수 있어 블록 단위로 다시 파싱
    # 블록 경계가 불명확하므로 각 변형 컨테이너를 option1~image 묶음으로 스캔
    for blk in re.findall(r'data-option1="[^"]*"[\s\S]{0,800}?data-image="[^"]*"', t):
        o1 = re.search(r'data-option1="([^"]*)"', blk)
        o2 = re.search(r'data-option2="([^"]*)"', blk)
        o3 = re.search(r'data-option3="([^"]*)"', blk)
        w = re.search(r'data-weight="([^"]*)"', blk)
        img = re.search(r'data-image="([^"]*)"', blk)
        key = (html.unescape(o1.group(1)) if o1 else "",
               html.unescape(o2.group(1)) if o2 else "",
               html.unescape(o3.group(1)) if o3 else "")
        grams = 0
        if w:
            gm = re.search(r"/\s*([\d.]+)\s*g", w.group(1))
            if gm:
                grams = round(float(gm.group(1)))
        image = img.group(1) if img else ""
        if image.startswith("//"):
            image = "https:" + image
        image = image.split("?")[0]
        out[key] = (grams, image)
    return out


# ── 한글 음역 ──────────────────────────────────────────────────────
COLOR_KOR = {
    "black": "블랙", "jet black": "제트 블랙", "blue": "블루", "azure blue": "애저 블루",
    "navy blue": "네이비 블루", "olive drab": "올리브 드랩", "spruce green": "스프루스 그린",
    "green": "그린", "orange": "오렌지", "burnt orange": "번트 오렌지", "storm gray": "스톰 그레이",
    "gray": "그레이", "grey": "그레이", "white": "화이트", "red": "레드", "yellow": "옐로",
    "purple": "퍼플", "pink": "핑크", "tan": "탄", "coyote": "코요테", "spruce": "스프루스",
    "charcoal": "차콜", "autumn": "어텀", "mustard": "머스타드", "turquoise": "터쿼이즈",
    "lilac": "라일락", "mint": "민트", "teal": "틸", "forest": "포레스트", "caspian": "캐스피언",
    "dusk": "더스크", "light": "라이트", "tropical": "트로피컬", "olive": "올리브",
    "navy": "네이비", "sand": "샌드", "jet": "제트", "drab": "드랩", "horizon": "호라이즌",
    "trim": "트림", "reversible": "리버서블", "shell": "쉘", "liner": "라이너", "ultra": "울트라",
    "azure": "애저", "storm": "스톰", "dark": "다크", "aluminum": "알루미늄", "folded": "폴디드",
    "ankle": "앵클", "calf": "카프", "stormy": "스토미", "spicy": "스파이시", "burnt": "번트",
}
SIZE_WORD_KOR = {
    "small": "스몰", "medium": "미디엄", "large": "라지", "extra large": "엑스라지",
    "short": "숏", "long": "롱", "tall": "톨", "wide": "와이드", "standard": "스탠다드",
    "slim": "슬림", "broad": "브로드", "regular": "레귤러", "xs": "엑스스몰", "s": "스몰",
    "m": "미디엄", "l": "라지", "xl": "엑스라지", "xxl": "더블엑스라지",
    "torso": "토르소", "straps": "스트랩", "strap": "스트랩", "vest": "베스트",
    "women's": "우먼", "men's": "맨", "single": "싱글", "double": "더블", "section": "섹션",
    "extra": "엑스트라", "xx": "더블엑스", "lite": "라이트", "floor": "플로어",
    "reversible": "리버서블", "shell": "쉘", "liner": "라이너",
}

# 모델명 음역 (Zpacks 한국 공식명 없음 → 음역). 숫자/단위(60L, 10', 2g 등)·미등재어는 원문 유지.
NAME_KOR = {
    "tent": "텐트", "backpack": "백팩", "bag": "백", "sack": "색", "zip": "집",
    "stuff": "스터프", "arc": "아크", "ultra": "울트라", "trail": "트레일", "haul": "홀",
    "dry": "드라이", "pouch": "파우치", "stick": "스틱", "stick-on": "스틱온", "on": "온",
    "octa": "옥타", "hoody": "후디", "hoodie": "후디", "fleece": "플리스",
    "groundsheet": "그라운드시트", "pro": "프로", "ultralight": "울트라라이트", "camp": "캠프",
    "cool": "쿨", "rain": "레인", "flat": "플랫", "solo": "솔로", "solo-plus": "솔로플러스",
    "classic": "클래식", "duplex": "듀플렉스", "duplexl": "듀플XL", "triplex": "트리플렉스",
    "t-shirt": "티셔츠", "townshirt": "타운셔츠", "shirt": "셔츠", "hiking": "하이킹",
    "pants": "팬츠", "joggers": "조거", "shorts": "쇼츠", "kilt": "킬트", "bottoms": "바텀",
    "leggings": "레깅스", "case": "케이스", "pack": "팩", "big": "빅", "tarp": "타프",
    "pole": "폴", "poles": "폴", "sleeping": "슬리핑", "large": "라지", "nero": "네로",
    "cord": "코드", "travel": "트래블", "wool": "울", "jacket": "자켓", "pivot": "피벗",
    "merino": "메리노", "sun": "선", "down": "다운", "pillow": "필로우", "hexamid": "헥사미드",
    "bathtub": "배스텁", "hat": "햇", "vertice": "버티스", "pocket": "포켓", "quilt": "퀼트",
    "food": "푸드", "loop": "루프", "wallet": "월렛", "kit": "키트", "stake": "스테이크",
    "altaplex": "알타플렉스", "hook": "훅", "sunglasses": "선글라스", "pullover": "풀오버",
    "full": "풀", "ultraepx": "울트라EPX", "mirage": "미라지", "mini": "미니",
    "titanium": "티타늄", "airplane": "에어플레인", "gear": "기어", "liner": "라이너",
    "pad": "패드", "toggle": "토글", "brushtail": "브러시테일", "possum": "포섬",
    "gloves": "글러브", "mitts": "미트", "mitten": "미튼", "utility": "유틸리티",
    "pair": "페어", "slim": "슬림", "shoulder": "숄더", "disc": "디스크", "plex": "플렉스",
    "plexamid": "플렉사미드", "pachallama": "파찰라마", "carbon-pin": "카본핀", "crest": "크레스트",
    "convertible": "컨버터블", "reflective": "리플렉티브", "z-line": "Z라인",
    "microfiber": "마이크로파이버", "cloth": "클로스", "radiant": "래디언트", "thermal": "써멀",
    "ventum": "벤텀", "wind": "윈드", "shell": "쉘", "trio": "트리오", "duo": "듀오",
    "tiny": "타이니", "oval": "오벌", "carabiner": "카라비너", "wide": "와이드", "mouth": "마우스",
    "hood": "후드", "comfy": "컴피", "booties": "부티", "socks": "삭스", "hair": "헤어",
    "brush": "브러시", "mirror": "미러", "spoon": "스푼", "cup": "컵", "bowl": "볼",
    "trucker": "트러커", "shoes": "슈즈", "potty": "포티", "trowel": "트라월", "itty": "이티",
    "bitty": "비티", "ditty": "디티", "whistle": "휘슬", "super": "슈퍼", "button": "버튼",
    "up": "업", "twin": "트윈", "dog": "독", "glacial": "글레이셜", "rag": "랙", "lite": "라이트",
    "sling": "슬링", "bags": "백", "mummy": "머미", "summer": "서머", "winter": "윈터",
    "slide": "슬라이드", "stopper": "스토퍼", "set": "세트", "springless": "스프링리스",
    "lock": "락", "around": "어라운드", "nest": "네스트", "magnet": "마그넷",
    "fingerless": "핑거리스", "molle": "몰리", "extra": "엑스트라", "stove": "스토브",
    "clip": "클립", "trekking": "트레킹", "key": "키", "tablet": "태블릿", "phablet": "패블릿",
    "phone": "폰", "multi-pack": "멀티팩", "tri-fold": "트라이폴드", "minimalist": "미니멀리스트",
    "packing": "패킹", "cubes": "큐브", "cover": "커버", "cooking": "쿠킹", "pot": "팟",
    "rectangle": "렉탱글", "tall": "톨", "front": "프론트", "accessory": "액세서리",
    "carbon": "카본", "fiber": "파이버", "staff": "스태프", "poncho": "판초",
    "double-hook": "더블훅", "apparatus": "어패러터스", "umbrella": "엄브렐라", "arches": "아치",
    "glasses": "글라스", "attachment": "어태치먼트", "passport": "패스포트",
    "conductive": "컨덕티브", "bagger": "배거", "zipper": "지퍼", "bear": "베어",
    "bagging": "배깅", "water": "워터", "bottle": "보틀", "sleeve": "슬리브", "top": "탑",
    "side": "사이드", "gaiters": "게이터", "gaiter": "게이터", "foam": "폼", "sit": "싯",
    "freestanding": "프리스탠딩", "flex": "플렉스", "micro-fleece": "마이크로플리스",
    "mesh": "메쉬", "foldable": "폴더블", "neck": "넥", "document": "도큐먼트", "rock": "락",
    "rock-solid": "락솔리드", "regular": "레귤러", "medium": "미디엄", "small": "스몰",
    "women's": "우먼", "men's": "맨", "feet": "피트", "small-plus": "스몰플러스",
    "medium-plus": "미디엄플러스", "the": "", "of": "", "with": "", "w": "", "x": "x", "&": "&",
    "no": "노", "lineloc": "라인록", "ass": "애스", "trim": "트림", "v": "V", "for": "",
    "pack)": "팩)", "(4": "(4", "pack": "팩", "(for": "(",
}
# 음역에서 그대로 둘 토큰: 숫자/용량/치수/단위
PASS_RE = re.compile(r"^[\d.\"'\-]+[a-z]*$|^\d+[lLgF]$|^\(.*\)$|^DCF$|^XL$|^DISC$", re.I)


def transliterate_name(title):
    title = re.sub(r"^Zpacks\s+", "", title).strip()
    out = []
    for w in title.split():
        low = w.lower().strip(",")
        if low in NAME_KOR:
            ko = NAME_KOR[low]
            if ko:
                out.append(ko)
        elif re.match(r"^\d+(\.\d+)?[a-zA-Z\"']*$", w) or PASS_RE.match(w):
            out.append(w)  # 60L, 10', 2g, 6", 32" 등
        else:
            out.append(w)  # 미등재어는 원문 유지(후속 사전 보강 가능)
    return re.sub(r"\s+", " ", " ".join(out)).strip()


def _tr_word(w, *maps):
    low = w.lower()
    for m in maps:
        if low in m:
            return m[low]
    return w


def color_kor(s):
    if not s:
        return ""
    out = []
    for part in re.split(r"\s*/\s*", s):
        p = part.strip()
        if not p:
            continue
        low = p.lower()
        out.append(COLOR_KOR.get(low) or " ".join(_tr_word(w, COLOR_KOR) for w in low.split()))
    return " / ".join(out)


def size_kor(s):
    if not s:
        return ""
    s = re.sub(r"\([^)]*\)", "", s)  # 괄호(피팅 설명/치수/℃) 제거 — 분할 전(내부 ' / ' 깨짐 방지)
    out = []
    for seg in re.split(r"\s*/\s*", s):
        seg = seg.strip()
        if not seg:
            continue
        # 온도 "20F (-7C)" → -7℃
        mt = re.search(r"(-?\d+)\s*F", seg)
        if mt and re.search(r"\bF\b|F\s*\(", seg):
            out.append(f"{round((int(mt.group(1)) - 32) * 5 / 9)}℃")
            continue
        words = [_tr_word(w, SIZE_WORD_KOR, COLOR_KOR, NAME_KOR) for w in re.split(r"[\s-]+", seg) if w]
        out.append(" ".join(words))
    return " / ".join(out)


def slugify(name):
    return "zpacks_" + re.sub(r"[^a-z0-9가-힣]+", "-", re.sub(r"™|®", "", name).strip().lower()).strip("-")


# ── 스펙(제목 기반 best-effort) ──────────────────────────────────────
def build_specs(cat, title, size):
    t = title.lower()
    sp = {}
    if cat in ("backpack",):
        mv = re.search(r"(\d+)\s*L\b", title)
        sp["volume"] = int(mv.group(1)) if mv else ""
        sp["gender"] = "female" if "women" in t else ("male" if "men" in t else "unisex")
    elif cat == "tent":
        # Zpacks 텐트는 제목에 "N Person"이 없고 제품군명으로 인원을 표현
        mc = re.search(r"(\d+)\s*[- ]?person", t)
        if mc:
            sp["capacity"] = int(mc.group(1))
        elif re.search(r"triplex|\btrio\b", t):
            sp["capacity"] = 3
        elif re.search(r"duplex|duplexl|\bduo\b", t):
            sp["capacity"] = 2
        elif re.search(r"\bsolo\b|altaplex|hexamid|plexamid|\bplex\b", t):
            sp["capacity"] = 1
    elif cat == "sleeping_bag":
        sp["fillMaterial"] = "down"
        mt = re.search(r"(-?\d+)\s*F", size or title)
        if mt:
            sp["limitTemp"] = round((int(mt.group(1)) - 32) * 5 / 9)
        if "quilt" in t:
            sp["shape"] = "퀼트"
        elif "mummy" in t:
            sp["shape"] = "머미"
    elif cat == "clothing":
        sp["isWaterproof"] = bool(re.search(r"rain|waterproof|vertice", t))
        sp["hasHood"] = bool(re.search(r"hood", t))
    return {k: v for k, v in sp.items() if v not in ("", None)}


# ── 메인 ──────────────────────────────────────────────────────────
def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else "out/zpacks-FINAL.json"
    products = fetch_all_products()
    print(f"fetched {len(products)} products")
    kept = [p for p in products if not should_skip(p)]
    print(f"after filter: {len(kept)}")

    rows = []
    seen = set()  # (groupId, color, size) — 벨트 접기 등으로 중복되는 변형 dedup(대표 1개)
    for p in kept:
        cat = categorize(p)
        slug = p["handle"]
        title = re.sub(r"™|®", "", p["title"]).strip()
        nameKo = transliterate_name(title)  # 공식 한글명 없음 → 음역
        variants = p.get("variants", [])
        all_grams_zero = all(not v.get("grams") for v in variants)
        bp = backpack_weights(slug) if (cat == "backpack" and all_grams_zero) else {}

        # 이미지: image_id → src 맵
        imgid2src = {im["id"]: im["src"].split("?")[0] for im in p.get("images", [])}
        default_img = (p.get("images") or [{}])[0].get("src", "").split("?")[0]

        for v in variants:
            color, size = variant_color_size(p, v)
            dkey = (slugify(title), color, size)
            if dkey in seen:
                continue
            seen.add(dkey)
            grams = v.get("grams") or 0
            vimg = ""
            if bp:
                key = (v.get("option1") or "", v.get("option2") or "", v.get("option3") or "")
                g, im = bp.get(key, (0, ""))
                grams = grams or g
                vimg = im
            if not vimg:
                fi = v.get("featured_image")
                vimg = (fi["src"].split("?")[0] if fi else imgid2src.get(v.get("image_id"))) or default_img

            name_en = f"{title} {size}".strip() if size else title
            rows.append({
                "groupId": slugify(title),
                "category": cat,
                "company": "zpacks",
                "companyKorean": "지팩스",
                "name": name_en,
                "nameKorean": f"{nameKo} {size_kor(size)}".strip() if size else nameKo,
                "color": color,
                "colorKorean": color_kor(color),
                "size": size,
                "sizeKorean": size_kor(size),
                "weight": grams,
                "imageUrl": vimg,
                "specs": build_specs(cat, title, size),
                "_source": f"{BASE}/products/{slug}",
            })

    json.dump(rows, open(out_path, "w"), ensure_ascii=False, indent=2)
    from collections import Counter
    print(f"{len(rows)} rows -> {out_path}")
    print("by category:", dict(Counter(r["category"] for r in rows)))
    print("weight>0:", sum(1 for r in rows if r["weight"]), "/", len(rows))


if __name__ == "__main__":
    main()
