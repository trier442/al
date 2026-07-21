import fs from "node:fs";
import path from "node:path";

const visibilityFile = path.join(process.cwd(), "scripts", "eonmae-visibility.json");
const eonmaeVisibility = fs.existsSync(visibilityFile)
  ? JSON.parse(fs.readFileSync(visibilityFile, "utf8"))
  : { hidden: false };

function assertEonmaePublishAllowed(file) {
  const isEonmae = /^2027-suteuk-eonmae-.*\.html$/i.test(path.basename(file));
  if (isEonmae && eonmaeVisibility.hidden && process.env.ALLOW_EONMAE_PUBLISH !== "PUBLISH") {
    throw new Error(`${file}: 언어와 매체 전체가 비공개 상태입니다. 명시적 재게시 승인 없이 게시할 수 없습니다.`);
  }
}

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
  // 게시 메타데이터만 제거한다. Gutenberg의 <!-- wp:html --> 같은 블록 표시는
  // 본문에 남겨야 WordPress가 임의의 <p> 태그를 삽입하지 않는다.
  const pattern = /<!--\s*(title|slug|status|type|categories|revision|excerpt|featured_image|post_id)\s*:\s*(.*?)\s*-->/g;
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
      post_id: Number(meta.post_id) || 0,
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
  assertEonmaePublishAllowed(file);
  const { meta, content } = parseFile(file);
  const endpoint = `${baseUrl}/wp-json/wp/v2/${meta.type}`;
  const existing = meta.post_id
    ? [{ id: meta.post_id }]
    : await wpFetch(`${endpoint}?slug=${encodeURIComponent(meta.slug)}&context=edit`);

  const payload = meta.post_id
    ? { content }
    : {
        title: meta.title,
        slug: meta.slug,
        status: meta.status,
        content,
      };
  if (!meta.post_id && meta.excerpt) payload.excerpt = meta.excerpt;
  if (!meta.post_id && meta.type === "posts" && meta.categories.length) {
    payload.categories = meta.categories;
  }
  if (!meta.post_id && meta.featured_image) {
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
