import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

const required = ["WP_URL", "WP_USERNAME", "WP_APP_PASSWORD"];
for (const key of required) {
  if (!process.env[key]) throw new Error(`${key} GitHub Secret이 없습니다.`);
}

const baseUrl = process.env.WP_URL.replace(/\/$/, "");
const auth = "Basic " + Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD.replace(/\s/g, "")}`).toString("base64");
const targetSlug = "very-simple-meta-description";
const common2Slugs = [
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
  if (!response.ok) throw new Error(`${response.status} ${data?.message || text.slice(0, 500)}`);
  return data;
}

function getDescription(html) {
  const match = html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    || html.match(/<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  return match ? match[1].replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").trim() : "";
}

const pluginsEndpoint = `${baseUrl}/wp-json/wp/v2/plugins`;
let plugins;
try {
  plugins = await request(`${pluginsEndpoint}?context=edit&per_page=100`);
} catch (error) {
  console.log(`플러그인 REST 엔드포인트 사용 불가: ${error.message}`);
  process.exit(2);
}

const pluginList = Array.isArray(plugins) ? plugins : [];
const conflicting = pluginList.filter(p => p.status === "active" && /(yoast|rank math|aioseo|all in one seo|seopress|seo framework|slim seo|surerank|site seo|smartcrawl)/i.test(`${p.plugin || ""} ${p.name || ""}`));
if (conflicting.length) {
  throw new Error(`기존 SEO 플러그인이 활성화되어 있어 중복 meta description 방지를 위해 중단: ${conflicting.map(p => p.name || p.plugin).join(", ")}`);
}

let target = pluginList.find(p => String(p.plugin || "").startsWith(`${targetSlug}/`) || String(p.plugin || "") === targetSlug || /VS Meta Description/i.test(p.name || ""));
let activatedByThisRun = false;

if (!target) {
  console.log("VS Meta Description 설치 시작");
  target = await request(pluginsEndpoint, {
    method: "POST",
    body: JSON.stringify({ slug: targetSlug, status: "active" }),
  });
  activatedByThisRun = true;
  console.log(`플러그인 설치·활성화 완료: ${target.name || target.plugin || targetSlug}`);
} else if (target.status !== "active") {
  const pluginId = encodeURIComponent(target.plugin);
  target = await request(`${pluginsEndpoint}/${pluginId}`, {
    method: "POST",
    body: JSON.stringify({ status: "active" }),
  });
  activatedByThisRun = true;
  console.log(`플러그인 활성화 완료: ${target.name || target.plugin}`);
} else {
  console.log(`플러그인 이미 활성: ${target.name || target.plugin}`);
}

await new Promise(resolve => setTimeout(resolve, 2500));
const descriptions = [];
for (const slug of common2Slugs) {
  const response = await fetch(`${baseUrl}/${slug}/`, { headers: { "User-Agent": "modukorean-seo-check/1.0" } });
  const html = await response.text();
  descriptions.push({ slug, status: response.status, description: getDescription(html) });
}

const missing = descriptions.filter(x => x.status !== 200 || !x.description);
const unique = new Set(descriptions.map(x => x.description).filter(Boolean));
console.log(`meta description 검사: ${descriptions.length}개 / 정상 ${descriptions.length - missing.length}개 / 고유 ${unique.size}개`);
for (const item of descriptions) console.log(`${item.description ? "✅" : "⚠️"} ${item.slug} | ${item.status} | ${item.description.length}자`);

if (missing.length || unique.size < 15) {
  if (activatedByThisRun && target?.plugin) {
    try {
      await request(`${pluginsEndpoint}/${encodeURIComponent(target.plugin)}`, {
        method: "POST",
        body: JSON.stringify({ status: "inactive" }),
      });
      console.log("검증 실패로 VS Meta Description을 다시 비활성화했습니다.");
    } catch (rollbackError) {
      console.log(`플러그인 비활성화 롤백 실패: ${rollbackError.message}`);
    }
  }
  throw new Error(`meta description 검증 실패: 누락 ${missing.length}개, 고유 설명 ${unique.size}개`);
}

console.log("공통국어2 meta description 출력 검증 완료 — success");
