#!/usr/bin/env python3
"""Extract page-specific noun phrases from normalized Korean summaries."""

from collections import Counter
import json
import re
import sys

from kiwipiepy import Kiwi


NOUN_TAGS = {"NNG", "NNP", "SL", "SN", "SH", "XPN", "XR", "XSN"}
START_TAGS = {"NNG", "NNP", "SL", "SN", "SH", "XR"}
GENERIC = {
    "글", "내용", "설명", "문제", "원인", "관계", "방법", "견해", "입장", "이론",
    "특징", "과정", "연구", "대상", "중심", "경우", "결과", "의의", "필요성", "본성",
}
BAD_FRAGMENTS = {
    "적", "성", "화", "속", "안", "때", "이러", "제시", "이용", "관련", "현대",
    "사회", "가능", "필요", "한계", "극복", "정의", "비판", "관점", "주장", "발견",
    "구조", "방식", "영향", "활용", "의미", "요인", "분야", "응용", "개념",
}
FIXED = [
    "월턴", "후설", "마리탱", "요하네스 메스너", "역선택", "세런디피티", "베타-락탐",
    "펩티도글리칸", "그람 양성균", "그람 음성균", "세포벽", "업로딩", "계산 기능주의",
    "리프로그래밍", "부분적 리프로그래밍", "야마나카 인자", "유도 만능 줄기세포",
    "보스트룀", "하디-바인베르크 평형 법칙", "아비투스", "히스톤 아세틸화",
    "DNA 메틸화", "무모순성", "초소수성", "표피 효과",
    "불완전 명제 이론", "불완전 명제", "개밥바라기", "지시체", "형평사",
    "가처분 소득", "한계 소비 성향", "항상 소득 이론", "생애 주기 이론",
    "가상 메모리", "주기억 장치", "보조 기억 장치", "페이징", "페이지 교체",
    "정단 분열 조직", "슈트 정단 분열 조직", "뿌리 정단 분열 조직",
    "세균학자", "푸른곰팡이", "포도상구균", "영양액", "줄기세포", "최적 조절법",
    "조세 법률주의", "조세 열거주의", "조세 포괄주의", "조건설", "합법칙적 조건설",
    "초전도체", "초유체", "좁은 의미의 법적 의제", "넓은 의미의 법적 의제",
    "전용된 독서 공간", "Ⅱ형 폐포 세포", "양자점", "코어", "양중 능력",
    "플레밍", "플로리", "몰리나", "상관주의", "사실론성의 원리", "이기론", "성리학",
    "안정 모멘트", "양중 모멘트", "평형추", "크레인 받침목",
]
PAGE_FIXED = {
    "SQ3R과 CSQ3R": ["훑어보기", "질문하기", "읽기", "확인하기", "재검토하기", "시각 바꾸기"],
}


def add_phrase(items, text, start, end, token_count, base_score, support, title):
    phrase = text[start:end].strip(" ,.;:!?‘’“”\"'()[]")
    if len(phrase) < 2 or len(phrase) > 28:
        return
    if token_count == 1 and (phrase in GENERIC or phrase in BAD_FRAGMENTS):
        return
    if re.match(r"^(적|성|화|속|경우|때)\s", phrase) or re.search(r"\s(적|성|화)$", phrase):
        return
    if phrase.endswith("의") or re.search(r"[,.!?;:]", phrase):
        return
    score = base_score + min(len(phrase), 22)
    if phrase in support:
        score += 95
    if phrase in title:
        score += 110
    if re.search(r"[A-Z0-9]", phrase):
        score += 30
    items.append((phrase, score))


def page_keywords(kiwi, page):
    title = page["title"]
    texts = page["summaries"]
    support = page["support"]
    all_text = " ".join(texts)
    frequency = Counter()
    scored = []

    for text in texts:
        tokens = kiwi.tokenize(text)
        for index, token in enumerate(tokens):
            if token.tag not in START_TAGS:
                continue
            end_index = index
            noun_count = 0
            while end_index < len(tokens) and noun_count < 4:
                current = tokens[end_index]
                if current.tag not in NOUN_TAGS:
                    break
                if end_index > index:
                    previous = tokens[end_index - 1]
                    gap = text[previous.start + previous.len:current.start]
                    if not re.fullmatch(r"[\s·-]*", gap):
                        break
                noun_count += 1
                start = token.start
                end = current.start + current.len
                phrase = text[start:end].strip()
                frequency[phrase] += 1
                add_phrase(scored, text, start, end, noun_count, noun_count * 28, support, title)
                end_index += 1

    for seed in page.get("seeds", []):
        if seed in all_text and seed not in GENERIC and len(seed) <= 28:
            scored.append((seed, 340))
    for fixed in FIXED:
        if fixed in all_text:
            scored.append((fixed, 380))
    for fixed in PAGE_FIXED.get(title, []):
        if fixed in all_text:
            scored.append((fixed, 420))
    for match in re.finditer(r"[‘“\"]([^’”\"]{2,28})[’”\"]", all_text):
        scored.append((match.group(1), 360))

    best = {}
    for phrase, score in scored:
        score += min(45, frequency[phrase] * 15)
        if phrase not in best or score > best[phrase]:
            best[phrase] = score
    ranked = sorted(best.items(), key=lambda item: (-item[1], -len(item[0]), item[0]))
    output = []
    compact_seen = set()
    for phrase, _ in ranked:
        compact = re.sub(r"\s+", "", phrase).lower()
        if compact in compact_seen:
            continue
        if any(phrase != chosen and phrase in chosen and len(phrase) <= 2 for chosen in output):
            continue
        compact_seen.add(compact)
        output.append(phrase)
        if len(output) >= 40:
            break
    return output


def main():
    pages = json.load(sys.stdin)
    kiwi = Kiwi()
    for word in FIXED:
        try:
            kiwi.add_user_word(word)
        except ValueError:
            pass
    json.dump([page_keywords(kiwi, page) for page in pages], sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
