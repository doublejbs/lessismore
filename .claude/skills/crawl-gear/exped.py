#!/usr/bin/env python3
# 엑스패드 크롤 — 2소스 하이브리드 (시에라디자인 패턴과 동일).
#  (A) 한국 공식(exped.co.kr, Cafe24): 전 제품(한글명·사이즈옵션·색상·이미지). 무게는 텍스트에 없음.
#  (B) 국제 공식(www.exped.com/en): 제품 페이지에 구조화 스펙(Weight/R-Value/Temperature/치수).
#      KR 이름을 영문 모델로 음역 + 숫자(R값·온도)로 EN 제품과 매칭해 무게/스펙 보강.
# 사용: python3 exped.py out/exped-FINAL.json
import html
import json
import re
import subprocess
import sys
import time

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
KR = "https://exped.co.kr"
EN = "https://www.exped.com"


def curl(url, follow=False):
    time.sleep(0.1)
    args = ["curl", "-sS", "-m", "30", "-A", UA]
    if follow:
        args.append("-L")
    for _ in range(3):
        out = subprocess.run(args + [url], capture_output=True, timeout=35)
        if out.returncode == 0:
            return out.stdout.decode("utf-8", "replace")
        time.sleep(1)
    return ""


# ── 카테고리 ───────────────────────────────────────────────────────
KR_CATS = {24: "tent", 25: "mat", 26: "backpack", 27: "pouch",
           28: "sleeping_bag", 42: "pillow", 43: "etc", 44: "etc"}


def refine_cat(cat, name):
    if re.search(r"풋프린트|그라운드시트|풋 프린트", name):
        return "tent_acc"
    if re.search(r"레인\s*커버|레인커버", name):
        return "backpack_cover"
    if re.search(r"스트랩|클립|카라비너|로프|리페어|패치|펌프|밸브|어댑터|워시|클리너", name):
        return "etc"
    return cat


# ── 색상 음역(엑스패드는 색상변형 드묾, 이름 말미 영문색상만) ─────────────
COLOR_KOR = {"black": "블랙", "grey": "그레이", "gray": "그레이", "green": "그린", "blue": "블루",
             "red": "레드", "orange": "오렌지", "yellow": "옐로", "navy": "네이비", "charcoal": "차콜",
             "ruby": "루비", "terracotta": "테라코타", "lichen": "라이켄", "cypress": "사이프러스"}


def color_kor(en):
    if not en:
        return ""
    return " ".join(COLOR_KOR.get(w.lower(), w) for w in en.split())


def slugify(s):
    return "exped_" + re.sub(r"[^a-z0-9가-힣]+", "-", re.sub(r"[™®()\[\]]", " ", s).strip().lower()).strip("-")


# ── (A) KR 크롤 ────────────────────────────────────────────────────
def kr_sizes(product_no):
    """상세 옵션 select 에서 사이즈(M/LW 등) 추출. 'SHIPPING TO' 이전의 옵션만."""
    t = curl(f"{KR}/product/detail.html?product_no={product_no}")
    opts = re.findall(r"<option[^>]*>([^<]+)</option>", t)
    sizes = []
    for o in opts:
        o = html.unescape(o).strip()
        if "SHIPPING TO" in o:
            break  # 배송국가 목록 시작 → 사이즈 옵션 끝
        if "선택" in o or set(o) <= set("- ") or not o:
            continue  # 플레이스홀더/구분선 스킵
        s = re.sub(r"\s*[\[(].*$", "", o).strip()  # "[품절]"/"(+원)" 제거
        if s and s not in sizes:
            sizes.append(s)
    return sizes


def crawl_kr(with_sizes=True):
    rows = []
    seen = set()
    for cno, cat0 in KR_CATS.items():
        page = 1
        while page <= 30:
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
                alt = re.search(r'alt="([^"]+)"', b)
                price = re.search(r'ec-data-price="(\d+)"', b)
                if not alt or not price or price.group(1) == "0":
                    continue
                name = html.unescape(alt.group(1)).strip()
                # 이미지 alt 설명(" - ... 이미지" / "... 제품 이미지") 정리
                if name.endswith("이미지"):
                    if " - " in name:
                        name = name.split(" - ")[0].strip()
                    else:
                        name = re.sub(r"\s*(EXPED\s*)?(제품\s*)?이미지$", "", name).strip()
                name = re.sub(r"^EXPED\s+", "", name).strip()
                if re.search(r"결제|배송비|적립|쿠폰", name):
                    continue
                seen.add(no)
                added += 1
                img = re.search(r'src="(//[^"]+/web/product/(?:big|medium)[^"]+\.(?:jpg|png|gif))"', b)
                image = ("https:" + img.group(1).split("?")[0]) if img else ""
                cat = refine_cat(cat0, name)
                sizes = kr_sizes(no) if (with_sizes and cat in ("mat", "sleeping_bag", "backpack", "tent")) else []
                sizes = sizes or [""]
                for sz in sizes:
                    rows.append({
                        "groupId": slugify(name),
                        "category": cat,
                        "company": "exped",
                        "companyKorean": "엑스패드",
                        "name": name,
                        "nameKorean": name,
                        "color": "",
                        "colorKorean": "",
                        "size": sz,
                        "sizeKorean": sz,
                        "weight": 0,
                        "imageUrl": image,
                        "specs": {},
                        "_source": f"{KR}/product/detail.html?product_no={no}",
                    })
            if added == 0:
                break
            page += 1
    return rows


# ── (B) 국제 스펙 ──────────────────────────────────────────────────
# KR 모델 음역 → EN slug 토큰
MODEL_EN = {
    "버사": "versa", "씸": "sim", "신매트": "synmat", "플렉스": "flex", "두라": "dura",
    "울트라": "ultra", "테라": "terra", "컴포트": "comfort", "딥슬립": "deepsleep",
    "메가매트": "megamat", "메가슬립": "megasleep", "럭스매트": "luxemat", "럭스울": "luxewool",
    "멀티매트": "multimat", "더블매트": "doublemat", "드림워커": "dreamwalker", "루나": "luna",
    "라이라": "lyra", "아우터": "outer", "스페이스": "space", "스카우트": "scout", "베놈": "venom",
    "오거나이저": "organizer", "마운틴": "mountain", "프로": "pro", "블랙아이스": "black-ice",
    "썬더": "thunder", "라이트닝": "lightning", "타이푼": "typhoon", "클라우드버스트": "cloudburst",
    "슈노젤": "schnozzel", "필로우": "pillow", "심포니": "symphony", "컴팩트": "compact",
    "미라": "mira", "게일": "gale", "카펠라": "capella", "베가": "vega", "오리온": "orion",
    "sit": "sit", "패드": "pad", "블랭킷": "blanket", "퀼트": "quilt", "머미": "mummy",
    "라이트": "lite", "맥스": "max", "오토": "auto", "듀오": "duo", "럭스": "luxe",
    "듀라": "dura", "버사럭스": "versaluxe", "럭스울": "luxewool", "매트": "mat", "커버": "cover",
    "블랙아이스": "blackice", "메가": "mega", "슬립": "sleep", "에어": "", "시트": "sit",
    "제품": "", "이미지": "", "기능성": "", "캠핑": "", "베개": "", "exped": "",
    "스페이스": "space", "익스트림": "extreme", "웨이스트": "waist", "벨트": "belt",
    "비너스": "venus", "미라": "mira", "세레스": "ceres", "오리온": "orion", "카리나": "carina",
    "게일": "gale", "베가": "vega", "카펠라": "capella", "안드로메다": "andromeda", "라이라": "lyra",
    "텐트": "", "미니멀": "", "타프": "tarp", "폴": "pole", "이너": "inner", "메시": "mesh",
    "hl": "hl", "xp": "xp", "ul": "ul", "필로우": "pillow", "심포니": "symphony", "머미": "mummy",
    "토렌트": "torrent", "스카이라인": "skyline", "릿지라인": "ridgeline", "스냅샷": "snapshot",
    "라이트닝": "lightning", "썬더": "thunder", "타이푼": "typhoon", "클라우드버스트": "cloudburst",
    "임펄스": "impulse", "마운틴프로": "mountainpro", "블랙아이스": "blackice", "레이더": "radar",
    "베놈": "venom", "웨이스트": "waist", "포켓": "pocket", "코드": "cord", "덕": "duck",
}
ROMAN = {"1": "i", "2": "ii", "3": "iii", "4": "iv", "5": "v", "6": "vi", "7": "vii", "8": "viii"}


def to_roman(nk):
    # 단독 정수(텐트 인용수)를 로마숫자로: "3"->"iii", "3xp"->"iiixp". R값/온도(2r,10c)는 유지.
    return re.sub(r"\b(\d)(?![.rcfl\d])", lambda m: ROMAN.get(m.group(1), m.group(1)), nk)


def num_key(name):
    """이름의 숫자/온도/R값 → 정규화 토큰 (예: '1.5R'->'15r', '-10C 15F'->'10c15f', '5'->'5')."""
    s = name.lower().replace("°", "")
    s = re.sub(r"[-\s]", "", s)
    toks = re.findall(r"\d+\.?\d*[rcfl]?", s)
    return "".join(t.replace(".", "") for t in toks)


def model_key(name):
    """KR 이름 → EN 모델 토큰 문자열(음역)."""
    toks = []
    for w in re.split(r"[\s]+", name):
        w2 = re.sub(r"[0-9.,\-°CFRL]", "", w).strip()
        if not w2:
            continue
        toks.append(MODEL_EN.get(w2, w2.lower()))
    return "".join(t for t in toks if t)


def _spec_blocks(t):
    """<h4>LABEL</h4><div>VALUE</div> → {label: value_text}. VALUE 의 <br> 는 공백/구분 유지."""
    out = {}
    for m in re.finditer(r"<h4[^>]*>([^<]+)</h4>\s*<div[^>]*>(.*?)</div>", t, re.S):
        label = html.unescape(m.group(1)).strip()
        val = re.sub(r"<br\s*/?>", " | ", m.group(2))
        val = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", val))).strip()
        if label and val and label not in out:
            out[label] = val
    return out


def _parse_weight(val):
    """'M: 1010 g | LW: 1415 g' → {'M':1010,'LW':1415}; '795 g' → {'':795}."""
    res = {}
    for part in val.split("|"):
        part = part.strip()
        ms = re.match(r"([A-Za-z0-9/+ ]+?)\s*:\s*([\d.,]+)\s*(kg|g)", part)
        if ms:
            v = float(ms.group(2).replace(",", ""))
            res[ms.group(1).strip()] = round(v * 1000) if ms.group(3) == "kg" else round(v)
        else:
            mo = re.match(r"([\d.,]+)\s*(kg|g)", part)
            if mo:
                v = float(mo.group(1).replace(",", ""))
                res[""] = round(v * 1000) if mo.group(2) == "kg" else round(v)
    return res


EN_CACHE = "out/exped-en-cache.json"


def fetch_en_specs():
    import os
    if os.path.exists(EN_CACHE):
        c = json.load(open(EN_CACHE))
        return c["lookup"], c["urls"]
    sm = curl(f"{EN}/sitemap.xml", follow=True)
    urls = list(dict.fromkeys(re.findall(r"https://www\.exped\.com/en/products/[a-z0-9-]+/[a-z0-9-]+", sm)))
    lookup = {}
    for u in urls:
        slug = u.rsplit("/", 1)[-1]
        t = curl(u, follow=True)
        blk = _spec_blocks(t)
        sp = {}
        # 무게: 패킹무게 우선 (텐트는 Max.Weight=패킹 / Min.Weight=최소). 매트/침낭은 'Weight'.
        wl = {lab.lower(): v for lab, v in blk.items()
              if lab.lower() in ("weight", "max. weight", "packed weight", "min. weight")}
        for pref in ("max. weight", "packed weight", "weight", "min. weight"):
            if pref in wl:
                pw = _parse_weight(wl[pref])
                if pw:
                    sp["_weight"] = pw
                    break
        for lab, val in blk.items():
            low = lab.lower()
            if "person capacity" in low:
                mc = re.search(r"\d+", val)
                if mc:
                    sp["capacity"] = int(mc.group(0))
            elif "r-value" in low:
                mr = re.search(r"[\d.]+", val)
                if mr:
                    sp["rValue"] = float(mr.group(0))
            elif low == "temperature":
                mt = re.search(r"-?[\d.]+", val)
                if mt:
                    sp["limitTemp"] = round(float(mt.group(0)))
            elif low == "volume":
                mv = re.search(r"[\d.]+", val)
                if mv:
                    sp["volume"] = int(float(mv.group(0)))
            elif low == "thickness":
                mth = re.search(r"[\d.]+", val)
                if mth:
                    sp["thickness"] = round(float(mth.group(0)) * 10)
        key = re.sub(r"[^a-z]", "", slug) + num_key(slug)
        lookup[key] = sp
        lookup[re.sub(r"[-]", "", slug)] = sp
    json.dump({"lookup": lookup, "urls": urls}, open(EN_CACHE, "w"), ensure_ascii=False)
    return lookup, urls


def apply_specs(rows, lookup):
    filled = 0
    for r in rows:
        mk = model_key(r["nameKorean"])
        mk_alpha = re.sub(r"[^a-z]", "", mk)
        nk = num_key(r["nameKorean"])   # 사이즈(M/LW)는 제외 — 무게는 wmap[size] 로 별도 매칭
        nk_r = to_roman(nk)             # 텐트 인용수 로마숫자 변형
        cand = [mk + nk, mk_alpha + nk, mk + nk_r, mk_alpha + nk_r]
        sp = None
        for c in cand:
            if c in lookup:
                sp = lookup[c]
                break
        if not sp and mk_alpha and len(mk_alpha) >= 3:
            # 느슨: 모델 prefix 일치 + 숫자(아라비아/로마) 포함
            for k, v in lookup.items():
                if k.startswith(mk_alpha[:4]) and (nk and nk in k or nk_r and nk_r in k):
                    sp = v
                    break
        if not sp:
            continue
        wmap = sp.get("_weight") or {}
        if wmap and not r["weight"]:
            sz = r["size"]
            if sz and sz in wmap:
                r["weight"] = wmap[sz]
            elif "" in wmap:
                r["weight"] = wmap[""]
            elif len(wmap) == 1:
                r["weight"] = next(iter(wmap.values()))
            else:
                # 사이즈 라벨이 EN 과 안 맞으면(예: KR 'S-M-블랙' vs EN 'M/L'): 대표(최소) 무게
                hit = None
                if sz:
                    for k, v in wmap.items():
                        if k.lower() == sz.lower() or (k and sz.lower().startswith(k.lower())):
                            hit = v
                            break
                r["weight"] = hit if hit else min(wmap.values())
        extra = {k: v for k, v in sp.items() if not k.startswith("_")}
        # 카테고리별 스펙 키 필터
        if r["category"] == "mat":
            r["specs"] = {**r["specs"], **{k: extra[k] for k in ("rValue", "thickness") if k in extra}}
        elif r["category"] == "sleeping_bag":
            r["specs"] = {**r["specs"], **{k: extra[k] for k in ("limitTemp",) if k in extra}}
        elif r["category"] in ("backpack", "pouch"):
            r["specs"] = {**r["specs"], **{k: extra[k] for k in ("volume",) if k in extra}}
        elif r["category"] in ("tent", "tent_acc"):
            r["specs"] = {**r["specs"], **{k: extra[k] for k in ("capacity",) if k in extra}}
        filled += 1
    return filled


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else "out/exped-FINAL.json"
    from collections import Counter
    kr = crawl_kr()
    print(f"KR rows: {len(kr)} (제품 {len(set(r['groupId'] for r in kr))})")
    lookup, en_urls = fetch_en_specs()
    print(f"EN 제품 스펙: {len(en_urls)}개")
    filled = apply_specs(kr, lookup)
    json.dump(kr, open(out_path, "w"), ensure_ascii=False, indent=2)
    print(f"스펙 매칭된 행: {filled}")
    print("by category:", dict(Counter(r["category"] for r in kr)))
    print("weight>0:", sum(1 for r in kr if r["weight"]), "/", len(kr))
    print(f"-> {out_path}")


if __name__ == "__main__":
    main()
