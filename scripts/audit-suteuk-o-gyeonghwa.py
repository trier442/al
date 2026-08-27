from pathlib import Path
import re

p = Path('wordpress-content/2027-suteuk-o-gyeonghwa-kkwaekkol.html')
s = p.read_text(encoding='utf-8')

s = s.replace('<!-- revision: 1 -->', '<!-- revision: 2 -->')

old_header = '<header class="sut-hero"><p class="sut-kicker">2027 수능특강 문학 · 교과서 개념 고전 시가 · 월곡답가형 통일 구성</p><h1>오경화 「꾀꼴꾀꼴 우는 소리에」 원문·상세 해설 및 변형문제</h1><p>화자의 가족 관계를 정확히 밝히고, 꾀꼬리 소리에서 가족들의 일상과 아내의 권유로 이어지는 시상 전개를 교재와 대조해 정리했습니다.</p>'
new_header = '<header class="sut-hero"><p class="sut-kicker">2027 수능특강 문학 · 1부 교과서 개념 학습 · 2강 시의 내용</p><h1>오경화 「꾀꼴꾀꼴 우는 소리에」 원문·상세 해설 및 변형문제</h1><p>봄날 꾀꼬리 울음에 낮잠에서 깨어난 화자가 삼대 가족의 평화로운 일상을 바라보는 시조입니다. 화자의 정체, 반복되는 청각적 심상, ‘낮잠’과 ‘술’의 의미 관계를 중심으로 살펴봅니다.</p>'
assert old_header in s, 'header not found'
s = s.replace(old_header, new_header)
s = s.replace('<a href="#lit-points">출제 포인트</a><a href="#lit-quiz">변형문제</a>', '<a href="#lit-points">출제 포인트</a><a href="#lit-ebs-check">교재 문항</a><a href="#lit-quiz">변형문제</a>')

old_overview = '<div class="overview"><b>갈래</b> 평시조·단시조　 <b>성격</b> 전원적·평화적·관조적　 <b>주제</b> 삼대 가족이 함께 누리는 평화로운 일상과 행복</div>'
new_overview = '<div class="overview"><b>갈래</b> 평시조·단시조　 <b>성격</b> 평화적·일상적·담담한　 <b>주제</b> 한 가정의 평화로운 일상</div>'
assert old_overview in s, 'overview not found'
s = s.replace(old_overview, new_overview)

core_start = s.index('  <section class="box">\n    <h2 id="lit-core">')
flow_start = s.index('  <section class="box">\n    <h2 id="lit-flow">', core_start)
core = '''  <section class="box">
    <h2 id="lit-core">작품 개괄적 해설</h2>
    <div class="overview"><b>갈래</b> 평시조·단시조　 <b>성격</b> 평화적·일상적·담담한　 <b>주제</b> 한 가정의 평화로운 일상</div>
    <p>화자는 ‘꾀꼴꾀꼴’ 우는 꾀꼬리 소리에 낮잠에서 깨어 주변을 바라봅니다. 수능특강 해제는 이 작품의 배경을 봄으로 제시하고, 가족 구성원들이 낮잠을 즐기고 글을 읽고 베를 짜고 꽃놀이를 하고 술을 거르는 모습을 통해 평범한 일상이 주는 행복감을 드러낸다고 설명합니다.</p>
    <p>화자의 정체는 작품 안의 가족 호칭을 통해 추론할 수 있습니다. 화자는 ‘작은아들’, ‘며늘아기’, ‘어린 손자’, ‘지어미’를 바라보고 있으므로 이 가정의 가장이자 어린 손자의 할아버지로 볼 수 있습니다. 다만 수능특강 02번이 분명히 밝히듯 시인 오경화와 작품 속 화자가 일치하는지는 불분명합니다.</p>
    <p>중장에서는 작은아들이 글을 읽고, 며느리가 베를 짜고, 어린 손자가 꽃놀이하는 모습이 한 장면 안에 나란히 놓입니다. 활동의 성격은 서로 다르지만 가족 구성원들이 각자의 일상을 평온하게 이어 간다는 점에서 하나의 분위기로 통합됩니다.</p>
    <p>종장에서는 아내가 술을 거르며 화자에게 맛보기를 권합니다. ‘낮잠’과 ‘술’은 사전적 의미로는 서로 다른 범주의 말이지만, 수능특강 03번의 설명처럼 작품 안에서는 화자의 평화롭고 한가로운 일상이라는 의미로 수렴합니다. 작품은 특별한 사건보다 삼대 가족이 함께 살아가는 평범한 하루의 충만함을 담담하게 보여 줍니다.</p>
  </section>

'''
s = s[:core_start] + core + s[flow_start:]

flow_start = s.index('  <section class="box">\n    <h2 id="lit-flow">')
analysis_start = s.index('  <section class="box">\n    <h2 id="lit-analysis">', flow_start)
flow = '''  <section class="box">
    <h2 id="lit-flow">초·중·종장 시상 전개</h2>
    <div class="flow">
      <div><b>초장</b><br>꾀꼬리 울음소리에 화자가 낮잠에서 깹니다.</div>
      <div><b>중장</b><br>작은아들·며느리·어린 손자가 각각 글 읽기·베 짜기·꽃놀이를 하는 평화로운 일상을 제시합니다.</div>
      <div><b>종장</b><br>아내가 술을 거르며 화자에게 맛보기를 권하는 일상적 장면으로 마무리됩니다.</div>
    </div>
  </section>

'''
s = s[:flow_start] + flow + s[analysis_start:]

analysis_start = s.index('  <section class="box">\n    <h2 id="lit-analysis">')
points_start = s.index('  <section class="box">\n    <h2 id="lit-points">', analysis_start)
analysis = '''  <section class="box">
    <h2 id="lit-analysis">표현상 특징</h2>
    <div class="feature"><b>1. 반복되는 청각적 심상</b><br>‘꾀꼴꾀꼴 우는 소리’가 작품의 첫머리에 제시되어 봄날의 시적 상황을 감각적으로 엽니다. 수능특강 01번의 ㉡ ‘청각적 심상을 반복적으로 환기하여 시적 상황을 구체화’하는 작품은 바로 (나)입니다. 여기서 핵심 근거는 ‘꾀꼴꾀꼴’이라는 소리의 반복입니다.</div>
    <div class="feature"><b>2. 화자의 정체를 드러내는 가족 호칭</b><br>‘작은아들’, ‘며늘아기’, ‘어린 손자’, ‘지어미’는 화자를 중심으로 가족 관계를 구체화합니다. 이를 통해 화자를 가장 또는 손자의 할아버지로 추론할 수 있습니다.</div>
    <div class="feature"><b>3. 가족 구성원의 행동을 나란히 제시</b><br>‘글을 읽고’, ‘베 짜는데’, ‘꽃놀이한다’는 서로 다른 활동을 병렬적으로 보여 줍니다. 공부·노동·놀이가 한 장면 안에서 함께 이루어지며 삼대 가족의 평화로운 일상을 형성합니다.</div>
    <div class="feature"><b>4. 시어의 맥락적 의미 관계</b><br>‘낮잠’과 ‘술’은 사전적 의미로는 다른 범주에 속하지만, 작품 안에서는 여유롭고 한가로운 생활이라는 공통 의미로 수렴합니다. 이는 수능특강 03번에서 직접 확인하는 핵심 개념입니다.</div>
    <div class="feature"><b>5. 담담한 일상 묘사</b><br>작품은 가족 구성원의 행동을 차례로 제시하며 특별한 갈등이나 극적인 사건을 만들지 않습니다. 이러한 담담한 묘사가 오히려 평범한 하루가 주는 안정감과 행복을 부각합니다.</div>
    <div class="feature"><b>6. 종장의 일상적 대화 상황</b><br>‘맛보라고 하더라’는 아내가 화자에게 술을 맛보도록 권한 상황을 전달합니다. 이 장면은 가족 내부의 평온하고 자연스러운 일상적 교류를 구체화합니다.</div>
  </section>

'''
s = s[:analysis_start] + analysis + s[points_start:]

points_start = s.index('  <section class="box">\n    <h2 id="lit-points">')
quiz_start = s.index('  <section class="box"><h2 id="lit-quiz">', points_start)
points = '''  <section class="box">
    <h2 id="lit-points">시험 출제 포인트</h2>
    <div class="point"><b>1. 화자의 정체</b><br>‘작은아들·며늘아기·어린 손자·지어미’라는 호칭을 종합하면 화자는 가정의 가장, 어린 손자의 할아버지 등으로 볼 수 있습니다.</div>
    <div class="point"><b>2. 작가와 화자의 구별</b><br>작품 속 화자의 가족 관계는 추론할 수 있지만, 시인 오경화와 화자가 실제로 동일한 인물인지는 작품에서 확인할 수 없습니다.</div>
    <div class="point"><b>3. 01번 ㉡의 핵심</b><br>‘꾀꼴꾀꼴’의 소리 반복이 청각적 심상을 반복적으로 환기하여 봄날의 시적 상황을 구체화합니다.</div>
    <div class="point"><b>4. 중장의 병렬적 장면</b><br>아들의 글 읽기, 며느리의 베 짜기, 손자의 꽃놀이가 동시에 제시되며 가족의 평화로운 일상을 압축합니다.</div>
    <div class="point"><b>5. ‘낮잠’과 ‘술’</b><br>서로 다른 범주의 시어이지만 작품 안에서는 한가롭고 평화로운 일상이라는 하나의 의미로 수렴합니다.</div>
    <div class="point"><b>6. 봄의 배경</b><br>수능특강 해제는 이 작품의 배경을 봄으로 설명합니다. ‘꾀꼴꾀꼴’과 ‘꽃놀이’는 이러한 계절적 분위기와 어울립니다.</div>
    <div class="point"><b>7. 갈등의 부재</b><br>작품은 가족 구성원 사이의 갈등이나 행동의 우열을 제시하지 않습니다. 각자의 활동이 함께 어우러지는 장면이 핵심입니다.</div>
    <div class="point"><b>8. 종장의 기능</b><br>아내가 술을 거르며 맛보기를 권하는 장면은 초·중장에서 형성된 평화로운 일상을 이어 받아 작품을 마무리합니다.</div>
    <div class="point"><b>9. 시적 청자</b><br>수능특강 01번에서 ㉠ ‘시적 청자를 명시하여 말을 건네는 어조’는 (가)와 (다)에 해당합니다. 따라서 (나)는 시적 청자를 명시한 작품으로 보지 않습니다.</div>
    <div class="point"><b>10. 의문형 종결</b><br>수능특강 01번의 ㉢ ‘의문형으로 시상을 종결’하는 작품은 (다)입니다. (나)는 ‘하더라’로 마무리됩니다.</div>
  </section>

'''
s = s[:points_start] + points + s[quiz_start:]

quiz_start = s.index('  <section class="box"><h2 id="lit-quiz">')
quiz_end = s.index('\n  <div class="download">', quiz_start)

ebs = '''  <section class="box">
    <h2 id="lit-ebs-check">수능특강 2강 핵심 문항 연결</h2>
    <div class="point"><b>01 표현 방식</b><br>㉠ ‘시적 청자를 명시하여 말을 건네는 어조’는 (가), (다), ㉡ ‘청각적 심상을 반복적으로 환기’는 (나), ㉢ ‘의문형으로 시상을 종결’은 (다)에 해당합니다.</div>
    <div class="point"><b>02 화자의 정체</b><br>(나)의 화자는 삼대 가족 구성원 가운데 가장(家長), 곧 어린 손자의 할아버지 등으로 볼 수 있습니다. 시인과 화자가 일치하는지는 불분명합니다.</div>
    <div class="point"><b>03 시어의 의미 관계</b><br>(나)의 ‘낮잠’과 ‘술’은 사전적 의미로는 다른 범주이지만 작품 안에서는 화자의 평화롭고 한가로운 일상이라는 하나의 의미로 수렴합니다. 03번 전체 정답은 ⑤입니다.</div>
  </section>

'''

quiz = '''  <section class="box"><h2 id="lit-quiz">선택형 변형문제 10제</h2>

<section class="quiz" data-answer="3"><h3>1. 다음 &lt;보기&gt;를 바탕으로 이 작품의 화자를 이해한 내용으로 가장 적절한 것은?</h3><div class="view"><b>&lt;보기&gt;</b><br>시에서는 화자의 정체가 직접 밝혀지지 않더라도, 화자가 다른 인물을 부르는 호칭과 그 인물들 사이의 관계를 통해 화자의 위치를 추론할 수 있다. 다만 작품 속 화자와 실제 시인을 동일한 인물로 단정하려면 별도의 근거가 필요하다.</div><div class="choices"><button type="button" class="choice" data-choice="1">① ‘며늘아기’라는 호칭만으로 화자를 작은아들의 아내라고 확정할 수 있다.</button><button type="button" class="choice" data-choice="2">② ‘어린 손자’가 등장하므로 화자는 반드시 손자의 어머니여야 한다.</button><button type="button" class="choice" data-choice="3">③ ‘작은아들’, ‘며늘아기’, ‘어린 손자’, ‘지어미’의 관계를 종합하면 화자를 가장 또는 손자의 할아버지로 볼 수 있지만, 시인 오경화와 동일인인지는 확정할 수 없다.</button><button type="button" class="choice" data-choice="4">④ ‘지어미’라는 표현은 화자가 가족 밖의 관찰자임을 보여 준다.</button><button type="button" class="choice" data-choice="5">⑤ 가족 호칭이 구체적이므로 화자와 시인이 반드시 일치한다고 보아야 한다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ③</p><ol><li>① 화자는 며느리를 바라보는 위치에 있습니다.</li><li>② 화자는 손자를 관찰하며, 손자의 어머니로 볼 근거가 없습니다.</li><li>③ 수능특강 02번의 화자 추론과 정확히 일치합니다.</li><li>④ ‘지어미’는 화자의 아내를 가리키므로 가족 내부 인물임을 보여 줍니다.</li><li>⑤ 수능특강은 시인과 화자의 일치 여부가 불분명하다고 밝힙니다.</li></ol></div></section>

<section class="quiz" data-answer="1"><h3>2. ‘꾀꼴꾀꼴 우는 소리’의 기능을 이해한 내용으로 가장 적절한 것은?</h3><div class="choices"><button type="button" class="choice" data-choice="1">① 동일한 소리를 반복하여 청각적 심상을 두드러지게 하고, 화자가 낮잠에서 깨어 주변을 바라보게 되는 시적 상황을 연다.</button><button type="button" class="choice" data-choice="2">② 베 짜는 소리를 직접 모방하여 며느리의 노동 강도를 강조한다.</button><button type="button" class="choice" data-choice="3">③ 가족 사이의 다툼을 예고하는 불길한 자연의 징조로 기능한다.</button><button type="button" class="choice" data-choice="4">④ 화자가 시적 청자에게 자신의 처지를 호소하는 직접적인 발화에 해당한다.</button><button type="button" class="choice" data-choice="5">⑤ 의문형 종결과 결합하여 화자의 원망을 극대화한다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ①</p><ol><li>① 수능특강 01번의 ㉡에 해당하는 핵심 근거입니다.</li><li>② ‘꾀꼴꾀꼴’은 꾀꼬리 울음소리입니다.</li><li>③ 작품의 전체 분위기는 평화롭고 한가롭습니다.</li><li>④ (나)는 시적 청자를 명시하여 말을 건네는 작품으로 분류되지 않습니다.</li><li>⑤ 작품은 의문형으로 끝나지 않습니다.</li></ol></div></section>

<section class="quiz" data-answer="4"><h3>3. 이 작품의 시상 전개를 가장 정확하게 정리한 것은?</h3><div class="choices"><button type="button" class="choice" data-choice="1">① 가족 구성원의 갈등 제시 → 화자의 중재 → 갈등 해소</button><button type="button" class="choice" data-choice="2">② 과거의 가족 생활 회상 → 현재의 상실 확인 → 미래의 회복 기대</button><button type="button" class="choice" data-choice="3">③ 아내의 술 권유 → 화자의 낮잠 → 손자의 꽃놀이</button><button type="button" class="choice" data-choice="4">④ 꾀꼬리 울음에 낮잠을 깸 → 아들·며느리·손자의 일상을 봄 → 아내가 술을 거르며 맛보기를 권함</button><button type="button" class="choice" data-choice="5">⑤ 자연 경관의 예찬 → 노동 현실의 비판 → 지배층에 대한 항변</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ④</p><ol><li>① 가족 갈등과 중재는 나타나지 않습니다.</li><li>② 회상·상실·회복의 구조가 아닙니다.</li><li>③ 실제 제시 순서와 다릅니다.</li><li>④ 수능특강 해설의 초장·중장·종장 구성과 일치합니다.</li><li>⑤ 이규보의 「농부를 대신하여 읊다」와 혼동한 설명입니다.</li></ol></div></section>

<section class="quiz" data-answer="2"><h3>4. 다음 &lt;보기&gt;를 바탕으로 ‘낮잠’과 ‘술’의 관계를 이해한 내용으로 가장 적절한 것은?</h3><div class="view"><b>&lt;보기&gt;</b><br>시어들은 사전적 의미가 서로 달라도 작품의 맥락 안에서 하나의 정서나 상황을 함께 형성하며 단일한 의미로 수렴할 수 있다.</div><div class="choices"><button type="button" class="choice" data-choice="1">① ‘낮잠’과 ‘술’은 모두 경제적 빈곤을 직접 드러내는 소재이다.</button><button type="button" class="choice" data-choice="2">② ‘낮잠’과 ‘술’은 서로 다른 범주의 말이지만 작품 안에서는 화자의 한가롭고 평화로운 일상이라는 의미로 모인다.</button><button type="button" class="choice" data-choice="3">③ ‘낮잠’은 자연, ‘술’은 문명을 뜻하여 두 세계의 대립을 형성한다.</button><button type="button" class="choice" data-choice="4">④ ‘낮잠’은 과거, ‘술’은 미래를 상징하여 시간의 단절을 나타낸다.</button><button type="button" class="choice" data-choice="5">⑤ 두 시어는 모두 가족 갈등을 촉발하는 원인으로 제시된다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ②</p><ol><li>① 빈곤을 직접 드러낸다는 근거가 없습니다.</li><li>② 수능특강 03번의 (나) 관련 설명과 같은 판단입니다.</li><li>③ 자연과 문명의 대립은 작품의 의미 구조가 아닙니다.</li><li>④ 시간 상징으로 기능하지 않습니다.</li><li>⑤ 가족 갈등은 제시되지 않습니다.</li></ol></div></section>

<section class="quiz" data-answer="5"><h3>5. 중장의 표현 방식과 그 효과에 대한 설명으로 가장 적절한 것은?</h3><div class="choices"><button type="button" class="choice" data-choice="1">① 가족 구성원의 행동을 인과적으로 연결하여 한 사람의 행동이 다른 사람의 행동을 유발했음을 보여 준다.</button><button type="button" class="choice" data-choice="2">② 아들의 글 읽기만을 긍정적으로 제시해 다른 가족의 행동보다 우월하게 평가한다.</button><button type="button" class="choice" data-choice="3">③ 며느리의 베 짜기와 손자의 꽃놀이를 대립시켜 세대 간 갈등을 부각한다.</button><button type="button" class="choice" data-choice="4">④ 가족의 호칭을 생략하여 인물 관계를 의도적으로 모호하게 만든다.</button><button type="button" class="choice" data-choice="5">⑤ 글 읽기·베 짜기·꽃놀이처럼 서로 다른 활동을 한 장면 안에 병렬적으로 제시하여 삼대 가족의 평화로운 일상을 압축한다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ⑤</p><ol><li>① 행동 사이의 인과 관계는 제시되지 않습니다.</li><li>② 작품은 행동의 가치에 우열을 두지 않습니다.</li><li>③ 갈등보다 조화로운 공존이 중심입니다.</li><li>④ 구체적인 가족 호칭이 제시됩니다.</li><li>⑤ 중장의 구성과 효과를 정확히 설명했습니다.</li></ol></div></section>

<section class="quiz" data-answer="3"><h3>6. ‘때마침 지어미 술 거르며 맛보라고 하더라’의 기능으로 가장 적절한 것은?</h3><div class="choices"><button type="button" class="choice" data-choice="1">① 가족의 평화로운 분위기가 끝나고 외부 갈등이 시작됨을 알린다.</button><button type="button" class="choice" data-choice="2">② 화자가 가족을 떠날 결심을 하게 되는 결정적 계기를 제공한다.</button><button type="button" class="choice" data-choice="3">③ 아내가 술을 거르며 화자에게 맛보기를 권하는 일상적 장면을 덧붙여 한가롭고 평화로운 생활의 분위기를 이어 간다.</button><button type="button" class="choice" data-choice="4">④ 아내가 술을 독점함으로써 가족 내부의 권력 관계를 드러낸다.</button><button type="button" class="choice" data-choice="5">⑤ 노동의 실패로 가족 생계가 위기에 놓였음을 직접 설명한다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ③</p><ol><li>① 외부 갈등은 제시되지 않습니다.</li><li>② 화자의 이별이나 출발은 없습니다.</li><li>③ 수능특강 해제가 설명하는 평범한 일상의 행복과 연결됩니다.</li><li>④ 권력 관계를 드러낸다는 근거가 없습니다.</li><li>⑤ 생계 위기를 설명하지 않습니다.</li></ol></div></section>

<section class="quiz" data-answer="1"><h3>7. 다음 &lt;보기&gt;의 관점에서 이 작품을 이해한 내용으로 가장 적절한 것은?</h3><div class="view"><b>&lt;보기&gt;</b><br>시에서 화자의 정체를 추론하는 일과 시적 청자를 확인하는 일은 구분해야 한다. 가족 관계를 통해 화자가 누구인지 추론할 수 있더라도, 작품 안에 화자가 직접 말을 거는 청자가 드러나지 않을 수 있다.</div><div class="choices"><button type="button" class="choice" data-choice="1">① 화자는 가장 또는 손자의 할아버지로 추론할 수 있지만, 이 작품은 시적 청자를 명시하여 그에게 말을 건네는 작품으로 보기는 어렵다.</button><button type="button" class="choice" data-choice="2">② 화자를 손자의 할아버지로 볼 수 있으므로 손자가 반드시 시적 청자이다.</button><button type="button" class="choice" data-choice="3">③ ‘맛보라고 하더라’는 화자가 아내에게 직접 명령하는 말이므로 아내가 시적 청자이다.</button><button type="button" class="choice" data-choice="4">④ 시적 청자가 드러나지 않으므로 화자의 정체도 전혀 추론할 수 없다.</button><button type="button" class="choice" data-choice="5">⑤ 화자와 시인이 일치하지 않는다면 시적 청자가 반드시 존재해야 한다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ①</p><ol><li>① 수능특강 01·02번의 판단을 함께 적용한 설명입니다.</li><li>② 화자의 가족 관계와 시적 청자의 존재는 별개의 문제입니다.</li><li>③ ‘맛보라고’는 아내의 말이 전달된 것입니다.</li><li>④ 가족 호칭으로 화자의 정체를 추론할 수 있습니다.</li><li>⑤ 두 조건 사이에는 필연적 관계가 없습니다.</li></ol></div></section>

<section class="quiz" data-answer="4"><h3>8. 수능특강 2강의 다음 설명 가운데 이 작품에 해당하는 것만을 고른 것은?</h3><div class="view"><b>&lt;보기&gt;</b><br>ㄱ. 시적 청자를 명시하여 그에게 말을 건네는 어조를 취한다.<br>ㄴ. 청각적 심상을 반복적으로 환기하여 시적 상황을 구체화한다.<br>ㄷ. 의문형으로 시상을 종결하여 화자의 정서를 부각한다.</div><div class="choices"><button type="button" class="choice" data-choice="1">① ㄱ</button><button type="button" class="choice" data-choice="2">② ㄷ</button><button type="button" class="choice" data-choice="3">③ ㄱ, ㄴ</button><button type="button" class="choice" data-choice="4">④ ㄴ</button><button type="button" class="choice" data-choice="5">⑤ ㄴ, ㄷ</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ④</p><ol><li>ㄱ은 (가)와 (다)에 해당합니다.</li><li>ㄴ은 ‘꾀꼴꾀꼴’의 반복적 청각 심상을 지닌 (나)에 해당합니다.</li><li>ㄷ은 의문형으로 끝나는 (다)에 해당합니다.</li></ol></div></section>

<section class="quiz" data-answer="2"><h3>9. 다음 &lt;보기&gt;를 참고하여 이 작품의 가족 장면을 감상한 내용으로 가장 적절한 것은?</h3><div class="view"><b>&lt;보기&gt;</b><br>짧은 시가에서는 인물들의 서로 다른 행동을 한 장면에 함께 배치함으로써 개별 행동의 차이를 넘어 공동체 전체의 분위기를 압축적으로 보여 줄 수 있다.</div><div class="choices"><button type="button" class="choice" data-choice="1">① 아들이 글을 읽는 장면은 며느리의 베 짜기를 방해하여 가족의 긴장을 높인다.</button><button type="button" class="choice" data-choice="2">② 아들의 글 읽기, 며느리의 베 짜기, 손자의 꽃놀이는 서로 다른 활동이지만 한 장면에서 어우러져 가족의 평화로운 일상을 보여 준다.</button><button type="button" class="choice" data-choice="3">③ 손자의 꽃놀이는 다른 가족이 모두 일을 하는 상황과 대립하여 화자의 꾸지람을 유발한다.</button><button type="button" class="choice" data-choice="4">④ 가족 구성원의 행동은 시간순 인과 관계로 연결되어 앞선 행동이 다음 행동의 원인이 된다.</button><button type="button" class="choice" data-choice="5">⑤ 가족의 행동은 각각 독립되어 있어 작품의 전체 분위기 형성에는 기여하지 않는다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ②</p><ol><li>① 방해나 긴장은 나타나지 않습니다.</li><li>② 수능특강 해제의 ‘평범한 일상이 주는 행복감’과 연결되는 설명입니다.</li><li>③ 꾸지람이나 부정적 평가가 없습니다.</li><li>④ 행동은 병렬적으로 제시됩니다.</li><li>⑤ 서로 다른 행동들이 전체 분위기를 형성합니다.</li></ol></div></section>

<section class="quiz" data-answer="5"><h3>10. 작품을 종합적으로 이해한 내용으로 적절하지 않은 것은?</h3><div class="choices"><button type="button" class="choice" data-choice="1">① 봄날 꾀꼬리 울음소리가 화자가 잠에서 깨어 가족의 모습을 바라보는 계기를 만든다.</button><button type="button" class="choice" data-choice="2">② 구체적인 가족 호칭은 화자를 중심으로 삼대의 관계를 추론하게 한다.</button><button type="button" class="choice" data-choice="3">③ ‘낮잠’과 ‘술’은 작품의 맥락 속에서 한가롭고 평화로운 일상이라는 공통 의미를 형성한다.</button><button type="button" class="choice" data-choice="4">④ 특별한 사건보다 가족 구성원들이 각자의 일상을 이어 가는 평범한 순간이 작품의 중심을 이룬다.</button><button type="button" class="choice" data-choice="5">⑤ 아들의 공부와 며느리의 노동을 대립시켜 가족 내부의 성 역할 갈등을 직접 비판하는 것이 작품의 핵심 주제이다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ⑤</p><ol><li>① 초장의 기능을 정확히 설명했습니다.</li><li>② 수능특강 02번과 일치합니다.</li><li>③ 수능특강 03번과 일치합니다.</li><li>④ 수능특강 해제의 핵심 내용입니다.</li><li>⑤ 작품은 가족 내부의 성 역할 갈등을 직접 비판하지 않으며, 주제는 한 가정의 평화로운 일상입니다.</li></ol></div></section>
<p>선택지를 누르면 정오 판단과 선택지별 해설이 바로 표시됩니다.</p>
  </section>
'''

s = s[:quiz_start] + ebs + quiz + s[quiz_end:]

# 자동 검수: 보기 발문은 실제 보기 상자를 포함해야 함.
quiz_blocks = re.findall(r'<section class="quiz"[\s\S]*?</section>', s)
assert len(quiz_blocks) == 10, f'quiz count={len(quiz_blocks)}'
for i, block in enumerate(quiz_blocks, 1):
    if '&lt;보기&gt;' in block:
        assert 'class="view"' in block, f'question {i}: view missing'

# 원자료 밖 제작 메타 문구 금지
for banned in ['월곡답가형 통일 구성', '교재와 대조해 정리했습니다', '공식 해설을 기준으로', '현대의 관점을 근거 없이']:
    assert banned not in s, f'banned phrase remains: {banned}'

# 핵심 EBS 근거가 들어갔는지 확인
for required in ['가장(家長)', '청각적 심상을 반복적으로 환기', '평화롭고 한가로운 일상', '시적 청자를 명시하여 말을 건네는 작품으로 보기는 어렵다']:
    assert required in s, f'missing required phrase: {required}'

p.write_text(s, encoding='utf-8')
print('updated', p)
