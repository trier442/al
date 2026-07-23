import fs from 'node:fs';
import path from 'node:path';

const required=['WP_URL','WP_USERNAME','WP_APP_PASSWORD'];
for(const key of required)if(!process.env[key])throw new Error(`${key} GitHub Secret이 없습니다.`);

const ROOT=process.cwd();
const DIR=path.join(ROOT,'wordpress-content');
const VISIBILITY=JSON.parse(fs.readFileSync(path.join(ROOT,'scripts','eonmae-visibility.json'),'utf8'));
const REPORT=path.join(ROOT,'scripts','eonmae-sequential-verification.json');
const BASE=process.env.WP_URL.replace(/\/$/,'');
const AUTH='Basic '+Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD.replace(/\s/g,'')}`).toString('base64');
const approved=new Set(Array.isArray(VISIBILITY.public_files)?VISIBILITY.public_files:[]);
const files=fs.readdirSync(DIR)
  .filter(name=>/^2027-suteuk-eonmae-(?:index|(?:c|l|m|i|p)\d{2})\.html$/.test(name))
  .sort();

if(VISIBILITY.mode!=='sequential')throw new Error('순차 공개 설정이 아닙니다.');
if(files.length!==43)throw new Error(`언어와 매체 대상은 43개여야 하지만 ${files.length}개입니다.`);
if(approved.size!==VISIBILITY.expected_public_items)throw new Error('승인 파일 수와 expected_public_items가 다릅니다.');

function meta(raw,key){return raw.match(new RegExp(`<!--\\s*${key}:\\s*([^\\n]*?)\\s*-->`,'i'))?.[1]?.trim()||'';}
function parseFile(name){
  const raw=fs.readFileSync(path.join(DIR,name),'utf8');
  const slug=meta(raw,'slug');
  const title=meta(raw,'title');
  const type=meta(raw,'type')==='post'?'posts':'pages';
  const postId=Number(meta(raw,'post_id'))||0;
  if(!slug||!title)throw new Error(`${name}: title 또는 slug 메타데이터가 없습니다.`);
  return {name,slug,title,type,postId,desired:approved.has(name)?'publish':'draft'};
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
    return data;
  }finally{clearTimeout(timer);}
}

const updatedItems=[];
const errors=[];
for(const target of files.map(parseFile)){
  try{
    let id=target.postId;
    if(!id){
      const lookup=await request(`${BASE}/wp-json/wp/v2/${target.type}?slug=${encodeURIComponent(target.slug)}&context=edit&status=any&per_page=100&_fields=id,slug,status,link`);
      const exact=Array.isArray(lookup)?lookup.filter(item=>item.slug===target.slug):[];
      if(exact.length!==1)throw new Error(`편집 REST에서 동일 slug 항목을 ${exact.length}개 찾았습니다.`);
      id=exact[0].id;
    }
    const updated=await request(`${BASE}/wp-json/wp/v2/${target.type}/${id}`,{
      method:'POST',
      headers:{'content-type':'application/json; charset=utf-8'},
      body:JSON.stringify({status:target.desired})
    });
    if(updated?.status!==target.desired)throw new Error(`상태가 ${target.desired}(으)로 바뀌지 않았습니다: ${updated?.status}`);
    updatedItems.push({...target,id,status:updated.status,link:updated.link||''});
    console.log(`${target.desired==='publish'?'공개 설정':'비공개 설정'}: ${target.slug} (#${id})`);
  }catch(error){
    const message=String(error?.message||error);
    errors.push({name:target.name,slug:target.slug,desired:target.desired,stage:'update',error:message});
    console.error(`상태 변경 실패: ${target.slug}: ${message}`);
  }
}

const verifiedItems=[];
for(const item of updatedItems){
  try{
    const edit=await request(`${BASE}/wp-json/wp/v2/${item.type}/${item.id}?context=edit&_fields=id,slug,status,modified_gmt,link`);
    if(edit?.status!==item.desired)throw new Error(`인증 REST 상태가 ${edit?.status}입니다.`);

    let anonCount=-1;
    for(let attempt=1;attempt<=5;attempt++){
      const anon=await request(`${BASE}/wp-json/wp/v2/${item.type}?slug=${encodeURIComponent(item.slug)}&_fields=id,slug,status&_sync=${Date.now()}-${attempt}`,{},false);
      anonCount=Array.isArray(anon)?anon.length:-1;
      const expected=item.desired==='publish'?1:0;
      if(anonCount===expected)break;
      if(attempt<5)await sleep(1000*attempt);
    }
    if(item.desired==='publish'&&anonCount!==1)throw new Error(`공개 승인 항목의 비인증 REST 결과가 ${anonCount}개입니다.`);
    if(item.desired==='draft'&&anonCount!==0)throw new Error(`비공개 항목이 비인증 REST에 ${anonCount}개 노출됩니다.`);

    verifiedItems.push({...item,modified_gmt:edit.modified_gmt||'',anonymous_rest_items:anonCount});
    console.log(`${item.desired==='publish'?'공개 확인':'비공개 확인'}: ${item.slug}`);
  }catch(error){
    const message=String(error?.message||error);
    errors.push({name:item.name,slug:item.slug,desired:item.desired,stage:'verify',error:message});
    console.error(`상태 검증 실패: ${item.slug}: ${message}`);
  }
}

const report={
  checked_at:new Date().toISOString(),
  base_url:BASE,
  mode:VISIBILITY.mode,
  requested_items:files.length,
  approved_items:verifiedItems.filter(item=>item.status==='publish').length,
  hidden_items:verifiedItems.filter(item=>item.status==='draft').length,
  status:errors.length?'failure':'success',
  errors,
  items:verifiedItems
};
fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n','utf8');

if(errors.length){
  console.error(`언어와 매체 순차 공개 상태 동기화 실패 ${errors.length}건`);
  process.exit(1);
}
if(report.approved_items!==VISIBILITY.expected_public_items)throw new Error(`공개 항목이 ${VISIBILITY.expected_public_items}개가 아니라 ${report.approved_items}개입니다.`);
if(report.hidden_items!==VISIBILITY.expected_hidden_items)throw new Error(`비공개 항목이 ${VISIBILITY.expected_hidden_items}개가 아니라 ${report.hidden_items}개입니다.`);
console.log(`언어와 매체 순차 공개 상태 동기화 완료: 공개 ${report.approved_items}개 / 비공개 ${report.hidden_items}개`);
