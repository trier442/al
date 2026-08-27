import fs from "node:fs";
import path from "node:path";

const required = ["WP_URL", "WP_USERNAME", "WP_APP_PASSWORD"];
for (const key of required) {
  if (!process.env[key]) throw new Error(`${key} GitHub Secret이 없습니다.`);
}

const baseUrl = process.env.WP_URL.replace(/\/$/, "");
const auth = "Basic " + Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD.replace(/\s/g, "")}`).toString("base64");

async function wpFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: auth, ...(options.headers || {}) },
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!res.ok) {
    const detail = data?.message || text.slice(0, 1500);
    throw new Error(`WordPress ${res.status}: ${detail}`);
  }
  return data;
}

async function ensureCategory({ name, slug, parent = 0, description = "" }) {
  const found = await wpFetch(`${baseUrl}/wp-json/wp/v2/categories?slug=${encodeURIComponent(slug)}&context=edit`);
  if (found.length) {
    const cat = found[0];
    if (Number(cat.parent) !== Number(parent) || cat.name !== name) {
      return await wpFetch(`${baseUrl}/wp-json/wp/v2/categories/${cat.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ name, parent, description }),
      });
    }
    return cat;
  }
  return await wpFetch(`${baseUrl}/wp-json/wp/v2/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ name, slug, parent, description }),
  });
}

async function getPostBySlug(slug) {
  const rows = await wpFetch(`${baseUrl}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&context=edit&status=any`);
  return rows[0] || null;
}

async function updatePost(id, payload) {
  return await wpFetch(`${baseUrl}/wp-json/wp/v2/posts/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
}

async function ensurePage({ title, slug, content }) {
  const rows = await wpFetch(`${baseUrl}/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}&context=edit&status=any`);
  if (rows.length) {
    return await wpFetch(`${baseUrl}/wp-json/wp/v2/pages/${rows[0].id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ title, slug, status: "publish", content }),
    });
  }
  return await wpFetch(`${baseUrl}/wp-json/wp/v2/pages`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ title, slug, status: "publish", content }),
  });
}

function upsertCategoriesMeta(file, ids) {
  const full = path.join(process.cwd(), file);
  let text = fs.readFileSync(full, "utf8");
  const line = `<!-- categories: ${ids.join(",")} -->`;
  if (/<!--\s*categories\s*:[\s\S]*?-->/i.test(text)) {
    text = text.replace(/<!--\s*categories\s*:[\s\S]*?-->/i, line);
  } else if (/<!--\s*type\s*:[\s\S]*?-->/i.test(text)) {
    text = text.replace(/(<!--\s*type\s*:[\s\S]*?-->)/i, `$1\n${line}`);
  } else {
    text = `${line}\n${text}`;
  }
  fs.writeFileSync(full, text, "utf8");
}

const root = await ensureCategory({
  name: "고3 / N수",
  slug: "grade-3-nsu",
  description: "고3 및 N수생을 위한 국어 학습 자료",
});
const kice = await ensureCategory({
  name: "평가원·수능 기출 분석",
  slug: "kice-suneung-analysis",
  parent: root.id,
  description: "평가원 모의평가와 대학수학능력시험 국어 기출 지문·문제·해설",
});
const year2018 = await ensureCategory({
  name: "2018학년도",
  slug: "kice-2018",
  parent: kice.id,
});
const june2018 = await ensureCategory({
  name: "6월 모의평가",
  slug: "kice-2018-june",
  parent: year2018.id,
});

const categoryIds = [root.id, kice.id, year2018.id, june2018.id];
const targets = [
  {
    slug: "2018-june-korean-reading-yulgok-sugichiin-01-06",
    label: "1~6번 · 율곡 이이의 수기치인·이기론",
    file: "wordpress-content/2018-june-korean-reading-yulgok-sugichiin-01-06.html",
  },
  {
    slug: "2018-june-korean-reading-monetary-policy-07-10",
    label: "7~10번 · 통화 정책과 공개 시장 운영",
    file: "wordpress-content/2018-june-korean-reading-monetary-policy-07-10.html",
  },
  {
    slug: "2018-june-korean-literature-literary-time-gopung-gyeolbing-11-14",
    label: "11~14번 · 문학적 시간·고풍 의상·결빙의 아버지",
    file: "wordpress-content/2018-june-korean-literature-literary-time-gopung-gyeolbing-11-14.html",
  },
];

const published = [];
for (const target of targets) {
  const post = await getPostBySlug(target.slug);
  if (!post) throw new Error(`게시물을 찾지 못했습니다: ${target.slug}`);
  const updated = await updatePost(post.id, { categories: categoryIds });
  published.push({ ...target, id: updated.id, link: updated.link });
  upsertCategoriesMeta(target.file, categoryIds);
}

// 11~14번 중복 글 정리: 깨끗한 canonical slug를 유지하고 -2 글은 휴지통으로 보냅니다.
const duplicateSlug = "2018-june-korean-literature-literary-time-gopung-gyeolbing-11-14-2";
const duplicate = await getPostBySlug(duplicateSlug);
let duplicateAction = "none";
if (duplicate) {
  await wpFetch(`${baseUrl}/wp-json/wp/v2/posts/${duplicate.id}`, { method: "DELETE" });
  duplicateAction = `trashed:${duplicate.id}`;
}

const hubCards = published.map(p => `<li><a href="${p.link}">${p.label}</a></li>`).join("\n");
const hubContent = `
<section class="modu-kice-hub" style="max-width:980px;margin:0 auto;padding:20px 0 50px;line-height:1.75">
  <p style="font-weight:700;color:#315c49;margin:0 0 8px">고3 / N수 · 평가원 기출</p>
  <h1 style="margin:0 0 16px">평가원·수능 기출 분석</h1>
  <p style="font-size:17px;margin:0 0 34px">평가원 모의평가와 수능 국어 기출을 연도와 시험별로 묶어 지문, 문제, 정답과 선택지별 해설을 확인할 수 있도록 정리합니다.</p>
  <section style="border:1px solid #dfe5e2;border-radius:14px;padding:24px 26px;background:#fff">
    <p style="font-size:14px;font-weight:700;color:#667085;margin:0 0 4px">2018학년도</p>
    <h2 style="margin:0 0 16px">6월 모의평가</h2>
    <ul style="margin:0;padding-left:22px">${hubCards}</ul>
    <p style="margin:20px 0 0"><a href="${june2018.link}" style="font-weight:700">2018학년도 6월 모의평가 카테고리 전체 보기 →</a></p>
  </section>
</section>`;

const hub = await ensurePage({
  title: "평가원·수능 기출 분석",
  slug: "kice-korean-analysis",
  content: hubContent,
});

const homeSection = `<!-- MODU_KICE_SECTION_START -->
<section class="modu-kice-home" style="margin:48px 0;padding:28px;border:1px solid #dfe5e2;border-radius:16px;background:#f8faf9">
  <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#315c49">고3 / N수</p>
  <h2 style="margin:0 0 10px">평가원·수능 기출 분석</h2>
  <p style="margin:0 0 20px">평가원 모의평가와 수능 국어를 연도·시험별로 정리합니다. 지문과 문제뿐 아니라 정답 근거와 선택지별 해설까지 한곳에서 확인할 수 있습니다.</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:18px">
    ${published.map(p => `<a href="${p.link}" style="display:block;padding:16px 17px;border:1px solid #d7dfda;border-radius:12px;background:#fff;text-decoration:none;color:inherit;font-weight:700">${p.label}</a>`).join("\n    ")}
  </div>
  <a href="${hub.link}" style="font-weight:800;text-decoration:none">평가원·수능 기출 분석 전체 목차 →</a>
</section>
<!-- MODU_KICE_SECTION_END -->`;

let homepage = { updated: false, id: 0, link: baseUrl, reason: "" };
try {
  const settings = await wpFetch(`${baseUrl}/wp-json/wp/v2/settings?context=edit`);
  const frontId = Number(settings.page_on_front) || 0;
  if (settings.show_on_front === "page" && frontId) {
    const front = await wpFetch(`${baseUrl}/wp-json/wp/v2/pages/${frontId}?context=edit`);
    const raw = front.content?.raw || "";
    const marker = /<!-- MODU_KICE_SECTION_START -->[\s\S]*?<!-- MODU_KICE_SECTION_END -->/;
    let next;
    if (marker.test(raw)) {
      next = raw.replace(marker, homeSection);
    } else {
      const recentIndex = raw.indexOf("최근 업데이트");
      const recentSectionStart = recentIndex >= 0 ? raw.lastIndexOf("<section", recentIndex) : -1;
      if (recentSectionStart >= 0) {
        next = raw.slice(0, recentSectionStart) + homeSection + "\n" + raw.slice(recentSectionStart);
      } else {
        next = raw + "\n" + homeSection;
      }
    }
    const updatedFront = await wpFetch(`${baseUrl}/wp-json/wp/v2/pages/${frontId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ content: next }),
    });
    homepage = { updated: true, id: frontId, link: updatedFront.link || baseUrl, reason: "static-front-page" };
  } else {
    homepage.reason = `show_on_front=${settings.show_on_front}, page_on_front=${frontId}`;
  }
} catch (error) {
  homepage.reason = `homepage-update-failed: ${error.message}`;
}

const result = {
  generated_at: new Date().toISOString(),
  categories: {
    root: { id: root.id, name: root.name, link: root.link },
    kice: { id: kice.id, name: kice.name, link: kice.link },
    year2018: { id: year2018.id, name: year2018.name, link: year2018.link },
    june2018: { id: june2018.id, name: june2018.name, link: june2018.link },
  },
  hub: { id: hub.id, link: hub.link },
  posts: published.map(({ file, ...rest }) => rest),
  duplicate_action: duplicateAction,
  homepage,
};

fs.writeFileSync("scripts/kice-site-structure.json", JSON.stringify(result, null, 2) + "\n", "utf8");
console.log(JSON.stringify(result, null, 2));
