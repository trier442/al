from pathlib import Path
import re

p = Path('wordpress-content/2027-suteuk-anonymous-imjinrok.html')
s = p.read_text(encoding='utf-8')

# revision
s = re.sub(r'<!-- revision: \d+ -->', '<!-- revision: 4 -->', s, count=1)

# Header: remove production-process language and old template label.
header = '''<header class="sut-hero"><p class="sut-kicker">2027 수능특강 문학 · 1부 교과서 개념 학습 · 4강 소설의 내용 구성 요소</p><h1>작자 미상 「임진록」 원문·상세 해설 및 변형문제</h1><p>임진왜란을 배경으로 김응서가 평양성에 잠입해 왜장 종일을 제거하는 활약을 그린 대목입니다. 서술자의 주관적 평가, 인물의 성격을 드러내는 서사 정보, 역사적 사실과 설화적 상상력의 결합을 중심으로 살펴봅니다.</p><a class="sut-index-link" href="https://modukorean.co.kr/2027-수능특강-문학-상세-해설-및-변형-문제/">2027 수능특강 문학 전체 목차</a></header>'''
s, n = re.subn(r'<header class="sut-hero">.*?</header>', header, s, count=1, flags=re.S)
assert n == 1, 'header replace failed'

# Add EBS-check nav item exactly once.
if 'href="#lit-ebs-check"' not in s:
    s = s.replace('<a href="#lit-points">출제 포인트</a><a href="#lit-quiz">변형문제</a>', '<a href="#lit-points">출제 포인트</a><a href="#lit-ebs-check">교재 문항</a><a href="#lit-quiz">변형문제</a>')

# Remove editorial/source-process note under the passage heading.
s = re.sub(r'\s*<p class="note">아래 글은 여러 이본 가운데 수능특강에 실린 경판본의 발췌 제시문입니다\.</p>', '', s, count=1)


def replace_section(text, section_id, new_html):
    marker = f'<h2 id="{section_id}">'
    h = text.index(marker)
    a = text.rfind('<section class="box">', 0, h)
    if a < 0:
        raise ValueError(f'section start not found: {section_id}')
    # next box section after current h2
    b = text.find('<section class="box">', h + len(marker))
    if b < 0:
        raise ValueError(f'next section not found: {section_id}')
    return text[:a] + new_html + '\n\n' + text[b:]

core = '''<section class="box"><h2 id="lit-core">작품 개괄적 해설</h2>
  <div class="overview"><b>갈래</b> 역사 소설　 <b>성격</b> 역사적·설화적·영웅적　 <b>주제</b> 왜적의 침입에 대응하는 김응서의 활약</div>
  <p>「임진록」은 임진왜란을 배경으로 조선의 정치 상황과 전쟁의 경과, 일반 민중과 여러 전쟁 영웅의 활약을 보여 주는 역사 소설입니다. 역사적 사실을 바탕으로 하면서도 도술이나 초인적 무용과 같은 설화적 상상력을 더해 흥미를 높이고 왜적에 대한 적개심을 고취합니다. 작품 전체는 한 인물의 일대기로 긴밀하게 이어지기보다 인물이나 사건을 중심으로 한 여러 이야기가 나열되는 특징을 보입니다.</p>
  <p>이 대목의 중심 인물은 김응서입니다. 이원익이 왜장 종일을 상대할 인물을 찾는 과정에서 김응서가 큰 범을 잡아 죽였다는 일화가 제시되어 그의 비범한 무력을 먼저 부각합니다. 김응서는 부친 상중이라 처음에는 출전을 망설이지만, 나라의 형세가 위태롭다는 이원익의 요청을 받아들여 영전에 통곡하고 평복으로 갈아입은 뒤 전장에 나섭니다. 이를 ‘사사로운 정 때문에 전란의 와중에 은거한 무능한 지배층’의 모습으로 해석해서는 안 됩니다.</p>
  <p>평양성에 잠입한 김응서는 조선인 기생에게 종일의 방비와 수면 습관을 듣습니다. 종일은 휘장 귀마다 방울을 달아 작은 움직임도 감지하게 하고, 잠을 잘 때도 시간대에 따라 눈이나 귀를 열어 두는 치밀한 인물입니다. 기생은 종일이 완전히 잠드는 때를 알려 주고 방울을 솜으로 막아 김응서의 거사를 실질적으로 돕습니다.</p>
  <p>종일을 벤 뒤의 탈출 장면에서는 ‘응서의 칼이 있는 곳에 도적의 머리 추풍낙엽 같으니’라는 비유와 과장이 사용됩니다. 이는 단순한 객관적 전투 기록이 아니라 김응서의 탁월한 무력을 예찬하는 서술자의 주관적 평가입니다. 기생의 조력과 희생, 머리가 떨어진 뒤에도 일어서는 종일의 초현실적 모습은 역사적 전쟁 서사에 설화적 상상력을 결합한 특징을 보여 줍니다.</p>
</section>'''
s = replace_section(s, 'lit-core', core)

points = '''<section class="box"><h2 id="lit-points">시험 출제 포인트</h2>
  <div class="point"><b>1. 작품의 갈래와 구성</b><br>임진왜란의 역사적 사실을 바탕으로 설화적 상상력을 더한 역사 소설입니다. 작품 전체는 단일한 영웅의 일대기로 응집되기보다 여러 인물과 사건 중심의 이야기가 나열됩니다.</div>
  <div class="point"><b>2. 수록 대목의 주제</b><br>이 대목의 주제는 ‘왜적의 침입에 대응하는 김응서의 활약’입니다. 작품 전체의 전란 비판과 민족적 정서를 이 대목의 직접 주제와 구별해야 합니다.</div>
  <div class="point"><b>3. 서술자의 주관적 평가</b><br>‘응서의 칼이 있는 곳에 도적의 머리 추풍낙엽 같으니’는 비유와 과장으로 김응서의 탁월한 무력을 예찬합니다. 수능특강 01번의 직접 근거입니다.</div>
  <div class="point"><b>4. 범을 죽인 일화</b><br>김응서가 본격적으로 출전하기 전에 그의 비범한 무력을 간접적으로 제시하여 이후 영웅적 활약을 예고합니다.</div>
  <div class="point"><b>5. 김응서와 ‘사사로운 정’</b><br>김응서는 부친 상중이어서 처음 사양하지만 이원익의 설득을 받아 전장에 나갑니다. 전란을 외면하고 계속 은거한 인물로 볼 수 없습니다. 수능특강 03번 ②가 오답인 핵심 이유입니다.</div>
  <div class="point"><b>6. 종일의 치밀한 방비 ①</b><br>거처 사면의 비단 휘장 귀마다 방울을 달아 조금만 움직여도 소리가 나게 하여 침입을 미리 알아차리도록 했습니다.</div>
  <div class="point"><b>7. 종일의 치밀한 방비 ②</b><br>삼경 전에는 귀로 자며 눈으로 보고, 삼경 후에는 눈으로 자며 귀로 듣다가 사경이 되어야 눈과 귀가 모두 잠듭니다. 수능특강 02번은 이 두 정보를 찾아 쓰게 합니다.</div>
  <div class="point"><b>8. 조선인 기생의 역할</b><br>종일의 방비와 수면 정보를 제공하고 방울을 솜으로 막아 김응서의 잠입을 돕습니다. 신분을 넘어 왜적에 맞서는 민중의 활약과 민족적 연대 의식을 보여 주는 인물입니다.</div>
  <div class="point"><b>9. 도사의 등장</b><br>이원익이 위기에 놓였을 때 도사가 도술로 돕는 장면은 설화적 상상력을 보여 주며 전란의 피해를 겪은 독자에게 정신적 위안을 제공하는 기능과 연결됩니다.</div>
  <div class="point"><b>10. 종일의 초현실적 모습</b><br>목이 떨어진 뒤에도 일어나 칼을 휘두르는 모습은 종일의 비범함을 과장합니다. 강한 적을 홀로 처단하는 김응서의 영웅성도 함께 부각됩니다.</div>
  <div class="point"><b>11. 기생의 죽음</b><br>탈출 과정에서 기생이 왜장에게 살해되는 장면은 왜적의 무자비함과 전란 속 무고한 민중의 희생을 부각합니다.</div>
  <div class="point"><b>12. 03번의 핵심 함정</b><br>작품 전체가 지배층의 무능을 비판하는 측면이 있더라도, 김응서가 상중이라는 이유로 전쟁을 끝까지 외면했다는 식으로 그 근거를 잘못 연결하면 안 됩니다.</div>
</section>'''
s = replace_section(s, 'lit-points', points)

# Insert the lesson's actual three-question logic before transformed quizzes.
if 'id="lit-ebs-check"' not in s:
    quiz_marker = '<section class="box"><h2 id="lit-quiz">'
    qi = s.index(quiz_marker)
    ebs = '''<section class="box"><h2 id="lit-ebs-check">수능특강 4강 핵심 문항 연결</h2>
  <div class="point"><b>01 서술자의 주관적 평가</b><br>해당 구절은 ‘응서의 칼이 … 추풍낙엽 같으니’이며, 평가의 내용은 김응서의 탁월한 무력에 대한 예찬입니다. 비유와 과장이 독자가 영웅에게 성원을 보내도록 유도합니다.</div>
  <div class="point"><b>02 종일의 성격을 확인하는 서사 정보</b><br>종일은 침입을 미리 알 수 있도록 휘장에 방울을 달아 두었고, 잠을 자면서도 시간대에 따라 눈과 귀를 번갈아 열어 둡니다. 이 두 정보가 종일이 신중하고 치밀한 인물임을 보여 줍니다.</div>
  <div class="point"><b>03 &lt;보기&gt; 감상</b><br>정답은 ②입니다. 김응서는 부친 상중이어서 처음 출전을 사양하지만 국세가 위태롭다는 설득을 받아 즉시 전장에 나섭니다. 따라서 그를 ‘사사로운 정 때문에 전란 중 은거하며 국가보다 가문을 우선한 무능한 지배층’으로 해석하는 것은 제시문과 맞지 않습니다. 반면 도사의 도술, 기생의 조력, 종일의 초현실적 반격, 기생의 희생은 &lt;보기&gt;의 설화적 상상력·민족적 연대·영웅적 활약·민중의 희생과 연결할 수 있습니다.</div>
</section>\n\n'''
    s = s[:qi] + ebs + s[qi:]

# Replace transformed quiz 6 with a question that closely follows EBS 03's reasoning.
q6_start = s.index('<section class="quiz"', s.index('<h2 id="lit-quiz">'))
# find question 6 block by locating its h3 and section start
h6 = s.index('<h3>6.', q6_start)
a6 = s.rfind('<section class="quiz"', q6_start, h6)
h7 = s.index('<h3>7.', h6)
b6 = s.rfind('<section class="quiz"', h6, h7)
q6 = '''<section class="quiz" data-answer="2"><h3>6. 다음 &lt;보기&gt;를 참고하여 제시문을 감상한 내용으로 적절하지 않은 것은?<div class="view">&lt;보기&gt; 「임진록」은 역사적 사실과 설화적 상상력을 결합하여 임진왜란의 비극을 형상화한다. 비범한 영웅의 활약과 계층을 초월한 민족적 연대를 보여 주는 한편, 왜적의 무자비함과 무고한 민중의 희생을 부각하며 전란의 상처에 대한 정신적 위안을 도모한다.</div></h3><div class="choices"><button type="button" class="choice" data-choice="1">① 이원익이 패해 위기에 놓였을 때 도사가 나타나 돕는 장면은 설화적 상상력을 통해 전란의 상처를 위로하려는 성격과 연결할 수 있다.</button><button type="button" class="choice" data-choice="2">② 김응서가 부친상이라는 사사로운 정 때문에 전란 내내 은거하는 모습은 국가보다 가문의 법도를 우선하는 지배층의 무능을 보여 준다.</button><button type="button" class="choice" data-choice="3">③ 조선인 기생이 종일의 방비를 알려 주고 방울을 솜으로 막아 주는 모습은 왜적에 맞서는 민중의 활약으로 볼 수 있다.</button><button type="button" class="choice" data-choice="4">④ 목이 떨어진 종일이 다시 일어나 칼을 휘두르는 장면은 초현실적 설정을 통해 강한 적을 처단하는 김응서의 영웅성을 부각한다.</button><button type="button" class="choice" data-choice="5">⑤ 탈출 과정에서 기생이 적군의 칼에 희생되는 장면은 전란 속 무고한 민중의 희생을 환기한다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ②</p><ol><li>① 도사의 도술은 사실적 전투 기록을 넘어선 설화적 상상력의 예입니다.</li><li>② 김응서는 상중이라 처음 사양했지만 이원익의 설득을 받아 영전에 통곡한 뒤 평복으로 갈아입고 즉시 출전합니다. 전란 내내 은거한 인물로 볼 수 없습니다.</li><li>③ 기생은 같은 조선인으로서 정보를 제공하고 직접 방울을 막아 거사를 돕습니다.</li><li>④ 종일의 초현실적 강함은 그를 제압하는 김응서의 영웅적 무력을 더욱 부각합니다.</li><li>⑤ 기생의 죽음은 왜적의 무자비함과 민중의 희생을 드러냅니다.</li></ol></div></section>'''
s = s[:a6] + q6 + '\n' + s[b6:]

# Remove production-process phrases if they remain.
for bad in ['징 소리형 통일 구성', '수능특강 수록 제시문을 기준으로', '교재 근거로 분석했습니다', '새로 작성했습니다']:
    assert bad not in s, f'production phrase remains: {bad}'

# Structural validation.
assert '수능특강 4강 핵심 문항 연결' in s
assert '응서의 칼이 … 추풍낙엽 같으니' in s
assert '정답은 ②입니다' in s
assert '전란 내내 은거' in s
assert (s.count('class="quiz"') == 10), s.count('class="quiz"')
# Any quiz that explicitly asks to use <보기> must contain an actual view box.
for block in re.findall(r'<section class="quiz"[\s\S]*?</section>', s):
    h = re.search(r'<h3>([\s\S]*?)</h3>', block)
    if h and ('&lt;보기&gt;' in h.group(1) or '<보기>' in h.group(1)):
        assert 'class="view"' in block, '보기 누락'

p.write_text(s, encoding='utf-8')
print('audited:', p, 'chars=', len(s), 'quizzes=', s.count('class="quiz"'))
