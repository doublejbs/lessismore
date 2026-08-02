#!/usr/bin/env python3
# Fill sleeping-bag temperatures (specs.comfortTemp / limitTemp) by OCR-reading the
# detail image's ISO 23537 table, e.g.  Comfort 15°C ~ 0°C / Lower Limit -10°C ~ -15°C.
# The temp table sits MID-image (not the bottom 고시 band), so we tile the whole image.
# Detail images may live on koveaimage CDN OR /web/upload/NNEditor (Cafe24 editor) — both
# are collected here. Only sleeping_bag items are touched; other fields are preserved.
# Usage: python3 kovea-sleeptemp.py <json> [out-json]
import json
import re
import sys
import urllib.parse
import urllib.request
from io import BytesIO

import Vision
import Quartz
from PIL import Image

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
REFERER = "https://www.kovea.co.kr/"
TILE_H = 1500
OVERLAP = 160


def http_get(url):
    safe = urllib.parse.quote(url, safe=":/?=&%")
    req = urllib.request.Request(safe, headers={"User-Agent": UA, "Referer": REFERER})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def detail_images(product_no):
    html = http_get(f"https://www.kovea.co.kr/product/x/{product_no}/").decode("utf-8", "ignore")
    imgs = []
    for m in re.finditer(r"koveaimage\.cafe24\.com/[^\"'\s)]+\.(?:jpg|jpeg|png)", html, re.I):
        imgs.append("https://" + m.group(0))
    for m in re.finditer(r"""(?:src|ec-data-src)=["']([^"']*?/web/upload/[^"']+\.(?:jpg|jpeg|png))""", html, re.I):
        u = m.group(1)
        if re.search(r"/category/|icon|menu|btn|common|custom_\d", u, re.I):
            continue
        imgs.append(("https://www.kovea.co.kr" + u) if u.startswith("/") else u.replace("//", "https://", 1) if u.startswith("//") else u)
    # de-dupe, keep order
    seen, out = set(), []
    for u in imgs:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def load_image(url):
    return Image.open(BytesIO(http_get(url))).convert("RGB")


def ocr_pil(im):
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
    return [o.topCandidates_(1)[0].string() for o in (req.results() or []) if o.topCandidates_(1)]


def ocr_full(im):
    w, h = im.size
    out = []
    y = 0
    while y < h:
        out.extend(ocr_pil(im.crop((0, y, w, min(h, y + TILE_H)))))
        y += TILE_H - OVERLAP
    return "\n".join(out)


def _nums(seg):
    return [int(n) for n in re.findall(r"(-?\d+)\s*[°˚]?\s*[C℃]", seg)]


def parse_temps(text):
    t = text.replace(" ", "")
    res = {}
    ci = next((t.find(k) for k in ("Comfort", "쾌적온도") if t.find(k) >= 0), -1)
    li = next((t.find(k) for k in ("LowerLimit", "Lowerlimit", "한계온도", "최저온도") if t.find(k) >= 0), -1)
    # comfort window stops at the LowerLimit label so it can't swallow limit numbers.
    if ci >= 0:
        end = li if (li > ci) else ci + 30
        nums = _nums(t[ci + 7:end])
        if nums:
            res["comfortTemp"] = min(nums)  # coldest end of the comfort range
    if li >= 0:
        nums = _nums(t[li + 7:li + 35])
        if nums:
            res["limitTemp"] = min(nums)

    # Label-column / value-column layout (e.g. 리미트 800): labels "Comfort / Lower Limit"
    # render in one column and values "-10°C -25°C" in another → window logic misses them.
    # Collect standalone °C values (not C/F pairs, not laundry) after the first label.
    if "comfortTemp" not in res and (ci >= 0 or li >= 0):
        start = min(x for x in (ci, li) if x >= 0)
        vals = []
        for m in re.finditer(r"(-?\d+)\s*[°˚]?C(?!\s*/\s*[\d.]+\s*[°˚]?F)", t[start:]):
            ctx = t[start + m.start() - 6:start + m.start()]
            if re.search(r"물|세탁|약", ctx):
                continue
            vals.append(int(m.group(1)))
        if len(vals) >= 2:
            res["comfortTemp"] = vals[0]
            res.setdefault("limitTemp", vals[1])

    # Fallback: 3-tier "N°C / N°F" scale (쾌적 / 숙면·밀착 / 극한). The "/°F" pairing
    # distinguishes sleeping temps from laundry temps (e.g. "물의 온도 30°C", no /F).
    if "comfortTemp" not in res or "limitTemp" not in res:
        cs = [int(m.group(1)) for m in re.finditer(r"(-?\d+)\s*[°˚]?C\s*/\s*[\d.]+\s*[°˚]?F", t)]
        if len(cs) >= 2:
            res.setdefault("comfortTemp", cs[0])   # 1st tier = 쾌적/안락 (comfort)
            res.setdefault("limitTemp", cs[1])      # 2nd tier = 숙면/밀착 (lower limit)
    return res


def process(item):
    no = item.get("_productNo") or item["groupId"].replace("kovea_", "")
    imgs = item.get("_specImages") or []
    if not imgs:
        try:
            imgs = detail_images(no)
            item["_specImages"] = imgs
        except Exception:
            imgs = []
    # the ISO temp table is in the big description image — try the tallest first
    cand = sorted(imgs, key=lambda u: 0, reverse=True)
    found = {}
    for url in imgs:
        try:
            im = load_image(url)
        except Exception:
            continue
        if im.size[1] < 800:  # skip tiny images
            continue
        txt = ocr_full(im)
        found = parse_temps(txt)
        if found:
            break
    if found:
        item.setdefault("specs", {})
        item["specs"].update(found)
        return True
    return False


def main():
    path = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else path
    data = json.load(open(path))
    sbs = [x for x in data if x.get("category") == "sleeping_bag"]
    ok = 0
    for i, item in enumerate(sbs, 1):
        try:
            if process(item):
                ok += 1
                print(f"  [{i}/{len(sbs)}] {item['nameKorean'][:30]} → {item['specs'].get('comfortTemp')}/{item['specs'].get('limitTemp')}")
            else:
                print(f"  [{i}/{len(sbs)}] {item['nameKorean'][:30]} → 온도 못찾음")
        except Exception as e:
            print(f"  err {item.get('groupId')}: {e}")
    json.dump(data, open(out, "w"), ensure_ascii=False, indent=2)
    print(f"\n저장: {out}  (온도 {ok}/{len(sbs)})")


if __name__ == "__main__":
    main()
