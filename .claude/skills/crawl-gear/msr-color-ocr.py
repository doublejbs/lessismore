#!/usr/bin/env python3
# MSR 색상 OCR — 문구에 색상 없는 제품의 색상이 상세 '이미지' 스펙표에 '색상: 망고 (Mango)' 형태로 있음.
# macOS Vision OCR 로 추출. 영문 병기(괄호) 우선 → color(영문)+colorKorean(한글).
# 사용: python3 msr-color-ocr.py out/msr-FINAL.json
import importlib.util
import io
import json
import re
import subprocess
import sys

from PIL import Image

spec = importlib.util.spec_from_file_location("m", "msr.py")
M = importlib.util.module_from_spec(spec)
spec.loader.exec_module(M)

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
# 색상 없는 하드웨어/소모품 스킵
SKIP = re.compile(r"sticker|스티커|캘린더|calendar|뚜껑|\bcap\b|igniter|이그나이터|텐셔너|zipper\s*pull|지퍼\s*풀|"
                  r"cord|코드|guy\s*line|가이\s*라인|marker|마커|stake|스테이크|\bpole|\b폴|adapter|아답터|"
                  r"pump|펌프|hanging|행잉|stand|스탠드|igniter|fuel|연료|handle|핸들러|리프터|lifter", re.I)


def cb(u):
    full = u if u.startswith("http") else "http://www.msrgear.co.kr/" + u.lstrip("/")
    try:
        return subprocess.run(["curl", "-sSL", "-m", "25", "-A", UA, full], capture_output=True, timeout=30).stdout
    except Exception:
        return b""


def ocr_text(url):
    h = M.curl(url)
    imgs = [i for i in dict.fromkeys(re.findall(r"wp-content/uploads/[^\"']+\.(?:jpg|jpeg|png)", h))
            if "page_title" not in i and "logo" not in i.lower() and "icon" not in i.lower()][:8]
    out = []
    for u in imgs:
        raw = cb(u)
        if raw[:3] != b"\xff\xd8\xff" and raw[:4] != b"\x89PNG":
            continue
        try:
            im = Image.open(io.BytesIO(raw)).convert("RGB")
        except Exception:
            continue
        W, H = im.size
        for top in range(0, H, 1400):
            im.crop((0, top, W, min(top + 1500, H))).save("/tmp/_msrc.jpg")
            try:
                items = json.loads(subprocess.run(["python3", "ocr.py", "/tmp/_msrc.jpg"],
                                                  capture_output=True, timeout=60).stdout.decode("utf-8", "replace"))
                out.append(" ".join(i["t"] for i in items))
            except Exception:
                continue
        if any("색상" in o or re.search(r"[Cc]olor", o) for o in out):
            break  # 색상 찾으면 조기 종료
    return " ".join(out)


def parse_color_ocr(txt):
    en, ko = M.parse_color(txt)  # '색상: 망고 (Mango)'
    if en:
        return en, ko
    m = re.search(r"[Cc]olou?r\s*[:：]?\s*([A-Za-z][A-Za-z /]{1,25})", txt)  # 영문 'Color: Mango'
    if m:
        e = m.group(1).strip()
        return e, e
    return "", ""


def main():
    path = sys.argv[1]
    rows = json.load(open(path))
    by_src = {}
    for r in rows:
        by_src.setdefault(r["_source"], []).append(r)
    # 색상이 실제로 있는 카테고리만(써마레스트 패드/베개/침낭/체어 + 텐트). 스토브·쿡웨어 등 단색은 스킵.
    COLORFUL = {"mat", "pillow", "chair", "sleeping_bag", "tent", "tarp", "pouch", "towel"}
    targets = [(s, rs) for s, rs in by_src.items()
               if not any(x["color"] for x in rs) and rs[0]["category"] in COLORFUL
               and not SKIP.search(rs[0]["name"])]
    print(f"색상 없는 대상(하드웨어 제외): {len(targets)}", flush=True)
    filled = 0
    for i, (src, rs) in enumerate(targets, 1):
        en, ko = parse_color_ocr(ocr_text(src))
        if en:
            for r in rs:
                r["color"] = en
                r["colorKorean"] = ko or en
            filled += 1
        if i % 10 == 0 or i == len(targets):
            print(f"  {i}/{len(targets)} (채움 {filled})", flush=True)
    json.dump(rows, open(path, "w"), ensure_ascii=False, indent=2)
    print(f"완료: {filled} 제품 색상 채움 -> {path}", flush=True)


if __name__ == "__main__":
    main()
