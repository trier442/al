const required=['WP_URL','WP_USERNAME','WP_APP_PASSWORD'];
for(const key of required)if(!process.env[key])throw new Error(`${key} GitHub Secret이 없습니다.`);
const BASE=process.env.WP_URL.replace(/\/$/,'');
const AUTH='Basic '+Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD.replace(/\s/g,'')}`).toString('base64');
const ID=836;
async function request(url,options={},authenticated=true){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20000);
  try{
    const response=await fetch(url,{...options,signal:controller.signal,headers:{...(authenticated?{Authorization:AUTH}:{}),'cache-control':'no-cache',pragma:'no-cache',...(options.headers||{})}});
    const text=await response.text();
    let data;try{data=text?JSON.parse(text):{};}catch{data={message:text};}
    return {response,text,data};
  }finally{clearTimeout(timer);}
}
const before=await request(`${BASE}/wp-json/wp/v2/pages/${ID}?context=edit&_fields=id,slug,status,title,link`);
if(!before.response.ok)throw new Error(`통합 목록 ${ID} 조회 실패: ${before.response.status} ${before.data?.message||before.text}`);
const title=String(before.data?.title?.rendered||'');
if(before.data?.id!==ID||!title.includes('언어와 매체'))throw new Error(`페이지 ${ID}가 언어와 매체 통합 목록이 아닙니다: ${title}`);
const updated=await request(`${BASE}/wp-json/wp/v2/pages/${ID}`,{method:'POST',headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify({status:'draft'})});
if(!updated.response.ok||updated.data?.status!=='draft')throw new Error(`통합 목록 draft 전환 실패: ${updated.response.status} ${updated.data?.status||updated.data?.message}`);
const edit=await request(`${BASE}/wp-json/wp/v2/pages/${ID}?context=edit&_fields=id,slug,status,title,modified_gmt,link`);
if(!edit.response.ok||edit.data?.status!=='draft')throw new Error(`통합 목록 인증 검증 실패: ${edit.response.status} ${edit.data?.status}`);
const anon=await request(`${BASE}/wp-json/wp/v2/pages/${ID}?_fields=id,slug,status&_hide=${Date.now()}`,{},false);
if(anon.response.status!==404)throw new Error(`통합 목록 비인증 REST 상태가 404가 아닙니다: ${anon.response.status}`);
const slugs=[before.data.slug,'2027-수능특강-언어와-매체-전체-해설-및-변형-문제'];
const publicChecks=[];
for(const slug of [...new Set(slugs.filter(Boolean))]){
  const page=await request(`${BASE}/${encodeURI(slug)}/?_hide=${Date.now()}`,{},false);
  const visible=page.response.status===200&&(/class="eix"|2027 수능특강 언어와 매체 원문형 통합 목록/.test(page.text));
  publicChecks.push({slug,http_status:page.response.status,content_visible:visible});
  if(visible)throw new Error(`통합 목록 공개 URL이 본문을 노출합니다: ${slug}`);
}
console.log(JSON.stringify({id:ID,title,slug:before.data.slug,status:'draft',anonymous_rest_status:anon.response.status,publicChecks,modified_gmt:edit.data.modified_gmt},null,2));
