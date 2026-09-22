import dns from "node:dns"; dns.setDefaultResultOrder("ipv4first");
for(const k of ["WP_URL","WP_USERNAME","WP_APP_PASSWORD"]) if(!process.env[k]) throw new Error(k+" missing");
const base=process.env.WP_URL.replace(/\/$/,"");
const auth="Basic "+Buffer.from(process.env.WP_USERNAME+":"+process.env.WP_APP_PASSWORD.replace(/\s/g,"")).toString("base64");
async function get(route){const r=await fetch(base+"/wp-json"+route,{headers:{Authorization:auth,"Connection":"close"},signal:AbortSignal.timeout(45000)});const t=await r.text();if(!r.ok)throw new Error(r.status+" "+t.slice(0,500));return JSON.parse(t);}
const settings=await get("/wp/v2/settings");
console.log("SETTINGS",JSON.stringify({title:settings.title,show_on_front:settings.show_on_front,page_on_front:settings.page_on_front,page_for_posts:settings.page_for_posts}));
if(settings.page_on_front){
 const p=await get("/wp/v2/pages/"+settings.page_on_front+"?context=edit");
 console.log("FRONT_PAGE",JSON.stringify({id:p.id,slug:p.slug,status:p.status,title:p.title?.raw||p.title?.rendered,template:p.template,content_raw:p.content?.raw?.slice(0,20000),content_rendered:p.content?.rendered?.slice(0,20000)}));
}
