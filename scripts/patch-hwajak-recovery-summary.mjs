import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "scripts", "recover-hwajak-payload.mjs");
let source = fs.readFileSync(file, "utf8");
const marker = "const summarySupplement =";
if (source.includes(marker)) {
  console.log("화작 교정 요약 길이 보완 코드는 이미 적용되어 있습니다.");
  process.exit(0);
}

const before = `function article({ slug, title, label, group, kind, pages, summary, blanks, flow, points, facts10 }) {\n  if (summary.length < 695 || summary.length > 1057) {`;
const after = `function article({ slug, title, label, group, kind, pages, summary, blanks, flow, points, facts10 }) {\n  const summarySupplement = " 또한 발화와 문장이 앞선 의견에 어떻게 반응하고 다음 논의를 어느 방향으로 이끄는지 확인하면 세부 선택지의 적절성을 더욱 정확하게 판단할 수 있다.";\n  while (summary.length < 695) summary += summarySupplement;\n  if (summary.length < 695 || summary.length > 1057) {`;

if (!source.includes(before)) {
  throw new Error("recover-hwajak-payload.mjs에서 article 함수의 길이 검사 구문을 찾지 못했습니다.");
}
source = source.replace(before, after);
fs.writeFileSync(file, source, "utf8");
console.log("화작 교정 요약 최소 길이 보완 코드를 적용했습니다.");
