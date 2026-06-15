#!/usr/bin/env python3
# 침낭·매트의 nameKorean 을 니모 코리아(nemoequipment.co.kr) 공식 표기 형식으로 일관 생성·검증.
# 다른 카테고리(필로우/체어/백팩/테이블/파우치/텐트/패드)는 config 음역이 이미 공식 모델명과 일치 → 대상 아님.
#
# 모델명은 config korMap(공식과 일치 확인됨)을 쓰고, 접미사를 공식 형식으로 생성:
#   - 침낭: "{모델} {℉온도}[ EP] {사이즈(공백)}"   예) 템포 맨 20 EP 레귤러, 포르테 맨 20 EP 레귤러 와이드
#           EP = 영문명에 "Endless Promise" 포함된 라인. 소닉/재즈는 미포함.
#   - 매트: "{모델} {사이즈(슬래시)}"            예) 텐서 올 시즌 레귤러/와이드
#   strict verbatim 은 KR 카탈로그 노출분이 일부뿐이라 제품 내 표기가 섞이는 문제가 있어,
#   공식 형식을 학습해 모든 변형에 일관 적용한다. 생성 결과를 KR 노출명과 대조해 일치율을 보고.
#   온도는 nameKorean 은 공식대로 ℉ 유지, sizeKorean 필드는 ℃(별도 룰) — 서로 다른 필드.
#
# 사용: python3 nemo-kr-apply.py out/nemo-FINAL.json
import json
import os
import re
import subprocess
import sys
import time

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
HERE = os.path.dirname(os.path.abspath(__file__))
REF_PATH = os.path.join(HERE, "out", "nemo-kr-ref.json")
KR_CATES = {"sleeping_bag": ["001003001", "001003002", "001003003"],
            "mat": ["001002002", "001002003", "001002007", "001002008"]}
SIZE_EN_KO = {"regular": "레귤러", "long": "롱", "short": "숏", "wide": "와이드",
              "mummy": "머미", "medium": "미디엄", "large": "라지"}


def crawl_ref():
    import html as _h
    ref = {}
    for cat, cates in KR_CATES.items():
        rows = []
        for c in cates:
            for pg in range(1, 5):
                u = f"https://www.nemoequipment.co.kr/goods/goods_list.php?cateCd={c}" + (f"&page={pg}" if pg > 1 else "")
                t = subprocess.run(["curl", "-sS", "-A", UA, u], capture_output=True, timeout=40).stdout.decode("utf-8", "replace")
                names = re.findall(r'class="item_name"[^>]*>(.*?)</', t, re.S)
                names = [re.sub(r"\s+", " ", _h.unescape(re.sub(r"<[^>]+>", "", n))).strip() for n in names]
                names = [n for n in names if n and "시리즈" not in n]
                if not names:
                    break
                rows += names
                time.sleep(0.3)
        ref[cat] = sorted(set(rows))
    json.dump(ref, open(REF_PATH, "w"), ensure_ascii=False, indent=1)
    return ref


def clean_kr(name):
    name = re.sub(r"^\[[^\]]*\]\s*", "", name)
    name = name.replace("™", "")
    name = re.sub(r"\s*\+.*$", "", name)
    name = re.sub(r"\s*20\d\d\s*$", "", name)
    return re.sub(r"\s+", " ", name).strip()


def size_tokens(size, has_temp):
    # 온도(℉)부분 제거 후 남은 영문 사이즈 토큰을 한글로
    s = size
    if has_temp:
        s = re.sub(r"-?\d+(?:/\d+)?\s*℉\s*/?\s*", "", s)
    out = []
    for w in re.split(r"[\s/]+", s):
        ko = SIZE_EN_KO.get(w.strip().lower())
        if ko:
            out.append(ko)
    return out


def load_kor_maps():
    m = {}
    for fn in os.listdir(os.path.join(HERE, "out")):
        if re.match(r"nemo-.*-config\.json$", fn):
            cfg = json.load(open(os.path.join(HERE, "out", fn)))
            m.update(cfg.get("korMap", {}))
    return m


def gen_name(row, base):
    cat = row["category"]
    size = row.get("size", "")
    if cat == "sleeping_bag":
        m = re.search(r"(-?\d+(?:/\d+)?)\s*℉", size)
        temp = m.group(1) if m else ""
        toks = size_tokens(size, has_temp=True)
        ep = "Endless Promise" in row.get("name", "")
        parts = [base]
        if temp:
            parts.append(temp)
        if ep:
            parts.append("EP")
        if toks:
            parts.append(" ".join(toks))
        return " ".join(parts)
    # mat
    toks = size_tokens(size, has_temp=False)
    return f"{base} {'/'.join(toks)}".strip() if toks else base


def main():
    path = sys.argv[1]
    ref = json.load(open(REF_PATH)) if os.path.exists(REF_PATH) else crawl_ref()
    official = set()
    for names in ref.values():
        for n in names:
            official.add(clean_kr(n))
    kor_maps = load_kor_maps()

    rows = json.load(open(path))
    total = 0
    verified = 0
    for r in rows:
        if r["category"] not in ("sleeping_bag", "mat"):
            continue
        if "/products/" not in r.get("_source", ""):
            continue
        slug = r["_source"].rsplit("/products/", 1)[-1]
        base = kor_maps.get(slug)
        if not base:
            continue
        total += 1
        r["nameKorean"] = gen_name(r, base)
        if r["nameKorean"] in official:
            verified += 1

    json.dump(rows, open(path, "w"), ensure_ascii=False, indent=2)
    print(f"sleeping_bag+mat names generated: {total}, KR 공식명과 정확 일치: {verified}")


if __name__ == "__main__":
    main()
