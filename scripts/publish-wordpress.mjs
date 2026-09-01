import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

const visibilityFile = path.join(process.cwd(), "scripts", "eonmae-visibility.json");
const eonmaeVisibility = fs.existsSync(visibilityFile)
  ? JSON.parse(fs.readFileSync(visibilityFile, "utf8"))
  : { hidden: false };

function assertEonmaePublishAllowed(file) {
  const basename = path.basename(file);
  const isEonmae = /^2027-suteuk-eonmae-.*\.html$/i.test(basename);
  if (!isEonmae || !eonmaeVisibility.hidden) return;

  const approved = new Set(Array.isArray(eonmaeVisibility.public_files) ? eonmaeVisibility.public_files : []);
  const sequentialApproval =
    eonmaeVisibility.mode === "sequential" &&
    process.env.ALLOW_EONMAE_PUBLISH === "PUBLISH_APPROVED" &&
    approved.has(basename);

  if (!sequentialApproval) {
    throw new Error(`${file}: 언어와 매체는 순차 공개 상태입니다. scripts/eonmae-visibility.json의 public_files에 등록된 검수 완료본만 게시할 수 있습니다.`);
  }
}

const required = ["WP_URL", "WP_USERNAME", "WP_APP_PASSWORD"];
for (const key of required) {
  if (!process.env[key]) throw new Error(`${key} GitHub Secret이 없습니다.`);
}

const baseUrl = process.env.WP_URL.replace(/\/$/, "");
const wpUsername = process.env.WP_USERNAME;
const wpPassword = process.env.WP_APP_PASSWORD.replace(/\s/g, "");
const auth = "Basic " + Buffer.from(`${wpUsername}:${wpPassword}`).toString("base64");
const requestTimeoutMs = Math.max(10000, Number(process.env.WP_REQUEST_TIMEOUT_MS || 65000));

async function wpFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`WordPress 요청 제한 시간 ${requestTimeoutMs}ms 초과`)), requestTimeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
      headers: {
        Authorization: auth,
        "Connection": "close",
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
    if (!response.ok) {
      const detail = data && !Array.isArray(data) && data.message
        ? `${data.code ? `${data.code}: ` : ""}${data.message}`
        : text.slice(0, 2000);
      throw new Error(`WordPress ${response.status}: ${detail}`);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function logAuthCapabilities() {
  try {
    const me = await wpFetch(`${baseUrl}/wp-json/wp/v2/users/me?context=edit`);
    const capabilities = me.capabilities || {};
    const keys = [
      "read",
      "edit_posts",
      "publish_posts",
      "delete_posts",
      "upload_files",
      "manage_categories",
      "edit_others_posts",
      "edit_published_posts",
      "unfiltered_html",
    ];
    const summary = Object.fromEntries(keys.map(key => [key, Boolean(capabilities[key])]));
    console.log(`WordPress 인증 사용자: id=${me.id}, name=${me.name || ""}, roles=${(me.roles || []).join(",")}`);
    console.log(`WordPress 핵심 권한: ${JSON.stringify(summary)}`);
  } catch (error) {
    console.warn(`WordPress 인증 사용자 권한 확인 실패: ${error.message}`);
  }
}

function parseFile(file) {
  const raw = fs.readFileSync(file, "utf8");
  const meta = {};
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
        .map(v => v.trim())
        .filter(Boolean)
        .map(Number)
        .filter(v => Number.isInteger(v) && v > 0),
      featured_image: meta.featured_image || "",
      post_id: Number(meta.post_id) || 0,
    },
    content,
  };
}

function sanitizeEditorialNotes(content) {
  return String(content)
    .replace(/<([a-z][\w-]*)\b[^>]*class=["'][^"']*\bcopyright-note\b[^"']*["'][^>]*>[\s\S]*?<\/\1>\s*/gi, "")
    .replace(/<p\b[^>]*>\s*※?\s*지문과 문항은[\s\S]*?새로 작성했습니다\.?\s*<\/p>\s*/gi, "")
    .replace(/\.modu-exam-post\s+\.copyright-note\{[^}]*\}/g, "")
    .trim();
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

async function uploadImage(file, title = "") {
  let body;
  let filename;
  let contentType;

  if (file.startsWith("data:image/")) {
    const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/i.exec(file);
    if (!match) throw new Error("대표 이미지 data URI 형식이 올바르지 않습니다.");
    contentType = match[1].toLowerCase();
    const ext = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
    filename = `modu-korean-featured-${Date.now()}.${ext}`;
    body = Buffer.from(match[2], "base64");
  } else if (file.toLowerCase().endsWith(".b64")) {
    if (!fs.existsSync(file)) throw new Error(`대표 이미지 base64 파일이 없습니다: ${file}`);
    filename = path.basename(file, ".b64");
    body = Buffer.from(fs.readFileSync(file, "utf8").replace(/\s/g, ""), "base64");
    contentType = mimeType(filename);
  } else {
    if (!fs.existsSync(file)) throw new Error(`대표 이미지가 없습니다: ${file}`);
    filename = path.basename(file);
    body = fs.readFileSync(file);
    contentType = mimeType(file);
  }

  const data = await wpFetch(`${baseUrl}/wp-json/wp/v2/media`, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
    body,
  });

  if (title && data.id) {
    await wpFetch(`${baseUrl}/wp-json/wp/v2/media/${data.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ alt_text: title, title }),
    });
  }

  return data;
}

function escapedHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function publish(file) {
  assertEonmaePublishAllowed(file);
  const parsed = parseFile(file);
  const meta = parsed.meta;
  const rawContent = sanitizeEditorialNotes(parsed.content);
  const endpoint = `${baseUrl}/wp-json/wp/v2/${meta.type}`;
  const existing = meta.post_id
    ? [{ id: meta.post_id }]
    : await wpFetch(`${endpoint}?slug=${encodeURIComponent(meta.slug)}&context=edit`);

  const isExisting = existing.length > 0;
  const target = isExisting ? `${endpoint}/${existing[0].id}` : endpoint;
  const payload = meta.post_id
    ? { content: rawContent }
    : {
        title: meta.title,
        slug: meta.slug,
        status: meta.status,
        content: rawContent,
      };

  if (!meta.post_id && meta.excerpt) payload.excerpt = meta.excerpt;
  if (!meta.post_id && meta.type === "posts" && meta.categories.length) payload.categories = meta.categories;

  const result = await wpFetch(target, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  const postId = Number(result.id || existing[0]?.id) || 0;
  console.log(`${isExisting ? "갱신" : "생성"}: ${result.link} [${meta.status}]`);

  const existingFeatured = Number(result.featured_media || existing[0]?.featured_media) || 0;
  const needsFeaturedImage = Boolean(meta.featured_image) && !existingFeatured && postId;
  if (!needsFeaturedImage) return;

  try {
    const media = await uploadImage(meta.featured_image, meta.title);
    const featuredMedia = Number(media.id) || 0;
    if (!featuredMedia) throw new Error("업로드된 대표 이미지 ID를 확인하지 못했습니다.");

    let content = rawContent;
    if (media.source_url && !content.includes(media.source_url)) {
      content = `<figure class="wp-block-image size-full modu-featured-inline"><img src="${media.source_url}" alt="${escapedHtml(meta.title)}" /></figure>\n${content}`;
    }

    await wpFetch(`${endpoint}/${postId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ featured_media: featuredMedia, content }),
    });
    console.log(`대표 이미지 연결: post_id=${postId}, media_id=${featuredMedia}`);
  } catch (error) {
    console.warn(`대표 이미지 업로드/연결 경고: ${error.message}`);
    console.warn("대표 이미지가 차단되어도 글은 이미 WordPress에 정상 게시되었습니다.");
  }
}

const files = process.argv.slice(2);
if (!files.length) throw new Error("게시할 HTML 파일이 없습니다.");
await logAuthCapabilities();
for (const file of files) await publish(file);
