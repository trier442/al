import dns from "node:dns"; dns.setDefaultResultOrder("ipv4first");
for(const k of ["WP_URL","WP_USERNAME","WP_APP_PASSWORD"]) if(!process.env[k]) throw new Error(k+" missing");
const base=process.env.WP_URL.replace(/\/$/,"");
const auth="Basic "+Buffer.from(process.env.WP_USERNAME+":"+process.env.WP_APP_PASSWORD.replace(/\s/g,"")).toString("base64");
async function get(route){
 let last;
 for(let a=1;a<=8;a++){
  try{
   const r=await fetch(base+"/wp-json"+route,{headers:{Authorization:auth,"Connection":"close"},signal:AbortSignal.timeout(45000)});
   const t=await r.text(); if(!r.ok){const e=new Error(r.status+" "+t.slice(0,500));e.status=r.status;throw e;} return JSON.parse(t);
  }catch(e){last=e;console.warn("RETRY",a,route,e.message);if(a<8)await new Promise(r=>setTimeout(r,2500*a));}
 } throw last;
}
const settings=await get("/wp/v2/settings");
console.log("SETTINGS",JSON.stringify({title:settings.title,description:settings.description,show_on_front:settings.show_on_front,page_on_front:settings.page_on_front,page_for_posts:settings.page_for_posts}));
if(settings.page_on_front){
 const p=await get("/wp/v2/pages/"+settings.page_on_front+"?context=edit");
 console.log("FRONT_PAGE_META",JSON.stringify({id:p.id,slug:p.slug,status:p.status,title:p.title?.raw||p.title?.rendered,template:p.template}));
 console.log("FRONT_CONTENT_START");
 console.log((p.content?.raw||p.content?.rendered||"").slice(0,30000));
 console.log("FRONT_CONTENT_END");
}else{
 const posts=await get("/wp/v2/posts?status=publish&per_page=10&orderby=date&order=desc");
 console.log("LATEST_POSTS",JSON.stringify(posts.map(x=>({id:x.id,slug:x.slug,title:x.title?.rendered,link:x.link}))));
}
