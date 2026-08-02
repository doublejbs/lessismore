#!/usr/bin/env python3
# 시에라디자인 크롤 — 2소스 하이브리드.
#  (A) 한국 공식(sierra-designs.co.kr, Cafe24): 전 제품(의류+기어). 한글명·색상·이미지.
#      ★ "View All"(231) 에는 기어(텐트/침낭/배낭)가 빠져 있다 → 기어 전용 카테고리
#         (152~367)를 카테고리 번호로 정확 분류해 먼저 크롤하고, 231 로 나머지(의류) 보충.
#      옵션(사이즈)은 Cafe24 JS 렌더라 product_no(색상) 단위 행. 무게는 텍스트에 거의 없음(이미지).
#  (B) 미국 공식(sierradesigns.com, Shopify): 기어 무게/스펙. KR 에 없는 기어 추가(영문명 음역).
# 사용: python3 sierra-designs.py out/sierra-designs-FINAL.json
import html
import json
import re
import subprocess
import sys
import time

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
KR = "https://sierra-designs.co.kr"
US = "https://sierradesigns.com"


def curl(url):
    time.sleep(0.15)
    for _ in range(4):
        out = subprocess.run(["curl", "-sS", "-m", "25", "-A", UA, url], capture_output=True, timeout=30)
        if out.returncode == 0:
            return out.stdout.decode("utf-8", "replace")
        time.sleep(1)
    return ""


# ── 색상 음역 ──────────────────────────────────────────────────────
COLOR_KOR = {
    "black": "블랙", "white": "화이트", "grey": "그레이", "gray": "그레이", "navy": "네이비",
    "blue": "블루", "green": "그린", "red": "레드", "orange": "오렌지", "yellow": "옐로",
    "ivory": "아이보리", "beige": "베이지", "khaki": "카키", "brown": "브라운", "pink": "핑크",
    "purple": "퍼플", "sage": "세이지", "mint": "민트", "lemon": "레몬", "greige": "그레이지",
    "charcoal": "차콜", "natural": "내추럴", "cream": "크림", "olive": "올리브", "sky": "스카이",
    "skyblue": "스카이블루", "union": "유니온", "dark": "다크", "light": "라이트", "sand": "샌드",
    "coral": "코랄", "teal": "틸", "burgundy": "버건디", "wine": "와인", "mustard": "머스타드",
    "silver": "실버", "gold": "골드", "camel": "카멜", "lavender": "라벤더", "peach": "피치",
    "multi": "멀티", "tan": "탄", "forest": "포레스트", "stone": "스톤",
}
COLOR_TOKEN = re.compile(r"\s+((?:[LDN]\.)?[A-Z][A-Z.]+(?:\s+(?:[LDN]\.)?[A-Z][A-Z.]+){0,2})$")


def color_kor(en):
    if not en:
        return ""
    out = []
    for w in re.split(r"[\s/]+", en):
        w2 = re.sub(r"^[LDN]\.", "", w).strip(".").lower()
        if not w2:
            continue
        pre = ""
        if w.upper().startswith("L."):
            pre = "라이트 "
        elif w.upper().startswith("D."):
            pre = "다크 "
        elif w.upper().startswith("N."):
            pre = "네온 "
        out.append(pre + COLOR_KOR.get(w2, w2))
    return " ".join(out)


def split_name_color(raw):
    name = html.unescape(raw).strip()
    m = COLOR_TOKEN.search(name)
    color = ""
    if m:
        cand = m.group(1).strip()
        toks = [re.sub(r"^[LDN]\.", "", w).strip(".").lower() for w in re.split(r"\s+", cand)]
        if any(t in COLOR_KOR for t in toks):
            color = cand
            name = name[: m.start()].strip()
    return name, color


def slugify(s):
    return "sierra-designs_" + re.sub(r"[^a-z0-9가-힣]+", "-", re.sub(r"[™®()\[\]]", " ", s).strip().lower()).strip("-")


def categorize_kr(name):
    s = name
    if re.search(r"글러브|장갑|미트", s):
        return "gloves"
    if re.search(r"백팩|배낭|플렉스\s*(카파시터|캐퍼시터|트레일|하이크|럼바)", s) and not re.search(r"팬츠|자켓|재킷|셔츠|후드|베스트", s):
        return "backpack"
    if re.search(r"힙색|크로스백|사코슈|메신저|숄더백|토트|파우치|하프문\s*백|플로깅\s*백|보틀\s*크로스|웨이스트백|슬링백", s):
        return "pouch"
    if re.search(r"트레킹\s*폴|트레킹폴|스틱", s):
        return "trekking_pole"
    if re.search(r"게이터|스패츠|넥게이터|넥\s*게이터", s):
        return "gaiter"
    if re.search(r"선글라스|고글", s):
        return "sunglasses"
    if re.search(r"지갑|월렛|스토리지\s*박스|헤어밴드|키링|파우치백", s):
        return "etc"
    if re.search(r"티셔츠|반팔|긴팔|셔츠|자켓|재킷|파카|팬츠|후드|후디|맨투맨|싱글렛|베스트|조끼|코트|다운|"
                 r"플리스|폴리스|바지|슬리브|집업|점퍼|풀오버|니트|가디건|양말|삭스|니삭스|비니|캡|햇|모자|"
                 r"버킷|볼캡|바라클라바|스카프|머플러|플립플롭|썬후디|슬랙스|쇼츠|반바지|레깅스|바람막이|아노락|"
                 r"윈드|우븐|스웨트|후드티|롱슬리브|탱크|나시|양털", s):
        return "clothing"
    return "etc"


# ── (A) KR 크롤 ────────────────────────────────────────────────────
# 기어 전용 카테고리는 카테고리 번호로 정확 분류(231 "View All" 엔 기어가 빠져 있음).
# 텐트/침낭은 이름에 종류 키워드가 없어 카테고리 번호로 고정.
# 가방류(배낭/백패킹팩/데이팩/악세서리)는 크로스백·사코슈·힙색 등이 섞여 있어 이름 키워드로 분류.
KR_GEAR_CATS = {
    152: "tent", 153: "tent", 154: "tent", 174: "tent",   # 초경량/백패킹/캠핑/텐트
    155: "tent_acc",
    175: "sleeping_bag", 198: "sleeping_bag",             # 침낭/다운침낭
}
KR_BAG_CATS = [176, 202, 367, 204]  # 배낭/백패킹팩/데이팩/배낭악세서리 → 키워드 분류


def crawl_kr():
    rows = []
    seen = set()
    plan = list(KR_GEAR_CATS.items()) + [(c, None) for c in KR_BAG_CATS] + [(231, None)]
    for cno, fixed_cat in plan:
        page = 1
        while page <= 60:
            t = curl(f"{KR}/category/all/{cno}/?page={page}")
            blocks = re.split(r"anchorBoxId_", t)[1:]
            if not blocks:
                break
            added = 0
            for b in blocks:
                mo = re.match(r"(\d+)", b)
                if not mo:
                    continue
                no = mo.group(1)
                if no in seen:
                    continue
                price = re.search(r'ec-data-price="(\d+)"', b)
                alt = re.search(r'alt="([^"]+)"', b)
                if not price or not alt or price.group(1) == "0":
                    continue
                seen.add(no)
                added += 1
                name_raw = alt.group(1)
                img = re.search(r'src="(//[^"]+/web/product/(?:big|medium)[^"]+\.(?:jpg|png|gif))"', b)
                image = ("https:" + img.group(1).split("?")[0]) if img else ""
                base, color = split_name_color(name_raw)
                cat = fixed_cat or categorize_kr(base)
                # 풋프린트/그라운드시트/폴대는 텐트 카테고리에 섞여 있어도 tent_acc
                if re.search(r"풋프린트|그라운드\s*시트|폴대|팩\s*세트|스테이크|가이라인", base):
                    cat = "tent_acc"
                rows.append({
                    "groupId": slugify(base),
                    "category": cat,
                    "company": "sierra-designs",
                    "companyKorean": "시에라디자인",
                    "name": html.unescape(name_raw).strip(),
                    "nameKorean": base,
                    "color": color,
                    "colorKorean": color_kor(color),
                    "size": "",
                    "sizeKorean": "",
                    "weight": 0,
                    "imageUrl": image,
                    "specs": {},
                    "_source": f"{KR}/product/detail.html?product_no={no}",
                })
            if added == 0:
                break
            page += 1
    return rows


# ── (B) US 기어 (Shopify) ─────────────────────────────────────────
US_COLLECTIONS = {
    "tents": "tent", "ultralight-tents": "tent", "bivy": "tent",
    "tent-accessories": "tent_acc",
    "sleeping-bags": "sleeping_bag", "zippered-sleeping-bags": "sleeping_bag",
    "zipperless-sleeping-bags": "sleeping_bag", "cloud-sleep-systems": "sleeping_bag",
    "blankets-and-quilts": "sleeping_bag",
    "backpacking-packs": "backpack", "daypacks": "backpack", "packs": "backpack",
    "packs-storage": "pouch",
}
US_NAME_KOR = {
    "tent": "텐트", "quilt": "퀼트", "sleeping": "슬리핑", "bag": "백", "pack": "팩",
    "lite": "라이트", "storm": "스톰", "cloud": "클라우드", "meteor": "메테오", "high": "하이",
    "side": "사이드", "route": "루트", "clip": "클립", "flashlight": "플래시라이트",
    "backcountry": "백컨트리", "bivy": "비비", "zipperless": "지퍼리스", "zippered": "지퍼드",
    "nexus": "넥서스", "flex": "플렉스", "capacitor": "카파시터", "trail": "트레일", "hike": "하이크",
    "lumbar": "럼바", "blanket": "블랭킷", "reg": "레귤러", "regular": "레귤러", "long": "롱",
    "short": "숏", "deg": "도", "series": "시리즈", "system": "시스템", "footprint": "풋프린트",
    "stuff": "스터프", "sack": "색", "the": "", "of": "",
    "bed": "베드", "frontcountry": "프론트컨트리", "nitro": "니트로", "duo": "듀오",
    "queen": "퀸", "green": "그린", "night": "나이트", "elite": "엘리트", "starflight": "스타플라이트",
    "synthetic": "신세틱", "down": "다운", "mummy": "머미", "warm": "웜", "convert": "컨버트",
}
SIZE_KOR = {"long": "롱", "regular": "레귤러", "reg": "레귤러", "short": "숏", "s/m": "S/M",
            "m/l": "M/L", "small": "스몰", "medium": "미디엄", "large": "라지", "wide": "와이드"}


def us_translit(title):
    title = re.sub(r"[™®]", "", title).strip()
    out = []
    for w in title.split():
        low = w.lower()
        if low in US_NAME_KOR:
            if US_NAME_KOR[low]:
                out.append(US_NAME_KOR[low])
        else:
            out.append(w)
    return re.sub(r"\s+", " ", " ".join(out)).strip()


def us_size_kor(s):
    return " / ".join(SIZE_KOR.get(x.strip().lower(), x.strip()) for x in s.split("/")) if s else ""


def us_specs(cat, title):
    t = title.lower()
    sp = {}
    if cat == "tent":
        m = re.search(r"(\d+)\s*p\b", t)
        if m:
            sp["capacity"] = int(m.group(1))
    elif cat == "backpack":
        m = re.search(r"(\d+)(?:-\d+)?\s*l\b", t)
        if m:
            sp["volume"] = int(m.group(1))
    elif cat == "sleeping_bag":
        mfp = re.search(r"(\d+)\s*f\b", t)
        if mfp:
            sp["fillPower"] = int(mfp.group(1))
        mt = re.search(r"(-?\d+)\s*deg", t)
        if mt:
            sp["limitTemp"] = round((int(mt.group(1)) - 32) * 5 / 9)
        if "quilt" in t:
            sp["shape"] = "퀼트"
        sp["fillMaterial"] = "down" if re.search(r"\bdown\b|\d+\s*f\b", t) else ""
    return {k: v for k, v in sp.items() if v not in ("", None)}


def crawl_us():
    added = []
    seen_handle = set()
    for col, cat in US_COLLECTIONS.items():
        try:
            d = json.loads(curl(f"{US}/collections/{col}/products.json?limit=250"))
        except Exception:
            continue
        for p in d.get("products", []):
            h = p["handle"]
            if h in seen_handle:
                continue
            seen_handle.add(h)
            title = re.sub(r"[™®]", "", p["title"]).strip()
            pcat = cat
            if re.search(r"footprint|stake|guy ?line|pole set|repair", title, re.I):
                pcat = "tent_acc"
            imgid2src = {im["id"]: im["src"].split("?")[0] for im in p.get("images", [])}
            default_img = (p.get("images") or [{}])[0].get("src", "").split("?")[0]
            nameKo = us_translit(title)
            color_idx = next((i for i, o in enumerate(p["options"]) if o["name"].lower() == "color"), None)
            for v in p["variants"]:
                ovals = [v.get("option1"), v.get("option2"), v.get("option3")]
                col_v = ovals[color_idx] if color_idx is not None and color_idx < len(ovals) else ""
                size_v = " / ".join(ovals[i] for i in range(len(ovals))
                                    if i != color_idx and ovals[i] and ovals[i] != "Default Title")
                fi = v.get("featured_image")
                vimg = (fi["src"].split("?")[0] if fi else imgid2src.get(v.get("image_id"))) or default_img
                added.append({
                    "groupId": slugify(title),
                    "category": pcat,
                    "company": "sierra-designs",
                    "companyKorean": "시에라디자인",
                    "name": f"{title} {size_v}".strip() if size_v else title,
                    "nameKorean": f"{nameKo} {us_size_kor(size_v)}".strip() if size_v else nameKo,
                    "color": col_v or "",
                    "colorKorean": color_kor(col_v) if col_v else "",
                    "size": size_v,
                    "sizeKorean": us_size_kor(size_v),
                    "weight": v.get("grams") or 0,
                    "imageUrl": vimg,
                    "specs": us_specs(pcat, title),
                    "_source": f"{US}/products/{h}",
                })
    return added


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else "out/sierra-designs-FINAL.json"
    from collections import Counter
    kr = crawl_kr()
    print(f"KR rows: {len(kr)}")
    us_added = crawl_us()
    print(f"US 기어 추가: {len(us_added)}")
    rows = kr + us_added
    print(f"총 {len(rows)} rows")
    print("by category:", dict(Counter(r["category"] for r in rows)))
    print("weight>0:", sum(1 for r in rows if r["weight"]), "/", len(rows))
    json.dump(rows, open(out_path, "w"), ensure_ascii=False, indent=2)
    print(f"-> {out_path}")


if __name__ == "__main__":
    main()
