import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

const required=["WP_URL","WP_USERNAME","WP_APP_PASSWORD"];
for(const k of required){if(!process.env[k]) throw new Error(k+" missing");}
const base=process.env.WP_URL.replace(/\/$/,"");
const auth="Basic "+Buffer.from(process.env.WP_USERNAME+":"+process.env.WP_APP_PASSWORD.replace(/\s/g,"")).toString("base64");

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
    slug:meta.slug||"",
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
async function getPost(id){return await wp(base+"/wp-json/wp/v2/posts/"+id+"?context=edit");}
async function updatePost(id,file,cleanSlug){
  const p=parseFile(file);
  const body={title:p.title,content:p.content,excerpt:p.excerpt,categories:p.categories,status:"publish",slug:cleanSlug};
  const r=await wp(base+"/wp-json/wp/v2/posts/"+id,{
    method:"POST",headers:{"Content-Type":"application/json; charset=utf-8"},body:JSON.stringify(body)
  });
  console.log("UPDATED",id,JSON.stringify({status:r.status,slug:r.slug,link:r.link,title:r.title?.rendered}));
  return r;
}
async function deletePost(id){
  const r=await wp(base+"/wp-json/wp/v2/posts/"+id+"?force=true",{method:"DELETE"});
  console.log("DELETED_DRAFT",id,r.deleted===true?"deleted":"ok");
}
async function front(url){
  let last;
  for(let i=1;i<=5;i++){
    try{
      const r=await fetch(url,{redirect:"manual",headers:{"User-Agent":"Mozilla/5.0","Connection":"close"},signal:AbortSignal.timeout(30000)});
      if(r.status>=200&&r.status<400) return {status:r.status,location:r.headers.get("location")||"",url:r.url};
      if(r.status===404) return {status:404,location:"",url:r.url};
      last=new Error("HTTP "+r.status);
    }catch(e){last=e;}
    await new Promise(r=>setTimeout(r,1500*i));
  }
  return {status:0,error:last?.message||String(last)};
}

const pluginIds=[
  "modu-hwajak-unit-editor/modu-hwajak-unit-editor",
  "modu-hwajak-quality-rebuilder/modu-hwajak-quality-rebuilder"
];
const activeBefore=new Map();
for(const id of pluginIds){
  try{
    const p=await wp(base+"/wp-json/wp/v2/plugins/"+id);
    activeBefore.set(id,p.status==="active");
    console.log("PLUGIN_BEFORE",id,p.status);
  }catch(e){
    console.warn("PLUGIN_READ_FAIL",id,e.message);
    activeBefore.set(id,false);
  }
}

try{
  for(const id of pluginIds){
    if(activeBefore.get(id)){
      const p=await pluginStatus(id,"inactive");
      console.log("PLUGIN_TEMP",id,p.status);
    }
  }

  const drafts=await wp(base+"/wp-json/wp/v2/posts?context=edit&status=draft&per_page=100&orderby=id&order=desc");
  const prefixes=["2027-suteuk-hwajak-s04a","2027-suteuk-hwajak-s04b","2027-suteuk-hwajak-s05a","2027-suteuk-hwajak-s05b"];
  const keep=new Set([3265,3266]);
  for(const p of drafts){
    if(prefixes.some(prefix=>String(p.slug||"").startsWith(prefix))&&!keep.has(Number(p.id))){
      await deletePost(p.id);
    }
  }

  await updatePost(240,path.join("wordpress-content","2027-suteuk-hwajak-s04a.html"),"2027-suteuk-hwajak-s04a");
  await updatePost(245,path.join("wordpress-content","2027-suteuk-hwajak-s04b.html"),"2027-suteuk-hwajak-s04b");
  await updatePost(3265,path.join("wordpress-content","2027-suteuk-hwajak-s05a.html"),"2027-suteuk-hwajak-s05a");
  await updatePost(3266,path.join("wordpress-content","2027-suteuk-hwajak-s05b.html"),"2027-suteuk-hwajak-s05b");
} finally {
  for(const id of pluginIds){
    if(activeBefore.get(id)){
      try{
        const p=await pluginStatus(id,"active");
        console.log("PLUGIN_RESTORED",id,p.status);
      }catch(e){console.error("PLUGIN_RESTORE_FAIL",id,e.message);}
    }
  }
}

const checks=[
  {id:240,label:"4A"},
  {id:245,label:"4B"},
  {id:3265,label:"5A"},
  {id:3266,label:"5B"}
];
let failed=false;
for(const x of checks){
  const p=await getPost(x.id);
  const f=await front(p.link);
  console.log("VERIFY",x.label,JSON.stringify({id:p.id,status:p.status,slug:p.slug,link:p.link,front:f}));
  if(p.status!=="publish"||!(f.status>=200&&f.status<400)) failed=true;
}
if(failed) throw new Error("4강·5강 live verification failed");
console.log("REPAIR_OK");

// rerun repair 2026-09-18 user reported 404
