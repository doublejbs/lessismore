#!/usr/bin/env python3
# 병합된 니모 JSON 을 카드 그리드 HTML 로 미리보기.
# 사용: python3 nemo-preview.py <json> <out-html>
import json
import sys

data = json.load(open(sys.argv[1]))
out = sys.argv[2]

cards = []
for it in data:
    specs = it.get("specs") or {}
    spec_rows = "".join(
        f"<div class='s'><b>{k}</b> {v}</div>" for k, v in specs.items() if v not in ("", None)
    ) or "<div class='no'>NO SPECS</div>"
    w = it.get("weight") or 0
    wtxt = f"{w} g" if w else "<span class='no'>무게 없음</span>"
    img = it.get("imageUrl", "")
    cards.append(f"""
    <div class='card'>
      <img src="{img}" loading="lazy" referrerpolicy="no-referrer"/>
      <div class='cat'>{it.get('category','')}</div>
      <div class='nm'>{it.get('nameKorean','') or it.get('name','')}</div>
      <div class='en'>{it.get('name','')}</div>
      <div class='sz'>{it.get('size','') or it.get('sizeKorean','')}</div>
      <div class='cl'>{it.get('colorKorean','') or it.get('color','')}</div>
      <div class='wt'>{wtxt}</div>
      <div class='specs'>{spec_rows}</div>
    </div>""")

html = f"""<!doctype html><html lang=ko><meta charset=utf-8>
<title>nemo 미리보기 ({len(data)})</title>
<style>
 body{{font-family:-apple-system,sans-serif;background:#111;color:#eee;margin:0;padding:20px}}
 h1{{font-size:16px}}
 .grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}}
 .card{{background:#1c1c1e;border-radius:10px;padding:12px;font-size:12px}}
 .card img{{width:100%;height:160px;object-fit:contain;background:#fff;border-radius:6px}}
 .cat{{color:#0a84ff;font-weight:600;margin-top:8px;text-transform:uppercase;font-size:10px}}
 .nm{{font-weight:600;margin-top:2px}}
 .en{{color:#777;font-size:10px}}
 .sz{{color:#0a84ff;font-size:11px}}
 .cl{{color:#aaa}}
 .wt{{margin:6px 0;font-weight:700;color:#30d158}}
 .s{{color:#ccc;margin:1px 0}}
 .s b{{color:#888;font-weight:500}}
 .no{{color:#ff6b6b}}
</style>
<h1>nemo — {len(data)}개 (무게 있는 항목 {sum(1 for i in data if i.get('weight'))}개)</h1>
<div class=grid>{''.join(cards)}</div>
</html>"""

open(out, "w").write(html)
print(f"preview -> {out}")
