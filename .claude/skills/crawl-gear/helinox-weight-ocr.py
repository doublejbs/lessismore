#!/usr/bin/env python3
# 헬리녹스 크롤 JSON의 무게 0 행을 상세 이미지 OCR로 채운다.
# 콜라보 구형 페이지(2019~2023)는 스펙 표가 텍스트가 아니라 상세 설명 이미지("spec1.jpg" 등) 안에 있다.
# 상세 HTML은 어댑터 캐시(out/helinox-cache/<uid>.html)를 재사용 — 사이트 재요청 없음(IP 차단 회피).
#
# 대상 이미지: 상세 설명 영역(class="shopdetailItem" ~ inner-cont/"최근 본 상품") 중 파일명에 spec/스펙이 있는 것 우선,
# 없으면 마지막 4장(스펙 표는 보통 상세 하단 — 코베아·MSR 세션 노하우). 긴 이미지는 1500px 타일로 잘라 OCR.
# 값 선택: "케이스 포함" 무게(패킹 무게) 우선 → 무게/중량/Weight 라벨 값. 서로 다른 후보가 여럿이면 모호 → 결측 유지.
#
# Usage: python3 helinox-weight-ocr.py <crawl-json> [out-json]
import hashlib
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request

import Quartz
import Vision
from Foundation import NSURL
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE_HTML = os.path.join(HERE, "out", "helinox-cache")
CACHE_IMG = os.path.join(HERE, "out", "helinox-ocr")
os.makedirs(CACHE_IMG, exist_ok=True)
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

NUM = r"\d[\d,]*(?:\.\d+)?"
UNIT = r"(kg|g)"
# "1.360 g"(마침표 천 단위) → 1360. 라벨 오인식(무게 → 무 게, weight → welght) 허용
WEIGHT_RE = re.compile(rf"(?:무\s*게|중\s*량|we[il1]ght)[^\n\d]{{0,20}}?({NUM})\s*{UNIT}\b", re.I)
CASE_RE = re.compile(rf"(?:케이스\s*포함[^\n\d]{{0,12}}?({NUM})\s*{UNIT}\b)|(?:({NUM})\s*{UNIT}\s*\(?\s*케이스\s*포함)", re.I)
MIN_G, MAX_G = 3, 25000


def to_g(num, unit):
    if unit.lower() == "g" and re.fullmatch(r"\d{1,2}\.\d{3}", num):
        num = num.replace(".", "")
    v = float(num.replace(",", ""))
    v = v * 1000 if unit.lower() == "kg" else v
    return round(v, 2)


def fetch(url):
    key = hashlib.md5(url.encode()).hexdigest()
    path = os.path.join(CACHE_IMG, key + ".png")
    if os.path.exists(path):
        return path
    safe = urllib.parse.quote(url, safe=":/?=&%")
    req = urllib.request.Request(safe, headers={"User-Agent": UA, "Referer": "https://www.helinox.co.kr/"})
    with urllib.request.urlopen(req, timeout=25) as r:
        raw = r.read()
    Image.open(io.BytesIO(raw)).convert("RGB").save(path)
    return path


def ocr_path(path):
    url = NSURL.fileURLWithPath_(path)
    src = Quartz.CGImageSourceCreateWithURL(url, None)
    if src is None:
        return ""
    cg = Quartz.CGImageSourceCreateImageAtIndex(src, 0, None)
    req = Vision.VNRecognizeTextRequest.alloc().init()
    req.setRevision_(3)
    req.setRecognitionLevel_(0)  # 한국어는 fast(0)만 지원
    req.setUsesLanguageCorrection_(False)
    req.setRecognitionLanguages_(["ko-KR", "en-US"])
    Vision.VNImageRequestHandler.alloc().initWithCGImage_options_(cg, None).performRequests_error_([req], None)
    rows = []
    for obs in req.results() or []:
        c = obs.topCandidates_(1)
        if c:
            bb = obs.boundingBox()
            rows.append((round(1 - bb.origin.y - bb.size.height, 3), bb.origin.x, c[0].string()))
    # 같은 행(y 근접) 텍스트를 한 줄로 — 라벨|값이 좌우로 쪼개진 표 대응
    rows.sort()
    lines, cur, cy = [], [], None
    for y, x, t in rows:
        if cy is not None and abs(y - cy) > 0.012:
            lines.append(" ".join(s for _, s in sorted(cur)))
            cur = []
        cur.append((x, t))
        cy = y
    if cur:
        lines.append(" ".join(s for _, s in sorted(cur)))
    return "\n".join(lines)


def ocr_image(url):
    path = fetch(url)
    im = Image.open(path)
    w, h = im.size
    if h <= 1800:
        return ocr_path(path)
    texts = []
    for top in range(0, h, 1500):
        tile = im.crop((0, top, w, min(h, top + 1600)))
        tp = path.replace(".png", f".t{top}.png")
        if not os.path.exists(tp):
            tile.save(tp)
        texts.append(ocr_path(tp))
    return "\n".join(texts)


def detail_images(uid):
    f = os.path.join(CACHE_HTML, f"{uid}.html")
    if not os.path.exists(f):
        return []
    t = open(f, encoding="utf-8").read()
    # 상세 설명 = <div class="shopdetailItem contWidth"> ~ 배송/교환 안내(inner-cont) 또는 "최근 본 상품" 전
    i = t.find('class="shopdetailItem')
    if i < 0:
        return []
    ends = [k for k in (t.find('class="inner-cont"', i), t.find("최근 본 상품", i)) if k > 0]
    seg = t[i : min(ends) if ends else len(t)]
    urls = []
    for m in re.finditer(r'<img[^>]+src="([^"]+)"', seg, re.I):
        u = m.group(1).strip()
        if re.search(r"/design/|/images/|icon|btn_|blank|spacer", u, re.I):
            continue
        if u.startswith("//"):
            u = "https:" + u
        elif u.startswith("/"):
            u = "https://www.helinox.co.kr" + u
        if u.startswith("http") and u not in urls:
            urls.append(u.replace("http://", "https://", 1) if "img13.kr" in u else u)
    spec = [u for u in urls if re.search(r"spec|스펙|%EC%8A%A4%ED%8E%99|info", u, re.I)]
    return spec or urls[-4:]


def weight_from_text(text):
    case = [to_g(m.group(1) or m.group(3), m.group(2) or m.group(4)) for m in CASE_RE.finditer(text)]
    case = sorted({v for v in case if MIN_G <= v <= MAX_G})
    if len(case) == 1:
        return case[0], "케이스 포함"
    vals = sorted({to_g(m.group(1), m.group(2)) for m in WEIGHT_RE.finditer(text)} - {0})
    vals = [v for v in vals if MIN_G <= v <= MAX_G]
    if len(vals) == 1:
        return vals[0], "무게"
    if len(vals) == 2 and not case:
        return max(vals), "무게(2값 중 큰 값=케이스 포함 추정)"
    return 0, f"모호/없음 {vals or ''}"


def main():
    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else src
    data = json.load(open(src, encoding="utf-8"))
    rows = data if isinstance(data, list) else data.get("items") or data.get("gears")
    targets = {}
    for r in rows:
        if r.get("weight") or r.get("category") == "clothing":
            continue
        uid = r["_detailUrl"].split("=")[-1]
        targets.setdefault(uid, []).append(r)
    report = {}
    for n, (uid, rs) in enumerate(targets.items(), 1):
        w, why, used = 0, "이미지 없음", ""
        for url in detail_images(uid):
            try:
                text = ocr_image(url)
            except Exception as e:  # 이미지 404 등은 다음 이미지로
                why = f"이미지 오류 {e.__class__.__name__}"
                continue
            w, why = weight_from_text(text)
            if w:
                used = url
                break
        for r in rs:
            if w:
                r["weight"] = w
                r["_weightSource"] = f"OCR({why})"
        report[uid] = {"name": rs[0].get("_siteName"), "weight": w, "why": why, "img": used}
        print(f"[{n}/{len(targets)}] {uid} {rs[0].get('_siteName')} → {w or '-'} ({why})", flush=True)
    json.dump(data, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    json.dump(report, open(os.path.join(HERE, "out", "helinox-weight-ocr-report.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    got = sum(1 for v in report.values() if v["weight"])
    print(f"완료: 대상 {len(targets)}개 상품 중 {got}개 무게 채움")


if __name__ == "__main__":
    main()
