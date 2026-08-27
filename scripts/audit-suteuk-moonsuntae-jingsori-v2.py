from pathlib import Path
import re

p = Path('wordpress-content/2027-suteuk-moonsuntae-jingsori.html')
s = p.read_text(encoding='utf-8')

s = s.replace('<!-- revision: 5 -->', '<!-- revision: 6 -->')

# Header: remove production/editorial wording and align with EBS lesson name.
header_re = re.compile(r'<header class="sut-hero">.*?</header>', re.S)
new_header = '''<header class="sut-hero"><p class="sut-kicker">2027 수능특강 문학 · 1부 교과서 개념 학습 · 3강 소설의 서술상 특징</p><h1>문순태 「징 소리」 원문·상세 해설 및 변형문제</h1><p>수몰된 방울재를 떠나야 했던 칠복과 방울재 사람들의 삶을 통해 산업화 과정에서 무너진 농촌 공동체와 실향민의 한을 그린 작품입니다. ‘징’의 상징성, 칠복의 환각, [A]와 [B]의 초점화자 변화를 중심으로 살펴봅니다.</p><a class="sut-index-link" href="https://modukorean.co.kr/2027-수능특강-문학-상세-해설-및-변형-문제/">2027 수능특강 문학 전체 목차</a></header>'''
s, n = header_re.subn(new_header, s, count=1)
assert n == 1, 'header replace failed'

# Add EBS-core nav item.
s = s.replace('<a href="#lit-points">출제 포인트</a><a href="#lit-quiz">변형문제</a>', '<a href="#lit-points">출제 포인트</a><a href="#lit-ebs-check">교재 문항</a><a href="#lit-quiz">변형문제</a>')

# Remove production/source-process note under the excerpt heading.
s = s.replace('    <p class="note">아래 글은 교재에 실린 발췌 제시문입니다. 작품 전체가 아니라 교재의 중략 표기를 포함한 수록 부분입니다.</p>\n', '')

# Replace core explanation with source-grounded wording.
core_pat = re.compile(r'  <section class="box"><h2 id="lit-core">[\s\S]*?(?=\n\s*<section class="box"><h2 id="lit-flow">)')
core = '''  <section class="box"><h2 id="lit-core">작품 개괄적 해설</h2>
    <div class="overview"><b>갈래</b> 현대 소설·단편 소설　 <b>성격</b> 사실적·비판적　 <b>주제</b> 산업화로 인한 농촌 공동체의 붕괴와 실향민의 한</div>
    <p>이 작품은 1970년대 수몰 지구를 배경으로 산업화 과정에서 소외된 농촌 현실과 실향민이 겪는 아픔을 사실적으로 그려 냅니다. 칠복은 댐 개발로 재산과 고향을 잃고 도시 빈민으로 전락한 인물이며, 모든 것을 상실한 뒤 다시 방울재 사람들 곁으로 돌아옵니다.</p>
    <p>칠복에게 ‘징’은 단순한 악기가 아닙니다. 그는 징을 딸아이만큼 애지중지하고, 징에서 할미산이 무너지는 듯한 소리와 방울재 사람들이 흐느끼는 듯한 소리를 듣습니다. 징은 수몰된 고향과 공동체의 기억, 칠복의 한과 그리움을 불러내는 매개이며, 작품 전체에서는 비인간화되어 가는 현대 사회에 대한 비판과 공동체적 삶의 회복에 대한 염원을 상징적으로 보여 줍니다.</p>
    <p>칠복의 ‘환각’에서는 현재의 호수와 거대한 댐이 사라지고 옛 방울재와 마을 사람들이 다시 보입니다. 이는 현재의 방울재를 있는 그대로 지각하는 장면이 아니라, 사라진 고향과 사람들에 대한 칠복의 강한 그리움이 투영된 장면입니다. 이때 칠복은 정월 대보름 매귀굿 때처럼 춤추고 싶어 징을 찾아 듭니다.</p>
    <p>한편 방울재 사람들은 칠복을 불쌍히 여기면서도, 칠복이 계속 징을 울려 낚시꾼들의 불만을 사자 결국 그를 내쫓습니다. 봉구는 칠복의 딸에게 잠바를 덮어 주고 돈을 건네며 동정을 드러내지만 추방 자체를 막지는 못합니다. 작품의 마지막에서는 봉구가 ‘바람 소린지, 징 소린지’ 분간하기 어려운 소리를 들으며 잠들지 못하는데, 이 대목은 칠복을 내쫓은 데 대한 봉구의 미안함과 죄책감을 부각합니다.</p>
  </section>
'''
s, n = core_pat.subn(core, s, count=1)
assert n == 1, 'core replace failed'

# Tighten a few overextended points to the EBS-supported range.
s = s.replace('<div class="point"><b>1. 댐 개발의 양면성</b><br>사회적으로는 근대화와 산업 발전의 시설이지만 칠복과 방울재 사람들에게는 고향·재산·관계망을 파괴한 폭력입니다. 작품은 개발 자체의 기술적 성과보다 희생된 삶을 비판적으로 조명합니다.<span class="trap">오답 함정: 댐이 주민 모두에게 경제적 성공과 공동체 회복을 가져왔다고 보는 진술</span></div>', '<div class="point"><b>1. 산업화와 수몰</b><br>댐 개발로 방울재가 수몰되면서 칠복은 재산과 고향을 잃고 도시 빈민으로 전락합니다. 작품은 산업화 과정에서 소외된 농촌 현실과 실향민의 아픔을 중심에 놓습니다.</div>')
s = s.replace('<div class="point"><b>5. 칠복의 환각</b><br>댐과 호수가 사라지고 옛 마을 사람들이 보이는 환각은 파괴된 현실을 부정하고 공동체를 회복하고 싶은 무의식적 소망의 형상화입니다. 개발 현실을 긍정적으로 수용했다는 증거가 아닙니다.</div>', '<div class="point"><b>5. 칠복의 환각</b><br>호수와 댐이 보이지 않고 옛 방울재와 사람들이 보이는 환각에는 방울재 사람들과의 유대와 고향에 대한 칠복의 그리움이 투영되어 있습니다. 환각은 현재의 방울재 모습을 있는 그대로 지각한 장면이 아닙니다.</div>')
s = s.replace('<div class="point"><b>6. 현실 복귀 장면</b><br>환각에서 깨어나면 호수는 칠복을 삼킬 듯하고 댐은 더 높아 보입니다. 회복된 고향과 폭력적인 개발 현실의 대비가 상실감을 극대화합니다.</div>', '<div class="point"><b>6. 환각에서 현실로</b><br>정신을 차리면 옛 방울재와 낯익은 사람들은 사라지고 호수와 댐만 남습니다. 환각 속 고향과 수몰된 현재의 모습이 대비되며 칠복의 상실감을 부각합니다.</div>')

# Replace quiz 8 (outside-context 'development narrative') with an EBS-style hallucination item.
q8_pat = re.compile(r'<section class="quiz" data-answer="2"><h3>8\.[\s\S]*?</section>')
q8 = '''<section class="quiz" data-answer="4"><h3>8. 칠복의 ‘환각’에 대한 설명으로 적절하지 않은 것은?</h3><div class="choices"><button type="button" class="choice" data-choice="1">① 환각 속에서는 수몰된 방울재의 옛 모습과 사람들이 다시 선명하게 보인다.</button><button type="button" class="choice" data-choice="2">② 방울재 사람들과의 유대와 고향에 대한 칠복의 그리움이 투영되어 있다.</button><button type="button" class="choice" data-choice="3">③ 환각 상태에서 칠복은 매귀굿을 하던 때처럼 춤추고 싶어 징을 찾아 들게 된다.</button><button type="button" class="choice" data-choice="4">④ 방울재 사람들이 칠복을 쫓아내기 위해 그의 환각을 직접적인 구실로 삼고 있다.</button><button type="button" class="choice" data-choice="5">⑤ 현재에는 호수와 댐이 존재하지만 환각 속에서는 그것들이 보이지 않아 현재 상태와 다른 방울재가 지각된다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ④</p><ol><li>① 옛 방울재와 사람들은 환각 속에서 선명하게 나타납니다.</li><li>② 환각에는 고향과 공동체에 대한 칠복의 그리움이 반영되어 있습니다.</li><li>③ 환각이 나타날 때 칠복은 매귀굿 때처럼 춤추고 싶어 징을 듭니다.</li><li>④ 방울재 사람들이 칠복을 내쫓는 직접적인 이유는 징을 울려 낚시꾼들의 불만을 사고 생계에 지장을 주기 때문이지, 환각 자체가 아닙니다.</li><li>⑤ 정신을 차리면 호수와 댐이 다시 보이므로 환각은 현재의 모습과 다르게 지각한 상태입니다.</li></ol></div></section>'''
s, n = q8_pat.subn(q8, s, count=1)
assert n == 1, 'quiz 8 replace failed'

# Insert EBS question-connection section before quiz block.
quiz_marker = '  <section class="box"><h2 id="lit-quiz">선택형 변형문제 10제</h2>'
assert quiz_marker in s, 'quiz marker missing'
ebs = '''  <section class="box">
    <h2 id="lit-ebs-check">수능특강 3강 핵심 문항 연결</h2>
    <div class="point"><b>01 내용 확인</b><br>(1) 칠복이 벌어 온 돈을 써 버린 것은 아내를 찾아다니기 위해서이지 잃어버린 징을 되찾기 위해서가 아닙니다. (2) 강촌 영감 혼자 다른 사람들의 반대를 무릅쓰고 내쫓은 것도 아닙니다. (3) 봉구는 칠복의 딸에게 잠바를 덮어 주고 칠복에게 돈을 주며 동정을 드러냅니다. 따라서 판단은 <b>× · × · ○</b>입니다.</div>
    <div class="point"><b>02 ‘환각’ 판단</b><br>환각은 칠복이 징을 들고 춤추게 되는 이유가 되고, 고향으로 돌아온 뒤 겪는 현상이며, 고향 사람들과의 유대와 그리움이 투영되어 있습니다. 현재에는 호수와 댐이 있지만 환각 속에서는 옛 방울재가 보이므로 현재 상태와 다르게 지각합니다. 다만 방울재 사람들이 칠복을 내쫓는 직접적인 구실은 환각이 아니라 징을 울려 낚시꾼들의 불만을 사는 행동입니다. 정답은 <b>④</b>입니다.</div>
    <div class="point"><b>03 초점화자</b><br>[A]의 초점화자는 <b>칠복</b>이며 독자는 칠복의 <b>고향에 대한 그리움</b>에 주목하게 됩니다. [B]의 초점화자는 <b>봉구</b>이며 독자는 칠복을 내쫓은 데 대한 봉구의 <b>죄책감·미안함</b>에 주목하게 됩니다. 서술자는 이야기 밖에 그대로 있고, 사건을 바라보는 중심 인물인 초점화자가 바뀌는 것입니다.</div>
  </section>

'''
s = s.replace(quiz_marker, ebs + quiz_marker, 1)

# Remove production-process phrases if they linger.
for bad in ['징 소리형 통일 구성', '교재 근거에 따라 분석했습니다', '수능특강 수록 제시문을 바탕으로']:
    s = s.replace(bad, '')

# Validation.
assert '<!-- revision: 6 -->' in s
assert '수능특강 3강 핵심 문항 연결' in s
assert '× · × · ○' in s
assert '정답은 <b>④</b>' in s
assert '[A]의 초점화자는 <b>칠복</b>' in s
assert '[B]의 초점화자는 <b>봉구</b>' in s
assert s.count('class="quiz"') == 10, s.count('class="quiz"')
assert '개발 서사는' not in s
assert '징 소리형 통일 구성' not in s
assert '아래 글은 교재에 실린 발췌 제시문입니다' not in s

# Validate <보기> reference completeness in every quiz.
blocks = re.findall(r'<section class="quiz"[\s\S]*?</section>', s)
for b in blocks:
    h = re.search(r'<h3>([\s\S]*?)</h3>', b)
    htxt = h.group(1) if h else ''
    if ('&lt;보기&gt;' in htxt or '<보기>' in htxt) and 'class="view"' not in b:
        raise SystemExit('보기 누락 문항 발견: ' + re.sub('<[^>]+>', '', htxt)[:80])

p.write_text(s, encoding='utf-8')
print('audited:', p, 'chars=', len(s), 'quizzes=', s.count('class="quiz"'))
