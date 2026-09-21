import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

const required=["WP_URL","WP_USERNAME","WP_APP_PASSWORD"];
for(const k of required){if(!process.env[k]) throw new Error(k+" missing");}
const base=process.env.WP_URL.replace(/\/$/,"");
const auth="Basic "+Buffer.from(process.env.WP_USERNAME+":"+process.env.WP_APP_PASSWORD.replace(/\s/g,"")).toString("base64");

async function wp(url){
  const r=await fetch(url,{headers:{Authorization:auth,"Connection":"close"},signal:AbortSignal.timeout(45000)});
  const t=await r.text(); let d; try{d=t?JSON.parse(t):null}catch{throw new Error("non-json "+r.status+" "+t.slice(0,300))}
  if(!r.ok) throw new Error(r.status+" "+JSON.stringify(d).slice(0,500));
  return d;
}
function cleanTitle(s=""){return s.replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&#8211;|&#8212;/g,"-").replace(/&#d+;/g," ").replace(/\s+/g," ").trim();}
function norm(s=""){return cleanTitle(s).replace(/^\[[^\]]+\]\s*/,"").replace(/해설\s*및\s*변형문제/g,"").replace(/원문\s*없이.*$/,"").replace(/[「」『』“”"'·:()\[\]{}.,!?\-_/\\\s]/g,"").toLowerCase();}
async function list(route){
  const out=[]; let page=1;
  while(true){
    const sep=route.includes("?")?"&":"?";
    const rows=await wp(base+"/wp-json"+route+sep+"per_page=100&page="+page);
    if(!Array.isArray(rows)||!rows.length) break;
    out.push(...rows); if(rows.length<100) break; page++;
    if(page>50) break;
  }
  return out;
}
const cats=await list("/wp/v2/categories?hide_empty=false");
const catMap=new Map(cats.map(c=>[c.id,c]));
const posts=[];
for(const status of ["publish","draft","pending","private","future"]){
  try{
    const rows=await list("/wp/v2/posts?context=edit&status="+status+"&orderby=id&order=asc");
    posts.push(...rows);
  }catch(e){console.warn("POST_STATUS_FAIL",status,e.message);}
}
const sourceFiles=fs.readdirSync("wordpress-content").filter(x=>x.endsWith(".html"));
const source=[];
for(const fn of sourceFiles){
  const raw=fs.readFileSync(path.join("wordpress-content",fn),"utf8");
  const get=k=>raw.match(new RegExp("<!--\\s*"+k+"\\s*:\\s*(.*?)\\s*-->"))?.[1]?.trim()||"";
  source.push({file:fn,title:get("title"),slug:get("slug"),status:get("status"),categories:get("categories").split(",").map(Number).filter(Boolean)});
}
const canonicalSlugs=new Set(source.map(x=>x.slug).filter(Boolean));
const sourceByNorm=new Map();
for(const x of source){const n=norm(x.title); if(n){if(!sourceByNorm.has(n))sourceByNorm.set(n,[]);sourceByNorm.get(n).push(x);}}
const groups=new Map();
for(const p of posts){
  const title=cleanTitle(p.title?.rendered||"");
  const n=norm(title);
  if(!groups.has(n))groups.set(n,[]);
  groups.get(n).push({id:p.id,status:p.status,slug:p.slug,title,modified:p.modified,categories:p.categories||[],link:p.link});
}
const dupes=[...groups.entries()].filter(([n,arr])=>n && arr.length>1).map(([n,arr])=>({norm:n,source:sourceByNorm.get(n)||[],posts:arr}));
const sourceMatches=[];
for(const [n,srows] of sourceByNorm){
  const parr=groups.get(n)||[];
  if(parr.length) sourceMatches.push({norm:n,source:srows,posts:parr});
}
const staleForSource=[];
for(const g of sourceMatches){
  const canon=new Set(g.source.map(x=>x.slug));
  const old=g.posts.filter(p=>!canon.has(p.slug));
  if(old.length) staleForSource.push({source:g.source.map(x=>({title:x.title,slug:x.slug})),canonical:g.posts.filter(p=>canon.has(p.slug)),old});
}
const categorySummary=[...catMap.values()].map(c=>({
  id:c.id,name:c.name,slug:c.slug,count:c.count,
  sourceCount:source.filter(x=>x.categories.includes(c.id)).length,
  livePublished:posts.filter(p=>p.status==="publish"&&(p.categories||[]).includes(c.id)).length
})).sort((a,b)=>b.livePublished-a.livePublished||a.id-b.id);

console.log("AUDIT_SUMMARY",JSON.stringify({
  totalPosts:posts.length,
  published:posts.filter(p=>p.status==="publish").length,
  drafts:posts.filter(p=>p.status==="draft").length,
  sourceFiles:source.length,
  canonicalLive:posts.filter(p=>p.status==="publish"&&canonicalSlugs.has(p.slug)).length,
  duplicateTitleGroups:dupes.length,
  staleSourceTitleGroups:staleForSource.length
}));
console.log("CATEGORY_SUMMARY",JSON.stringify(categorySummary));
console.log("STALE_SOURCE_TITLE_GROUPS",JSON.stringify(staleForSource));
console.log("DUPLICATE_GROUPS",JSON.stringify(dupes.slice(0,200)));
console.log("RECENT_PUBLISHED",JSON.stringify(posts.filter(p=>p.status==="publish").sort((a,b)=>String(b.modified).localeCompare(String(a.modified))).slice(0,80).map(p=>({id:p.id,title:cleanTitle(p.title?.rendered||""),slug:p.slug,modified:p.modified,categories:p.categories,link:p.link}))));
