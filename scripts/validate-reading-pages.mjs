import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contentDir = path.join(root, "wordpress-content");
const source = JSON.parse(fs.readFileSync(path.join(root, "scripts/data/2027-reading-source.json"), "utf8"));
const failures = [];

function text(value) {
  return String(value || "")
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function assert(condition, page, message) {
  if (!condition) failures.push(`${String(page).padStart(2, "0")}: ${message}`);
}

function reconstruct(block, blankClass) {
  return text(block.replace(new RegExp(`<span class="paren-wrap">\\(<button[^>]*class="[^"]*${blankClass}[^"]*"[\\s\\S]*?<span class="blank-answer" hidden>([\\s\\S]*?)<\\/span><\\/button>\\)<\\/span>`, "g"), "$1"));
}

const forbidden = /(?:나해제|다해제|답[①②③④⑤]|정답이 정답인 이유|오답이 오답인 이유|제시하고 있지 않|설명하고 있지 않|양자점은코어|세 포 리프로그래밍|롤 런 드|샤 드|포도상 구 균|최적 조절 법|안정 모 멘트|양 중 모 멘트|않게하려고|하려고한|기도한다|해야함|하고자함|하고자했|\d+\s+문\s*단)/;

for (const page of source.pages) {
  const file = path.join(contentDir, `2027-suteuk-reading-${String(page.number).padStart(2, "0")}.html`);
  const html = fs.readFileSync(file, "utf8");
  const parenAnswers = [...html.matchAll(/class="blank-answer" hidden>([\s\S]*?)<\/span>/g)]
    .slice(0, 10).map((match) => text(match[1]));
  const coreSection = (html.match(/<section id="read-core">([\s\S]*?)<\/section>/) || [])[1] || "";
  const coreCards = [...coreSection.matchAll(/<div class="core-card">([\s\S]*?)<\/div>/g)].map((match) => match[1]);
  const pointBlock = (html.match(/<ol class="points">([\s\S]*?)<\/ol>/) || [])[1] || "";
  const points = [...pointBlock.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((match) => text(match[1]));
  const quizzes = [...html.matchAll(/<section class="quiz" data-answer="([1-5])">([\s\S]*?)<\/section>/g)];

  assert((html.match(/<article class="sut-read">/g) || []).length === 1, page.number, "표준 본문 래퍼가 1개가 아님");
  assert(/<!-- revision: 2 -->/.test(html), page.number, "revision 2 메타데이터 누락");
  assert((html.match(/class="study-blank paren-blank"/g) || []).length === 10, page.number, "괄호형 문제가 10개가 아님");
  assert(parenAnswers.length === 10 && new Set(parenAnswers).size === 10, page.number, "괄호형 정답이 중복되거나 10개가 아님");
  assert(coreCards.length === page.parts.length, page.number, "핵심 요약의 제시문 구분 수 불일치");
  coreCards.forEach((card, index) => {
    const paragraph = (card.match(/<p class="core-summary">([\s\S]*?)<\/p>/) || [])[1] || "";
    assert(reconstruct(paragraph, "paren-blank") === page.parts[index].summary, page.number, `핵심 요약 ${index + 1} 원문 대조 실패`);
  });
  const expectedFlows = page.parts.reduce((sum, part) => sum + part.flow.length, 0);
  assert((html.match(/class="study-blank square-blank"/g) || []).length === expectedFlows, page.number, "문단별 네모 빈칸 수 불일치");
  assert(points.length === 10 && new Set(points).size === 10, page.number, "출제 포인트가 10개가 아니거나 중복됨");
  assert(!points.some((point) => forbidden.test(point) || /^\([가나다]\)(?:는|에서는|의)/.test(point)), page.number, "출제 포인트에 해설 메타/병합 문장이 섞임");
  assert(quizzes.length === 10, page.number, "변형문제가 10개가 아님");
  quizzes.forEach((quiz, index) => {
    const body = quiz[2];
    assert((body.match(/class="choice"/g) || []).length === 5, page.number, `${index + 1}번 선택지가 5개가 아님`);
    assert((body.match(/<li><strong>[①②③④⑤]<\/strong>/g) || []).length === 5, page.number, `${index + 1}번 선택지별 해설이 5개가 아님`);
    assert(/<div class="view"><strong>보기<\/strong><div>[\s\S]+<\/div><\/div>/.test(body), page.number, `${index + 1}번 보기가 비어 있음`);
    assert(/<div class="answer-ground"><strong>정답 근거<\/strong>/.test(body), page.number, `${index + 1}번 정답 근거 누락`);
  });
  assert(!forbidden.test(html), page.number, "페이지에 PDF 병합/띄어쓰기 잔재가 남음");
  assert((html.match(/<div class="premium-ad">/g) || []).length <= 2, page.number, "프리미엄 안내 중복");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({
  pages: source.pages.length,
  coreSummaries: source.pages.reduce((sum, page) => sum + page.parts.length, 0),
  parentheticalQuestions: source.pages.length * 10,
  paragraphBlanks: source.pages.reduce((sum, page) => sum + page.parts.reduce((inner, part) => inner + part.flow.length, 0), 0),
  points: source.pages.length * 10,
  quizzes: source.pages.length * 10,
  status: "ok",
}, null, 2));
