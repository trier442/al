import fs from 'node:fs';
import path from 'node:path';

const required=['WP_URL','WP_USERNAME','WP_APP_PASSWORD'];
for(const key of required)if(!process.env[key])throw new Error(`${key} GitHub Secret이 없습니다.`);

const ROOT=process.cwd();
const DIR=path.join(ROOT,'wordpress-content');
const REPORT=path.join(ROOT,'scripts','eonmae-hidden-verification.json');
const BASE=process.env.WP_URL.replace(/\/$/,'');
const AUTH='Basic '+Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD.replace(/\s/g,'')}`).toString('base64');
const files=fs.readdirSync(DIR)
  .filter(name=>/^2027-suteuk-eonmae-(?:index|(?:c|l|m|i|p)\d{2})\.html$/.test(name))
  .sort();

if(files.length!==43)throw new Error(`언어와 매체 비공개 대상은 43개여야 하지만 ${files.length}개입니다.`);

function meta(raw,key){return raw.match(new RegExp(`<!--\\s*${key}:\\s*([^\\n]*?)\\s*-->`,'i'))?.[1]?.trim()||'';}
function parseFile(name){
  const raw=fs.readFileSync(path.join(DIR,name),'utf8');
  const slug=meta(raw,'slug');
  const title=meta(raw,'title');
  const type=meta(raw,'type')==='post'?'posts':'pages';
  const postId=Number(meta(raw,'post_id'))||0;
  if(!slug||!title)throw new Error(`${name}: title 또는 slug 메타데이터가 없습니다.`);
  return {name,slug,title,type,postId};
}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

async function request(url,options={},authenticated=true){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),30000);
  try{
    const response=await fetch(url,{
      ...options,
      signal:controller.signal,
      headers:{
        ...(authenticated?{Authorization:AUTH}:{}),
        'cache-control':'no-cache',
        pragma:'no-cache',
        ...(options.headers||{})
      }
    });
    const text=await response.text();
    let data;
    try{data=text?JSON.parse(text):{};}catch{data={message:text};}
    if(!response.ok)throw new Error(`WordPress ${response.status}: ${data?.message||text||url}`);
    return {response,text,data};
  }finally{clearTimeout(timer);}
}

const targets=files.map(parseFile);
const hidden=[];
const errors=[];

for(const target of targets){
  try{
    let id=target.postId;
    if(!id){
      const lookup=await request(`${BASE}/wp-json/wp/v2/${target.type}?slug=${encodeURIComponent(target.slug)}&context=edit&status=any&per_page=100&_fields=id,slug,status,link`);
      const exact=Array.isArray(lookup.data)?lookup.data.filter(item=>item.slug===target.slug):[];
      if(exact.length!==1)throw new Error(`편집 REST에서 동일 slug 항목을 ${exact.length}개 찾았습니다.`);
      id=exact[0].id;
    }
    const update=await request(`${BASE}/wp-json/wp/v2/${target.type}/${id}`,{
      method:'POST',
      headers:{'content-type':'application/json; charset=utf-8'},
      body:JSON.stringify({status:'draft'})
    });
    if(update.data?.status!=='draft')throw new Error(`상태가 draft로 바뀌지 않았습니다: ${update.data?.status}`);
    hidden.push({...target,id,modified_gmt:update.data?.modified_gmt||'',link:update.data?.link||''});
    console.log(`비공개 전환: ${target.slug} (#${id})`);
  }catch(error){
    const message=String(error?.message||error);
    errors.push({slug:target.slug,stage:'unpublish',error:message});
    console.error(`비공개 전환 실패: ${target.slug}: ${message}`);
  }
}

for(const item of hidden){
  try{
    const edit=await request(`${BASE}/wp-json/wp/v2/${item.type}/${item.id}?context=edit&_fields=id,slug,status,modified_gmt,link`);
    if(edit.data?.status!=='draft')throw new Error(`인증 REST 상태가 ${edit.data?.status}입니다.`);

    const anon=await request(`${BASE}/wp-json/wp/v2/${item.type}?slug=${encodeURIComponent(item.slug)}&_fields=id,slug,status&_hide=${Date.now()}`,{},false);
    if(!Array.isArray(anon.data)||anon.data.length!==0)throw new Error(`비인증 REST에 ${Array.isArray(anon.data)?anon.data.length:'비배열'}개가 노출됩니다.`);

    let publicStatus=0;
    let stale=false;
    for(let attempt=1;attempt<=4;attempt++){
      const page=await fetch(`${BASE}/${encodeURI(item.slug)}/?_hide=${Date.now()}-${attempt}`,{
        redirect:'manual',
        headers:{'user-agent':'modukorean-eonmae-hide-verifier/1.0','cache-control':'no-cache',pragma:'no-cache'}
      });
      const body=await page.text();
      publicStatus=page.status;
      stale=page.status===200&&(/data-summary-chars=|data-manual-page="c01"|class="eix"|class="emx"/.test(body));
      if(!stale)break;
      await sleep(2000*attempt);
    }
    if(stale)throw new Error(`공개 URL이 HTTP ${publicStatus}로 기존 본문을 계속 노출합니다.`);
    item.verified_status='draft';
    item.anonymous_rest_items=0;
    item.public_http_status=publicStatus;
    item.public_content_hidden=true;
    console.log(`비공개 확인: ${item.slug} / 공개 HTTP ${publicStatus}`);
  }catch(error){
    const message=String(error?.message||error);
    errors.push({slug:item.slug,stage:'verify',error:message});
    console.error(`비공개 검증 실패: ${item.slug}: ${message}`);
  }
}

const report={
  checked_at:new Date().toISOString(),
  base_url:BASE,
  requested_items:targets.length,
  draft_items:hidden.filter(item=>item.verified_status==='draft').length,
  anonymous_rest_visible_items:hidden.filter(item=>item.anonymous_rest_items>0).length,
  public_content_visible_items:hidden.filter(item=>item.public_content_hidden===false).length,
  status:errors.length?'failure':'success',
  errors,
  items:hidden
};
fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n','utf8');

if(errors.length){
  console.error(`언어와 매체 전체 비공개 처리 실패 ${errors.length}건`);
  process.exit(1);
}
if(report.draft_items!==43)throw new Error(`draft 확인 수가 43개가 아니라 ${report.draft_items}개입니다.`);
console.log('언어와 매체 개별 글 42개와 통합 목록 1개 비공개 처리 완료');
