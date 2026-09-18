import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

const required=["WP_URL","WP_USERNAME","WP_APP_PASSWORD"];
for(const k of required) if(!process.env[k]) throw new Error(`${k} missing`);
const base=process.env.WP_URL.replace(/\/$/,"");
const auth="Basic "+Buffer.from(process.env.WP_USERNAME+":"+process.env.WP_APP_PASSWORD.replace(/\s/g,"")).toString("base64");

async function req(route, options={}){
  const r=await fetch(base+route,{...options,headers:{Authorization:auth,"Content-Type":"application/json; charset=utf-8",...(options.headers||{})}});
  const t=await r.text(); let d; try{d=t?JSON.parse(t):{}}catch{d={raw:t}};
  if(!r.ok) throw new Error(`${route} -> ${r.status} ${JSON.stringify(d).slice(0,1000)}`);
  return d;
}
const plain=(v)=>String(v??"").replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&#8211;/g,"–").replace(/&#47;/g,"/").trim();

const root=await req("/wp-json/");
const routes=root.routes||{};
const hasClassic=Boolean(routes["/wp/v2/menu-items"] && routes["/wp/v2/menus"]);
console.log("classic menu REST:",hasClassic);

if(hasClassic){
  const menus=await req("/wp-json/wp/v2/menus?per_page=100&context=edit");
  console.log("menus:",menus.map(m=>({id:m.id,name:plain(m.name),slug:m.slug,locations:m.locations||[]})));
  const items=await req("/wp-json/wp/v2/menu-items?per_page=100&context=edit&orderby=menu_order&order=asc");
  const byMenu=new Map();
  for(const it of items){
    for(const mid of (it.menus||[])){
      if(!byMenu.has(mid)) byMenu.set(mid,[]);
      byMenu.get(mid).push(it);
    }
  }
  let deleted=0;
  for(const menu of menus){
    const arr=byMenu.get(menu.id)||[];
    const top=arr.filter(x=>Number(x.parent||0)===0).sort((a,b)=>(a.menu_order??0)-(b.menu_order??0)||a.id-b.id);
    console.log("before top menu",menu.id,top.map(x=>({id:x.id,title:plain(x.title?.raw||x.title?.rendered),url:x.url,order:x.menu_order})));
    const seen=new Map();
    for(const it of top){
      const title=plain(it.title?.raw||it.title?.rendered).replace(/\s+/g," ");
      const url=String(it.url||"").replace(/\/$/,"");
      const key=(title+"|"+url).toLowerCase();
      if(!seen.has(key)){seen.set(key,it.id);continue;}
      await req(`/wp-json/wp/v2/menu-items/${it.id}?force=true`,{method:"DELETE"});
      deleted++;
      console.log("deleted duplicate top item", {id:it.id,title,url,kept:seen.get(key)});
    }
  }
  console.log("deleted duplicates:",deleted);
  const after=await req("/wp-json/wp/v2/menu-items?per_page=100&context=edit&orderby=menu_order&order=asc");
  console.log("remaining top:",after.filter(x=>Number(x.parent||0)===0).map(x=>({id:x.id,title:plain(x.title?.raw||x.title?.rendered),url:x.url,menus:x.menus,order:x.menu_order})));
  process.exit(0);
}

if(routes["/wp/v2/navigation"]){
  const navs=await req("/wp-json/wp/v2/navigation?per_page=100&context=edit");
  console.log("navigation posts:",navs.map(n=>({id:n.id,title:plain(n.title?.raw||n.title?.rendered),status:n.status})));
  throw new Error("Block navigation detected; automatic cleanup stopped to avoid unsafe block rewrite.");
}
throw new Error("No supported WordPress menu REST routes found.");
