import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

for(const k of ["WP_URL","WP_USERNAME","WP_APP_PASSWORD"]) if(!process.env[k]) throw new Error(k+" missing");
const base=process.env.WP_URL.replace(/\/$/,"");
const auth="Basic "+Buffer.from(process.env.WP_USERNAME+":"+process.env.WP_APP_PASSWORD.replace(/\s/g,"")).toString("base64");

async function wp(url, options={}){
  let last;
  for(let attempt=1;attempt<=6;attempt++){
    try{
      const r=await fetch(url,{...options,signal:AbortSignal.timeout(45000),headers:{Authorization:auth,"Connection":"close",...(options.headers||{})}});
      const t=await r.text(); let d={}; try{d=t?JSON.parse(t):{};}catch{d={raw:t.slice(0,1200)}}
      if(!r.ok){const e=new Error(`${r.status} ${d?.code||""} ${d?.message||t.slice(0,500)}`);e.status=r.status;throw e;}
      return d;
    }catch(e){
      last=e;
      if(Number(e?.status)>=400&&Number(e?.status)<500&& Number(e?.status)!==408 && Number(e?.status)!==429) throw e;
      console.warn("RETRY",attempt,url.replace(base,"[BASE]"),e.message);
      if(attempt<6) await new Promise(r=>setTimeout(r,2000*attempt));
    }
  }
  throw last;
}
function parseFile(file){
  const raw=fs.readFileSync(file,"utf8"),meta={};
  const pattern=/<!--\s*(title|slug|status|type|categories|revision|excerpt|featured_image|post_id)\s*:\s*(.*?)\s*-->/g;
  let m; while((m=pattern.exec(raw))) meta[m[1]]=m[2].trim();
  return {title:meta.title||"",slug:meta.slug||path.basename(file,".html"),excerpt:meta.excerpt||"",categories:(meta.categories||"").split(",").map(s=>Number(s.trim())).filter(n=>Number.isInteger(n)&&n>0),content:raw.replace(pattern,"").trim()};
}
async function setPlugin(id,status){
  const d=await wp(base+"/wp-json/wp/v2/plugins/"+id,{method:"POST",headers:{"Content-Type":"application/json; charset=utf-8"},body:JSON.stringify({status})});
  console.log("PLUGIN",id,d.status);
}
async function findBySlug(slug){
  for(const status of ["publish","draft","pending","private","future"]){
    const d=await wp(base+`/wp-json/wp/v2/posts?context=edit&slug=${encodeURIComponent(slug)}&status=${status}&per_page=5`);
    if(Array.isArray(d)&&d.length) return d[0];
  }
  return null;
}

const sourceDir="wordpress-content";
const files=fs.readdirSync(sourceDir).filter(n=>/^2027-suteuk-hwajak-(?!index).*\.html$/.test(n)).sort();
if(fs.existsSync(path.join(sourceDir,"2027-suteuk-hwajak-index.html"))) files.unshift("2027-suteuk-hwajak-index.html");
const sources=files.map(n=>parseFile(path.join(sourceDir,n)));
const pluginIds=["modu-hwajak-unit-editor/modu-hwajak-unit-editor","modu-hwajak-quality-rebuilder/modu-hwajak-quality-rebuilder"];

let updated=0,created=0;
for(const id of pluginIds) await setPlugin(id,"inactive");
try{
  for(const s of sources){
    const chosen=await findBySlug(s.slug);
    const body={title:s.title,content:s.content,excerpt:s.excerpt,categories:s.categories,status:"publish",slug:s.slug};
    let result;
    if(chosen){
      result=await wp(base+"/wp-json/wp/v2/posts/"+chosen.id,{method:"POST",headers:{"Content-Type":"application/json; charset=utf-8"},body:JSON.stringify(body)});
      updated++;
    }else{
      result=await wp(base+"/wp-json/wp/v2/posts",{method:"POST",headers:{"Content-Type":"application/json; charset=utf-8"},body:JSON.stringify(body)});
      created++;
    }
    if(result.status!=="publish") throw new Error("publish blocked "+s.slug+" => "+result.status);
    console.log("PUBLISHED",result.id,s.slug,result.link);
  }
} finally {
  for(const id of pluginIds){
    try{await setPlugin(id,"active");}catch(e){console.error("PLUGIN_RESTORE_FAIL",id,e.message);}
  }
}

let verified=0;
for(const s of sources){
  const d=await wp(base+`/wp-json/wp/v2/posts?context=edit&slug=${encodeURIComponent(s.slug)}&status=publish&per_page=5`);
  if(!Array.isArray(d)||d.length!==1) throw new Error("VERIFY_FAIL "+s.slug+" count="+(Array.isArray(d)?d.length:"?"));
  verified++;
}
console.log("RESTORE_ALL_HWJAK_OK",JSON.stringify({sources:sources.length,updated,created,verified}));
