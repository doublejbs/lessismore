#!/usr/bin/env python3
# 백컨트리 크롤 JSON에 무게를 채운다. 스펙(무게/사이즈/소재)이 텍스트가 아니라 상세페이지
# 이미지(_specImages, 크롤 단계에서 이미 URL만 모아둠) 안에 인쇄되어 있어 macOS Vision
# OCR로 읽는다. "무게"/"중량"/"Weight" 라벨 뒤의 첫 숫자+단위(g/kg/gram/그램)를 그 상품의
# 무게로 채택 — AMG티타늄 세션에서 확립한 라벨 기반 매칭 원칙(포지션이 아니라 라벨로 찾기)을
# 따르되, 이 브랜드의 스펙표는 라벨 열과 값 열이 분리돼 있어(예: "Weight"와 "2100 g"가 서로
# 다른 OCR 텍스트 블록) 같은 문자열 안에서 라벨+값을 못 찾는 경우가 많다 — 그래서 라벨
# 매칭이 실패하면 Vision이 주는 바운딩박스로 "같은 행(row)"에 있는 값 블록을 찾는 폴백을 쓴다.
#
# Usage: python3 backcountry-weight-ocr.py <crawl-json> [out-json]
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

UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
CACHE = os.path.join(tempfile.gettempdir(), "backcountry-ocr-cache")
os.makedirs(CACHE, exist_ok=True)

# 1,000g 이상 무게는 "1,786g" 처럼 천단위 콤마가 붙는다 — 숫자 패턴에 콤마 허용 필수.
NUM = r"[\d,]+(?:\.\d+)?"
UNIT = r"(g|gr|kg|gram|그램)"  # 캡처 그룹 — kg/g 판별에 실제 매치된 단위 텍스트를 써야 한다
WEIGHT_RE = re.compile(rf"(?:중\s*량|무\s*게|weight)\s*(?:\([^)]*\))?\s*[:：]?\s*({NUM})\s*{UNIT}\b", re.I)
STANDALONE_TOKEN_RE = re.compile(rf"^({NUM})\s*{UNIT}$", re.I)
# macOS Vision이 이 브랜드 상세이미지에 자주 쓰이는 이탤릭체 "g"를 숫자 "9"로 잘못 읽는다
# (실측: "165.5g"→"165.59"). 라벨/정상 표기가 다 실패했을 때만 쓰는 최후 폴백 —
# "NNN.N9"(소수점 한 자리+9로 끝남) 꼴을 "NNN.Ng"로 재해석한다.
MISREAD_G_AS_9_RE = re.compile(r"^(\d+\.\d)9$")
# 텐트류는 "무게: Ng" 단일 값이 아니라 "스킨:899g / 프레임:413g" 처럼 스킨(플라이)+프레임(폴대)
# 분리 표기 + "Total: 1,312g" 합계로 나오는 경우가 흔하다. Total 라인의 콤마를 Vision이
# 마침표로 오독해("1,312g"→"1.312g") 합계값을 그대로 못 믿으므로, 스킨+프레임을 직접 더한다.
SKIN_RE = re.compile(rf"스\s*킨\s*[:：]?\s*({NUM})\s*{UNIT}", re.I)
FRAME_RE = re.compile(rf"프\s*레\s*임\s*[:：]?\s*({NUM})\s*{UNIT}", re.I)
# 라벨-값이 표의 다른 열(별개 OCR 블록)로 나뉜 경우의 "라벨만" 매칭 — 정확히 이 단어만 있는
# 블록이어야 한다("Fill weight"·"충전량"·"제품구성" 같은 다른 스펙과 혼동 방지).
LABEL_ONLY_RE = re.compile(r"^(?:중\s*량|무\s*게|weight)$", re.I)
VALUE_NUM_RE = re.compile(rf"({NUM})\s*{UNIT}\b", re.I)


# 이 브랜드가 파는 캠핑 장비(텐트·침낭·매트·코펠·스토브 등)는 아무리 무거워도 15kg을 넘지
# 않는다 — OCR이 근처 텍스트를 섞어 읽어 "100000g" 같은 터무니없는 값을 만드는 경우(실측:
# 매트 상품에서 발견)를 걸러내는 안전판. 이 범위 밖이면 해당 후보를 아예 버린다(집합에서 제외해
# "값 1개로 확정" 로직이 오염되지 않게).
MAX_PLAUSIBLE_G = 15000
# 상품 갤러리에 번들 액세서리(예: 티타늄 쿠커에 딸려오는 다이니마 수납파우치) 설명이 같이
# 실려있으면, row-pairing이 그 액세서리 표의 "Weight: 4gram"을 본품 무게로 잘못 채택하는
# 경우가 실측됐다(예: "티타늄 싱글쿠커 600ml"가 4g으로 나옴 — 명백히 파우치 무게). 실제
# 캠핑 장비 중 가장 가벼운 축(작은 클립·펙 등)도 대체로 10g은 넘으므로, 그 아래는 신뢰하지
# 않고 버린다 — 틀린 값보다 미확정이 낫다는 원칙을 여기도 동일하게 적용.
MIN_PLAUSIBLE_G = 10


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
    """이미지 한 장을 OCR해 {text, cx, cy} 리스트로 반환한다.
    cx/cy는 Vision의 정규화 좌표(0~1, 원점 좌하단) 중심점 — 같은 이미지 안에서
    라벨/값을 같은 행(row)으로 매칭할 때 쓴다."""
    url = NSURL.fileURLWithPath_(str(path))
    src = Quartz.CGImageSourceCreateWithURL(url, None)
    if src is None:
        return []
    cg = Quartz.CGImageSourceCreateImageAtIndex(src, 0, None)
    req = Vision.VNRecognizeTextRequest.alloc().init()
    req.setRevision_(3)
    req.setRecognitionLevel_(0)
    req.setUsesLanguageCorrection_(False)
    req.setRecognitionLanguages_(["ko-KR", "en-US"])
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
    """상품의 스펙 이미지 전체를 OCR한다. 반환값은 이미지(타일)별로 묶인
    관측치 리스트의 리스트 — 같은 행 매칭은 같은 이미지 안에서만 유효하므로
    이미지 경계를 유지한다."""
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
    """라벨("무게"/"중량"/"Weight")만 있는 블록을 찾아 같은 행(비슷한 y, 더 오른쪽 x)의
    값 블록에서 숫자+단위를 뽑는다. 라벨/값이 표의 다른 열로 나뉜 경우의 폴백."""
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


def resolve_weight(image_urls):
    per_image = ocr_product_images(image_urls)
    texts = [o["text"] for obs in per_image for o in obs]

    vals = set()
    for t in texts:
        m = WEIGHT_RE.search(t)
        if m:
            _add_if_plausible(vals, _to_grams(m.group(1), m.group(2)))
    if len(vals) == 1:
        return next(iter(vals)), "ocr_label"
    if len(vals) > 1:
        # 라벨 붙은 값이 여러 개면(사이즈별 표 등) 가장 흔한 값을 못 고르니 포기하고
        # 이후 폴백도 시도하지 않는다 — 잘못된 값을 넣는 것보다 낫다.
        return None, None

    row_vals = _row_paired_values(per_image)
    if len(row_vals) == 1:
        return next(iter(row_vals)), "ocr_row_paired"
    if len(row_vals) > 1:
        return None, None

    skin_vals, frame_vals = set(), set()
    for t in texts:
        m = SKIN_RE.search(t)
        if m:
            _add_if_plausible(skin_vals, _to_grams(m.group(1), m.group(2)))
        m = FRAME_RE.search(t)
        if m:
            _add_if_plausible(frame_vals, _to_grams(m.group(1), m.group(2)))
    if len(skin_vals) == 1 and len(frame_vals) == 1:
        total = next(iter(skin_vals)) + next(iter(frame_vals))
        if total <= MAX_PLAUSIBLE_G:
            return total, "ocr_skin_frame_sum"
        return None, None
    if len(skin_vals) > 1 or len(frame_vals) > 1:
        return None, None

    standalone = set()
    for t in texts:
        m = STANDALONE_TOKEN_RE.match(t.strip())
        if m:
            _add_if_plausible(standalone, _to_grams(m.group(1), m.group(2)))
    if len(standalone) == 1:
        return next(iter(standalone)), "ocr_standalone"

    misread = set()
    for t in texts:
        m = MISREAD_G_AS_9_RE.match(t.strip())
        if m:
            _add_if_plausible(misread, float(m.group(1)))
    if len(misread) == 1:
        return next(iter(misread)), "ocr_misread_g_as_9"
    return None, None


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
        image_urls = rows[0].get("_specImages") or []
        if image_urls:
            w, src = resolve_weight(image_urls)
            if w is not None:
                resolved[pno] = (w, src)
        if i % 10 == 0:
            print(f"progress {i}/{total}", file=sys.stderr)

    n = 0
    for row in data:
        pno = row["_productNo"]
        if pno in resolved:
            w, src = resolved[pno]
            row["weight"] = w
            row["_weightSource"] = src
            n += 1

    json.dump(data, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"무게 채움: {n}/{len(data)}행 ({len(resolved)}/{total}개 상품) -> {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
