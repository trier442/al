import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

for(const k of ["WP_URL","WP_USERNAME","WP_APP_PASSWORD"]) if(!process.env[k]) throw new Error(k+" missing");
const base=process.env.WP_URL.replace(/\/$/,"");
const auth="Basic "+Buffer.from(process.env.WP_USERNAME+":"+process.env.WP_APP_PASSWORD.replace(/\s/g,"")).toString("base64");

async function wp(route, options={}){
  let last;
  for(let a=1;a<=8;a++){
    try{
      const r=await fetch(base+"/wp-json"+route,{
        ...options,
        signal:AbortSignal.timeout(45000),
        headers:{Authorization:auth,"Connection":"close",...(options.headers||{})}
      });
      const t=await r.text(); let d={}; try{d=t?JSON.parse(t):{};}catch{d={raw:t.slice(0,1200)}}
      if(!r.ok){const e=new Error(`${r.status} ${d?.code||""} ${d?.message||t.slice(0,500)}`);e.status=r.status;throw e;}
      return d;
    }catch(e){
      last=e; console.warn("RETRY",a,route,e.message);
      if(a<8) await new Promise(r=>setTimeout(r,2500*a));
    }
  }
  throw last;
}
function meta(raw,key){return raw.match(new RegExp(`<!--\\s*${key}:\\s*([^\\n]*?)\\s*-->`,"i"))?.[1]?.trim()||"";}
function esc(s=""){return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");}
function cleanTitle(t=""){return t.replace(/^\[2027 수능특강 화법과 작문\]\s*/,"").replace(/\s*해설 및 변형문제$/,"").trim();}

const singleDir=path.join("scripts","hwajak-single");
const revised=fs.readdirSync(singleDir).filter(n=>/^2027-suteuk-hwajak-.*\.mjs$/.test(n)).map(n=>n.replace(/\.mjs$/,"")).sort();
const items=[];
for(const slug of revised){
  const file=path.join("wordpress-content",slug+".html");
  if(!fs.existsSync(file)) continue;
  const raw=fs.readFileSync(file,"utf8");
  items.push({slug,title:cleanTitle(meta(raw,"title")),tag:raw.match(/<span class="tag">([^<]+)<\/span>/)?.[1]?.trim()||""});
}
const writing=items.filter(x=>x.slug.includes("-w")).reverse().slice(0,10);
const speaking=items.filter(x=>x.slug.includes("-s")).reverse().slice(0,8);
const card=x=>`<a class="mh-card" href="${base}/${x.slug}/"><span>${esc(x.tag||"2027 수능특강")}</span><strong>${esc(x.title)}</strong><em>검수 완료 자료 보기 →</em></a>`;

const content=`<!-- wp:html -->
<div class="modu-home-current" data-modu-home-current="2026-09-22">
<style>
.modu-home-current{max-width:1120px;margin:0 auto;padding:0 22px 70px;font-family:system-ui,-apple-system,"Noto Sans KR",sans-serif;color:#172033}
.modu-home-current *{box-sizing:border-box}
.mh-hero{margin:18px 0 26px;padding:54px 28px;border-radius:22px;background:linear-gradient(135deg,#eff7ff,#f8fbff);border:1px solid #d8e7f2;text-align:center}
.mh-hero .badge{display:inline-block;padding:7px 12px;border-radius:999px;background:#174f78;color:#fff;font-size:13px;font-weight:800}
.mh-hero h1{margin:16px 0 10px;font-size:38px;line-height:1.3;color:#123d5c}
.mh-hero p{max-width:760px;margin:0 auto;color:#506576;font-size:18px;line-height:1.75}
.mh-notice{margin:22px 0;padding:18px 20px;border-left:5px solid #e28a20;background:#fff7e9;border-radius:0 12px 12px 0;line-height:1.7}
.mh-primary{display:grid;grid-template-columns:1.2fr .8fr;gap:18px;margin:28px 0 42px}
.mh-panel{padding:27px;border:1px solid #cfdae3;border-radius:18px;background:#fff;box-shadow:0 5px 18px rgba(20,55,80,.06)}
.mh-panel h2{margin:0 0 10px;color:#174f78;font-size:25px}
.mh-panel p{margin:0 0 18px;color:#5e6c77;line-height:1.7}
.mh-mainlink{display:inline-block;padding:13px 18px;background:#174f78;color:#fff!important;text-decoration:none;border-radius:9px;font-weight:800}
.mh-stat{display:flex;align-items:center;justify-content:center;min-height:180px;text-align:center;background:#f7fbfd}
.mh-stat strong{display:block;font-size:46px;color:#174f78;line-height:1}
.mh-stat span{display:block;margin-top:9px;color:#5d6b76;font-weight:700}
.mh-section{margin-top:42px}
.mh-section h2{margin:0 0 7px;color:#1d405a;font-size:26px}
.mh-section>p{margin:0 0 18px;color:#64717c}
.mh-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}
.mh-card{display:block;padding:18px 19px;border:1px solid #d4dfe7;border-radius:13px;background:#fff;color:inherit!important;text-decoration:none;transition:.18s}
.mh-card:hover{transform:translateY(-2px);border-color:#6ea0c1;box-shadow:0 7px 18px rgba(20,55,80,.08)}
.mh-card span{display:block;color:#667b89;font-size:13px;margin-bottom:5px}
.mh-card strong{display:block;color:#172f43;font-size:17px;line-height:1.45}
.mh-card em{display:block;margin-top:11px;color:#17608e;font-style:normal;font-weight:800;font-size:14px}
.mh-policy{margin-top:46px;padding:22px;border-radius:15px;background:#f5f7f8;color:#4e5c66;line-height:1.8}
@media(max-width:760px){.mh-hero{padding:38px 20px}.mh-hero h1{font-size:29px}.mh-primary,.mh-grid{grid-template-columns:1fr}.mh-stat{min-height:135px}}
</style>
<section class="mh-hero">
  <span class="badge">모두의 국어 자료 전면 개편 중</span>
  <h1>검수 완료된 새 자료만 공개합니다</h1>
  <p>수정 이전 자료와 미검수 자료는 메인에서 제외하고, EBS 원문·정답·해설을 다시 대조해 완성한 자료만 순차적으로 공개합니다.</p>
</section>
<div class="mh-notice"><strong>현재 공개 원칙</strong> · 이전 버전과 자동 생성 미검수 자료는 숨김 처리하고, 상세 요약·출제 포인트·EBS 문항 해설·수능형 변형문제를 전면 검수한 뒤 공개합니다.</div>
<section class="mh-primary">
  <div class="mh-panel">
    <h2>2027 수능특강 화법과 작문</h2>
    <p>현재까지 전면 검수·재작성 완료된 자료만 모아 둔 통합 목록입니다. 새로 완료되는 자료는 이 목록과 메인페이지에 함께 추가됩니다.</p>
    <a class="mh-mainlink" href="${base}/2027-%EC%88%98%EB%8A%A5%ED%8A%B9%EA%B0%95-%ED%99%94%EB%B2%95%EA%B3%BC-%EC%9E%91%EB%AC%B8-%ED%99%94%EC%9E%91-%EC%A0%84%EC%B2%B4-%ED%95%B4%EC%84%A4-%EB%B0%8F-%EB%B3%80%ED%98%95-%EB%AC%B8%EC%A0%9C/">검수 완료 자료 전체 보기 →</a>
  </div>
  <div class="mh-panel mh-stat"><div><strong>${items.length}</strong><span>현재 공개 중인 검수 완료 자료</span></div></div>
</section>
<section class="mh-section">
  <h2>최근 검수 완료 · 작문</h2>
  <p>최근 새로 제작·검수하여 공개한 작문 자료입니다.</p>
  <div class="mh-grid">${writing.map(card).join("")}</div>
</section>
<section class="mh-section">
  <h2>검수 완료 · 화법</h2>
  <p>기존 자동 생성본이 아니라 내용과 문항을 다시 검수한 자료만 표시합니다.</p>
  <div class="mh-grid">${speaking.map(card).join("")}</div>
</section>
<div class="mh-policy"><strong>다른 영역도 같은 방식으로 교체합니다.</strong><br>문학·독서·언어와 매체·내신 자료 역시 기존 자료를 그대로 메인에 노출하지 않고, 전면 검수 완료 후 새 자료로 교체하여 공개합니다.</div>
</div>
<!-- /wp:html -->`;

const settings=await wp("/wp/v2/settings");
if(settings.show_on_front!=="page" || !settings.page_on_front) throw new Error("front page setting unexpected");
const id=settings.page_on_front;
const updated=await wp("/wp/v2/pages/"+id,{
  method:"POST",
  headers:{"Content-Type":"application/json; charset=utf-8"},
  body:JSON.stringify({content,excerpt:"모두의 국어는 전면 검수·재작성 완료된 최신 자료만 메인페이지에 공개합니다.",status:"publish"})
});
console.log("UPDATED_HOME",JSON.stringify({id:updated.id,slug:updated.slug,status:updated.status,link:updated.link}));
const verify=await wp("/wp/v2/pages/"+id+"?context=edit");
const raw=verify.content?.raw||"";
const oldSignals=["2026 수능특강","2026 수능완성","공통국어 (출판사별)","2027 수능완성 문학"];
for(const s of oldSignals) if(raw.includes(s)) throw new Error("OLD_HOME_SIGNAL_REMAINS "+s);
if(!raw.includes('data-modu-home-current="2026-09-22"') || !raw.includes("검수 완료된 새 자료만 공개합니다")) throw new Error("HOME_MARKER_MISSING");
console.log("HOME_CURRENT_OK",JSON.stringify({id:verify.id,status:verify.status,revised_count:items.length,link:verify.link}));
