import fs from "node:fs";
import path from "node:path";

const CONTENT_DIR = path.join(process.cwd(), "wordpress-content");
const files = fs.readdirSync(CONTENT_DIR)
  .filter((name) => /^2027-suteuk-hwajak-(?!index)[a-z0-9]+\.html$/.test(name))
  .sort();

function text(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function lastHangul(value = "") {
  const chars = [...String(value)].filter((char) => /[가-힣]/u.test(char));
  return chars.at(-1) || "";
}

function jongseong(value = "") {
  const char = lastHangul(value);
  if (!char) return 0;
  return (char.charCodeAt(0) - 0xac00) % 28;
}

function expectedParticle(value, type) {
  const batchim = jongseong(value) !== 0;
  if (type === "topic") return batchim ? "은" : "는";
  if (type === "object") return batchim ? "을" : "를";
  if (type === "and") return batchim ? "과" : "와";
  return "";
}

const particleChecks = [
  [/([가-힣A-Za-z0-9·\-]+)(은|는)(?= 중심 화제이지만)/gu, "topic"],
  [/([가-힣A-Za-z0-9·\-]+)(과|와)(?=는 직접 연결되지)/gu, "and"],
  [/([가-힣A-Za-z0-9·\-]+)(은|는)(?= 결론에서 제외)/gu, "topic"],
  [/([가-힣A-Za-z0-9·\-]+)(과|와)(?=의 연관성)/gu, "and"],
  [/([가-힣A-Za-z0-9·\-]+)(을|를)(?= [가-힣A-Za-z0-9·\-]+의 결과로만)/gu, "object"],
  [/([가-힣A-Za-z0-9·\-]+)(과|와)(?=도 기능상)/gu, "and"],
  [/([가-힣A-Za-z0-9·\-]+)(과|와)(?= [가-힣A-Za-z0-9·\-]+(?:은|는) 서로 다른 역할)/gu, "and"],
  [/([가-힣A-Za-z0-9·\-]+)(은|는)(?= 서로 다른 역할)/gu, "topic"],
  [/([가-힣A-Za-z0-9·\-]+)(은|는)(?= 독자나 청자의 이해)/gu, "topic"],
  [/([가-힣A-Za-z0-9·\-]+)(과|와)(?= [가-힣A-Za-z0-9·\-]+의 선후 관계)/gu, "and"],
  [/([가-힣A-Za-z0-9·\-]+)(은|는)(?= 그 결과를 뒷받침)/gu, "topic"],
  [/([가-힣A-Za-z0-9·\-]+)(을|를)(?= 제시한 목적은)/gu, "object"],
];

const errors = [];
if (files.length !== 57) errors.push(`57개 글이 필요하지만 ${files.length}개임`);

for (const name of files) {
  const html = fs.readFileSync(path.join(CONTENT_DIR, name), "utf8");
  const visible = text(html.match(/<article class="hw">([\s\S]*?)<script>/)?.[1] || html);

  if (/\.(?:라고|이라는|라는|이라고)\b/u.test(visible)) {
    errors.push(`${name}: 마침표 뒤 인용 조사 결합 오류`);
  }
  if (/(?:냄새은|사례과|자료은|내용은은|후각은는|설명한다\.라고)/u.test(visible)) {
    errors.push(`${name}: 알려진 조사 결합 오류`);
  }

  for (const [pattern, type] of particleChecks) {
    for (const match of visible.matchAll(pattern)) {
      const word = match[1];
      const actual = match[2];
      const expected = expectedParticle(word, type);
      if (actual !== expected) {
        errors.push(`${name}: ${word}${actual} → ${word}${expected}`);
      }
    }
  }

  const choices = [...html.matchAll(/<button type="button" class="choice"[^>]*>([\s\S]*?)<\/button>/g)]
    .map((match) => text(match[1]));
  for (const [index, choice] of choices.entries()) {
    if (choice.length < 42) errors.push(`${name}: 선택지 ${index + 1}이 지나치게 짧음`);
    if (/^(?:①|②|③|④|⑤)?\s*(?:자료|내용|사례)만 반복/u.test(choice)) {
      errors.push(`${name}: 선택지 ${index + 1}이 범용 문구로 시작함`);
    }
  }
}

if (errors.length) {
  console.error(`화법과 작문 언어 검사 실패: ${errors.length}건`);
  errors.slice(0, 150).forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("화법과 작문 언어 검사 통과");
