const required = ["WP_URL", "WP_USERNAME", "WP_APP_PASSWORD"];
for (const key of required) {
  if (!process.env[key]) throw new Error(`${key} GitHub Secret이 없습니다.`);
}

const baseUrl = process.env.WP_URL.replace(/\/$/, "");
const auth = "Basic " + Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD.replace(/\s/g, "")}`).toString("base64");

async function request(path, options = {}, { allow404 = false } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: auth,
      "Content-Type": "application/json; charset=utf-8",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (allow404 && res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status} ${path}: ${data?.message || text.slice(0, 1000)}`);
  return data;
}

function rawTitle(item) {
  return String(item?.title?.raw ?? item?.title?.rendered ?? item?.title ?? "").replace(/<[^>]+>/g, "").trim();
}

function norm(text) {
  return String(text || "")
    .replace(/&middot;|·/g, "·")
    .replace(/\s+/g, "")
    .replace(/[()（）\[\]]/g, "")
    .toLowerCase();
}

function menuIds(item) {
  const value = item?.menus;
  if (Array.isArray(value)) return value.map(Number).filter(Boolean);
  if (value == null || value === "") return [];
  if (typeof value === "object") {
    if (Array.isArray(value.ids)) return value.ids.map(Number).filter(Boolean);
    const id = Number(value.id ?? value.menu ?? 0);
    return id ? [id] : [];
  }
  const id = Number(value);
  return id ? [id] : [];
}

const canonicalDefs = [
  { key: "home", title: "홈", aliases: ["홈"] },
  { key: "g1", title: "고1 국어", aliases: ["고1국어"] },
  { key: "g3", title: "고3 / N수", aliases: ["고3/n수", "고3／n수", "고3n수"] },
  { key: "search", title: "자료 검색", aliases: ["자료검색"] },
  { key: "guide", title: "사이트 안내", aliases: ["사이트안내"] },
  { key: "report", title: "오류 신고·문의", aliases: ["오류신고", "오류신고·문의", "오류신고문의"] },
  { key: "download", title: "문제 파일 다운로드", aliases: ["문제파일다운로드"] },
];
const aliases = new Map();
for (const def of canonicalDefs) for (const alias of def.aliases) aliases.set(norm(alias), def);

const menus = await request(`/wp-json/wp/v2/menus?per_page=100&context=edit`, {}, { allow404: true });
const allItems = await request(`/wp-json/wp/v2/menu-items?per_page=100&context=edit`, {}, { allow404: true });
const locations = await request(`/wp-json/wp/v2/menu-locations?context=edit`, {}, { allow404: true });

if (!Array.isArray(menus) || !Array.isArray(allItems)) {
  console.log("Classic menu REST endpoints are unavailable. No changes were made.");
  process.exit(0);
}

function menuIdFromLocation(value) {
  if (!value) return 0;
  if (Number.isInteger(value)) return value;
  return Number(value.menu ?? value.id ?? 0) || 0;
}

let menuId = 0;
let locationName = "";
if (locations && typeof locations === "object") {
  const preferred = Object.entries(locations).sort(([a], [b]) => {
    const score = s => /primary|header|main/i.test(s) ? 0 : 1;
    return score(a) - score(b);
  });
  for (const [name, value] of preferred) {
    const id = menuIdFromLocation(value);
    if (id) { menuId = id; locationName = name; break; }
  }
}

if (!menuId) {
  const scored = menus.map(menu => {
    const items = allItems.filter(i => menuIds(i).includes(Number(menu.id)));
    const top = items.filter(i => Number(i.parent) === 0);
    const score = top.reduce((n, i) => n + (aliases.has(norm(rawTitle(i))) ? 1 : 0), 0);
    return { menu, score, itemCount: items.length };
  }).sort((a, b) => b.score - a.score || b.itemCount - a.itemCount);
  if (scored[0]?.score) menuId = Number(scored[0].menu.id);
}

if (!menuId) {
  console.log("Primary/header menu could not be identified. No changes were made.");
  process.exit(0);
}

const activeMenu = menus.find(m => Number(m.id) === menuId);
let items = allItems.filter(i => menuIds(i).includes(menuId));
items.sort((a, b) => Number(a.menu_order) - Number(b.menu_order) || Number(a.id) - Number(b.id));

console.log(`Active menu: ${activeMenu?.name || menuId} (#${menuId})${locationName ? ` @ ${locationName}` : ""}`);
console.log("Before top-level:", items.filter(i => Number(i.parent) === 0).map(i => `${i.id}:${rawTitle(i)}`).join(" | "));

async function updateItem(item, payload) {
  return await request(`/wp-json/wp/v2/menu-items/${item.id}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function deleteItem(item) {
  return await request(`/wp-json/wp/v2/menu-items/${item.id}?force=true`, { method: "DELETE" });
}

const deleted = [];
const updated = [];
const keepers = new Map();

const topItems = items.filter(i => Number(i.parent) === 0);
for (const item of topItems) {
  const def = aliases.get(norm(rawTitle(item)));
  if (!def) continue;
  if (!keepers.has(def.key)) {
    keepers.set(def.key, item);
    if (rawTitle(item) !== def.title) {
      await updateItem(item, { title: def.title });
      updated.push(`${item.id}:title→${def.title}`);
    }
  } else {
    await deleteItem(item);
    deleted.push(`${item.id}:${rawTitle(item)}`);
  }
}

const ebsTitleNorm = norm("2027 수능완성 언어와 매체");
const g3 = keepers.get("g3");
const ebsItems = items.filter(i => norm(rawTitle(i)) === ebsTitleNorm);
if (ebsItems.length && g3) {
  const existingChild = ebsItems.find(i => Number(i.parent) === Number(g3.id));
  const keeper = existingChild || ebsItems[0];
  if (Number(keeper.parent) !== Number(g3.id)) {
    await updateItem(keeper, { parent: Number(g3.id) });
    updated.push(`${keeper.id}:parent→${g3.id}`);
  }
  for (const item of ebsItems) {
    if (Number(item.id) === Number(keeper.id)) continue;
    await deleteItem(item);
    deleted.push(`${item.id}:${rawTitle(item)}`);
  }
}

const desiredKeys = ["home", "g1", "g3", "search", "guide", "report", "download"];
for (let index = 0; index < desiredKeys.length; index++) {
  const item = keepers.get(desiredKeys[index]);
  if (!item) continue;
  const desiredOrder = index + 1;
  if (Number(item.menu_order) !== desiredOrder) {
    await updateItem(item, { menu_order: desiredOrder });
    updated.push(`${item.id}:order→${desiredOrder}`);
  }
}

if (activeMenu && activeMenu.auto_add === true) {
  try {
    await request(`/wp-json/wp/v2/menus/${menuId}`, {
      method: "POST",
      body: JSON.stringify({ auto_add: false }),
    });
    updated.push(`menu:${menuId}:auto_add→false`);
  } catch (error) {
    console.log(`auto_add setting could not be changed: ${error.message}`);
  }
}

const finalItems = await request(`/wp-json/wp/v2/menu-items?menus=${menuId}&per_page=100&context=edit`);
const finalTop = finalItems
  .filter(i => Number(i.parent) === 0)
  .sort((a, b) => Number(a.menu_order) - Number(b.menu_order) || Number(a.id) - Number(b.id));

console.log("Deleted:", deleted.length ? deleted.join(" | ") : "none");
console.log("Updated:", updated.length ? updated.join(" | ") : "none");
console.log("After top-level:", finalTop.map(i => `${i.menu_order}:${rawTitle(i)}(#${i.id})`).join(" | "));

const counts = new Map();
for (const item of finalTop) {
  const def = aliases.get(norm(rawTitle(item)));
  if (!def) continue;
  counts.set(def.key, (counts.get(def.key) || 0) + 1);
}
const remainingDuplicates = [...counts.entries()].filter(([, count]) => count > 1);
if (remainingDuplicates.length) {
  throw new Error(`Top-level duplicates remain: ${JSON.stringify(remainingDuplicates)}`);
}

console.log("Header menu cleanup completed successfully.");
