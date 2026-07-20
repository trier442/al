import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'wordpress-content');
const files = fs.readdirSync(dir)
  .filter((name) => /^2027-suteuk-eonmae-(?!index)[clmip]\d{2}\.html$/.test(name))
  .sort();

function plain(value='') {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/\s+/g,' ').trim();
}
function meta(html,key){return html.match(new RegExp(`<!--\\s*${key}:\\s*([^\\n]*?)\\s*-->`,'i'))?.[1]?.trim()||'';}
function listItems(block){return [...block.matchAll(/<li>([\s\S]*?)<\/li>/gi)].map(m=>plain(m[1]));}

const rows=[];
for(const file of files){
  const html=fs.readFileSync(path.join(dir,file),'utf8');
  const summaryBlock=html.match(/<div class="summary">([\s\S]*?)<\/div>/i)?.[1]||'';
  const summaryText=plain(summaryBlock);
  const genericAt=summaryText.search(/이 단원의 핵심은|판단 과정은 ①|복습할 때에는|시험 직전에는/);
  const specificSummary=(genericAt>180?summaryText.slice(0,genericAt):summaryText).trim();
  const keyBlock=html.match(/<div class="keybox">([\s\S]*?)<\/div>/i)?.[1]||'';
  const keyConcepts=[...keyBlock.matchAll(/<li><strong>([\s\S]*?)<\/strong>\s*[—-]\s*([\s\S]*?)<\/li>/gi)]
    .map(m=>({term:plain(m[1]),definition:plain(m[2])}));
  const pointBlock=html.match(/<div class="pointbox">([\s\S]*?)<\/div>/i)?.[1]||'';
  const points=listItems(pointBlock);
  const detailHeading=html.match(/<section><h2>상세[^<]*<\/h2>([\s\S]*?)<\/section>/i)?.[1]||'';
  const detailParagraphs=[...detailHeading.matchAll(/<p>([\s\S]*?)<\/p>/gi)].map(m=>plain(m[1]));
  const questions=[...html.matchAll(/<article class="q" data-answer="([1-5])">([\s\S]*?)<\/article>/gi)].map((m,index)=>({
    no:index+1,
    answer:Number(m[1]),
    stem:plain(m[2].match(/<h3>([\s\S]*?)<\/h3>/i)?.[1]||''),
    choices:[...m[2].matchAll(/<button[^>]*class="choice"[^>]*>([\s\S]*?)<\/button>/gi)].map(x=>plain(x[1]).replace(/^\d+\s*/,'')),
    solution:plain(m[2].match(/<div class="solution">([\s\S]*?)<\/div>/i)?.[1]||'')
  }));
  rows.push({
    file,
    slug:meta(html,'slug'),
    titleMeta:meta(html,'title'),
    title:plain(html.match(/<h1>([\s\S]*?)<\/h1>/i)?.[1]||''),
    crumb:plain(html.match(/<p class="crumb">([\s\S]*?)<\/p>/i)?.[1]||''),
    excerpt:meta(html,'excerpt'),
    specificSummary,
    fullSummary:summaryText,
    keyConcepts,
    points,
    detailParagraphs,
    premiumUrl:html.match(/https:\/\/contents\.premium\.naver\.com\/[^"'< ]+/)?.[0]||'',
    questions
  });
}
fs.writeFileSync(path.join(root,'scripts','eonmae-source.json'),JSON.stringify(rows,null,2));
console.log(`Extracted ${rows.length} eonmae pages.`);
