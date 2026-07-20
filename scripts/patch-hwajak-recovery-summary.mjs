import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "scripts", "recover-hwajak-payload.mjs");
let source = fs.readFileSync(file, "utf8");
let changed = false;

const oldMakeSpans = `function makeSpans(summary, answers) {\n  let cursor = 0;\n  return answers.map((answer) => {\n    const start = summary.indexOf(answer, cursor);\n    if (start < 0) throw new Error(\`요약에서 빈칸 정답을 찾지 못했습니다: \${answer}\`);\n    const end = start + answer.length;\n    cursor = end;\n    return { start, end, answer };\n  });\n}`;
const newMakeSpans = `function makeSpans(summary, answers) {\n  const occupied = [];\n  const spans = answers.map((answer) => {\n    let searchFrom = 0;\n    let start = -1;\n    while (searchFrom <= summary.length) {\n      const candidate = summary.indexOf(answer, searchFrom);\n      if (candidate < 0) break;\n      const end = candidate + answer.length;\n      const overlaps = occupied.some((span) => candidate < span.end && end > span.start);\n      if (!overlaps) { start = candidate; break; }\n      searchFrom = candidate + 1;\n    }\n    if (start < 0) throw new Error(\`요약에서 빈칸 정답을 찾지 못했습니다: \${answer}\`);\n    const span = { start, end: start + answer.length, answer };\n    occupied.push(span);\n    return span;\n  });\n  return spans.sort((a, b) => a.start - b.start);\n}`;
if (source.includes(oldMakeSpans)) {
  source = source.replace(oldMakeSpans, newMakeSpans);
  changed = true;
}

const marker = "const summarySupplement =";
if (!source.includes(marker)) {
  const before = `function article({ slug, title, label, group, kind, pages, summary, blanks, flow, points, facts10 }) {\n  if (summary.length < 695 || summary.length > 1057) {`;
  const after = `function article({ slug, title, label, group, kind, pages, summary, blanks, flow, points, facts10 }) {\n  const summarySupplement = " 또한 발화와 문장이 앞선 의견에 어떻게 반응하고 다음 논의를 어느 방향으로 이끄는지 확인하면 세부 선택지의 적절성을 더욱 정확하게 판단할 수 있다.";\n  while (summary.length < 695) summary += summarySupplement;\n  if (summary.length < 695 || summary.length > 1057) {`;
  if (!source.includes(before)) {
    throw new Error("recover-hwajak-payload.mjs에서 article 함수의 길이 검사 구문을 찾지 못했습니다.");
  }
  source = source.replace(before, after);
  changed = true;
}

const variants = [
  `["나눔", "행사", "참여율", "문제", "책", "선생님", "소독기", "도서실", "대안", "취지", "판매", "부담", "실행", "효과", "대의원회"]`,
  `["나눔", "행사", "참여율", "문제", "책", "선생님", "소독기", "도서실", "대안", "판매", "취지", "부담", "실행", "효과", "대의원회"]`,
];
const finalOrder = `["나눔", "행사", "참여율", "문제", "책", "선생님", "소독기", "도서실", "대안", "판매", "취지", "부담", "효과", "대의원회", "실행"]`;
for (const variant of variants) {
  if (source.includes(variant)) {
    source = source.replace(variant, finalOrder);
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(file, source, "utf8");
  console.log("화작 교정 요약 길이와 빈칸 위치 자동 정렬을 적용했습니다.");
} else {
  console.log("화작 교정 요약 길이와 빈칸 위치 자동 정렬은 이미 적용되어 있습니다.");
}
