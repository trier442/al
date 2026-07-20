from __future__ import annotations

import base64
import json
import pathlib
import zlib

ROOT = pathlib.Path.cwd()
DIR = ROOT / "scripts" / "hwajak-payload"
FILES = ["part01.txt", "part02.txt", "part03.txt", "part04.txt", "part05.txt", "part06a.txt", "part06b.txt"]
ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
chunks = [(DIR / name).read_text(encoding="utf-8").strip() for name in FILES]
target = chunks[1]
invalid = [(i, ch) for i, ch in enumerate(target) if ch not in ALPHABET + "="]

if not invalid:
    print("비정상 문자가 없습니다.")
    raise SystemExit(0)

start = invalid[0][0]
end = invalid[-1][0] + 1
prefix = target[:start]
suffix = target[end:]
results = []


def make_decoded(replacement: str) -> bytes:
    repaired = prefix + replacement + suffix
    joined = "".join([chunks[0], repaired, *chunks[2:]])
    return base64.b64decode(joined, validate=True)


for first in ALPHABET:
    for second in ALPHABET:
        replacement = first + second
        try:
            decoded = make_decoded(replacement)
            raw = zlib.decompress(decoded[10:-8], -zlib.MAX_WBITS)
            text = raw.decode("utf-8", errors="replace")
            replacements = text.count("�")
            controls = sum(1 for ch in text if ord(ch) < 32 and ch not in "\n\r\t")
            brace_gap = abs(text.count("{") - text.count("}"))
            bracket_gap = abs(text.count("[") - text.count("]"))
            quote_parity = text.count('"') % 2
            try:
                parsed = json.loads(text)
                json_ok = isinstance(parsed, list) and len(parsed) == 57
            except Exception:
                json_ok = False
            results.append({
                "replacement": replacement,
                "raw": raw,
                "text": text,
                "replacements": replacements,
                "controls": controls,
                "brace_gap": brace_gap,
                "bracket_gap": bracket_gap,
                "quote_parity": quote_parity,
                "json_ok": json_ok,
            })
        except Exception as exc:
            results.append({
                "replacement": replacement,
                "raw": b"",
                "text": "",
                "replacements": 10**9,
                "controls": 10**9,
                "brace_gap": 10**9,
                "bracket_gap": 10**9,
                "quote_parity": 1,
                "json_ok": False,
                "error": f"{type(exc).__name__}: {exc}",
            })

results.sort(key=lambda item: (
    not item["json_ok"],
    item["replacements"],
    item["controls"],
    item["brace_gap"] + item["bracket_gap"],
    item["quote_parity"],
    item["replacement"],
))

print(f"손상 구간: part02[{start}:{end}]={target[start:end]!r}; 후보 조합 {len(results)}개")
print("UTF-8·JSON 구조 품질 상위 후보")
for rank, item in enumerate(results[:40], 1):
    print(
        f"{rank:02d}. replacement={item['replacement']} json={item['json_ok']} "
        f"replacementChars={item['replacements']} controls={item['controls']} "
        f"braceGap={item['brace_gap']} bracketGap={item['bracket_gap']} quoteParity={item['quote_parity']} "
        f"bytes={len(item['raw'])}"
    )

best = results[0]
best_raw = best["raw"]
best_text = best["text"]
print(f"선정 후보: {best['replacement']} replacementChars={best['replacements']} braceGap={best['brace_gap']} bracketGap={best['bracket_gap']}")

# 최초와 최후 손상 문자의 주변을 별도 파일에 저장합니다.
positions = [i for i, ch in enumerate(best_text) if ch == "�"]
if positions:
    char_start = max(0, positions[0] - 3000)
    char_end = min(len(best_text), positions[-1] + 3000)
else:
    char_start, char_end = 0, min(len(best_text), 12000)
slice_text = best_text[char_start:char_end]
lines = [
    f"candidate={best['replacement']}",
    f"replacementChars={best['replacements']}",
    f"char-range={char_start}:{char_end}",
    "",
]
for offset in range(0, len(slice_text), 240):
    lines.append(f"[{char_start + offset:06d}] {slice_text[offset:offset + 240]}")
(ROOT / "scripts" / "hwajak-corrupt-slice.txt").write_text("\n".join(lines), encoding="utf-8")
print(f"손상 원문 조각 저장: scripts/hwajak-corrupt-slice.txt ({char_start}:{char_end})")
