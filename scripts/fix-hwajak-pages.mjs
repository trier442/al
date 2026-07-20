import fs from "node:fs";
import path from "node:path";

const CONTENT_DIR = path.join(process.cwd(), "wordpress-content");
const files = fs.readdirSync(CONTENT_DIR)
  .filter((name) => /^2027-suteuk-hwajak-(?!index)[a-z0-9]+\.html$/.test(name))
  .sort();

function lastHangul(value = "") {
  const chars = [...String(value)].filter((char) => /[가-힣]/u.test(char));
  return chars.at(-1) || "";
}

function jongseong(value = "") {
  const char = lastHangul(value);
  if (!char) return 0;
  return (char.charCodeAt(0) - 0xac00) % 28;
}

function particle(value, type) {
  const jong = jongseong(value);
  const batchim = jong !== 0;
  if (type === "topic") return batchim ? "은" : "는";
  if (type === "object") return batchim ? "을" : "를";
  if (type === "and") return batchim ? "과" : "와";
  return "";
}

function ensureSentence(value = "") {
  const text = String(value).trim();
  return /[.!?]$/u.test(text) ? text : `${text}.`;
}

function fixParticles(html) {
  const token = "([가-힣A-Za-z0-9·\\-]+)";
  const replacements = [
    [new RegExp(`${token}(은|는)(?= 중심 화제이지만)`, "gu"), "topic"],
    [new RegExp(`${token}(과|와)(?=는 직접 연결되지)`, "gu"), "and"],
    [new RegExp(`${token}(은|는)(?= 결론에서 제외)`, "gu"), "topic"],
    [new RegExp(`${token}(과|와)(?=의 연관성)`, "gu"), "and"],
    [new RegExp(`${token}(을|를)(?= [가-힣A-Za-z0-9·\\-]+의 결과로만)`, "gu"), "object"],
    [new RegExp(`${token}(과|와)(?=도 기능상)`, "gu"), "and"],
    [new RegExp(`${token}(과|와)(?= [가-힣A-Za-z0-9·\\-]+(?:은|는) 서로 다른 역할)`, "gu"), "and"],
    [new RegExp(`${token}(은|는)(?= 서로 다른 역할)`, "gu"), "topic"],
    [new RegExp(`${token}(은|는)(?= 독자나 청자의 이해)`, "gu"), "topic"],
    [new RegExp(`${token}(과|와)(?= [가-힣A-Za-z0-9·\\-]+의 선후 관계)`, "gu"), "and"],
    [new RegExp(`${token}(은|는)(?= 그 결과를 뒷받침)`, "gu"), "topic"],
    [new RegExp(`${token}(을|를)(?= 제시한 목적은)`, "gu"), "object"],
  ];

  let output = html;
  for (const [pattern, type] of replacements) {
    output = output.replace(pattern, (match, word) => `${word}${particle(word, type)}`);
  }
  return output;
}

function fixExplanations(html) {
  let output = html;
  output = output.replace(
    /정답\. ([^<]+?)라는 내용이 자료에 직접 제시되며, 이 선택지는 주체·범위·인과 관계를 바꾸지 않고 설명하였다\./gu,
    (match, fact) => `정답. 자료의 실제 내용은 다음과 같다. ${ensureSentence(fact)} 이 선택지는 주체·범위·인과 관계를 바꾸지 않고 설명하였다.`,
  );
  output = output.replace(
    /오답\. 이 선택지는 ([^<]+?)라고 보아 자료의 관계나 기능을 바꾸었다\. 자료에서는 오히려 ([^<]+?)라고 설명한다\./gu,
    (match, option, fact) => `오답. 선택지는 다음과 같이 판단하고 있다. ${ensureSentence(option)} 그러나 이 판단은 자료의 관계나 기능을 바꾼 것이다. 자료의 실제 내용은 다음과 같다. ${ensureSentence(fact)}`,
  );
  return output;
}

if (files.length !== 57) {
  throw new Error(`화법과 작문 게시글 57개가 필요하지만 ${files.length}개를 찾았습니다.`);
}

let changed = 0;
for (const name of files) {
  const file = path.join(CONTENT_DIR, name);
  const before = fs.readFileSync(file, "utf8");
  const after = fixExplanations(fixParticles(before));
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    changed += 1;
  }
}

console.log(`화법과 작문 문장 보정 완료: ${changed}/${files.length}개 파일 수정`);
