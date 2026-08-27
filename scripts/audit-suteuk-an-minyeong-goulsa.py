from pathlib import Path
import re

p = Path('wordpress-content/2027-suteuk-an-minyeong-goulsa-flower.html')
s = p.read_text(encoding='utf-8')

s = s.replace('<!-- revision: 1 -->', '<!-- revision: 2 -->')

old_header = '<header class="sut-hero"><p class="sut-kicker">2027 수능특강 문학 · 교과서 개념 고전 시가 · 월곡답가형 통일 구성</p><h1>안민영 「고울사 저 꽃이여」 원문·상세 해설 및 변형문제</h1><p>교재 수록 원문과 공식 해설을 기준으로 ‘반만 여윈 꽃’의 상태, 예찬과 안타까움이 겹치는 정서, 꽃과 나비의 관계를 구체적으로 분석했습니다.</p>'
new_header = '<header class="sut-hero"><p class="sut-kicker">2027 수능특강 문학 · 1부 교과서 개념 학습 · 2강 시의 내용</p><h1>안민영 「고울사 저 꽃이여」 원문·상세 해설 및 변형문제</h1><p>반쯤 시든 꽃의 현재 모습을 예찬하면서도 머지않아 완전히 시들 꽃에 대한 안타까움을 함께 드러내는 시조입니다. 꽃과 나비의 관계, 시적 청자, 시어의 의미 관계를 중심으로 살펴봅니다.</p>'
if old_header in s:
    s = s.replace(old_header, new_header)

s = s.replace('<a href="#lit-points">출제 포인트</a><a href="#lit-quiz">변형문제</a>', '<a href="#lit-points">출제 포인트</a><a href="#lit-ebs-check">교재 문항</a><a href="#lit-quiz">변형문제</a>')

if 'id="lit-analysis"' in s:
    a0 = s.index('  <section class="box">\n    <h2 id="lit-analysis">')
    a1 = s.index('  <section class="box">\n    <h2 id="lit-points">', a0)
    analysis = '''  <section class="box">
    <h2 id="lit-analysis">표현상 특징</h2>
    <div class="feature"><b>1. 감탄과 호명</b><br>‘고울사’라는 감탄과 ‘저 꽃이여’라는 호명을 통해 반쯤 시든 꽃을 향한 화자의 예찬을 직접적으로 드러냅니다. 수능특강 2강의 개념에 따르면 (가)는 시적 청자를 명시하여 말을 건네는 작품에 해당합니다.</div>
    <div class="feature"><b>2. 반복을 통한 정서 강조</b><br>‘저 꽃이여’의 반복은 화자의 시선을 꽃에 집중시키고, ‘더도 덜도’는 현재 상태가 변하지 않기를 바라는 소망을 강조합니다.</div>
    <div class="feature"><b>3. 현재 상태의 지속을 바라는 소망</b><br>‘매양 그만하여 있어’에는 반쯤 시든 꽃이 지금의 아름다움을 계속 유지하기를 바라는 마음이 담겨 있습니다. 그러나 꽃은 끝내 시들 수밖에 있으므로 이 소망의 이면에는 안타까움이 깔립니다.</div>
    <div class="feature"><b>4. 의인화된 꽃의 모습</b><br>꽃이 나비를 ‘웃고 맞이’한다고 표현하여 꽃에 사람의 표정과 행동을 부여합니다. 이를 통해 나비와 조화를 이루는 꽃의 모습을 생생하게 제시합니다.</div>
    <div class="feature"><b>5. 감각적 이미지</b><br>꽃과 나비의 모습은 시각적으로, ‘향기’는 후각적으로 떠올릴 수 있습니다. 종장은 반쯤 시든 꽃이 여전히 향기를 지니고 나비와 어울리는 장면을 구체화합니다.</div>
    <div class="feature"><b>6. 시어 사이의 의미 관계</b><br>‘저 꽃’과 ‘나비’는 현실 세계에서도 생태적으로 관련되는 자연물이며, 작품 안에서는 서로 조화를 이루는 관계를 형성합니다. 또한 ‘반만 여윈 꽃’은 작품 밖에서 상정할 수 있는 ‘완전히 시든 꽃’과 비교되면서 현재의 아름다움과 앞으로의 소멸 가능성을 함께 부각합니다.</div>
  </section>

'''
    s = s[:a0] + analysis + s[a1:]

s = s.replace('<div class="point"><b>12. 제목과 첫 구절</b><br>별도의 관념적 제목 대신 첫 구절로 작품을 지칭합니다. 따라서 제목 자체가 대상에 대한 감탄과 호명의 성격을 직접 드러냅니다.</div>', '<div class="point"><b>12. 핵심 감상 축</b><br>이 작품은 ‘지고 있는 꽃’이라는 자연물의 상태를 그대로 바라보는 감상과, 이를 삶의 절정기를 지난 인간의 원숙한 아름다움에 빗대어 읽는 확장 감상을 함께 구분해 이해하는 것이 중요합니다.</div>')

qstart = s.index('  <section class="box">\n    <h2 id="lit-quiz">')
qend = s.index('\n  <div class="download">', qstart)

ebs = '''  <section class="box">
    <h2 id="lit-ebs-check">수능특강 2강 핵심 문항 연결</h2>
    <div class="point"><b>01 시적 청자와 표현 방식</b><br>교재 01의 ㉠ ‘시적 청자를 명시하여 그에게 말을 건네는 어조’에는 (가)와 (다)가 해당합니다. (가)의 ‘저 꽃이여’는 꽃을 청자로 드러내어 직접 말을 건네는 방식으로 볼 수 있습니다.</div>
    <div class="point"><b>02 화자의 정체</b><br>교재 02의 설명에서 (가)는 화자가 누구인지 명시적으로 드러나지 않는 작품으로 제시됩니다. 작품 속 화자를 곧바로 시인 안민영과 동일시해서는 안 됩니다.</div>
    <div class="point"><b>03 시어의 의미 관계</b><br>교재 03에서 (가)의 ‘반만 여윈 꽃’은 작품 외적 정보인 ‘완전히 시든 꽃’과 비교되며, ‘저 꽃’과 ‘나비’는 현실에서도 생태적으로 인접한 자연물로서 작품 안에서 조화의 관계를 형성합니다. 전체 문항의 정답은 ⑤입니다.</div>
  </section>

'''

quiz = '''  <section class="box">
    <h2 id="lit-quiz">선택형 변형문제 10제</h2>
    <section class="quiz" data-answer="4"><h3>1. 이 작품에 대한 이해로 적절하지 않은 것은?</h3><div class="choices"><button type="button" class="choice" data-choice="1">① ‘반만 여윈’은 꽃이 만개의 절정을 지나 시들어 가는 과정에 있음을 보여 준다.</button><button type="button" class="choice" data-choice="2">② ‘더도 덜도 말고’에는 꽃의 현재 상태가 달라지지 않기를 바라는 화자의 마음이 담겨 있다.</button><button type="button" class="choice" data-choice="3">③ ‘매양’에는 현재의 아름다움이 지속되기를 바라는 소망이 드러난다.</button><button type="button" class="choice" data-choice="4">④ ‘향기 좇는 나비’는 꽃이 이미 향기를 완전히 잃어 더 이상 다른 생명과 관계를 맺지 못함을 보여 준다.</button><button type="button" class="choice" data-choice="5">⑤ ‘웃고 맞이하노라’는 꽃과 나비가 조화를 이루는 모습을 의인화하여 제시한다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ④</p><ol><li>① ‘여윈’은 이미 피었다가 시들어 가는 상태를 뜻하므로 적절합니다.</li><li>② 중장은 현재 모습이 유지되기를 바라는 소망을 드러냅니다.</li><li>③ ‘매양’은 ‘늘, 항상’의 의미로 지속의 소망과 관련됩니다.</li><li>④ 나비가 ‘향기’를 좇아오므로 꽃은 여전히 향기를 지니며 다른 자연물과 관계를 맺고 있습니다.</li><li>⑤ 꽃이 나비를 웃으며 맞는다고 표현하여 조화로운 장면을 의인화합니다.</li></ol></div></section>
    <section class="quiz" data-answer="1"><h3>2. 다음 &lt;보기&gt;를 바탕으로 작품을 감상한 내용으로 가장 적절한 것은?</h3><div class="view"><b>&lt;보기&gt;</b><br>시어는 작품 안의 다른 시어와 관계를 맺을 뿐 아니라, 작품 밖에서 상정할 수 있는 대상과의 비교나 현실 세계의 인접 관계를 통해 의미가 구체화되기도 한다.</div><div class="choices"><button type="button" class="choice" data-choice="1">① ‘반만 여윈’ 꽃은 ‘완전히 시든 꽃’과 비교될 때 아직 남아 있는 아름다움과 앞으로의 소멸 가능성을 함께 드러낸다.</button><button type="button" class="choice" data-choice="2">② ‘저 꽃’과 ‘나비’는 현실 세계에서는 서로 관련이 없지만 작품 안에서만 우연히 결합된 대상으로 볼 수 있다.</button><button type="button" class="choice" data-choice="3">③ ‘고울사’와 ‘여윈’은 서로 같은 뜻이므로 두 시어가 결합해도 화자의 새로운 대상 인식은 드러나지 않는다.</button><button type="button" class="choice" data-choice="4">④ ‘춘풍’과 ‘매양’은 제도적으로 인접한 관계이므로 꽃이 영원히 시들지 않는다는 사실을 뒷받침한다.</button><button type="button" class="choice" data-choice="5">⑤ ‘꽃’, ‘향기’, ‘나비’는 작품 안에서 모두 ‘소멸에 대한 공포’라는 하나의 의미로만 수렴한다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ①</p><ol><li>① 수능특강 03의 (가) 관련 감상과 같은 방향입니다.</li><li>② 꽃과 나비는 현실에서도 생태적으로 밀접한 관계가 있습니다.</li><li>③ ‘고울사’는 예찬, ‘여윈’은 시들어 가는 상태를 드러내므로 같은 뜻이 아닙니다.</li><li>④ ‘춘풍’과 ‘매양’을 제도적 인접 관계로 볼 근거가 없습니다.</li><li>⑤ 종장은 소멸 공포보다 꽃과 나비의 조화 및 현재의 아름다움을 구체화합니다.</li></ol></div></section>
    <section class="quiz" data-answer="2"><h3>3. 다음 &lt;보기&gt;를 참고한 감상으로 적절하지 않은 것은?</h3><div class="view"><b>&lt;보기&gt;</b><br>이 작품은 꽃의 모습을 인간의 삶에 비유하여 읽을 수도 있다. ‘반만 여윈 꽃’을 삶의 절정기를 지나 어느 정도 노화한 나이로 접어든 사람에 대응시키면, 쇠퇴만이 아니라 원숙한 아름다움을 발견하는 시선이 부각된다.</div><div class="choices"><button type="button" class="choice" data-choice="1">① ‘고울사’는 절정을 지난 존재에게서도 아름다움을 발견하는 태도와 연결될 수 있다.</button><button type="button" class="choice" data-choice="2">② ‘더도 덜도 말고’는 노화를 노력으로 완전히 멈출 수 있다는 사실을 직접적으로 교훈하는 표현으로 볼 수 있다.</button><button type="button" class="choice" data-choice="3">③ ‘매양 그만하여 있어’는 현재의 원숙한 아름다움을 오래 간직하고 싶은 소망과 연결할 수 있다.</button><button type="button" class="choice" data-choice="4">④ 꽃이 결국 시들 수밖에 있다는 자연의 질서를 고려하면, 현재를 붙잡고 싶은 소망에는 안타까움도 스며 있다고 볼 수 있다.</button><button type="button" class="choice" data-choice="5">⑤ ‘웃고 맞이하노라’는 절정을 지난 삶도 다른 존재와 조화로운 관계를 맺을 수 있음을 보여 주는 장면으로 확장해 읽을 수 있다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ②</p><ol><li>① 공식 해설의 인생 비유와 부합합니다.</li><li>② 화자의 소망을 현실의 가능성이나 직접적 교훈으로 바꾸어 이해한 것이므로 적절하지 않습니다.</li><li>③ 현재 상태를 유지하고 싶은 마음과 연결한 감상입니다.</li><li>④ 예찬 이면의 안타까움을 설명한 공식 해설의 방향과 맞습니다.</li><li>⑤ 꽃과 나비의 조화를 인간 삶의 관계로 확장한 감상으로 볼 수 있습니다.</li></ol></div></section>
    <section class="quiz" data-answer="5"><h3>4. 다음 세 작품의 표현 방식을 비교한 내용으로 적절하지 않은 것은?</h3><div class="view"><b>&lt;보기&gt;</b><br>(가) ‘고울사 저 꽃이여 반만 여윈 저 꽃이여’<br>(나) ‘꾀꼴꾀꼴 우는 소리에 낮잠 깨어 일어나 보니’<br>(다) ‘왕손 공자들아 더 이상 얕보지 마오’ / ‘어찌 이리도 극성스레 침탈하는가’</div><div class="choices"><button type="button" class="choice" data-choice="1">① (가)는 ‘저 꽃이여’를 통해 시적 청자를 명시하고 그 대상에게 말을 건네는 어조를 취한다.</button><button type="button" class="choice" data-choice="2">② (나)는 ‘꾀꼴꾀꼴’을 통해 청각적 심상을 반복적으로 환기한다.</button><button type="button" class="choice" data-choice="3">③ (다)는 ‘왕손 공자들아’를 통해 시적 청자를 직접 드러낸다.</button><button type="button" class="choice" data-choice="4">④ (다)는 마지막 의문형 문장을 통해 현재 상황에 대한 불만을 부각한다.</button><button type="button" class="choice" data-choice="5">⑤ (가)와 (나)는 모두 마지막을 의문형으로 끝맺어 화자의 불만을 직접적으로 드러낸다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ⑤</p><ol><li>① 수능특강 01의 ㉠에 (가)가 해당합니다.</li><li>② 수능특강 01의 ㉡에 (나)가 해당합니다.</li><li>③ 수능특강 01의 ㉠에 (다)도 해당합니다.</li><li>④ 수능특강 해설은 (다)의 마지막 행을 설의적인 문장으로 설명합니다.</li><li>⑤ (가)와 (나)는 의문형으로 종결하지 않습니다. ㉢에는 (다)만 해당합니다.</li></ol></div></section>
    <section class="quiz" data-answer="3"><h3>5. ‘더도 덜도 말고 매양 그만하여 있어’의 기능으로 가장 적절한 것은?</h3><div class="choices"><button type="button" class="choice" data-choice="1">① 꽃이 완전히 시드는 자연의 순리를 화자가 기꺼이 받아들이고 있음을 직접적으로 선언한다.</button><button type="button" class="choice" data-choice="2">② 꽃이 다시 만개하도록 계절의 흐름을 거꾸로 돌리고 싶다는 적극적 의지를 나타낸다.</button><button type="button" class="choice" data-choice="3">③ 현재의 꽃을 가장 아름다운 상태로 인식하고 그 모습이 지속되기를 바라는 화자의 소망을 드러낸다.</button><button type="button" class="choice" data-choice="4">④ 나비가 오기 전까지 꽃의 향기가 완전히 사라져야 한다는 조건을 제시한다.</button><button type="button" class="choice" data-choice="5">⑤ 꽃의 현재 모습을 부정하고 더 화려한 상태로 변하기를 요구한다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ③</p><ol><li>① 자연의 순리를 설명하는 진술이 아니라 현재를 붙잡고 싶은 소망입니다.</li><li>② 과거의 만개 상태로 되돌리겠다는 의지는 나타나지 않습니다.</li><li>③ 중장의 핵심 의미를 정확히 설명합니다.</li><li>④ 향기를 없애려는 내용이 없습니다.</li><li>⑤ ‘더도 덜도 말고’는 변화보다 현재의 지속을 바라는 표현입니다.</li></ol></div></section>
    <section class="quiz" data-answer="4"><h3>6. ‘춘풍에 향기 좇는 나비를 웃고 맞이하노라’에 대한 이해로 적절하지 않은 것은?</h3><div class="choices"><button type="button" class="choice" data-choice="1">① 꽃이 나비를 ‘웃고 맞이’한다고 하여 자연물에 사람의 표정과 행동을 부여한다.</button><button type="button" class="choice" data-choice="2">② ‘향기’는 반쯤 시든 꽃이 여전히 나비를 끌어당길 수 있는 상태임을 보여 준다.</button><button type="button" class="choice" data-choice="3">③ 꽃과 나비가 서로 어울리는 모습은 화자가 꽃의 현재를 긍정적으로 바라보는 태도와 연결된다.</button><button type="button" class="choice" data-choice="4">④ 나비가 꽃을 훼손하는 존재로 제시되어 화자가 두 자연물의 관계를 단절하려는 태도를 드러낸다.</button><button type="button" class="choice" data-choice="5">⑤ ‘춘풍’, ‘향기’, ‘나비’는 봄날의 자연적 배경과 꽃의 현재 모습을 구체화하는 데 기여한다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ④</p><ol><li>① 의인화된 표현입니다.</li><li>② 나비가 향기를 좇아온다는 관계에서 확인됩니다.</li><li>③ 수능특강 03의 (가) 관련 설명과 부합합니다.</li><li>④ 꽃은 나비를 웃으며 맞이하므로 적대나 단절의 관계가 아닙니다.</li><li>⑤ 세 시어는 종장의 자연적 장면을 형성합니다.</li></ol></div></section>
    <section class="quiz" data-answer="1"><h3>7. 다음 &lt;보기&gt;를 적용하여 ‘반만 여윈’의 의미를 설명한 것으로 가장 적절한 것은?</h3><div class="view"><b>&lt;보기&gt;</b><br>작품 속 대상의 현재 상태는 작품에 직접 나오지 않은 이전 상태나 이후 상태를 상정하여 비교할 때 더 분명해질 수 있다. 다만 작품에 제시되지 않은 사건의 원인까지 임의로 확정해서는 안 된다.</div><div class="choices"><button type="button" class="choice" data-choice="1">① 만개한 상태를 이미 지났고 완전히 시든 상태에는 이르지 않은 중간 상태로 이해할 수 있다.</button><button type="button" class="choice" data-choice="2">② 병충해로 인해 갑자기 절반만 시들었다는 구체적인 원인을 작품에서 확인할 수 있다.</button><button type="button" class="choice" data-choice="3">③ 아직 꽃봉오리가 반쯤만 벌어져 있어 앞으로의 만개만을 기다리는 상태로 보아야 한다.</button><button type="button" class="choice" data-choice="4">④ 나비가 향기를 빼앗아 꽃이 절반만 시들게 되었다는 인과 관계가 드러난다.</button><button type="button" class="choice" data-choice="5">⑤ 화자가 꽃을 직접 꺾어 시들게 했다는 사건을 생략한 표현으로 볼 수 있다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ①</p><ol><li>① 공식 해설이 설명하는 꽃의 상태와 일치합니다.</li><li>② 병충해라는 원인은 작품에 없습니다.</li><li>③ ‘여윈’은 피기 전이 아니라 시들어 가는 상태입니다.</li><li>④ 나비가 시듦의 원인이라는 근거가 없습니다.</li><li>⑤ 화자의 행위로 꽃이 시들었다는 내용도 없습니다.</li></ol></div></section>
    <section class="quiz" data-answer="5"><h3>8. 이 작품의 시상 전개를 가장 정확하게 설명한 것은?</h3><div class="choices"><button type="button" class="choice" data-choice="1">① 꽃이 시든 원인을 추적한 뒤 나비에게 책임을 묻고 자연의 순환을 거부하는 방향으로 전개된다.</button><button type="button" class="choice" data-choice="2">② 아직 피지 않은 꽃을 발견한 뒤 만개를 기다리고, 끝내 꽃이 피는 순간을 확인하는 방향으로 전개된다.</button><button type="button" class="choice" data-choice="3">③ 과거의 만개한 모습을 회상한 뒤 현재의 꽃을 부정하고 미래의 재생을 확신하는 방향으로 전개된다.</button><button type="button" class="choice" data-choice="4">④ 꽃의 외형을 객관적으로 관찰한 뒤 화자의 감정을 완전히 배제한 채 나비의 생태를 설명하는 방향으로 전개된다.</button><button type="button" class="choice" data-choice="5">⑤ 반쯤 시든 꽃의 아름다움을 감탄하며 바라본 뒤 현재 상태의 지속을 바라며, 나비를 맞는 꽃의 모습을 제시하는 방향으로 전개된다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ⑤</p><ol><li>① 시듦의 원인 추적이나 나비에 대한 비난이 없습니다.</li><li>② 이미 활짝 피었다가 지는 꽃입니다.</li><li>③ 과거 회상이나 재생 확신이 제시되지 않습니다.</li><li>④ 작품에는 ‘고울사’와 같은 뚜렷한 화자의 평가가 있습니다.</li><li>⑤ 초장·중장·종장의 구성과 공식 해설의 정리를 정확히 반영합니다.</li></ol></div></section>
    <section class="quiz" data-answer="2"><h3>9. 이 작품의 화자와 시적 청자에 대한 이해로 가장 적절한 것은?</h3><div class="choices"><button type="button" class="choice" data-choice="1">① 화자가 안민영이라고 작품 속에서 명시되어 있으므로 시인과 화자를 반드시 동일인으로 보아야 한다.</button><button type="button" class="choice" data-choice="2">② 화자의 구체적 신원은 드러나지 않지만, ‘저 꽃이여’를 통해 꽃을 시적 청자로 삼아 말을 건네는 어조가 나타난다.</button><button type="button" class="choice" data-choice="3">③ 화자는 나비이며, 꽃을 관찰하면서 인간에게 교훈을 전달한다.</button><button type="button" class="choice" data-choice="4">④ 작품에는 시적 청자가 전혀 없고 모든 문장이 자신에게 하는 독백으로만 이루어져 있다.</button><button type="button" class="choice" data-choice="5">⑤ 화자의 신원은 작품에 드러나지 않으므로 어떤 대상에게 말을 건네는지도 판단할 수 없다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ②</p><ol><li>① 수능특강 02의 보기에서 (가)는 화자가 누구인지 명시적이지 않다고 설명합니다.</li><li>② 수능특강 01의 ㉠에 (가)가 해당하는 이유를 정확히 설명합니다.</li><li>③ 나비가 화자라는 근거가 없습니다.</li><li>④ ‘저 꽃이여’는 명시된 청자를 향한 호명입니다.</li><li>⑤ 화자의 신원과 청자의 존재는 서로 다른 판단 요소입니다.</li></ol></div></section>
    <section class="quiz" data-answer="3"><h3>10. 작품을 종합적으로 감상한 내용으로 가장 적절한 것은?</h3><div class="choices"><button type="button" class="choice" data-choice="1">① 화자는 만개한 꽃만을 아름답다고 여기며 시들기 시작한 꽃의 가치를 부정한다.</button><button type="button" class="choice" data-choice="2">② 화자는 꽃이 결국 시든다는 자연의 순리를 알지 못하기 때문에 현재 상태가 영원히 지속될 것이라고 확신한다.</button><button type="button" class="choice" data-choice="3">③ 화자는 절정을 지나 시들어 가는 꽃에서도 아름다움을 발견하고, 그 모습이 오래 지속되기를 바라면서도 자연의 순환을 고려할 때 사라질 아름다움에 대한 안타까움을 함께 드러낸다.</button><button type="button" class="choice" data-choice="4">④ 화자는 나비와 꽃의 관계를 갈등으로 파악하여 꽃의 아름다움이 훼손될 것을 경계한다.</button><button type="button" class="choice" data-choice="5">⑤ 작품의 핵심은 꽃의 생태를 객관적으로 설명하는 데 있으며 화자의 가치 판단이나 정서는 배제되어 있다.</button></div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ③</p><ol><li>① ‘고울사’는 반쯤 시든 꽃을 예찬하는 표현입니다.</li><li>② ‘매양’은 소망이지 실현 가능성에 대한 확신이 아닙니다.</li><li>③ 공식 해설의 예찬과 안타까움, 자연의 순리, 현재 상태의 지속 소망을 함께 반영합니다.</li><li>④ 꽃은 나비를 ‘웃고 맞이’합니다.</li><li>⑤ 작품은 화자의 감탄과 소망을 분명히 드러냅니다.</li></ol></div></section>
    <p>선택지를 누르면 정오답 판정과 선택지별 해설을 확인할 수 있습니다.</p>
  </section>
'''

s = s[:qstart] + ebs + quiz + s[qend:]

assert '월곡답가형 통일 구성' not in s
assert '교재 수록 원문과 공식 해설을 기준으로' not in s
assert '감탄적 표현과 돈호법' not in s
assert '역설적인 대상 인식' not in s
assert s.count('<section class="quiz" data-answer=') == 10
assert s.count('data-choice=') == 50
quizzes = re.findall(r'<section class="quiz"[\s\S]*?</section>', s)
assert len(quizzes) == 10
for q in quizzes:
    if '&lt;보기&gt;' in q:
        assert 'class="view"' in q, '보기 참조 문항에 실제 보기 상자가 없음'
assert 'id="lit-ebs-check"' in s

p.write_text(s, encoding='utf-8')
print('안민영 고울사 검수 완료')
