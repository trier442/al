import fs from "node:fs";
import path from "node:path";

const required = ["WP_URL", "WP_USERNAME", "WP_APP_PASSWORD"];
for (const key of required) {
  if (!process.env[key]) throw new Error(`${key} GitHub Secret이 없습니다.`);
}

const baseUrl = process.env.WP_URL.replace(/\/$/, "");
const auth = "Basic " + Buffer.from(
  `${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD.replace(/\s/g, "")}`
).toString("base64");

async function wpFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: auth,
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!response.ok) {
    throw new Error(`WordPress ${response.status}: ${data.message || text}`);
  }
  return data;
}

function parseFile(file) {
  const raw = fs.readFileSync(file, "utf8");
  const meta = {};
  const pattern = /<!--\s*([a-z_]+)\s*:\s*(.*?)\s*-->/g;
  let match;
  while ((match = pattern.exec(raw))) meta[match[1]] = match[2].trim();
  const content = raw.replace(pattern, "").trim();

  if (!meta.title) throw new Error(`${file}: title이 없습니다.`);
  if (!meta.slug) throw new Error(`${file}: slug가 없습니다.`);

  return {
    meta: {
      type: meta.type === "page" ? "pages" : "posts",
      status: ["draft", "publish", "private", "pending"].includes(meta.status)
        ? meta.status
        : "draft",
      title: meta.title,
      slug: meta.slug,
      excerpt: meta.excerpt || "",
      categories: (meta.categories || "")
        .split(",")
        .map(v => Number(v.trim()))
        .filter(Number.isInteger),
      featured_image: meta.featured_image || "",
    },
    content,
  };
}

function mimeType(file) {
  const ext = path.extname(file).toLowerCase();
  return ({
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
  })[ext] || "application/octet-stream";
}

async function uploadImage(file) {
  if (!fs.existsSync(file)) throw new Error(`대표 이미지가 없습니다: ${file}`);
  const data = await wpFetch(`${baseUrl}/wp-json/wp/v2/media`, {
    method: "POST",
    headers: {
      "Content-Type": mimeType(file),
      "Content-Disposition": `attachment; filename="${path.basename(file)}"`,
    },
    body: fs.readFileSync(file),
  });
  return data.id;
}

async function publish(file) {
  const { meta, content } = parseFile(file);
  const endpoint = `${baseUrl}/wp-json/wp/v2/${meta.type}`;
  const existing = await wpFetch(
    `${endpoint}?slug=${encodeURIComponent(meta.slug)}&context=edit`
  );

  const payload = {
    title: meta.title,
    slug: meta.slug,
    status: meta.status,
    content,
  };
  if (meta.excerpt) payload.excerpt = meta.excerpt;
  if (meta.type === "posts" && meta.categories.length) {
    payload.categories = meta.categories;
  }
  if (meta.featured_image) {
    payload.featured_media = await uploadImage(meta.featured_image);
  }

  const target = existing.length ? `${endpoint}/${existing[0].id}` : endpoint;
  const result = await wpFetch(target, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  console.log(`${existing.length ? "갱신" : "생성"}: ${result.link} [${meta.status}]`);
}

const files = process.argv.slice(2);
if (!files.length) throw new Error("게시할 HTML 파일이 없습니다.");
for (const file of files) await publish(file);
