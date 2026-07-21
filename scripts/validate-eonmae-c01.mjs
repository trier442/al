import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const FILE=path.join(ROOT,'wordpress-content','2027-suteuk-eonmae-c01.html');
const REPORT=path.join(ROOT,'scripts','eonmae-c01-live-verification.json');
const BASE=(process.env.WP_URL||'https://modukorean.co.kr').replace(/\/$/,'');
const LIVE=process.argv.includes('--live');
const errors=[];

function count(source,re){return [...String(source).matchAll(re)].length;}
function plain(source=''){
  return String(source)
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#8216;|&#8217;/g,'‘')
    .replace(/&#8220;|&#8221;/g,'“').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
}
function meta(html,key){return html.match(new RegExp(`<!--\\s*${key}:\\s*([^\\n]*?)\\s*-->`,'i'))?.[1]?.trim()||'';}
function requireText(text,phrases,label){for(const phrase of phrases)if(!text.includes(phrase))errors.push(`${label}: 필수 문구 누락 - ${phrase}`);}
function forbidText(text,phrases,label){for(const phrase of phrases)if(text.includes(phrase))errors.push(`${label}: 삭제 대상 문구 잔존 - ${phrase}`);}

if(!fs.existsSync(FILE)){
  console.error('C01 원고 파일을 찾지 못했습니다.');
  process.exit(1);
}
const html=fs.readFileSync(FILE,'utf8');
const pageText=plain(html);

if(meta(html,'slug')!=='2027-suteuk-eonmae-c01')errors.push('slug 메타데이터 불일치');
if(meta(html,'status')!=='publish')errors.push('status가 publish가 아님');
if(meta(html,'type')!=='page')errors.push('type이 page가 아님');
if(!/data-manual-page="c01"/.test(html))errors.push('수동 완성본 표식 누락');
if(!/data-manual-version="2026-07-21-v1"/.test(html))errors.push('수동 완성본 버전 표식 누락');
if(!/class="[^"]*summary[^"]*"/.test(html))errors.push('상세 해설 요약 구역 누락');
if(pageText.length<13000)errors.push(`전체 해설·문항 분량 부족: ${pageText.length}자`);

const structuralChecks=[
  ['새 자료 세트',count(html,/class="[^"]*source-pair[^"]*"/g),5],
  ['원문 1번형 문항',count(html,/data-origin-type="선택형-복수진술"/g),5],
  ['원문 2번형 문항',count(html,/data-origin-type="빈칸-개념연결"/g),5],
  ['전체 문항',count(html,/<section class="[^"]*\bq\b[^"]*"/g),10],
  ['선택지',count(html,/<button[^>]*class="[^"]*\bchoice\b[^"]*"/g),50],
  ['선택지별 해설',count(html,/class="choice-exp (?:correct-exp|wrong-exp)"/g),50],
  ['심화 근거 해설',count(html,/class="deep"/g),10],
  ['출제 포인트',count(html,/<ol class="points">[\s\S]*?<\/ol>/g),1],
  ['개념 해설 카드',count(html,/class="concept"/g),8],
  ['오답 함정 카드',count(html,/class="trap"/g),6]
];
for(const [label,actual,expected] of structuralChecks)if(actual!==expected)errors.push(`${label}: ${actual}개(기대 ${expected}개)`);
const pointsBlock=html.match(/<ol class="points">([\s\S]*?)<\/ol>/)?.[1]||'';
if(count(pointsBlock,/<li>/g)!==10)errors.push(`출제 포인트 항목: ${count(pointsBlock,/<li>/g)}개`);

const questions=[...html.matchAll(/<section class="[^"]*\bq\b[^"]*"[^>]*data-answer="([1-5])"[^>]*data-q="(\d+)"[^>]*data-origin-type="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)];
if(questions.length!==10)errors.push(`문항 파싱 실패: ${questions.length}/10`);
const expectedAnswers=['2','2','4','1','3','2','2','1','3','2'];
const stems=new Set();
for(const [index,m] of questions.entries()){
  const answer=m[1],no=Number(m[2]),type=m[3],body=m[4];
  if(no!==index+1)errors.push(`${index+1}번째 문항의 data-q가 ${no}`);
  if(answer!==expectedAnswers[index])errors.push(`${no}번 정답 번호 ${answer}, 기대 ${expectedAnswers[index]}`);
  const stem=plain(body.match(/<h3>([\s\S]*?)<\/h3>/)?.[1]||'');
  if(!stem)errors.push(`${no}번 발문 누락`);
  if(stems.has(stem))errors.push(`${no}번 발문 중복`);stems.add(stem);
  const choices=[...body.matchAll(/<button[^>]*class="[^"]*\bchoice\b[^"]*"[^>]*>([\s\S]*?)<\/button>/g)].map(x=>plain(x[1]));
  const exps=[...body.matchAll(/<div class="[^"]*choice-exp[^"]*"[^>]*data-choice="([1-5])"[^>]*hidden[^>]*>([\s\S]*?)<\/div>/g)];
  if(choices.length!==5)errors.push(`${no}번 선택지 ${choices.length}개`);
  if(new Set(choices).size!==choices.length)errors.push(`${no}번 선택지 중복`);
  if(exps.length!==5)errors.push(`${no}번 선택지별 해설 ${exps.length}개`);
  const correct=body.match(/<div class="[^"]*choice-exp[^"]*correct-exp[^"]*"[^>]*data-choice="([1-5])"/i)?.[1];
  if(correct!==answer)errors.push(`${no}번 data-answer와 정답 해설 불일치`);
  if(type==='선택형-복수진술'){
    const statements=body.match(/<div class="statements">([\s\S]*?)<\/div>/)?.[1]||'';
    if(count(statements,/<p>/g)!==5)errors.push(`${no}번 ㉠~㉤ 진술 수 오류`);
    if(!/[㉠][\s\S]*[㉤]/.test(statements))errors.push(`${no}번 복수 진술 기호 누락`);
  }else if(type==='빈칸-개념연결'){
    const view=body.match(/<div class="view">([\s\S]*?)<\/div>/)?.[1]||'';
    for(const symbol of ['ⓐ','ⓑ','ⓒ'])if(!view.includes(symbol))errors.push(`${no}번 ${symbol} 누락`);
  }else errors.push(`${no}번 알 수 없는 원문형 유형: ${type}`);
  const deep=body.match(/<div class="deep"[\s\S]*?<\/div>/)?.[0]||'';
  if(plain(deep).length<100)errors.push(`${no}번 근거 해설이 지나치게 짧음`);
}

requireText(pageText,[
  '전통적 매체와 뉴 미디어의 차이',
  '전통적 매체와 뉴 미디어의 특성은 상대적이다',
  '복합 양식성',
  '쌍방향 소통',
  '정보 공유',
  '공유는 수정 권한이 아니다',
  '좋아요 수는 신뢰도의 증거가 아니다',
  '아이디는 곧 익명성 보장이 아니다',
  '댓글이 있다고 언제나 실시간 소통인 것은 아니다',
  '자료에 실제로 표시된 기능만 근거로 판단'
],'C01');
forbidText(pageText,[
  '용어의 정의와 구체적인 자료 근거를 같은 분석 층위에서 대응해야 한다',
  '기본형이나 원자료를 먼저 확인하고, 결합 환경에서',
  '적용 환경과 결과를 순서대로 확인',
  '자의성의 예외',
  '언어 기호의 자의성',
  '디지털 휴먼',
  '고양이랑',
  '복숭아향',
  '포함했다 또한',
  '복제 오류'
],'C01');
if(/ⓐ은|ⓑ은|ⓒ은/.test(pageText))errors.push('빈칸 해설의 조사 오류 잔존');

function finishLocal(){
  if(errors.length){
    console.error(`C01 검증 실패 ${errors.length}건`);
    for(const error of errors)console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('C01 수동 완성본 검증 통과');
  console.log(`- 상세 해설·문항 본문: ${pageText.length}자`);
  console.log('- 새 자료 5세트 / 원문 1번형 5문항 / 원문 2번형 5문항');
  console.log('- 선택지 50개 / 선택지별 해설 50개 / 심화 근거 해설 10개');
}

async function get(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),30000);
  try{
    const res=await fetch(url,{signal:controller.signal,headers:{'user-agent':'modukorean-c01-verifier/1.0','cache-control':'no-cache','pragma':'no-cache'}});
    if(!res.ok)throw new Error(`${res.status} ${res.statusText}: ${url}`);
    return await res.text();
  }finally{clearTimeout(timer);}
}

finishLocal();
if(LIVE){
  const liveErrors=[];
  const stamp=Date.now();
  let restEntry=null;
  try{
    const restText=await get(`${BASE}/wp-json/wp/v2/pages?slug=2027-suteuk-eonmae-c01&_fields=id,slug,modified_gmt,content,link&_deploy=${stamp}`);
    const data=JSON.parse(restText);
    if(!Array.isArray(data)||data.length!==1)throw new Error(`REST 결과 ${Array.isArray(data)?data.length:'비배열'}개`);
    restEntry=data[0];
    const rendered=String(restEntry?.content?.rendered||'');
    const renderedText=plain(rendered);
    if(!rendered.includes('data-manual-page="c01"'))throw new Error('REST 본문에 수동 완성본 표식 없음');
    if(count(rendered,/<section class="[^"]*\bq\b[^"]*"/g)!==10)throw new Error('REST 본문 문항 수가 10개가 아님');
    if(count(rendered,/class="[^"]*source-pair[^"]*"/g)!==5)throw new Error('REST 본문 새 자료 세트 수가 5개가 아님');
    requireText(renderedText,['전통적 매체와 뉴 미디어의 차이','공유는 수정 권한이 아니다','좋아요 수는 신뢰도의 증거가 아니다'],'REST');
  }catch(error){liveErrors.push(`REST: ${error?.message||error}`);}
  try{
    const publicHtml=await get(`${BASE}/2027-suteuk-eonmae-c01/?_deploy=${stamp}`);
    const publicText=plain(publicHtml);
    if(!publicHtml.includes('data-manual-page="c01"'))throw new Error('공개 페이지에 수동 완성본 표식 없음');
    if(count(publicHtml,/<section class="[^"]*\bq\b[^"]*"/g)!==10)throw new Error('공개 페이지 문항 수가 10개가 아님');
    if(count(publicHtml,/class="[^"]*source-pair[^"]*"/g)!==5)throw new Error('공개 페이지 새 자료 세트 수가 5개가 아님');
    requireText(publicText,['전통적 매체와 뉴 미디어의 차이','공유는 수정 권한이 아니다','좋아요 수는 신뢰도의 증거가 아니다'],'공개 페이지');
  }catch(error){liveErrors.push(`공개 페이지: ${error?.message||error}`);}
  const report={
    checked_at:new Date().toISOString(),base_url:BASE,slug:'2027-suteuk-eonmae-c01',
    page_id:restEntry?.id||null,modified_gmt:restEntry?.modified_gmt||null,link:restEntry?.link||`${BASE}/2027-suteuk-eonmae-c01/`,
    rest_verified:!liveErrors.some(x=>x.startsWith('REST:')),public_verified:!liveErrors.some(x=>x.startsWith('공개 페이지:')),
    source_sets:5,questions:10,choices:50,choice_explanations:50,status:liveErrors.length?'failure':'success',errors:liveErrors
  };
  fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n','utf8');
  if(liveErrors.length){
    console.error(`C01 실서비스 검증 실패 ${liveErrors.length}건`);
    for(const error of liveErrors)console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('C01 실서비스 검증 통과: REST·공개 페이지, 새 자료 5세트, 문항 10개');
}
