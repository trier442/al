import fs from 'node:fs';
import path from 'node:path';

const target = path.join('wordpress-content', '2027-suteuk-hwajak-s01b.html');
if (!fs.existsSync(target)) throw new Error(`target not found: ${target}`);
let html = fs.readFileSync(target, 'utf8');

html = html.replace('<!-- revision: 3 -->', '<!-- revision: 4 -->');

const blank = (answer) => `<button type="button" class="keyblank" aria-pressed="false"><span class="kb-mask">□□□□</span><span class="kb-answer" hidden>${answer}</span></button>`;

const extraBlanks = [
  ['AI 역시 창의적 주체로 볼 수 있다는 것이다.', `AI 역시 ${blank('창의적 주체')}로 볼 수 있다는 것이다.`],
  ['반대 신문에서는 상대 주장의', `${blank('반대 신문')}에서는 상대 주장의`],
  ['AI 학습과 인간의 학습 사이의 유사성을 강조한다.', `AI 학습과 인간의 학습 사이의 ${blank('유사성')}을 강조한다.`],
];
for (const [from, to] of extraBlanks) {
  if (html.includes(from) && !html.includes(to)) html = html.replace(from, to);
}

const textbook = `<div class="tip"><strong>교재 문항 해설 — 원문 문제 없이 이해하기</strong><br><br>
<strong>04 · 토론 표현 전략 사용하기｜정답 ⑤</strong><br>
이 문항은 토론 시작 부분에서 사회자가 논제를 어떤 방식으로 소개하는지 묻는다. 사회자는 AI가 고흐나 렘브란트의 화풍을 모방해 그림을 만들거나 특정 음악가의 스타일로 곡을 만드는 사례, AI 작품이 경매에서 거래되거나 미술관에 전시된 사례 등 AI의 예술 창작과 관련된 여러 구체적 사례를 먼저 제시한다. 그런 뒤 AI가 인간 고유의 영역으로 여겨지던 예술 분야에서 실제로 두각을 나타내고 있는 상황을 보여 주어 ‘AI를 예술가로 인정할 수 있는가’를 논의할 필요가 있음을 부각한다. 따라서 핵심은 ‘논제와 관련된 다양한 사례를 제시하여 논의의 필요성을 드러낸다’는 것이다.<br><br>
<strong>04의 오답을 가르는 기준</strong><br>
사회자의 도입에는 전문가의 견해 인용, 핵심 용어의 정의, 뉴스 기사를 찬성과 반대로 분류하는 과정, 출처가 분명한 통계 수치의 제시가 없다. AI 창작 사례가 여럿 등장한다는 사실을 ‘통계 자료’나 ‘전문가 인용’으로 바꾸어 읽으면 안 된다.<br><br>
<strong>05 · 토론의 쟁점과 참여자 입장 파악하기｜정답 ③</strong><br>
이 문항은 세 쟁점과 각 참여자의 실제 발언을 정확히 대응시키는 문제이며, ‘적절하지 않은 것’을 찾는 유형이다. 첫째 쟁점은 ‘예술이란 무엇인가’, 둘째는 ‘예술에서 독창성·창의성은 무엇인가’, 셋째는 ‘예술을 구성하는 요건으로 감정이 반드시 반영되어야 하는가’이다. 찬성 측은 예술의 어원에 ‘숙련된 기술’의 의미가 포함되어 있다는 점을 근거로 AI의 예술 활동 가능성을 주장한다. 반대 측은 예술에는 미적 가치를 만들려는 창작 주체의 의도가 필요하며, 독창성과 창의성도 창작자의 경험과 고유한 개성에 바탕을 두어야 한다고 본다. 또 AI는 직접 경험에서 생기는 감정을 이해하지 못하므로 감상자에게 깊은 감동을 주는 예술의 본질적 가치를 구현하기 어렵다고 주장한다.<br><br>
③이 오답인 이유가 가장 중요하다. ‘사람이 그린 그림과 AI가 만든 그림을 구별하지 못했다’는 실험은 반대 측이 AI의 독창성 부재를 입증하기 위해 든 사례가 아니다. 이 자료는 찬성 측이 AI 작품의 작품성을 뒷받침하는 근거로 제시한 것이고, 반대 측은 이후 반대 신문에서 그 연구의 출처와 표본의 대표성을 문제 삼는다. 즉 ‘누가 그 자료를 처음 근거로 사용했는가’와 ‘누가 그 자료의 신뢰성을 검토했는가’를 구별해야 한다.<br><br>
<strong>06 · 반대 신문과 답변 평가하기｜정답 ③</strong><br>
이 문항은 반대 신문에서 상대 논증의 공정성·신뢰성·타당성을 어떻게 검토하는지, 그리고 답변자가 어떤 방식으로 자신의 입론을 옹호하는지를 판단하게 한다. 정답인 ③의 핵심은 찬성 측이 ‘창의력은 아이디어의 패턴을 파악하고 작은 단위로 분해해 새롭게 조합하는 능력’이라는 전문가의 견해를 제시하여, ‘인간만이 창의성을 지닌다’는 반대 측 입론의 전제가 타당한지 의문을 제기했다는 점이다.<br><br>
<strong>06의 오답을 가르는 기준</strong><br>
‘AI가 학습하는 데이터는 인간이 제공하므로 AI는 창작의 보조 도구에 불과한 것 아니냐’는 반대 측 질문은 찬성 측의 독창성 주장 자체가 성립하는지를 따지는 것이므로 공정성보다 <strong>타당성</strong>의 문제이다. 반면 ‘구체적으로 어떤 논문인가’, ‘실험 참가자의 수와 특성이 대표성을 갖는가’를 묻는 것은 자료의 출처와 표본을 확인하는 것이므로 <strong>신뢰성</strong>을 검토하는 질문이다. 또한 찬성 측이 ‘인간 화가도 다른 작품을 보고 배우며 자기 스타일을 만든다’고 답한 것은 자신의 주장을 옹호하는 반박이지, 상대가 특정 관점을 편파적으로 옹호한다고 비난한 것이 아니다. 반대 측의 답변 역시 자신의 의견을 제시할 뿐 별도의 예시를 들어 근거를 보강한 것은 아니다.</div>`;

const tipRe = /<div class="tip"><strong>교재 문항 해설 — 원문 문제 없이 이해하기<\/strong>[\s\S]*?<\/div>\s*(?=<div class="warn">)/;
if (!tipRe.test(html)) throw new Error('textbook explanation block not found');
html = html.replace(tipRe, textbook + '\n');

html = html
  .replace(/EBS 교재 \d+번과 관련하여 /g, '')
  .replace(/EBS 교재 \d+번의 /g, '')
  .replace(/EBS \d+번과 관련하여 /g, '')
  .replace(/EBS \d+번의 /g, '');

const count = (html.match(/class="keyblank"/g) || []).length;
if (count < 15) throw new Error(`클릭형 괄호가 부족합니다: ${count}개`);

fs.writeFileSync(target, html, 'utf8');
console.log(`AI artist single-page patch complete: keyblank ${count}개`);
