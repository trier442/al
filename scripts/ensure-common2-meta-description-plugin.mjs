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

async function inspectDescriptions() {
  const descriptions = [];
  for (const slug of common2Slugs) {
    const response = await fetch(`${baseUrl}/${slug}/?meta_check=${Date.now()}`, { headers: { "User-Agent": "modukorean-seo-check/1.1" } });
    const html = await response.text();
    descriptions.push({ slug, status: response.status, description: getDescription(html) });
  }
  const missing = descriptions.filter(x => x.status !== 200 || !x.description);
  const unique = new Set(descriptions.map(x => x.description).filter(Boolean));
  console.log(`meta description 검사: ${descriptions.length}개 / 정상 ${descriptions.length - missing.length}개 / 고유 ${unique.size}개`);
  for (const item of descriptions) console.log(`${item.description ? "✅" : "⚠️"} ${item.slug} | ${item.status} | ${item.description.length}자`);
  return { descriptions, missing, unique };
}

function pluginParam(pluginPath) {
  return encodeURIComponent(String(pluginPath || "").replace(/\.php$/i, ""));
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
if (conflicting.length) throw new Error(`기존 SEO 플러그인이 활성화되어 있어 중복 출력을 방지합니다: ${conflicting.map(p => p.name || p.plugin).join(", ")}`);

let target = pluginList.find(p => String(p.plugin || "").startsWith(`${targetSlug}/`) || String(p.plugin || "") === targetSlug || /VS Meta Description/i.test(p.name || ""));
let activatedByThisRun = false;

if (!target) {
  console.log("VS Meta Description 설치 시작");
  target = await request(pluginsEndpoint, { method: "POST", body: JSON.stringify({ slug: targetSlug, status: "active" }) });
  activatedByThisRun = true;
  console.log(`플러그인 설치·활성화 완료: ${target.name || target.plugin || targetSlug}`);
} else if (target.status !== "active") {
  target = await request(`${pluginsEndpoint}/${pluginParam(target.plugin)}`, { method: "POST", body: JSON.stringify({ status: "active" }) });
  activatedByThisRun = true;
  console.log(`플러그인 활성화 완료: ${target.name || target.plugin}`);
} else {
  console.log(`플러그인 이미 활성: ${target.name || target.plugin}`);
}
console.log(`VS 플러그인 식별자: ${target.plugin || "알 수 없음"} / 상태: ${target.status || "알 수 없음"}`);

let settings = {};
try {
  settings = await request(`${baseUrl}/wp-json/wp/v2/settings`);
  const related = Object.entries(settings).filter(([key]) => /(vsmd|meta.*desc|desc.*meta|excerpt)/i.test(key));
  console.log(`REST 공개 관련 설정: ${related.length ? related.map(([k,v]) => `${k}=${JSON.stringify(v)}`).join(" | ") : "없음"}`);
  const excerptCandidates = related.filter(([key, value]) => /excerpt/i.test(key) && (typeof value === "boolean" || value === 0 || value === 1 || value === "0" || value === "1"));
  for (const [key, value] of excerptCandidates) {
    if (value === true || value === 1 || value === "1") continue;
    try {
      await request(`${baseUrl}/wp-json/wp/v2/settings`, { method: "POST", body: JSON.stringify({ [key]: true }) });
      console.log(`Excerpt meta description 후보 설정 활성화: ${key}`);
    } catch (error) {
      console.log(`설정 ${key} 활성화 실패: ${error.message}`);
    }
  }
} catch (error) {
  console.log(`WordPress settings 탐지 실패: ${error.message}`);
}

await new Promise(resolve => setTimeout(resolve, 2500));
const check = await inspectDescriptions();
if (!check.missing.length && check.unique.size >= 15) {
  console.log("공통국어2 meta description 출력 검증 완료 — success");
  process.exit(0);
}

// 활성화만으로 설명이 나오지 않으면 사이트 전체에 불필요한 플러그인을 남기지 않는다.
try {
  const latestPlugins = await request(`${pluginsEndpoint}?context=edit&per_page=100`);
  const latest = (Array.isArray(latestPlugins) ? latestPlugins : []).find(p => String(p.plugin || "").startsWith(`${targetSlug}/`) || /VS Meta Description/i.test(p.name || ""));
  if (latest?.status === "active") {
    await request(`${pluginsEndpoint}/${pluginParam(latest.plugin)}`, { method: "POST", body: JSON.stringify({ status: "inactive" }) });
    console.log(`VS Meta Description 안전 비활성화 완료: ${latest.plugin}`);
  } else {
    console.log("VS Meta Description은 이미 비활성 상태입니다.");
  }
} catch (rollbackError) {
  console.log(`플러그인 안전 비활성화 실패: ${rollbackError.message}`);
  throw rollbackError;
}

// 이 단계는 탐지/정리 단계이므로 배포 자체를 실패시키지 않는다. 후속 SEO 검증에서 현재 상태를 기록한다.
console.log(`VS Meta Description은 별도 설정 없이는 excerpt를 출력하지 않아 비활성화했습니다. 누락 ${check.missing.length}개.`);
