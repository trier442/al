import dns from "node:dns";dns.setDefaultResultOrder("ipv4first");
for(const k of ["WP_URL","WP_USERNAME","WP_APP_PASSWORD"]) if(!process.env[k]) throw new Error(k+" missing");
const base=process.env.WP_URL.replace(/\/$/,""),auth="Basic "+Buffer.from(process.env.WP_USERNAME+":"+process.env.WP_APP_PASSWORD.replace(/\s/g,"")).toString("base64");
async function get(route){let last;for(let a=1;a<=8;a++){try{const r=await fetch(base+"/wp-json"+route,{headers:{Authorization:auth,"Connection":"close"},signal:AbortSignal.timeout(45000)});const t=await r.text();if(!r.ok){const e=new Error(r.status+" "+t.slice(0,400));e.status=r.status;throw e;}return JSON.parse(t);}catch(e){last=e;console.warn("RETRY",a,e.message);if(a<8)await new Promise(r=>setTimeout(r,2500*a));}}throw last;}
const revs=await get("/wp/v2/pages/9/revisions?context=edit&per_page=100");
for(const r of revs){
 const raw=r.content?.raw||"";
 if(/공통국어\s*\(출판사별\)|공통국어 1 →|2027 수능특강 독서/.test(raw)){
   console.log("REV",JSON.stringify({id:r.id,date:r.date,modified:r.modified}));
   const links=[...raw.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m=>({href:m[1],text:m[2].replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim()}));
   console.log(JSON.stringify(links.filter(x=>/공통국어\s*1|2027 수능특강 독서|비상|강호영|김수학|김종철|신유식|김철회|동아|창비|해냄/.test(x.text))));
   break;
 }
}
