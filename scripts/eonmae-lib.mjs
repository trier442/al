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

const GENERIC=/이 단원의 핵심은|판단 과정은 ①|복습할 때에는|시험 직전에는|자료를 읽을 때 근거가 되는 부분|아래 문제는 원문 문항을 단순 재배열|형식만 외우지|표기와 발음, 형태와 기능|반례 하나|문법 단위는 고립|자료에서 기능과 적용 조건을 함께 확인해야 하는 핵심 개념/;
const PLACEHOLDER=/자료에서 기능과 적용 조건을 함께 확인해야 하는 핵심 개념/;

function unique(list){const out=[];for(const v of list){const s=String(v||'').replace(/\s+/g,' ').trim();if(s&&!out.includes(s))out.push(s);}return out;}
function cleanSentence(s){return String(s).replace(/\s+/g,' ').replace(/표기의 글자 수와 실제 발음의 음절 수는 항상 일치하지 않을 수 있다/g,'표기의 글자 수와 실제 발음의 음절 수가 일치하지 않는 경우가 있다').replace(/\.([가-힣])/g,'. $1').replace(/다\.([가-힣])/g,'다. $1').trim();}
function sentenceSplit(text){return String(text).replace(/([.!?])\s*/g,'$1\n').split(/\n+/).map(cleanSentence).filter(s=>s.length>18);}
function restoreBlanks(block){
  return String(block)
    .replace(/<span class="blank-mask">[\s\S]*?<\/span>/gi,'')
    .replace(/<span class="blank-answer"[^>]*>([\s\S]*?)<\/span>/gi,'$1');
}
function extractItems(block){return [...block.matchAll(/<li>([\s\S]*?)<\/li>/gi)].map(m=>cleanSentence(plain(m[1])));}
function exactDefinition(term,defs,title){const d=defs[term];if(!d)throw new Error(`${title}: 개념 사전에 없는 용어 ${term}`);return d;}
function ensureSummary(parts,required,min=880,max=1080){
  let sentences=unique(parts.map(cleanSentence).filter(s=>s&&!GENERIC.test(s)));
  let text=sentences.join(' ');
  const missing=required.filter(term=>!text.includes(term));
  if(missing.length){
    for(let i=0;i<missing.length;i+=5){
      const group=missing.slice(i,i+5);
      sentences.push(`추가 분석에서는 ${group.join('·')}의 의미와 자료 속 역할을 구체적인 근거와 대응하여 확인한다.`);
    }
    text=unique(sentences).join(' ');
  }
  const supplements=['각 판단은 자료에 나타난 구체적인 형태나 표현을 근거로 해야 하며, 일부 사례를 전체 규칙으로 넓히거나 원인과 결과를 바꾸어 서술한 선택지를 경계해야 한다.','비슷한 개념을 비교할 때에는 공통점보다 성립 조건과 적용 범위의 차이를 먼저 표시하면 낯선 사례에서도 안정적으로 판정할 수 있다.'];
  let n=0;while(text.length<min)text+=' '+supplements[n++%supplements.length];
  if(text.length>max){
    const mustKeep=required.filter(t=>text.includes(t));
    let selected=[];
    for(const s of sentences){if((selected.join(' ')+ ' '+s).length<=max-120)selected.push(s);}
    let candidate=selected.join(' ');
    const lost=mustKeep.filter(t=>!candidate.includes(t));
    if(lost.length)candidate+=` 추가 핵심어는 ${lost.join('·')}이며, 각 용어의 정의와 적용 조건을 자료에서 확인한다.`;
    text=candidate.slice(0,max);
    const p=Math.max(text.lastIndexOf('다.'),text.lastIndexOf('.'));if(p>min)text=text.slice(0,p+1);
  }
  const stillMissing=required.filter(term=>!text.includes(term));
  if(stillMissing.length)throw new Error(`상세 설명에서 핵심어 누락: ${stillMissing.join(', ')}`);
  return text;
}
function categoryGuidance(group,title,concepts){
  const a=concepts[0].term,b=concepts[1].term,c=concepts[2].term;
  if(group==='매체'||group==='통합')return [
    `${title}에서는 생산 목적과 예상 수용자를 먼저 확정하고, 문자·음성·사진·영상·자막·음향·배치가 각각 어떤 정보를 선택하고 강조하는지 구체적으로 대응해야 한다.`,
    `‘${a}’·‘${b}’ 관련 효과는 시각적 주목도만으로 평가하지 않고, 사실 정보의 정확성, 출처, 생략된 조건, 이용자의 반응 경로를 함께 살펴야 한다.`,
    `‘${c}’ 관련 내용을 다른 매체로 재구성할 때에는 원자료의 핵심 정보와 관점을 보존하면서 새 매체의 표현 관습과 매체 윤리도 점검해야 한다.`
  ];
  return [
    `${title} 문항은 기본형이나 원자료를 먼저 확인하고, 결합 환경에서 어떤 조건이 충족되어 실제 형태나 기능이 나타나는지 단계적으로 설명해야 한다.`,
    `‘${a}’·‘${b}’ 두 개념은 분석 층위, 필수 조건, 적용 과정, 결과를 같은 순서로 대조해야 하며, 결과가 비슷해도 환경이나 문법 기능이 다르면 같은 현상으로 분류할 수 없다.`,
    `‘${c}’의 예외는 규칙의 적용 범위를 정밀하게 한정하므로 선택지의 주체·대상·환경과 분석 순서를 빠뜨리지 않아야 한다.`
  ];
}

export function extractPage(file,defs,spec,index){
  const html=read(file),slug=meta(html,'slug');
  if(!spec)throw new Error(`${slug}: 정제표 없음`);
  const title=plain(html.match(/<h1>([\s\S]*?)<\/h1>/i)?.[1]||'').replace(/\s*(?:개념 정리·해설·변형문제|해설 및 변형문제)$/,'');
  const crumb=plain(html.match(/<(?:p|span) class="crumb">([\s\S]*?)<\/(?:p|span)>/i)?.[1]||'');
  const group=groupOf(crumb);
  const summaryBlock=html.match(/<(?:section|div) class="summary"[^>]*>([\s\S]*?)<\/(?:section|div)>/i)?.[1]||'';
  const rawSummary=cleanSentence(plain(restoreBlanks(summaryBlock)));
  const currentPointsBlock=html.match(/<ol class="points">([\s\S]*?)<\/ol>/i)?.[1]||html.match(/<div class="pointbox">([\s\S]*?)<\/div>/i)?.[1]||'';
  const currentPoints=extractItems(currentPointsBlock).filter(p=>!GENERIC.test(p)&&!PLACEHOLDER.test(p));
  const concepts=spec.concepts.map(term=>({term,definition:exactDefinition(term,defs,title)}));
  const relevantTerms=new Set([...spec.concepts,...spec.blanks]);
  const rawSentences=sentenceSplit(rawSummary);
  const specific=rawSentences.filter((s,i)=>i<5||[...relevantTerms].some(term=>s.includes(term))).filter(s=>!GENERIC.test(s)&&!PLACEHOLDER.test(s));
  const points=unique([...currentPoints.filter(p=>[...relevantTerms].some(term=>p.includes(term))),...currentPoints,...concepts.map(c=>`${c.term}의 정의는 ${c.definition}이다.`)]).slice(0,10);
  while(points.length<10)points.push(`${concepts[points.length%concepts.length].term}의 정의와 자료 속 기능을 구체적인 사례에 대응하여 판단한다.`);
  const summary=ensureSummary([...specific.slice(0,7),...concepts.map(c=>`${c.term}의 정의는 ${c.definition}이다.`),...points.slice(0,6),...categoryGuidance(group,title,concepts)],spec.blanks);
  return {index,file:path.basename(file),slug,type:meta(html,'type')||'page',categories:meta(html,'categories'),postId:meta(html,'post_id'),revision:Number.parseInt(meta(html,'revision')||'1',10),premiumUrl:premiumUrl(html),title,crumb,group,summary,blanks:spec.blanks,flow:spec.flow,concepts,points,facts:points};
}
