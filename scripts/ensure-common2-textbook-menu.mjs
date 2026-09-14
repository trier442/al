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
  return String(item?.title?.raw ?? item?.title?.rendered ?? item?.title ?? "")
    .replace(/<[^>]+>/g, "")
    .trim();
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

function menuIdFromLocation(value) {
  if (!value) return 0;
  if (Number.isInteger(value)) return value;
  return Number(value.menu ?? value.id ?? 0) || 0;
}

const menus = await request(`/wp-json/wp/v2/menus?per_page=100&context=edit`, {}, { allow404: true });
let allItems = await request(`/wp-json/wp/v2/menu-items?per_page=100&context=edit`, {}, { allow404: true });
const locations = await request(`/wp-json/wp/v2/menu-locations?context=edit`, {}, { allow404: true });

if (!Array.isArray(menus) || !Array.isArray(allItems)) {
  throw new Error("Classic menu REST endpoints are unavailable.");
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
    const score = top.some(i => norm(rawTitle(i)) === norm("고1 국어")) ? 10 : 0;
    return { menu, score, itemCount: items.length };
  }).sort((a, b) => b.score - a.score || b.itemCount - a.itemCount);
  if (scored[0]?.score) menuId = Number(scored[0].menu.id);
}

if (!menuId) throw new Error("Primary/header menu could not be identified.");

let items = allItems.filter(i => menuIds(i).includes(menuId));
items.sort((a, b) => Number(a.menu_order) - Number(b.menu_order) || Number(a.id) - Number(b.id));
console.log(`Active menu #${menuId}${locationName ? ` @ ${locationName}` : ""}`);

async function updateItem(item, payload) {
  const updated = await request(`/wp-json/wp/v2/menu-items/${item.id}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  Object.assign(item, updated);
  return updated;
}

async function createItem(payload) {
  const created = await request(`/wp-json/wp/v2/menu-items`, {
    method: "POST",
    body: JSON.stringify({ status: "publish", menus: menuId, ...payload }),
  });
  items.push(created);
  return created;
}

async function deleteItem(item) {
  const deleted = await request(`/wp-json/wp/v2/menu-items/${item.id}?force=true`, { method: "DELETE" }, { allow404: true });
  items = items.filter(i => Number(i.id) !== Number(item.id));
  return deleted;
}

const g1 = items.find(i => Number(i.parent) === 0 && norm(rawTitle(i)) === norm("고1 국어"));
if (!g1) throw new Error("고1 국어 상위 메뉴를 찾지 못했습니다.");

let common2 = items.find(i => Number(i.parent) === Number(g1.id) && norm(rawTitle(i)) === norm("공통국어 2"));
if (!common2) {
  common2 = await createItem({
    title: "공통국어 2",
    parent: Number(g1.id),
    type: "custom",
    url: `${baseUrl}/#common2`,
  });
  console.log(`Created category: 공통국어 2 (#${common2.id})`);
} else if (rawTitle(common2) !== "공통국어 2") {
  await updateItem(common2, { title: "공통국어 2" });
}

const textbooks = [
  {
    title: "비상 박영민",
    slugs: ["비상-박영민-공통국어2", "bisang-park-common2-index"],
    aliases: ["비상 박영민", "비상 박영민 공통국어2", "비상(박영민)", "비상(박영민) 공통국어2"],
  },
  {
    title: "비상 강호영",
    slugs: ["비상-강호영-공통국어2"],
    aliases: ["비상 강호영", "비상 강호영 공통국어2", "비상(강호영)", "비상(강호영) 공통국어2"],
  },
  {
    title: "천재 김수학",
    slugs: ["천재-김수학-공통국어2"],
    aliases: ["천재 김수학", "천재 김수학 공통국어2", "천재(김수학)", "천재(김수학) 공통국어2"],
  },
  {
    title: "천재 김종철",
    slugs: ["천재-김종철-공통국어2"],
    aliases: ["천재 김종철", "천재 김종철 공통국어2", "천재(김종철)", "천재(김종철) 공통국어2"],
  },
  {
    title: "미래엔 신유식",
    slugs: ["미래엔-신유식-공통국어2"],
    aliases: ["미래엔 신유식", "미래엔 신유식 공통국어2", "미래엔(신유식)", "미래엔(신유식) 공통국어2"],
  },
  {
    title: "지학사 김철회",
    slugs: ["지학사-김철회-공통국어2"],
    aliases: ["지학사 김철회", "지학사 김철회 공통국어2", "지학사(김철회)", "지학사(김철회) 공통국어2"],
  },
  {
    title: "창비",
    slugs: ["창비-공통국어2"],
    aliases: ["창비", "창비 공통국어2"],
  },
];

async function findPage(slugs) {
  for (const slug of slugs) {
    const pages = await request(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}&context=edit&per_page=10`, {}, { allow404: true });
    if (Array.isArray(pages) && pages[0]) return pages[0];
  }
  return null;
}

for (let index = 0; index < textbooks.length; index++) {
  const textbook = textbooks[index];
  const page = await findPage(textbook.slugs);
  const aliasNorms = new Set(textbook.aliases.map(norm));
  const candidates = items.filter(i =>
    aliasNorms.has(norm(rawTitle(i))) ||
    (page && Number(i.object_id) === Number(page.id))
  );

  let keeper = candidates.find(i => Number(i.parent) === Number(common2.id)) || candidates[0] || null;
  const payload = {
    title: textbook.title,
    parent: Number(common2.id),
    menu_order: index + 1,
  };

  if (!keeper) {
    keeper = page
      ? await createItem({ ...payload, type: "post_type", object: "page", object_id: Number(page.id) })
      : await createItem({ ...payload, type: "custom", url: `${baseUrl}/${textbook.slugs[0]}/` });
    console.log(`Created: ${textbook.title} (#${keeper.id})`);
  } else {
    const patch = {};
    if (rawTitle(keeper) !== textbook.title) patch.title = textbook.title;
    if (Number(keeper.parent) !== Number(common2.id)) patch.parent = Number(common2.id);
    if (Number(keeper.menu_order) !== index + 1) patch.menu_order = index + 1;
    if (Object.keys(patch).length) {
      await updateItem(keeper, patch);
      console.log(`Updated: ${textbook.title} (#${keeper.id}) ${JSON.stringify(patch)}`);
    }
  }

  for (const duplicate of candidates) {
    if (Number(duplicate.id) === Number(keeper.id)) continue;
    await deleteItem(duplicate);
    console.log(`Deleted duplicate: ${rawTitle(duplicate)} (#${duplicate.id})`);
  }
}

const finalItems = await request(`/wp-json/wp/v2/menu-items?menus=${menuId}&per_page=100&context=edit`);
const children = finalItems
  .filter(i => Number(i.parent) === Number(common2.id))
  .sort((a, b) => Number(a.menu_order) - Number(b.menu_order) || Number(a.id) - Number(b.id));

const expected = textbooks.map(t => t.title);
const actual = children.map(rawTitle).filter(title => expected.includes(title));
console.log("공통국어 2 children:", children.map(i => `${i.menu_order}:${rawTitle(i)}(#${i.id})`).join(" | "));

if (actual.length !== expected.length || expected.some((title, i) => actual[i] !== title)) {
  throw new Error(`공통국어 2 교과서 메뉴 검증 실패. expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`);
}

for (const title of expected) {
  const count = children.filter(i => rawTitle(i) === title).length;
  if (count !== 1) throw new Error(`${title} 메뉴 수가 ${count}개입니다.`);
}

console.log("공통국어 2 상단 카테고리 7종 구성이 완료되었습니다.");
