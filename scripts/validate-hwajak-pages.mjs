import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, "wordpress-content");

function text(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ").trim();
}
function count(source, pattern) {
  return [...source.matchAll(pattern)].length;
}
function fail(errors, slug, message) {
  errors.push(`${slug}: ${message}`);
}

const files = fs.readdirSync(CONTENT_DIR)
  .filter((name) => /^2027-suteuk-hwajak-(?!index)[a-z0-9]+\.html$/.test(name))
  .sort();
const articles = files.map((name) => ({ slug: name.replace(/\.html$/, "") }));
const errors = [];
const totals = { questions: 0, choices: 0, explanations: 0 };
const answers = new Map([[1,0],[2,0],[3,0],[4,0],[5,0]]);
const correctLengths = [];
const distractorLengths = [];

if (articles.length !== 57) fail(errors, "data", `57개 글이 필요하지만 ${articles.length}개임`);

for (const article of articles) {
  const slug = article.slug;
  const file = path.join(CONTENT_DIR, `${slug}.html`);
  if (!fs.existsSync(file)) {
    fail(errors, slug, "생성된 HTML 파일 없음");
    continue;
  }
  const html = fs.readFileSync(file, "utf8");
  const summaryLength = Number(html.match(/class="summary" data-summary-chars="(\d+)"/)?.[1] || 0);
  if (summaryLength < 695 || summaryLength > 1057) fail(errors, slug, `요약 길이 ${summaryLength}자`);

  const keyblankCount = count(html, /class="keyblank"/g);
  const flowblankCount = count(html, /class="flowblank"/g);
  if (keyblankCount !== 15) fail(errors, slug, `클릭형 괄호 ${keyblankCount}개`);
  if (flowblankCount !== 4) fail(errors, slug, `흐름 빈칸 ${flowblankCount}개`);

  const pointsBlock = html.match(/<ol class="points">([\s\S]*?)<\/ol>/)?.[1] || "";
  const pointCount = count(pointsBlock, /<li>/g);
  if (pointCount !== 10) fail(errors, slug, `출제 포인트 ${pointCount}개`);

  const questionBlocks = [...html.matchAll(/<section class="q" data-a="([1-5])" data-q="(\d+)">([\s\S]*?)<\/section>/g)];
  if (questionBlocks.length !== 10) fail(errors, slug, `변형문제 ${questionBlocks.length}개`);
  totals.questions += questionBlocks.length;

  const stemSet = new Set();
  for (const match of questionBlocks) {
    const answer = Number(match[1]);
    const qn = Number(match[2]);
    const body = match[3];
    answers.set(answer, answers.get(answer) + 1);

    const stem = text(body.match(/<h3>([\s\S]*?)<\/h3>/)?.[1] || "");
    if (stemSet.has(stem)) fail(errors, slug, `${qn}번 발문 중복`);
    stemSet.add(stem);

    const viewLength = Number(body.match(/data-view-chars="(\d+)"/)?.[1] || 0);
    if (viewLength < 304) fail(errors, slug, `${qn}번 보기 길이 ${viewLength}자`);

    const optionMatches = [...body.matchAll(/<button type="button" class="choice" data-c="([1-5])">([\s\S]*?)<\/button>/g)];
    const expMatches = [...body.matchAll(/<div class="choice-exp [^"]+" data-c="([1-5])" hidden>/g)];
    totals.choices += optionMatches.length;
    totals.explanations += expMatches.length;
    if (optionMatches.length !== 5) fail(errors, slug, `${qn}번 선택지 ${optionMatches.length}개`);
    if (expMatches.length !== 5) fail(errors, slug, `${qn}번 선택지별 해설 ${expMatches.length}개`);

    const options = optionMatches.map((m) => text(m[2]).replace(/^[①②③④⑤]\s*/, ""));
    if (new Set(options).size !== options.length) fail(errors, slug, `${qn}번 선택지 중복`);
    options.forEach((option, index) => {
      if (option.length < 42) fail(errors, slug, `${qn}번 ${index + 1}번 선택지가 지나치게 짧음(${option.length}자)`);
      if (/(항상|절대|무조건|전혀|오직|어떤 경우에도|예외 없이)/.test(option)) fail(errors, slug, `${qn}번 ${index + 1}번 선택지에 뻔한 극단 표현`);
      if (/(은\/는|이\/가|을\/를|와\/과|으로\/로|라고\/이라고)/.test(option)) fail(errors, slug, `${qn}번 ${index + 1}번 선택지에 조사 병기 오류`);
    });
    if (options.length === 5) {
      const correct = options[answer - 1].length;
      const others = options.filter((_, i) => i !== answer - 1).map((v) => v.length);
      const mean = others.reduce((a,b) => a+b,0) / others.length;
      correctLengths.push(correct);
      distractorLengths.push(...others);
      if (correct > mean * 1.65 + 12) fail(errors, slug, `${qn}번 정답 길이 편향 ${correct}/${mean.toFixed(1)}`);
    }
  }

  if (!/color:#111!important/.test(html)) fail(errors, slug, "선택지 기본 글자색 강제 규칙 없음");
  if (/핵심 내용을 파악한다는 점에서 적절하다|범용 자리표시자|TODO|lorem ipsum/i.test(html)) fail(errors, slug, "자리표시자 또는 범용 문구 발견");
}

const expectedAnswers = new Map([[1,114],[2,115],[3,114],[4,113],[5,114]]);
for (const [number, expected] of expectedAnswers) {
  if (answers.get(number) !== expected) fail(errors, "전체", `정답 ${number}번 ${answers.get(number)}개(기준 ${expected}개)`);
}
if (totals.questions !== 570) fail(errors, "전체", `문항 ${totals.questions}개`);
if (totals.choices !== 2850) fail(errors, "전체", `선택지 ${totals.choices}개`);
if (totals.explanations !== 2850) fail(errors, "전체", `선택지별 해설 ${totals.explanations}개`);

const correctMean = correctLengths.reduce((a,b)=>a+b,0) / Math.max(1,correctLengths.length);
const distractorMean = distractorLengths.reduce((a,b)=>a+b,0) / Math.max(1,distractorLengths.length);
if (Math.abs(correctMean - distractorMean) / distractorMean > 0.18) {
  fail(errors, "전체", `정답·오답 평균 길이 편향 ${correctMean.toFixed(1)}/${distractorMean.toFixed(1)}`);
}

if (errors.length) {
  console.error(`화법과 작문 검증 실패: ${errors.length}건`);
  for (const error of errors.slice(0, 120)) console.error(`- ${error}`);
  if (errors.length > 120) console.error(`- 그 밖의 오류 ${errors.length - 120}건`);
  process.exit(1);
}

console.log("화법과 작문 57개 게시글 검증 통과");
const summaryLengths = articles.map((article) => {
  const html = fs.readFileSync(path.join(CONTENT_DIR, `${article.slug}.html`), "utf8");
  return Number(html.match(/class="summary" data-summary-chars="(\d+)"/)?.[1] || 0);
});
console.log(`- 요약 길이: ${Math.min(...summaryLengths)}~${Math.max(...summaryLengths)}자`);
console.log("- 클릭형 괄호: 게시글당 15개");
console.log("- 흐름 빈칸: 게시글당 4개");
console.log("- 출제 포인트: 게시글당 10개");
console.log(`- 문항/선택지/해설: ${totals.questions}/${totals.choices}/${totals.explanations}`);
console.log(`- 정답 분포: ① ${answers.get(1)} / ② ${answers.get(2)} / ③ ${answers.get(3)} / ④ ${answers.get(4)} / ⑤ ${answers.get(5)}`);
console.log(`- 정답/오답 평균 길이: ${correctMean.toFixed(1)}/${distractorMean.toFixed(1)}자`);
