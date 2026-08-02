#!/usr/bin/env python3
# 니모 고시 이미지에서 "스펙 표" 밴드를 자동 검출해 읽기 좋은 크롭으로 저장.
# 표는 사진과 달리 가로 방향이 균일한 배경 + 규칙적 텍스트 행 → 행별 가로 분산이 낮다.
# 원본은 /tmp/nemo-orig 에 캐시. 결과 크롭은 out-dir 에 <groupId>.png (필요시 _b 보조).
# 사용: python3 nemo-findtable.py <crawl-json> [out-dir]
import json
import os
import sys
import urllib.parse
import urllib.request
from io import BytesIO

from PIL import Image

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
REFERER = "https://www.nemoequipment.co.kr/"
ORIG_DIR = "/tmp/nemo-orig"


def fetch(url, cache_path):
    if os.path.exists(cache_path) and os.path.getsize(cache_path) > 1000:
        return Image.open(cache_path).convert("RGB")
    safe = urllib.parse.quote(url, safe=":/?=&%")
    req = urllib.request.Request(safe, headers={"User-Agent": UA, "Referer": REFERER})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    open(cache_path, "wb").write(data)
    return Image.open(BytesIO(data)).convert("RGB")


W = 240


def row_ink(im):
    # 폭 W 그레이스케일. 행별로: 배경=중앙값, 잉크비율=배경과 크게 다른 픽셀 비율.
    # 표 행 = 균일 배경 위 텍스트 → 잉크비율이 중간(0.02~0.32). 사진=높음/그라데이션, 빈줄/단색=0.
    w, h = im.size
    small = im.convert("L").resize((W, h), Image.BILINEAR)
    px = small.load()
    ink = []
    for y in range(h):
        row = [px[x, y] for x in range(W)]
        srt = sorted(row)
        bg = srt[W // 2]
        cnt = sum(1 for p in row if abs(p - bg) > 45)
        ink.append(cnt / W)
    return ink


def find_table_band(ink, h):
    # "표스러운" 행 = 0.015 < ink < 0.34. 슬라이딩 윈도(1500px)로 표스러운 행 밀도 최대 구간.
    tableish = [1 if 0.015 < v < 0.34 else 0 for v in ink]
    win = 1500
    if h <= win:
        return (0, h)
    pref = [0]
    for v in tableish:
        pref.append(pref[-1] + v)
    best, bestY = -1, 0
    # 상단 8%는 제외(헤더 로고 등), 그 아래 전 구간 탐색
    for y in range(int(h * 0.08), h - win):
        score = pref[y + win] - pref[y]
        if score > best:
            best = score
            bestY = y
    # 밀도가 너무 낮으면(표 아님) None
    if best < win * 0.30:
        return None
    return (bestY, bestY + win)


def process(item, out_dir):
    gid = item["groupId"]
    url = item.get("_specImage", "")
    if not url:
        return f"{gid}: no _specImage"
    ext = ".jpg"
    cache = os.path.join(ORIG_DIR, gid + ext)
    try:
        im = fetch(url, cache)
    except Exception as e:
        return f"{gid}: fetch fail {e}"
    w, h = im.size
    ink = row_ink(im)
    band = find_table_band(ink, h)
    if not band:
        # 폴백: 하단 3400px
        band = (max(0, h - 3400), h)
    a, b = band
    a = max(0, a - 120)
    b = min(h, b + 120)
    crop = im.crop((0, a, w, b))
    # 폭 1080 로 리사이즈(가독)
    scale = 1080 / w
    crop = crop.resize((1080, int(crop.height * scale)), Image.LANCZOS)
    # 너무 길면 위/아래 2장으로
    out = os.path.join(out_dir, gid + ".png")
    crop.save(out)
    return f"{gid}: band={a}-{b} (h={h}) -> {out} ({crop.size[0]}x{crop.size[1]})"


def main():
    os.makedirs(ORIG_DIR, exist_ok=True)
    out_dir = sys.argv[2] if len(sys.argv) > 2 else "/tmp/nemo-tables"
    os.makedirs(out_dir, exist_ok=True)
    data = json.load(open(sys.argv[1]))
    for it in data:
        print(process(it, out_dir))


if __name__ == "__main__":
    main()
