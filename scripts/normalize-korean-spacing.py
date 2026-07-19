#!/usr/bin/env python3
"""Normalize Korean spacing for text extracted from a line-wrapped PDF.

Input and output are UTF-8 JSON arrays on stdin/stdout. Install kiwipiepy
outside the repository before running this helper.
"""

import json
import sys

from kiwipiepy import Kiwi


def main() -> None:
    values = json.load(sys.stdin)
    if not isinstance(values, list) or not all(isinstance(value, str) for value in values):
        raise TypeError("입력은 문자열 JSON 배열이어야 합니다.")

    kiwi = Kiwi()
    # PDF 줄 끝은 단어 중간일 수도, 어절 경계일 수도 있다. 추출 단계에서
    # 줄바꿈만 제거한 뒤 기존의 정상 공백은 보존하고 누락된 공백만 복원한다.
    normalized = [kiwi.space(value) for value in values]
    json.dump(normalized, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
