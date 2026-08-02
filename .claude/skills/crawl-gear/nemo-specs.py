#!/usr/bin/env python3
# 니모 고시 이미지(_specImage) 하단 영역을 읽기 좋게 크롭/분할.
# 사용: python3 nemo-specs.py <crawl-json> [out-dir]
# 각 item 의 _specImage 를 다운로드 → 하단 약 3200px 크롭 → 폭 1100 로 리사이즈
# → 1900px 높이 타일로 분할(겹침 120) → <groupId>_tN.png 저장.
import json
import os
import sys
import urllib.parse
import urllib.request
from io import BytesIO

from PIL import Image

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
REFERER = "https://www.nemoequipment.co.kr/"

BOTTOM_PX = 3400   # 하단에서 잘라낼 높이(고시 표 + 여백 포함)
TARGET_W = 1100    # 리사이즈 폭
TILE_H = 1900      # 타일 높이
OVERLAP = 140      # 타일 겹침


def fetch(url):
    safe = urllib.parse.quote(url, safe=":/?=&%")
    req = urllib.request.Request(safe, headers={"User-Agent": UA, "Referer": REFERER})
    with urllib.request.urlopen(req, timeout=40) as r:
        return Image.open(BytesIO(r.read())).convert("RGB")


def process(item, out_dir):
    gid = item["groupId"]
    url = item.get("_specImage", "")
    if not url:
        return {"groupId": gid, "tiles": [], "note": "no _specImage"}
    try:
        im = fetch(url)
    except Exception as e:
        return {"groupId": gid, "tiles": [], "note": f"fetch fail: {e}"}

    w, h = im.size
    top = max(0, h - BOTTOM_PX)
    crop = im.crop((0, top, w, h))
    # 리사이즈
    scale = TARGET_W / w
    crop = crop.resize((TARGET_W, int(crop.height * scale)), Image.LANCZOS)
    ch = crop.height
    tiles = []
    y = 0
    idx = 0
    while y < ch:
        tile = crop.crop((0, y, TARGET_W, min(y + TILE_H, ch)))
        p = os.path.join(out_dir, f"{gid}_t{idx}.png")
        tile.save(p)
        tiles.append(p)
        idx += 1
        if y + TILE_H >= ch:
            break
        y += TILE_H - OVERLAP
    return {"groupId": gid, "tiles": tiles, "src": url}


def main():
    json_path = sys.argv[1]
    out_dir = sys.argv[2] if len(sys.argv) > 2 else "/tmp/nemo-specs"
    os.makedirs(out_dir, exist_ok=True)
    data = json.load(open(json_path))
    report = [process(it, out_dir) for it in data]
    for r in report:
        print(json.dumps(r, ensure_ascii=False))


if __name__ == "__main__":
    main()
