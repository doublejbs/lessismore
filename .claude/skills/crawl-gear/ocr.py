#!/usr/bin/env python3
# macOS Vision OCR (Korean+English) → JSON lines with text + position.
# Usage: python3 ocr.py <image-path>
# Output: [{"t": text, "x":, "y": (from top, 0..1), "w":, "h":}, ...] sorted top→bottom.
import json
import sys

import Vision
import Quartz
from Foundation import NSURL


def ocr(path):
    url = NSURL.fileURLWithPath_(path)
    src = Quartz.CGImageSourceCreateWithURL(url, None)
    if src is None:
        raise RuntimeError(f"cannot load {path}")
    cg = Quartz.CGImageSourceCreateImageAtIndex(src, 0, None)

    req = Vision.VNRecognizeTextRequest.alloc().init()
    req.setRevision_(3)
    # NOTE: on this macOS, Korean (ko-KR) is only available at the FAST level (0).
    # Accurate (1) supports Latin languages only. Fast is plenty for printed spec tables.
    req.setRecognitionLevel_(0)
    req.setUsesLanguageCorrection_(False)
    req.setRecognitionLanguages_(["ko-KR", "en-US"])

    handler = Vision.VNImageRequestHandler.alloc().initWithCGImage_options_(cg, None)
    ok = handler.performRequests_error_([req], None)

    out = []
    for obs in (req.results() or []):
        cand = obs.topCandidates_(1)
        if not cand:
            continue
        text = cand[0].string()
        bb = obs.boundingBox()  # origin bottom-left, normalized
        x = bb.origin.x
        y_top = 1.0 - (bb.origin.y + bb.size.height)
        out.append({
            "t": text,
            "x": round(float(x), 4),
            "y": round(float(y_top), 4),
            "w": round(float(bb.size.width), 4),
            "h": round(float(bb.size.height), 4),
        })
    out.sort(key=lambda r: (r["y"], r["x"]))
    return out


if __name__ == "__main__":
    print(json.dumps(ocr(sys.argv[1]), ensure_ascii=False))
