#!/usr/bin/env python3
# Re-extract weight + maxLoad from the 고시 table using POSITIONAL OCR so the value is
# matched to its label by table ROW. The flat-text parser mis-handles the column layout
# (labels stacked: 규격/중량/내하중/재질, values stacked: …/1.45kg/120kg/…) and grabbed
# the 내하중 (max-load) value as weight. Row alignment (label & value share y) fixes it.
# Usage: python3 kovea-fixweight.py <json> [out-json] [cat1,cat2,...]
import json
import re
import sys
from io import BytesIO

import Vision
import Quartz
import urllib.parse
import urllib.request
from PIL import Image

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
REFERER = "https://www.kovea.co.kr/"
BOTTOM_PX = 7000
TILE_H = 1500
OVERLAP = 160


def http_get(url):
    safe = urllib.parse.quote(url, safe=":/?=&%")
    req = urllib.request.Request(safe, headers={"User-Agent": UA, "Referer": REFERER})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def load_image(url):
    return Image.open(BytesIO(http_get(url))).convert("RGB")


def ocr_pos(im):
    """OCR → [(text, x, y_top)] normalized within `im`."""
    bio = BytesIO()
    im.save(bio, format="PNG")
    data = bio.getvalue()
    src = Quartz.CGImageSourceCreateWithData(data, None)
    cg = Quartz.CGImageSourceCreateImageAtIndex(src, 0, None)
    req = Vision.VNRecognizeTextRequest.alloc().init()
    req.setRevision_(3)
    req.setRecognitionLevel_(0)
    req.setUsesLanguageCorrection_(False)
    req.setRecognitionLanguages_(["ko-KR", "en-US"])
    h = Vision.VNImageRequestHandler.alloc().initWithCGImage_options_(cg, None)
    h.performRequests_error_([req], None)
    out = []
    for o in (req.results() or []):
        c = o.topCandidates_(1)
        if not c:
            continue
        bb = o.boundingBox()
        out.append((c[0].string(), float(bb.origin.x), float(1.0 - (bb.origin.y + bb.size.height))))
    return out


def cells_of(im):
    """Positional OCR over the bottom band → [(y_px, x, text)] sorted top→bottom."""
    w, h = im.size
    band = im.crop((0, max(0, h - BOTTOM_PX), w, h))
    bw, bh = band.size
    cells = []
    y = 0
    while y < bh:
        tile = band.crop((0, y, bw, min(bh, y + TILE_H)))
        th = tile.size[1]
        for (txt, cx, cy) in ocr_pos(tile):
            cells.append((y + cy * th, cx, txt.strip()))
        y += TILE_H - OVERLAP
    cells.sort()
    return cells


def row_value(cells, idx, pattern):
    """Find a value matching `pattern` on the same row as cells[idx] (then nearest below)."""
    y0 = cells[idx][0]
    x0 = cells[idx][1]
    # same-row candidates (within ~22px), prefer to the right of the label
    same = [(c[1], c[2]) for c in cells if abs(c[0] - y0) <= 22]
    same.sort()
    for x, txt in same:
        if x <= x0 - 0.01:
            continue
        m = re.search(pattern, txt, re.I)
        if m:
            return m
    # fallback: any same-row cell
    for x, txt in same:
        m = re.search(pattern, txt, re.I)
        if m:
            return m
    return None


WEIGHT_RE = r"(\d+(?:\.\d+)?)\s*(kg|g)\b"
LOAD_RE = r"(\d[\d,]*)\s*kg"
LABELS = r"내하중|최대하중|정하중|허용하중|재질|규격|크기|구성|색상|시트|프레임|원단"


def weight_from_text(txt):
    """Weight from a cell that may also hold other labels, e.g.
    "중량 : 970 / 내하중 : 30kg" → 970 g (NOT the 30kg load)."""
    i = txt.find("중량")
    if i < 0:
        i = txt.find("무게")
    if i < 0:
        return None
    seg = re.split(LABELS, txt[i + 2:])[0]  # stop before the next label (e.g. 내하중)
    m = re.search(r"(\d+(?:\.\d+)?)\s*(kg|g)?", seg)  # require a real number, not a stray '.'
    if not m:
        return None
    v = float(m.group(1))
    unit = m.group(2)
    if unit:
        g = v * 1000 if unit.lower() == "kg" else v
    else:
        g = v * 1000 if v < 50 else v  # bare number: <50 ⇒ kg (1.45/16), else g (970/1450)
    return int(round(g))


def load_from_text(txt):
    for lab in ("내하중", "최대하중", "정하중", "허용하중", "최대정하중"):
        i = txt.find(lab)
        if i >= 0:
            seg = re.split(r"중량|무게|재질|규격|크기|구성", txt[i + len(lab):])[0]
            m = re.search(LOAD_RE, seg)
            if m:
                return int(m.group(1).replace(",", ""))
    return None


def extract(cells):
    res = {}
    # Pass 1 — in-cell values (label and value in the same OCR cell). Most reliable, and
    # isolates the 중량 sub-value so a neighbouring 내하중 can't hijack it.
    for (y, x, txt) in cells:
        if "weight" not in res and re.search(r"중량|무게", txt):
            w = weight_from_text(txt)
            if w is not None:
                res["weight"] = w
        if "maxLoad" not in res and re.search(r"내하중|최대하중|정하중|허용하중|최대정하중", txt):
            l = load_from_text(txt)
            if l is not None:
                res["maxLoad"] = l
    # Pass 2 — column layout: bare label cell, value in the same table row.
    for i, (y, x, txt) in enumerate(cells):
        if "weight" not in res and re.search(r"^\s*(중량|무게)\s*$", txt):
            m = row_value(cells, i, WEIGHT_RE)
            if m:
                v = float(m.group(1))
                res["weight"] = int(round(v * 1000)) if m.group(2).lower() == "kg" else int(round(v))
        if "maxLoad" not in res and re.search(r"^\s*(내하중|최대하중|정하중|허용하중)\s*$", txt):
            m = row_value(cells, i, LOAD_RE)
            if m:
                res["maxLoad"] = int(m.group(1).replace(",", ""))
    return res


def main():
    path = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else path
    cats = set((sys.argv[3].split(",") if len(sys.argv) > 3 else ["chair", "table", "tent"]))
    data = json.load(open(path))
    targets = [x for x in data if x.get("category") in cats and (x.get("_specImages") or [])]
    fixed_w = fixed_l = 0
    for i, item in enumerate(targets, 1):
        try:
            # the 고시 with 중량 may sit in the last image's bottom, or an earlier one
            # (e.g. air tents with trailing accessory images) — scan the last 3.
            ex = {}
            for url in reversed(item["_specImages"][-3:]):
                cells = cells_of(load_image(url))
                ex = extract(cells)
                if "weight" in ex or "maxLoad" in ex:
                    break
            note = []
            if "weight" in ex and ex["weight"] != item.get("weight"):
                note.append(f"w {item.get('weight')}→{ex['weight']}")
                item["weight"] = ex["weight"]
                fixed_w += 1
            if "maxLoad" in ex:
                if item.setdefault("specs", {}).get("maxLoad") != ex["maxLoad"]:
                    fixed_l += 1
                item["specs"]["maxLoad"] = ex["maxLoad"]
            if note:
                print(f"  [{i}/{len(targets)}] {item['nameKorean'][:24]}  {'; '.join(note)} | load {ex.get('maxLoad','-')}")
        except Exception as e:
            print(f"  err {item.get('groupId')}: {e}")
    json.dump(data, open(out, "w"), ensure_ascii=False, indent=2)
    print(f"\n저장: {out}  (weight 수정 {fixed_w}, maxLoad 채움/수정 {fixed_l})")


if __name__ == "__main__":
    main()
