import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const FILE=path.join(ROOT,'wordpress-content','2027-suteuk-eonmae-c01.html');
const BASE=(process.env.WP_URL||'https://modukorean.co.kr').replace(/\/$/,'');
const LIVE=process.argv.includes('--live');
const errors=[];

function count(source,re){return [...String(source).matchAll(re)].length;}
function plain(source=''){
  return String(source)
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
}
function meta(html,key){return html.match(new RegExp(`<!--\\s*${key}:\\s*([^\\n]*?)\\s*-->`,'i'))?.[1]?.trim()||'';}
function requireText(text,phrases,label){for(const phrase of phrases)if(!text.includes(phrase))errors.push(`${label}: 필수 문구 누락 - ${phrase}`);}

if(!fs.existsSync(FILE)){
  console.error('C01 원고 파일을 찾지 못했습니다.');
  process.exit(1);
}

const html=fs.readFileSync(FILE,'utf8');
const text=plain(html);

if(meta(html,'slug')!=='2027-suteuk-eonmae-c01')errors.push('slug 메타데이터 불일치');
if(meta(html,'status')!=='publish')errors.push('status가 publish가 아님');
if(meta(html,'type')!=='page')errors.push('type이 page가 아님');
if(!html.includes('data-manual-page="c01"'))errors.push('수동 완성본 표식 누락');
if(!html.includes('data-manual-version="2026-07-23-v1"'))errors.push('수동 완성본 버전 표식 누락');

const checks=[
  ['개념 설명 구역',count(html,/class="concept-section"/g),9],
  ['전체 문항',count(html,/class="question /g),36],
  ['단답형 문항',count(html,/data-kind="단답형"/g),20],
  ['서답형 문항',count(html,/data-kind="서답형"/g),3],
  ['선택형 문항',count(html,/class="question mcq"/g),13],
  ['선택지',count(html,/class="choice"/g),65],
  ['정답·해설 패널',count(html,/class="answer-panel"/g),36]
];
for(const [label,actual,expected] of checks)if(actual!==expected)errors.push(`${label}: ${actual}개(기대 ${expected}개)`);

for(let i=1;i<=36;i++){
  if(!new RegExp(`data-q="${i}"`).test(html))errors.push(`${i}번 문항 표식 누락`);
}
requireText(text,[
  '언어와 매체는 어떻게 다른가',
  '전통적 매체와 뉴 미디어의 차이는 ‘상대적’이다',
  '매체 언어와 복합 양식성',
  '일상으로 파고든 ‘디지털 휴먼’, 남아 있는 과제는?',
  '검색 결과를 최신순과 인기순으로 바꾸어',
  '공유한 게시물',
  '좋아요 수는 호감이나 관심의 정도를 보여 줄 뿐',
  '정답 한눈에 보기'
],'C01');

if(text.length<15000)errors.push(`본문 분량 부족: ${text.length}자`);

function finish(){
  if(errors.length){
    console.error(`C01 검증 실패 ${errors.length}건`);
    for(const e of errors)console.error(`- ${e}`);
    process.exit(1);
  }
  console.log('C01 검수 완료본 검증 통과');
  console.log(`- 본문 ${text.length}자 / 문항 36개 / 선택지 65개`);
}

async function get(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),30000);
  try{
    const res=await fetch(url,{signal:controller.signal,headers:{'user-agent':'modukorean-c01-verifier/2.0','cache-control':'no-cache','pragma':'no-cache'}});
    if(!res.ok)throw new Error(`${res.status} ${res.statusText}: ${url}`);
    return await res.text();
  }finally{clearTimeout(timer);}
}

finish();

if(LIVE){
  const stamp=Date.now();
  const liveErrors=[];
  try{
    const restText=await get(`${BASE}/wp-json/wp/v2/pages?slug=2027-suteuk-eonmae-c01&_fields=id,slug,content,link&_deploy=${stamp}`);
    const data=JSON.parse(restText);
    if(!Array.isArray(data)||data.length!==1)throw new Error(`REST 결과 ${Array.isArray(data)?data.length:'비배열'}개`);
    const rendered=String(data[0]?.content?.rendered||'');
    if(!rendered.includes('data-manual-version="2026-07-23-v1"'))throw new Error('REST 본문 버전 표식 없음');
    if(count(rendered,/class="question /g)!==36)throw new Error('REST 본문 문항 수가 36개가 아님');
  }catch(error){liveErrors.push(`REST: ${error?.message||error}`);}
  try{
    const publicHtml=await get(`${BASE}/2027-suteuk-eonmae-c01/?_deploy=${stamp}`);
    if(!publicHtml.includes('data-manual-version="2026-07-23-v1"'))throw new Error('공개 페이지 버전 표식 없음');
    if(count(publicHtml,/class="question /g)!==36)throw new Error('공개 페이지 문항 수가 36개가 아님');
  }catch(error){liveErrors.push(`공개 페이지: ${error?.message||error}`);}
  if(liveErrors.length){
    console.error(`C01 실서비스 검증 실패 ${liveErrors.length}건`);
    for(const e of liveErrors)console.error(`- ${e}`);
    process.exit(1);
  }
  console.log('C01 실서비스 검증 통과');
}
