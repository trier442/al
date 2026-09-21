import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

const required=["WP_URL","WP_USERNAME","WP_APP_PASSWORD"];
for(const k of required){if(!process.env[k]) throw new Error(k+" missing");}
const base=process.env.WP_URL.replace(/\/$/,"");
const auth="Basic "+Buffer.from(process.env.WP_USERNAME+":"+process.env.WP_APP_PASSWORD.replace(/\s/g,"")).toString("base64");
const CATEGORY_ID=26;
const INDEX_SLUG="2027-수능특강-화법과-작문-화작-전체-해설-및-변형-문제";
const INDEX_TITLE="[2027 수능특강 화법과 작문] 전체 해설 및 변형문제";

async function wp(url, options={}){
  let last;
  for(let attempt=1;attempt<=6;attempt++){
    try{
      const r=await fetch(url,{
        ...options,
        signal:AbortSignal.timeout(50000),
        headers:{Authorization:auth,"Content-Type":"application/json; charset=utf-8","Connection":"close",...(options.headers||{})}
      });
      const t=await r.text();
      let d={}; try{d=t?JSON.parse(t):{};}catch{d={raw:t.slice(0,1200)}}
      if(!r.ok){const e=new Error(`${r.status} ${d?.code||""} ${d?.message||t.slice(0,500)}`);e.status=r.status;throw e;}
      return d;
    }catch(e){
      last=e;
      if(Number(e?.status)>=400&&Number(e?.status)<500&&Number(e?.status)!==408&&Number(e?.status)!==429) throw e;
      if(attempt<6) await new Promise(r=>setTimeout(r,1200*attempt));
    }
  }
  throw last;
}
async function list(route){
  const out=[]; let page=1;
  while(true){
    const sep=route.includes("?")?"&":"?";
    const rows=await wp(base+"/wp-json"+route+sep+"per_page=100&page="+page);
    if(!Array.isArray(rows)||!rows.length) break;
    out.push(...rows);
    if(rows.length<100) break;
    if(++page>30) break;
  }
  return out;
}
function plain(v=""){return String(v).replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&#8211;|&#8212;/g,"-").replace(/\s+/g," ").trim();}
function parseFile(file){
  const raw=fs.readFileSync(file,"utf8");
  const meta={};
  const pattern=/<!--\s*(title|slug|status|type|categories|revision|excerpt|featured_image|post_id)\s*:\s*(.*?)\s*-->/g;
  let m; while((m=pattern.exec(raw))) meta[m[1]]=m[2].trim();
  return {
    file,
    title:meta.title||"",
    slug:meta.slug||path.basename(file,".html"),
    excerpt:meta.excerpt||"",
    categories:(meta.categories||String(CATEGORY_ID)).split(",").map(s=>Number(s.trim())).filter(n=>Number.isInteger(n)&&n>0),
    content:raw.replace(pattern,"").trim()
  };
}
async function pluginStatus(plugin,status){
  return await wp(base+"/wp-json/wp/v2/plugins/"+plugin,{method:"POST",body:JSON.stringify({status})});
}
async function front(url){
  try{
    const r=await fetch(url,{redirect:"follow",headers:{"User-Agent":"Mozilla/5.0","Connection":"close"},signal:AbortSignal.timeout(30000)});
    return {status:r.status,url:r.url};
  }catch(e){return {status:0,error:e.message};}
}
async function trashPost(id){
  try{
    const r=await wp(base+"/wp-json/wp/v2/posts/"+id,{method:"DELETE"});
    console.log("TRASHED",id,r?.previous?.slug||r?.slug||"");
  }catch(e){
    if(e.status===410||e.status===404) return;
    throw e;
  }
}
async function updatePost(id,body){
  return await wp(base+"/wp-json/wp/v2/posts/"+id,{method:"POST",body:JSON.stringify(body)});
}
async function createPost(body){
  return await wp(base+"/wp-json/wp/v2/posts",{method:"POST",body:JSON.stringify(body)});
}

const patchNames=fs.readdirSync(path.join("scripts","hwajak-single"))
  .filter(n=>/^2027-suteuk-hwajak-(?:s\d\da|s\d\db|w\d\da|w\d\db)\.mjs$/.test(n))
  .map(n=>n.replace(/\.mjs$/,""));
const revisedSlugs=new Set(patchNames);
if(fs.existsSync(path.join("scripts","hwajak-overrides","2027-suteuk-hwajak-s01a.html"))) revisedSlugs.add("2027-suteuk-hwajak-s01a");

const pages=[...revisedSlugs].sort().map(slug=>{
  const file=path.join("wordpress-content",slug+".html");
  if(!fs.existsSync(file)) throw new Error("revised source missing: "+file);
  return parseFile(file);
});

console.log("REVISED_SET",JSON.stringify(pages.map(p=>({slug:p.slug,title:p.title}))));

const pluginIds=[
  "modu-hwajak-unit-editor/modu-hwajak-unit-editor",
  "modu-hwajak-quality-rebuilder/modu-hwajak-quality-rebuilder"
];
const activeBefore=new Map();
for(const id of pluginIds){
  try{const x=await wp(base+"/wp-json/wp/v2/plugins/"+id);activeBefore.set(id,x.status==="active");}
  catch{activeBefore.set(id,false);}
}

let verified=[];
try{
  for(const id of pluginIds){
    if(activeBefore.get(id)){
      const x=await pluginStatus(id,"inactive");
      console.log("PLUGIN_TEMP",id,x.status);
    }
  }

  const posts=[];
  for(const status of ["publish","draft","pending","private","future"]){
    try{posts.push(...await list(`/wp/v2/posts?context=edit&status=${status}&categories=${CATEGORY_ID}&orderby=id&order=asc`));}
    catch(e){console.warn("LIST_FAIL",status,e.message);}
  }

  const byId=new Map(posts.map(p=>[p.id,p]));
  const keepIds=new Set();
  const safeBase=Date.parse("2026-09-20T00:00:00Z");

  for(let i=0;i<pages.length;i++){
    const p=pages[i];
    const exact=posts.filter(x=>x.slug===p.slug);
    const sameTitle=posts.filter(x=>plain(x.title?.rendered||x.title?.raw||"")===plain(p.title));
    const candidates=[...new Map([...exact,...sameTitle].map(x=>[x.id,x])).values()]
      .sort((a,b)=>(a.slug===p.slug?-1:0)-(b.slug===p.slug?-1:0)||a.id-b.id);
    let chosen=candidates.find(x=>x.slug===p.slug)||candidates[0]||null;

    const publishDate=new Date(safeBase+i*60000+9*60*60*1000).toISOString().slice(0,19);
    const body={
      title:p.title,
      content:p.content,
      excerpt:p.excerpt,
      categories:[CATEGORY_ID],
      status:"publish",
      slug:p.slug,
      date:publishDate
    };
    let result;
    if(chosen){
      result=await updatePost(chosen.id,body);
      console.log("PUBLISHED_UPDATE",result.id,result.slug);
    }else{
      result=await createPost(body);
      console.log("PUBLISHED_CREATE",result.id,result.slug);
      posts.push(result); byId.set(result.id,result);
    }
    keepIds.add(result.id);

    for(const x of candidates){
      if(x.id===result.id) continue;
      await trashPost(x.id);
      byId.delete(x.id);
    }
  }

  const currentPosts=[];
  for(const status of ["publish","draft","pending","private","future"]){
    try{currentPosts.push(...await list(`/wp/v2/posts?context=edit&status=${status}&categories=${CATEGORY_ID}&orderby=id&order=asc`));}
    catch(e){console.warn("RELIST_FAIL",status,e.message);}
  }

  const cards=(kind)=>pages.filter(p=>p.slug.includes(`-${kind}`)).sort((a,b)=>a.slug.localeCompare(b.slug)).map(p=>
    `<li><a href="${base}/${encodeURI(p.slug)}/"><strong>${p.title.replace(/^\[[^\]]+\]\s*/,"").replace(/\s*해설\s*및\s*변형문제\s*$/,"")}</strong></a></li>`
  ).join("\n");
  const indexContent=`<article class="hw-index" style="max-width:980px;margin:auto;line-height:1.8;font-family:system-ui,-apple-system,'Noto Sans KR',sans-serif">
<h1>2027 수능특강 화법과 작문 해설 및 변형문제</h1>
<p>기존 저품질·중복 게시물은 공개 목록에서 제외하고, EBS 원문과 정답·해설을 다시 대조하여 검수한 자료만 순차적으로 공개합니다. 아래 목록은 현재 새로 제작·검수하여 공개 완료한 자료입니다.</p>
<h2>화법</h2><ol>${cards("s")}</ol>
<h2>작문</h2><ol>${cards("w")}</ol>
<p><strong>업데이트 원칙:</strong> 각 자료는 원문 없이도 이해할 수 있는 상세 요약, 클릭형 핵심 빈칸, 출제 포인트, EBS 문항별 해설, 오답 함정, 수능형 변형문제와 선택지별 해설을 포함합니다. 아직 재검수가 끝나지 않은 단원은 공개하지 않고 완료되는 즉시 이 목록에 추가합니다.</p>
</article>`;

  let indexCandidates=currentPosts.filter(x=>x.slug===INDEX_SLUG || plain(x.title?.rendered||"")===INDEX_TITLE);
  let index=indexCandidates.find(x=>x.slug===INDEX_SLUG)||indexCandidates[0]||null;
  const indexBody={title:INDEX_TITLE,slug:INDEX_SLUG,status:"publish",categories:[CATEGORY_ID],content:indexContent,excerpt:"2027 수능특강 화법과 작문에서 새로 검수·제작한 화법·작문 자료만 모아 보는 통합 목록입니다.",date:"2026-09-20T10:00:00"};
  if(index){
    index=await updatePost(index.id,indexBody);
    console.log("INDEX_UPDATED",index.id,index.slug,index.link);
  }else{
    index=await createPost(indexBody);
    console.log("INDEX_CREATED",index.id,index.slug,index.link);
  }
  keepIds.add(index.id);

  for(const x of currentPosts){
    if(keepIds.has(x.id)) continue;
    await trashPost(x.id);
  }

  // Ensure the primary/header menu has a single child link under 고3 / N수.
  try{
    const menus=await wp(base+"/wp-json/wp/v2/menus?per_page=100&context=edit");
    const items=await wp(base+"/wp-json/wp/v2/menu-items?per_page=100&context=edit&orderby=menu_order&order=asc");
    const locations=await wp(base+"/wp-json/wp/v2/menu-locations?context=edit");
    const menuIds=(item)=>Array.isArray(item.menus)?item.menus.map(Number):[Number(item.menus||0)].filter(Boolean);
    let primaryId=0;
    for(const [name,value] of Object.entries(locations||{})){
      if(/primary|header|main/i.test(name)){primaryId=Number(value?.menu??value?.id??value)||0;if(primaryId)break;}
    }
    if(!primaryId && Array.isArray(menus)&&menus[0]) primaryId=Number(menus[0].id);
    if(primaryId){
      const active=items.filter(i=>menuIds(i).includes(primaryId));
      const g3=active.find(i=>Number(i.parent||0)===0 && /고3\s*\/\s*N수|고3.*N수/i.test(plain(i.title?.raw||i.title?.rendered||"")));
      if(g3){
        const aliases=["2027 수능특강 화법과 작문","2027 수능특강 화작"];
        const matches=active.filter(i=>aliases.includes(plain(i.title?.raw||i.title?.rendered||"")));
        let keeper=matches.find(i=>Number(i.parent)===Number(g3.id))||matches[0]||null;
        const payload={status:"publish",menus:primaryId,parent:Number(g3.id),title:"2027 수능특강 화법과 작문",type:"custom",url:index.link};
        if(keeper){
          keeper=await wp(base+"/wp-json/wp/v2/menu-items/"+keeper.id,{method:"POST",body:JSON.stringify(payload)});
          console.log("MENU_UPDATED",keeper.id,keeper.title?.raw||keeper.title?.rendered||"");
        }else{
          keeper=await wp(base+"/wp-json/wp/v2/menu-items",{method:"POST",body:JSON.stringify(payload)});
          console.log("MENU_CREATED",keeper.id);
        }
        for(const m of matches){if(m.id!==keeper.id){await wp(base+"/wp-json/wp/v2/menu-items/"+m.id+"?force=true",{method:"DELETE"});console.log("MENU_DUP_DELETED",m.id);}}
      }
    }
  }catch(e){console.warn("MENU_SYNC_WARN",e.message);}

  for(const p of pages){
    const rows=await wp(base+`/wp-json/wp/v2/posts?context=edit&slug=${encodeURIComponent(p.slug)}&status=publish&per_page=10`);
    const item=Array.isArray(rows)?rows[0]:null;
    if(!item) throw new Error("published canonical missing: "+p.slug);
    const f=await front(item.link);
    if(!(f.status>=200&&f.status<400)) throw new Error("front failed "+p.slug+" "+JSON.stringify(f));
    verified.push({id:item.id,slug:item.slug,front:f.status,link:item.link});
  }
  const indexFront=await front(index.link);
  if(!(indexFront.status>=200&&indexFront.status<400)) throw new Error("index front failed "+JSON.stringify(indexFront));

  const categoryPublished=await list(`/wp/v2/posts?context=edit&status=publish&categories=${CATEGORY_ID}&orderby=id&order=asc`);
  const extras=categoryPublished.filter(x=>!keepIds.has(x.id));
  if(extras.length) throw new Error("unexpected published category 26 posts remain: "+JSON.stringify(extras.map(x=>({id:x.id,slug:x.slug,title:plain(x.title?.rendered||"")}))));

  console.log("SYNC_SUMMARY",JSON.stringify({revised:pages.length,published:verified.length,index:{id:index.id,slug:index.slug,link:index.link,front:indexFront.status},categoryPublished:categoryPublished.length}));
  console.log("SYNC_VERIFIED",JSON.stringify(verified));
  console.log("SYNC_REVISED_HWAJAK_OK");
} finally {
  for(const id of pluginIds){
    if(activeBefore.get(id)){
      try{const x=await pluginStatus(id,"active");console.log("PLUGIN_RESTORED",id,x.status);}
      catch(e){console.error("PLUGIN_RESTORE_FAIL",id,e.message);}
    }
  }
}
