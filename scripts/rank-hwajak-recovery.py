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
results: list[tuple[int, int, str, str]] = []


def make_decoded(replacement: str) -> bytes:
    repaired = prefix + replacement + suffix
    joined = "".join([chunks[0], repaired, *chunks[2:]])
    return base64.b64decode(joined, validate=True)


for first in ALPHABET:
    for second in ALPHABET:
        replacement = first + second
        try:
            decoded = make_decoded(replacement)
        except Exception as exc:
            results.append((-1, -1, replacement, f"base64:{exc}"))
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
        results.append((consumed, output_len, replacement, error))

results.sort(reverse=True)
print(f"손상 구간: part02[{start}:{end}]={target[start:end]!r}; 후보 조합 {len(results)}개")
for rank, (consumed, output_len, replacement, error) in enumerate(results[:30], 1):
    print(f"{rank:02d}. replacement={replacement} consumed={consumed} output={output_len} error={error}")

print("\n상위 후보 JSON 분석")
for rank, (_, _, replacement, _) in enumerate(results[:12], 1):
    try:
        decoded = make_decoded(replacement)
        raw = zlib.decompress(decoded[10:-8], -zlib.MAX_WBITS)
        try:
            text = raw.decode("utf-8")
            try:
                data = json.loads(text)
                print(f"{rank:02d}. replacement={replacement} JSON 성공 articles={len(data) if isinstance(data, list) else 'not-list'} chars={len(text)}")
            except json.JSONDecodeError as exc:
                left = max(0, exc.pos - 160)
                right = min(len(text), exc.pos + 160)
                context = text[left:right].replace("\n", "\\n")
                print(f"{rank:02d}. replacement={replacement} JSON 오류 pos={exc.pos} line={exc.lineno} col={exc.colno} msg={exc.msg}")
                print(f"    context={context!r}")
        except UnicodeDecodeError as exc:
            left = max(0, exc.start - 180)
            right = min(len(raw), exc.end + 180)
            context = raw[left:right].decode("utf-8", errors="replace").replace("\n", "\\n")
            bad = raw[exc.start:exc.end].hex()
            print(f"{rank:02d}. replacement={replacement} UTF-8 오류 start={exc.start} end={exc.end} bytes={bad} reason={exc.reason}")
            print(f"    byte-context={context!r}")
    except Exception as exc:
        print(f"{rank:02d}. replacement={replacement} 분석 실패: {type(exc).__name__}: {exc}")
