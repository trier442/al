import fs from "node:fs";
import path from "node:path";

const contentDir = path.join(process.cwd(), "wordpress-content");
const indexPath = path.join(contentDir, "2027-suteuk-literature-index.html");

function metaValue(html, key) {
  const match = html.match(new RegExp(`<!--\\s*${key}\\s*:\\s*(.*?)\\s*-->`));
  return match ? match[1].trim() : "";
}

function normalizedSlug(value) {
  try {
    return decodeURIComponent(value).replace(/^\/+|\/+$/g, "");
  } catch {
    return value.replace(/^\/+|\/+$/g, "");
  }
}

function plainText(value) {
  return value.replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
}

const files = fs.readdirSync(contentDir).filter((name) => name.endsWith(".html")).map((name) => {
  const html = fs.readFileSync(path.join(contentDir, name), "utf8");
  return { name, html, slug: normalizedSlug(metaValue(html, "slug")), title: metaValue(html, "title") };
});
const bySlug = new Map(files.filter((file) => file.slug).map((file) => [file.slug, file]));
const indexHtml = fs.readFileSync(indexPath, "utf8");
const cards = [...indexHtml.matchAll(/<a class="mk-lit-card"([^>]*)href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/g)].map((match) => {
  const attrs = `${match[1]} ${match[3]}`;
  const categories = (attrs.match(/data-categories="([^"]*)"/) || [])[1] || "";
  const slug = normalizedSlug(new URL(match[2]).pathname);
  let file = bySlug.get(slug);
  if (!file) {
    const cardTitle = plainText(match[4]).replace(/[\s「」『』·\[\]]/g, "");
    const candidates = files.filter((item) => {
      const title = plainText(item.title).replace(/[\s「」『』·\[\]]/g, "");
      return title && cardTitle && (title.includes(cardTitle) || cardTitle.includes(title));
    });
    if (candidates.length === 1) [file] = candidates;
  }
  return { categories, slug, file };
});

const errors = [];
const totals = { pages: cards.length, poetry: 0, prose: 0, quizzes: 0, choices: 0, solutions: 0, optionNotes: 0, genericPages: 0 };
const genericPhrases = ["도시 문명 찬양", "경제적 성공", "전쟁 영웅", "자연 정복", "부귀와 출세", "연인과의 재회"];

for (const card of cards) {
  if (!card.file) {
    errors.push(`${card.slug}: source file missing`);
    continue;
  }
  const { html, name } = card.file;
  const isPoetry = /현대시|고전 시가/.test(card.categories) || card.slug === "2027-suteuk-kim-sowol-gil";
  totals[isPoetry ? "poetry" : "prose"] += 1;
  const quizzes = [...html.matchAll(/<section class="quiz" data-answer="([1-5])">([\s\S]*?)<\/section>/g)];
  const expectedQuizCount = /<h2[^>]*>실전 문제 20문항<\/h2>/.test(html) ? 20 : 10;
  const choiceCount = (html.match(/class="choice"/g) || []).length;
  const solutionCount = (html.match(/class="solution"/g) || []).length;
  const noteCount = (html.match(/<li>(?:<strong>)?[①②③④⑤]/g) || []).length;
  totals.quizzes += quizzes.length;
  totals.choices += choiceCount;
  totals.solutions += solutionCount;
  totals.optionNotes += noteCount;
  if (genericPhrases.some((phrase) => html.includes(phrase))) totals.genericPages += 1;

  const checks = [
    [metaValue(html, "title"), "title metadata missing"],
    [metaValue(html, "slug"), "slug metadata missing"],
    [/<article class="sut-lit sut-lit--(?:poetry|prose)">/.test(html), "standard wrapper missing"],
    [html.includes(`sut-lit--${isPoetry ? "poetry" : "prose"}`), "genre template mismatch"],
    [(html.match(/<header class="sut-hero">/g) || []).length === 1, "hero count is not 1"],
    [(html.match(/<nav class="sut-nav"/g) || []).length === 1, "quick navigation count is not 1"],
    [(html.match(/<style>/g) || []).length === 1, "style count is not 1"],
    [(html.match(/<script>/g) || []).length === 1, "script count is not 1"],
    [(html.match(/<h2\b/g) || []).length >= 3, "fewer than 3 learning sections"],
    [quizzes.length === expectedQuizCount, `quiz count ${quizzes.length}, expected ${expectedQuizCount}`],
    [choiceCount === quizzes.length * 5, `choice count ${choiceCount}, expected ${quizzes.length * 5}`],
    [solutionCount === quizzes.length, `solution count ${solutionCount}, expected ${quizzes.length}`],
    [quizzes.every((quiz) => /<div class="solution">[\s\S]*?<ol\b/.test(quiz[0])), "a quiz is missing its option-review list"],
    [!/(?:<!doctype|<html\b|<head\b|<body\b)/i.test(html), "full-document shell remains"],
    [!/(?:cdn\.tailwindcss|fonts\.googleapis|unpkg\.com\/lucide)/i.test(html), "external presentation dependency remains"],
    [!/class=(?:["']?)(?:q|mkq|mk-quiz)(?:["'\s>])/.test(html), "legacy quiz class remains"],
  ];
  for (const [passed, message] of checks) if (!passed) errors.push(`${name}: ${message}`);

  for (const quiz of quizzes) {
    const answer = Number(quiz[1]);
    const choices = [...quiz[2].matchAll(/data-choice="([1-5])"/g)].map((match) => Number(match[1]));
    if (choices.length !== 5 || !choices.includes(answer)) errors.push(`${name}: malformed quiz answer/choices`);
  }

  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  for (const link of html.matchAll(/<a href="#([^"]+)"/g)) {
    if (!ids.has(link[1])) errors.push(`${name}: navigation target #${link[1]} missing`);
  }
}

console.log(JSON.stringify(totals, null, 2));
if (errors.length) {
  console.error(`\nVALIDATION_ERRORS=${errors.length}`);
  for (const error of errors) console.error(error);
  process.exit(1);
}
console.log("VALIDATION_OK");
