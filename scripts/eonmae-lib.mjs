import fs from 'node:fs';
import path from 'node:path';

export function read(file){ try{return fs.readFileSync(file,'utf8');}catch{return '';} }
export function esc(value=''){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
export function plain(value=''){
  return String(value).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/\s+/g,' ').trim();
}
export function meta(html,key){return html.match(new RegExp(`<!--\\s*${key}:\\s*([^\\n]*?)\\s*-->`,'i'))?.[1]?.trim()||'';}
export function premiumUrl(html){return html.match(/https:\/\/contents\.premium\.naver\.com\/[^"'< ]+/)?.[0]||'';}
export function groupOf(crumb){if(crumb.startsWith('개념'))return '개념 학습';if(crumb.startsWith('언어'))return '언어';if(crumb.startsWith('매체'))return '매체';if(crumb.startsWith('통합'))return '통합';return '실전 학습';}

const GENERIC_MARKERS=/이 단원의 핵심은|판단 과정은 ①|복습할 때에는|시험 직전에는|자료를 읽을 때 근거가 되는 부분|아래 문제는 원문 문항을 단순 재배열/;
const GENERIC_POINT=/^(형식만 외우지|표기와 발음|반례 하나|문법 단위는 고립|매체 자료는 내용뿐|생산 목적과 예상 수용자|다른 매체로 옮길 때|출처와 제작 주체|통합 자료에서는 두 매체|새 매체에서 추가된)/;
const PLACEHOLDER=/자료에서 기능과 적용 조건을 함께 확인해야 하는 핵심 개념/;
const GENERIC_FACT=/문법 문제는 먼저|매체 문제는 생산|선택지에서는|정답을 고를 때에는|판단 과정은|복습할 때에는|시험 직전에는|자료를 읽을 때|아래 문제는|형식만 외우지|같은 개념을 새로운 진술|개념 학습에서는 정의를 외우는 데|자료의 어느 부분이 정의|다음으로 기본형이나 원형을 복원|한 부분만 맞는 진술|원인과 결과를 뒤바꾼 진술/;
const STOP=new Set(['자료','내용','문제','결과','경우','관계','부분','방식','특징','확인','판단','설명','분석','적용','정보','표현','기능','조건','요소','과정','단원','핵심','실제','통해','대한','위해','다음','이러한','그리고','그러나','또한']);

function unique(list){const out=[];for(const v of list){const s=String(v||'').replace(/\s+/g,' ').trim();if(s&&!out.includes(s))out.push(s);}return out;}
function sentenceSplit(text){return String(text).replace(/([.!?]|다\.)\s*/g,'$1\n').split(/\n+/).map(s=>s.trim()).filter(s=>s.length>18);}
function extractItems(block){return [...block.matchAll(/<li>([\s\S]*?)<\/li>/gi)].map(m=>plain(m[1]));}
function restoreBlankAnswers(block){return String(block).replace(/<button[^>]*data-answer="([^"]+)"[^>]*>[\s\S]*?<\/button>/gi,'$1');}
function cleanSentence(s){return String(s).replace(/\s+/g,' ').replace(/표기의 글자 수와 실제 발음의 음절 수는 항상 일치하지 않을 수 있다/g,'표기의 글자 수와 실제 발음의 음절 수가 일치하지 않는 경우가 있다').replace(/\.([가-힣])/g,'. $1').replace(/다\.([가-힣])/g,'다. $1').trim();}
function exactDefinition(term,defs,title){return defs[term]||`${term}은 「${title}」에서 다른 개념과 구별하여 형태·환경·기능을 확인해야 하는 분석 항목이다.`;}

function collectTerms(html,text,defs,title){
  const explicit=unique([
    ...[...html.matchAll(/data-answer="([^"]+)"/g)].map(m=>plain(m[1])),
    ...[...html.matchAll(/<li><strong>([\s\S]*?)<\/strong>/gi)].map(m=>plain(m[1]))
  ]);
  const appearing=Object.keys(defs).filter(k=>k.length<=20&&(text.includes(k)||title.includes(k)));
  const tokens=(text.match(/[가-힣A-Za-z0-9·]{2,16}/g)||[]).filter(t=>!STOP.has(t));
  const ordered=unique([...explicit.filter(t=>defs[t]),...appearing,...explicit,...tokens.filter(t=>defs[t])]);
  return ordered.filter(t=>t.length<=20).slice(0,9).map(term=>({term,definition:exactDefinition(term,defs,title)}));
}

function categoryGuidance(group,title,concepts){
  const a=concepts[0]?.term||title,b=concepts[1]?.term||a,c=concepts[2]?.term||a;
  if(group==='매체'||group==='통합') return [
    `${title}에서는 생산 목적과 예상 수용자를 먼저 확정하고, 문자·음성·사진·영상·자막·음향·배치가 각각 어떤 정보를 선택하고 강조하는지 구체적으로 대응해야 한다.`,
    `‘${a}’와 ‘${b}’의 효과는 시각적 주목도만으로 평가할 수 없으며, 사실 정보의 정확성, 출처, 생략된 조건, 이용자가 실제로 이동하거나 반응하는 경로를 함께 살펴야 한다.`,
    `‘${c}’ 관련 내용을 다른 매체로 재구성할 때에는 원자료의 핵심 정보와 관점을 보존하면서 새 매체의 표현 관습, 저작권, 개인 정보와 공정성까지 점검해야 한다.`
  ];
  return [
    `${title} 문항은 용어만 암기하는 방식으로 해결하기 어렵다. 기본형이나 원자료를 먼저 확인하고, 결합 환경에서 어떤 조건이 충족되어 실제 형태나 기능이 나타나는지 단계적으로 설명해야 한다.`,
    `‘${a}’와 ‘${b}’를 구별할 때에는 분석 층위, 필수 조건, 적용 과정, 결과를 같은 순서로 대조해야 하며, 결과가 비슷해 보여도 환경이나 문법적 기능이 다르면 같은 현상으로 분류할 수 없다.`,
    `‘${c}’의 예외는 규칙을 부정하는 자료가 아니라 적용 범위를 정밀하게 한정하는 자료이므로 선택지의 주체·대상·환경과 분석 순서를 빠뜨리지 않아야 한다.`
  ];
}

function ensureSummary(parts,min=900,max=1080){
  let text=unique(parts.map(cleanSentence)).join(' ');
  const supplements=['각 판단은 자료에 나타난 구체적인 형태나 표현을 근거로 해야 하며, 일부 사례를 전체 규칙으로 넓히거나 원인과 결과를 바꾸어 서술한 선택지를 경계해야 한다.','비슷한 개념을 비교할 때에는 공통점보다 성립 조건과 적용 범위의 차이를 먼저 표시하면 낯선 사례에서도 안정적으로 판정할 수 있다.'];
  let i=0;while(text.length<min)text+=' '+supplements[i++%supplements.length];
  if(text.length>max){const cut=text.slice(0,max);const p=Math.max(cut.lastIndexOf('다.'),cut.lastIndexOf('.'));text=p>min?cut.slice(0,p+1):cut;}
  return text;
}

function chooseBlanks(summary,concepts,points,title){
  const rawCandidates=unique([...concepts.map(c=>c.term),...(title.match(/[가-힣A-Za-z0-9·]{2,14}/g)||[]),...points.flatMap(p=>p.match(/[가-힣A-Za-z0-9·]{2,14}/g)||[])]);
  const candidates=unique(rawCandidates.map(term=>{
    if(concepts.some(c=>c.term===term))return term;
    const stripped=term.replace(/(?:으로|에서|에게|한테|께서|처럼|보다|까지|부터|이나|나|은|는|이|가|을|를|과|와|의|에|로|도|만)$/u,'');
    return stripped.length>=2&&summary.includes(stripped)?stripped:term;
  })).filter(t=>!STOP.has(t)&&summary.includes(t));
  const chosen=[];
  for(const term of candidates){if(chosen.length>=15)break;if(!chosen.some(x=>x.includes(term)||term.includes(x)))chosen.push(term);}
  for(const term of candidates){if(chosen.length>=15)break;if(!chosen.includes(term))chosen.push(term);}
  if(chosen.length<15)throw new Error(`${title}: 상세 설명에 배치할 핵심어가 ${chosen.length}개뿐입니다.`);
  return chosen.slice(0,15);
}

export function extractPage(file,defs,index){
  const html=read(file);
  const title=plain(html.match(/<h1>([\s\S]*?)<\/h1>/i)?.[1]||'').replace(/\s*개념 정리·해설·변형문제$/,'');
  const crumb=plain(html.match(/<p class="crumb">([\s\S]*?)<\/p>/i)?.[1]||'');
  const group=groupOf(crumb);
  const summaryBlock=html.match(/<div class="summary">([\s\S]*?)<\/div>/i)?.[1]||'';
  const rawSummary=plain(restoreBlankAnswers(summaryBlock));
  const specific=cleanSentence(rawSummary.split(GENERIC_MARKERS)[0]);
  const detailBlocks=[...html.matchAll(/<section><h2>상세[^<]*<\/h2>([\s\S]*?)<\/section>/gi)];
  const details=detailBlocks.flatMap(m=>[...m[1].matchAll(/<p>([\s\S]*?)<\/p>/gi)].map(x=>cleanSentence(plain(x[1]))));
  const pointBlock=html.match(/<div class="pointbox">([\s\S]*?)<\/div>/i)?.[1]||'';
  const oldPoints=extractItems(pointBlock).map(cleanSentence).filter(p=>!GENERIC_POINT.test(p)&&!PLACEHOLDER.test(p));
  const sourceText=[specific,...details,...oldPoints,title].join(' ');
  const concepts=collectTerms(html,sourceText,defs,title);
  while(concepts.length<5){const found=Object.keys(defs).find(k=>sourceText.includes(k)&&!concepts.some(c=>c.term===k));if(!found)break;concepts.push({term:found,definition:defs[found]});}
  if(concepts.length<5)throw new Error(`${title}: 정확한 핵심 개념을 5개 이상 찾지 못했습니다.`);
  const facts=unique([...sentenceSplit(specific),...details.flatMap(sentenceSplit),...oldPoints]).map(cleanSentence).filter(s=>s.length>22&&!GENERIC_MARKERS.test(s)&&!GENERIC_FACT.test(s)&&!PLACEHOLDER.test(s));
  const points=unique([...oldPoints,...facts,...concepts.map(c=>`‘${c.term}’의 뜻은 ${c.definition}.`)]).slice(0,10);
  while(points.length<10)points.push(`${concepts[points.length%concepts.length].term}의 정의와 자료 속 기능을 구체적인 근거와 대응하여 판단한다.`);
  const summary=ensureSummary([...facts.slice(0,9),...concepts.map(c=>`‘${c.term}’의 뜻은 ${c.definition}.`),...points.slice(0,6),...categoryGuidance(group,title,concepts)]);
  const blanks=chooseBlanks(summary,concepts,points,title);
  const labels=(group==='매체'||group==='통합')?['생산 목적·수용자','표현 요소 기능','정보 정확성 검토','윤리·재구성 판단']:['분석 대상 확인','핵심 조건 구별','형태·환경 적용','결과·예외 검증'];
  const flow=labels.map((label,i)=>({label,answer:concepts[i%concepts.length].term}));
  return {index,file:path.basename(file),slug:meta(html,'slug'),type:meta(html,'type')||'page',categories:meta(html,'categories'),postId:meta(html,'post_id'),revision:Number.parseInt(meta(html,'revision')||'1',10),premiumUrl:premiumUrl(html),title,crumb,group,summary,blanks,flow,concepts,points,facts:facts.slice(0,12)};
}
