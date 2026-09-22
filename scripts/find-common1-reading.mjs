import dns from "node:dns"; dns.setDefaultResultOrder("ipv4first");
for(const k of ["WP_URL","WP_USERNAME","WP_APP_PASSWORD"]) if(!process.env[k]) throw new Error(k+" missing");
const base=process.env.WP_URL.replace(/\/$/,"");
const auth="Basic "+Buffer.from(process.env.WP_USERNAME+":"+process.env.WP_APP_PASSWORD.replace(/\s/g,"")).toString("base64");
async function req(route){
 let last;
 for(let a=1;a<=8;a++){try{
   const r=await fetch(base+"/wp-json"+route,{headers:{Authorization:auth,"Connection":"close"},signal:AbortSignal.timeout(45000)});
   const t=await r.text(); if(!r.ok){const e=new Error(r.status+" "+t.slice(0,500));e.status=r.status;throw e;} return t?JSON.parse(t):{};
 }catch(e){last=e;console.warn("RETRY",a,route,e.message);if(a<8)await new Promise(r=>setTimeout(r,2500*a));}}
 throw last;
}
async function all(ep,params={}){
 const out=[];for(let page=1;page<=30;page++){
  const qs=new URLSearchParams({...Object.fromEntries(Object.entries(params).map(([k,v])=>[k,String(v)])),per_page:"100",page:String(page)});
  try{const d=await req(ep+"?"+qs.toString()); if(!Array.isArray(d)||!d.length)break; out.push(...d); if(d.length<100)break;}
  catch(e){if(e.status===400)break;throw e;}
 }return out;
}
const pages=await all("/wp/v2/pages",{status:"publish",context:"edit"});
const posts=await all("/wp/v2/posts",{status:"publish",context:"edit"});
const cats=await all("/wp/v2/categories",{hide_empty:false});
const clean=s=>String(s||"").replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
const patterns=[/2027.*수능특강.*독서/i,/수능특강.*독서/i,/공통국어\s*1/i,/공통국어1/i,/미래엔.*공통국어1/i,/창비.*공통국어1/i,/비상.*공통국어1/i,/천재.*공통국어1/i,/지학사.*공통국어1/i];
function hits(arr,type){return arr.filter(x=>patterns.some(re=>re.test(clean(x.title?.raw||x.title?.rendered)+" "+x.slug))).map(x=>({type,id:x.id,title:clean(x.title?.raw||x.title?.rendered),slug:x.slug,link:x.link,status:x.status,categories:x.categories||[]}));}
console.log("PAGES",JSON.stringify(hits(pages,"page")));
console.log("POSTS",JSON.stringify(hits(posts,"post")));
console.log("CATS",JSON.stringify(cats.filter(x=>patterns.some(re=>re.test(x.name+" "+x.slug))).map(x=>({id:x.id,name:x.name,slug:x.slug,count:x.count,parent:x.parent,link:x.link}))));
