from pathlib import Path
import re

p = Path('wordpress-content/2027-suteuk-yi-gyubo-farmer.html')
s = p.read_text(encoding='utf-8')

s = s.replace('<!-- revision: 1 -->', '<!-- revision: 2 -->')

# Header: remove production/editorial language and align lesson label.
header_re = re.compile(r'<header class="sut-hero">.*?</header>', re.S)
new_header = '''<header class="sut-hero"><p class="sut-kicker">2027 수능특강 문학 · 1부 교과서 개념 학습 · 2강 시의 내용</p><h1>이규보 「농부를 대신하여 읊다」 원문·상세 해설 및 변형문제</h1><p>수탈당하는 농부를 화자로 세워 왕손 공자의 멸시와 아전의 성급한 조세 징수에 항변하는 한시입니다. 시적 청자, 대조되는 시어, 설의적 종결, 화자의 정체를 중심으로 살펴봅니다.</p><a class="sut-index-link" href="https://modukorean.co.kr/2027-수능특강-문학-상세-해설-및-변형-문제/">2027 수능특강 문학 전체 목차</a></header>'''
s, n = header_re.subn(new_header, s, count=1)
assert n == 1, 'header replace failed'
s = s.replace('<a href="#lit-points">출제 포인트</a><a href="#lit-quiz">변형문제</a>', '<a href="#lit-points">출제 포인트</a><a href="#lit-ebs-check">교재 문항</a><a href="#lit-quiz">변형문제</a>')


def replace_between(text, start_marker, end_marker, replacement):
    a = text.index(start_marker)
    b = text.index(end_marker, a)
    return text[:a] + replacement + text[b:]

core = '''  <section class="box">
    <h2 id="lit-core">작품 개괄적 해설</h2>
    <div class="overview"><b>갈래</b> 한시　 <b>성격</b> 현실 비판적·직설적　 <b>주제</b> 귀족 계층에 대한 농부의 원망</div>
    <p>이 작품은 농민을 수탈하여 부귀영화를 누리는 지배층에 대한 반감을 비교적 직설적으로 드러냅니다. 이규보는 고려 무신 집권기에 관직에 진출한 사대부였지만, 작품에서는 자신이 아니라 수탈당하는 농부를 화자로 설정합니다. 제목의 ‘농부를 대신하여’와 작품 속 ‘우리 농부’, ‘우리들이거늘’을 통해 이러한 화자 설정을 확인할 수 있습니다.</p>
    <p>1연에서 화자는 비를 맞으며 논바닥에 엎드려 김을 매느라 ‘흙투성이 험한 꼴’이 된 농부의 모습을 제시합니다. 그러나 곧 ‘왕손 공자들아’라고 시적 청자를 직접 부르고 ‘더 이상 얕보지 마오’라고 항변합니다. 왕손 공자가 누리는 ‘부귀 호사’가 농부의 노동과 생산에서 나온다는 점을 근거로, 농부를 낮추어 보는 태도의 부당함을 드러내는 것입니다.</p>
    <p>2연에서는 아직 ‘햇곡식’이 푸르게 논밭에서 자라고 있는데도 아전들이 벌써 조세를 거두려고 성화를 부리는 상황이 제시됩니다. 농부들은 힘써 경작하여 나라를 부유하게 하는 주체인데, 오히려 관리에게 침탈당하고 있습니다. 마지막 ‘어찌 이리도 극성스레 침탈하는가’는 실제 답을 요구하는 질문이 아니라 현재 상황에 대한 불만을 강조하는 설의적 표현입니다.</p>
    <p>따라서 작품의 핵심은 농부의 가난 자체가 아니라, 농부의 노동에 기대어 살아가는 지배층이 농부를 멸시하고 수탈하는 현실에 대한 항변입니다. 1연에서는 왕손 공자의 멸시를, 2연에서는 때가 되기 전부터 조세를 거두는 관리의 수탈을 문제 삼으며 비판의 대상을 구체화합니다.</p>
  </section>

'''
s = replace_between(s, '  <section class="box">\n    <h2 id="lit-core">', '  <section class="box">\n    <h2 id="lit-flow">', core)

flow = '''  <section class="box">
    <h2 id="lit-flow">1연·2연 시상 전개</h2>
    <div class="flow">
      <div><b>1연</b><br>비를 맞으며 김매는 농부의 고된 모습 → 자신들을 얕보는 왕손 공자에게 직접 항변 → 지배층의 부귀가 농부의 생산에서 나옴을 지적합니다.</div>
      <div><b>2연</b><br>햇곡식이 아직 자라는 상황 → 아전의 성급한 조세 징수 → 나라를 부유하게 하는 농부가 오히려 침탈당하는 현실에 설의적으로 항변합니다.</div>
    </div>
  </section>

'''
s = replace_between(s, '  <section class="box">\n    <h2 id="lit-flow">', '  <section class="box">\n    <h2 id="lit-analysis">', flow)

analysis = '''  <section class="box">
    <h2 id="lit-analysis">표현상 특징</h2>
    <div class="feature"><b>1. 명시적 시적 청자</b><br>‘왕손 공자들아’라고 비판 대상을 직접 부릅니다. 수능특강 01번의 ㉠ ‘시적 청자를 명시하여 그에게 말을 건네는 어조’에 (다)가 해당하는 직접적인 근거입니다.</div>
    <div class="feature"><b>2. 직접적인 항변의 어조</b><br>‘더 이상 얕보지 마오’는 농부를 멸시하는 왕손 공자에게 그 태도를 멈추라고 요구하는 표현입니다. 농부의 불만과 항변이 우회적으로 숨겨지지 않고 직접 드러납니다.</div>
    <div class="feature"><b>3. 대립적인 시어의 관계</b><br>‘흙투성이 험한 꼴’과 ‘부귀 호사’는 현실 세계에서도 상반된 의미를 지니며, 작품 안에서는 하층민인 농부와 지배층의 삶을 각각 표상하면서 대립 관계를 형성합니다.</div>
    <div class="feature"><b>4. 시간적 대비를 통한 수탈의 부당성 부각</b><br>‘햇곡식은 푸릇푸릇 논밭에서 자라는데’와 ‘아전들은 벌써부터 조세 거둔다’가 이어집니다. 아직 수확도 이루어지지 않은 상황과 성급한 조세 징수를 맞세워 농민의 불만을 구체화합니다.</div>
    <div class="feature"><b>5. 농부의 집단적 목소리</b><br>‘우리 농부’, ‘우리들이거늘’에서 화자는 개인 한 사람의 고통만 말하지 않고 같은 처지의 농부들을 대표해 말합니다. 수능특강 02번에서도 ‘우리’가 가리키는 바를 근거로 화자를 농부라고 설명합니다.</div>
    <div class="feature"><b>6. 설의적 의문으로 종결</b><br>‘어찌 이리도 극성스레 침탈하는가’는 답을 얻기 위한 질문이 아니라 현재 상황에 대한 불만을 강조하는 설의적 문장입니다. 수능특강 01번의 ㉢에 해당합니다.</div>
  </section>

'''
s = replace_between(s, '  <section class="box">\n    <h2 id="lit-analysis">', '  <section class="box">\n    <h2 id="lit-points">', analysis)

points = '''  <section class="box">
    <h2 id="lit-points">시험 출제 포인트</h2>
    <div class="point"><b>1. 화자</b><br>작가 이규보 자신이 아니라 수탈당하는 ‘농부’를 화자로 설정했습니다. ‘우리 농부’, ‘우리들이거늘’이 핵심 근거입니다.</div>
    <div class="point"><b>2. 01번 ㉠</b><br>‘왕손 공자들아’에서 시적 청자를 명시하고 그에게 직접 말을 건넵니다. 따라서 ㉠에는 (가)와 (다)가 해당합니다.</div>
    <div class="point"><b>3. 01번 ㉢</b><br>마지막 행의 ‘어찌 … 침탈하는가’는 설의적 의문으로 현재 상황에 대한 불만을 부각합니다. ㉢에는 (다)가 해당합니다.</div>
    <div class="point"><b>4. 02번 화자 추론</b><br>(나)의 화자는 가장·손자의 할아버지 등이고, (다)의 화자는 농부입니다. 시인과 작품 속 화자를 자동으로 동일시하면 안 됩니다.</div>
    <div class="point"><b>5. ‘흙투성이 험한 꼴’ ↔ ‘부귀 호사’</b><br>수능특강 03번은 이 두 시어가 현실에서도 상반되고 작품 안에서도 하층민과 지배층의 삶을 표상하며 대립한다고 설명합니다.</div>
    <div class="point"><b>6. ‘햇곡식’과 ‘조세’</b><br>두 대상은 곡식을 거두면 조세를 내야 한다는 점에서 제도적으로 인접하지만, 작품 속 ‘조세’는 노동의 보람이 아니라 아전의 수탈 방식으로 표현됩니다.</div>
    <div class="point"><b>7. 03번 정답 ⑤</b><br>‘햇곡식’과 ‘조세’가 농민의 노동의 보람이라는 하나의 의미로 수렴된다는 해석이 잘못되었습니다. 오히려 아직 익지 않은 곡식과 성급한 조세 징수가 농민의 불만을 드러냅니다.</div>
    <div class="point"><b>8. 1연의 항변 대상</b><br>왕손 공자들이 농부를 얕보는 태도에 항변합니다. 그들의 부귀 호사가 농부에게서 나온다는 점이 항변의 논거입니다.</div>
    <div class="point"><b>9. 2연의 항변 대상</b><br>아전들이 때가 되기 전부터 조세를 거두는 현실에 항변합니다. ‘푸릇푸릇’과 ‘벌써부터’의 대비가 중요합니다.</div>
    <div class="point"><b>10. 주제의 범위</b><br>수능특강의 주제는 ‘귀족 계층에 대한 농부의 원망’입니다. 자연 예찬이나 농사 노동의 즐거움을 중심 주제로 보아서는 안 됩니다.</div>
  </section>

'''
s = replace_between(s, '  <section class="box">\n    <h2 id="lit-points">', '  <section class="box"><h2 id="lit-quiz">', points)

quiz_start = s.index('  <section class="box"><h2 id="lit-quiz">')
quiz_end = s.index('\n  <div class="download">', quiz_start)

ebs = '''  <section class="box">
    <h2 id="lit-ebs-check">수능특강 2강 핵심 문항 연결</h2>
    <div class="point"><b>01 표현 방식</b><br>㉠ 시적 청자를 명시하여 말을 건네는 작품: (가), (다) / ㉡ 청각적 심상을 반복적으로 환기하는 작품: (나) / ㉢ 의문형으로 시상을 종결하는 작품: (다). 「농부를 대신하여 읊다」에서는 ‘왕손 공자들아’와 마지막 설의적 의문이 핵심 근거입니다.</div>
    <div class="point"><b>02 화자의 정체</b><br>(나)의 화자는 가장(家長), 손자의 할아버지 등으로 볼 수 있고, (다)는 ‘우리 농부’, ‘우리들이거늘’을 근거로 농부를 화자로 설정한 작품입니다.</div>
    <div class="point"><b>03 시어의 의미 관계</b><br>정답은 ⑤입니다. ‘흙투성이 험한 꼴’과 ‘부귀 호사’는 대립 관계로 볼 수 있지만, ‘햇곡식’과 ‘조세’가 농민의 노동의 보람이라는 단일한 의미로 수렴된다고 볼 수는 없습니다. 작품 속 조세는 아전이 성화를 부리며 거두려는 수탈의 방식으로 제시됩니다.</div>
  </section>

'''

quizzes = '''  <section class="box"><h2 id="lit-quiz">선택형 변형문제 10제</h2>
<section class="quiz" data-answer="4"><h3>1. 이 작품의 화자와 청자에 대한 이해로 가장 적절한 것은?</h3><div class="choices"><button type="button" class="choice" data-choice="1">① 화자는 왕손 공자이며, 청자는 조세를 거두는 농부이다.</button><button type="button" class="choice" data-choice="2">② 화자는 아전이며, 청자는 부귀를 누리는 귀족 계층이다.</button><button type="button" class="choice" data-choice="3">③ 화자는 이규보 자신으로 명시되며, 별도의 시적 청자는 나타나지 않는다.</button><button type="button" class="choice" data-choice="4">④ 화자는 농부로 설정되어 있고, 1연에서는 ‘왕손 공자들’이 명시적 청자로 제시된다.</button><button type="button" class="choice" data-choice="5">⑤ 화자는 귀족과 농부를 모두 포함하는 집단이며, 청자는 자연물이다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ④</p><ol><li>① 왕손 공자는 화자가 아니라 비판의 대상입니다.</li><li>② 아전 역시 화자가 아니라 2연에서 비판받는 대상입니다.</li><li>③ 작가는 농부를 화자로 설정했습니다.</li><li>④ ‘우리 농부’와 ‘왕손 공자들아’를 함께 고려한 정확한 설명입니다.</li><li>⑤ ‘우리’는 농부 집단을 가리킵니다.</li></ol></div></section>
<section class="quiz" data-answer="2"><h3>2. 다음 &lt;보기&gt;를 참고할 때, 작품 속 화자를 이해한 내용으로 가장 적절한 것은?<div class="view">&lt;보기&gt; 시인은 자신의 사회적 신분과 다른 인물을 화자로 설정하여 그 인물의 처지와 목소리를 직접 드러낼 수 있다. 이 경우 작품 속 ‘나’나 ‘우리’를 곧바로 작가 자신과 동일시해서는 안 된다.</div></h3><div class="choices"><button type="button" class="choice" data-choice="1">① 이규보가 고려의 문신이므로 ‘우리’는 관리 집단을 가리킨다.</button><button type="button" class="choice" data-choice="2">② ‘우리 농부’, ‘우리들이거늘’을 통해 작가와 다른 신분의 농부가 화자로 설정되었음을 알 수 있다.</button><button type="button" class="choice" data-choice="3">③ ‘왕손 공자들아’가 있으므로 화자는 왕손 공자의 일원이다.</button><button type="button" class="choice" data-choice="4">④ ‘아전들은’이 제시되므로 화자는 조세 징수의 정당성을 설명하는 아전이다.</button><button type="button" class="choice" data-choice="5">⑤ 화자의 신분은 작품 안에서 전혀 추론할 수 없다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ②</p><ol><li>① 작가의 실제 신분과 작품 속 화자의 신분을 혼동한 설명입니다.</li><li>② 제목과 작품 내부 표현 모두가 농부 화자 설정을 뒷받침합니다.</li><li>③ ‘왕손 공자들아’는 화자가 부르는 청자입니다.</li><li>④ 아전은 화자의 비판 대상입니다.</li><li>⑤ ‘우리 농부’라는 직접적인 근거가 있습니다.</li></ol></div></section>
<section class="quiz" data-answer="5"><h3>3. ‘흙투성이 험한 꼴’과 ‘부귀 호사’의 관계에 대한 설명으로 가장 적절한 것은?</h3><div class="choices"><button type="button" class="choice" data-choice="1">① 두 표현은 모두 농부의 생활을 가리키며 노동의 보람으로 수렴된다.</button><button type="button" class="choice" data-choice="2">② 전자는 왕손 공자의 외양, 후자는 농부의 생활을 나타낸다.</button><button type="button" class="choice" data-choice="3">③ 두 표현은 모두 조세 제도의 공정성을 드러내는 제도적 용어이다.</button><button type="button" class="choice" data-choice="4">④ 서로 인접한 자연물을 가리켜 조화로운 농촌 풍경을 형성한다.</button><button type="button" class="choice" data-choice="5">⑤ 현실에서도 상반된 의미를 지니며 작품에서는 농부와 지배층의 삶을 각각 표상해 대립한다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ⑤</p><ol><li>① ‘부귀 호사’는 지배층의 삶입니다.</li><li>② 두 대상이 뒤바뀌었습니다.</li><li>③ 생활 상태를 나타내는 표현이지 제도적 용어가 아닙니다.</li><li>④ 자연물의 인접 관계가 아닙니다.</li><li>⑤ 수능특강 03번 해설과 일치하는 관계입니다.</li></ol></div></section>
<section class="quiz" data-answer="3"><h3>4. 다음 &lt;보기&gt;의 관점으로 ‘햇곡식’과 ‘조세’를 이해한 내용으로 적절하지 않은 것은?<div class="view">&lt;보기&gt; 시어들은 현실 세계에서 서로 연관될 수 있지만, 작품 안에서는 그 관계가 화자의 정서와 상황에 따라 새롭게 조직된다. 따라서 현실에서의 연관성만으로 작품 속 의미 관계를 단정해서는 안 된다.</div></h3><div class="choices"><button type="button" class="choice" data-choice="1">① 곡식을 거두면 조세를 내야 한다는 점에서 두 대상은 제도적으로 연관될 수 있다.</button><button type="button" class="choice" data-choice="2">② 작품 속 조세는 아전들이 수확 전부터 성화를 부리며 거두려는 대상으로 제시된다.</button><button type="button" class="choice" data-choice="3">③ 두 시어는 작품 안에서 농민이 노동의 성과를 보상받는 보람이라는 하나의 의미로 수렴된다.</button><button type="button" class="choice" data-choice="4">④ ‘햇곡식’이 아직 자라는 상황은 조세 징수가 성급하다는 불만을 강화한다.</button><button type="button" class="choice" data-choice="5">⑤ 두 시어의 관계는 2연에서 농민 수탈의 현실을 구체화하는 데 기여한다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ③</p><ol><li>① 현실 세계의 제도적 인접 관계에 해당합니다.</li><li>② ‘벌써부터’, ‘성화로세’가 이를 보여 줍니다.</li><li>③ 수능특강 03번에서 바로 이와 같은 해석이 부적절하다고 봅니다.</li><li>④ 시간적 대비의 효과를 정확히 읽은 것입니다.</li><li>⑤ 2연의 비판 맥락에 맞습니다.</li></ol></div></section>
<section class="quiz" data-answer="1"><h3>5. 1연과 2연의 내용 전개를 가장 적절하게 설명한 것은?</h3><div class="choices"><button type="button" class="choice" data-choice="1">① 1연에서는 농부를 얕보는 왕손 공자에게, 2연에서는 때가 되기 전부터 조세를 거두는 관리에게 각각 항변한다.</button><button type="button" class="choice" data-choice="2">② 1연에서는 농부의 게으름을, 2연에서는 귀족의 성실함을 대조한다.</button><button type="button" class="choice" data-choice="3">③ 1연은 자연 풍경을 예찬하고 2연은 농사의 풍요를 자축한다.</button><button type="button" class="choice" data-choice="4">④ 1연과 2연 모두 왕손 공자에게만 말을 걸며 관리의 수탈은 다루지 않는다.</button><button type="button" class="choice" data-choice="5">⑤ 1연은 미래의 수확을, 2연은 과거의 흉년을 회상한다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ①</p><ol><li>① 수능특강의 구성 설명과 일치합니다.</li><li>② 농부의 게으름이나 귀족의 성실함은 나타나지 않습니다.</li><li>③ 두 연 모두 현실 비판의 맥락입니다.</li><li>④ 2연에서는 아전의 조세 징수를 문제 삼습니다.</li><li>⑤ 과거 회상 구조가 아닙니다.</li></ol></div></section>
<section class="quiz" data-answer="4"><h3>6. ‘왕손 공자들아 더 이상 얕보지 마오’의 표현 효과로 가장 적절한 것은?</h3><div class="choices"><button type="button" class="choice" data-choice="1">① 대상을 명시하지 않은 독백으로 화자의 체념을 드러낸다.</button><button type="button" class="choice" data-choice="2">② 자연물에 감정을 이입하여 농촌의 평온함을 강조한다.</button><button type="button" class="choice" data-choice="3">③ 과거의 귀족을 추억하는 영탄으로 복고적 태도를 나타낸다.</button><button type="button" class="choice" data-choice="4">④ 비판 대상을 직접 부르고 요구하는 어조를 취해 농부의 항변을 선명하게 드러낸다.</button><button type="button" class="choice" data-choice="5">⑤ 아전의 발화를 인용하여 조세 징수의 정당성을 제시한다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ④</p><ol><li>① ‘왕손 공자들아’라는 명시적 청자가 있습니다.</li><li>② 자연물에 대한 감정 이입과 무관합니다.</li><li>③ 귀족을 추억하거나 예찬하지 않습니다.</li><li>④ 호명과 요구의 어조가 직접적인 항변을 형성합니다.</li><li>⑤ 아전의 발화가 아닙니다.</li></ol></div></section>
<section class="quiz" data-answer="2"><h3>7. ‘햇곡식은 푸릇푸릇 논밭에서 자라는데 / 아전들은 벌써부터 조세 거둔다고 성화로세’에 대한 이해로 가장 적절한 것은?</h3><div class="choices"><button type="button" class="choice" data-choice="1">① 수확이 이미 끝난 뒤의 정당한 세금 징수 절차를 보여 준다.</button><button type="button" class="choice" data-choice="2">② 아직 곡식이 자라는 상황과 ‘벌써부터’의 조세 독촉을 맞세워 농민이 느끼는 부당함을 드러낸다.</button><button type="button" class="choice" data-choice="3">③ 농부가 조세를 내지 않기 위해 경작을 중단했음을 보여 준다.</button><button type="button" class="choice" data-choice="4">④ 자연의 푸른빛을 감상하면서 현실 문제에서 벗어나는 장면이다.</button><button type="button" class="choice" data-choice="5">⑤ 아전과 농부가 수확의 기쁨을 함께 나누는 모습을 나타낸다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ②</p><ol><li>① 아직 곡식이 논밭에서 자라고 있습니다.</li><li>② ‘푸릇푸릇’과 ‘벌써부터’의 시간적 대비를 정확히 이해했습니다.</li><li>③ 경작 중단은 나타나지 않습니다.</li><li>④ 자연 예찬보다 수탈 현실 비판과 연결됩니다.</li><li>⑤ 아전은 성화를 부리며 조세를 거두려 합니다.</li></ol></div></section>
<section class="quiz" data-answer="5"><h3>8. 마지막 행 ‘어찌 이리도 극성스레 침탈하는가’에 대한 설명으로 가장 적절한 것은?</h3><div class="choices"><button type="button" class="choice" data-choice="1">① 침탈의 법적 근거를 알지 못해 관리에게 객관적인 정보를 요청한다.</button><button type="button" class="choice" data-choice="2">② 농부의 잘못을 인정하고 처벌의 이유를 묻는 반성적 질문이다.</button><button type="button" class="choice" data-choice="3">③ 자연 현상의 원인을 탐구하는 학문적 의문을 제기한다.</button><button type="button" class="choice" data-choice="4">④ 청자의 답변에 따라 자신의 태도를 바꾸려는 타협적 질문이다.</button><button type="button" class="choice" data-choice="5">⑤ 실제 답을 요구하기보다 현재 상황에 대한 불만을 설의적으로 강조하며 시상을 마무리한다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ⑤</p><ol><li>① 정보 요청이 목적이 아닙니다.</li><li>② 화자는 농부의 잘못을 인정하지 않습니다.</li><li>③ 사회 현실을 향한 질문입니다.</li><li>④ 타협하려는 태도가 드러나지 않습니다.</li><li>⑤ 수능특강 01번 ㉢의 핵심입니다.</li></ol></div></section>
<section class="quiz" data-answer="3"><h3>9. 다음 &lt;보기&gt;를 참고한 감상으로 적절하지 않은 것은?<div class="view">&lt;보기&gt; 이 작품은 농민의 노동과 지배층의 생활, 그리고 조세 징수의 시점을 한 작품 안에 배치하여 농민이 처한 현실을 구체화한다. 이때 화자는 자신들의 생산 기여를 근거로 멸시와 수탈의 부당함을 항변한다.</div></h3><div class="choices"><button type="button" class="choice" data-choice="1">① ‘부귀 호사’가 ‘우리 농부로부터’ 나온다는 말은 지배층의 생활이 농민 생산에 의존함을 지적한 것으로 볼 수 있다.</button><button type="button" class="choice" data-choice="2">② ‘나라 부유케 한 건 우리들이거늘’은 농부가 자신의 생산 기여를 항변의 근거로 삼는 것으로 볼 수 있다.</button><button type="button" class="choice" data-choice="3">③ ‘조세’는 농민의 노동이 정당하게 보상되었음을 보여 주는 소재이므로 화자의 만족감을 강화한다고 볼 수 있다.</button><button type="button" class="choice" data-choice="4">④ ‘흙투성이 험한 꼴’과 ‘부귀 호사’의 대비는 농부와 지배층의 서로 다른 삶의 조건을 드러낸다고 볼 수 있다.</button><button type="button" class="choice" data-choice="5">⑤ ‘벌써부터’는 조세 징수 시점에 대한 농민의 불만을 구체화한다고 볼 수 있다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ③</p><ol><li>① 1연의 논리에 맞습니다.</li><li>② 농민의 국가적 생산 기여를 드러냅니다.</li><li>③ 작품 속 조세는 보상이 아니라 침탈의 한 방식으로 제시됩니다.</li><li>④ 수능특강 03번의 대립 관계 설명과 일치합니다.</li><li>⑤ 성급한 징수에 대한 불만을 드러냅니다.</li></ol></div></section>
<section class="quiz" data-answer="1"><h3>10. 작품 전체의 내용과 표현을 종합한 설명으로 가장 적절한 것은?</h3><div class="choices"><button type="button" class="choice" data-choice="1">① 농부를 화자로 설정하고 명시적 청자·대조·설의를 활용하여 귀족의 멸시와 관리의 수탈에 대한 불만을 직접적으로 드러낸다.</button><button type="button" class="choice" data-choice="2">② 자연물을 화자로 설정하고 감각적 이미지를 중심으로 전원생활의 즐거움을 예찬한다.</button><button type="button" class="choice" data-choice="3">③ 왕손 공자의 입장에서 농민의 노동을 평가하며 계층 질서의 안정을 옹호한다.</button><button type="button" class="choice" data-choice="4">④ 조세 제도의 필요성을 설명한 뒤 농민에게 성실한 납부를 권고한다.</button><button type="button" class="choice" data-choice="5">⑤ 농민이 자신의 가난을 운명으로 받아들이고 귀족에게 도움을 청하는 과정을 형상화한다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ①</p><ol><li>① 화자 설정, 표현 방식, 두 연의 비판 대상을 모두 정확히 종합했습니다.</li><li>② 자연 예찬 작품이 아닙니다.</li><li>③ 계층 질서를 옹호하지 않습니다.</li><li>④ 조세 징수의 부당함을 비판합니다.</li><li>⑤ 체념보다 항변의 목소리가 중심입니다.</li></ol></div></section>
<p>선택지를 누르면 정오 판단과 선택지별 해설이 바로 표시됩니다.</p>
  </section>'''

s = s[:quiz_start] + ebs + quizzes + s[quiz_end:]

# Remove production/editorial notes if any remain.
for phrase in ['월곡답가형 통일 구성', '교재 근거로 분석했습니다', '교재와 대조해 정리했습니다', '공식 해설을 기준으로']:
    assert phrase not in s, f'editorial phrase remains: {phrase}'

# Quality checks.
assert '<!-- revision: 2 -->' in s
assert '귀족 계층에 대한 농부의 원망' in s
assert '㉠ 시적 청자를 명시하여 말을 건네는 작품: (가), (다)' in s
assert '㉢ 의문형으로 시상을 종결하는 작품: (다)' in s
assert '03번에서 바로 이와 같은 해석이 부적절' in s
assert (s.count('class="quiz"') == 10), f'quiz count={s.count("class=\"quiz\"")}'

for m in re.finditer(r'<section class="quiz".*?</section>', s, re.S):
    block = m.group(0)
    h = re.search(r'<h3>(.*?)</h3>', block, re.S)
    if h and ('&lt;보기&gt;' in h.group(1) or '<보기>' in h.group(1)):
        assert 'class="view"' in block, 'view-required quiz missing view box'
    assert block.count('class="choice"') == 5, 'choice count mismatch'
    ans = re.search(r'data-answer="([1-5])"', block)
    assert ans, 'answer missing'
    assert f'정답 {"①②③④⑤"[int(ans.group(1))-1]}' in block, 'answer label mismatch'

p.write_text(s, encoding='utf-8')
print('audited:', p, 'chars=', len(s), 'quizzes=', s.count('class="quiz"'))
