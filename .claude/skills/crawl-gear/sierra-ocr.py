#!/usr/bin/env python3
# 시에라디자인 KR 기어 무게/스펙 OCR — 무게가 상세 이미지(Tech Specs/구성품 표)에만 있어
# macOS Vision OCR 로 추출. 텐트/침낭 등 기어는 "총 중량 : Ng" 형태로 무게가 풍부하다.
# 대상: KR 소스 + 기어 카테고리 + weight==0.
# 사용: python3 sierra-ocr.py out/sierra-designs-FINAL.json
import io
import json
import re
import subprocess
import sys

from PIL import Image

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
GEAR = {"backpack", "pouch", "gaiter", "gloves", "trekking_pole", "tent", "tent_acc", "sleeping_bag"}
MATERIAL_RE = re.compile(
    r"(코듀라|CORDURA|나일론|폴리에스[테터]르?|폴리에스터|폴리아미드|립스탑|다운|구스|덕다운|"
    r"폴라텍|POLARTEC|플리스|메쉬|스판|메리노|고어텍스|GORE|알파\s*다이렉트|다이니마|"
    r"X-PAC|엑스팩|나일론|nylon|polyester|립스톱)", re.I)


def cb(url):
    try:
        return subprocess.run(["curl", "-sS", "-m", "25", "-A", UA, url], capture_output=True, timeout=30).stdout
    except Exception:
        return b""


def ocr_lines(product_no):
    t = cb(f"https://sierra-designs.co.kr/product/detail.html?product_no={product_no}").decode("utf-8", "replace")
    urls = list(dict.fromkeys(re.findall(
        r'https://sierradesigns\.openhost[^"\' ]+(?:detail|product)[^"\' ]+\.(?:jpg|jpeg|png)', t)))
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
            im.crop((0, top, W, min(top + 1500, H))).save("/tmp/_sdt.jpg")
            try:
                items = json.loads(subprocess.run(["python3", "ocr.py", "/tmp/_sdt.jpg"],
                                                  capture_output=True, timeout=60).stdout.decode("utf-8", "replace"))
            except Exception:
                continue
            items.sort(key=lambda it: (round(it["y"], 2), it["x"]))
            cy, cur = None, []
            for it in items:
                if cy is None or abs(it["y"] - cy) < 0.012:
                    cur.append(it["t"])
                    cy = it["y"] if cy is None else cy
                else:
                    lines.append(" ".join(cur))
                    cur, cy = [it["t"]], it["y"]
            if cur:
                lines.append(" ".join(cur))
    return lines


def parse(lines, cat, name):
    text = "\n".join(lines)
    weight = 0
    # 무게 우선순위(스킬 룰: 패킹무게 우선): 패킹 무게 → 총 중량 → 최소 무게 → 일반 무게/중량.
    # 최소 무게(트레일)는 패킹무게가 없을 때만 폴백.
    for pat in [r"패킹\s*무게\s*[:：(]?\s*(?:약\s*)?([\d,.]+)\s*(kg|g)",
                r"총\s*중량\s*[:：(]?\s*(?:약\s*)?([\d,.]+)\s*(kg|g)",
                r"최소\s*무게\s*[:：(]?\s*(?:약\s*)?([\d,.]+)\s*(kg|g)",
                r"(?:제품\s*)?(?:무게|중량)\s*[:：(]?\s*(?:약\s*)?([\d,.]+)\s*(kg|g)"]:
        m = re.search(pat, text)
        if m:
            v = float(m.group(1).replace(",", ""))
            g = round(v * 1000) if m.group(2).lower() == "kg" else round(v)
            # OCR 소수점 유실(예: 1.81kg → "181kg") 방어: 개인장비 30kg 초과면 무시하고 다음 패턴
            if m.group(2).lower() == "kg" and v > 30:
                continue
            weight = g
            break
    # 폴백: 무게/중량 컬럼이 값과 분리돼 "- 3.2kg" 처럼 라벨 없이 잡힐 때.
    # 무게/중량 토큰이 본문에 있고 합리적 범위의 kg/g 단일값이 있으면 채택.
    if not weight and re.search(r"무게|중량", text):
        m = re.search(r"(?:^|[\s\-:：])\s*(\d{1,2}(?:\.\d)?)\s*kg\b", text)
        if m and 0.1 <= float(m.group(1)) <= 20:
            weight = round(float(m.group(1)) * 1000)
        else:
            m = re.search(r"(?:무게|중량)[\s\S]{0,40}?(\d{2,5})\s*g\b", text)
            if m and 30 <= int(m.group(1)) <= 20000:
                weight = int(m.group(1))
    specs = {}
    # 소재
    material = ""
    for ln in lines:
        if MATERIAL_RE.search(ln) and len(ln) < 45 and not re.search(r"습니다|가능|증대|보호|강화|착용감|무게감|오차|처리된|소재로", ln):
            material = re.sub(r"\s+", " ", ln).strip(" :·-")
            break
    mw = re.search(r"내수압\s*[:：(]?\s*([\d,]+)\s*mm", text)
    wp = int(mw.group(1).replace(",", "")) if mw else ""
    mv = re.search(r"용량\s*[:：(]?\s*([\d]+)\s*L", text)
    vol = int(mv.group(1)) if mv else ""
    mc = re.search(r"(\d+)\s*인용?", name) or re.search(r"수용\s*인원\s*[:：]?\s*(\d+)", text)
    cap = int(mc.group(1)) if mc else ""

    if cat in ("tent", "tent_acc"):
        if cap:
            specs["capacity"] = cap
        if wp:
            specs["waterproofRating"] = wp
        if material:
            specs["flyMaterial"] = material
    elif cat == "sleeping_bag":
        if re.search(r"다운|구스|덕다운", text):
            specs["fillMaterial"] = "down"
        elif re.search(r"신세틱|화학|합성", text):
            specs["fillMaterial"] = "synthetic"
        mt = re.search(r"(?:최저|한계|comfort|컴포트)[^\d\-]{0,6}(-?\d+)\s*(?:도|℃|C)", text, re.I)
        if mt:
            specs["limitTemp"] = int(mt.group(1))
    elif cat == "backpack":
        if vol:
            specs["volume"] = vol
        if material:
            specs["material"] = material
    else:
        if material:
            specs["material"] = material
        if wp:
            specs["isWaterproof"] = True
    return weight, specs


def main():
    path = sys.argv[1]
    rows = json.load(open(path))
    # 무게가 존재하는 카테고리만 재시도(파우치/장갑/게이터/트레킹폴은 KR 사이트에 무게 미표기 확인됨)
    weighted = {"tent", "tent_acc", "sleeping_bag", "backpack"}
    by_no = {}
    for r in rows:
        if r["category"] in weighted and "sierra-designs.co.kr" in r["_source"] and not r["weight"]:
            no = re.search(r"product_no=(\d+)", r["_source"]).group(1)
            by_no.setdefault(no, []).append(r)
    print(f"KR 기어(무게 필요) product_no: {len(by_no)}")
    fw = fs = 0
    for i, (no, rs) in enumerate(by_no.items(), 1):
        lines = ocr_lines(no)
        w, sp = parse(lines, rs[0]["category"], rs[0]["nameKorean"])
        for r in rs:
            if w:
                r["weight"] = w
            if sp:
                r["specs"] = {**r.get("specs", {}), **sp}
        fw += bool(w)
        fs += bool(sp)
        if i % 5 == 0 or i == len(by_no):
            print(f"  {i}/{len(by_no)} (무게 {fw}, 스펙 {fs})", flush=True)
    json.dump(rows, open(path, "w"), ensure_ascii=False, indent=2)
    print(f"완료: 무게 {fw}, 스펙 {fs} 제품 -> {path}")


if __name__ == "__main__":
    main()
