#!/usr/bin/env python3
# Fill weight + specs on a Kovea crawl JSON by OCR-reading the spec image.
# Korean products embed specs in the "상품 정보 제공 고시" table (and sometimes an English
# "Specification" block) at the BOTTOM of the last detail image (koveaimage CDN).
# Pipeline per product: download last _specImage (cache) → crop bottom band → tile →
# Vision OCR (ko-KR, fast level) → join text → regex-parse → map to category specs.
#
# Usage: python3 kovea-specs.py <crawl-json> [out-json]
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from io import BytesIO

import Vision
import Quartz
from Foundation import NSURL
from PIL import Image

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
REFERER = "https://www.kovea.co.kr/"
CACHE = "/tmp/kovea-orig"
os.makedirs(CACHE, exist_ok=True)

BOTTOM_PX = 7000   # how much of the image bottom to scan (고시 is near the end)
TILE_H = 1500
OVERLAP = 160
SPEC_MARKERS = ("상품 정보 제공 고시", "상품정보제공고시", "Specification", "SPECIFICATION", "크기,중량", "크기, 중량")


def fetch_image(url):
    key = re.sub(r"[^A-Za-z0-9_.]", "_", url.split("/")[-1])
    path = os.path.join(CACHE, key)
    if os.path.exists(path) and os.path.getsize(path) > 1000:
        return Image.open(path).convert("RGB")
    safe = urllib.parse.quote(url, safe=":/?=&%")
    req = urllib.request.Request(safe, headers={"User-Agent": UA, "Referer": REFERER})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    open(path, "wb").write(data)
    return Image.open(BytesIO(data)).convert("RGB")


def ocr_pil(im):
    """OCR a PIL image via macOS Vision (Korean, fast level). Returns list of text lines."""
    bio = BytesIO()
    im.save(bio, format="PNG")
    data = bio.getvalue()
    provider = Quartz.CGDataProviderCreateWithCFData(data)
    # decode PNG → CGImage
    src = Quartz.CGImageSourceCreateWithData(data, None)
    cg = Quartz.CGImageSourceCreateImageAtIndex(src, 0, None)
    req = Vision.VNRecognizeTextRequest.alloc().init()
    req.setRevision_(3)
    req.setRecognitionLevel_(0)  # fast — only level with Korean on this macOS
    req.setUsesLanguageCorrection_(False)
    req.setRecognitionLanguages_(["ko-KR", "en-US"])
    handler = Vision.VNImageRequestHandler.alloc().initWithCGImage_options_(cg, None)
    handler.performRequests_error_([req], None)
    lines = []
    for obs in (req.results() or []):
        cand = obs.topCandidates_(1)
        if cand:
            lines.append(cand[0].string())
    return lines


def ocr_bottom_text(im):
    """Tile the bottom band of a tall image and OCR each tile; return joined text."""
    w, h = im.size
    band = im.crop((0, max(0, h - BOTTOM_PX), w, h))
    bw, bh = band.size
    text = []
    y = 0
    while y < bh:
        tile = band.crop((0, y, bw, min(bh, y + TILE_H)))
        text.extend(ocr_pil(tile))
        y += TILE_H - OVERLAP
    return "\n".join(text)


def grams(num, unit):
    v = float(num)
    return int(round(v * 1000)) if unit.lower().startswith("k") else int(round(v))


def parse_specs(text, category):
    """Extract a normalized fact dict from the OCR'd spec text."""
    full = text.replace(" ", "")  # spacing in OCR is unreliable; match on despaced text
    # Restrict to the 고시/Specification region so marketing copy (which also says
    # "재질", "중량" etc.) doesn't produce false matches.
    markers = ["상품정보제공고시", "품명및모델명", "크기,중량", "크기중량", "Specification", "SPECIFICATION"]
    idxs = [full.find(mk) for mk in markers if full.find(mk) >= 0]
    has_spec = bool(idxs)
    t = full[min(idxs):] if idxs else full
    facts = {"_hasSpec": has_spec}

    # weight: 중량 N kg/g  (take the first 중량 occurrence)
    m = re.search(r"중량[:：]?\(?([\d.]+)\)?\s*(kg|g)", t, re.I) or re.search(r"무게[:：]?([\d.]+)\s*(kg|g)", t, re.I)
    if m:
        facts["weight"] = grams(m.group(1), m.group(2))
    else:
        # stacked-label 고시 (label column / value column) breaks the inline match →
        # fall back to the first standalone weight not tied to load/waterproof.
        for mm in re.finditer(r"([\d.]+)\s*(kg|g)\b", t, re.I):
            ctx = t[max(0, mm.start() - 6):mm.start()]
            if re.search(r"하중|내수압|수압", ctx):
                continue
            facts["weight"] = grams(mm.group(1), mm.group(2))
            break

    # waterproof: 내수압 N mm  (max value if several)
    wp = [int(x.replace(",", "")) for x in re.findall(r"내수압[:：]?([\d,]+)\s*mm", t, re.I)]
    if wp:
        facts["waterproofRating"] = max(wp)

    # capacity: 수용인원 N인
    m = re.search(r"수용인원[:：]?(\d+)\s*인", t)
    if m:
        facts["capacity"] = int(m.group(1))

    # size: first NxNxN cm (prefer 본체/외형 dims). keep raw despaced.
    m = re.search(r"(\d{2,4}(?:[xX×]\d{2,4}){1,2}\s*cm)", t)
    if m:
        facts["size"] = m.group(1).replace("×", "x").replace("X", "x")

    # pole material
    if re.search(r"폴[:：].{0,12}(듀랄루민|두랄루민)", t):
        facts["poleMaterial"] = "duralumin"
    elif re.search(r"폴[:：].{0,12}카본", t):
        facts["poleMaterial"] = "carbon"
    elif re.search(r"폴[:：].{0,12}(알루미늄|알루미늡)", t):
        facts["poleMaterial"] = "aluminum"
    elif re.search(r"폴[:：].{0,12}(화이바|파이버|fiber|글라스|grass)", t, re.I):
        facts["poleMaterial"] = "fiberglass"

    # fabrics: detect within the 고시 region (already excludes marketing copy above the
    # 고시 marker). The 재질 sub-block layout varies too much to slice reliably.
    if "나일론" in t:
        facts["_hasNylon"] = True
    if re.search(r"폴리에스테르|폴리에스터", t):
        facts["_hasPoly"] = True

    # 사용온도 / 내한온도 (sleeping bag)
    m = re.search(r"(?:사용가능온도|사용온도|내한온도|적정온도)[:：]?\(?(-?\d+)", t)
    if m:
        facts["temp"] = int(m.group(1))
    # 충전재 (sleeping bag)
    if re.search(r"(거위털|구스다운|덕다운|오리털|다운)", t):
        facts["fill"] = "down"
    elif re.search(r"(중공사|폴리|신서레이트|화학솜|인견)", t):
        facts["fill"] = "synthetic"

    # 최대하중 (chair/table)
    m = re.search(r"(?:최대하중|내하중|허용하중)[:：]?약?([\d,]+)\s*kg", t)
    if m:
        facts["maxLoad"] = int(m.group(1).replace(",", ""))

    # lighting: 밝기(루멘), 전원/배터리, 사용/점등/연소 시간
    m = re.search(r"([\d,]+)\s*(?:lm|루멘|流明)", t, re.I) or re.search(r"(?:밝기|광량)[:：]?약?([\d,]+)", t)
    if m:
        facts["lumens"] = int(m.group(1).replace(",", ""))
    if re.search(r"가스|이소부탄|부탄", t):
        facts["battery"] = "gas"
    elif re.search(r"충전|리튬|배터리|usb", t, re.I):
        facts["battery"] = "rechargeable"
    elif re.search(r"건전지|AA|AAA|알카라인", t, re.I):
        facts["battery"] = "disposable"
    m = re.search(r"(?:연소시간|점등시간|사용시간|런타임)[:：]?약?([\d.]+)\s*시간", t)
    if m:
        facts["runtime"] = float(m.group(1))

    return facts


def to_specs(facts, category):
    """Map normalized facts to the category's specs object."""
    s = {}
    mat_main = "나일론" if facts.get("_hasNylon") else ("폴리에스테르" if facts.get("_hasPoly") else "")

    if category in ("tent", "tarp", "shelter"):
        if "capacity" in facts:
            s["capacity"] = facts["capacity"]
        if facts.get("_hasNylon"):
            s["flyMaterial"] = "나일론"
        if facts.get("_hasPoly"):
            s["innerMaterial"] = "폴리에스테르"
        if "poleMaterial" in facts:
            s["poleMaterial"] = facts["poleMaterial"]
        if "waterproofRating" in facts:
            s["waterproofRating"] = facts["waterproofRating"]
    elif category == "mat":
        if mat_main:
            s["material"] = mat_main
        if "size" in facts:
            s["openSize"] = facts["size"]
    elif category == "sleeping_bag":
        if "fill" in facts:
            s["fillMaterial"] = facts["fill"]
        if "temp" in facts:
            s["limitTemp"] = facts["temp"]
    elif category in ("chair", "table"):
        if mat_main:
            s["material"] = mat_main
        if "maxLoad" in facts:
            s["maxLoad"] = facts["maxLoad"]
        if "size" in facts:
            s["packedSize"] = facts["size"]
    elif category == "lighting":
        if "lumens" in facts:
            s["maxBrightness"] = facts["lumens"]
        if "battery" in facts:
            s["batteryType"] = facts["battery"]
        if "runtime" in facts:
            s["maxRuntime"] = facts["runtime"]
    else:
        if mat_main:
            s["material"] = mat_main
        if "size" in facts:
            s["size"] = facts["size"]
    return s


def process(item):
    imgs = item.get("_specImages") or []
    if not imgs:
        return False
    cat = item.get("category", "etc")
    # 고시 is at the bottom of the LAST image; if markers missing, try earlier ones.
    for url in reversed(imgs[-3:]):
        try:
            im = fetch_image(url)
        except Exception as e:
            print(f"   fetch fail {item['groupId']}: {e}")
            continue
        text = ocr_bottom_text(im)
        facts = parse_specs(text, cat)
        # Accept only on real spec indicators (marker found OR a weight parsed),
        # so a junk last image doesn't short-circuit before the real 고시 image.
        if facts.get("_hasSpec") or "weight" in facts:
            if "weight" in facts:
                item["weight"] = facts["weight"]
            item["specs"] = to_specs(facts, cat)
            return True
    return False


def main():
    path = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else path.replace(".json", "-spec.json")
    data = json.load(open(path))
    ok = 0
    for i, item in enumerate(data, 1):
        try:
            if process(item):
                ok += 1
        except Exception as e:
            print(f"   error {item.get('groupId')}: {e}")
        if i % 5 == 0 or i == len(data):
            print(f"[kovea-specs] {i}/{len(data)} (specs filled: {ok})")
    json.dump(data, open(out, "w"), ensure_ascii=False, indent=2)
    print(f"\n저장: {out}  (specs {ok}/{len(data)})")


if __name__ == "__main__":
    main()
