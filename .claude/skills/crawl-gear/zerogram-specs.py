#!/usr/bin/env python3
# Fill weight + specs on a zerogram crawl JSON by OCR-reading the "PRODUCT INFO" table.
# Unlike most Korean brands, zerogram's detail images are clean, high-contrast infographics
# with a consistent two-column "PRODUCT INFO" 라벨/값 table as the LAST or near-last image
# (URL ends in _size.jpg / _SIZE.jpg). No tiling needed (images are ~1000x2500-4000px,
# well within Vision's single-pass range) — this is much friendlier than the Kovea case.
#
# Usage: python3 zerogram-specs.py <crawl-json> [out-json]
import json
import os
import re
import sys
import urllib.request

import Vision
import Quartz

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
CACHE = "/tmp/zerogram-orig"
os.makedirs(CACHE, exist_ok=True)

_ocr_cache = {}  # image URL -> despaced full text (avoid re-OCRing shared images across variants)


def fetch_image(url):
    key = re.sub(r"[^A-Za-z0-9_.]", "_", url.split("/")[-1])
    path = os.path.join(CACHE, key)
    if os.path.exists(path) and os.path.getsize(path) > 500:
        return path
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    open(path, "wb").write(data)
    return path


def ocr_tokens(path):
    src = Quartz.CGImageSourceCreateWithURL(
        __import__("Foundation").NSURL.fileURLWithPath_(path), None
    )
    if src is None:
        return []
    cg = Quartz.CGImageSourceCreateImageAtIndex(src, 0, None)
    req = Vision.VNRecognizeTextRequest.alloc().init()
    req.setRevision_(3)
    req.setRecognitionLevel_(0)  # fast — only level with Korean on this macOS
    req.setUsesLanguageCorrection_(False)
    req.setRecognitionLanguages_(["ko-KR", "en-US"])
    handler = Vision.VNImageRequestHandler.alloc().initWithCGImage_options_(cg, None)
    handler.performRequests_error_([req], None)
    out = []
    for obs in (req.results() or []):
        cand = obs.topCandidates_(1)
        if not cand:
            continue
        bb = obs.boundingBox()
        out.append({"t": cand[0].string(), "x": bb.origin.x, "y": 1.0 - (bb.origin.y + bb.size.height)})
    out.sort(key=lambda r: (round(r["y"], 2), r["x"]))
    return out


def spec_image_candidates(images):
    """_size.jpg 패턴을 우선 시도하고, 실패하면 뒤에서부터 순서대로 재시도할 후보 목록.
    2023년 이전 구형 템플릿은 _size.jpg가 없고 "Product info" 표가 끝에서 2~3번째 이미지에
    있는 경우가 있어(예: ..._05.jpg, 마지막 _06.jpg는 로고뿐) 한 장만 보고 포기하지 않는다."""
    sized = [u for u in images if re.search(r"_size\.jpg$", u, re.I)]
    rest = [u for u in reversed(images) if u not in sized]
    return (sized + rest)[:5]


def get_product_info_text(url):
    """Despaced text of the image, sliced from the PRODUCT INFO marker onward (cached by URL)."""
    if url in _ocr_cache:
        return _ocr_cache[url]
    try:
        path = fetch_image(url)
        tokens = ocr_tokens(path)
    except Exception as e:
        print(f"   OCR fail {url}: {e}")
        _ocr_cache[url] = ""
        return ""
    full = re.sub(r"\s+", "", "".join(t["t"] for t in tokens))
    # 구형 템플릿은 "Product info"(대소문자 혼용)로 적혀있어 대소문자 구분 없이 찾는다.
    idx = full.upper().find("PRODUCTINFO")
    text = full[idx:] if idx != -1 else full
    _ocr_cache[url] = text
    return text


def grams(num, unit):
    # OCR/사이트 표기가 "1.206g"처럼 마침표를 천단위 구분자로 쓰는 경우가 있다(쉼표 오인식).
    # g 단위인데 소수점 뒤가 정확히 3자리면 그램 수가 1 미만일 리 없으니 천단위로 해석한다.
    if unit.lower().startswith("g") and re.fullmatch(r"\d{1,2}\.\d{3}", num):
        return int(num.replace(".", ""))
    v = float(num)
    return int(round(v * 1000)) if unit.lower().startswith("k") else int(round(v))


SIZE_LETTER = {"small": "S", "medium": "M", "large": "L", "x-large": "XL"}


def size_code_of(item):
    s = (item.get("size") or "").strip().lower()
    if s in SIZE_LETTER:
        return SIZE_LETTER[s]
    if s and len(s) <= 2:
        return s.upper()
    return None


# 카테고리별 무게 라벨 우선순위 (label 뒤 텍스트에서 첫 숫자+단위를 무게로 채택).
WEIGHT_LABELS = {
    "tent": ["풀패킹무게", "패킹무게", "미니멈무게", "무게"],
    "tarp": ["풀패킹무게", "패킹무게", "미니멈무게", "무게"],
    "shelter": ["풀패킹무게", "패킹무게", "미니멈무게", "무게"],
    "sleeping_bag": ["패킹무게", "침낭무게", "무게"],
    "mat": ["패드무게", "무게"],
    "backpack": ["배낭무게(전체옵션포함)", "배낭무게", "기본배낭무게", "무게"],
    "vest_pack": ["배낭무게(전체옵션포함)", "배낭무게", "기본배낭무게", "무게"],
    "chair": ["패킹무게", "무게"],
    "trekking_pole": ["본체무게", "무게"],
    "pouch": ["배낭무게(전체옵션포함)", "배낭무게", "무게"],
    "backpack_cover": ["배낭무게(전체옵션포함)", "배낭무게", "무게"],
    "vest_pack": ["배낭무게(전체옵션포함)", "배낭무게", "기본배낭무게", "무게"],
}
DEFAULT_WEIGHT_LABELS = ["무게", "본체무게", "패킹무게", "배낭무게"]


def _weight_match(window, size_code):
    """window에서 무게 숫자+단위를 찾되, "±5g 오차" 같은 오차범위 표기는 제외한다.
    "1,989g"처럼 천단위 콤마가 들어간 표기도 허용(콤마 없으면 콤마 뒤 "989g"만 걸려
    "1,"이 잘려나가는 버그가 있었다)."""
    if size_code:
        for m in re.finditer(re.escape(size_code) + r"([\d,]+(?:\.\d+)?)(kg|g)", window, re.I):
            if window[max(0, m.start() - 1):m.start()] != "±":
                return m.group(1).replace(",", ""), m.group(2)
    for m in re.finditer(r"([\d,]+(?:\.\d+)?)(kg|g)", window, re.I):
        if window[max(0, m.start() - 1):m.start()] == "±":
            continue
        return m.group(1).replace(",", ""), m.group(2)
    return None


def find_weight(text, category, size_code, spans=None):
    spans = spans if spans is not None else label_spans(text)
    for label in WEIGHT_LABELS.get(category, DEFAULT_WEIGHT_LABELS):
        for idx, (s, e, lbl) in enumerate(spans):
            if lbl != label:
                continue
            forward = text[e: spans[idx + 1][0]] if idx + 1 < len(spans) else text[e:e + 60]
            backward = text[spans[idx - 1][1]: s] if idx > 0 else ""
            m = _weight_match(forward, size_code) or _weight_match(backward, size_code)
            if m:
                return grams(m[0], m[1])
    return 0


# 전체 라벨 목록 — 텍스트를 이 라벨들의 위치로 토큰화해 라벨↔값 경계를 잡는다.
ALL_LABELS = ["품명", "품번", "색상", "이너사이즈", "패킹사이즈", "사이즈", "소재", "재질", "코팅",
              "용량", "구성품", "제조국명", "제조국", "제조사", "추천용도", "추천 용도",
              "사용인원", "도어개수", "도어수", "플라이소재", "내수압", "폴소재", "미니멈무게", "풀패킹무게",
              "R-value", "두께", "패드무게", "침낭크기", "압축시크기", "충전재무게",
              "충전재", "침낭무게", "패킹무게", "수납가방", "Extreme", "LowerLimit", "Comfort",
              "배낭무게(전체옵션포함)", "배낭무게", "기본배낭무게", "본체무게", "팁프로텍터", "바스켓",
              "사용길이", "폴딩길이", "내하중테스트", "밝기", "방수방진사양", "점등시간", "충전시간",
              "렌즈", "계절", "신축성", "비침", "무게"]


def label_spans(text):
    """텍스트에서 알려진 라벨들의 위치를 (start,end,label)로 찾아 왼쪽→오른쪽 순 정렬.
    긴 라벨부터 매치해 짧은 라벨이 부분 매치로 자리를 뺏지 않게 한다."""
    spans = []
    claimed = bytearray(len(text))
    for lbl in sorted(set(ALL_LABELS), key=len, reverse=True):
        start = 0
        while True:
            i = text.find(lbl, start)
            if i == -1:
                break
            if not any(claimed[i:i + len(lbl)]):
                spans.append((i, i + len(lbl), lbl))
                for k in range(i, i + len(lbl)):
                    claimed[k] = 1
            start = i + 1
    spans.sort(key=lambda s: s[0])
    return spans


def _looks_numeric_only(s):
    return bool(re.fullmatch(r"[\d.,]+\s*(mm|cm|kg|g|ml|l|°?c|인|개)?", s.strip(), re.I))


def value_for(text, spans, label, numeric=False):
    """라벨의 값을 찾는다. 보통 라벨 뒤(forward)에 값이 오지만, 일부 행은 아이콘/그래픽 때문에
    값이 라벨 앞(backward, 이전 라벨 바로 뒤)에 온다 — forward가 비어있거나(또는 numeric 값을
    기대하는데 문자만 있거나, 반대로 문자를 기대하는데 숫자만 있으면) backward로 폴백한다."""
    for idx, (s, e, lbl) in enumerate(spans):
        if lbl != label:
            continue
        forward = text[e: spans[idx + 1][0]] if idx + 1 < len(spans) else text[e:e + 60]
        backward = text[spans[idx - 1][1]: s] if idx > 0 else ""
        fwd_ok = bool(forward.strip()) and (not numeric or re.search(r"\d", forward))
        if not numeric and fwd_ok and _looks_numeric_only(forward):
            fwd_ok = False  # 문자 값을 기대하는데 forward가 숫자+단위뿐이면 다른 필드의 값일 가능성
        if fwd_ok:
            return forward.strip()
        return backward.strip()
    return ""


def between(text, start_label, spans=None):
    spans = spans or label_spans(text)
    return value_for(text, spans, start_label, numeric=False)


def num_after(text, label, size_code=None, unit_re=r"[a-zA-Z%]*", spans=None):
    spans = spans or label_spans(text)
    window = value_for(text, spans, label, numeric=True)
    if not window:
        return None
    if size_code:
        m = re.search(re.escape(size_code) + r"(-?[\d,]+(?:\.\d+)?)" + unit_re, window)
        if m:
            return m.group(1).replace(",", "")
    m = re.search(r"(-?[\d,]+(?:\.\d+)?)" + unit_re, window)
    return m.group(1).replace(",", "") if m else None


def extract_specs(category, text, name_korean, size_code=None):
    s = {}
    spans = label_spans(text)

    def field(label):
        return between(text, label, spans).strip()

    if category in ("tent", "tarp", "shelter"):
        cap = num_after(text, "사용인원", unit_re="")
        if cap:
            s["capacity"] = int(cap)
        fly = field("플라이소재")
        if fly:
            s["flyMaterial"] = fly
        pole = field("폴소재")
        if pole:
            s["poleMaterial"] = pole
        wp = num_after(text, "내수압")
        if wp:
            s["waterproofRating"] = int(float(wp))

    elif category == "sleeping_bag":
        fill = field("충전재")
        if re.search(r"다운|구스|덕|down|goose|duck", fill, re.I):
            s["fillMaterial"] = "down"
        elif re.search(r"합성|폴리|synthetic|primaloft", fill, re.I):
            s["fillMaterial"] = "synthetic"
        fp = re.search(r"(\d{3,4})FP", fill, re.I)
        if fp:
            s["fillPower"] = int(fp.group(1))
        idx_fw = text.find("충전재무게")
        if idx_fw != -1:
            fwv = num_after(text, "충전재무게")
            if fwv:
                s["fillWeight"] = float(fwv)
        comfort = num_after(text, "Comfort")
        if comfort is None:
            m = re.search(r"Comfort(영상|영하)(\d+)도", text)
            if m:
                s["comfortTemp"] = int(m.group(2)) * (-1 if m.group(1) == "영하" else 1)
        limit_m = re.search(r"LowerLimit(영상|영하)(\d+)도", text)
        if limit_m:
            s["limitTemp"] = int(limit_m.group(2)) * (-1 if limit_m.group(1) == "영하" else 1)

    elif category == "mat":
        mat = field("소재")
        if mat:
            s["material"] = mat
        rv = num_after(text, "R-value")
        if rv:
            s["rValue"] = float(rv)
        thick = num_after(text, "두께", unit_re="cm")
        if thick:
            s["thickness"] = round(float(thick) * 10, 1)
        opensz = field("사이즈")
        if opensz:
            s["openSize"] = opensz

    elif category in ("backpack", "vest_pack"):
        vol = num_after(text, "용량")
        if vol:
            s["volume"] = float(vol)
        mat = field("소재")
        if mat:
            s["material"] = mat
        if "허리벨트" in text:
            s["hasHipBelt"] = True

    elif category == "chair":
        mat = field("소재")
        if mat:
            s["material"] = mat
            if re.search(r"알루미늄|aluminum", mat, re.I):
                s["frameMaterial"] = "aluminum"
        load = num_after(text, "내하중테스트")
        if load:
            s["maxLoad"] = int(float(load))
        packed = field("패킹사이즈")
        if packed:
            s["packedSize"] = packed

    elif category in ("cup", "bowl", "cookware_etc"):
        mat = field("소재")
        if mat:
            s["material"] = mat
        cap = num_after(text, "용량", size_code=size_code, spans=spans)
        if cap:
            s["capacity"] = int(float(cap))

    elif category == "cutlery":
        mat = field("재질")
        if mat:
            s["material"] = mat
        if "세트" in name_korean:
            s["isSet"] = True

    elif category == "bottle":
        mat = field("소재")
        if mat:
            s["material"] = mat
        capm = re.search(r"(\d+(?:[.,]\d+)?)\s*ml", name_korean, re.I)
        if capm:
            s["capacity"] = int(float(capm.group(1).replace(",", "")))

    elif category == "clothing":
        mat = field("소재")
        if mat:
            s["material"] = mat[:150]
        if re.search(r"방수|waterproof|고어텍스|gore-?tex", text, re.I):
            s["isWaterproof"] = True
        fill = field("충전재")
        if re.search(r"다운|구스|덕|down", fill, re.I):
            s["fillMaterial"] = "down"
        elif re.search(r"합성|폴리|synthetic", fill, re.I):
            s["fillMaterial"] = "synthetic"
        if "후드" in name_korean:
            s["hasHood"] = True
        if re.search(r"자켓|재킷|점퍼|판초|아노락", name_korean):
            s["type"] = "jacket"
        elif re.search(r"팬츠|바지|쇼츠|하프팬츠|스커트", name_korean):
            s["type"] = "pants"
        elif re.search(r"티셔츠|셔츠|풀오버|탑\b", name_korean):
            s["type"] = "top"
        elif re.search(r"베스트", name_korean):
            s["type"] = "vest"

    elif category == "sunglasses":
        uv = field("렌즈")
        if uv:
            s["uvProtection"] = uv
        if re.search(r"편광|polarized", text, re.I):
            s["isPolarized"] = True

    elif category == "lighting":
        m = re.search(r"밝기[강약/]*(\d+)루멘", text)
        if m:
            s["maxBrightness"] = int(m.group(1))
        rt = re.search(r"점등시간[강약/]*(\d+(?:\.\d+)?)시간", text)
        if rt:
            s["maxRuntime"] = float(rt.group(1))
        wp = field("방수방진사양")
        if wp:
            s["waterproofRating"] = wp

    elif category == "trekking_pole":
        mat = field("재질")
        if mat:
            s["material"] = mat
        used = num_after(text, "사용길이", spans=spans)
        m = re.search(r"(\d+)[~-](\d+)", field("사용길이"))
        if m:
            s["minLength"] = int(m.group(1))
            s["maxLength"] = int(m.group(2))
        elif used:
            s["maxLength"] = float(used)

    else:  # tent_acc, pouch, backpack_cover, etc, 그 외 GENERIC/POUCH_LIKE 계열
        mat = field("소재") or field("재질")
        if mat:
            s["material"] = mat[:150]
        if category in ("pouch", "backpack_cover"):
            vol = num_after(text, "용량", spans=spans)
            if vol:
                s["capacity"] = float(vol)
            if re.search(r"방수|waterproof", text, re.I):
                s["isWaterproof"] = True
        else:
            sz = field("사이즈")
            if sz:
                s["size"] = sz[:100]

    return s


def process(item):
    images = item.get("_specImages") or []
    if not images:
        return False
    category = item.get("category", "etc")
    size_code = size_code_of(item)
    # 선택 필드(weight 등)도 한 이미지에서 못 찾았다고 바로 포기하지 않고 후보 이미지를
    # 순서대로 재시도한다 (SKILL.md "선택 필드도 여러 번 시도" 규칙) — 2023년 이전 구형
    # 템플릿은 _size.jpg가 없고 진짜 스펙표가 끝에서 2~3번째 이미지에 있는 경우가 있다.
    for url in spec_image_candidates(images):
        text = get_product_info_text(url)
        if len(text) < 20:
            continue
        weight = find_weight(text, category, size_code)
        # zerogram은 초경량 백패킹 브랜드라 12kg을 넘는 값은 대개 OCR이 "1.8kg"의 소수점을
        # 놓쳐 "18kg"으로 읽은 오독이다 — 잘못된 큰 값을 심는 대신 0(미확인)으로 둔다.
        if weight and weight > 12000:
            print(f"   suspicious weight {weight}g for {item.get('groupId')} — discarding")
            weight = 0
        specs = extract_specs(category, text, item.get("nameKorean", ""), size_code=size_code)
        if weight or specs:
            if weight:
                item["weight"] = weight
            if specs:
                item["specs"] = {**item.get("specs", {}), **specs}
            return True
    return False


def main():
    path = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else path.replace(".json", "-spec.json")
    data = json.load(open(path))
    ok = 0
    for i, item in enumerate(data, 1):
        try:
            if process(item):
                ok += 1
        except Exception as e:
            print(f"   error {item.get('groupId')}: {e}")
        if i % 10 == 0 or i == len(data):
            print(f"[zerogram-specs] {i}/{len(data)} (filled: {ok})")
    json.dump(data, open(out, "w"), ensure_ascii=False, indent=2)
    print(f"\n저장: {out}  (filled {ok}/{len(data)})")


if __name__ == "__main__":
    main()
