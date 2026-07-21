import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const DIR=path.join(ROOT,'wordpress-content');
const BASE=(process.env.WP_URL||'https://modukorean.co.kr').replace(/\/$/,'');
const files=fs.readdirSync(DIR)
  .filter(name=>/^2027-suteuk-eonmae-(?!index)(?:c|l|m|i|p)\d{2}\.html$/.test(name))
  .sort();

const required={
  '2027-suteuk-eonmae-c01':['자료를 분석할 때에는 생산 목적과 예상 수용자를 확인','자료에 없는 효과를 덧붙이지 않는다'],
  '2027-suteuk-eonmae-l03':['일정한 뜻이나 문법적 기능을 지닌 가장 작은 말의 단위','일부 접미사는 품사를 바꾸기도 한다'],
  '2027-suteuk-eonmae-l05':['서술어 자릿수는 문장에 겉으로 나타난 성분의 수가 아니라','문맥에서 필수 성분이 생략되어도 그 성분이 의미상 복원'],
  '2027-suteuk-eonmae-l10':['형태와 결합 위치, 앞말과 서술어의 관계, 문맥을 함께 고려','담화는 하나의 규칙이 적용되는 현상이 아니므로'],
  '2027-suteuk-eonmae-l14':['‘값이’는 연음 뒤 된소리되기가 이어져 [갑씨]','‘닭을’의 표준 발음은 [달글]'],
  '2027-suteuk-eonmae-i04':['개인 방송은 참여 링크를 제시','설문 응답자에게 게시판 주소를 보내'],
  '2027-suteuk-eonmae-i05':['자료에 제시되지 않은 평가 기준을 핵심 근거로 추가하지 말고','포스터의 QR 코드는 수용자가 관련 방송이나 추가 정보로 이동']
};
const forbidden={
  '2027-suteuk-eonmae-c01':['문항은 기본형이나 원자료를 먼저 확인','자의성의 예외는 규칙의 적용 범위를 정밀하게 한정'],
  '2027-suteuk-eonmae-l03':['더 나누었을 때 뜻이 사라지는 지점을 찾고','의존 형태소의 예외는 규칙의 적용 범위를 정밀하게 한정'],
  '2027-suteuk-eonmae-l10':['조사는 형태보다 기능을 기준으로 판정한다','‘담화’의 예외는 규칙의 적용 범위를 정밀하게 한정'],
  '2027-suteuk-eonmae-i04':['광고·협찬 여부','온라인 결제','개인 사례를 보편적 효과로'],
  '2027-suteuk-eonmae-i05':['에너지 소비','초기 비용','관리 난도','실험 조건이 다른 수치']
};

function decode(value=''){
  return String(value)
    .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#8216;|&#8217;/g,'‘')
    .replace(/&#8220;|&#8221;/g,'“').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
}
function localSummary(html){
  const block=html.match(/<section class="summary"[\s\S]*?<\/section>/i)?.[0]||'';
  return decode(block);
}
function fingerprint(summary){
  const clauses=summary.split(/(?<=[.!?다])\s+/).filter(s=>s.length>=35&&!s.includes('네모 빈칸'));
  const candidate=clauses.find(s=>!/정의는/.test(s))||clauses[0]||summary;
  return candidate.slice(0,Math.min(70,candidate.length)).trim();
}
async function get(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20000);
  try{
    const res=await fetch(url,{signal:controller.signal,headers:{'user-agent':'modukorean-eonmae-deploy-verifier/1.0','cache-control':'no-cache','pragma':'no-cache'}});
    if(!res.ok)throw new Error(`${res.status} ${res.statusText}: ${url}`);
    return {text:await res.text(),headers:Object.fromEntries(res.headers.entries())};
  }finally{
    clearTimeout(timer);
  }
}

const results=[];
const errors=[];
for(const file of files){
  const local=fs.readFileSync(path.join(DIR,file),'utf8');
  const slug=file.replace(/\.html$/,'');
  const summary=localSummary(local);
  const mark=fingerprint(summary);
  try{
    const restUrl=`${BASE}/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}&_fields=id,slug,modified_gmt,content,link&_deploy=${Date.now()}`;
    const rest=await get(restUrl);
    const data=JSON.parse(rest.text);
    if(!Array.isArray(data)||data.length!==1)throw new Error(`REST 결과 ${Array.isArray(data)?data.length:'비배열'}개`);
    const rendered=String(data[0]?.content?.rendered||'');
    const renderedPlain=decode(rendered);
    if(!rendered.includes('data-summary-chars='))throw new Error('REST 본문에 교정 템플릿 표식 없음');
    if((rendered.match(/class="q"/g)||[]).length!==10)throw new Error('REST 본문의 변형문제 수가 10개가 아님');
    if(mark&&!renderedPlain.includes(mark))throw new Error(`REST 본문 지문 불일치: ${mark}`);
    for(const phrase of required[slug]||[])if(!renderedPlain.includes(phrase))throw new Error(`필수 문구 누락: ${phrase}`);
    for(const phrase of forbidden[slug]||[])if(renderedPlain.includes(phrase))throw new Error(`삭제 문구 잔존: ${phrase}`);

    const pageUrl=`${BASE}/${slug}/?_deploy=${Date.now()}`;
    const page=await get(pageUrl);
    const pagePlain=decode(page.text);
    if(mark&&!pagePlain.includes(mark))throw new Error(`공개 페이지 지문 불일치: ${mark}`);
    for(const phrase of required[slug]||[])if(!pagePlain.includes(phrase))throw new Error(`공개 페이지 필수 문구 누락: ${phrase}`);
    for(const phrase of forbidden[slug]||[])if(pagePlain.includes(phrase))throw new Error(`공개 페이지 삭제 문구 잔존: ${phrase}`);
    results.push({slug,id:data[0].id,modified_gmt:data[0].modified_gmt,link:data[0].link,rest:true,public_page:true,questions:10,fingerprint:mark});
    console.log(`확인 완료: ${slug}`);
  }catch(error){
    errors.push({slug,error:String(error?.message||error)});
    console.error(`확인 실패: ${slug}: ${error?.message||error}`);
  }
}

const report={
  checked_at:new Date().toISOString(),
  base_url:BASE,
  expected_pages:42,
  verified_pages:results.length,
  rest_verified:results.filter(x=>x.rest).length,
  public_verified:results.filter(x=>x.public_page).length,
  total_questions:results.reduce((sum,x)=>sum+x.questions,0),
  status:errors.length?'failure':'success',
  errors,
  pages:results
};
fs.writeFileSync(path.join(ROOT,'scripts','eonmae-live-verification.json'),JSON.stringify(report,null,2)+'\n','utf8');
if(errors.length){
  console.error(`실서비스 검증 실패 ${errors.length}건`);
  process.exit(1);
}
console.log(`실서비스 검증 통과: REST ${report.rest_verified}/42, 공개 페이지 ${report.public_verified}/42, 문항 ${report.total_questions}개`);
