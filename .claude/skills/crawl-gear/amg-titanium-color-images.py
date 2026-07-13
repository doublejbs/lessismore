#!/usr/bin/env python3
# AMG티타늄 크롤 JSON에서, 색상 옵션이 있는 상품들의 imageUrl을 색상별로 재배정한다.
#
# 문제: Cafe24 옵션 select/버튼에는 옵션별 이미지(link_image)가 비어있어, 어댑터는 상세페이지의
# 대표 이미지(og:image) 하나만 모든 색상 행에 똑같이 채워 넣는다 — 사용자가 지적한 "사진과 색상이
# 안 맞는" 문제의 원인.
# 실제로는 상세페이지 갤러리(#xans-product-mobileimage 안, style="display:none"으로 숨겨진
# <li>들)에 색상별 사진이 들어있지만 라벨이 없다. 게다가 갤러리엔 이 상품이 안 파는 색(예: 휘슬S는
# 블루/그린/그레이/네이비만 팔지만 갤러리엔 레드 사진도 섞여 있음 — 다른 사이즈용 공용 자산으로
# 추정) 이 섞여 있어 순서로 매핑하면 틀린다.
# 해결: 각 갤러리 이미지의 대표색(HSV, 흰 배경 제외 후 hue/sat/val)을 계산해, 그 상품이 실제로
# 파는 색상 옵션들과 1:1 최적 매칭(거리가 가장 작은 조합부터 그리디 배정)한다. 무채색(회색/검정/
# 네이비/실버/화이트)은 색상각이 불안정해 채도·명도 구간으로 먼저 분리한다.
#
# Usage: python3 amg-titanium-color-images.py <crawl-json> [out-json]
import colorsys
import json
import re
import sys
import urllib.parse
import urllib.request
from io import BytesIO

from PIL import Image

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
BASE = "https://m.amg-titanium.co.kr"

HUE_REF = {
    "Red": 0, "Orange": 30, "Yellow": 55, "Green": 120, "Mint": 160,
    "Blue": 210, "Purple": 275, "Pink": 330,
}
# 무채색/저채도 구간 판정 후보 (색 이름별 기대 명도 범위) — Navy는 채도가 낮아도 남는 남색 기운을
# hue로 우선 판별하고, 그마저 애매하면 명도로 Black보다 밝고 Gray보다 어두운 쪽에 배정.
ACHROMATIC_ORDER = ["Black", "Navy", "Gray", "Silver", "White"]


def fetch(url):
    safe = urllib.parse.quote(url, safe=":/?=&%")
    req = urllib.request.Request(safe, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def dominant_hsv(img_bytes):
    im = Image.open(BytesIO(img_bytes)).convert("RGB")
    w, h = im.size
    im2 = im.resize((100, max(1, int(100 * h / w))))
    pixels = list(im2.getdata())
    obj = [p for p in pixels if not (p[0] > 220 and p[1] > 220 and p[2] > 220)]
    if not obj:
        obj = pixels
    r = sum(p[0] for p in obj) / len(obj) / 255
    g = sum(p[1] for p in obj) / len(obj) / 255
    b = sum(p[2] for p in obj) / len(obj) / 255
    h_, s_, v_ = colorsys.rgb_to_hsv(r, g, b)
    return h_ * 360, s_, v_


def color_distance(hsv, target_name):
    h, s, v = hsv
    if target_name in ("Black", "Navy", "Gray", "Silver", "White"):
        # 무채색 타깃: 채도가 높으면(뚜렷한 유채색 사진) 매치 안 되도록 큰 거리를 준다.
        penalty = max(0, s - 0.25) * 200
        expected_v = {"Black": 0.15, "Navy": 0.35, "Gray": 0.5, "Silver": 0.65, "White": 0.9}[target_name]
        return abs(v - expected_v) * 100 + penalty
    if target_name not in HUE_REF:
        return 999
    if s < 0.15:
        return 999  # 무채색 사진은 유채색 타깃과 매치하지 않는다
    d = min(abs(h - HUE_REF[target_name]), 360 - abs(h - HUE_REF[target_name]))
    return d


def gallery_images(html):
    start = html.find("xans-product-mobileimage")
    if start == -1:
        return []
    seg = html[start : start + 4000]
    imgs = re.findall(r'<img src="([^"]+)"[^>]*class="ThumbImage"', seg)
    out = []
    for u in imgs:
        if u.startswith("//"):
            u = "https:" + u
        elif u.startswith("/"):
            u = BASE + u
        out.append(u.split("?")[0])
    seen = set()
    return [u for u in out if not (u in seen or seen.add(u))]


def assign_images(target_colors, image_urls):
    """target_colors: [{'row_idx':int,'color':str}], image_urls: [url,...] -> {row_idx: url}"""
    hsvs = {}
    for u in image_urls:
        try:
            hsvs[u] = dominant_hsv(fetch(u))
        except Exception as e:
            print(f"    fetch/analyze fail {u}: {e}", file=sys.stderr)
    candidates = []
    for t in target_colors:
        for u in image_urls:
            if u not in hsvs:
                continue
            d = color_distance(hsvs[u], t["color"])
            candidates.append((d, t["row_idx"], u))
    candidates.sort(key=lambda c: c[0])
    assigned_row = {}
    used_img = set()
    for d, row_idx, u in candidates:
        if row_idx in assigned_row or u in used_img:
            continue
        if d > 120:  # 너무 먼 매치는 포기 (원본 대표이미지로 남김)
            continue
        assigned_row[row_idx] = u
        used_img.add(u)
    return assigned_row


def main():
    crawl_path = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else crawl_path
    data = json.load(open(crawl_path, encoding="utf-8"))

    by_product = {}
    for i, row in enumerate(data):
        by_product.setdefault(row["_productNo"], []).append(i)

    n_updated = 0
    for pno, idxs in by_product.items():
        colors = {data[i]["color"] for i in idxs}
        if len(colors) < 2:
            continue  # 색상 옵션이 여러개인 상품만 대상
        name = data[idxs[0]]["nameKorean"]
        print(f"[{pno}] {name} colors={sorted(colors)}", file=sys.stderr)
        detail_url = data[idxs[0]]["_detailUrl"]
        try:
            html = fetch(detail_url).decode("utf-8", "ignore")
        except Exception as e:
            print(f"  detail fetch fail: {e}", file=sys.stderr)
            continue
        imgs = gallery_images(html)
        if len(imgs) < 2:
            print("  no gallery, skip", file=sys.stderr)
            continue
        targets = [{"row_idx": i, "color": data[i]["color"]} for i in idxs]
        assigned = assign_images(targets, imgs)
        for i in idxs:
            if i in assigned:
                data[i]["imageUrl"] = assigned[i]
                n_updated += 1
        print(f"  assigned {len(assigned)}/{len(idxs)}", file=sys.stderr)

    json.dump(data, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"이미지 재배정: {n_updated}행 -> {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
