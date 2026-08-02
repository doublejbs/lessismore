#!/usr/bin/env python3
# 엑스패드 색상 OCR — 색상 없는 제품의 상세설명 이미지(/web/upload/NNEditor/)에
# "색상 : ● 메로우" 형태로 색상이 있음(텍스트 아님·이미지). macOS Vision OCR 로 추출.
# 대상: KR 소스 + color=='' 인 제품(groupId 단위). color(영문)+colorKorean(한글) 채움.
# 사용: python3 exped-color-ocr.py out/exped-FINAL.json
import io
import json
import re
import subprocess
import sys

from PIL import Image

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

COLOR_EN = {
    "메로우": "Mallow", "모스": "Moss", "다크라바": "Dark Lava", "블랙": "Black", "네이비": "Navy",
    "그레이": "Grey", "골드": "Gold", "세이지": "Sage", "버건디": "Burgundy", "포레스트": "Forest",
    "모레인": "Moraine", "사이프러스": "Cypress", "움브라": "Umbra", "라이켄": "Lichen", "루비": "Ruby",
    "테라코타": "Terracotta", "화이트": "White", "블루": "Blue", "카키": "Khaki", "그린": "Green",
    "오션": "Ocean", "썬버스트": "Sunburst", "포그": "Fog", "어버진": "Aubergine", "아이벡스": "Ibex",
    "트라우트": "Trout", "마멋": "Marmot", "플레임": "Flame", "다크헤나": "Dark Henna",
    "그레이구스": "Grey Goose", "레드": "Red", "오렌지": "Orange", "옐로": "Yellow", "실버": "Silver",
    "차콜": "Charcoal", "브라운": "Brown", "베이지": "Beige", "아이보리": "Ivory", "민트": "Mint",
    "테라": "Terra", "선셋": "Sunset", "스톰": "Storm", "코랄": "Coral", "라임": "Lime",
    "올리브": "Olive", "틸": "Teal", "로즈": "Rose", "샌드": "Sand", "포피": "Poppy",
}


def curl_bytes(url, ref="https://exped.co.kr/"):
    try:
        return subprocess.run(["curl", "-sS", "-m", "25", "-A", UA, "-e", ref, url],
                              capture_output=True, timeout=30).stdout
    except Exception:
        return b""


def curl_text(url):
    return curl_bytes(url).decode("utf-8", "replace")


def detail_images(product_no):
    t = curl_text(f"https://exped.co.kr/product/detail.html?product_no={product_no}")
    paths = re.findall(r'(?:src|ec-data-src|data-src)=["\']([^"\']*?/web/upload/NNEditor/[^"\']+\.(?:jpg|jpeg|png))', t, re.I)
    out = []
    for p in dict.fromkeys(paths):
        if p.startswith("//"):
            p = "https:" + p
        elif p.startswith("/"):
            p = "https://exped.co.kr" + p
        out.append(p)
    return out


def ocr_lines(raw):
    try:
        im = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        return []
    W, H = im.size
    lines = []
    for top in range(0, H, 1400):
        im.crop((0, top, W, min(top + 1500, H))).save("/tmp/_ecol.jpg")
        try:
            items = json.loads(subprocess.run(["python3", "ocr.py", "/tmp/_ecol.jpg"],
                                              capture_output=True, timeout=60).stdout.decode("utf-8", "replace"))
            lines += [it["t"] for it in items]
        except Exception:
            continue
    return lines


def parse_color(lines):
    for ln in lines:
        m = re.search(r"색상\s*[:：]?\s*[●•·]?\s*([가-힣][가-힣A-Za-z /]*)", ln)
        if m:
            val = m.group(1).strip()
            # 안내문/마케팅 문장 오추출 제외(예: "색상과 디자인으로 업데이트 되었습니다")
            if re.search(r"교환|변경|선택|참고|이미지|되었|제공|업데이트|디자인|니다|^과$|^만$", val) or len(val) > 7:
                continue
            # 멀티컬러 "/" 분리
            parts = [p.strip() for p in re.split(r"[/,]", val) if p.strip()][:1]  # 대표(첫) 색상
            return parts[0] if parts else ""
    return ""


def main():
    path = sys.argv[1]
    rows = json.load(open(path))
    by_no = {}
    for r in rows:
        if "exped.co.kr" in r["_source"] and not any(x["color"] for x in rows if x["groupId"] == r["groupId"]):
            no = re.search(r"product_no=(\d+)", r["_source"]).group(1)
            by_no.setdefault(no, []).append(r)
    print(f"색상 없는 제품(product_no): {len(by_no)}", flush=True)
    filled = 0
    for i, (no, rs) in enumerate(by_no.items(), 1):
        lines = []
        for u in detail_images(no):
            raw = curl_bytes(u)
            if raw[:3] != b"\xff\xd8\xff" and raw[:4] != b"\x89PNG":
                continue
            lines += ocr_lines(raw)
            if any("색상" in ln for ln in lines):
                break  # 색상 찾으면 조기 종료
        ko = parse_color(lines)
        if ko:
            en = " ".join(COLOR_EN.get(w, w) for w in ko.split())
            for r in rs:
                r["color"] = en
                r["colorKorean"] = ko
            filled += 1
        if i % 10 == 0 or i == len(by_no):
            print(f"  {i}/{len(by_no)} (색상 {filled})", flush=True)
    json.dump(rows, open(path, "w"), ensure_ascii=False, indent=2)
    print(f"완료: 색상 채운 제품 {filled} -> {path}")


if __name__ == "__main__":
    main()
