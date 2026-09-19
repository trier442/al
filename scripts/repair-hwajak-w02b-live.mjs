import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

const required=["WP_URL","WP_USERNAME","WP_APP_PASSWORD"];
for(const k of required){if(!process.env[k]) throw new Error(k+" missing");}
const base=process.env.WP_URL.replace(/\/$/,"");
const auth="Basic "+Buffer.from(process.env.WP_USERNAME+":"+process.env.WP_APP_PASSWORD.replace(/\s/g,"")).toString("base64");
const targetFile=path.join("wordpress-content","2027-suteuk-hwajak-w02b.html");
const canonicalSlug="2027-suteuk-hwajak-w02b";

async function wp(url, options={}){
  let last;
  for(let attempt=1;attempt<=5;attempt++){
    try{
      const r=await fetch(url,{
        ...options,
        signal:AbortSignal.timeout(45000),
        headers:{Authorization:auth,"Connection":"close",...(options.headers||{})}
      });
      const t=await r.text();
      let d={}; try{d=t?JSON.parse(t):{};}catch{d={raw:t.slice(0,1000)}}
      if(!r.ok){const e=new Error(`${r.status} ${d?.code||""} ${d?.message||t.slice(0,500)}`);e.status=r.status;throw e;}
      return d;
    }catch(e){
      last=e;
      if(Number(e?.status)>=400&&Number(e?.status)<500&&Number(e?.status)!==408&&Number(e?.status)!==429) throw e;
      console.warn("retry",attempt,url.replace(base,"[BASE]"),e.message);
      if(attempt<5) await new Promise(r=>setTimeout(r,1500*attempt));
    }
  }
  throw last;
}
function parseFile(file){
  const raw=fs.readFileSync(file,"utf8");
  const meta={};
  const pattern=/<!--\s*(title|slug|status|type|categories|revision|excerpt|featured_image|post_id)\s*:\s*(.*?)\s*-->/g;
  let m; while((m=pattern.exec(raw))) meta[m[1]]=m[2].trim();
  return {
    title:meta.title||"",
    slug:meta.slug||canonicalSlug,
    excerpt:meta.excerpt||"",
    categories:(meta.categories||"").split(",").map(s=>Number(s.trim())).filter(n=>Number.isInteger(n)&&n>0),
    content:raw.replace(pattern,"").trim()
  };
}
async function pluginStatus(plugin,status){
  return await wp(base+"/wp-json/wp/v2/plugins/"+plugin,{
    method:"POST",
    headers:{"Content-Type":"application/json; charset=utf-8"},
    body:JSON.stringify({status})
  });
}
async function front(url){
  let last;
  for(let i=1;i<=5;i++){
    try{
      const r=await fetch(url,{redirect:"follow",headers:{"User-Agent":"Mozilla/5.0","Connection":"close"},signal:AbortSignal.timeout(30000)});
      if(r.status>=200&&r.status<400) return {status:r.status,url:r.url};
      last=new Error("HTTP "+r.status);
    }catch(e){last=e;}
    await new Promise(r=>setTimeout(r,1500*i));
  }
  return {status:0,error:last?.message||String(last)};
}
async function deletePost(id){
  const r=await wp(base+"/wp-json/wp/v2/posts/"+id+"?force=true",{method:"DELETE"});
  console.log("DELETED_DRAFT",id,r.deleted===true?"deleted":"ok");
}

if(!fs.existsSync(targetFile)) throw new Error("target file missing");
const p=parseFile(targetFile);

const pluginIds=[
  "modu-hwajak-unit-editor/modu-hwajak-unit-editor",
  "modu-hwajak-quality-rebuilder/modu-hwajak-quality-rebuilder"
];
const activeBefore=new Map();
for(const id of pluginIds){
  try{
    const x=await wp(base+"/wp-json/wp/v2/plugins/"+id);
    activeBefore.set(id,x.status==="active");
    console.log("PLUGIN_BEFORE",id,x.status);
  }catch(e){
    activeBefore.set(id,false);
    console.warn("PLUGIN_READ_FAIL",id,e.message);
  }
}

let result;
try{
  for(const id of pluginIds){
    if(activeBefore.get(id)){
      const x=await pluginStatus(id,"inactive");
      console.log("PLUGIN_TEMP",id,x.status);
    }
  }

  const all=[];
  for(const status of ["publish","draft","pending","private","future"]){
    try{
      const rows=await wp(base+`/wp-json/wp/v2/posts?context=edit&status=${status}&per_page=100&orderby=id&order=desc&search=${encodeURIComponent("은사님께 쓰는 감사 편지")}`);
      for(const row of rows) if(!all.some(x=>x.id===row.id)) all.push(row);
    }catch(e){console.warn("SEARCH_FAIL",status,e.message);}
  }
  const candidates=all.filter(x=>{
    const title=String(x?.title?.rendered||"").replace(/<[^>]+>/g,"");
    const slug=String(x?.slug||"");
    return slug.startsWith(canonicalSlug) || title.includes("은사님께 쓰는 감사 편지");
  });
  let chosen=candidates.find(x=>x.slug===canonicalSlug) || candidates.find(x=>x.status==="publish") || candidates[0] || null;

  for(const x of candidates){
    if(chosen && x.id===chosen.id) continue;
    if(x.status==="draft" && String(x.slug||"").startsWith(canonicalSlug)) await deletePost(x.id);
  }

  const body={title:p.title,content:p.content,excerpt:p.excerpt,categories:p.categories,status:"publish",slug:canonicalSlug};
  if(chosen){
    result=await wp(base+"/wp-json/wp/v2/posts/"+chosen.id,{
      method:"POST",headers:{"Content-Type":"application/json; charset=utf-8"},body:JSON.stringify(body)
    });
    console.log("UPDATED",result.id,JSON.stringify({status:result.status,slug:result.slug,link:result.link,title:result.title?.rendered}));
  } else {
    result=await wp(base+"/wp-json/wp/v2/posts",{
      method:"POST",headers:{"Content-Type":"application/json; charset=utf-8"},body:JSON.stringify(body)
    });
    console.log("CREATED",result.id,JSON.stringify({status:result.status,slug:result.slug,link:result.link,title:result.title?.rendered}));
  }
} finally {
  for(const id of pluginIds){
    if(activeBefore.get(id)){
      try{
        const x=await pluginStatus(id,"active");
        console.log("PLUGIN_RESTORED",id,x.status);
      }catch(e){console.error("PLUGIN_RESTORE_FAIL",id,e.message);}
    }
  }
}

const verified=await wp(base+"/wp-json/wp/v2/posts/"+result.id+"?context=edit");
const f=await front(verified.link);
console.log("VERIFY_W02B",JSON.stringify({id:verified.id,status:verified.status,slug:verified.slug,link:verified.link,front:f}));
if(verified.status!=="publish" || !(f.status>=200&&f.status<400)) throw new Error("W02B live verification failed");
console.log("REPAIR_W02B_OK");
