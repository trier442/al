const site = (process.env.WP_URL || "https://modukorean.co.kr").replace(/\/$/, "");
const indexSlug = "bisang-park-common2-index";
const slugs = [
  "bisang-park-common2-u01-longing",
  "bisang-park-common2-u02-dream",
  "bisang-park-common2-u03-creative-brain",
  "bisang-park-common2-u04-creativity-truth",
  "bisang-park-common2-u05-language-media-change",
  "bisang-park-common2-u06-orthography",
  "bisang-park-common2-u07-media-perspectives",
  "bisang-park-common2-u08-report-writing",
  "bisang-park-common2-u09-seogyeong",
  "bisang-park-common2-u10-jaemangmaega",
  "bisang-park-common2-u11-jindallaekkot",
  "bisang-park-common2-u12-ganghosasiga",
  "bisang-park-common2-u13-sangchungok",
  "bisang-park-common2-u14-nonbat",
  "bisang-park-common2-u15-bombom",
  "bisang-park-common2-u16-heungbojeon",
  "bisang-park-common2-u17-consumption",
  "bisang-park-common2-u18-negotiation",
  "bisang-park-common2-u19-argument-writing",
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const normalize = value => String(value || "").replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
const absolute = slug => `${site}/${slug}/`;

async function get(url, attempts = 3) {
  let lastError;
  for (let i = 1; i <= attempts; i++) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": "ModuKorean-SEO-Audit/1.0" },
      });
      const text = await response.text();
      return { response, text };
    } catch (error) {
      lastError = error;
      if (i < attempts) await sleep(1500 * i);
    }
  }
  throw lastError;
}

function pickTag(html, pattern) {
  const match = html.match(pattern);
  return match ? match[1].trim() : "";
}

function hasNoindex(html, headers) {
  const xRobots = headers.get("x-robots-tag") || "";
  const robotsTags = [...html.matchAll(/<meta\b[^>]*name=["'](?:robots|googlebot)["'][^>]*content=["']([^"']*)["'][^>]*>/gi)]
    .map(match => match[1]);
  return /\bnoindex\b/i.test(xRobots) || robotsTags.some(value => /\bnoindex\b/i.test(value));
}

function canonicalOf(html) {
  const a = html.match(/<link\b[^>]*rel=["'][^"']*canonical[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  if (a) return a[1];
  const b = html.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["'][^"']*canonical[^"']*["'][^>]*>/i);
  return b ? b[1] : "";
}

function descriptionOf(html) {
  const a = html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  if (a) return a[1].trim();
  const b = html.match(/<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  return b ? b[1].trim() : "";
}

async function auditPage(slug, index) {
  const expected = absolute(slug);
  const cacheBust = `${expected}?modu_seo_audit=${Date.now()}_${index}`;
  const { response, text } = await get(cacheBust);
  const title = pickTag(text, /<title[^>]*>([\s\S]*?)<\/title>/i).replace(/<[^>]+>/g, "").trim();
  const canonical = canonicalOf(text);
  const description = descriptionOf(text);
  const noindex = hasNoindex(text, response.headers);
  const hasIndex = text.includes(`href="${absolute(indexSlug)}"`) || text.includes(`href='${absolute(indexSlug)}'`);
  const hasPrev = index === 0 || text.includes(`href="${absolute(slugs[index - 1])}"`) || text.includes(`href='${absolute(slugs[index - 1])}'`);
  const hasNext = index === slugs.length - 1 || text.includes(`href="${absolute(slugs[index + 1])}"`) || text.includes(`href='${absolute(slugs[index + 1])}'`);
  const navCount = (text.match(/class=["'][^"']*pk-seq-nav/g) || []).length;

  const errors = [];
  const warnings = [];
  if (!response.ok) errors.push(`HTTP ${response.status}`);
  if (noindex) errors.push("noindex 감지");
  if (!title) errors.push("title 없음");
  if (!hasIndex) errors.push("통합 목차 링크 없음");
  if (!hasPrev) errors.push("이전 글 링크 없음");
  if (!hasNext) errors.push("다음 글 링크 없음");
  if (navCount < 2) errors.push(`순차 내비게이션 ${navCount}개`);
  if (!canonical) warnings.push("canonical 없음");
  else if (normalize(canonical) !== normalize(expected)) warnings.push(`canonical 불일치: ${canonical}`);
  if (!description) warnings.push("meta description 없음");

  console.log(`${errors.length ? "❌" : warnings.length ? "⚠️" : "✅"} ${slug} | ${response.status} | title=${title.length}자 | canonical=${canonical || "없음"} | description=${description.length || 0}자 | nav=${navCount}`);
  for (const message of errors) console.log(`  오류: ${message}`);
  for (const message of warnings) console.log(`  경고: ${message}`);
  return { slug, expected, errors, warnings };
}

function xmlLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(match => match[1].replace(/&amp;/g, "&"));
}

async function collectSitemapUrls() {
  const roots = [`${site}/wp-sitemap.xml`, `${site}/sitemap_index.xml`];
  for (const root of roots) {
    try {
      const { response, text } = await get(root, 2);
      if (!response.ok || !/<(?:sitemapindex|urlset)\b/i.test(text)) continue;
      const first = xmlLocs(text);
      const urls = new Set();
      if (/<urlset\b/i.test(text)) first.forEach(url => urls.add(normalize(url)));
      if (/<sitemapindex\b/i.test(text)) {
        for (const sitemap of first.slice(0, 100)) {
          try {
            const child = await get(sitemap, 2);
            if (!child.response.ok) continue;
            xmlLocs(child.text).forEach(url => urls.add(normalize(url)));
          } catch (error) {
            console.log(`  사이트맵 하위 문서 경고: ${sitemap} - ${error.message}`);
          }
        }
      }
      return { root, urls };
    } catch (error) {
      console.log(`사이트맵 후보 접근 경고: ${root} - ${error.message}`);
    }
  }
  return { root: "", urls: new Set() };
}

const results = [];
for (let i = 0; i < slugs.length; i++) results.push(await auditPage(slugs[i], i));

const indexAudit = await get(`${absolute(indexSlug)}?modu_seo_audit=${Date.now()}`);
const indexNoindex = hasNoindex(indexAudit.text, indexAudit.response.headers);
const indexCanonical = canonicalOf(indexAudit.text);
console.log(`${indexAudit.response.ok && !indexNoindex ? "✅" : "❌"} 통합 목차 | ${indexAudit.response.status} | canonical=${indexCanonical || "없음"}`);
if (!indexAudit.response.ok) results.push({ slug: indexSlug, errors: [`HTTP ${indexAudit.response.status}`], warnings: [] });
if (indexNoindex) results.push({ slug: indexSlug, errors: ["noindex 감지"], warnings: [] });

const sitemap = await collectSitemapUrls();
let sitemapMissing = [];
if (sitemap.root) {
  sitemapMissing = [indexSlug, ...slugs].filter(slug => !sitemap.urls.has(normalize(absolute(slug))));
  console.log(`사이트맵 확인: ${sitemap.root} / 수집 URL ${sitemap.urls.size}개 / 공통국어2 누락 ${sitemapMissing.length}개`);
  sitemapMissing.forEach(slug => console.log(`  사이트맵 누락: ${slug}`));
} else {
  console.log("⚠️ WordPress 사이트맵을 자동 확인하지 못했습니다.");
}

const errors = results.flatMap(result => result.errors || []);
const warnings = results.flatMap(result => result.warnings || []);
console.log(`공통국어2 SEO 검증 결과: 페이지 ${slugs.length + 1}개 / 오류 ${errors.length}건 / 경고 ${warnings.length}건 / 사이트맵 누락 ${sitemapMissing.length}개`);
if (errors.length) process.exitCode = 1;
