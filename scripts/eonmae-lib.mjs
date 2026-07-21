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

const GENERATED=/이 단원의 핵심은|판단 과정은 ①|복습할 때에는|시험 직전에는|자료를 읽을 때 근거가 되는 부분|아래 문제는 원문 문항을 단순 재배열|형식만 외우지|표기와 발음, 형태와 기능|반례 하나|문법 단위는 고립|자료에서 기능과 적용 조건을 함께 확인해야 하는 핵심 개념|문항은 기본형이나 원자료를 먼저 확인|두 개념은 분석 층위, 필수 조건, 적용 과정, 결과|의 예외는 규칙의 적용 범위를 정밀하게 한정|생산 목적과 예상 수용자를 먼저 확정|관련 효과는 시각적 주목도만으로 평가하지 않고|다른 매체로 재구성할 때에는 원자료의 핵심 정보/;
const PLACEHOLDER=/자료에서 기능과 적용 조건을 함께 확인해야 하는 핵심 개념/;

function hasFinalConsonant(word=''){
  const ch=[...String(word).trim()].at(-1)||'';const code=ch.charCodeAt(0);
  return code>=0xac00&&code<=0xd7a3?(code-0xac00)%28!==0:false;
}
function josa(word,pair){if(!pair.includes('/'))return pair;const [a,b]=pair.split('/');return hasFinalConsonant(word)?a:b;}
function quoted(term,pair){return `‘${term}’${josa(term,pair)}`;}

const DEFINITION_FIXES={
  '형태소':'일정한 뜻이나 문법적 기능을 지닌 가장 작은 말의 단위',
  '접사':'어근의 앞이나 뒤에 붙어 특정한 뜻을 더하거나 뜻을 제한하며, 일부 접미사는 품사를 바꾸기도 하는 의존 형태소'
};

function unique(list){const out=[];for(const v of list){const s=String(v||'').replace(/\s+/g,' ').trim();if(s&&!out.includes(s))out.push(s);}return out;}
function correctQuotedJosa(value){
  const pairs={이:'이/가',가:'이/가',은:'은/는',는:'은/는',을:'을/를',를:'을/를',과:'과/와',와:'과/와'};
  return String(value).replace(/‘([^’]+)’(이|가|은|는|을|를|과|와)/g,(all,term,particle)=>`‘${term}’${josa(term,pairs[particle])}`);
}
function cleanSentence(s){return correctQuotedJosa(String(s).replace(/\s+/g,' ').replace(/표기의 글자 수와 실제 발음의 음절 수는 항상 일치하지 않을 수 있다/g,'표기의 글자 수와 실제 발음의 음절 수가 일치하지 않는 경우가 있다').replace(/\.([가-힣])/g,'. $1').replace(/다\.([가-힣])/g,'다. $1').trim());}
function sentenceSplit(text){return String(text).replace(/([.!?])\s*/g,'$1\n').split(/\n+/).map(cleanSentence).filter(s=>s.length>18);}
function restoreBlanks(block){
  return String(block)
    .replace(/<span class="blank-mask">[\s\S]*?<\/span>/gi,'')
    .replace(/<span class="blank-answer"[^>]*>([\s\S]*?)<\/span>/gi,'$1')
    .replace(/<\/?button\b[^>]*>/gi,'');
}
function extractItems(block){return [...block.matchAll(/<li>([\s\S]*?)<\/li>/gi)].map(m=>cleanSentence(plain(m[1])));}
function exactDefinition(term,defs,title){const d=DEFINITION_FIXES[term]||defs[term];if(!d)throw new Error(`${title}: 개념 사전에 없는 용어 ${term}`);return d;}

function ensureSummary(parts,required,min=880,max=1080){
  let sentences=unique(parts.map(cleanSentence).filter(s=>s&&!GENERATED.test(s)));
  let text=sentences.join(' ');
  const addMissing=()=>{
    const missing=required.filter(term=>!text.includes(term));
    for(let i=0;i<missing.length;i+=5){
      const group=missing.slice(i,i+5);
      sentences.push(`자료를 확인할 때에는 ${group.join('·')} 각각이 어떤 정보, 관계, 기능을 나타내는지 구체적인 문장과 화면 근거에 대응하여 판단한다.`);
    }
    sentences=unique(sentences);text=sentences.join(' ');
  };
  addMissing();
  const supplements=[
    '선택지를 판단할 때에는 자료에 실제로 제시된 주체·대상·조건·결과를 표시하고, 자료에 없는 원인이나 효과를 덧붙이지 않아야 한다.',
    '비슷한 개념은 공통점만 나열하지 말고 성립 조건, 적용 대상, 자료 속 기능이 어디에서 달라지는지 같은 기준으로 대조한다.',
    '표현의 주목도와 내용의 정확성은 별개의 판단 기준이므로, 눈에 잘 띈다는 이유만으로 사실 관계까지 옳다고 단정해서는 안 된다.',
    '문법 자료는 분석 단위와 문맥을, 매체 자료는 생산 목적과 수용자의 반응 경로를 먼저 확인하면 선지의 과도한 확대를 피할 수 있다.',
    '두 근거를 종합할 때에도 원자료의 관점과 핵심 정보가 보존되었는지 확인하고, 생략되거나 새로 추가된 내용을 구별해야 한다.'
  ];
  for(const s of supplements){if(text.length>=min)break;sentences.push(s);text=unique(sentences).join(' ');}
  addMissing();
  if(text.length>max){
    const scored=sentences.map((s,i)=>({s,i,cover:required.filter(t=>s.includes(t)).length}));
    const selected=[];const covered=new Set();
    for(const item of scored.filter(x=>x.cover>0).sort((a,b)=>b.cover-a.cover||a.i-b.i)){
      if(selected.includes(item.s))continue;
      if((selected.join(' ')+' '+item.s).trim().length<=max)selected.push(item.s);
      for(const term of required)if(item.s.includes(term))covered.add(term);
    }
    for(const item of scored.sort((a,b)=>a.i-b.i)){
      if(selected.includes(item.s))continue;
      if((selected.join(' ')+' '+item.s).trim().length<=max)selected.push(item.s);
      if(selected.join(' ').length>=min)break;
    }
    selected.sort((a,b)=>sentences.indexOf(a)-sentences.indexOf(b));
    text=selected.join(' ');
    const lost=required.filter(t=>!text.includes(t));
    if(lost.length){
      const tail=`추가 확인 핵심어는 ${lost.join('·')}이며, 각 표현을 자료의 구체적인 근거와 연결해 판단한다.`;
      while(text.length+1+tail.length>max&&selected.length>1){selected.pop();text=selected.join(' ');}
      text=`${text} ${tail}`.trim();
    }
  }
  if(text.length<min){
    for(const s of supplements){if(text.includes(s))continue;text=`${text} ${s}`.trim();if(text.length>=min)break;}
  }
  const stillMissing=required.filter(term=>!text.includes(term));
  if(stillMissing.length)throw new Error(`상세 설명에서 핵심어 누락: ${stillMissing.join(', ')}`);
  if(text.length>max)throw new Error(`상세 설명 길이 초과: ${text.length}자`);
  return text;
}

function categoryGuidance(group,title,concepts){
  const a=concepts[0].term,b=concepts[1].term,c=concepts[2].term;
  if(group==='개념 학습')return [
    `${title}에서는 먼저 핵심 용어의 정의와 성립 조건을 확인하고, 같은 자료를 서로 다른 분석 층위에서 설명하는 개념을 구별해야 한다.`,
    `${quoted(a,'과/와')} ${quoted(b,'은/는')} 정의·적용 대상·대표 사례를 같은 기준으로 대조하고, ${quoted(c,'은/는')} 실제 자료의 어느 부분에서 확인되는지 근거를 밝혀야 한다.`,
    '개념을 적용할 때에는 정의에 포함된 조건을 빠뜨리지 말고, 비슷해 보이는 사례라도 필수 조건이 다르면 같은 범주로 묶지 않는다.'
  ];
  if(group==='언어')return [
    `${title}에서는 음운·형태소·단어·문장 성분·담화 가운데 분석 단위를 먼저 확정하고, 형태와 결합 환경, 문맥 속 기능을 차례로 확인해야 한다.`,
    `${quoted(a,'과/와')} ${quoted(b,'은/는')} 같은 층위의 기준으로 대조하되, 음운·형태 변화는 적용 순서를, 문장·담화 자료는 필수 성분과 맥락을 중심으로 판단한다.`,
    `${quoted(c,'의')} 판단에서는 실제 예와 반례를 함께 살펴 규칙이나 정의의 적용 범위를 과도하게 넓히지 않아야 한다.`
  ];
  if(group==='매체')return [
    `${title}에서는 생산 목적과 예상 수용자를 확인한 뒤 문자·음성·사진·영상·자막·음향·배치가 어떤 정보를 선택하고 강조하는지 살펴야 한다.`,
    `${quoted(a,'과/와')} ${quoted(b,'의')} 효과는 자료에 나타난 구체적인 화면·발화·링크·반응을 근거로 설명하고, 표현 효과와 사실 정보의 정확성을 구별한다.`,
    `${quoted(c,'과/와')} 관련된 출처·저작권·개인 정보·공정성은 해당 자료에 제시된 조건을 근거로 판단하며, 자료에 없는 윤리 쟁점을 임의로 추가하지 않는다.`
  ];
  if(group==='통합')return [
    `${title}에서는 원자료의 핵심 정보와 관점을 먼저 정리하고, 새 매체에서 무엇이 유지·생략·추가·재배열되었는지 대응시켜야 한다.`,
    `${quoted(a,'과/와')} ${quoted(b,'은/는')} 각 매체의 표현 관습과 수용자 참여 방식을 중심으로 비교하고, ${quoted(c,'은/는')} 정보 이동과 상호 작용의 실제 경로에서 확인한다.`,
    '재구성의 적절성은 원자료의 사실 보존, 새 매체의 목적과 수용자, 표현 요소의 기능을 근거로 판단하며 자료 밖의 정보를 핵심 근거로 삼지 않는다.'
  ];
  return [
    `${title}에서는 언어 자료의 분석 단위와 매체 자료의 생산 목적을 각각 확인한 뒤, 두 영역의 근거를 섞지 않고 판단해야 한다.`,
    `${quoted(a,'과/와')} ${quoted(b,'의')} 정의를 자료의 구체적인 형태·발화·화면 요소와 대응하고, ${quoted(c,'의')} 기능이 실제 결과에 어떻게 드러나는지 확인한다.`,
    '종합 문항에서는 문법적 정확성과 매체 표현의 적절성을 별도로 검토한 뒤 두 판단을 함께 결론에 반영한다.'
  ];
}

function flowLabels(group){
  if(group==='개념 학습')return ['핵심 개념 확인','개념 관계 구별','자료 근거 연결','적용 범위 검증'];
  if(group==='언어')return ['분석 단위 확인','형태·환경 구별','규칙·기능 적용','결과·문맥 검증'];
  if(group==='매체')return ['생산 목적·수용자','표현 요소 기능','정보 정확성·출처','상호 작용·윤리'];
  if(group==='통합')return ['원자료 핵심','재구성 방식','수용자 참여','변형 적절성'];
  return ['언어 자료 분석','매체 자료 분석','근거 대응','종합 판단'];
}
function normalizeFlow(group,flow){const labels=flowLabels(group);return flow.map((item,i)=>({...item,label:labels[i]||item.label}));}

export function makeSummary(page){
  return ensureSummary([
    ...page.points,
    ...page.concepts.map(c=>`${c.term}의 정의는 ${c.definition}이다.`),
    ...categoryGuidance(page.group,page.title,page.concepts)
  ],page.blanks);
}

export function extractPage(file,defs,spec,index){
  const html=read(file),slug=meta(html,'slug');
  if(!spec)throw new Error(`${slug}: 정제표 없음`);
  const title=plain(html.match(/<h1>([\s\S]*?)<\/h1>/i)?.[1]||'').replace(/\s*(?:개념 정리·해설·변형문제|해설 및 변형문제)$/,'');
  const crumb=plain(html.match(/<(?:p|span) class="crumb">([\s\S]*?)<\/(?:p|span)>/i)?.[1]||'');
  const group=groupOf(crumb);
  const summaryBlock=html.match(/<(?:section|div) class="summary"[^>]*>([\s\S]*?)<\/(?:section|div)>/i)?.[1]||'';
  const summaryParagraphs=[...summaryBlock.matchAll(/<p(?![^>]*class="guide")[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>cleanSentence(plain(restoreBlanks(m[1]))));
  const rawSummary=summaryParagraphs.join(' ');
  const currentPointsBlock=html.match(/<ol class="points">([\s\S]*?)<\/ol>/i)?.[1]||html.match(/<div class="pointbox">([\s\S]*?)<\/div>/i)?.[1]||'';
  const currentPoints=extractItems(currentPointsBlock).filter(p=>!GENERATED.test(p)&&!PLACEHOLDER.test(p));
  const concepts=spec.concepts.map(term=>({term,definition:exactDefinition(term,defs,title)}));
  const relevantTerms=new Set([...spec.concepts,...spec.blanks]);
  const rawSentences=sentenceSplit(rawSummary);
  const specific=rawSentences.filter(s=>[...relevantTerms].some(term=>s.includes(term))).filter(s=>!GENERATED.test(s)&&!PLACEHOLDER.test(s)&&!/[^가-힣A-Za-z0-9·,.!?‘’“”()\-\s\[\]:]/.test(s));
  const points=unique([
    ...currentPoints.filter(p=>[...relevantTerms].some(term=>p.includes(term))),
    ...specific,
    ...currentPoints,
    ...concepts.map(c=>`${c.term}의 정의는 ${c.definition}이다.`)
  ]).slice(0,10);
  while(points.length<10)points.push(`${concepts[points.length%concepts.length].term}의 정의와 성립 조건을 자료의 구체적인 사례에 대응하여 판단한다.`);
  const page={index,file:path.basename(file),slug,type:meta(html,'type')||'page',categories:meta(html,'categories'),postId:meta(html,'post_id'),revision:Number.parseInt(meta(html,'revision')||'1',10),premiumUrl:premiumUrl(html),title,crumb,group,summary:'',blanks:spec.blanks,flow:normalizeFlow(group,spec.flow),concepts,points,facts:points};
  page.summary=makeSummary(page);
  return page;
}
