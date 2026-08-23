import fs from "node:fs";
import path from "node:path";

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
    const detail = data && !Array.isArray(data) && data.message
      ? data.message
      : text.slice(0, 2000);
    throw new Error(`WordPress ${response.status}: ${detail}`);
  }
  return data;
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function xmlDecode(value) {
  return String(value)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function xmlRpcValue(value) {
  if (typeof value === "boolean") return `<value><boolean>${value ? 1 : 0}</boolean></value>`;
  if (Number.isInteger(value)) return `<value><int>${value}</int></value>`;
  if (Array.isArray(value)) {
    return `<value><array><data>${value.map(xmlRpcValue).join("")}</data></array></value>`;
  }
  if (value && typeof value === "object") {
    const members = Object.entries(value)
      .filter(([, memberValue]) => memberValue !== undefined && memberValue !== null)
      .map(([name, memberValue]) => `<member><name>${xmlEscape(name)}</name>${xmlRpcValue(memberValue)}</member>`)
      .join("");
    return `<value><struct>${members}</struct></value>`;
  }
  return `<value><string>${xmlEscape(value ?? "")}</string></value>`;
}

async function xmlRpcCall(methodName, params) {
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<methodCall><methodName>${xmlEscape(methodName)}</methodName><params>${params.map(value => `<param>${xmlRpcValue(value)}</param>`).join("")}</params></methodCall>`;
  const response = await fetch(`${baseUrl}/xmlrpc.php`, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    body,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`WordPress XML-RPC HTTP ${response.status}: ${text.slice(0, 1000)}`);
  if (/<fault>/i.test(text)) {
    const fault = text.match(/<name>faultString<\/name>\s*<value>(?:<string>)?([\s\S]*?)(?:<\/string>)?<\/value>/i);
    throw new Error(`WordPress XML-RPC fault: ${xmlDecode((fault?.[1] || text).replace(/<[^>]+>/g, "").trim()).slice(0, 1000)}`);
  }
  return text;
}

function parseXmlRpcPostId(xml) {
  const match = xml.match(/<value>\s*(?:<string>|<int>|<i4>)?\s*(\d+)\s*(?:<\/string>|<\/int>|<\/i4>)?\s*<\/value>/i);
  const id = Number(match?.[1]);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`XML-RPC 게시물 ID를 읽지 못했습니다: ${xml.slice(0, 1000)}`);
  return id;
}

async function createPostViaXmlRpc(meta, content, featuredMedia = 0) {
  const postType = meta.type === "pages" ? "page" : "post";
  const post = {
    post_type: postType,
    post_status: meta.status,
    post_title: meta.title,
    post_content: content,
    post_excerpt: meta.excerpt,
    post_name: meta.slug,
  };
  if (featuredMedia) post.post_thumbnail = featuredMedia;

  const xml = await xmlRpcCall("wp.newPost", [0, wpUsername, wpPassword, post]);
  const id = parseXmlRpcPostId(xml);

  try {
    const created = await wpFetch(`${baseUrl}/wp-json/wp/v2/${meta.type}/${id}?context=edit`);
    return { id, link: created.link || `${baseUrl}/?p=${id}` };
  } catch {
    return { id, link: `${baseUrl}/?p=${id}` };
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

async function publish(file) {
  assertEonmaePublishAllowed(file);
  const { meta, content: rawContent } = parseFile(file);
  const endpoint = `${baseUrl}/wp-json/wp/v2/${meta.type}`;
  const existing = meta.post_id
    ? [{ id: meta.post_id }]
    : await wpFetch(`${endpoint}?slug=${encodeURIComponent(meta.slug)}&context=edit`);

  let content = rawContent;
  let featuredMedia = existing.length ? Number(existing[0].featured_media) || 0 : 0;
  const needsFeaturedImage = Boolean(meta.featured_image) && !featuredMedia;

  if (needsFeaturedImage) {
    try {
      const media = await uploadImage(meta.featured_image, meta.title);
      featuredMedia = Number(media.id) || 0;
      if (media.source_url && !content.includes(media.source_url)) {
        const escapedAlt = meta.title.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        content = `<figure class="wp-block-image size-full modu-featured-inline"><img src="${media.source_url}" alt="${escapedAlt}" /></figure>\n${content}`;
      }
    } catch (error) {
      console.warn(`대표 이미지 업로드 경고: ${error.message}`);
      console.warn("미디어 업로드가 차단되어도 본문 상단의 대표 비주얼 카드와 글 본문은 계속 게시합니다.");
    }
  }

  const payload = meta.post_id
    ? { content }
    : {
        title: meta.title,
        slug: meta.slug,
        status: meta.status,
        content,
      };
  if (!meta.post_id && meta.excerpt) payload.excerpt = meta.excerpt;
  if (!meta.post_id && meta.type === "posts" && meta.categories.length) payload.categories = meta.categories;
  if (featuredMedia) payload.featured_media = featuredMedia;

  const target = existing.length ? `${endpoint}/${existing[0].id}` : endpoint;
  try {
    const result = await wpFetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    console.log(`${existing.length ? "갱신" : "생성"}: ${result.link} [${meta.status}]`);
  } catch (error) {
    if (!existing.length && /WordPress 403:/.test(error.message)) {
      console.warn(`REST 글 생성이 차단되어 XML-RPC로 재시도합니다: ${error.message}`);
      const result = await createPostViaXmlRpc(meta, content, featuredMedia);
      console.log(`생성: ${result.link} [${meta.status}] (XML-RPC, post_id=${result.id})`);
      return;
    }
    throw error;
  }
}

const files = process.argv.slice(2);
if (!files.length) throw new Error("게시할 HTML 파일이 없습니다.");
await logAuthCapabilities();
for (const file of files) await publish(file);
