#!/usr/bin/env python3
# Fill colorKorean from the image spec's "색상" row for products whose name has no colour.
# Single colour (e.g. "Sand", "Light Blue") → translated to Korean. Multiple options
# (e.g. "Moss, Black") are left blank — that listing isn't a single colour variant.
# Usage: python3 kovea-imgcolor.py <json> [out]
import json
import re
import sys
import importlib.util

_fw = importlib.util.spec_from_file_location("fw", __file__.replace("kovea-imgcolor.py", "kovea-fixweight.py"))
fw = importlib.util.module_from_spec(_fw)
_fw.loader.exec_module(fw)

EN_KO = [
    ("light gray", "라이트그레이"), ("light grey", "라이트그레이"), ("dark gray", "다크그레이"),
    ("light blue", "라이트블루"), ("sky blue", "스카이블루"), ("dark navy", "다크네이비"),
    ("moss green", "모스그린"), ("khaki green", "카키그린"), ("dark brown", "다크브라운"),
    ("black", "블랙"), ("white", "화이트"), ("ivory", "아이보리"), ("gray", "그레이"), ("grey", "그레이"),
    ("navy", "네이비"), ("khaki", "카키"), ("sand", "샌드"), ("tan", "탄"), ("brown", "브라운"),
    ("moss", "모스그린"), ("olive", "올리브"), ("forest", "포레스트"), ("green", "그린"),
    ("blue", "블루"), ("red", "레드"), ("orange", "오렌지"), ("yellow", "옐로우"), ("pink", "핑크"),
    ("purple", "퍼플"), ("beige", "베이지"), ("charcoal", "차콜"), ("coyote", "코요테"),
    ("mustard", "머스타드"), ("burgundy", "버건디"), ("wine", "와인"), ("gold", "골드"),
    ("silver", "실버"), ("mint", "민트"), ("coral", "코랄"), ("cream", "크림"), ("vanilla", "바닐라"),
    ("flint", "플린트"),
]
KO_COLORS = ["다크그레이", "라이트그레이", "그레이", "차콜", "블랙", "화이트", "아이보리", "카키그린",
             "카키", "네이비", "세이지", "올리브", "포레스트", "모스그린", "그린", "스카이블루", "블루",
             "레드", "오렌지", "옐로우", "브라운", "코요테", "샌드", "탄", "바닐라", "베이지", "핑크",
             "퍼플", "버건디", "와인", "골드", "실버", "민트", "코랄", "플린트"]


def to_korean(val):
    v = val.strip().lower()
    for en, ko in EN_KO:
        if v == en:
            return ko
    for ko in KO_COLORS:
        if val.strip() == ko:
            return ko
    return ""


def color_from_image(item):
    for url in item["_specImages"]:
        try:
            im = fw.load_image(url)
        except Exception:
            continue
        cells = fw.cells_of(im)
        for i, (cy, cx, txt) in enumerate(cells):
            # inline "색상 : Sand" or label cell "색상"
            m = re.match(r"^\s*색\s*상\s*[:：]\s*(.+)$", txt)
            val = None
            if m:
                val = m.group(1)
            elif re.match(r"^\s*색\s*상\s*[:：]?\s*$", txt):
                # value cells strictly to the RIGHT of the 색상 label (exclude the label itself)
                same = sorted([(c[1], c[2]) for c in cells
                               if abs(c[0] - cy) <= 22 and c[1] > cx + 0.02
                               and not re.match(r"^\s*색\s*상", c[2])])
                if same:
                    val = same[0][1]
            if val:
                val = val.strip()
                if re.search(r"[,/·、&]| 및 |참조|상세", val):  # multiple options / non-colour
                    return ""
                return to_korean(val)
    return ""


def main():
    path = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else path
    data = json.load(open(path))
    targets = [x for x in data if not x.get("colorKorean") and x.get("_specImages")]
    filled = 0
    for i, item in enumerate(targets, 1):
        try:
            c = color_from_image(item)
            if c:
                item["colorKorean"] = c
                filled += 1
        except Exception as e:
            print(f"  err {item.get('groupId')}: {e}")
        if i % 25 == 0 or i == len(targets):
            print(f"[imgcolor] {i}/{len(targets)} (filled {filled})")
    json.dump(data, open(out, "w"), ensure_ascii=False, indent=2)
    print(f"\n저장: {out}  (이미지 색상 채움 {filled})")


if __name__ == "__main__":
    main()
