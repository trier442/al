from pathlib import Path
import re

path = Path('wordpress-content/2027-suteuk-kim-minjeong-gilsambongjeon.html')
s = path.read_text(encoding='utf-8')

# Metadata / header
s = re.sub(r'<!-- revision: \d+ -->', '<!-- revision: 4 -->', s, count=1)
s = s.replace(
    '2027 수능특강 문학 · 교과서 개념 극 · 수필 · 징 소리형 통일 구성',
    '2027 수능특강 문학 · 1부 교과서 개념 학습 · 5강 극의 특성과 극 문학의 구성 요소'
)
s = s.replace(
    '기축옥사를 배경으로 한 수능특강 수록 장면을 바탕으로 정철·이산해·선조의 권력 관계, 최영경의 비판, 지시문과 대사의 기능, ‘헛것’과 마지막 웃음의 의미를 분석했습니다.',
    '기축옥사를 배경으로 실체가 모호한 ‘길삼봉’을 둘러싸고 벌어지는 정쟁과 권력의 작동 방식을 그린 희곡입니다. 정철·이산해·선조의 권력 관계, 지시문과 대사의 기능, ‘헛것’과 선조의 태도 변화를 중심으로 살펴봅니다.'
)
s = s.replace(
    '<a href="#lit-points">출제 포인트</a><a href="#lit-quiz">변형문제</a>',
    '<a href="#lit-points">출제 포인트</a><a href="#lit-ebs-check">교재 문항</a><a href="#lit-quiz">변형문제</a>'
)
s = s.replace('<p class="note">아래 글은 교재에 실린 앞부분 줄거리와 발췌 장면입니다.</p>', '')

# Avoid overclaiming: the source says Gilsambong's identity/existence is unclear, not that power literally invented him.
s = s.replace('권력이 만들어 낸 ‘보이지 않는 적’이라는 핵심 기능입니다.', '실체가 불분명한 존재가 정치적 숙청과 공포 정치의 명분으로 이용된다는 점이 핵심입니다.')
s = s.replace('실체 없는 길삼봉을 핑계로', '실체가 불분명한 길삼봉을 핑계로')
s = s.replace('실체 없는 적과 붕당 경쟁을 이용해', '실체가 불분명한 길삼봉과 붕당 경쟁을 이용해')
s = s.replace('실체 없는 길삼봉을 내세워', '실체가 불분명한 길삼봉을 내세워')

# Insert direct connection to the EBS 5th-lesson questions.
if 'id="lit-ebs-check"' not in s:
    marker = '  <section class="box"><h2 id="lit-quiz">선택형 변형문제 10제</h2>'
    ebs = '''  <section class="box"><h2 id="lit-ebs-check">수능특강 5강 핵심 문항 연결</h2>
    <div class="point"><b>01 ⓐ ‘옥사’·ⓑ ‘서찰’의 관계 — 정답 ④</b><br>이산해가 서찰을 제시하자 정철은 파직되고 위리안치되지만, 선조는 길삼봉 수사를 중단하지 않습니다. 오히려 이산해를 새 위관으로 삼고 “어서 길삼봉을 잡아들여라!”라고 명합니다. 따라서 선조가 ⓑ를 본 뒤 ⓐ를 멈추었다는 진술이 적절하지 않습니다.</div>
    <div class="point"><b>02 ㉠~㉤ 지시문 — 정답 ④</b><br>㉣ ‘(정색하며)’는 최영경이 민생을 외면하고 당쟁에 몰두하는 위정자들을 진지하고 단호하게 비판하는 태도를 드러냅니다. 최영경이 자신의 허물을 감추기 위해 권위를 내세우는 심리와는 관계가 없습니다. ㉠은 취중 공초라는 정철의 허물을 시각화하고, ㉡은 최영경의 담대함과 조롱, ㉢은 정철의 반어적 비웃음, ㉤은 정철과 이산해의 갈등 고조를 드러냅니다.</div>
    <div class="point"><b>03 같은 표현과 지시문의 의미</b><br><b>[A] ‘헛것’</b> — 정철에게는 실천이 따르지 않는 뜻을 가리키지만, 최영경에게는 실체가 불분명한 길삼봉을 구실로 선비들을 희생시키는 정치적 모략을 비판하는 말로 쓰입니다.<br><b>[B] ‘갑자기 웃음을 거두며’</b> — 선조가 이산해에게 잠시 웃음을 보인 뒤 곧바로 길삼봉 체포를 재촉하는 태도 변화입니다. 이산해가 놀라는 모습 및 마지막의 ‘여유롭게 웃는다’와 이어져, 붕당 간 갈등을 이용해 신하들을 통제하고 왕권을 강화한 선조의 정치적 위치를 부각합니다.</div>
    <div class="point"><b>작품 전체에서 놓치면 안 되는 핵심</b><br>정철이 물러나고 이산해가 위관이 되어도 공포 정치의 구조는 끝나지 않습니다. 길삼봉의 실체는 끝까지 모호한데도 수사와 고문은 계속됩니다. 작품은 어느 한 붕당만을 단순히 악으로 규정하기보다, 권력 다툼 속에서 민생이 뒷전으로 밀리고 정치적 폭력이 반복되는 상황을 비판적으로 보여 줍니다.</div>
  </section>\n\n'''
    if marker not in s:
        raise SystemExit('quiz marker not found')
    s = s.replace(marker, ebs + marker, 1)

# Basic integrity checks
for bad in ['징 소리형 통일 구성', '아래 글은 교재에 실린 앞부분 줄거리와 발췌 장면입니다.', '권력이 만들어 낸 ‘보이지 않는 적’']:
    if bad in s:
        raise SystemExit(f'forbidden phrase remains: {bad}')
for required in [
    '수능특강 5강 핵심 문항 연결',
    '01 ⓐ ‘옥사’·ⓑ ‘서찰’의 관계 — 정답 ④',
    '02 ㉠~㉤ 지시문 — 정답 ④',
    '[A] ‘헛것’',
    '[B] ‘갑자기 웃음을 거두며’',
    '실체가 불분명한 길삼봉'
]:
    if required not in s:
        raise SystemExit(f'required phrase missing: {required}')

if len(re.findall(r'class="quiz"', s)) != 10:
    raise SystemExit('quiz count mismatch')
blocks = re.findall(r'<section class="quiz"[\s\S]*?</section>', s)
for i, b in enumerate(blocks, 1):
    h = (re.search(r'<h3>([\s\S]*?)</h3>', b) or [None, ''])[1]
    if ('&lt;보기&gt;' in h or '<보기>' in h) and 'class="view"' not in b:
        raise SystemExit(f'view box missing in quiz {i}')

path.write_text(s, encoding='utf-8')
print('audited:', path, 'chars=', len(s), 'quizzes=', len(blocks))
