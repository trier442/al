import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

for(const k of ["WP_URL","WP_USERNAME","WP_APP_PASSWORD"]) if(!process.env[k]) throw new Error(k+" missing");
const base=process.env.WP_URL.replace(/\/$/,"");
const auth="Basic "+Buffer.from(process.env.WP_USERNAME+":"+process.env.WP_APP_PASSWORD.replace(/\s/g,"")).toString("base64");

async function wp(url, options={}){
  let last;
  for(let attempt=1;attempt<=5;attempt++){
    try{
      const r=await fetch(url,{...options,signal:AbortSignal.timeout(60000),headers:{Authorization:auth,"Connection":"close",...(options.headers||{})}});
      const t=await r.text(); let d={}; try{d=t?JSON.parse(t):{};}catch{d={raw:t.slice(0,1200)}}
      if(!r.ok){const e=new Error(`${r.status} ${d?.code||""} ${d?.message||t.slice(0,500)}`);e.status=r.status;throw e;}
      return {data:d,headers:r.headers};
    }catch(e){
      last=e;
      if(Number(e?.status)>=400&&Number(e?.status)<500&&Number(e?.status)!==408&&Number(e?.status)!==429) throw e;
      if(attempt<5) await new Promise(r=>setTimeout(r,1500*attempt));
    }
  }
  throw last;
}
function parseFile(file){
  const raw=fs.readFileSync(file,"utf8"),meta={};
  const pattern=/<!--\s*(title|slug|status|type|categories|revision|excerpt|featured_image|post_id)\s*:\s*(.*?)\s*-->/g;
  let m; while((m=pattern.exec(raw))) meta[m[1]]=m[2].trim();
  return {file,title:meta.title||"",slug:meta.slug||path.basename(file,".html"),status:meta.status||"publish",type:meta.type||"post",excerpt:meta.excerpt||"",categories:(meta.categories||"").split(",").map(s=>Number(s.trim())).filter(n=>Number.isInteger(n)&&n>0),content:raw.replace(pattern,"").trim()};
}
function plain(s=""){return String(s).replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&#8211;|&#8212;/g,"-").replace(/\s+/g," ").trim();}

const sourceDir="wordpress-content";
const sources=fs.readdirSync(sourceDir).filter(n=>/^2027-suteuk-hwajak-(?!index).*\.html$/.test(n)).sort().map(n=>parseFile(path.join(sourceDir,n)));
const indexFile=path.join(sourceDir,"2027-suteuk-hwajak-index.html");
if(fs.existsSync(indexFile)) sources.unshift(parseFile(indexFile));
const canonical=new Set(sources.map(s=>s.slug));

async function fetchAll(status){
  const out=[];
  for(let page=1;page<=30;page++){
    try{
      const {data}=await wp(base+`/wp-json/wp/v2/posts?context=edit&status=${status}&per_page=100&page=${page}&orderby=id&order=desc`);
      if(!Array.isArray(data)||!data.length) break;
      out.push(...data);
      if(data.length<100) break;
    }catch(e){
      if(e.status===400 && /rest_post_invalid_page_number/.test(e.message)) break;
      throw e;
    }
  }
  return out;
}
const all=[];
for(const status of ["publish","draft","pending","private","future"]){
  for(const row of await fetchAll(status)) if(!all.some(x=>x.id===row.id)) all.push(row);
}
const legacy=all.filter(x=>{
  const slug=String(x.slug||"");
  const title=plain(x?.title?.rendered||"");
  return slug.startsWith("2027-suteuk-hwajak-") || title.includes("2027 수능특강 화법과 작문");
});

const bySlug=new Map(legacy.map(x=>[x.slug,x]));
let updated=0,created=0,trashed=0;

for(const s of sources){
  let chosen=bySlug.get(s.slug) || legacy.find(x=>plain(x?.title?.rendered||"")===plain(s.title) && x.status==="publish") || legacy.find(x=>plain(x?.title?.rendered||"")===plain(s.title));
  const body={title:s.title,content:s.content,excerpt:s.excerpt,categories:s.categories,status:"publish",slug:s.slug};
  let result;
  if(chosen){
    ({data:result}=await wp(base+"/wp-json/wp/v2/posts/"+chosen.id,{method:"POST",headers:{"Content-Type":"application/json; charset=utf-8"},body:JSON.stringify(body)}));
    updated++;
    chosen=result;
  }else{
    ({data:result}=await wp(base+"/wp-json/wp/v2/posts",{method:"POST",headers:{"Content-Type":"application/json; charset=utf-8"},body:JSON.stringify(body)}));
    created++;
    chosen=result;
  }
  bySlug.set(s.slug,chosen);
  console.log("SYNCED",chosen.id,s.slug,chosen.status);
}

const refreshed=[];
for(const status of ["publish","draft","pending","private","future"]){
  for(const row of await fetchAll(status)) if(!refreshed.some(x=>x.id===row.id)) refreshed.push(row);
}
for(const x of refreshed){
  const slug=String(x.slug||"");
  const title=plain(x?.title?.rendered||"");
  const is2027Hwajak=slug.startsWith("2027-suteuk-hwajak-") || title.includes("2027 수능특강 화법과 작문");
  if(!is2027Hwajak || canonical.has(slug)) continue;
  const {data:r}=await wp(base+"/wp-json/wp/v2/posts/"+x.id,{method:"POST",headers:{"Content-Type":"application/json; charset=utf-8"},body:JSON.stringify({status:"trash"})});
  trashed++;
  console.log("TRASHED_OLD",x.id,slug,plain(r?.title?.rendered||title));
}

const verify=[];
for(const slug of canonical){
  const {data}=await wp(base+`/wp-json/wp/v2/posts?context=edit&slug=${encodeURIComponent(slug)}&status=publish`);
  if(!Array.isArray(data)||data.length!==1) throw new Error("canonical publish verify failed: "+slug+" count="+(Array.isArray(data)?data.length:"?"));
  verify.push({id:data[0].id,slug:data[0].slug,link:data[0].link});
}
console.log("SYNC_HWJAK_ALL_OK",JSON.stringify({sources:sources.length,updated,created,trashed,verified:verify.length,index:verify.find(x=>x.slug==="2027-suteuk-hwajak-index")||null}));
