import dns from "node:dns"; dns.setDefaultResultOrder("ipv4first");
for(const k of ["WP_URL","WP_USERNAME","WP_APP_PASSWORD"]) if(!process.env[k]) throw new Error(k+" missing");
const base=process.env.WP_URL.replace(/\/$/,"");
const auth="Basic "+Buffer.from(process.env.WP_USERNAME+":"+process.env.WP_APP_PASSWORD.replace(/\s/g,"")).toString("base64");
async function req(route){
 let last;
 for(let a=1;a<=8;a++){
  try{
   const r=await fetch(base+"/wp-json"+route,{headers:{Authorization:auth,"Connection":"close"},signal:AbortSignal.timeout(45000)});
   const t=await r.text(); if(!r.ok){const e=new Error(r.status+" "+t.slice(0,600));e.status=r.status;throw e;}
   return t?JSON.parse(t):{};
  }catch(e){last=e;console.warn("RETRY",a,route,e.message);if(a<8)await new Promise(r=>setTimeout(r,2500*a));}
 } throw last;
}
async function all(endpoint,params={}){
 const out=[];
 for(let page=1;page<=50;page++){
  const qs=new URLSearchParams({...Object.fromEntries(Object.entries(params).map(([k,v])=>[k,String(v)])),per_page:"100",page:String(page)});
  try{
   const d=await req(endpoint+"?"+qs.toString());
   if(!Array.isArray(d)||!d.length) break;
   out.push(...d); if(d.length<100) break;
  }catch(e){if(e.status===400&&/rest_post_invalid_page_number/.test(e.message))break;throw e;}
 }
 return out;
}
const root=await req("/");
const routes=Object.keys(root.routes||{}).filter(x=>/menu|navigation|wpvibe.*cli|category|term/i.test(x)).sort();
console.log("ROUTES",JSON.stringify(routes));
const cats=await all("/wp/v2/categories",{hide_empty:false});
console.log("CATEGORIES",JSON.stringify(cats.map(x=>({id:x.id,name:x.name,slug:x.slug,count:x.count,parent:x.parent,link:x.link}))));
const pages=await all("/wp/v2/pages",{status:"publish",context:"edit"});
const posts=await all("/wp/v2/posts",{status:"publish",context:"edit"});
const pick=x=>({id:x.id,type:x.type,slug:x.slug,title:(x.title?.raw||x.title?.rendered||"").replace(/<[^>]+>/g,""),link:x.link,categories:x.categories||[],date:x.date,modified:x.modified});
const kp=/공통국어\s*2|공통국어2|미래엔|신유식|창비|비상|천재|지학사|2027.*수능특강.*문학|수능특강.*문학|문학.*2027/i;
console.log("MATCH_PAGES",JSON.stringify(pages.filter(x=>kp.test((x.title?.raw||"")+" "+x.slug)).map(pick)));
console.log("MATCH_POSTS",JSON.stringify(posts.filter(x=>kp.test((x.title?.raw||"")+" "+x.slug)).map(pick)));
console.log("FRONT",JSON.stringify(await req("/wp/v2/settings")));
for(const route of ["/wp/v2/menus","/wp/v2/menu-items","/wp/v2/menu-locations","/wp/v2/navigation"]){
 try{const d=await req(route);console.log("TRY_ROUTE",route,JSON.stringify(d).slice(0,20000));}catch(e){console.log("TRY_ROUTE_FAIL",route,e.message);}
}
