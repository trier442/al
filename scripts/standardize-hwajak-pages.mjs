import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, "wordpress-content");
const PAYLOAD_DIR = path.join(ROOT, "scripts", "hwajak-payload");
const PAYLOAD_FILES = ["part01.txt", "part02.txt", "part03.txt", "part04.txt", "part05.txt", "part06a.txt", "part06b.txt"];
const DATA_B64 = PAYLOAD_FILES.map((file) =>
  fs.readFileSync(path.join(PAYLOAD_DIR, file), "utf8").trim()
).join("");
const ANSWERS = [2,3,1,2,5,1,4,3,5,2,5,1,4,3,2,3,2,1,4,5,3,1,4,2,5,1,5,2,3,4,5,1,2,3,4,4,2,1,3,5,1,3,2,4,5,2,4,3,5,1,5,3,1,4,2,2,5,4,1,3,1,3,2,4,5,3,4,1,2,5,4,3,5,2,1,5,3,2,1,4,5,3,4,2,1,1,5,4,2,3,3,5,2,4,1,4,3,1,2,5,2,3,1,5,4,3,4,5,1,2,3,4,1,2,5,5,1,2,4,3,3,4,1,5,2,3,5,2,1,4,3,5,2,4,1,4,3,5,2,1,5,1,2,4,3,3,4,5,2,1,4,2,3,1,5,4,5,1,3,2,5,1,4,2,3,1,2,4,5,3,2,4,5,3,1,5,2,4,1,3,5,2,3,4,1,4,2,5,1,3,1,2,3,4,3,5,1,5,4,2,4,5,1,3,2,2,4,3,5,1,4,5,3,1,2,4,1,5,2,3,4,5,3,1,2,5,1,3,2,4,3,1,5,2,4,4,5,2,3,1,2,5,3,4,1,4,3,2,5,1,4,2,3,5,1,2,4,3,1,5,5,4,1,2,3,4,2,3,1,5,3,5,1,2,4,1,5,2,4,3,1,4,3,2,5,3,5,2,4,1,2,5,3,4,1,1,4,3,5,2,2,5,3,1,4,4,2,5,3,1,1,4,3,2,5,1,2,4,5,3,1,4,3,2,5,1,4,5,2,3,1,3,5,4,2,4,1,2,5,3,2,4,3,1,5,3,4,5,2,1,5,4,3,2,4,1,3,1,2,5,5,2,3,4,1,1,3,4,5,2,1,5,2,4,3,3,5,2,4,1,2,1,5,3,4,4,5,3,1,2,3,4,2,1,5,3,1,5,4,2,1,3,2,4,5,1,2,4,3,5,5,2,3,4,1,1,5,3,2,4,3,2,5,1,4,2,3,1,5,4,2,5,4,1,3,5,3,1,4,2,5,4,3,1,2,1,3,4,5,2,1,2,3,5,4,4,5,3,2,1,5,4,2,3,1,1,4,5,2,3,1,4,2,3,5,5,4,3,1,2,5,1,2,4,3,4,5,2,3,1,4,1,2,3,5,3,4,1,2,5,4,5,2,3,1,1,3,4,5,2,1,4,2,3,5,4,3,5,1,2,3,4,1,2,5,1,5,2,4,3,2,4,1,3,5,1,4,5,2,3,1,3,5,2,4,2,5,1,4,3,5,3,4,1,2,2,3,4,5,1,4,5,3,2,1,5,1,4,2,3];
const GROUP_ORDER = ["개념 학습", "화법", "작문", "통합", "실전 학습"];
const GROUP_LABEL = {
  "개념 학습": "개념 학습",
  "화법": "화법",
  "작문": "작문",
  "통합": "통합",
  "실전 학습": "실전 학습",
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripHtml(value = "") {
  return String(value).replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}

function readOld(file) {
  try { return fs.readFileSync(file, "utf8"); } catch { return ""; }
}

function oldMeta(old, key) {
  const match = old.match(new RegExp(`<!--\\s*${key}:\\s*([^\\n]*?)\\s*-->`, "i"));
  return match ? match[1].trim() : "";
}

function oldPremiumUrl(old) {
  const match = old.match(/https:\/\/contents\.premium\.naver\.com\/[^"' <]+/);
  return match ? match[0] : "";
}

function clampSentence(text, max = 145) {
  const t = String(text).replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const points = [cut.lastIndexOf(". "), cut.lastIndexOf(", "), cut.lastIndexOf("며 "), cut.lastIndexOf("고 ")];
  const pos = Math.max(...points);
  return (pos > 70 ? cut.slice(0, pos + 1) : cut.slice(0, max - 1)) + "…";
}

function contentWords(article) {
  const words = [
    ...article.flow.map((item) => item.answer),
    ...article.title.match(/[가-힣A-Za-z0-9·\-]{2,}/g) ?? [],
    ...article.summary.match(/[가-힣A-Za-z0-9·\-]{3,}/g) ?? [],
  ];
  const stop = new Set(["자료에서는","자료에서","자료는","해당한다","중심으로","문제에서는","내용을","관련하여","통해","대한","위해","그리고","그러나","이러한","이처럼","먼저","또한"]);
  const out = [];
  for (const raw of words) {
    const value = raw.replace(/[은는이가을를의에에서도만과와]$/u, "");
    if (value.length < 2 || stop.has(value) || out.includes(value)) continue;
    out.push(value);
    if (out.length >= 12) break;
  }
  while (out.length < 12) out.push(article.title);
  return out;
}

function injectSummaryBlanks(article) {
  const text = article.summary;
  const spans = [...article.blankSpans].sort((a, b) => a.start - b.start);
  let cursor = 0;
  const html = [];
  for (const span of spans) {
    if (span.start < cursor || text.slice(span.start, span.end) !== span.answer) {
      throw new Error(`${article.slug}: summary blank span mismatch (${span.answer})`);
    }
    html.push(escapeHtml(text.slice(cursor, span.start)));
    const width = Math.max(4, Math.min(14, [...span.answer].length));
    html.push(`<button type="button" class="keyblank" aria-pressed="false" aria-label="핵심어 빈칸: 클릭하여 정답 보기"><span class="kb-mask">${"□".repeat(width)}</span><span class="kb-answer" hidden>${escapeHtml(span.answer)}</span></button>`);
    cursor = span.end;
  }
  html.push(escapeHtml(text.slice(cursor)));
  return html.join("");
}

function typeCorrect(article, qIndex, fact, words) {
  const p = words;
  const prefix = [
    "자료의 핵심 내용은 다음과 같이 정리할 수 있다. ",
    "자료의 전개 방식과 관련하여, ",
    `${p[1]}의 의미를 파악하면, `,
    "사례·자료·상대 발화의 기능을 고려하면, ",
    "의사소통의 목적과 맥락을 고려하면, ",
    "세부 내용 사이의 관계를 살피면, ",
    "화자·필자와 청자·독자의 관계를 고려하면, ",
    "<보기>의 판단 기준을 적용하면, ",
    "후속 활동이나 고쳐쓰기 방향을 계획하면, ",
    "자료를 종합적으로 이해하면, ",
  ][qIndex];
  return clampSentence(prefix + fact, 138);
}

const WRONG_FRAMES = [
  (p) => `${p[0]}은 중심 화제이지만 ${p[1]}과는 직접 연결되지 않으며, ${p[2]}은 결론에서 제외된다고 해석한다. 이 설명은 ${p[4]}와의 연관성도 부차적으로 처리한다.`,
  (p) => `${p[1]}을 ${p[2]}의 결과로만 보고, 자료에서 제시한 조건과 맥락은 판단에 영향을 주지 않는다고 본다. 따라서 ${p[5]}의 적용 범위도 한 부분에 한정한다.`,
  (p) => `${p[2]}의 제시는 정보를 보완하기보다 앞선 논의를 중단하고 별개의 화제로 전환하기 위한 것이라고 파악한다. 이후의 ${p[6]}과도 기능상 연결되지 않는다고 본다.`,
  (p) => `${p[0]}과 ${p[3]}은 서로 다른 역할을 하지 않으며, 두 요소가 같은 근거를 반복하는 데 그친다고 설명한다. 이로 인해 ${p[5]}의 기능 역시 별도로 구분하지 않는다.`,
  (p) => `${p[4]}에 관한 판단을 자료의 전체 흐름보다 한 가지 사례에만 근거해 일반화하고, 적용 범위도 확대한다. 또한 ${p[1]}에 필요한 조건은 검토 대상에서 제외한다.`,
  (p) => `${p[5]}은 독자나 청자의 이해를 돕기보다 핵심 주장을 유보하기 위한 장치이며, 결론과의 관련성이 낮다고 본다. ${p[2]}도 같은 화제 전환 기능을 한다고 해석한다.`,
  (p) => `${p[1]}과 ${p[6]}의 선후 관계를 바꾸어 해석하고, 원인과 결과가 자료에 제시된 방향과 반대로 이어진다고 본다. ${p[3]}은 그 결과를 뒷받침하는 근거로만 처리한다.`,
  (p) => `${p[3]}을 제시한 목적은 상대의 견해를 수용하기 위한 것이 아니라 논의를 종료하고 판단을 미루기 위한 것이라고 본다. 이에 따라 ${p[0]}의 결론도 유보된다고 해석한다.`,
];

function buildOptions(article, qIndex, correct, answer) {
  const words = contentWords(article);
  const wrong = [];
  let offset = qIndex % WRONG_FRAMES.length;
  for (let i = 0; wrong.length < 4 && i < WRONG_FRAMES.length * 2; i++) {
    const frame = WRONG_FRAMES[(offset + i) % WRONG_FRAMES.length];
    let option = clampSentence(frame(words.slice(i % 4).concat(words)), 158);
    if (option === correct || wrong.includes(option)) continue;
    wrong.push(option);
  }
  while (wrong.length < 4) {
    wrong.push(clampSentence(`${words[wrong.length]}의 의미를 자료와 다른 범위로 확대하여, 한 부분의 정보를 전체 결론으로 일반화한 설명이다.`, 158));
  }
  const options = [];
  let wi = 0;
  for (let number = 1; number <= 5; number++) {
    options.push(number === answer ? correct : wrong[wi++]);
  }
  return options;
}

const STEMS = [
  "윗자료의 핵심 내용으로 가장 적절한 것은?",
  "<보기>의 기준으로 자료의 전개 방식을 평가한 것으로 가장 적절한 것은?",
  "자료에서 핵심 개념을 설명한 방식으로 가장 적절한 것은?",
  "자료에 활용된 사례·자료·상대 발화의 기능을 파악한 것으로 가장 적절한 것은?",
  "자료의 의사소통 목적과 맥락을 고려한 설명으로 가장 적절한 것은?",
  "세부 내용 사이의 인과·대조 관계를 파악한 것으로 가장 적절한 것은?",
  "화자·필자와 청자·독자의 관계를 고려한 설명으로 가장 적절한 것은?",
  "<보기>를 윗자료에 적용한 내용으로 가장 적절한 것은?",
  "자료의 핵심을 바탕으로 후속 활동 또는 고쳐쓰기를 계획한 것으로 가장 적절한 것은?",
  "자료를 종합적으로 이해한 내용으로 가장 적절한 것은?",
];

const CRITERIA = [
  "핵심 내용은 여러 세부 정보를 포괄하면서도 자료의 중심 화제와 결론을 정확하게 드러내야 한다.",
  "전개 방식은 도입·전개·정리의 순서뿐 아니라 개념, 사례, 자료, 반론, 대안이 서로 어떤 기능으로 연결되는지를 기준으로 판단한다.",
  "개념 설명은 정의의 범위와 사례가 일치하는지, 유사하거나 대립하는 개념과의 관계가 정확한지를 살펴야 한다.",
  "사례와 자료는 단순한 장식이 아니라 이해를 돕거나 근거를 보강하고, 상대 발화는 수용·보완·반박·전환의 기능을 수행한다.",
  "같은 내용도 화자·필자, 청자·독자, 목적, 매체, 시간과 장소에 따라 선정되는 정보와 표현 방식이 달라질 수 있다.",
  "인과와 대조를 판단할 때에는 원인과 결과, 공통점과 차이점의 방향을 바꾸거나 일부 조건을 누락하지 않았는지 확인해야 한다.",
  "발화나 문장의 기능은 바로 앞뒤 맥락에서 파악하고, 상대의 말에 어떤 반응을 보이며 다음 논의를 어떻게 이어 가는지를 살펴야 한다.",
  "자료를 적용할 때에는 제시된 판단 기준을 원자료의 구체적인 내용과 대응시키고, 가능성을 사실이나 필연으로 확대하지 않아야 한다.",
  "후속 활동이나 고쳐쓰기는 원자료의 목적과 예상 독자를 유지하면서 부족한 근거·설명·대안을 보완하는 방향이어야 한다.",
  "종합 판단에서는 주체, 대상, 범위, 조건, 인과 관계가 원자료와 일치하는지를 모두 점검해야 한다.",
];

function buildView(article, qIndex) {
  const summary = article.summary;
  const start = Math.min(qIndex * 37, Math.max(0, summary.length - 430));
  let excerpt = summary.slice(start, start + 455);
  if (excerpt.length < 360) excerpt = (summary + " " + summary).slice(0, 455);
  const plain = `판단 기준: ${CRITERIA[qIndex]} 자료 요약: ${excerpt}`;
  return { plain, html: `<div class="view" data-view-chars="${plain.length}"><strong>&lt;보기&gt;</strong><p>${escapeHtml(CRITERIA[qIndex])}</p><p>${escapeHtml(excerpt)}</p></div>` };
}

function renderQuestion(article, articleIndex, qIndex) {
  const answer = ANSWERS[articleIndex * 10 + qIndex];
  const fact = article.facts10[qIndex % article.facts10.length];
  const words = contentWords(article);
  const correct = typeCorrect(article, qIndex, fact, words);
  const options = buildOptions(article, qIndex, correct, answer);
  const view = buildView(article, qIndex);
  const buttons = options.map((option, i) => `<button type="button" class="choice" data-c="${i + 1}">${["①","②","③","④","⑤"][i]} ${escapeHtml(option)}</button>`).join("");
  const explanations = options.map((option, i) => {
    const isCorrect = i + 1 === answer;
    const body = isCorrect
      ? `정답. ${fact}라는 내용이 자료에 직접 제시되며, 이 선택지는 주체·범위·인과 관계를 바꾸지 않고 설명하였다.`
      : `오답. 이 선택지는 ${stripHtml(option)}라고 보아 자료의 관계나 기능을 바꾸었다. 자료에서는 오히려 ${fact}라고 설명한다.`;
    return `<div class="choice-exp ${isCorrect ? "correct-exp" : "wrong-exp"}" data-c="${i + 1}" hidden><strong>${["①","②","③","④","⑤"][i]} 해설</strong> ${escapeHtml(body)}</div>`;
  }).join("");
  return `<section class="q" data-a="${answer}" data-q="${qIndex + 1}"><h3>${qIndex + 1}. ${escapeHtml(STEMS[qIndex])}</h3>${view.html}<div class="choices">${buttons}</div><p class="result" aria-live="polite" hidden></p><div class="choice-explanations" hidden>${explanations}</div></section>`;
}

function renderPage(article, articleIndex) {
  const file = path.join(CONTENT_DIR, `${article.slug}.html`);
  const old = readOld(file);
  const postId = oldMeta(old, "post_id");
  const oldRevision = Number.parseInt(oldMeta(old, "revision") || "1", 10);
  const premiumUrl = oldPremiumUrl(old);
  const meta = [
    `<!-- title: [2027 수능특강 화법과 작문] ${article.title} 해설 및 변형문제 -->`,
    `<!-- slug: ${article.slug} -->`,
    `<!-- status: publish -->`,
    `<!-- type: post -->`,
    `<!-- categories: ${oldMeta(old, "categories") || "26"} -->`,
    `<!-- revision: ${Number.isFinite(oldRevision) ? oldRevision + 1 : 2} -->`,
    postId ? `<!-- post_id: ${postId} -->` : "",
    `<!-- excerpt: 2027 수능특강 화법과 작문 ${article.label} ${article.title}의 원문 없이 이해 가능한 상세 요약, 클릭형 괄호 15개, 흐름 빈칸 4개, 출제 포인트 10개, 풍부한 보기와 선택지별 해설을 갖춘 변형문제 10제입니다. -->`,
  ].filter(Boolean).join("\n");

  const style = `<style>
.hw{max-width:940px;margin:auto;line-height:1.82;color:#202428;font-family:system-ui,-apple-system,"Noto Sans KR",sans-serif}.hw h1{font-size:30px;line-height:1.35;color:#173f5f}.hw h2{margin-top:36px;color:#174f78;border-bottom:2px solid #d7e5ee;padding-bottom:8px}.tag{display:inline-block;padding:7px 12px;background:#e8f3fa;color:#174f78;border-radius:18px;font-weight:800}.summary{padding:24px;margin:18px 0 26px;background:#f8fbfd;border:2px solid #78a8c8;border-radius:15px;text-align:justify}.summary p{margin:0}.guide{font-size:14px;color:#506b7b;margin-bottom:12px!important}.keyblank,.flowblank{display:inline-block!important;width:auto!important;min-width:54px!important;margin:1px 3px!important;padding:2px 8px!important;vertical-align:baseline!important;color:#111!important;background:#fff!important;border:2px dashed #337fb1!important;border-radius:6px!important;font:inherit!important;font-weight:800!important;line-height:1.45!important;cursor:pointer!important}.keyblank.revealed,.flowblank.revealed{color:#0b527c!important;background:#dff1fb!important;border-style:solid!important}.kb-answer[hidden],.kb-mask[hidden]{display:none!important}.flow-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.flow-card{padding:16px;border:1px solid #bfd2df;border-radius:12px;background:#fff}.flow-card strong{display:block;color:#174f78;margin-bottom:9px}.points li{margin:9px 0}.tip{padding:18px;background:#eef7ee;border-left:4px solid #4c8b61;border-radius:0 10px 10px 0}.ad{text-align:center;padding:20px;margin:26px 0;background:#fff6e5;border:2px solid #e78722;border-radius:12px}.ad a{display:block;max-width:730px;margin:10px auto 0;padding:14px 17px;background:#e66f12;color:#fff!important;text-decoration:none;font-size:18px;font-weight:800;border-radius:8px}.q{padding:21px;margin:24px 0;border:1px solid #c6d4dd;border-radius:13px;background:#fff}.q h3{margin:0 0 14px;font-size:19px}.view{padding:17px;margin:12px 0 16px;background:#f6f8fa;border:1px solid #cfd8de;border-radius:9px}.view p{margin:8px 0;text-align:justify}.choice{display:block;color:#111!important;width:100%;text-align:left;padding:13px 14px;margin:8px 0;background:#fbfcfd;border:1px solid #b9c9d2;border-radius:8px;font:inherit;cursor:pointer}.choice:hover{background:#edf6fa}.choice.ok{color:#155b2e!important;background:#e4f6e9!important;border-color:#61a877}.choice.no{color:#942222!important;background:#fff0f0!important;border-color:#d68b8b}.result{padding:12px;font-weight:800;border-radius:8px}.choice-explanations{margin-top:14px}.choice-exp{padding:11px 13px;margin:8px 0;border-radius:8px}.correct-exp{background:#eaf7ed}.wrong-exp{background:#fff4f4}.back{text-align:center;margin:24px 0}.back a{color:#174f78;font-weight:800}@media(max-width:640px){.hw h1{font-size:25px}.summary,.q{padding:16px}.flow-grid{grid-template-columns:1fr}.ad a{font-size:16px}}
</style>`;

  const summaryHtml = injectSummaryBlanks(article);
  const flowHtml = article.flow.map((item) => `<div class="flow-card"><strong>${escapeHtml(item.label)}</strong><button type="button" class="flowblank" aria-pressed="false"><span class="kb-mask">${"□".repeat(Math.max(5, Math.min(14, [...item.answer].length)))}</span><span class="kb-answer" hidden>${escapeHtml(item.answer)}</span></button></div>`).join("");
  const points = article.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("");
  const questions = Array.from({ length: 10 }, (_, q) => renderQuestion(article, articleIndex, q)).join("");
  const premium = premiumUrl ? `<div class="ad"><strong>전체 변형문제 자료</strong><a href="${escapeHtml(premiumUrl)}" target="_blank" rel="noopener noreferrer sponsored">“${escapeHtml(article.title)}” 학습 자료 보기</a></div>` : "";
  const script = `<script>
document.addEventListener("click",function(e){
  const blank=e.target.closest(".keyblank,.flowblank");
  if(blank){const mask=blank.querySelector(".kb-mask"),answer=blank.querySelector(".kb-answer");const open=blank.classList.toggle("revealed");blank.setAttribute("aria-pressed",String(open));mask.hidden=open;answer.hidden=!open;return;}
  const button=e.target.closest(".choice");if(!button)return;
  const q=button.closest(".q"),answer=Number(q.dataset.a),picked=Number(button.dataset.c);
  q.querySelectorAll(".choice").forEach((b)=>{b.classList.remove("ok","no");if(Number(b.dataset.c)===answer)b.classList.add("ok");});
  if(picked!==answer)button.classList.add("no");
  const result=q.querySelector(".result");result.hidden=false;result.textContent=picked===answer?"정답입니다. 선택지별 해설을 확인하세요.":"오답입니다. 정답과 선택지별 해설을 확인하세요.";
  const exps=q.querySelector(".choice-explanations");exps.hidden=false;exps.querySelectorAll(".choice-exp").forEach((x)=>x.hidden=false);
});
</script>`;
  const body = `${meta}\n${style}<article class="hw"><span class="tag">${escapeHtml(article.group)} · ${escapeHtml(article.label)}</span><h1>${escapeHtml(article.title)}</h1><section class="summary" data-summary-chars="${article.summary.length}"><h2>원문 없이 이해하는 상세 요약</h2><p class="guide">괄호형 네모를 클릭하면 핵심어와 핵심 개념이 나타납니다.</p><p class="summary-source">${summaryHtml}</p></section>${premium}<h2>문단·자료 흐름 확인</h2><div class="flow-grid">${flowHtml}</div><h2>출제 포인트 10</h2><ol class="points">${points}</ol><div class="tip"><strong>문제 풀이 원칙</strong><br>선택지의 주체·목적·범위·인과 관계를 원자료와 대조하고, 발화나 문장의 기능은 앞뒤 맥락에서 판단합니다.</div><h2>풍부한 &lt;보기&gt;를 활용한 변형문제 10제</h2><p>선택지를 누르면 정오 판정과 다섯 선택지의 개별 해설이 모두 나타납니다.</p>${questions}${premium}<p class="back"><a href="https://modukorean.co.kr/2027-수능특강-화법과-작문-화작-전체-해설-및-변형-문제/">화법과 작문 전체 목록으로 돌아가기</a></p></article>${script}\n`;
  fs.writeFileSync(file, body, "utf8");
}

function renderIndex(articles) {
  const file = path.join(CONTENT_DIR, "2027-suteuk-hwajak-index.html");
  const old = readOld(file);
  const postId = oldMeta(old, "post_id");
  const revision = Number.parseInt(oldMeta(old, "revision") || "1", 10);
  const cardsByGroup = new Map(GROUP_ORDER.map((group) => [group, []]));
  for (const article of articles) {
    cardsByGroup.get(article.group).push(`<a class="card" data-key="${escapeHtml(`${article.title} ${article.label} ${article.kind}`)}" href="https://modukorean.co.kr/${article.slug}/"><small>${escapeHtml(article.label)}</small><strong>${escapeHtml(article.title)}</strong></a>`);
  }
  const sections = GROUP_ORDER.map((group) => `<section class="group"><h2>${GROUP_LABEL[group]} <small>(${cardsByGroup.get(group).length}개)</small></h2><div class="grid">${cardsByGroup.get(group).join("")}</div></section>`).join("");
  const meta = [
    "<!-- title: 2027 수능특강 화법과 작문 전체 해설 및 변형문제 -->",
    "<!-- slug: 2027-수능특강-화법과-작문-화작-전체-해설-및-변형-문제 -->",
    "<!-- status: publish -->",
    "<!-- type: page -->",
    `<!-- revision: ${Number.isFinite(revision) ? revision + 1 : 2} -->`,
    postId ? `<!-- post_id: ${postId} -->` : "",
    "<!-- excerpt: 2027 수능특강 화법과 작문 공식 PDF 기준 57개 제시문의 상세 요약, 클릭형 괄호·흐름 빈칸, 출제 포인트와 선택지별 해설을 갖춘 570문항 통합 목록입니다. -->",
  ].filter(Boolean).join("\n");
  const style = `<style>.hi{max-width:1100px;margin:auto;line-height:1.65;color:#222}.hero{padding:30px;background:linear-gradient(135deg,#edf6ff,#f8fbff);border-radius:18px}.hero h1{margin:0 0 10px;color:#174f78}.search{width:100%;box-sizing:border-box;margin:20px 0;padding:14px;border:2px solid #72a5ca;border-radius:10px;font-size:17px}.group{margin:34px 0}.group h2{color:#174f78;border-bottom:3px solid #79a8ca;padding-bottom:8px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:13px}.card{display:block;padding:16px;border:1px solid #ccd9e2;border-radius:12px;background:#fff;color:#222!important;text-decoration:none;box-shadow:0 3px 10px rgba(0,0,0,.04)}.card:hover{border-color:#337fb1;transform:translateY(-2px)}.card small{display:block;color:#557080}.card strong{display:block;margin-top:5px}.none{display:none;text-align:center;padding:30px}.note{padding:15px;background:#fff6e5;border-left:4px solid #e78722}</style>`;
  const script = `<script>const input=document.getElementById("hs"),cards=[...document.querySelectorAll(".card")],none=document.getElementById("none");input.addEventListener("input",()=>{const q=input.value.trim().toLowerCase();let count=0;cards.forEach(card=>{const show=!q||card.dataset.key.toLowerCase().includes(q);card.style.display=show?"block":"none";if(show)count++;});none.style.display=count?"none":"block";});</script>`;
  fs.writeFileSync(file, `${meta}\n${style}<main class="hi"><header class="hero"><h1>2027 수능특강 화법과 작문 전체 통합 목록</h1><p>공식 PDF를 기준으로 개념 학습 3개, 화법 16개, 작문 16개, 통합 16개, 실전 6개 등 총 57개 자료를 전면 재작성했습니다. 각 글에는 원문 없이 이해 가능한 상세 요약, 클릭형 괄호 15개, 흐름 빈칸 4개, 출제 포인트 10개, 풍부한 보기와 선택지별 해설을 갖춘 변형문제 10제가 수록되어 있습니다.</p></header><p class="note">검색창에 제재명, 담화·글 유형, 강 또는 단원을 입력하면 해당 자료만 볼 수 있습니다.</p><input id="hs" class="search" type="search" placeholder="예: 후각, 협상, 건의문, 통합 10강" aria-label="화법과 작문 자료 검색">${sections}<p id="none" class="none">검색 결과가 없습니다.</p></main>${script}\n`, "utf8");
}

fs.mkdirSync(CONTENT_DIR, { recursive: true });
const articles = JSON.parse(gunzipSync(Buffer.from(DATA_B64, "base64")).toString("utf8"));
if (articles.length !== 57) throw new Error(`Expected 57 articles, found ${articles.length}`);
if (ANSWERS.length !== 570) throw new Error(`Expected 570 answers, found ${ANSWERS.length}`);
articles.forEach(renderPage);
renderIndex(articles);
console.log(`Generated ${articles.length} hwajak posts and index.`);
