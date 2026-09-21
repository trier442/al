import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
const required=["WP_URL","WP_USERNAME","WP_APP_PASSWORD"];
for(const k of required) if(!process.env[k]) throw new Error(k+" missing");
const base=process.env.WP_URL.replace(/\/$/,"");
const auth="Basic "+Buffer.from(process.env.WP_USERNAME+":"+process.env.WP_APP_PASSWORD.replace(/\s/g,"")).toString("base64");
const CATEGORY_ID=26;
const INDEX_TITLE="[2027 수능특강 화법과 작문] 전체 해설 및 변형문제";
const SHORT_SLUG="2027-suteuk-hwajak";

async function req(route,options={}){
  let last;
  for(let i=1;i<=5;i++){
    try{
      const r=await fetch(base+route,{...options,signal:AbortSignal.timeout(45000),headers:{Authorization:auth,"Content-Type":"application/json; charset=utf-8","Connection":"close",...(options.headers||{})}});
      const t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch{d={raw:t.slice(0,800)}}
      if(!r.ok){const e=new Error(r.status+" "+(d?.message||t.slice(0,400)));e.status=r.status;throw e;}
      return d;
    }catch(e){last=e;if(i<5)await new Promise(r=>setTimeout(r,1500*i));}
  }
  throw last;
}
async function front(url){
  const r=await fetch(url,{redirect:"follow",headers:{"User-Agent":"Mozilla/5.0","Connection":"close"},signal:AbortSignal.timeout(30000)});
  return {status:r.status,url:r.url,text:await r.text()};
}
const plain=v=>String(v??"").replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").trim();

const posts=await req("/wp-json/wp/v2/posts?context=edit&status=publish&categories=26&per_page=100");
let index=posts.find(x=>plain(x.title?.rendered||x.title?.raw||"")===INDEX_TITLE);
if(!index) throw new Error("hwajak index post not found");
index=await req("/wp-json/wp/v2/posts/"+index.id,{method:"POST",body:JSON.stringify({slug:SHORT_SLUG,status:"publish",date:"2026-09-20T10:00:00"})});
console.log("INDEX_FIXED",JSON.stringify({id:index.id,slug:index.slug,link:index.link,status:index.status}));

const settings=await req("/wp-json/wp/v2/settings?context=edit");
if(!settings.page_on_front) throw new Error("front page not configured");
const home=await req("/wp-json/wp/v2/pages/"+settings.page_on_front+"?context=edit");
let raw=String(home.content?.raw||"");
const oldPlain=base+"/2027-수능특강-화법과-작문-화작-전체-해설-및-변형-문제/";
const oldEncoded=base+"/2027-%EC%88%98%EB%8A%A5%ED%8A%B9%EA%B0%95-%ED%99%94%EB%B2%95%EA%B3%BC-%EC%9E%91%EB%AC%B8-%ED%99%94%EC%9E%91-%EC%A0%84%EC%B2%B4-%ED%95%B4%EC%84%A4-%EB%B0%8F-%EB%B3%80%ED%98%95-%EB%AC%B8%EC%A0%9C/";
const newUrl=base+"/"+SHORT_SLUG+"/";
raw=raw.split(oldPlain).join(newUrl).split(oldEncoded).join(newUrl);
raw=raw.replaceAll("전체 57개 자료의 핵심 설명·해설·변형문제를 확인하세요.","새로 검수·제작한 화법·작문 자료의 핵심 설명·해설·변형문제를 확인하세요.");
const mobileOld="item('수능특강 문학',links.suteukLit)+item('수능특강 독서',links.suteukRead)+item('수능특강 언어와 매체',links.suteukEonMae)";
const mobileNew="item('수능특강 문학',links.suteukLit)+item('수능특강 독서',links.suteukRead)+item('수능특강 화법과 작문',links.suteukHw)+item('수능특강 언어와 매체',links.suteukEonMae)";
raw=raw.replace(mobileOld,mobileNew);
const homeUpdated=await req("/wp-json/wp/v2/pages/"+home.id,{method:"POST",body:JSON.stringify({content:raw,status:"publish"})});
console.log("HOME_UPDATED",JSON.stringify({id:homeUpdated.id,link:homeUpdated.link,status:homeUpdated.status}));

try{
  const menus=await req("/wp-json/wp/v2/menus?per_page=100&context=edit");
  const items=await req("/wp-json/wp/v2/menu-items?per_page=100&context=edit&orderby=menu_order&order=asc");
  const loc=await req("/wp-json/wp/v2/menu-locations?context=edit");
  const mids=i=>Array.isArray(i.menus)?i.menus.map(Number):[Number(i.menus||0)].filter(Boolean);
  let primary=0;
  for(const [k,v] of Object.entries(loc||{})){if(/primary|header|main/i.test(k)){primary=Number(v?.menu??v?.id??v)||0;if(primary)break;}}
  if(!primary&&menus?.[0])primary=Number(menus[0].id);
  const active=items.filter(i=>mids(i).includes(primary));
  const matches=active.filter(i=>plain(i.title?.raw||i.title?.rendered||"")==="2027 수능특강 화법과 작문");
  for(const m of matches){
    const u=await req("/wp-json/wp/v2/menu-items/"+m.id,{method:"POST",body:JSON.stringify({url:newUrl,title:"2027 수능특강 화법과 작문",status:"publish"})});
    console.log("MENU_LINK_FIXED",u.id,u.url);
  }
}catch(e){console.warn("MENU_FIX_WARN",e.message)}

const indexFront=await front(newUrl);
if(indexFront.status!==200) throw new Error("index front "+indexFront.status);
const homeFront=await front(base+"/");
if(homeFront.status!==200) throw new Error("home front "+homeFront.status);
if(!homeFront.text.includes(newUrl) && !homeFront.text.includes("/"+SHORT_SLUG+"/")) throw new Error("home does not expose new hwajak link");

const finalPosts=await req("/wp-json/wp/v2/posts?context=edit&status=publish&categories=26&per_page=100&orderby=id&order=asc");
const canon=finalPosts.filter(x=>/^2027-suteuk-hwajak-(?:s\d\d[ab]|w\d\d[ab])$/.test(x.slug));
const extras=finalPosts.filter(x=>x.slug!==SHORT_SLUG&&!/^2027-suteuk-hwajak-(?:s\d\d[ab]|w\d\d[ab])$/.test(x.slug));
if(canon.length!==26) throw new Error("canonical revised post count "+canon.length);
if(extras.length) throw new Error("unexpected published category posts "+JSON.stringify(extras.map(x=>({id:x.id,slug:x.slug}))));
const checks=[];
for(const x of canon){const r=await front(x.link);checks.push({id:x.id,slug:x.slug,status:r.status});if(r.status!==200)throw new Error("front fail "+x.slug+" "+r.status);}
console.log("FINAL_VERIFY",JSON.stringify({categoryPublished:finalPosts.length,canonical:canon.length,index:{id:index.id,slug:index.slug,status:indexFront.status,link:newUrl},home:homeFront.status,checks}));
console.log("HWAJAK_PUBLIC_CLEANUP_OK");
