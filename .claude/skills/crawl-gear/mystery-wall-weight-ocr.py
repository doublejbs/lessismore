#!/usr/bin/env python3
# 미스테리월 크롤 JSON에 무게를 채운다. 무게/소재가 텍스트가 아니라 상세페이지의
# `/web/upload/NNEditor/...` 이미지 안에 그림으로 박혀 있다(코베아 케이스와 동일 패턴) —
# 어댑터 단계에서 이미 그 URL들을 _specImages에 모아뒀다(크롤-기어 관례).
# 형식이 두 가지로 갈린다: (a) "Size & Weight" 다크 패널(SIZE/WEIGHT/COLOR 3줄, 라벨과
# 값이 같은 줄), (b) "Weight : 1450g" 단순 텍스트(다이어그램 옆에 한 줄). Backcountry/
# CLAYMORE 세션에서 확립한 바운딩박스 기반 "같은 행" 매칭을 재사용.
#
# Usage: python3 mystery-wall-weight-ocr.py <crawl-json> [out-json]
import json
import os
import re
import sys
import tempfile
import urllib.parse
import urllib.request

import Vision
import Quartz
from Foundation import NSURL
from PIL import Image

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
CACHE = os.path.join(tempfile.gettempdir(), "mystery-wall-ocr-cache")
os.makedirs(CACHE, exist_ok=True)

NUM = r"[\d,]+(?:\.\d+)?"
UNIT = r"(g|gr|kg|gram|그램)"
# ⚠ 라벨과 값 사이에 부가 설명이 끼는 경우가 있다(실측: 게이터 "Weight Per Pair : 88g" —
# "Per Pair"가 라벨과 콜론 사이에 끼어 있어 괄호 허용만으로는 못 잡음). 최대 20자까지
# 느슨하게 허용(단 숫자 시작 전까지 줄바꿈은 안 넘어가게 제한).
# ⚠ 쉘터/타프는 "무게" 대신 "본체 1,596g"(본체 = 텐트 바디)로 표기한다 — "본체"도 무게 라벨로
# 인정. (폴세트/pole 무게는 별도 항목이므로 라벨에 포함하지 않는다 — 본체 무게만 잡는다.)
# ⚠ "weight"가 OCR에서 "welght"로 깨지는 일이 흔하다(i↔l 혼동, 실측: "폰 포켓" "• Welght. 56g").
# 라벨 철자에 we[il1]ght 퍼지를 허용.
WEIGHT_RE = re.compile(rf"(?:제품\s*)?(?:본\s*체|중\s*량|무\s*게|we[il1]ght)[^\n\d]{{0,20}}?({NUM})\s*{UNIT}\b", re.I)
# ⚠ 값 앞뒤에 잡음 기호가 붙는 경우가 있다(실측: "사코슈 페더+" 이미지 "92g/") — 앞뒤 비단어
# 문자를 허용해 "92g/", "(58g)" 같은 것도 단독 토큰으로 인정.
STANDALONE_TOKEN_RE = re.compile(rf"^\W*({NUM})\s*{UNIT}\W*$", re.I)
# ⚠ 라벨("중량")이 OCR에서 통째로 인식이 안 되고 콜론만 남는 경우가 있다(실측: "X20
# (X-Pac)" — "사이즈"는 "40|X"로 깨지고 "중량"은 아예 사라져 ": 470g"만 남음, 폰트/스타일
# 문제로 추정). 콜론+숫자+단위만 있는 블록도 무게로 인정(라벨 없이 숫자만인 경우보다는
# 안전 — 최소한 ":"가 라벨 뒤에 값이 있었다는 흔적은 남아있음).
COLON_PREFIXED_TOKEN_RE = re.compile(rf"^[:：]\s*({NUM})\s*{UNIT}$", re.I)
# ⚠ "Size & Weight" 다크 패널은 라벨과 값이 별개 OCR 블록으로 쪼개진다(실측: "패커블 파우치"
# — "• WEIGHT"와 "58g"가 같은 행에 좌/우로 따로 인식됨). 라벨 블록만 골라 바운딩박스로 같은
# 행의 값과 페어링하려면 라벨 정규식이 앞머리 불릿(•·-)과 뒤 콜론을 허용해야 한다. "본체"도 포함.
LABEL_ONLY_RE = re.compile(r"^[•·・○●∙\-\s]*(?:제품\s*)?(?:본\s*체|중\s*량|무\s*게|we[il1]ght)\s*[:：.]?\s*$", re.I)
VALUE_NUM_RE = re.compile(rf"({NUM})\s*{UNIT}\b", re.I)
# ⚠ 치수 뒤에 슬래시로 무게가 붙는 형식(실측: 미니파우치 "가로:세로 14 x 높이 6 cm / 62g") —
# "무게/weight" 라벨이 아예 없어 라벨 기반 매칭으로는 못 잡는다. "...cm / 숫자g" 패턴으로 직접.
DIM_SUFFIX_RE = re.compile(rf"cm\s*/\s*({NUM})\s*{UNIT}\b", re.I)
# ⚠ 이 사이트 스펙 이미지 폰트에서 한글 라벨("무게"/"중량")이 OCR로 통째로 깨지는 일이 매우 흔하다
# (실측: "무게 : 214g"이 "97l : 214g", "PX|: 1.35 Kg" 등으로 라벨이 알아볼 수 없게 됨). 값(숫자+g/kg)
# 자체는 잘 인식되므로, "콜론 뒤에 오는 무게값"을 라벨 무관하게 잡는다(콜론 뒤 최대 8자 잡음 허용 —
# "PX|: 9 1.35 Kg" 같은 파편 대응). g/m²(원단 밀도)는 제외. 오탐 방지 위해 상품당 서로 다른
# 값이 정확히 하나일 때만 채택한다(여러 개면 모호 → 결측).
COLON_VALUE_RE = re.compile(
    rf"[:：][^g:：\n]{{0,8}}?({NUM})\s*(g|gr|kg|gram|그램)(?!\s*/?\s*[m㎡²])\b", re.I
)

# 쉘터 총중량(본체+폴세트)은 티피쉘-라이트가 5.3kg까지 나오므로 상한을 넉넉히 8kg으로.
# 작은 파우치/액세서리(카라비너 등)는 몇 g대라 하한은 낮게 잡는다.
MAX_PLAUSIBLE_G = 8000
MIN_PLAUSIBLE_G = 3


def _to_grams(num_str, unit_str):
    v = float(num_str.replace(",", ""))
    return v * 1000 if unit_str.lower() == "kg" else v


def _add_if_plausible(vals, grams):
    if MIN_PLAUSIBLE_G <= grams <= MAX_PLAUSIBLE_G:
        vals.add(grams)


def fetch(url):
    safe_url = urllib.parse.quote(url, safe=":/?=&%")
    req = urllib.request.Request(safe_url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def ocr_image(path):
    url = NSURL.fileURLWithPath_(str(path))
    src = Quartz.CGImageSourceCreateWithURL(url, None)
    if src is None:
        return []
    cg = Quartz.CGImageSourceCreateImageAtIndex(src, 0, None)
    req = Vision.VNRecognizeTextRequest.alloc().init()
    req.setRevision_(3)
    req.setRecognitionLevel_(0)
    req.setUsesLanguageCorrection_(False)
    req.setRecognitionLanguages_(["en-US", "ko-KR"])
    handler = Vision.VNImageRequestHandler.alloc().initWithCGImage_options_(cg, None)
    handler.performRequests_error_([req], None)
    out = []
    for obs in req.results() or []:
        cand = obs.topCandidates_(1)
        if not cand:
            continue
        bb = obs.boundingBox()
        out.append(
            {
                "text": cand[0].string(),
                "cx": bb.origin.x + bb.size.width / 2,
                "cy": bb.origin.y + bb.size.height / 2,
                "h": bb.size.height,
            }
        )
    return out


def ocr_product_images(image_urls):
    per_image = []
    for i, url in enumerate(image_urls):
        try:
            raw = fetch(url)
        except Exception as e:
            print(f"  download fail {url}: {e}", file=sys.stderr)
            continue
        key = re.sub(r"[^A-Za-z0-9_.]", "_", url.split("/")[-1]) or f"img{i}"
        path = os.path.join(CACHE, key)
        with open(path, "wb") as f:
            f.write(raw)
        try:
            im = Image.open(path)
            w, h = im.size
        except Exception as e:
            print(f"  open fail {path}: {e}", file=sys.stderr)
            continue
        tile_h = 1500
        if h <= tile_h * 1.3:
            obs = ocr_image(path)
            if obs:
                per_image.append(obs)
            continue
        for y in range(0, h, tile_h):
            box = (0, y, w, min(y + tile_h, h))
            tile_path = os.path.join(CACHE, f"{key}_{y}.jpg")
            if not os.path.exists(tile_path):
                im.crop(box).convert("RGB").save(tile_path, quality=90)
            obs = ocr_image(tile_path)
            if obs:
                per_image.append(obs)
    return per_image


def _row_paired_values(per_image):
    vals = set()
    for obs in per_image:
        labels = [o for o in obs if LABEL_ONLY_RE.match(o["text"].strip())]
        if not labels:
            continue
        for label in labels:
            candidates = [o for o in obs if o is not label and o["cx"] > label["cx"]]
            if not candidates:
                continue
            row_tol = max(label["h"], 0.01) * 1.5
            same_row = [o for o in candidates if abs(o["cy"] - label["cy"]) <= row_tol]
            pool = same_row or candidates
            best = min(pool, key=lambda o: abs(o["cy"] - label["cy"]))
            m = VALUE_NUM_RE.search(best["text"])
            if m:
                _add_if_plausible(vals, _to_grams(m.group(1), m.group(2)))
    return vals


def _plausible(grams):
    return MIN_PLAUSIBLE_G <= grams <= MAX_PLAUSIBLE_G


def resolve_weight(image_urls, n_rows=1, n_sizes=1):
    per_image = ocr_product_images(image_urls)
    texts = [o["text"] for obs in per_image for o in obs]
    # 포지셔널(값 개수=행 수, 순서대로 사이즈에 배정)은 "행이 사이즈 때문에 여럿"일 때만 안전하다.
    # 색상만 다른 행에 서로 다른 값을 순서대로 박으면 안 되므로 사이즈 종류 수로 게이트한다.
    positional_ok = n_rows > 1 and n_sizes == n_rows

    # 순서 보존 리스트(중복 제거 전) — 사이즈별로 같은 이미지 안에 서로 다른 무게가 여러 번
    # 나오는 경우(실측: "큐브 파우치(다이니마)" S=18g/M=20g), 개수가 그 상품의 행 수와
    # 정확히 같으면 등장 순서 그대로 각 행에 배정한다(라벨→값 매칭이 곤란한 이미지 레이아웃
    # 이라도 최소한 순서는 안정적이라는 가정 — sizeOptions 드롭다운 순서와 이미지 안
    # 사이즈 블록 순서가 보통 일치함).
    ordered = []
    for t in texts:
        m = WEIGHT_RE.search(t)
        if m:
            g = _to_grams(m.group(1), m.group(2))
            if _plausible(g):
                ordered.append(g)
    vals = set(ordered)
    if len(vals) == 1:
        return next(iter(vals)), "ocr_label"
    if len(vals) > 1:
        if positional_ok and len(ordered) == n_rows:
            return ordered, "ocr_label_positional"
        return None, None

    row_vals = _row_paired_values(per_image)
    if len(row_vals) == 1:
        return next(iter(row_vals)), "ocr_row_paired"
    if len(row_vals) > 1:
        return None, None

    standalone = []
    for t in texts:
        m = STANDALONE_TOKEN_RE.match(t.strip())
        if m:
            g = _to_grams(m.group(1), m.group(2))
            if _plausible(g):
                standalone.append(g)
    su = set(standalone)
    if len(su) == 1:
        return next(iter(su)), "ocr_standalone"
    if len(su) > 1:
        # 사이즈별 단독 토큰(실측: "이너폼" S/M/L = 72/78/84g)이 순서대로 행 수만큼 있으면 배정.
        if positional_ok and len(standalone) == n_rows:
            return standalone, "ocr_standalone_positional"
        return None, None

    colon_prefixed = set()
    for t in texts:
        m = COLON_PREFIXED_TOKEN_RE.match(t.strip())
        if m:
            _add_if_plausible(colon_prefixed, _to_grams(m.group(1), m.group(2)))
    if len(colon_prefixed) == 1:
        return next(iter(colon_prefixed)), "ocr_colon_prefixed"
    if len(colon_prefixed) > 1:
        return None, None

    # 치수 뒤 슬래시 무게("...cm / 62g"). 사이즈가 여러 개면 값도 여러 개라 모호 → None으로 두고
    # 사이즈별 확정이 필요한 케이스(미니파우치 세트 등)는 수동 오버라이드로 처리.
    dim_suffix = set()
    for t in texts:
        for m in DIM_SUFFIX_RE.finditer(t):
            _add_if_plausible(dim_suffix, _to_grams(m.group(1), m.group(2)))
    if len(dim_suffix) == 1:
        return next(iter(dim_suffix)), "ocr_dim_suffix"
    if len(dim_suffix) > 1:
        return None, None

    # 최후 수단: 라벨이 깨져도 "콜론 뒤 무게값"만 뽑는다(단일값일 때만).
    colon_value = set()
    for t in texts:
        for m in COLON_VALUE_RE.finditer(t):
            _add_if_plausible(colon_value, _to_grams(m.group(1), m.group(2)))
    if len(colon_value) == 1:
        return next(iter(colon_value)), "ocr_colon_value"

    return None, None


# ⚠ macOS Vision OCR이 특정 폰트 스타일에서 라벨 텍스트 자체를 통째로 인식 못 하는 경우가
# 있다(실측: "미니 카고"(productNo 110) — 사람 눈에는 "무게 : 530g"이 선명하게 보이는데
# Vision은 이 줄 전체를 아예 인식하지 못함, 타일 경계 문제도 아니었음 — 폰트/렌더링 한계로
# 추정). 사용자가 실제 사이트 스크린샷으로 직접 확인해 준 값만 수동 등록.
# 스칼라 = 상품 전체 무게(색상만 다른 상품에 균일 적용 대상), dict = 사이즈별 무게(그 사이즈
# 행에만 적용, dict에 없는 사이즈는 0으로 남김).
MANUAL_OVERRIDES_G = {
    "110": 530,  # 미니 카고 — "무게 : 530g", 2026-07-22 사용자 확인
    # 패커블 파우치: 이미지에 "Small size ... 58g"만 명시. S/M/L/XL 드롭다운(가격 증가 = 더 큼)
    # 이라 58g는 S 전용, M/L/XL 무게는 이미지에 없음 → S에만 적용.
    "269": {"S": 58},
    # 미니파우치(사각형): 사이즈 드롭다운 없는 단일 SKU, 이미지에 "1SET (2 size)" = S 38g + M 62g
    # 2종 세트 → 합산 100g.
    "93": 100,
    # 비트쉘 P5/P7/P8-알파: 상세 이미지가 3모델 비교표라 본체값이 여러 개(1,316/1,596/1,806) →
    # 자동추출 모호. 사용자 확인값(2026-07-22, 비교표 오름차순). 쉘터 무게는 본체+폴세트 총중량으로 기록.
    "191": 1726,  # P5-알파 — 본체 1,316 + 폴세트 410
    "190": 2140,  # P7-알파 — 본체 1,596 + 폴세트 544
    # 페더파우치(3종세트): 단일 SKU, 이미지에 10g/14g/18g 3종 → 세트 합산 42g.
    "193": 42,
    # 헥사곤 알파: 이미지에 본체 "1.35 Kg"과 폴 스펙 노이즈("16.5cm 9H : 12g")가 섞여 자동추출
    # 2값 충돌로 막힘. 본체 1,350g만 채택(폴/펙 별도).
    "70": 1350,
    # 아래는 비교표/다중라벨이라 자동추출 모호 → 사용자 확인값(2026-07-22). 쉘터는 본체+폴 총중량.
    "189": 2492,  # 비트쉘P8-알파 — 본체 1,806 + 폴세트 686
    "76": 5310,   # 티피쉘-라이트 — 스킨 4,500 + 센터폴 810("Weight:1450g"은 증정 그라운드시트)
    "66": 630,    # 카이트원 타프(폴 없는 타프)
}


def main():
    crawl_path = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else crawl_path
    data = json.load(open(crawl_path, encoding="utf-8"))

    by_product = {}
    for row in data:
        by_product.setdefault(row["_productNo"], []).append(row)

    resolved = {}
    total = len(by_product)
    for i, (pno, rows) in enumerate(by_product.items(), 1):
        if pno in MANUAL_OVERRIDES_G:
            resolved[pno] = (MANUAL_OVERRIDES_G[pno], "manual_verified")
            continue
        image_urls = rows[0].get("_specImages") or []
        if image_urls:
            n_sizes = len({r.get("size", "") for r in rows})
            w, src = resolve_weight(image_urls, n_rows=len(rows), n_sizes=n_sizes)
            if w is not None:
                resolved[pno] = (w, src)
        if i % 10 == 0:
            print(f"progress {i}/{total}", file=sys.stderr)

    n = 0
    for row in data:
        pno = row["_productNo"]
        if pno in resolved:
            w, src = resolved[pno]
            # ⚠ "행이 여러 개"인 이유가 색상 때문인지 사이즈 때문인지 구분해야 한다 — 색상만
            # 다른 상품(예: "미니 카고" 차콜/스카이블루 2행)은 무게가 색상과 무관하게 동일한
            # 게 정상이라 단일값을 그대로 적용해도 되지만, 사이즈가 여러 개인데 이미지에
            # 값이 하나뿐인 경우엔 그게 "전체 공통 무게"인지 "그 중 한 사이즈만의 무게"인지
            # 텍스트만으로 구분이 안 될 때가 있다(실측: "패커블 파우치"(S/M/L/XL 4종)에
            # "Small size ... WEIGHT 58g" 딱 하나만 있었는데, 이게 S 전용 값인데도 예전
            # 로직은 4개 행 전부에 58g를 똑같이 넣어버렸음 — M/L/XL은 실제로는 더 무거울
            # 텐데 잘못된 값이 채워짐). ocr_label_positional(리스트, 행 수와 정확히 일치)만
            # 안전하게 사이즈별 배정 가능 — 그 외 단일값은 사이즈가 실제로 하나뿐인
            # 상품에만 적용(색상만 여러 개인 건 무방).
            distinct_sizes = {r.get("size", "") for r in by_product[pno]}
            if isinstance(w, dict):
                # 사이즈별 확정값 — 그 사이즈 행에만 적용, dict에 없는 사이즈는 0 유지.
                sk = row.get("sizeKorean", "") or row.get("size", "")
                if sk in w:
                    row["weight"] = w[sk]
                    row["_weightSource"] = src
                    n += 1
            elif isinstance(w, list):
                idx = by_product[pno].index(row)
                row["weight"] = w[idx] if idx < len(w) else 0
                row["_weightSource"] = src
                n += 1
            elif len(distinct_sizes) <= 1:
                row["weight"] = w
                row["_weightSource"] = src
                n += 1
            # else: 사이즈가 여러 개인데 단일값만 찾음 — 어느 사이즈 것인지 확신 못 하므로
            # 적용하지 않고 0으로 남긴다(잘못된 값보다 결측이 낫다).

    json.dump(data, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"무게 채움: {n}/{len(data)}행 ({len(resolved)}/{total}개 상품) -> {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
