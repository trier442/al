// Keep transformed questions and EBS explanations solvable without the copyrighted source problem text.
import fs from 'node:fs';
import path from 'node:path';

const target = path.join('wordpress-content', '2027-suteuk-hwajak-s01a.html');
if (!fs.existsSync(target)) {
  console.log('hwajak patch target not found; skip');
  process.exit(0);
}

let html = fs.readFileSync(target, 'utf8');

function replaceOnce(oldText, newText, label) {
  if (html.includes(newText)) {
    console.log(`${label}: already applied`);
    return;
  }
  if (!html.includes(oldText)) {
    throw new Error(`${label}: source text not found`);
  }
  html = html.replace(oldText, newText);
  console.log(`${label}: applied`);
}

function replaceBlock(startMarker, endMarker, replacement, label) {
  if (html.includes(replacement)) {
    console.log(`${label}: already applied`);
    return;
  }
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  if (start < 0 || end < 0) {
    throw new Error(`${label}: block marker not found`);
  }
  html = html.slice(0, start) + replacement + '\n' + html.slice(end);
  console.log(`${label}: applied`);
}

html = html.replace('<!-- revision: 3 -->', '<!-- revision: 4 -->');

const detailBlock = `<div class="tip"><strong>교재 문항 해설 — 원문 문제 없이 이해하기</strong><br><br><strong>01 · 발표 표현 전략｜정답 ②</strong><br>이 문항은 발표자가 어떤 말하기 방식과 표현 전략을 사용해 청중의 이해와 참여를 돕는지를 판단하는 문제이다. 원문 문제를 보지 않아도 핵심은 ‘구체적인 사례의 기능’을 파악하는 데 있다. 발표자는 후각의 특성을 추상적으로만 설명하지 않고, 된장찌개 냄새를 맡았을 때 어린 시절의 기억이나 감정이 떠오르는 사례, 향수 냄새에 계속 노출되면 처음보다 냄새가 약하게 느껴지는 사례, 배고플 때 맡는 라면 냄새와 오랫동안 라면만 먹은 사람이 맡는 라면 냄새가 다르게 느껴질 수 있다는 사례 등을 제시한다. 이 사례들은 각각 후각과 감정·기억의 관계, 후각 적응, 경험에 따른 냄새 지각의 차이를 생활 경험과 연결해 이해하도록 돕는다. 따라서 ‘발표 내용과 관련된 구체적 사례를 들어 청중의 이해를 돕는다’는 판단이 핵심이다.<br><br><strong>01의 오답을 가르는 기준</strong><br>발표 마지막에 분무기로 향을 뿌리는 행동은 비언어적 표현으로서 발표의 표현력을 높이고 청중의 몰입이나 체험을 돕는 기능은 할 수 있다. 그러나 이 발표는 어떤 주장에 동의하도록 설득하는 담화가 아니므로 이를 ‘전달 내용의 설득력을 강화한다’고 해석하면 안 된다. 또한 청중이 앞서 의문을 제기한 장면이 없으므로 ‘청중이 제기한 의문을 해소한다’는 판단도 맞지 않는다. 마지막 질문은 후각의 세 특징을 이해했는지 시험하는 질문이 아니라, 같은 향이 청중 각자에게 어떻게 느껴지는지를 묻는 반응 유도 질문이다. 도입에서도 냄새와 관련된 일상적 발화를 통해 관심을 환기하고 주제를 제시할 뿐, 발표 순서를 미리 안내하지 않는다.<br><br><strong>02 · 발표 내용 생성｜정답 ④</strong><br>이 문항은 발표 전에 세운 내용 구성 계획이 실제 발표에 반영되었는지를 확인하는 문제이다. 판단할 때에는 비슷한 소재가 등장했는지만 볼 것이 아니라, 계획에 포함된 구체적인 행위와 설명 방식까지 실제로 구현되었는지를 확인해야 한다. 발표에는 분자식은 같지만 삼차원 구조가 다른 입체 이성질체가 서로 다른 냄새를 낼 수 있다는 사례가 제시된다. 그러나 ‘냄새 분자를 화학적으로 분석한 자료’를 제시하지도 않고, 그런 분석 자료를 근거로 사람이 냄새를 지각하는 원리를 단계적인 인과 관계로 설명하지도 않는다. 따라서 입체 이성질체라는 소재가 등장했다는 이유만으로 해당 계획이 반영되었다고 볼 수 없으며, 이 계획이 실제 발표에 반영되지 않았다는 판단이 정답이 된다.<br><br><strong>02에서 실제로 반영된 계획</strong><br>도입에서는 냄새에 관한 일상적 발화를 제시하여 청중의 관심을 환기한다. 전개에서는 후각의 개념을 먼저 정의하고 후각의 독특한 특징을 세 가지로 항목화한다. 또한 시각·청각 정보가 시상을 거쳐 감각 피질로 전달되는 것과 후각 정보가 후각 피질로 바로 전달되는 것을 대조하여 후각의 전달 특징을 부각한다. 정리에서는 앞의 내용을 묶어 냄새가 분자 구조·농도와 관련된 물리적·객관적 자극이면서, 경험·상황·문화 등에 따라 달라지는 심리적·주관적 자극이라는 점을 강조한다. 즉 02번은 ‘계획의 핵심 조건이 실제 발표에서 모두 구현되었는가’를 세밀하게 확인하는 문제로 이해하면 된다.</div>
<div class="warn"><strong>시험에서 자주 걸리는 오답 함정</strong><br>① 비언어적 표현이 등장했다고 해서 곧바로 ‘설득력 강화’로 연결하지 않는다. 발표 목적이 정보 전달인지 설득인지 먼저 확인해야 한다.<br>② 질문이 있다고 해서 모두 ‘이해 점검’은 아니다. 마지막 질문은 정답을 요구하거나 이해 정도를 확인하는 것이 아니라 같은 향에 대한 청중의 느낌과 반응을 이끌어 내는 질문이다.<br>③ 발표 계획 문제에서는 소재가 비슷하게 등장했다는 사실만으로 ‘계획이 반영되었다’고 판단하지 않는다. ‘자료를 활용한다’, ‘인과적으로 설명한다’처럼 계획에 붙은 구체적 조건까지 실제 발화에 구현되었는지를 확인해야 한다.<br>④ 도입에서 주제를 제시하는 것과 발표 순서를 안내하는 것은 다르다. 이 발표는 일상적 발화로 관심을 끈 뒤 주제를 밝히지만, 뒤에서 다룰 내용의 순서를 미리 나열하지 않는다.</div>`;

replaceBlock(
  '<div class="tip"><strong>EBS 교재 문항 핵심</strong>',
  '<h2>풍부한 &lt;보기&gt;를 활용한 변형문제 10제</h2>',
  detailBlock,
  'expand EBS explanation'
);

replaceOnce(
  '<h3>3. EBS 교재 01번과 관련하여 발표자의 말하기 방식을 이해한 것으로 가장 적절한 것은?</h3>',
  '<h3>3. 발표자의 말하기 방식과 표현 전략을 이해한 것으로 가장 적절한 것은?</h3>',
  'remove EBS number dependency from question 3'
);
replaceOnce(
  '<strong>② 해설</strong> 정답. EBS 해설도 발표 내용과 관련된 사례를 제시함으로써 청중의 이해를 돕고 있다는 점을 정답 근거로 제시한다.',
  '<strong>② 해설</strong> 정답. 된장찌개·향수·라면과 같은 구체적 사례는 후각의 특징과 냄새 지각의 차이를 청중이 자신의 경험과 연결해 이해하도록 돕는다.',
  'make question 3 explanation self-contained'
);
replaceOnce(
  '<h3>8. EBS 교재 02번의 발표 계획과 실제 발표의 관계를 설명한 것으로 가장 적절한 것은?</h3>',
  '<h3>8. 발표 계획과 실제 발표의 관계를 설명한 것으로 가장 적절한 것은?</h3>',
  'remove EBS number dependency from question 8'
);
replaceOnce(
  '<strong>① 해설</strong> 정답. EBS 해설은 입체 이성질체 사례가 등장하더라도 화학 분석 자료를 활용해 냄새 지각 원리를 인과적으로 설명한 것은 아니므로 해당 계획이 반영되지 않았다고 판단한다.',
  '<strong>① 해설</strong> 정답. 입체 이성질체 사례가 등장하더라도 화학 분석 자료를 활용해 냄새 지각 원리를 인과적으로 설명한 것은 아니다. 계획에 포함된 핵심 조건이 실제 발표에서 구현되지 않았으므로 해당 계획은 반영되지 않은 것으로 판단해야 한다.',
  'make question 8 explanation self-contained'
);

fs.writeFileSync(target, html, 'utf8');
console.log('hwajak source-grounded text patches complete');
