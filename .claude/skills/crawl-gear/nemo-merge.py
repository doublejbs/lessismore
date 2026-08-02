#!/usr/bin/env python3
# 비전으로 추출한 스펙(nemo-extracted.json)을 crawl JSON 에 병합.
# 사용: python3 nemo-merge.py <crawl-json> <extracted-json> <out-json>
import json
import sys

crawl = json.load(open(sys.argv[1]))
extracted = json.load(open(sys.argv[2]))
out_path = sys.argv[3]

n = 0
for item in crawl:
    e = extracted.get(item["groupId"])
    if not e:
        continue
    n += 1
    if "weight" in e:
        item["weight"] = e["weight"]
    if "specs" in e:
        item["specs"] = e["specs"]
    if e.get("colorKorean"):
        item["colorKorean"] = e["colorKorean"]
    if e.get("color"):
        item["color"] = e["color"]
    if e.get("nameKorean"):
        item["nameKorean"] = e["nameKorean"]

json.dump(crawl, open(out_path, "w"), ensure_ascii=False, indent=2)
print(f"merged {n}/{len(crawl)} items -> {out_path}")
