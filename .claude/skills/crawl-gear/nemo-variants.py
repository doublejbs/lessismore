#!/usr/bin/env python3
# nemo-global.py 가 만든 행을 products.json 옵션 구조로 정규화한다.
# - size 필드에 색상이 섞인 문제(색상축 변형: 체어/베개/더플)를 옵션축으로 정확히 분리
# - 영문 name / 한글 nameKorean 끝에 사이즈 부착(색상은 부착 안 함) — 스킬 "변형 처리" 룰
# - colorKorean / sizeKorean 음역 채움 — 스킬 한글화 룰 (℉→℃ 변환)
# - 변형별 이미지: products.json variant.image_id 가 가리키는 사진을 변형마다 적용
#   (매트=사이즈별, 체어/베개/더플=색상별). 매핑 없으면 og:image 유지.
# 사용: python3 nemo-variants.py out/nemo-FINAL.json
import json
import re
import subprocess
import sys
import time

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
BASE = "https://www.nemoequipment.com"

COLOR_KOR = {
    "Algiers": "알지에", "Algiers Blue": "알지에 블루", "Aluminum": "알루미늄",
    "Aquifer": "아퀴퍼", "Arctic": "아틱", "Atoll": "아톨", "Azure": "애저",
    "Birch Bud": "버치 버드", "Black": "블랙", "Black Pearl": "블랙 펄",
    "Blade": "블레이드", "Blue Granite": "블루 그래나이트", "Blue Horizon": "블루 호라이즌",
    "Boreal": "보레알", "Brilliant Blue": "브릴리언트 블루", "Chimera": "키메라",
    "Chocolate": "초콜릿", "Cipher": "사이퍼", "Citron": "시트론", "Deep Claret": "딥 클라렛",
    "Field": "필드", "Fog": "포그", "Fortress": "포트리스", "Fortress Mirage": "포트리스 미라지",
    "Frost": "프로스트", "Golden Oak": "골든 오크", "Goldfinch": "골드핀치",
    "Goodnight Black": "굿나잇 블랙", "Goodnight Gray": "굿나잇 그레이", "Huckleberry": "허클베리",
    "Lagoon": "라군", "Lake": "레이크", "Lumen": "루멘", "Mango": "망고", "Marsh": "마쉬",
    "Monarch": "모나크", "Oasis": "오아시스", "Odyssey Gray": "오디세이 그레이",
    "Ombre Blue": "옴브레 블루", "Pelican": "펠리칸", "Quicksilver": "퀵실버", "Rose": "로즈",
    "Sedona Sage": "세도나 세이지", "Silt": "실트", "Silt Stripe": "실트 스트라이프",
    "Smokey Olive": "스모키 올리브", "Spicy Orange": "스파이시 오렌지", "Stormy Night": "스토미 나이트",
    "Sun Orange": "썬 오렌지", "Sunset Orange": "선셋 오렌지", "Titanium": "티타늄",
    "Torch": "토치", "Tracker": "트래커", "Waypoint": "웨이포인트",
}

SIZE_WORD_KOR = {
    "regular": "레귤러", "long": "롱", "short": "숏", "medium": "미디엄", "large": "라지",
    "small": "스몰", "wide": "와이드", "mummy": "머미", "rectangular": "렉탱귤러",
    "single": "싱글", "double": "더블",
}


def fetch(url):
    time.sleep(0.5)
    for attempt in range(5):
        out = subprocess.run(["curl", "-sS", "-f", "-A", UA, url], capture_output=True, timeout=60)
        if out.returncode == 0:
            return out.stdout
        if b"429" in out.stderr:
            time.sleep(3 * (attempt + 1))
            continue
        break
    return b""


def color_kor(s):
    if not s:
        return ""
    parts = [p.strip() for p in str(s).split("/") if p.strip()]
    out = []
    for p in parts:
        if p in COLOR_KOR:
            out.append(COLOR_KOR[p])
        else:
            # 모르는 색상은 단어별 매핑 시도, 없으면 영문 유지
            words = [COLOR_KOR.get(w, w) for w in p.split()]
            out.append(" ".join(words))
    return " / ".join(out)


def f_to_c(seg):
    # "15℉" / "15/25℉" → "-9℃" / "-9/-4℃"
    m = re.match(r"(-?\d+)(?:/(-?\d+))?℉", seg.strip())
    if not m:
        return None
    nums = [int(m.group(1))]
    if m.group(2):
        nums.append(int(m.group(2)))
    conv = [str(round((n - 32) * 5 / 9)) for n in nums]
    return "/".join(conv) + "℃"


def size_kor(s):
    # 사이즈축은 빌드시 " / " 로 join 되므로 그 구분자로만 세그먼트를 나눈다.
    # (℉ 범위 "15/25℉" 안의 "/" 는 건드리지 않음)
    if not s:
        return ""
    result = []
    for seg in [x.strip() for x in str(s).split(" / ") if x.strip()]:
        c = f_to_c(seg)
        if c:
            result.append(c)
            continue
        mp = re.match(r"(\d+)-Person", seg)
        if mp:
            result.append(f"{mp.group(1)}인용")
            continue
        ms = re.match(r"Set of (\d+)", seg)
        if ms:
            result.append(f"{ms.group(1)}개 세트")
            continue
        words = [SIZE_WORD_KOR.get(w.lower(), w) for w in seg.split()]
        result.append(" ".join(words))
    return " / ".join(result)


def main():
    path = sys.argv[1]
    rows = json.load(open(path))

    # 슬러그별 products.json 캐시
    pj_cache = {}

    def get_pj(slug):
        if slug not in pj_cache:
            raw = fetch(f"{BASE}/products/{slug}.json")
            try:
                pj_cache[slug] = json.loads(raw.decode("utf-8", "replace"))["product"]
            except Exception:
                pj_cache[slug] = None
        return pj_cache[slug]

    changed = 0
    for r in rows:
        src = r.get("_source", "")
        if "/products/" not in src:
            continue  # 한국 한정(고시이미지) 행은 건드리지 않음
        slug = src.rsplit("/products/", 1)[-1]
        p = get_pj(slug)
        if not p:
            continue

        opts = p.get("options", [])
        color_idx = next((i for i, o in enumerate(opts) if o["name"].strip().lower() == "color"), None)
        size_idxs = [i for i in range(len(opts)) if i != color_idx]

        # image_id -> src (변형별 이미지: 매트=사이즈별, 체어/베개/더플=색상별)
        imgid2src = {im["id"]: im["src"].split("?")[0] for im in p.get("images", [])}

        # variant.title -> (color, size, image)
        vmap = {}
        for v in p.get("variants", []):
            ovals = [v.get("option1"), v.get("option2"), v.get("option3")]
            col = ovals[color_idx] if color_idx is not None and color_idx < len(ovals) else None
            size = " / ".join([ovals[i] for i in size_idxs if i < len(ovals) and ovals[i]])
            vmap[v["title"]] = (col or "", size, imgid2src.get(v.get("image_id")))

        # 현재 size(=HTML 변형 라벨) 로 매칭, 단일변형이면 그대로
        cur = r.get("size", "")
        if cur in vmap:
            col, size, vimg = vmap[cur]
        elif len(vmap) == 1:
            col, size, vimg = next(iter(vmap.values()))
        else:
            col, size, vimg = None, cur, None

        if size in ("Default Title", "One Size", None):
            size = ""

        # 색상: products.json 에 Color 옵션이 있으면 그 값, 없으면 HTML 색상(기존) 유지
        if color_idx is not None and col:
            r["color"] = col
        new_color = r.get("color", "")

        # 사이즈 필드/이름 부착
        r["size"] = size
        r["sizeKorean"] = size_kor(size)
        r["colorKorean"] = color_kor(new_color)

        base_en = re.sub(r"\s+(One Size|Default Title)$", "", r["name"]).strip()
        base_ko = r.get("nameKorean", "")
        if size:
            r["name"] = f"{base_en} {size}".strip()
            r["nameKorean"] = f"{base_ko} {r['sizeKorean']}".strip() if base_ko else base_ko
        else:
            r["name"] = base_en

        # 변형별 이미지: variant.image_id 가 가리키는 사진(사이즈별/색상별).
        # 매핑 없으면 기존 og:image 유지.
        if vimg:
            r["imageUrl"] = vimg

        changed += 1

    json.dump(rows, open(path, "w"), ensure_ascii=False, indent=2)
    print(f"normalized {changed}/{len(rows)} rows -> {path}")


if __name__ == "__main__":
    main()
