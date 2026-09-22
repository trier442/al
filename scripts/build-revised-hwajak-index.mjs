import fs from "node:fs";
import path from "node:path";

const ROOT=process.cwd();
const CONTENT=path.join(ROOT,"wordpress-content");
const SINGLE=path.join(ROOT,"scripts","hwajak-single");
const revised=new Set(fs.readdirSync(SINGLE).filter(n=>/^2027-suteuk-hwajak-.*\.mjs$/.test(n)).map(n=>n.replace(/\.mjs$/,"")));
function meta(raw,key){return raw.match(new RegExp(`<!--\\s*${key}:\\s*([^\\n]*?)\\s*-->`,"i"))?.[1]?.trim()||"";}
function esc(s=""){return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");}
const items=[];
for(const slug of [...revised].sort()){
  const file=path.join(CONTENT,slug+".html");
  if(!fs.existsSync(file)) continue;
  const raw=fs.readFileSync(file,"utf8");
  const title=meta(raw,"title").replace(/^\[2027 수능특강 화법과 작문\]\s*/,"").replace(/\s*해설 및 변형문제$/,"");
  const tag=raw.match(/<span class="tag">([^<]+)<\/span>/)?.[1]?.trim()||"화법과 작문";
  const group=tag.split("·")[0].trim();
  items.push({slug,title,tag,group});
}
const order=["개념 학습","화법","작문","통합","실전 학습"];
const groups=new Map(order.map(x=>[x,[]]));
for(const x of items){if(!groups.has(x.group)) groups.set(x.group,[]);groups.get(x.group).push(x);}
const sections=[...groups.entries()].filter(([,xs])=>xs.length).map(([g,xs])=>`<section class="group"><h2>${esc(g)} <small>(${xs.length}개)</small></h2><div class="grid">${xs.map(x=>`<a class="card" data-key="${esc(x.title+" "+x.tag)}" href="https://modukorean.co.kr/${x.slug}/"><small>${esc(x.tag)}</small><strong>${esc(x.title)}</strong></a>`).join("")}</div></section>`).join("");
const oldFile=path.join(CONTENT,"2027-suteuk-hwajak-index.html");
const old=fs.existsSync(oldFile)?fs.readFileSync(oldFile,"utf8"):"";
const pageId=meta(old,"post_id");
const out=`<!-- title: 2027 수능특강 화법과 작문 해설 및 변형문제 -->
<!-- slug: 2027-수능특강-화법과-작문-화작-전체-해설-및-변형-문제 -->
<!-- status: publish -->
<!-- type: page -->
${pageId?`<!-- post_id: ${pageId} -->\n`:""}<!-- excerpt: 2027 수능특강 화법과 작문에서 전면 검수·재작성 완료된 자료만 공개하는 통합 목록입니다. 수정 이전 자료는 목록에서 제외하고 검수 완료 자료를 순차적으로 추가합니다. -->
<style>.hi{max-width:1100px;margin:auto;line-height:1.7;color:#222}.hero{padding:30px;background:#f3f8fc;border-radius:18px}.hero h1{margin:0 0 10px;color:#174f78}.notice{padding:16px 18px;margin:18px 0;background:#fff6e5;border-left:4px solid #e78722}.search{width:100%;box-sizing:border-box;margin:20px 0;padding:14px;border:2px solid #72a5ca;border-radius:10px;font-size:17px}.group{margin:34px 0}.group h2{color:#174f78;border-bottom:3px solid #79a8ca;padding-bottom:8px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:13px}.card{display:block;padding:16px;border:1px solid #ccd9e2;border-radius:12px;background:#fff;color:#222!important;text-decoration:none}.card small{display:block;color:#557080}.card strong{display:block;margin-top:5px}.none{display:none;text-align:center;padding:30px}</style>
<main class="hi"><header class="hero"><h1>2027 수능특강 화법과 작문</h1><p>현재 전면 검수·재작성과 실제 공개 확인이 끝난 자료만 제공합니다. 수정 이전 자료와 미검수 자료는 공개 목록에서 제외하고, 완료되는 순서대로 새 자료를 추가합니다.</p></header><div class="notice"><strong>현재 공개:</strong> ${items.length}개 자료 · 상세 요약 · 클릭형 빈칸 · 출제 포인트 · EBS 문항 상세 해설 · 수능형 변형문제와 선택지별 해설</div><input id="hs" class="search" type="search" placeholder="제재명·강·유형 검색" aria-label="화법과 작문 자료 검색">${sections}<p id="none" class="none">검색 결과가 없습니다.</p></main>
<script>const input=document.getElementById("hs"),cards=[...document.querySelectorAll(".card")],none=document.getElementById("none");input.addEventListener("input",()=>{const q=input.value.trim().toLowerCase();let n=0;cards.forEach(c=>{const show=!q||c.dataset.key.toLowerCase().includes(q);c.style.display=show?"block":"none";if(show)n++;});none.style.display=n?"none":"block";});</script>`;
fs.writeFileSync(oldFile,out,"utf8");
console.log("REVISED_INDEX",items.length,[...revised].sort().join(","));
