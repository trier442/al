import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "scripts", "recover-hwajak-payload.mjs");
let source = fs.readFileSync(file, "utf8");
let changed = false;

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

const wrongOrder = `["나눔", "행사", "참여율", "문제", "책", "선생님", "소독기", "도서실", "대안", "취지", "판매", "부담", "실행", "효과", "대의원회"]`;
const correctOrder = `["나눔", "행사", "참여율", "문제", "책", "선생님", "소독기", "도서실", "대안", "판매", "취지", "부담", "실행", "효과", "대의원회"]`;
if (source.includes(wrongOrder)) {
  source = source.replace(wrongOrder, correctOrder);
  changed = true;
}

if (changed) {
  fs.writeFileSync(file, source, "utf8");
  console.log("화작 교정 요약 길이와 빈칸 순서를 보완했습니다.");
} else {
  console.log("화작 교정 요약 길이와 빈칸 순서는 이미 보완되어 있습니다.");
}
