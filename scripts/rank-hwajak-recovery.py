from __future__ import annotations

import base64
import json
import pathlib
import re
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


def article_shape(article: object) -> str:
    if not isinstance(article, dict):
        return "not-object"
    slug = str(article.get("slug", ""))
    title = str(article.get("title", ""))
    summary = str(article.get("summary", ""))
    blank_count = len(article.get("blankSpans", [])) if isinstance(article.get("blankSpans"), list) else -1
    flow_count = len(article.get("flow", [])) if isinstance(article.get("flow"), list) else -1
    point_count = len(article.get("points", [])) if isinstance(article.get("points"), list) else -1
    fact_count = len(article.get("facts10", [])) if isinstance(article.get("facts10"), list) else -1
    slug_ok = bool(re.fullmatch(r"2027-suteuk-hwajak-[a-z0-9]+", slug))
    return (
        f"slug={slug!r} slugOK={slug_ok} title={title!r} summaryLen={len(summary)} "
        f"blank={blank_count} flow={flow_count} points={point_count} facts={fact_count} "
        f"summaryStart={summary[:180]!r}"
    )


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
            parsed = None
            try:
                parsed = json.loads(text)
                json_ok = isinstance(parsed, list) and len(parsed) == 57
            except Exception:
                json_ok = False
            expected_crc = int.from_bytes(decoded[-8:-4], "little")
            expected_size = int.from_bytes(decoded[-4:], "little")
            actual_crc = zlib.crc32(raw) & 0xFFFFFFFF
            actual_size = len(raw) & 0xFFFFFFFF
            results.append({
                "replacement": replacement,
                "raw": raw,
                "text": text,
                "parsed": parsed,
                "replacements": replacements,
                "controls": controls,
                "brace_gap": brace_gap,
                "bracket_gap": bracket_gap,
                "quote_parity": quote_parity,
                "json_ok": json_ok,
                "crc_match": expected_crc == actual_crc,
                "size_match": expected_size == actual_size,
                "expected_crc": expected_crc,
                "actual_crc": actual_crc,
                "expected_size": expected_size,
                "actual_size": actual_size,
            })
        except Exception as exc:
            results.append({
                "replacement": replacement,
                "raw": b"",
                "text": "",
                "parsed": None,
                "replacements": 10**9,
                "controls": 10**9,
                "brace_gap": 10**9,
                "bracket_gap": 10**9,
                "quote_parity": 1,
                "json_ok": False,
                "crc_match": False,
                "size_match": False,
                "error": f"{type(exc).__name__}: {exc}",
            })

results.sort(key=lambda item: (
    not (item["crc_match"] and item["size_match"]),
    not item["json_ok"],
    item["replacements"],
    item["controls"],
    item["brace_gap"] + item["bracket_gap"],
    item["quote_parity"],
    item["replacement"],
))

print(f"손상 구간: part02[{start}:{end}]={target[start:end]!r}; 후보 조합 {len(results)}개")
print("CRC·UTF-8·JSON 구조 품질 상위 후보")
for rank, item in enumerate(results[:50], 1):
    print(
        f"{rank:02d}. replacement={item['replacement']} crc={item.get('crc_match')} size={item.get('size_match')} "
        f"json={item['json_ok']} replacementChars={item['replacements']} controls={item['controls']} "
        f"braceGap={item['brace_gap']} bracketGap={item['bracket_gap']} quoteParity={item['quote_parity']} "
        f"actualCRC={item.get('actual_crc', 0):08x} expectedCRC={item.get('expected_crc', 0):08x} "
        f"actualSize={item.get('actual_size', 0)} expectedSize={item.get('expected_size', 0)}"
    )

perfect = [item for item in results if item.get("json_ok") and item.get("replacements") == 0]
print(f"완전 UTF-8 JSON 후보: {len(perfect)}개 = {', '.join(item['replacement'] for item in perfect)}")

if perfect:
    diff_lines = [f"candidates={','.join(item['replacement'] for item in perfect)}", ""]
    differing_indexes = []
    for index in range(57):
        variants = {
            json.dumps(item["parsed"][index], ensure_ascii=False, sort_keys=True, separators=(",", ":"))
            for item in perfect
        }
        if len(variants) > 1:
            differing_indexes.append(index)
            diff_lines.append(f"===== article index {index} =====")
            for item in perfect:
                article = item["parsed"][index]
                diff_lines.append(f"[{item['replacement']}] {article_shape(article)}")
            diff_lines.append("")
    diff_lines.insert(1, f"differingIndexes={differing_indexes}")
    (ROOT / "scripts" / "hwajak-candidate-diff.txt").write_text("\n".join(diff_lines), encoding="utf-8")
    print(f"게시글별 후보 차이표 저장: scripts/hwajak-candidate-diff.txt, indexes={differing_indexes}")

    baseline = perfect[0]["text"]
    differing = []
    for index in range(len(baseline)):
        chars = {item["text"][index] for item in perfect if index < len(item["text"])}
        if len(chars) > 1:
            differing.append(index)
    if differing:
        diff_start = max(0, min(differing) - 350)
        diff_end = min(len(baseline), max(differing) + 351)
    else:
        diff_start, diff_end = 0, min(len(baseline), 1200)
    lines = [
        f"candidates={','.join(item['replacement'] for item in perfect)}",
        f"diff-char-range={diff_start}:{diff_end}",
        "",
    ]
    for item in perfect:
        lines.append(f"===== candidate {item['replacement']} crc={item['crc_match']} size={item['size_match']} =====")
        segment = item["text"][diff_start:diff_end]
        for offset in range(0, len(segment), 220):
            lines.append(f"[{diff_start + offset:06d}] {segment[offset:offset + 220]}")
    (ROOT / "scripts" / "hwajak-corrupt-slice.txt").write_text("\n".join(lines), encoding="utf-8")
    print(f"완전 후보 차이 문맥 저장: scripts/hwajak-corrupt-slice.txt ({diff_start}:{diff_end})")
