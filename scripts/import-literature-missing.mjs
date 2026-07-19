import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contentDir = path.join(root, "wordpress-content");
const indexPath = path.join(contentDir, "2027-suteuk-literature-index.html");
const indexHtml = fs.readFileSync(indexPath, "utf8");

function metaValue(html, key) {
  const match = html.match(new RegExp(`<!--\\s*${key}\\s*:\\s*(.*?)\\s*-->`));
  return match ? match[1].trim() : "";
}

function decodeEntities(value) {
  return value
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8212;|&mdash;/g, "—")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#8216;|&#8217;|&lsquo;|&rsquo;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function stripTags(value) {
  return decodeEntities(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function safeFilename(slug) {
  const ascii = slug
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return ascii ? `${ascii}.html` : `wordpress-post-${Date.now()}.html`;
}

function normalizedSlug(value) {
  try {
    return decodeURIComponent(value).replace(/^\/+|\/+$/g, "");
  } catch {
    return value.replace(/^\/+|\/+$/g, "");
  }
}

const existingSlugs = new Set(
  fs.readdirSync(contentDir)
    .filter((name) => name.endsWith(".html"))
    .map((name) => normalizedSlug(metaValue(fs.readFileSync(path.join(contentDir, name), "utf8"), "slug")))
    .filter(Boolean),
);

const hrefs = [...indexHtml.matchAll(/<a class="mk-lit-card"[^>]*href="([^"]+)"/g)]
  .map((match) => match[1]);

let imported = 0;
for (const href of hrefs) {
  const url = new URL(href);
  const slug = decodeURIComponent(url.pathname.replace(/^\/+|\/+$/g, ""));
  if (!slug || existingSlugs.has(normalizedSlug(slug))) continue;

  const endpoint = new URL("/wp-json/wp/v2/posts", url.origin);
  endpoint.searchParams.set("slug", slug);
  endpoint.searchParams.set("per_page", "1");
  endpoint.searchParams.set("_fields", "id,slug,status,type,title,excerpt,content,categories");
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error(`${endpoint}: ${response.status}`);
  const posts = await response.json();
  if (!posts.length) {
    console.warn(`WordPress 글을 찾지 못했습니다: ${href}`);
    continue;
  }

  const post = posts[0];
  const filename = safeFilename(post.slug);
  const target = path.join(contentDir, filename);
  const title = stripTags(post.title.rendered);
  const excerpt = stripTags(post.excerpt.rendered || "");
  const categories = Array.isArray(post.categories) ? post.categories.join(",") : "27";
  const output = [
    `<!-- title: ${title} -->`,
    `<!-- slug: ${post.slug} -->`,
    `<!-- post_id: ${post.id} -->`,
    `<!-- status: ${post.status} -->`,
    `<!-- type: ${post.type} -->`,
    `<!-- categories: ${categories} -->`,
    `<!-- revision: 1 -->`,
    excerpt ? `<!-- excerpt: ${excerpt} -->` : "",
    post.content.rendered.trim(),
    "",
  ].filter(Boolean).join("\n");
  fs.writeFileSync(target, output, "utf8");
  existingSlugs.add(normalizedSlug(post.slug));
  imported += 1;
  console.log(`가져옴: ${filename} (post ${post.id})`);
}

console.log(`누락 원고 ${imported}개를 가져왔습니다.`);
