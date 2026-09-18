import fs from "node:fs";
import path from "node:path";

const fileArg = process.argv[2];
if (!fileArg) throw new Error("검증할 화작 HTML 파일 경로가 필요합니다.");
const file = path.resolve(fileArg);
if (!fs.existsSync(file)) throw new Error(`검증 대상 파일이 없습니다: ${fileArg}`);

function text(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ").trim();
}
function count(source, pattern) { return [...source.matchAll(pattern)].length; }

const html = fs.readFileSync(file, "utf8");
const name = path.basename(file);
const errors = [];
const summaryLength = Number(html.match(/class="summary" data-summary-chars="(\d+)"/)?.[1] || 0);
if (summaryLength < 695 || summaryLength > 1057) errors.push(`요약 길이 ${summaryLength}자`);
if (count(html, /class="keyblank"/g) !== 15) errors.push(`클릭형 괄호 ${count(html,/class="keyblank"/g)}개`);
if (count(html, /class="flowblank"/g) !== 4) errors.push(`흐름 빈칸 ${count(html,/class="flowblank"/g)}개`);
const pointsBlock = html.match(/<ol class="points">([\s\S]*?)<\/ol>/)?.[1] || "";
if (count(pointsBlock, /<li>/g) !== 10) errors.push(`출제 포인트 ${count(pointsBlock,/\<li>/g)}개`);

const qs = [...html.matchAll(/<section class="q" data-a="([1-5])" data-q="(\d+)">([\s\S]*?)<\/section>/g)];
if (qs.length !== 10) errors.push(`변형문제 ${qs.length}개`);
for (const m of qs) {
  const qn = Number(m[2]), body = m[3];
  const viewLength = Number(body.match(/data-view-chars="(\d+)"/)?.[1] || 0);
  if (viewLength < 304) errors.push(`${qn}번 보기 길이 ${viewLength}자`);
  const opts = [...body.matchAll(/<button type="button" class="choice" data-c="([1-5])">([\s\S]*?)<\/button>/g)]
    .map(x => text(x[2]).replace(/^[①②③④⑤]\s*/, ""));
  const exps = [...body.matchAll(/<div class="choice-exp [^"]+" data-c="([1-5])" hidden>/g)];
  if (opts.length !== 5) errors.push(`${qn}번 선택지 ${opts.length}개`);
  if (exps.length !== 5) errors.push(`${qn}번 선택지별 해설 ${exps.length}개`);
  opts.forEach((o,i) => {
    if (o.length < 42) errors.push(`${qn}번 ${i+1}번 선택지가 지나치게 짧음(${o.length}자)`);
    if (/(항상|절대|무조건|전혀|오직|어떤 경우에도|예외 없이)/.test(o)) errors.push(`${qn}번 ${i+1}번 선택지에 극단 표현`);
  });
}
if (!/color:#111!important/.test(html)) errors.push("선택지 기본 글자색 강제 규칙 없음");
if (/(TODO|lorem ipsum|범용 자리표시자)/i.test(html)) errors.push("자리표시자 발견");
const visible = text(html.match(/<article class="hw">([\s\S]*?)<script>/)?.[1] || html);
if (/(냄새은|사례과|자료은|내용은은|후각은는|설명한다\.라고)/u.test(visible)) errors.push("알려진 조사 결합 오류");

if (errors.length) {
  console.error(`화작 단일 검증 실패: ${name} — ${errors.length}건`);
  errors.forEach(e => console.error(`- ${e}`));
  process.exit(1);
}
console.log(`화작 단일 검증 통과: ${name}`);
console.log(`- 요약 ${summaryLength}자 / 핵심 빈칸 15 / 흐름 빈칸 4 / 출제 포인트 10 / 변형문제 10`);
