#!/usr/bin/env python3
# 꼴로르(CCOLORE) 크롤 — Cafe24 한국공식(ccolore.com). 초경량 다운 침낭/퀼트 + 실타프·텐트·의류.
#  - 제품명 한글, 색상은 이름 말미 ' - 솔트 그레이'(CAYL식). 사이즈 M/L 옵션.
#  - 침낭 스펙: 측정표(사이즈별 Full Weight=제품무게, Fill Weight=충전량) + 온도 'N℃/N℃/N℃'(컴포트/리밋/익스트림)
#    + 필파워(N CU.IN) + 충전재(구스/덕 다운).
# 사용: python3 ccolore.py out/ccolore-FINAL.json
import html
import json
import re
import subprocess
import sys
import time

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
BASE = "https://ccolore.com"
CATE = 89  # Shop

# 색상: 사이트가 한글로만 표기 → color 필드(영문)용 한글→영문 사전. colorKorean 은 원본 한글.
KO_COLOR_EN = {
    "그레이": "Grey", "그린": "Green", "딥그린": "Deep Green", "레드": "Red", "브라운": "Brown",
    "블랙": "Black", "블루": "Blue", "빈티지": "Vintage", "샌드": "Sand", "세이지": "Sage",
    "솔트": "Salt", "애쉬": "Ash", "올리브": "Olive", "올리브그린": "Olive Green", "카키": "Khaki",
    "포레스트": "Forest", "화이트": "White", "아이보리": "Ivory", "베이지": "Beige", "차콜": "Charcoal",
    "네이비": "Navy", "힙포": "Hippo",
}
SIZE_KO = {"S": "스몰", "M": "미디엄", "L": "라지", "XL": "엑스라지", "XS": "엑스스몰",
           "XXL": "더블엑스라지", "XXS": "더블엑스스몰", "XXXL": "트리플엑스라지",
           "FREE": "프리", "REGULAR": "레귤러", "LONG": "롱", "WIDE": "와이드"}


def curl(url):
    time.sleep(0.05)
    for _ in range(3):
        out = subprocess.run(["curl", "-sS", "-m", "30", "-A", UA, url], capture_output=True, timeout=35)
        if out.returncode == 0:
            return out.stdout.decode("utf-8", "replace")
        time.sleep(1)
    return ""


def slugify(name):
    return "ccolore_" + re.sub(r"[^a-z0-9가-힣]+", "-", re.sub(r"[®™()\[\]]", " ", name).strip().lower()).strip("-")


def classify(name):
    n = name.lower()
    if re.search(r"자[켓캣]|자켓|후드|재킷|jacket|머플러|양말|삭스|socks|비니|글러브|장갑", n):
        return "clothing"
    if re.search(r"실타프|타프\b|tarp", n) and "폴" not in n and "파우치" not in n:
        return "tarp"
    if re.search(r"텐트|tent", n):
        return "tent"
    if re.search(r"사이드월|이너|그라운드시트|풋프린트", n):
        return "tent_acc"
    if re.search(r"에어라이트|얼티밋라이트|썸머라이트|슬립스퀘어|다운\s*라이너|침낭|퀼트|슬리핑", n):
        return "sleeping_bag"
    if re.search(r"파우치|압축색|메쉬망|스터프|pouch|색\b|케이스|case", n):
        return "pouch"
    if re.search(r"폴대|폴\b|pole|스트링|스토퍼|스트랩|strap|코드락|v팩|커버|카라비너|스테이크|펙|양말", n):
        return "etc"
    return "etc"


def clean_name_color(title):
    t = html.unescape(title).strip()
    t = re.sub(r"^\[(시즌오프|season\s*off|품절)\]\s*", "", t, flags=re.I)  # 세일 태그만 제거(콜라보 태그는 유지)
    color = ""
    if " - " in t:
        head, tail = t.rsplit(" - ", 1)
        tail = tail.strip()
        # 색상 후보: 코드/사이즈/수량(2ea·4set·1pcs) 제외
        if tail and not re.search(r"\d{3,}|사이즈|size|\d+\s*(ea|set|pcs|개)\b", tail, re.I) and len(tail) <= 12:
            color = tail
            t = head.strip()
    return t.strip(), color


def color_english(ko):
    """한글 색상 → 영문(color 필드). 미등재 토큰은 그대로."""
    if not ko:
        return ""
    return " ".join(KO_COLOR_EN.get(w, w) for w in ko.split())


REAL_SIZE = re.compile(r"^(XXS|XS|S|M|L|XL|XXL|XXXL|FREE|REGULAR|LONG|WIDE|F)$", re.I)


def kr_sizes(t):
    """옵션 select 에서 '진짜 사이즈'만(S/M/L 등). 애드온(폴·펙 Nea·세트·색상)은 제외 —
    타프·텐트의 실제 사이즈는 제품명에 있으므로 옵션 확장하면 쓰레기 행 폭발(코베아 룰)."""
    sizes = []
    for o in re.findall(r"<option[^>]*>([^<]+)</option>", t):
        o = html.unescape(o).strip()
        if re.search(r"선택|필수|SHIPPING|배송|-{3,}", o) or not o:
            continue
        s = re.sub(r"\s*[\[(].*$", "", o).strip()  # [품절]/(+원) 제거
        if REAL_SIZE.match(s) and s.upper() not in [x.upper() for x in sizes]:
            sizes.append(s.upper() if len(s) <= 3 else s)
    return sizes


def _clean_txt(t):
    x = re.sub(r"<[^>]+>", "|", t.replace("&nbsp;", " "))
    x = x.replace("\\r\\n", " ").replace("\r", " ").replace("\n", " ")
    return re.sub(r"(\|\s*)+", "|", x)


def _row_map(x, label, sizes):
    """라벨 행 → {size: value}. 3형식: 컬럼표(529|548) · 인라인 사이즈별(S - 335g, M - 351g) · 단일(2,390g)."""
    real = [s for s in sizes if s]
    # 인라인 사이즈별: 'Full Weight | S - 335g, M - 351g'
    m = re.search(re.escape(label) + r"\s*\|([^|]*?[A-Za-z]+\s*-\s*[\d,]+\s*g[^|]*)", x)
    if m:
        d = {}
        for sm in re.finditer(r"([A-Za-z]{1,3})\s*-\s*([\d,]+(?:\.\d+)?)\s*g", m.group(1)):
            d[sm.group(1).upper()] = float(sm.group(2).replace(",", ""))
        if d:
            return d
    # 컬럼표: 'Full Weight | 529 | 548 | (g)' (이너사이즈 괄호값 무시)
    m = re.search(re.escape(label) + r"\s*\|((?:\s*[\d,]+(?:\.\d+)?(?:\([\d.]+\))?\s*\|){1,4})", x)
    if m:
        nums = [float(n.replace(",", "")) for n in re.findall(r"([\d,]+(?:\.\d+)?)(?:\([\d.]+\))?", m.group(1))]
        if len(nums) >= 2 and len(real) == len(nums):
            return {real[i]: nums[i] for i in range(len(nums))}
        if nums:
            return {"": nums[0]}  # 단일값(콤마 포함 2,390 등)
    # 단일값(g 병기): 'Full Weight | 2,390g'
    m = re.search(re.escape(label) + r"\s*\|\s*([\d,]+(?:\.\d+)?)\s*g\b", x)
    if m:
        return {"": float(m.group(1).replace(",", ""))}
    return {}


def parse_weights(t, sizes):
    """제품 무게 → {size: g}. Full/Total Weight 우선, 없으면 Weight/무게/총 무게(kg)."""
    x = _clean_txt(t)
    for lab in ("Full Weight", "Total Weight", "Weight"):
        m = _row_map(x, lab, sizes)
        if m:
            return m
    mk = re.search(r"총\s*무게\s*[:：|]?\s*([\d.]+)\s*kg", x)
    if mk:
        return {"": round(float(mk.group(1)) * 1000)}
    mg = re.search(r"(?:무게|중량)\s*[:：|]?\s*([\d,]+(?:\.\d+)?)\s*g\b", x)
    if mg:
        return {"": float(mg.group(1).replace(",", ""))}
    return {}


def parse_bag_specs(t, sizes):
    """침낭 스펙: 온도·필파워·충전재 + Fill Weight(사이즈별)."""
    x = _clean_txt(t)
    fillw = _row_map(x, "Fill Weight", sizes)
    comfort = limit = None
    mt = re.search(r"(-?\d+)\s*℃\s*/\s*(-?\d+)\s*℃(?:\s*/\s*(-?\d+)\s*℃)?", x)
    if mt:
        comfort, limit = int(mt.group(1)), int(mt.group(2))
    fp = (re.search(r"필파워\s*[:：]?\s*(\d{3,4})", x)
          or re.search(r"(\d{3,4})\s*CU\.?\s*IN", x, re.I)
          or re.search(r"Goose Down\s*(\d{3,4})", x, re.I))
    fillpower = int(fp.group(1)) if fp else None
    fillmat = "down" if re.search(r"구스|덕다운|다운|goose|duck down", x, re.I) else ""
    return {"fillw": fillw, "comfort": comfort, "limit": limit, "fillpower": fillpower, "fillmat": fillmat}


def crawl():
    listing = {}
    page = 1
    while page <= 15:
        t = curl(f"{BASE}/product/list.html?cate_no={CATE}&page={page}")
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
            if not name or re.search(r"이미지|검색|메뉴|멀티몰|닫기|로고|배너|loading|_msize|_lsize|캘린더", name):
                continue
            img = re.search(r'src="(//[^"]+/web/product/(?:big|medium|small)[^"]+\.(?:jpg|png|gif))"', b)
            image = ("https:" + img.group(1).split("?")[0]) if img else ""
            listing[no] = (name, image)
            added += 1
        if added == 0:
            break
        page += 1
    return listing


def build(listing):
    rows = []
    total = len(listing)
    for i, (no, (name_raw, image)) in enumerate(listing.items(), 1):
        t = curl(f"{BASE}/product/detail.html?product_no={no}")
        og = re.search(r'<meta property="og:title" content="([^"]+)"', t)
        name, color = clean_name_color(og.group(1) if og else name_raw)
        cat = classify(name)
        gid = slugify(name)
        sizes = kr_sizes(t) or [""]
        specs0 = {}
        wmap = parse_weights(t, sizes)  # {size: g} 또는 {"": g}
        fillw_map = {}
        if cat == "sleeping_bag":
            sp = parse_bag_specs(t, sizes)
            if sp["fillmat"]:
                specs0["fillMaterial"] = sp["fillmat"]
            if sp["fillpower"]:
                specs0["fillPower"] = sp["fillpower"]
            if sp["comfort"] is not None:
                specs0["comfortTemp"] = sp["comfort"]
            if sp["limit"] is not None:
                specs0["limitTemp"] = sp["limit"]
            fillw_map = sp["fillw"]
        elif cat == "clothing" and re.search(r"구스|덕다운|다운|down", _clean_txt(t), re.I):
            specs0["fillMaterial"] = "down"
        single_w = wmap.get("")
        for s in sizes:
            sp = dict(specs0)
            if cat == "sleeping_bag" and (fillw_map.get(s) or fillw_map.get("")):
                sp["fillWeight"] = fillw_map.get(s) or fillw_map.get("")
            skq = SIZE_KO.get(s.upper(), s) if s else ""
            nm = f"{name} {s}".strip() if s else name            # 영문 사이즈
            nm_ko = f"{name} {skq}".strip() if skq else name     # 한글 사이즈
            rows.append({
                "groupId": gid, "category": cat, "company": "ccolore", "companyKorean": "꼴로르",
                "name": nm, "nameKorean": nm_ko,
                "color": color_english(color), "colorKorean": color,  # color=영문, colorKorean=한글
                "size": s, "sizeKorean": skq,
                "weight": wmap.get(s, single_w) or 0,
                "imageUrl": image, "specs": sp,
                "_source": f"{BASE}/product/detail.html?product_no={no}",
            })
        if i % 10 == 0 or i == total:
            print(f"  detail {i}/{total} (rows {len(rows)})", flush=True)
    return rows


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "out/ccolore-FINAL.json"
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
