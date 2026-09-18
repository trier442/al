import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

const required=["WP_URL","WP_USERNAME","WP_APP_PASSWORD"];
for(const k of required) if(!process.env[k]) throw new Error(`${k} missing`);
const base=process.env.WP_URL.replace(/\/$/,"");
const auth="Basic "+Buffer.from(process.env.WP_USERNAME+":"+process.env.WP_APP_PASSWORD.replace(/\s/g,"")).toString("base64");

async function req(route, options={}){
  let last;
  for(let attempt=1;attempt<=5;attempt++){
    try{
      const r=await fetch(base+route,{...options,headers:{Authorization:auth,"Content-Type":"application/json; charset=utf-8",...(options.headers||{})}});
      const t=await r.text(); let d; try{d=t?JSON.parse(t):{}}catch{d={raw:t}};
      if(!r.ok) throw new Error(`${route} -> ${r.status} ${JSON.stringify(d).slice(0,1000)}`);
      return d;
    }catch(e){
      last=e;
      console.warn("request retry",attempt,route,String(e?.message||e));
      if(attempt<5) await new Promise(resolve=>setTimeout(resolve,1500*attempt));
    }
  }
  throw last;
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
    const mids=Array.isArray(it.menus)?it.menus:[it.menus].filter(Boolean);
    for(const mid of mids){
      if(!byMenu.has(Number(mid))) byMenu.set(Number(mid),[]);
      byMenu.get(Number(mid)).push(it);
    }
  }
  const targets=menus.filter(m=>Array.isArray(m.locations)&&m.locations.includes("primary"));
  if(!targets.length) throw new Error("primary 위치에 연결된 메뉴를 찾지 못했습니다.");
  let deleted=0;
  for(const menu of targets){
    let arr=(byMenu.get(menu.id)||[]).sort((a,b)=>(a.menu_order??0)-(b.menu_order??0)||a.id-b.id);
    console.log("before menu",menu.id,arr.map(x=>({id:x.id,parent:Number(x.parent||0),title:plain(x.title?.raw||x.title?.rendered),url:x.url,order:x.menu_order})));

    // WordPress에서 부모 메뉴만 삭제되면 자식이 고아 상태로 남을 수 있다.
    // 현재 존재하는 루트(parent=0)에서 실제로 도달 가능한 항목만 남긴다.
    const reachable=new Set(arr.filter(x=>Number(x.parent||0)===0).map(x=>Number(x.id)));
    let changed=true;
    while(changed){
      changed=false;
      for(const it of arr){
        const id=Number(it.id), parent=Number(it.parent||0);
        if(!reachable.has(id) && parent!==0 && reachable.has(parent)){
          reachable.add(id); changed=true;
        }
      }
    }
    for(const it of arr){
      if(reachable.has(Number(it.id))) continue;
      const title=plain(it.title?.raw||it.title?.rendered).replace(/\s+/g," ");
      await req(`/wp-json/wp/v2/menu-items/${it.id}?force=true`,{method:"DELETE"});
      deleted++;
      console.log("deleted orphan menu item",{id:it.id,parent:Number(it.parent||0),title});
    }
    arr=arr.filter(it=>reachable.has(Number(it.id)));

    const seen=new Map();
    for(const it of arr){
      const parent=Number(it.parent||0);
      const title=plain(it.title?.raw||it.title?.rendered).replace(/\s+/g," ");
      const url=String(it.url||"").replace(/\/$/,"");
      const key=(parent+"|"+title+"|"+url).toLowerCase();
      if(!seen.has(key)){seen.set(key,it.id);continue;}
      await req(`/wp-json/wp/v2/menu-items/${it.id}?force=true`,{method:"DELETE"});
      deleted++;
      console.log("deleted duplicate menu item",{id:it.id,parent,title,url,kept:seen.get(key)});
    }
  }
  console.log("deleted duplicates:",deleted);
  const after=await req("/wp-json/wp/v2/menu-items?per_page=100&context=edit&orderby=menu_order&order=asc");
  const remaining=after.filter(x=>(Array.isArray(x.menus)?x.menus.map(Number).includes(targets[0].id):Number(x.menus)===targets[0].id));
  console.log("remaining primary menu:",remaining.map(x=>({id:x.id,parent:Number(x.parent||0),title:plain(x.title?.raw||x.title?.rendered),url:x.url,menus:x.menus,order:x.menu_order})));
  process.exit(0);
}

if(routes["/wp/v2/navigation"]){
  const navs=await req("/wp-json/wp/v2/navigation?per_page=100&context=edit");
  console.log("navigation posts:",navs.map(n=>({id:n.id,title:plain(n.title?.raw||n.title?.rendered),status:n.status})));
  throw new Error("Block navigation detected; automatic cleanup stopped to avoid unsafe block rewrite.");
}
throw new Error("No supported WordPress menu REST routes found.");
// trigger 2026-09-18 top-menu cleanup
