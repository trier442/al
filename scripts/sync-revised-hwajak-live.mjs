import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
for(const k of ["WP_URL","WP_USERNAME","WP_APP_PASSWORD"]) if(!process.env[k]) throw new Error(k+" missing");
const base=process.env.WP_URL.replace(/\/$/,"");
const auth="Basic "+Buffer.from(process.env.WP_USERNAME+":"+process.env.WP_APP_PASSWORD.replace(/\s/g,"")).toString("base64");
async function wp(url,options={}){
 let last;
 for(let a=1;a<=6;a++){try{
   const r=await fetch(url,{...options,signal:AbortSignal.timeout(45000),headers:{Authorization:auth,"Connection":"close",...(options.headers||{})}});
   const t=await r.text();let d={};try{d=t?JSON.parse(t):{};}catch{d={raw:t.slice(0,1000)}}
   if(!r.ok){const e=new Error(`${r.status} ${d?.code||""} ${d?.message||t.slice(0,400)}`);e.status=r.status;throw e;} return d;
 }catch(e){last=e;console.warn("RETRY",a,url.replace(base,"[BASE]"),e.message);if(a<6)await new Promise(r=>setTimeout(r,2000*a));}}
 throw last;
}
function parse(file){const raw=fs.readFileSync(file,"utf8"),m={};const re=/<!--\s*(title|slug|status|type|categories|revision|excerpt|post_id)\s*:\s*(.*?)\s*-->/g;let x;while((x=re.exec(raw)))m[x[1]]=x[2].trim();return{title:m.title||"",slug:m.slug||path.basename(file,".html"),type:m.type||"post",excerpt:m.excerpt||"",categories:(m.categories||"").split(",").map(Number).filter(Boolean),content:raw.replace(re,"").trim()};}
function plain(s=""){return String(s).replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();}
async function setPlugin(id,status){const d=await wp(base+"/wp-json/wp/v2/plugins/"+id,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});console.log("PLUGIN",id,d.status);}
async function find(type,slug){const ep=type==="page"?"pages":"posts";for(const st of ["publish","draft","pending","private","future"]){const d=await wp(base+`/wp-json/wp/v2/${ep}?context=edit&slug=${encodeURIComponent(slug)}&status=${st}&per_page=5`);if(Array.isArray(d)&&d.length)return d[0];}return null;}
const singles=fs.readdirSync("scripts/hwajak-single").filter(n=>/^2027-suteuk-hwajak-.*\.mjs$/.test(n)).sort().map(n=>n.replace(/\.mjs$/,""));
const sources=singles.map(s=>parse(path.join("wordpress-content",s+".html")));
const index=parse(path.join("wordpress-content","2027-suteuk-hwajak-index.html"));
const plugins=["modu-hwajak-unit-editor/modu-hwajak-unit-editor","modu-hwajak-quality-rebuilder/modu-hwajak-quality-rebuilder"];
for(const p of plugins) await setPlugin(p,"inactive");
let pub=0,trash=0;
try{
 for(const s of sources){
   const found=await find("post",s.slug);
   const body={title:s.title,content:s.content,excerpt:s.excerpt,categories:s.categories,status:"publish",slug:s.slug};
   const d=found?await wp(base+"/wp-json/wp/v2/posts/"+found.id,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}):await wp(base+"/wp-json/wp/v2/posts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
   if(d.status!=="publish")throw new Error("publish blocked "+s.slug+" "+d.status);
   pub++;console.log("PUBLISHED_REVISED",d.id,s.slug);
 }
 // publish the index as a PAGE, never as a post
 const ip=await find("page",index.slug);
 const ibody={title:index.title,content:index.content,excerpt:index.excerpt,status:"publish",slug:index.slug};
 const idata=ip?await wp(base+"/wp-json/wp/v2/pages/"+ip.id,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(ibody)}):await wp(base+"/wp-json/wp/v2/pages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(ibody)});
 console.log("PUBLISHED_INDEX_PAGE",idata.id,idata.link);
 // remove accidental/legacy POST using the index page slug
 for(const st of ["publish","draft","pending","private","future"]){
   const rows=await wp(base+`/wp-json/wp/v2/posts?context=edit&slug=${encodeURIComponent(index.slug)}&status=${st}&per_page=10`);
   for(const x of rows){await wp(base+"/wp-json/wp/v2/posts/"+x.id,{method:"DELETE"});trash++;console.log("TRASHED_WRONG_INDEX_POST",x.id);}
 }
 // hide unreviewed canonical hwajak posts from previous bulk generation
 const keep=new Set(sources.map(s=>s.slug));
 const generated=fs.readdirSync("wordpress-content").filter(n=>/^2027-suteuk-hwajak-(?!index).*\.html$/.test(n)).map(n=>parse(path.join("wordpress-content",n)));
 for(const s of generated){
   if(keep.has(s.slug))continue;
   const x=await find("post",s.slug);
   if(x && x.status!=="trash"){await wp(base+"/wp-json/wp/v2/posts/"+x.id,{method:"DELETE"});trash++;console.log("HIDDEN_UNREVIEWED",x.id,s.slug);}
 }
 // trash title-duplicate legacy versions for revised pages
 for(const s of sources){
   const rows=await wp(base+`/wp-json/wp/v2/posts?context=edit&search=${encodeURIComponent(plain(s.title))}&status=publish&per_page=20`);
   for(const x of rows){
     if(x.slug===s.slug)continue;
     if(plain(x?.title?.rendered||"")===plain(s.title)){await wp(base+"/wp-json/wp/v2/posts/"+x.id,{method:"DELETE"});trash++;console.log("TRASHED_OLD_DUP",x.id,x.slug);}
   }
 }
}finally{
 for(const p of plugins){try{await setPlugin(p,"active");}catch(e){console.error("RESTORE_PLUGIN_FAIL",p,e.message);}}
}
console.log("SYNC_REVISED_HWJAK_OK",JSON.stringify({revised:pub,trashed:trash,index:index.slug}));
