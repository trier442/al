import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contentDir = path.join(root, "wordpress-content");
const indexPath = path.join(contentDir, "2027-suteuk-literature-index.html");
const write = process.argv.includes("--write");
const indexUrl = "https://modukorean.co.kr/2027-수능특강-문학-상세-해설-및-변형-문제/";

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

function textOnly(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#0*38;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|8216|8217);/g, "'")
    .replace(/&#(?:8220|8221);/g, '"')
    .replace(/&[^;]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeQuizText(value) {
  return escapeHtml(value)
    .replace(/&lt;(\/?(?:u|b|strong|em))&gt;/gi, "<$1>")
    .replace(/&lt;br\s*\/?&gt;/gi, "<br>");
}

function cleanTitle(title) {
  return textOnly(title)
    .replace(/^\[2027 수능특강 문학\]\s*/, "")
    .replace(/\s+(?:원문[·ㆍ]|상세\s*)?해설\s*및\s*변형\s*문제.*$/i, "")
    .replace(/\s+원문[·ㆍ]상세\s*해설\s*및\s*변형문제.*$/i, "")
    .trim();
}

function metadataPrefix(html) {
  const names = ["title", "slug", "post_id", "status", "type", "categories", "revision", "excerpt"];
  const lines = [];
  for (const name of names) {
    const match = html.match(new RegExp(`<!--\\s*${name}\\s*:[\\s\\S]*?-->`));
    if (match) lines.push(match[0].trim());
  }
  return `${lines.join("\n")}\n`;
}

function findBalancedElement(html, start, tagName) {
  const tagPattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi");
  tagPattern.lastIndex = start;
  let depth = 0;
  let first = true;
  for (let match = tagPattern.exec(html); match; match = tagPattern.exec(html)) {
    const closing = /^<\//.test(match[0]);
    if (first) {
      if (closing || match.index !== start) return null;
      first = false;
    }
    depth += closing ? -1 : 1;
    if (depth === 0) return { start, end: tagPattern.lastIndex, html: html.slice(start, tagPattern.lastIndex) };
  }
  return null;
}

function replaceElementById(html, tagName, id, replacement) {
  const startMatch = new RegExp(`<${tagName}\\b[^>]*\\bid=["']${id}["'][^>]*>`, "i").exec(html);
  if (!startMatch) return html;
  const element = findBalancedElement(html, startMatch.index, tagName);
  if (!element) return html;
  return html.slice(0, element.start) + replacement + html.slice(element.end);
}

function extractArrayLiteral(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return "";
  const start = source.indexOf("[", markerIndex);
  if (start < 0) return "";
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return "";
}

function parseDataQuizzes(html) {
  const literal = extractArrayLiteral(html, "const quizData");
  if (!literal) return [];
  try {
    const data = Function(`"use strict"; return (${literal});`)();
    return data.map((item, index) => ({
      type: item.type || "",
      question: item.question || `문제 ${index + 1}`,
      options: Array.isArray(item.options) ? item.options : [],
      answer: Number(item.answer) + 1,
      explanation: item.explanation || "",
      passage: item.passage || item.view || item.example || item.box || "",
      plainText: true,
    }));
  } catch (error) {
    console.warn(`quizData parse failed: ${error.message}`);
    return [];
  }
}

function attributeValue(attributes, ...names) {
  for (const name of names) {
    const match = attributes.match(new RegExp(`\\b${name}=(?:["']([^"']+)["']|([^\\s>]+))`, "i"));
    if (match) return match[1] || match[2] || "";
  }
  return "";
}

function classValue(attributes) {
  return attributeValue(attributes, "class");
}

function parseSectionQuizzes(html) {
  const quizzes = [];
  const ranges = [];
  const openPattern = /<section\b([^>]*)>/gi;
  for (let match = openPattern.exec(html); match; match = openPattern.exec(html)) {
    const classes = classValue(match[1]).split(/\s+/);
    if (!classes.some((name) => ["q", "mkq", "quiz", "mk-quiz"].includes(name))) continue;
    const element = findBalancedElement(html, match.index, "section");
    if (!element) continue;
    const openingEnd = element.html.indexOf(">") + 1;
    const inner = element.html.slice(openingEnd, -10);
    const answer = Number(attributeValue(match[1], "data-answer", "data-a", "data-correct"));
    const headingMatch = inner.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)
      || inner.match(/<b\b[^>]*>([\s\S]*?)<\/b>/i)
      || inner.match(/<p\b[^>]*class=["'][^"']*\bmk-question\b[^"']*["'][^>]*>\s*<strong\b[^>]*>([\s\S]*?)<\/strong>\s*<\/p>/i)
      || inner.match(/<p\b[^>]*>\s*<strong\b[^>]*>([\s\S]*?)<\/strong>\s*<\/p>/i);
    const options = [...inner.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)].map((button, index) => ({
      index: Number(attributeValue(button[1], "data-choice", "data-c")) || index + 1,
      html: button[2].trim(),
    }));
    const solutionMatch = inner.match(/<div\b[^>]*class=["'][^"']*\bsolution\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
      || inner.match(/<div\b[^>]*class=["'][^"']*\bmke\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
      || inner.match(/<div\b[^>]*class=["'][^"']*\bmk-explanation\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
      || inner.match(/<em\b[^>]*>([\s\S]*?)<\/em>/i);
    if (answer && options.length) {
      quizzes.push({
        question: headingMatch ? headingMatch[1].trim() : `문제 ${quizzes.length + 1}`,
        options,
        answer,
        solution: solutionMatch ? solutionMatch[1].trim() : "",
      });
      ranges.push({ start: element.start, end: element.end });
      openPattern.lastIndex = element.end;
    }
  }
  let stripped = html;
  for (const range of ranges.reverse()) stripped = stripped.slice(0, range.start) + stripped.slice(range.end);
  return { quizzes, html: stripped };
}

const numerals = ["", "①", "②", "③", "④", "⑤"];

function renderQuiz(item, number) {
  const options = item.options.map((option, index) => typeof option === "string"
    ? { index: index + 1, html: item.plainText ? escapeQuizText(option) : option }
    : option);
  const hasDetailedNotes = /<ol\b/i.test(item.solution || "");
  const correct = Number(item.answer);
  const rawSolution = item.solution || (item.plainText ? escapeQuizText(item.explanation || "") : item.explanation || "");
  const cleanSolution = rawSolution
    .replace(/<p\b[^>]*class=["'][^"']*\banswer\b[^"']*["'][^>]*>[\s\S]*?<\/p>/i, "")
    .replace(/^\s*<strong>\s*정답\s*[①②③④⑤1-5]\s*<\/strong>\s*<br\s*\/?\s*>/i, "")
    .trim();
  const notes = hasDetailedNotes ? cleanSolution : `<div class="sut-answer-ground"><strong>정답 근거</strong><p>${cleanSolution || "위 작품 해설과 출제 포인트를 기준으로 판단합니다."}</p></div><ol class="sut-option-notes">${options.map((option) => `<li><strong>${numerals[option.index] || option.index}</strong> ${option.index === correct ? "정답 선택지입니다. 정답 근거와 연결해 확인하세요." : "오답 선택지입니다. 정답 근거와 작품의 핵심 내용을 대조하세요."}</li>`).join("")}</ol>`;
  const question = item.plainText ? escapeQuizText(item.question) : item.question;
  const passage = item.passage ? `<div class="view">${item.plainText ? escapeQuizText(item.passage) : item.passage}</div>` : "";
  return `<section class="quiz" data-answer="${correct}"><h3>${question}</h3>${passage}<div class="choices">${options.map((option) => `<button type="button" class="choice" data-choice="${option.index}">${option.html}</button>`).join("")}</div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ${numerals[correct] || correct}</p>${notes}</div></section>`;
}

function renderQuizSet(items) {
  let previousType = "";
  return items.map((item, index) => {
    let group = "";
    if (item.type && item.type !== previousType) {
      previousType = item.type;
      group = `<h3 class="sut-quiz-group">${item.type === "naesin" ? "내신형 문제" : item.type === "suneung" ? "수능형 문제" : escapeHtml(item.type)}</h3>`;
    }
    return group + renderQuiz(item, index + 1);
  }).join("\n");
}

function stripDocumentShell(html) {
  return html
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<head\b[\s\S]*?<\/head>/gi, "")
    .replace(/<\/?html\b[^>]*>/gi, "")
    .replace(/<\/?body\b[^>]*>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, "")
    .replace(/<\/?main\b[^>]*>/gi, "");
}

function headingGroup(title) {
  if (/문제|퀴즈/.test(title)) return ["quiz", "변형문제"];
  if (/출제|필수 포인트/.test(title)) return ["points", "출제 포인트"];
  if (/원문|본문 읽기|작품 읽기/.test(title)) return ["text", "원문·본문"];
  if (/현대어/.test(title)) return ["modern", "현대어 풀이"];
  if (/줄거리|전체 구성|내용과 구성|수록 부분의 흐름|시상 전개/.test(title)) return ["flow", "구성·흐름"];
  if (/인물|갈등/.test(title)) return ["characters", "인물·갈등"];
  if (/표현|서술|심층|핵심 시구|초점화|상세 해설/.test(title)) return ["analysis", "심층 해설"];
  if (/핵심 정리|개괄|작품 이해|작품 핵심/.test(title)) return ["core", "핵심 정리"];
  return ["section", title.replace(/\s*10\s*$/, "")];
}

function addHeadingIds(html) {
  const usedIds = new Set();
  const nav = [];
  const groupCount = new Map();
  const output = html.replace(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi, (whole, attrs, inner) => {
    const title = textOnly(inner);
    const [group, label] = headingGroup(title);
    const count = (groupCount.get(group) || 0) + 1;
    groupCount.set(group, count);
    const existing = attributeValue(attrs, "id");
    let id = existing || `lit-${group}${count > 1 ? `-${count}` : ""}`;
    while (usedIds.has(id)) id = `${id}-${count + 1}`;
    usedIds.add(id);
    if (!nav.some((item) => item.group === group) && nav.length < 7) nav.push({ group, id, label });
    const cleanAttrs = attrs.replace(/\s*id=(?:["'][^"']+["']|[^\s>]+)/i, "");
    return `<h2${cleanAttrs} id="${id}">${inner}</h2>`;
  });
  return { html: output, nav };
}

const commonCss = `<style>
.sut-lit{--accent:#286a43;--accent-dark:#1f5636;--accent-soft:#edf7f0;--line:#cbdacf;max-width:920px;margin:0 auto;color:#17211b;font-size:17px;line-height:1.82;overflow-wrap:anywhere}.sut-lit--poetry{--accent:#4f46e5;--accent-dark:#3730a3;--accent-soft:#eef2ff;--line:#d5d8f4}.sut-lit *{box-sizing:border-box}.sut-hero{margin:0 0 18px;padding:28px;border:1px solid var(--line);border-radius:18px;background:linear-gradient(135deg,var(--accent-soft),#fff)}.sut-kicker{margin:0 0 6px;color:var(--accent-dark);font-size:14px;font-weight:800}.sut-hero h1{margin:5px 0 10px;font-size:32px;line-height:1.35;color:#152019}.sut-hero p:last-of-type{margin-bottom:0;color:#4c5b51}.sut-index-link{display:inline-block;margin-top:15px;padding:10px 14px;border-radius:9px;background:var(--accent);color:#fff!important;text-decoration:none;font-weight:800}.sut-nav{position:sticky;top:0;z-index:20;display:flex;gap:8px;margin:0 0 24px;padding:10px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.96);box-shadow:0 6px 18px rgba(24,50,33,.08);overflow-x:auto}.sut-nav a{flex:0 0 auto;padding:8px 11px;border-radius:8px;color:var(--accent-dark)!important;text-decoration:none;font-size:14px;font-weight:800}.sut-nav a:hover{background:var(--accent-soft)}.sut-content>.lit,.sut-content>.gil,.sut-content>.mkw,.sut-content>.w,.sut-content>.wrap{max-width:none!important;margin:0!important}.sut-lit h2{scroll-margin-top:90px;margin:38px 0 15px!important;padding:0 0 9px!important;border-bottom:3px solid var(--accent)!important;color:var(--accent-dark)!important;font-size:25px;line-height:1.4}.sut-lit h3{color:#24362a;line-height:1.55}.sut-lit p{margin:0 0 14px}.sut-lit ol,.sut-lit ul{padding-left:24px}.sut-lit li{margin:7px 0}.sut-lit table,.sut-lit .tbl,.sut-lit .table{display:table;width:100%;margin:15px 0;border-collapse:collapse;overflow:visible}.sut-lit th,.sut-lit td,.sut-lit .tbl th,.sut-lit .tbl td,.sut-lit .table th,.sut-lit .table td{padding:12px;border:1px solid var(--line);vertical-align:top}.sut-lit th,.sut-lit .tbl th,.sut-lit .table th{background:var(--accent-soft)!important;color:var(--accent-dark)!important;font-weight:800}.sut-lit img{display:block;max-width:100%;height:auto;margin:18px auto;border-radius:14px}.sut-lit .box,.sut-lit .bg-white,.sut-lit .p,.sut-lit .lead,.sut-lit .pt,.sut-lit .point,.sut-lit .feature,.sut-lit .overview,.sut-lit .flow>div{margin:13px 0;padding:17px;border:1px solid var(--line);border-radius:12px;background:#fff}.sut-lit .p,.sut-lit .lead,.sut-lit .pt,.sut-lit .point,.sut-lit .overview{border-left:5px solid var(--accent);background:var(--accent-soft)}.sut-lit .source,.sut-lit .poem,.sut-lit .prose{margin:15px 0;padding:24px;border-left:6px solid var(--accent);border-radius:14px;background:#f8faf9;font-family:serif;font-size:18px;line-height:2}.sut-lit .flow{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.sut-lit .view,.sut-lit .highlight-text{padding:12px;border-left:4px solid #77837b;background:#f2f4f3}.sut-lit .download,.sut-lit .ad,.sut-lit .mk-ad,.sut-lit .mk-premium-ad{margin:25px 0!important;padding:22px!important;border:2px solid #ec8a21!important;border-radius:14px!important;background:#fff7e8!important;text-align:center!important}.sut-lit .download strong,.sut-lit .ad strong,.sut-lit .mk-ad p,.sut-lit .mk-premium-ad p{display:block;margin:0 0 10px;font-size:18px;font-weight:800;color:#7d3d08}.sut-lit .download a,.sut-lit .ad a,.sut-lit .mk-ad a,.sut-lit .mk-premium-ad a{display:inline-block;padding:13px 18px;border-radius:9px;background:#dd6812;color:#fff!important;text-decoration:none;font-size:18px;font-weight:800}.sut-lit .quiz{margin:20px 0;padding:22px;border:1px solid var(--line);border-radius:15px;background:#fff;box-shadow:0 5px 16px rgba(24,50,33,.05)}.sut-lit .quiz h3{margin:0 0 14px;font-size:19px}.sut-lit .choice{display:block;width:100%;margin:9px 0;padding:13px 15px;border:1px solid #becdc2;border-radius:9px;background:#fff;color:#111!important;text-align:left;font:inherit;cursor:pointer}.sut-lit .choice:hover{background:var(--accent-soft)}.sut-lit .choice.correct{border-color:#2f8a50;background:#e4f6e9;color:#111!important;font-weight:700}.sut-lit .choice.wrong{border-color:#c84b4b;background:#fff0f0;color:#111!important}.sut-lit .feedback{display:none;margin-top:12px;padding:11px 13px;border-radius:9px;font-weight:800}.sut-lit .feedback.show{display:block}.sut-lit .feedback.ok{background:#e4f6e9;color:#1e6c3b}.sut-lit .feedback.no{background:#fff0f0;color:#9b2929}.sut-lit .solution{display:none;margin-top:12px;padding:17px;border-radius:10px;background:#f4f7f5}.sut-lit .solution.show{display:block}.sut-lit .answer{color:#1f673c;font-weight:900}.sut-lit .sut-answer-ground{padding:13px;border-left:4px solid var(--accent);background:#fff}.sut-lit .sut-answer-ground p{margin:5px 0 0}.sut-lit .sut-option-notes{margin-bottom:0}.sut-quiz-group{margin:30px 0 12px;padding:10px 14px;border-radius:9px;background:var(--accent);color:#fff!important}.sut-lit .scroll-mt-24{scroll-margin-top:90px}.sut-lit .space-y-6>*,.sut-lit .space-y-8>*{margin-top:14px;margin-bottom:14px}
@media(max-width:680px){.sut-lit{font-size:16px}.sut-hero{padding:20px}.sut-hero h1{font-size:26px}.sut-lit h2{font-size:22px}.sut-lit .box,.sut-lit .quiz,.sut-lit .source,.sut-lit .poem,.sut-lit .prose{padding:17px}.sut-lit table,.sut-lit .tbl,.sut-lit .table{display:block;overflow-x:auto;white-space:normal}.sut-lit th{min-width:105px}.sut-nav{border-radius:9px}.sut-lit .download a,.sut-lit .ad a,.sut-lit .mk-ad a,.sut-lit .mk-premium-ad a{width:100%;font-size:16px}}
</style>`;

const commonScript = `<script>(function(){function init(){document.querySelectorAll('.sut-lit .quiz').forEach(function(q){q.querySelectorAll('.choice').forEach(function(btn){btn.addEventListener('click',function(){var answer=String(q.dataset.answer);var correct=String(btn.dataset.choice)===answer;q.querySelectorAll('.choice').forEach(function(choice){choice.classList.remove('correct','wrong');choice.setAttribute('aria-pressed','false');if(String(choice.dataset.choice)===answer)choice.classList.add('correct')});if(!correct)btn.classList.add('wrong');btn.setAttribute('aria-pressed','true');var feedback=q.querySelector('.feedback');feedback.className='feedback show '+(correct?'ok':'no');feedback.textContent=correct?'정답입니다. 아래 선택지별 해설을 확인하세요.':'오답입니다. 초록색 선택지가 정답입니다.';var solution=q.querySelector('.solution');if(solution)solution.classList.add('show')})})})}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init()})();</script>`;

const files = fs.readdirSync(contentDir)
  .filter((name) => name.endsWith(".html"))
  .map((name) => {
    const fullPath = path.join(contentDir, name);
    const html = fs.readFileSync(fullPath, "utf8");
    return { name, fullPath, html, slug: normalizedSlug(metaValue(html, "slug")), title: metaValue(html, "title") };
  });
const bySlug = new Map(files.filter((file) => file.slug).map((file) => [file.slug, file]));
const indexHtml = fs.readFileSync(indexPath, "utf8");
const cards = [...indexHtml.matchAll(/<a class="mk-lit-card"([^>]*)href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/g)].map((match) => {
  const attrs = `${match[1]} ${match[3]}`;
  const categories = (attrs.match(/data-categories="([^"]*)"/) || [])[1] || "";
  const slug = normalizedSlug(new URL(match[2]).pathname);
  let file = bySlug.get(slug);
  if (!file) {
    const cardTitle = textOnly(match[4]).replace(/[\s「」『』·\[\]]/g, "");
    const candidates = files.filter((item) => {
      const title = textOnly(item.title).replace(/[\s「」『』·\[\]]/g, "");
      return title && cardTitle && (title.includes(cardTitle) || cardTitle.includes(title));
    });
    if (candidates.length === 1) [file] = candidates;
  }
  return { categories, slug, file };
});

const stats = { pages: 0, poetry: 0, prose: 0, quizzes: 0, choices: 0, dataPages: 0, skipped: 0 };
for (const card of cards) {
  if (!card.file) throw new Error(`No source file for ${card.slug}`);
  const original = card.file.html;
  if (original.includes('<article class="sut-lit ')) {
    stats.skipped += 1;
    continue;
  }
  const meta = metadataPrefix(original);
  const isPoetry = /현대시|고전 시가/.test(card.categories) || card.slug === "2027-suteuk-kim-sowol-gil";
  const type = isPoetry ? "poetry" : "prose";
  const headerMatch = original.match(/<header\b[^>]*>([\s\S]*?)<\/header>/i);
  const headerHtml = headerMatch ? headerMatch[1] : "";
  const displayTitle = textOnly((headerHtml.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "") || cleanTitle(card.file.title);
  const headerParagraphs = [...headerHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => textOnly(match[1])).filter(Boolean);
  const blurb = headerParagraphs.at(-1) || (isPoetry
    ? "원문과 현대어 풀이, 시상 전개, 표현 효과, 출제 포인트를 한 흐름으로 학습합니다."
    : "수록 부분의 맥락, 사건과 인물, 갈등과 소재, 서술·표현, 출제 포인트를 한 흐름으로 학습합니다.");
  const dataQuizzes = parseDataQuizzes(original);
  let body = original.slice(meta.length);
  if (dataQuizzes.length) {
    stats.dataPages += 1;
    const heading = `<section id="section-quiz"><h2>${dataQuizzes.length === 20 ? "실전 문제 20문항" : `클릭형 변형문제 ${dataQuizzes.length}제`}</h2>${renderQuizSet(dataQuizzes)}</section>`;
    body = replaceElementById(body, "section", "section-quiz", heading);
  }
  body = stripDocumentShell(body);
  body = body.replace(/<header\b[\s\S]*?<\/header>/gi, "");
  const parsed = dataQuizzes.length ? { quizzes: [], html: body } : parseSectionQuizzes(body);
  body = parsed.html;
  const quizzes = dataQuizzes.length ? dataQuizzes : parsed.quizzes;
  if (!dataQuizzes.length && quizzes.length) {
    const rendered = renderQuizSet(quizzes);
    const quizHeading = body.match(/<h2\b[^>]*>[^<]*(?:문제|퀴즈)[^<]*<\/h2>/i);
    if (quizHeading) {
      const insertAt = quizHeading.index + quizHeading[0].length;
      body = body.slice(0, insertAt) + rendered + body.slice(insertAt);
    } else {
      body += `<section><h2>클릭형 변형문제 ${quizzes.length}제</h2>${rendered}</section>`;
    }
  }
  body = body
    .replace(/<div\b[^>]*id=["']quiz-container["'][^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<div\b[^>]*class=["'][^"']*\bflex\b[^"']*\bjustify-center\b[^"']*["'][^>]*>\s*<button[\s\S]*?<\/div>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const headed = addHeadingIds(body);
  const nav = headed.nav.map((item) => `<a href="#${item.id}">${escapeHtml(item.label)}</a>`).join("");
  const hero = `<header class="sut-hero"><p class="sut-kicker">2027 수능특강 문학 · ${escapeHtml(card.categories || (isPoetry ? "시가 문학" : "산문 문학"))} · ${isPoetry ? "월곡답가형" : "징 소리형"} 통일 구성</p><h1>${escapeHtml(displayTitle)}</h1><p>${escapeHtml(blurb)}</p><a class="sut-index-link" href="${indexUrl}">2027 수능특강 문학 전체 목차</a></header>`;
  const output = `${meta}${commonCss}\n<article class="sut-lit sut-lit--${type}">\n${hero}\n<nav class="sut-nav" aria-label="페이지 빠른 이동">${nav}</nav>\n<div class="sut-content">\n${headed.html}\n</div>\n</article>\n${commonScript}\n`;
  const choiceCount = (output.match(/class="choice"/g) || []).length;
  if (quizzes.length < 10 || choiceCount < quizzes.length * 5) {
    throw new Error(`${card.file.name}: invalid quiz conversion (${quizzes.length} quizzes, ${choiceCount} choices)`);
  }
  if (/<!doctype|<html\b|<head\b|<body\b/i.test(output)) throw new Error(`${card.file.name}: document shell remains`);
  if (write) fs.writeFileSync(card.file.fullPath, output);
  stats.pages += 1;
  stats[type] += 1;
  stats.quizzes += quizzes.length;
  stats.choices += choiceCount;
}

console.log(JSON.stringify({ mode: write ? "write" : "dry-run", ...stats }, null, 2));
