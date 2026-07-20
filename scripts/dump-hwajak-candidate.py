from __future__ import annotations

import base64
import json
import pathlib
import zlib

ROOT = pathlib.Path.cwd()
DIR = ROOT / "scripts" / "hwajak-payload"
FILES = ["part01.txt", "part02.txt", "part03.txt", "part04.txt", "part05.txt", "part06a.txt", "part06b.txt"]
REPLACEMENT = "cG"
AFFECTED = [13, 14, 15, 18, 21]

chunks = [(DIR / name).read_text(encoding="utf-8").strip() for name in FILES]
target = chunks[1]
invalid = [(index, char) for index, char in enumerate(target) if char not in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="]
if not invalid:
    raise SystemExit("비정상 문자가 없어 후보 추출이 필요하지 않습니다.")
start = invalid[0][0]
end = invalid[-1][0] + 1
chunks[1] = target[:start] + REPLACEMENT + target[end:]
decoded = base64.b64decode("".join(chunks), validate=True)
raw = zlib.decompress(decoded[10:-8], -zlib.MAX_WBITS)
data = json.loads(raw.decode("utf-8"))
if not isinstance(data, list) or len(data) != 57:
    raise SystemExit(f"57개 JSON이 아닙니다: {type(data).__name__}, {len(data) if isinstance(data, list) else '-'}")
selected = {str(index): data[index] for index in AFFECTED}
path = ROOT / "scripts" / "hwajak-cg-affected.json"
path.write_text(json.dumps(selected, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"저장 완료: {path}, 후보={REPLACEMENT}, 인덱스={AFFECTED}")
