import fs from 'node:fs';

const file = 'wordpress-content/2027-suteuk-kim-sowol-gil.html';
let html = fs.readFileSync(file, 'utf8');

const oldQ7 = '<section class="quiz" data-answer="4"><h3>7. &lt;보기&gt;를 참고한 감상으로 가장 적절한 것은?</h3><div class="choices">';
const view = '<div class="view"><b>&lt;보기&gt;</b><br>문학 작품의 의미는 작품 내부의 표현뿐 아니라 창작 당시의 사회·역사적 맥락을 함께 고려하여 확장할 수 있다. 김소월 「길」에는 고향을 두고도 돌아가지 못한 채 목적지 없이 떠도는 화자가 나타난다. 이 작품이 쓰인 일제 강점기에는 삶의 터전을 잃고 유랑하거나 주체적인 삶의 방향을 확보하기 어려운 현실이 존재했다. 다만 시대적 맥락을 활용한 감상은 작품 내부의 구체적인 표현을 근거로 이루어져야 한다.</div>';
const newQ7 = '<section class="quiz" data-answer="4"><h3>7. &lt;보기&gt;를 참고한 감상으로 가장 적절한 것은?</h3>' + view + '<div class="choices">';

if (!html.includes(oldQ7)) {
  throw new Error('7번 문항의 예상 원문을 찾지 못했습니다. 임의 수정하지 않습니다.');
}
html = html.replace(oldQ7, newQ7);
html = html.replace('<!-- revision: 4 -->', '<!-- revision: 5 -->');

const quizzes = [...html.matchAll(/<section class="quiz"[\s\S]*?<\/section>/g)].map(m => m[0]);
const missing = [];
for (const q of quizzes) {
  const h = q.match(/<h3>([\s\S]*?)<\/h3>/)?.[1] ?? '';
  if ((h.includes('&lt;보기&gt;') || h.includes('<보기>')) && !q.includes('class="view"')) {
    missing.push(h.replace(/<[^>]+>/g, ''));
  }
}
if (missing.length) throw new Error('보기 누락 문항: ' + missing.join(' | '));

fs.writeFileSync(file, html);
console.log('김소월 「길」 7번 보기 삽입 및 보기 누락 검증 완료');
