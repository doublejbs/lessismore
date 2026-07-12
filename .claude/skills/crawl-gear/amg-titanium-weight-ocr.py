#!/usr/bin/env python3
# AMG티타늄 크롤 JSON에 무게를 채운다. 두 소스를 순서대로 시도한다:
#   1) 상세페이지 #prdDetailContent 의 순수 텍스트("기본정보 ... 중 량 : 16g" 형태) — 신형
#      상품(텐트팩 등)은 스펙이 이미지가 아니라 텍스트로 박혀있다. OCR 없이 바로 파싱 가능.
#   2) 그 외(대부분)는 마케팅 상세 이미지 안에 "재질:.../중량:Ng" 인쇄 텍스트 또는
#      "제품 : 스푼(구형) / 무게: 22g", "싱글컵 220 / 무게 42g / 중량 220ml" 같은 사이즈별
#      비교표로 들어있다 — macOS Vision OCR로 읽는다. 표 형태는 라벨(제품명/사이즈)을 무게
#      바로 앞뒤에서 찾아 내 상품명·용량과 매칭해 정확한 행을 고른다(용량 일치 +20, 폴딩/
#      고정형처럼 타입이 다르면 -25 — 컬럼 인덱스가 아니라 라벨로 매핑하는 원칙, SKILL.md 참고).
# "SET"/"세트"가 이름에 있는 번들 상품은 제외한다 — 여러 개별 아이템의 무게가 한 이미지에
# 섞여 있어 어느 값이 "이 번들의 총 무게"인지 안전하게 결정할 수 없다.
#
# Usage: python3 amg-titanium-weight-ocr.py <crawl-json> [out-json]
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request

import Vision
import Quartz
from Foundation import NSURL
from PIL import Image

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
BASE = "https://m.amg-titanium.co.kr"
CACHE = os.path.join(tempfile.gettempdir(), "amg-titanium-ocr-cache")
os.makedirs(CACHE, exist_ok=True)

WEIGHT_TABLE_RE = re.compile(r"(?:무\s*게|중\s*량)\s*(?:\([^)]*\))?\s*[:：]?\s*(\d+)\s*g")
CAP_RE = re.compile(r"(\d+)\s*ml", re.I)
STANDALONE_TOKEN_RE = re.compile(r"^(\d+)\s*g$", re.I)
LABEL_KW = re.compile(r"제품|시에라|소주컵|스푼|스포크|집게|포크|머그|컵|볼|접시|국자|비너|버클|아이젠|텐트팩|코펠|반합|프라이팬|뒤집개|젓가락|숟가락")
TYPE_KW = ["구형", "신형", "여성", "폴딩", "고정형", "소주"]
NOUN_KW = ["시에라", "소주컵", "스푼", "스포크", "집게", "포크", "머그", "국자", "비너", "버클"]

WEIGHT_TEXT_RE = re.compile(r"(?:중\s*량|무\s*게)\s*(?:\([^)]*\))?\s*[:：]?\s*(\d+(?:\.\d+)?)\s*(g|kg)\b", re.I)


def unescape_html(s):
    return (
        s.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
    )


def fetch(url):
    # 이미지 경로에 한글/공백이 그대로 들어있는 구형 URL이 있어(예: "21 미니포크/") 인코딩한다.
    safe_url = urllib.parse.quote(url, safe=":/?=&%")
    req = urllib.request.Request(safe_url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def detail_text(product_no):
    html = fetch(f"{BASE}/product/detail.html?product_no={product_no}").decode("utf-8", "ignore")
    start = html.find('id="prdDetailContent"')
    if start == -1:
        return ""
    end_rel = html[start:].find('id="prdInfo"')
    seg = html[start : start + end_rel] if end_rel != -1 else html[start:]
    text = unescape_html(re.sub(r"<[^>]+>", " ", seg))
    return re.sub(r"\s+", " ", text).strip()


def ocr_image(path):
    url = NSURL.fileURLWithPath_(str(path))
    src = Quartz.CGImageSourceCreateWithURL(url, None)
    if src is None:
        return []
    cg = Quartz.CGImageSourceCreateImageAtIndex(src, 0, None)
    req = Vision.VNRecognizeTextRequest.alloc().init()
    req.setRevision_(3)
    req.setRecognitionLevel_(0)  # ko-KR은 이 머신에서 fast 레벨만 지원
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
        out.append({"t": cand[0].string(), "y": 1.0 - (bb.origin.y + bb.size.height)})
    return out


def ocr_product_images(image_urls):
    """모든 spec 이미지를 다운로드 → (긴 이미지는) 타일링 → OCR → {t, y_abs, img_i} 리스트."""
    texts = []
    for img_i, url in enumerate(image_urls):
        try:
            raw = fetch(url)
        except Exception as e:
            print(f"  download fail {url}: {e}", file=sys.stderr)
            continue
        key = re.sub(r"[^A-Za-z0-9_.]", "_", url.split("/")[-1]) or f"img{img_i}"
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
            recs = ocr_image(path)
            for r in recs:
                texts.append({"t": r["t"], "y_abs": r["y"] * h, "img_i": img_i})
            continue
        for y in range(0, h, tile_h):
            box = (0, y, w, min(y + tile_h, h))
            tile_path = os.path.join(CACHE, f"{key}_{y}.jpg")
            if not os.path.exists(tile_path):
                im.crop(box).convert("RGB").save(tile_path, quality=90)
            recs = ocr_image(tile_path)
            for r in recs:
                texts.append({"t": r["t"], "y_abs": y + r["y"] * 1500, "img_i": img_i})
    return texts


def my_capacity_ml(name):
    m = re.search(r"(\d+(?:\.\d+)?)\s*(ml|l)\b", name, re.I)
    if not m:
        return None
    val = float(m.group(1))
    return val * 1000 if re.fullmatch(r"l", m.group(2), re.I) else val


def extract_table_rows(texts):
    ts = sorted(texts, key=lambda t: (t["img_i"], t["y_abs"]))
    rows = []
    for i, t in enumerate(ts):
        wm = WEIGHT_TABLE_RE.search(t["t"])
        if not wm:
            continue
        weight = float(wm.group(1))
        cm = CAP_RE.search(t["t"])
        capacity = float(cm.group(1)) if cm else None
        if capacity is None:
            for k in range(max(0, i - 2), min(len(ts), i + 3)):
                if k == i:
                    continue
                nb = ts[k]
                if nb["img_i"] != t["img_i"] or abs(nb["y_abs"] - t["y_abs"]) > 20:
                    continue
                cm2 = CAP_RE.search(nb["t"])
                if cm2:
                    capacity = float(cm2.group(1))
                    break
        label = ""
        for j in range(i - 1, max(-1, i - 4), -1):
            prev = ts[j]
            if prev["img_i"] != t["img_i"] or t["y_abs"] - prev["y_abs"] > 150:
                break
            if LABEL_KW.search(prev["t"]):
                label = prev["t"]
                break
        rows.append({"label": label, "weight": weight, "capacity": capacity})
    return rows


def score_match(name_korean, my_cap, row):
    score = 0
    if my_cap and row["capacity"]:
        score += 20 if abs(my_cap - row["capacity"]) < 1 else -15
    for kw in TYPE_KW:
        if kw in name_korean and kw in row["label"]:
            score += 5
        elif kw in row["label"] and kw not in name_korean:
            score -= 25
    for kw in NOUN_KW:
        if kw in name_korean and kw in row["label"]:
            score += 2
    return score


def resolve_weight_from_images(name_korean, image_urls):
    texts = ocr_product_images(image_urls)
    my_cap = my_capacity_ml(name_korean)
    rows = extract_table_rows(texts)
    best, best_score = None, 0
    for row in rows:
        s = score_match(name_korean, my_cap, row)
        if s > best_score:
            best_score, best = s, row
    if best and best_score >= 5:
        return best["weight"], "ocr_table_match"

    simple_vals = set()
    for t in texts:
        m = re.search(r"(중량|무게)\s*(?:\([^)]*\))?\s*[:：]?\s*(\d+(?:\.\d+)?)\s*(g|kg)\b", t["t"], re.I)
        if m:
            v = float(m.group(2))
            simple_vals.add(v * 1000 if m.group(3).lower() == "kg" else v)
    if len(simple_vals) == 1:
        return next(iter(simple_vals)), "ocr_simple"

    standalone_vals = {float(m.group(1)) for t in texts if (m := STANDALONE_TOKEN_RE.match(t["t"].strip()))}
    if len(standalone_vals) == 1:
        return next(iter(standalone_vals)), "ocr_standalone"

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
        name = rows[0]["nameKorean"]
        if "SET" in name.upper() or "세트" in name:
            continue
        text = detail_text(pno)
        wm = WEIGHT_TEXT_RE.search(text)
        if wm:
            w = float(wm.group(1))
            resolved[pno] = (w * 1000 if wm.group(2).lower() == "kg" else w, "detail_text")
        else:
            image_urls = rows[0].get("_specImages") or []
            if image_urls:
                w, src = resolve_weight_from_images(name, image_urls)
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
