#!/usr/bin/env python3
# 꼴로르 무게 OCR — 텍스트에 무게 없는 제품(CL/CT 실타프·사이드월 등, 콜라보/코팅 라인)의 무게가
# 상세 이미지(/web/upload/NNEditor/) 스펙 표에 'Full Weight 1,680g(Skin), 770g(Acc)' 형태로 있음.
# macOS Vision OCR 로 추출. 스킨(본체) 무게 우선. 대상: weight==0 이고 하드웨어 아님.
# 사용: python3 ccolore-weight-ocr.py out/ccolore-FINAL.json
import io
import json
import re
import subprocess
import sys

from PIL import Image

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
# 무게가 아예 없는 하드웨어/소모품은 OCR 스킵
SKIP = re.compile(r"폴대|폴\b|pole|스트링|스토퍼|코드락|카라비너|스테이크|펙|케이스|case|캘린더|커버|양말|socks|스트랩", re.I)


def cb(u, ref="https://ccolore.com/"):
    try:
        return subprocess.run(["curl", "-sS", "-m", "25", "-A", UA, "-e", ref, u],
                              capture_output=True, timeout=30).stdout
    except Exception:
        return b""


def ocr_text(product_no):
    t = cb(f"https://ccolore.com/product/detail.html?product_no={product_no}").decode("utf-8", "replace")
    imgs = [u for u in dict.fromkeys(re.findall(r'/web/upload/NNEditor/[^"\']+\.(?:jpg|jpeg|png)', t))]
    out = []
    for p in imgs:
        raw = cb("https://ccolore.com" + p)
        if raw[:3] != b"\xff\xd8\xff" and raw[:4] != b"\x89PNG":
            continue
        try:
            im = Image.open(io.BytesIO(raw)).convert("RGB")
        except Exception:
            continue
        W, H = im.size
        for top in range(0, H, 1400):
            im.crop((0, top, W, min(top + 1500, H))).save("/tmp/_ccw.jpg")
            try:
                items = json.loads(subprocess.run(["python3", "ocr.py", "/tmp/_ccw.jpg"],
                                                  capture_output=True, timeout=60).stdout.decode("utf-8", "replace"))
            except Exception:
                continue
            out.append(" ".join(i["t"] for i in items))
    return " ".join(out)


def parse_weight(txt):
    """'Full Weight 1,680g(Skin), 770g(Acc)' → 1680(스킨). 'Full Weight 2,390g' → 2390."""
    # 스킨(본체) 우선
    m = re.search(r"([\d,]+)\s*g\s*\(\s*Skin\s*\)", txt, re.I)
    if m:
        return float(m.group(1).replace(",", ""))
    # 'Full Weight' 근처 g 값(OCR 오타 Fulll 허용). 라벨 앞/뒤 40자 내 첫 g 값.
    for lm in re.finditer(r"[Ff]ul+\s*[Ww]eight", txt):
        window = txt[max(0, lm.start() - 45):lm.end() + 45]
        gs = [float(x.replace(",", "")) for x in re.findall(r"([\d,]+(?:\.\d+)?)\s*g\b", window)
              if 30 <= float(x.replace(",", "")) <= 8000 and "Acc" not in window[window.find(x):window.find(x) + 20]]
        if gs:
            return gs[0]
    return 0


def main():
    path = sys.argv[1]
    rows = json.load(open(path))
    by_no = {}
    for r in rows:
        if not r["weight"] and not SKIP.search(r["name"]):
            no = re.search(r"product_no=(\d+)", r["_source"]).group(1)
            by_no.setdefault(no, []).append(r)
    print(f"무게 없는 대상(하드웨어 제외) product_no: {len(by_no)}", flush=True)
    filled = 0
    for i, (no, rs) in enumerate(by_no.items(), 1):
        w = parse_weight(ocr_text(no))
        if w:
            for r in rs:
                r["weight"] = w
            filled += 1
        if i % 5 == 0 or i == len(by_no):
            print(f"  {i}/{len(by_no)} (채움 {filled})", flush=True)
    json.dump(rows, open(path, "w"), ensure_ascii=False, indent=2)
    print(f"완료: {filled} 제품 무게 채움 -> {path}", flush=True)


if __name__ == "__main__":
    main()
