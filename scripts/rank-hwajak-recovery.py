from __future__ import annotations

import base64
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
results: list[tuple[int, int, str, str]] = []

for first in ALPHABET:
    for second in ALPHABET:
        repaired = prefix + first + second + suffix
        joined = "".join([chunks[0], repaired, *chunks[2:]])
        try:
            decoded = base64.b64decode(joined, validate=True)
        except Exception as exc:
            results.append((-1, -1, first + second, f"base64:{exc}"))
            continue

        inflater = zlib.decompressobj(16 + zlib.MAX_WBITS)
        output_len = 0
        consumed = 0
        error = ""
        step = 64
        for offset in range(0, len(decoded), step):
            block = decoded[offset : offset + step]
            try:
                output_len += len(inflater.decompress(block))
                consumed = offset + len(block)
            except zlib.error as exc:
                consumed = offset
                error = str(exc)
                break
        else:
            try:
                output_len += len(inflater.flush())
                error = "success"
            except zlib.error as exc:
                error = str(exc)
        results.append((consumed, output_len, first + second, error))

results.sort(reverse=True)
print(f"손상 구간: part02[{start}:{end}]={target[start:end]!r}; 후보 조합 {len(results)}개")
for rank, (consumed, output_len, replacement, error) in enumerate(results[:30], 1):
    print(f"{rank:02d}. replacement={replacement} consumed={consumed} output={output_len} error={error}")
