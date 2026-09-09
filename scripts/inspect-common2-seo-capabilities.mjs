const baseUrl = String(process.env.WP_URL || "").replace(/\/$/, "");
const username = process.env.WP_USERNAME || "";
const password = String(process.env.WP_APP_PASSWORD || "").replace(/\s/g, "");
if (!baseUrl) throw new Error("WP_URL이 없습니다.");

const auth = username && password
  ? "Basic " + Buffer.from(`${username}:${password}`).toString("base64")
  : "";

async function get(url, authenticated = false) {
  const response = await fetch(url, {
    headers: authenticated && auth ? { Authorization: auth, Connection: "close" } : { Connection: "close" },
  });
  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  if (!response.ok) throw new Error(`${url} -> ${response.status}: ${text.slice(0, 500)}`);
  return { text, data };
}

const root = await get(`${baseUrl}/wp-json/`);
const namespaces = Array.isArray(root.data?.namespaces) ? root.data.namespaces : [];
const routes = root.data?.routes && typeof root.data.routes === "object" ? Object.keys(root.data.routes) : [];
const seoNamespaces = namespaces.filter(v => /(yoast|rank.?math|aioseo|seo)/i.test(String(v)));
const seoRoutes = routes.filter(v => /(yoast|rank.?math|aioseo|seo)/i.test(String(v))).slice(0, 80);
console.log(`SEO 관련 REST namespace: ${seoNamespaces.length ? seoNamespaces.join(", ") : "없음"}`);
console.log(`SEO 관련 REST route: ${seoRoutes.length ? seoRoutes.join(" | ") : "없음"}`);

const slug = "bisang-park-common2-u01-longing";
const pageResp = await get(`${baseUrl}/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}&context=edit`, true);
const page = Array.isArray(pageResp.data) ? pageResp.data[0] : null;
if (!page) throw new Error(`검사 페이지를 찾지 못했습니다: ${slug}`);

const topKeys = Object.keys(page).sort();
const metaKeys = page.meta && typeof page.meta === "object" ? Object.keys(page.meta).sort() : [];
const seoTopKeys = topKeys.filter(v => /(yoast|rank|aioseo|seo|meta)/i.test(v));
const seoMetaKeys = metaKeys.filter(v => /(yoast|rank|aioseo|seo|desc|title)/i.test(v));
console.log(`페이지 REST SEO 관련 필드: ${seoTopKeys.length ? seoTopKeys.join(", ") : "없음"}`);
console.log(`페이지 REST meta SEO 관련 키: ${seoMetaKeys.length ? seoMetaKeys.join(", ") : "없음"}`);
console.log(`페이지 excerpt 길이: ${String(page.excerpt?.raw || page.excerpt?.rendered || "").replace(/<[^>]+>/g, "").trim().length}자`);

const live = await get(`${baseUrl}/${slug}/`);
const html = live.text;
const desc = html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
  || html.match(/<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
const generator = [...html.matchAll(/<meta\b[^>]*name=["']generator["'][^>]*content=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
const clues = [
  ["Yoast", /yoast|wpseo|yoast-schema-graph/i],
  ["Rank Math", /rank-math|rank_math/i],
  ["AIOSEO", /aioseo|all-in-one-seo/i],
].filter(([, re]) => re.test(html)).map(([name]) => name);
console.log(`공개 HTML meta description: ${desc ? `${desc[1].length}자` : "없음"}`);
console.log(`공개 HTML SEO 플러그인 단서: ${clues.length ? clues.join(", ") : "없음"}`);
console.log(`generator: ${generator.length ? generator.join(" | ") : "없음"}`);

if (seoNamespaces.length || seoRoutes.length || seoTopKeys.length || seoMetaKeys.length || clues.length) {
  console.log("SEO 메타를 REST로 직접 제어할 가능성이 있습니다. 위 필드/route를 기준으로 쓰기 가능 여부를 다음 단계에서 검증합니다.");
} else {
  console.log("현재 REST/공개 HTML에서 Yoast·Rank Math·AIOSEO 등 SEO 플러그인 단서를 찾지 못했습니다.");
}
