import dns from "node:dns"; dns.setDefaultResultOrder("ipv4first");
for(const k of ["WP_URL","WP_USERNAME","WP_APP_PASSWORD"]) if(!process.env[k]) throw new Error(k+" missing");
const base=process.env.WP_URL.replace(/\/$/,"");
const auth="Basic "+Buffer.from(process.env.WP_USERNAME+":"+process.env.WP_APP_PASSWORD.replace(/\s/g,"")).toString("base64");

async function wp(route,options={}){
 let last;
 for(let a=1;a<=8;a++){
  try{
   const r=await fetch(base+"/wp-json"+route,{...options,signal:AbortSignal.timeout(45000),headers:{Authorization:auth,"Connection":"close",...(options.headers||{})}});
   const t=await r.text();let d={};try{d=t?JSON.parse(t):{};}catch{d={raw:t.slice(0,1200)}}
   if(!r.ok){const e=new Error(`${r.status} ${d?.code||""} ${d?.message||t.slice(0,500)}`);e.status=r.status;throw e;} return d;
  }catch(e){last=e;console.warn("RETRY",a,route,e.message);if(a<8)await new Promise(r=>setTimeout(r,2500*a));}
 } throw last;
}
async function publicFetch(url){
 let last;for(let a=1;a<=8;a++){try{const r=await fetch(url,{headers:{"Connection":"close"},signal:AbortSignal.timeout(45000)});const t=await r.text();if(!r.ok)throw new Error(r.status+" "+t.slice(0,300));return t;}catch(e){last=e;if(a<8)await new Promise(r=>setTimeout(r,2500*a));}}throw last;
}
function esc(s=""){return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");}
async function page(id){
 const p=await wp("/wp/v2/pages/"+id+"?context=edit");
 if(p.status!=="publish") throw new Error("required page not publish "+id+" "+p.status);
 return {id:p.id,title:(p.title?.raw||p.title?.rendered||"").replace(/<[^>]+>/g,""),link:p.link,slug:p.slug};
}
async function upsertPage(slug,title,content,excerpt){
 const rows=await wp("/wp/v2/pages?context=edit&slug="+encodeURIComponent(slug)+"&status=publish,draft,pending,private,future&per_page=20").catch(()=>[]);
 const found=Array.isArray(rows)&&rows.length?rows[0]:null;
 const body={title,slug,content,excerpt,status:"publish"};
 return found
  ? await wp("/wp/v2/pages/"+found.id,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
  : await wp("/wp/v2/pages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
}

const ids={home:9,lit:122,hwajak:338,search:1615,guide:1616,error:1617,
 park:2413,kangho:881,kimsuhak:897,kimjong:929,jihak:945,changbi:964,mirae:915};
const P={};
for(const [k,id] of Object.entries(ids)) P[k]=await page(id);

const publishers=[
 ["비상 박영민",P.park],["비상 강호영",P.kangho],["천재 김수학",P.kimsuhak],
 ["천재 김종철",P.kimjong],["미래엔 신유식",P.mirae],["지학사 김철회",P.jihak],["창비",P.changbi]
];

const common2Content=`<!-- wp:html --><main class="mhub"><style>
.mhub{max-width:1080px;margin:0 auto;padding:26px 20px 64px;font-family:system-ui,-apple-system,"Noto Sans KR",sans-serif;color:#1d2a36}.mhub .hero{padding:38px 28px;border-radius:18px;background:#f1f7fb;border:1px solid #d6e5ef}.mhub h1{margin:0 0 12px;color:#174f78}.mhub .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-top:26px}.mhub a.card{display:block;padding:20px;border:1px solid #d2dde5;border-radius:13px;text-decoration:none;color:inherit;background:#fff}.mhub a.card:hover{border-color:#6d9dbc;box-shadow:0 6px 16px rgba(20,60,90,.08)}.mhub a.card strong{display:block;font-size:18px;color:#183e59}.mhub a.card span{display:block;margin-top:8px;color:#5c6d79}.mhub .note{margin-top:25px;padding:17px 19px;background:#fff7e9;border-left:4px solid #df8b28}</style>
<section class="hero"><h1>고1 공통국어2</h1><p>출판사별 공통국어2 통합 학습 목차와 해설·문제 자료입니다.</p></section>
<div class="grid">${publishers.map(([name,p])=>`<a class="card" href="${p.link}"><strong>${esc(name)} 공통국어2</strong><span>통합 학습 목차 · 해설 · 내신 변형문제 →</span></a>`).join("")}</div>
<div class="note">개별 작품과 단원은 각 출판사 통합 목차에서 확인할 수 있습니다.</div></main><!-- /wp:html -->`;
const common2Hub=await upsertPage("common-korean-2-reviewed","고1 공통국어2",common2Content,"고1 공통국어2 출판사별 통합 학습 목차와 해설·문제 자료입니다.");

const suteukContent=`<!-- wp:html --><main class="mhub"><style>
.mhub{max-width:1000px;margin:0 auto;padding:26px 20px 64px;font-family:system-ui,-apple-system,"Noto Sans KR",sans-serif;color:#1d2a36}.mhub .hero{padding:38px 28px;border-radius:18px;background:#f2f7fb;border:1px solid #d6e5ef}.mhub h1{margin:0 0 12px;color:#174f78}.mhub .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:26px}.mhub a.card{display:block;padding:25px;border:1px solid #d2dde5;border-radius:14px;text-decoration:none;color:inherit;background:#fff}.mhub a.card strong{display:block;font-size:22px;color:#183e59}.mhub a.card span{display:block;margin-top:8px;color:#5c6d79;line-height:1.65}@media(max-width:700px){.mhub .grid{grid-template-columns:1fr}}</style>
<section class="hero"><h1>2027 수능특강</h1><p>2027 수능특강 문학과 화법과 작문 자료를 영역별로 확인할 수 있습니다.</p></section>
<div class="grid"><a class="card" href="${P.lit.link}"><strong>2027 수능특강 문학</strong><span>작품 전체 목차 · 상세 해설 · 변형문제 →</span></a><a class="card" href="${P.hwajak.link}"><strong>2027 수능특강 화법과 작문</strong><span>화법·작문 자료 · 상세 해설 · 변형문제 →</span></a></div></main><!-- /wp:html -->`;
const suteukHub=await upsertPage("2027-suteuk-reviewed","2027 수능특강",suteukContent,"2027 수능특강 문학과 화법과 작문 자료를 영역별로 정리한 페이지입니다.");

const cat27=await wp("/wp/v2/categories/27");
const litCount=Number(cat27.count||0);

const home=`<!-- wp:html --><main class="modu-home"><style>
.modu-home{max-width:1140px;margin:0 auto;padding:20px 22px 72px;font-family:system-ui,-apple-system,"Noto Sans KR",sans-serif;color:#17222d}.modu-home *{box-sizing:border-box}.hero{padding:50px 30px;border-radius:22px;background:linear-gradient(135deg,#eef7ff,#fbfdff);border:1px solid #d7e6f0;text-align:center}.hero b{display:inline-block;padding:7px 12px;border-radius:999px;background:#174f78;color:#fff;font-size:13px}.hero h1{margin:16px 0 10px;color:#123e5d;font-size:38px}.hero p{max-width:760px;margin:auto;color:#566a79;font-size:18px;line-height:1.75}.section{margin-top:42px}.section h2{margin:0 0 8px;color:#183f5b;font-size:27px}.section>p{margin:0 0 19px;color:#64727d}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.pubgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.card{display:block;padding:22px;border:1px solid #d3dfe7;border-radius:14px;background:#fff;text-decoration:none;color:inherit!important;box-shadow:0 3px 12px rgba(30,60,85,.04)}.card:hover{border-color:#6e9fbe;transform:translateY(-2px)}.card strong{display:block;color:#173e59;font-size:19px;line-height:1.45}.card span{display:block;margin-top:8px;color:#657783;line-height:1.6}.big strong{font-size:24px}.tools{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px}.tool{padding:15px;text-align:center;border-radius:11px;background:#f6f8f9;text-decoration:none;color:#2b4252!important;font-weight:800}@media(max-width:760px){.hero h1{font-size:29px}.grid,.tools{grid-template-columns:1fr}.hero{padding:38px 20px}}</style>
<section class="hero"><h1>모두의 국어</h1><p>고등 국어 교과서·수능 학습 자료와 해설·변형문제를 한곳에서 확인할 수 있습니다.</p></section>
<section id="common2" class="section"><h2>고1 · 공통국어2</h2><p>출판사별 통합 학습 목차입니다.</p><div class="pubgrid">${publishers.map(([name,p])=>`<a class="card" href="${p.link}"><strong>${esc(name)}</strong><span>공통국어2 통합 목차 →</span></a>`).join("")}</div><p style="margin-top:16px"><a href="${common2Hub.link}" style="font-weight:800;color:#17608e">공통국어2 전체 연결 페이지 →</a></p></section>
<section id="suteuk2027" class="section"><h2>고3 / N수 · 2027 수능특강</h2><p>영역별 자료를 바로 확인하세요.</p><div class="grid"><a class="card big" href="${P.lit.link}"><strong>2027 수능특강 문학</strong><span>문학 카테고리 ${litCount}개 자료 · 전체 목차 · 상세 해설 · 변형문제 →</span></a><a class="card big" href="${P.hwajak.link}"><strong>2027 수능특강 화법과 작문</strong><span>화법·작문 통합 목차 · 상세 해설 · 변형문제 →</span></a></div><p style="margin-top:16px"><a href="${suteukHub.link}" style="font-weight:800;color:#17608e">2027 수능특강 자료 전체 보기 →</a></p></section>
<section class="section"><h2>바로가기</h2><div class="tools"><a class="tool" href="${P.search.link}">자료 검색</a><a class="tool" href="https://contents.premium.naver.com/rhodus/rhoduss">문제 파일 다운로드</a><a class="tool" href="${P.guide.link}">사이트 안내</a><a class="tool" href="${P.error.link}">오류 신고·문의</a></div></section>
</main><!-- /wp:html -->`;
const homeUpdated=await wp("/wp/v2/pages/9",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content:home,excerpt:"고등 국어 교과서·수능 학습 자료와 해설·변형문제를 제공하는 모두의 국어 메인페이지입니다.",status:"publish"})});

// Create or reset clean primary menu
let menus=await wp("/wp/v2/menus?search="+encodeURIComponent("모두의 국어")+"&per_page=50");
let menu=Array.isArray(menus)&&menus.find(x=>["modu-main-nav","modu-reviewed-main"].includes(x.slug));
if(!menu) menu=await wp("/wp/v2/menus",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"모두의 국어 메인 내비게이션",slug:"modu-main-nav"})});
else menu=await wp("/wp/v2/menus/"+menu.id,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"모두의 국어 메인 내비게이션",slug:"modu-main-nav"})});
const oldItems=await wp("/wp/v2/menu-items?menus="+menu.id+"&context=edit&per_page=100");
if(Array.isArray(oldItems)) for(const x of oldItems) await wp("/wp/v2/menu-items/"+x.id+"?force=true",{method:"DELETE"});

let order=1;
async function add(title,url,parent=0){
 const x=await wp("/wp/v2/menu-items",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,url,status:"publish",menus:menu.id,parent,menu_order:order++})});
 return x.id;
}
await add("홈",base+"/");
const g1=await add("고1 국어",common2Hub.link);
const c2=await add("공통국어2",common2Hub.link,g1);
for(const [name,p] of publishers) await add(name,p.link,c2);
const g3=await add("고3 / N수",suteukHub.link);
const st=await add("2027 수능특강",suteukHub.link,g3);
await add("문학",P.lit.link,st);
await add("화법과 작문",P.hwajak.link,st);
await add("자료 검색",P.search.link);
await add("문제 파일 다운로드","https://contents.premium.naver.com/rhodus/rhoduss");
await add("사이트 안내",P.guide.link);
await add("오류 신고·문의",P.error.link);

// assign new clean menu to primary
let assigned=false;
try{
 const m=await wp("/wp/v2/menus/"+menu.id,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({locations:["primary"]})});
 assigned=Array.isArray(m.locations)&&m.locations.includes("primary");
}catch(e){console.warn("MENU_LOCATION_BY_MENU_FAIL",e.message);}
if(!assigned){
 try{
  const loc=await wp("/wp/v2/menu-locations/primary",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({menu:menu.id})});
  assigned=Number(loc?.menu||0)===Number(menu.id);
 }catch(e){console.warn("MENU_LOCATION_ENDPOINT_FAIL",e.message);}
}
if(!assigned) throw new Error("failed to assign clean menu to primary");

const verifyMenu=await wp("/wp/v2/menu-items?menus="+menu.id+"&context=edit&per_page=100&orderby=menu_order&order=asc");
const titles=verifyMenu.map(x=>x.title?.raw||x.title?.rendered||"");
for(const needed of ["홈","고1 국어","공통국어2","2027 수능특강","문학","화법과 작문","자료 검색"]) if(!titles.includes(needed)) throw new Error("MENU_MISSING "+needed);
if(new Set(verifyMenu.map(x=>x.id)).size!==verifyMenu.length) throw new Error("menu id duplicate");

const publicHome=await publicFetch(base+"/?modu_refresh="+Date.now());
for(const marker of ["공통국어2","2027 수능특강 문학","비상 박영민","미래엔 신유식"]) if(!publicHome.includes(marker)) throw new Error("PUBLIC_HOME_MISSING "+marker);
console.log("SITE_STRUCTURE_REBUILT_OK",JSON.stringify({home:homeUpdated.link,common2:common2Hub.link,suteuk:suteukHub.link,menu_id:menu.id,menu_items:verifyMenu.length,lit_count:litCount,primary_assigned:assigned}));
