#!/usr/bin/env python3
# MSR 무게 OCR — 텍스트에 무게 없는 제품(매트/베개/체어/텐트악세 등)의 무게가 상세 '이미지'
# 스펙표에 '중량 R-620g / RW -820g / L-880g'(사이즈별) 또는 '중량 : Ng'(단일)로 있음.
# macOS Vision OCR 로 추출. 사이즈별이면 해당 제품 행을 사이즈별로 확장(무게 0 단일행 대체).
# 사용: python3 msr-weight-ocr.py out/msr-FINAL.json
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
# 무게 없는 소모품/머치는 스킵
SKIP = re.compile(r"sticker|스티커|캘린더|calendar|뚜껑|\bcap\b|비니|beanie|t-?shirt|티셔츠|opener|오프너|igniter|이그나이터|텐셔너|zipper\s*pull|지퍼\s*풀|마커|marker|코드\b|guy\s*line|가이\s*라인", re.I)


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
            im.crop((0, top, W, min(top + 1500, H))).save("/tmp/_msrw.jpg")
            try:
                items = json.loads(subprocess.run(["python3", "ocr.py", "/tmp/_msrw.jpg"],
                                                  capture_output=True, timeout=60).stdout.decode("utf-8", "replace"))
                out.append(" ".join(i["t"] for i in items))
            except Exception:
                continue
    return " ".join(out)


def main():
    path = sys.argv[1]
    rows = json.load(open(path))
    by_no = {}
    for r in rows:
        no = re.search(r"product_no=(\d+)", r["_source"]) or re.search(r"/([^/]+)/?$", r["_source"])
        key = r["_source"]
        by_no.setdefault(key, []).append(r)
    targets = [(k, rs) for k, rs in by_no.items()
               if not any(x["weight"] for x in rs) and not SKIP.search(rs[0]["name"])]
    print(f"무게 없는 대상(머치/소모품 제외): {len(targets)}", flush=True)
    filled = 0
    new_rows = list(rows)
    for i, (src, rs) in enumerate(targets, 1):
        wmap = M.parse_weights(ocr_text(src), [])
        if not wmap:
            continue
        tmpl = rs[0]
        real = [s for s in wmap if s]
        if real:  # 사이즈별 → 행 확장
            for r in rs:
                new_rows.remove(r)
            base_en = tmpl["name"]
            base_ko = tmpl["nameKorean"]
            for s in real:
                r2 = dict(tmpl)
                r2["size"] = s
                r2["sizeKorean"] = s
                r2["name"] = f"{base_en} {s}".strip()
                r2["nameKorean"] = f"{base_ko} {s}".strip()
                r2["weight"] = wmap[s]
                new_rows.append(r2)
        else:  # 단일 무게
            for r in rs:
                r["weight"] = wmap[""]
        filled += 1
        if i % 5 == 0 or i == len(targets):
            print(f"  {i}/{len(targets)} (채움 {filled})", flush=True)
    json.dump(new_rows, open(path, "w"), ensure_ascii=False, indent=2)
    print(f"완료: {filled} 제품 무게 채움, 총 {len(new_rows)}행 -> {path}", flush=True)


if __name__ == "__main__":
    main()
