import dns from "node:dns"; dns.setDefaultResultOrder("ipv4first");
for(const k of ["WP_URL","WP_USERNAME","WP_APP_PASSWORD"]) if(!process.env[k]) throw new Error(k+" missing");
const base=process.env.WP_URL.replace(/\/$/,"");
const auth="Basic "+Buffer.from(process.env.WP_USERNAME+":"+process.env.WP_APP_PASSWORD.replace(/\s/g,"")).toString("base64");
async function req(route){
 let last;
 for(let a=1;a<=8;a++){try{
  const r=await fetch(base+"/wp-json"+route,{headers:{Authorization:auth,"Connection":"close"},signal:AbortSignal.timeout(45000)});
  const t=await r.text();if(!r.ok){const e=new Error(r.status+" "+t.slice(0,400));e.status=r.status;throw e;}return t?JSON.parse(t):{};
 }catch(e){last=e;if(a<8)await new Promise(r=>setTimeout(r,2500*a));}}throw last;
}
async function all(route){
 const out=[];for(let p=1;p<=20;p++){try{const d=await req(route+(route.includes("?")?"&":"?")+"per_page=100&page="+p);if(!Array.isArray(d)||!d.length)break;out.push(...d);if(d.length<100)break;}catch(e){if(e.status===400)break;throw e;}}return out;
}
const cats=await all("/wp/v2/categories?hide_empty=false");
console.log("CAT_BEGIN");
for(const x of cats.sort((a,b)=>a.id-b.id)) console.log(JSON.stringify({id:x.id,name:x.name,slug:x.slug,count:x.count,parent:x.parent,link:x.link}));
console.log("CAT_END");
const items=await all("/wp/v2/menu-items?menus=30&context=edit&orderby=menu_order&order=asc");
console.log("MENU_BEGIN");
for(const x of items) console.log(JSON.stringify({id:x.id,title:x.title?.raw||x.title?.rendered,url:x.url,parent:x.parent,order:x.menu_order,type:x.type,object:x.object,object_id:x.object_id,menus:x.menus}));
console.log("MENU_END");
const pages=await all("/wp/v2/pages?status=publish&context=edit&orderby=id&order=desc");
console.log("INDEX_BEGIN");
for(const x of pages){
 const t=(x.title?.raw||x.title?.rendered||"").replace(/<[^>]+>/g,"");
 if(/공통국어\s*2|공통국어2|2027\s*수능특강\s*문학|자료 검색|사이트 안내|오류 신고|화법과 작문/.test(t)){
   if(/통합|목차|공통국어\s*2$|공통국어2$|수능특강\s*문학|자료 검색|사이트 안내|오류 신고|화법과 작문/.test(t))
     console.log(JSON.stringify({id:x.id,title:t,slug:x.slug,link:x.link,status:x.status}));
 }
}
console.log("INDEX_END");
