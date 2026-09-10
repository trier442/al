import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

const required = ["WP_URL", "WP_USERNAME", "WP_APP_PASSWORD"];
for (const key of required) if (!process.env[key]) throw new Error(`${key} GitHub Secret이 없습니다.`);

const baseUrl = process.env.WP_URL.replace(/\/$/, "");
const auth = "Basic " + Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD.replace(/\s/g, "")}`).toString("base64");
const pluginsEndpoint = `${baseUrl}/wp-json/wp/v2/plugins`;
const targetSlug = "raechal-seo-connector";
const slugs = [
  "bisang-park-common2-u01-longing","bisang-park-common2-u02-dream","bisang-park-common2-u03-creative-brain","bisang-park-common2-u04-creativity-truth","bisang-park-common2-u05-language-media-change","bisang-park-common2-u06-orthography","bisang-park-common2-u07-media-perspectives","bisang-park-common2-u08-report-writing","bisang-park-common2-u09-seogyeong","bisang-park-common2-u10-jaemangmaega","bisang-park-common2-u11-jindallaekkot","bisang-park-common2-u12-ganghosasiga","bisang-park-common2-u13-sangchungok","bisang-park-common2-u14-nonbat","bisang-park-common2-u15-bombom","bisang-park-common2-u16-heungbojeon","bisang-park-common2-u17-consumption","bisang-park-common2-u18-negotiation","bisang-park-common2-u19-argument-writing"
];

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: auth, "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!response.ok) throw new Error(`${response.status} ${data?.message || text.slice(0, 800)}`);
  return data;
}

async function publicHtml(slug) {
  const response = await fetch(`${baseUrl}/${slug}/?common2_meta_check=${Date.now()}_${Math.random()}`, {
    redirect: "follow",
    headers: { "User-Agent": "ModuKorean-SEO-Meta/2.0", "Cache-Control": "no-cache" },
  });
  const html = await response.text();
  if (!response.ok) throw new Error(`${slug}: public HTTP ${response.status}`);
  return html;
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}
function stripHtml(value) {
  return decodeEntities(String(value || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
function titleOf(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? stripHtml(m[1]) : "";
}
function canonicalsOf(html) {
  return [...html.matchAll(/<link\b[^>]*rel=["'][^"']*canonical[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
}
function descriptionsOf(html) {
  const a = [...html.matchAll(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/gi)].map(m => decodeEntities(m[1]).trim());
  const b = [...html.matchAll(/<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/gi)].map(m => decodeEntities(m[1]).trim());
  return [...a, ...b].filter(Boolean);
}
function noindexOf(html) {
  return [...html.matchAll(/<meta\b[^>]*name=["'](?:robots|googlebot)["'][^>]*content=["']([^"']*)["'][^>]*>/gi)].some(m => /\bnoindex\b/i.test(m[1]));
}
function normalizeUrl(value) { return String(value || "").replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase(); }
function selfHref(plugin) {
  const self = plugin?._links?.self;
  if (Array.isArray(self) && self[0]?.href) return self[0].href;
  return "";
}
async function listPlugins() {
  const data = await request(`${pluginsEndpoint}?context=edit&per_page=100`);
  return Array.isArray(data) ? data : [];
}
async function setPluginStatus(plugin, status) {
  const href = selfHref(plugin);
  if (!href) throw new Error(`${plugin?.name || plugin?.plugin || "플러그인"}: REST self 링크가 없습니다.`);
  return request(href, { method: "POST", body: JSON.stringify({ status }) });
}

// 1) 앞선 시험용 VS Meta Description은 설명을 출력하지 못했으므로 먼저 정리한다.
let plugins = await listPlugins();
for (const plugin of plugins.filter(p => /VS Meta Description/i.test(p.name || "") || String(p.plugin || "").startsWith("very-simple-meta-description/"))) {
  if (plugin.status === "active") {
    await setPluginStatus(plugin, "inactive");
    console.log(`불필요한 시험 플러그인 비활성화: ${plugin.name || plugin.plugin}`);
  }
}

plugins = await listPlugins();
const conflicting = plugins.filter(p => p.status === "active" && /(yoast|rank math|aioseo|all in one seo|seopress|seo framework|slim seo|surerank|site seo|smartcrawl)/i.test(`${p.plugin || ""} ${p.name || ""}`));
if (conflicting.length) throw new Error(`기존 SEO 플러그인과 충돌 가능성이 있어 중단: ${conflicting.map(p => p.name || p.plugin).join(", ")}`);

// 2) 적용 전 공개 상태를 저장한다.
const baseline = new Map();
for (const slug of slugs) {
  const html = await publicHtml(slug);
  const canonicals = canonicalsOf(html);
  baseline.set(slug, { title: titleOf(html), canonical: canonicals[0] || "", canonicalCount: canonicals.length, noindex: noindexOf(html) });
}

// 3) REST로 SEO 설명만 제어할 수 있는 경량 커넥터를 설치/활성화한다.
plugins = await listPlugins();
let target = plugins.find(p => String(p.plugin || "").startsWith(`${targetSlug}/`) || /Raechal SEO Connector/i.test(p.name || ""));
let activatedByThisRun = false;
if (!target) {
  target = await request(pluginsEndpoint, { method: "POST", body: JSON.stringify({ slug: targetSlug, status: "active" }) });
  activatedByThisRun = true;
  console.log(`Raechal SEO Connector 설치·활성화: ${target.plugin || target.name}`);
} else if (target.status !== "active") {
  target = await setPluginStatus(target, "active");
  activatedByThisRun = true;
  console.log(`Raechal SEO Connector 활성화: ${target.plugin || target.name}`);
} else {
  console.log(`Raechal SEO Connector 이미 활성: ${target.plugin || target.name}`);
}

// 플러그인 건강 상태를 확인한다. 이 요청은 외부 SaaS 연결 없이 로컬 REST만 사용한다.
try {
  const health = await request(`${baseUrl}/wp-json/raechal-seo/v1/health`);
  console.log(`Raechal health: ${JSON.stringify(health).slice(0, 500)}`);
} catch (error) {
  console.log(`Raechal health 경고: ${error.message}`);
}

const touched = [];
let failure = null;
try {
  // 4) 각 페이지의 WordPress excerpt를 해당 페이지의 SEO description 필드에만 기록한다.
  for (const slug of slugs) {
    const pages = await request(`${baseUrl}/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}&context=edit&per_page=1`);
    if (!Array.isArray(pages) || !pages[0]?.id) throw new Error(`${slug}: WordPress 페이지를 찾지 못했습니다.`);
    const page = pages[0];
    const excerpt = stripHtml(page.excerpt?.raw || page.excerpt?.rendered || "");
    if (excerpt.length < 30) throw new Error(`${slug}: excerpt가 너무 짧습니다(${excerpt.length}자).`);
    await request(`${baseUrl}/wp-json/wp/v2/pages/${page.id}`, {
      method: "POST",
      body: JSON.stringify({ meta: { _raechal_seo_description: excerpt } }),
    });
    touched.push({ id: page.id, slug });
    console.log(`description 저장: ${slug} | ${excerpt.length}자`);
  }

  await new Promise(resolve => setTimeout(resolve, 2500));

  // 5) 공개 HTML을 전수 검사한다. 설명 외 title/canonical/robots가 바뀌면 즉시 실패 처리한다.
  const descriptions = [];
  for (const slug of slugs) {
    const html = await publicHtml(slug);
    const base = baseline.get(slug);
    const title = titleOf(html);
    const canonicals = canonicalsOf(html);
    const descriptionsNow = descriptionsOf(html);
    const noindex = noindexOf(html);
    const expectedCanonical = `${baseUrl}/${slug}/`;
    const issues = [];
    if (descriptionsNow.length !== 1) issues.push(`meta description ${descriptionsNow.length}개`);
    if (title !== base.title) issues.push("title 변경");
    if (canonicals.length !== 1) issues.push(`canonical ${canonicals.length}개`);
    else if (normalizeUrl(canonicals[0]) !== normalizeUrl(expectedCanonical)) issues.push(`canonical 불일치 ${canonicals[0]}`);
    if (noindex) issues.push("noindex 감지");
    if (issues.length) throw new Error(`${slug}: ${issues.join(", ")}`);
    descriptions.push(descriptionsNow[0]);
    console.log(`✅ ${slug} | description=${descriptionsNow[0].length}자 | canonical=1 | title 유지`);
  }
  const unique = new Set(descriptions);
  if (unique.size !== slugs.length) throw new Error(`meta description 고유성 실패: ${unique.size}/${slugs.length}`);
  console.log(`공통국어2 meta description 공개 검증 완료: ${slugs.length}/${slugs.length}개, 고유 ${unique.size}개 — success`);
} catch (error) {
  failure = error;
}

if (failure) {
  console.log(`검증 실패, 자동 롤백 시작: ${failure.message}`);
  for (const item of touched) {
    try {
      await request(`${baseUrl}/wp-json/wp/v2/pages/${item.id}`, { method: "POST", body: JSON.stringify({ meta: { _raechal_seo_description: "" } }) });
    } catch (error) { console.log(`${item.slug} meta 롤백 경고: ${error.message}`); }
  }
  try {
    const latest = (await listPlugins()).find(p => String(p.plugin || "").startsWith(`${targetSlug}/`) || /Raechal SEO Connector/i.test(p.name || ""));
    if (latest?.status === "active" && activatedByThisRun) {
      await setPluginStatus(latest, "inactive");
      console.log("Raechal SEO Connector 자동 비활성화 완료");
    }
  } catch (error) { console.log(`Raechal 비활성화 롤백 경고: ${error.message}`); }
  throw failure;
}
