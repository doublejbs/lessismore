#!/usr/bin/env python3
# 엑스패드 무게 OCR — EN 매칭이 안 된 매트/침낭/텐트의 무게를 KR 상세설명 이미지의
# Tech Specs 표(사이즈별 "M 220cm ... 300g")에서 추출. 대상: mat/sleeping_bag/tent + weight==0.
# 사용: python3 exped-weight-ocr.py out/exped-FINAL.json
import io
import json
import re
import subprocess
import sys

from PIL import Image

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
TARGET = {"mat", "sleeping_bag", "tent"}
SIZE_ALIAS = {"미디엄": "M", "라지": "L", "스몰": "S", "롱": "LW", "와이드": "W", "우노": "Uno", "듀오": "Duo",
              "UNO": "Uno", "DUO": "Duo", "TRIO": "Trio", "QUEEN": "Queen"}
# 주의: 정규식 교대(|)는 '먼저 나온 것' 우선이므로 긴/복합 사이즈를 앞에 둔다(MW 가 M+W 로 쪼개지지 않게).
SIZE_HEAD = r"(?:LXW|MW\+|LW\+|XXL|XL|XS|MW|LW|SW|Uno|Duo|Trio|Queen|UNO|DUO|TRIO|QUEEN|우노|듀오|트리오|미디엄|라지|스몰|S|M|L|W)"


def cb(u, ref="https://exped.co.kr/"):
    try:
        return subprocess.run(["curl", "-sS", "-m", "25", "-A", UA, "-e", ref, u],
                              capture_output=True, timeout=30).stdout
    except Exception:
        return b""


def detail_lines(product_no):
    t = cb(f"https://exped.co.kr/product/detail.html?product_no={product_no}").decode("utf-8", "replace")
    imgs = re.findall(r'(?:src|ec-data-src|data-src)=["\']([^"\']*?/web/upload/NNEditor/[^"\']+\.(?:jpg|jpeg|png))', t, re.I)
    urls = []
    for p in dict.fromkeys(imgs):
        urls.append("https:" + p if p.startswith("//") else ("https://exped.co.kr" + p if p.startswith("/") else p))
    lines = []
    for u in urls:
        raw = cb(u)
        if raw[:3] != b"\xff\xd8\xff" and raw[:4] != b"\x89PNG":
            continue
        try:
            im = Image.open(io.BytesIO(raw)).convert("RGB")
        except Exception:
            continue
        W, H = im.size
        for top in range(0, H, 1400):
            im.crop((0, top, W, min(top + 1500, H))).save("/tmp/_ewt.jpg")
            try:
                items = json.loads(subprocess.run(["python3", "ocr.py", "/tmp/_ewt.jpg"],
                                                  capture_output=True, timeout=60).stdout.decode("utf-8", "replace"))
            except Exception:
                continue
            items.sort(key=lambda x: (round(x["y"], 2), x["x"]))
            cy, cur = None, []
            for it in items:
                if cy is None or abs(it["y"] - cy) < 0.012:
                    cur.append(it["t"]); cy = it["y"] if cy is None else cy
                else:
                    lines.append(" ".join(cur)); cur = [it["t"]]; cy = it["y"]
            if cur:
                lines.append(" ".join(cur))
    return lines


def _g(val, unit):
    v = float(val.replace(",", ""))
    return round(v * 1000) if unit.lower() == "kg" else round(v)


def _grams(s):
    out = []
    for x in re.findall(r"(\d[\d,]*)\s*g\b", s):
        v = int(x.replace(",", ""))
        if 30 <= v <= 30000:
            out.append(v)
    return out


def parse_weights(lines):
    """사이즈별 무게 → {size: grams}. 두 표 형식 지원:
      (A) 행형(침낭): 'M 220cm 178cm ... 300g'
      (B) 매트형: 'M 사이즈' 헤더 → 값라인 '0°C 2.4 5cm 183x52x52cm 595 g ...'"""
    res = {}
    cur = None
    for ln in lines:
        # (B) 사이즈 헤더 "M 사이즈" / "LW 사이즈", 또는 단독 사이즈 블록 헤더 "MW"/"LW"/"LXW"
        #   단독 헤더는 2글자 이상 사이즈만 허용(단일 S/M/L/W 는 노이즈 오인 방지 위해 '사이즈' 필요).
        mh = re.match(r"^\s*(" + SIZE_HEAD + r")\s*사이즈\s*$", ln)
        if not mh:
            mb = re.match(r"^\s*(" + SIZE_HEAD + r")\s*$", ln)
            if mb and len(mb.group(1)) >= 2:
                mh = mb
        if mh:
            cur = SIZE_ALIAS.get(mh.group(1), mh.group(1))
            continue
        # (B) 값라인: 직전 사이즈 헤더가 있고 'N g' + cm 이 있으면 무게
        if cur and re.search(r"cm", ln):
            mg = re.search(r"([\d.,]+)\s*(kg|g)\b", ln)
            if mg:
                g = _g(mg.group(1), mg.group(2))
                if 50 <= g <= 30000:
                    res.setdefault(cur, g)
                cur = None
                continue
        # (A) 행형: 사이즈로 시작 + cm dimensions + Ng
        m = re.match(r"^\s*(" + SIZE_HEAD + r")\b(.*?)([\d.,]+)\s*(kg|g)\b", ln)
        if m and ("cm" in m.group(2)):
            sz = SIZE_ALIAS.get(m.group(1), m.group(1))
            g = _g(m.group(3), m.group(4))
            if 30 <= g <= 30000:
                res.setdefault(sz, g)
    # (D) 컬럼형 표: '사이즈 MW LW LXW' 헤더행 + 무게행('무게'/'무낵 게' + 사이즈수만큼 그램)
    #   '사이즈'가 '사 이 즈'로, '무게'가 '무낵 게'로 깨져도 대응. 순수 그램/oz쌍 모두 지원.
    col = None
    for ln in lines:
        mh = re.match(r"^\s*사\s*이\s*즈\s*[:：]?\s*(.+)", ln)
        if mh:
            c = re.findall(SIZE_HEAD, mh.group(1))
            col = c if len(c) >= 2 else None
            continue
        if col and re.match(r"^\s*무", ln) and "충전" not in ln:
            gs = _grams(ln)
            if len(gs) >= len(col):
                for sz, g in zip(col, gs):
                    res.setdefault(SIZE_ALIAS.get(sz, sz), g)
            col = None
    # (D') 헤더가 깨진 컬럼형(워터블록): 무게행에 oz쌍 → 그램 값 개수로 사이즈 추론(3→S/M/L).
    if not res:
        for ln in lines:
            mw = re.match(r"^\s*무게\s+(.+)", ln)
            if mw and "충전" not in ln and "/" in ln:
                gs = _grams(mw.group(1))
                col = {2: ["M", "L"], 3: ["S", "M", "L"], 4: ["S", "M", "L", "XL"]}.get(len(gs))
                if col:
                    for sz, g in zip(col, gs):
                        res.setdefault(SIZE_ALIAS.get(sz, sz), g)
                    break
    # (E) 단일 사이즈: '단일사이즈' 표기 + '무게' 단일 그램값 → 키 '' (본문 폴백이 사용)
    if not res and any(re.search(r"단일\s*사이즈", ln) for ln in lines):
        for ln in lines:
            if "무게" in ln and not re.search(r"충전|패킹|포장", ln):
                gs = _grams(ln)
                if len(gs) == 1:
                    res[""] = gs[0]
                    break
    # (F) 텐트/단일 라벨형 무게: 최대무게(패킹) > 최소무게 > '무게 : Ng'. 원단 무게(g/m²)는 제외.
    if not res:
        text = "\n".join(lines)
        for pat in [r"최대\s*무게\s*[:：(]?\s*(?:약\s*)?([\d.,]+)\s*(kg|g)\b",
                    r"최소\s*무게\s*[:：(]?\s*(?:약\s*)?([\d.,]+)\s*(kg|g)\b",
                    r"(?:^|[\s\-])무게\s*[:：]?\s*(?:약\s*)?([\d.,]+)\s*(kg|g)(?!\s*/?\s*m)"]:
            m = re.search(pat, text)
            if m:
                if m.group(2).lower() == "kg" and float(m.group(1).replace(",", "")) > 30:
                    continue  # OCR 소수점 유실 방어
                g = _g(m.group(1), m.group(2))
                if 30 <= g <= 30000:
                    res[""] = g
                    break
    return res


def parse_temp(lines):
    for ln in lines:
        m = re.search(r"(?:쾌적|한계)\s*온도.*?(-?\d+)\s*[℃도C]", ln)
        if m:
            return int(m.group(1))
    return None


def main():
    path = sys.argv[1]
    rows = json.load(open(path))
    by_no = {}
    for r in rows:
        if r["category"] in TARGET and "exped.co.kr" in r["_source"] and not r["weight"]:
            no = re.search(r"product_no=(\d+)", r["_source"]).group(1)
            by_no.setdefault(no, []).append(r)
    print(f"무게 없는 매트/침낭/텐트(product_no): {len(by_no)}", flush=True)
    fw = 0
    for i, (no, rs) in enumerate(by_no.items(), 1):
        lines = detail_lines(no)
        wmap = parse_weights(lines)
        temp = parse_temp(lines) if rs[0]["category"] == "sleeping_bag" else None
        got = False
        for r in rs:
            sz = r["size"]
            w = wmap.get(sz)
            if not w and wmap:
                w = next(iter(wmap.values())) if len(wmap) == 1 else min(wmap.values())
            if w:
                r["weight"] = w
                got = True
            if temp is not None and "limitTemp" not in r["specs"]:
                r["specs"] = {**r["specs"], "limitTemp": temp}
        if got:
            fw += 1
        if i % 5 == 0 or i == len(by_no):
            print(f"  {i}/{len(by_no)} (무게 {fw})", flush=True)
    json.dump(rows, open(path, "w"), ensure_ascii=False, indent=2)
    print(f"완료: 무게 채운 제품 {fw} -> {path}")


if __name__ == "__main__":
    main()
