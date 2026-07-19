import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contentDir = path.join(root, "wordpress-content");
const indexPath = path.join(contentDir, "2027-suteuk-literature-index.html");

function metaValue(html, key) {
  const match = html.match(new RegExp(`<!--\\s*${key}\\s*:\\s*(.*?)\\s*-->`));
  return match ? match[1].trim() : "";
}

function cleanText(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[^;]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedPath(url) {
  try {
    return decodeURIComponent(new URL(url).pathname).replace(/^\/+|\/+$/g, "");
  } catch {
    return "";
  }
}

const files = fs.readdirSync(contentDir)
  .filter((name) => name.endsWith(".html"))
  .map((name) => {
    const fullPath = path.join(contentDir, name);
    const html = fs.readFileSync(fullPath, "utf8");
    return {
      name,
      fullPath,
      html,
      slug: metaValue(html, "slug"),
      title: metaValue(html, "title"),
      postId: metaValue(html, "post_id"),
    };
  });

function normalizedSlug(value) {
  try {
    return decodeURIComponent(value).replace(/^\/+|\/+$/g, "");
  } catch {
    return value.replace(/^\/+|\/+$/g, "");
  }
}

const bySlug = new Map(files.filter((file) => file.slug).map((file) => [normalizedSlug(file.slug), file]));
const indexHtml = fs.readFileSync(indexPath, "utf8");
const cards = [...indexHtml.matchAll(/<a class="mk-lit-card"([^>]*)href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/g)]
  .map((match) => {
    const attrs = `${match[1]} ${match[3]}`;
    const categories = (attrs.match(/data-categories="([^"]*)"/) || [])[1] || "";
    const title = cleanText(match[4]);
    const href = match[2];
    const slug = normalizedPath(href);
    let file = bySlug.get(slug);
    if (!file) {
      const candidates = files.filter((item) => {
        const compactTitle = cleanText(item.title).replace(/[\s「」『』·\[\]]/g, "");
        const compactCard = title.replace(/[\s「」『』·\[\]]/g, "");
        return compactTitle && compactCard && (
          compactTitle.includes(compactCard) || compactCard.includes(compactTitle)
        );
      });
      if (candidates.length === 1) file = candidates[0];
    }
    return { href, slug, categories, title, file };
  });

const genericPhrases = [
  "도시 문명 찬양",
  "경제적 성공",
  "전쟁 영웅",
  "자연 정복",
  "부귀와 출세",
  "연인과의 재회",
];

const rows = cards.map((card) => {
  const html = card.file?.html || "";
  return {
    categories: card.categories,
    cardTitle: card.title,
    file: card.file?.name || "MISSING",
    postId: card.file?.postId || "",
    bytes: Buffer.byteLength(html),
    h2: (html.match(/<h2\b/gi) || []).length,
    h3: (html.match(/<h3\b/gi) || []).length,
    source: /class="[^"]*source/.test(html) || /작품 원문/.test(html),
    modern: /현대어 풀이|현대어 해석/.test(html),
    quiz: (html.match(/class="quiz"/g) || []).length,
    choices: (html.match(/class="choice"/g) || []).length,
    solutions: (html.match(/class="solution"/g) || []).length,
    optionNotes: (html.match(/<li>(?:<strong>)?[①②③④⑤1-5]/g) || []).length,
    generic: genericPhrases.reduce((sum, phrase) => sum + (html.split(phrase).length - 1), 0),
  };
});

console.log(`INDEX_CARDS=${cards.length}`);
console.log(`MAPPED=${rows.filter((row) => row.file !== "MISSING").length}`);
console.log(`MISSING=${rows.filter((row) => row.file === "MISSING").length}`);
console.log(`WITH_10_QUIZZES=${rows.filter((row) => row.quiz === 10).length}`);
console.log(`WITH_50_CHOICES=${rows.filter((row) => row.choices === 50).length}`);
console.log(`WITH_OPTION_NOTES=${rows.filter((row) => row.optionNotes >= 50).length}`);
console.log(`WITH_SOURCE=${rows.filter((row) => row.source).length}`);
console.log(`WITH_MODERN_KOREAN=${rows.filter((row) => row.modern).length}`);
console.log(`GENERIC_DISTRACTOR_PAGES=${rows.filter((row) => row.generic > 0).length}`);

console.log("\nMISSING FILES");
for (const row of rows.filter((item) => item.file === "MISSING")) {
  console.log(`${row.categories}\t${row.cardTitle}\t${cards.find((card) => card.title === row.cardTitle)?.href || ""}`);
}

console.log("\nLOW STRUCTURE");
for (const row of rows
  .filter((item) => item.file !== "MISSING" && (item.quiz !== 10 || item.choices !== 50 || item.h2 < 4 || item.generic > 0))
  .sort((a, b) => a.bytes - b.bytes)) {
  console.log([
    row.file,
    row.categories,
    `bytes=${row.bytes}`,
    `h2=${row.h2}`,
    `quiz=${row.quiz}`,
    `choices=${row.choices}`,
    `notes=${row.optionNotes}`,
    `generic=${row.generic}`,
  ].join("\t"));
}

console.log("\nALL ROWS JSON");
console.log(JSON.stringify(rows, null, 2));
