import dns from 'node:dns';
import { injectQuarterAd, hasQuarterAd } from './modukorean-quarter-ad.mjs';

dns.setDefaultResultOrder('ipv4first');

const required = ['WP_URL', 'WP_USERNAME', 'WP_APP_PASSWORD'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`${key} GitHub Secret이 없습니다.`);
}

const baseUrl = process.env.WP_URL.replace(/\/$/, '');
const auth = 'Basic ' + Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD.replace(/\s/g, '')}`).toString('base64');
const requestTimeoutMs = Math.max(10000, Number(process.env.WP_REQUEST_TIMEOUT_MS || 65000));
const dryRun = process.argv.includes('--dry-run');

async function wpFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`WordPress 요청 제한 시간 ${requestTimeoutMs}ms 초과`)), requestTimeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: auth,
        Connection: 'close',
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
    if (!response.ok) {
      const detail = data?.message || text.slice(0, 1200);
      throw new Error(`WordPress ${response.status}: ${detail}`);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function listPublishedPosts() {
  const posts = [];
  for (let page = 1; ; page++) {
    const url = `${baseUrl}/wp-json/wp/v2/posts?status=publish&context=edit&per_page=100&page=${page}&orderby=id&order=asc&_fields=id,link,slug,content`;
    let batch;
    try {
      batch = await wpFetch(url);
    } catch (error) {
      if (/rest_post_invalid_page_number/i.test(error.message) || /page number requested is larger/i.test(error.message)) break;
      throw error;
    }
    if (!Array.isArray(batch) || !batch.length) break;
    posts.push(...batch);
    if (batch.length < 100) break;
  }
  return posts;
}

async function updatePost(post) {
  const raw = post?.content?.raw ?? '';
  const next = injectQuarterAd(raw);
  const alreadyCurrent = hasQuarterAd(raw) && next === String(raw).trim();
  if (alreadyCurrent) return { status: 'unchanged', id: post.id, link: post.link };
  if (dryRun) return { status: 'would-update', id: post.id, link: post.link };

  await wpFetch(`${baseUrl}/wp-json/wp/v2/posts/${post.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ content: next }),
  });
  return { status: 'updated', id: post.id, link: post.link };
}

async function runPool(items, concurrency = 4) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      const item = items[index];
      try {
        results[index] = await updatePost(item);
      } catch (error) {
        results[index] = { status: 'failed', id: item.id, link: item.link, error: error.message };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length || 1) }, worker));
  return results;
}

const posts = await listPublishedPosts();
console.log(`공개 글 조회: ${posts.length}개`);
const results = await runPool(posts, 4);
const counts = results.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});
console.log(`1/4 광고 반영 결과: ${JSON.stringify(counts)}`);

for (const row of results.filter(r => r.status === 'failed').slice(0, 20)) {
  console.error(`실패 post_id=${row.id} ${row.link || ''}: ${row.error}`);
}

if (results.some(r => r.status === 'failed')) process.exit(1);
