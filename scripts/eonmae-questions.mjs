function clean(value=''){return String(value).replace(/[‘’“”]/g,'').replace(/[.!?]+$/,'').replace(/\s+/g,' ').trim();}
function quote(value=''){return `“${clean(value)}”`;}
function unique(list){const out=[];for(const item of list){if(item?.text&&!out.some(x=>x.text===item.text))out.push(item);}return out;}
function point(page,i){return page.facts[(i%page.facts.length+page.facts.length)%page.facts.length];}
function rotate(list,n){return [...list.slice(n%list.length),...list.slice(0,n%list.length)];}

function hasFinalConsonant(word=''){
  const chars=[...String(word).trim()];const ch=chars.at(-1)||'';const code=ch.charCodeAt(0);
  if(code>=0xac00&&code<=0xd7a3)return (code-0xac00)%28!==0;
  if(/[136780]$/.test(ch))return true;
  if(/[2459]$/.test(ch))return false;
  return false;
}
function josa(word,pair){
  if(!pair.includes('/'))return pair;
  const [withFinal,withoutFinal]=pair.split('/');
  if(pair==='으로/로'&&hasFinalConsonant(word)){
    const ch=[...String(word).trim()].at(-1)||'';const code=ch.charCodeAt(0);const jong=(code>=0xac00&&code<=0xd7a3)?(code-0xac00)%28:-1;
    if(jong===8)return withoutFinal;
  }
  return hasFinalConsonant(word)?withFinal:withoutFinal;
}
function qj(term,pair){return `‘${term}’${josa(term,pair)}`;}
function tidy(text,max=220){
  let s=String(text).replace(/\s+/g,' ').trim();
  if(s.length<=max)return s;
  const cut=s.slice(0,max);const p=Math.max(cut.lastIndexOf('다.'),cut.lastIndexOf('.'),cut.lastIndexOf(','));
  return (p>100?cut.slice(0,p+1):cut.slice(0,max-1))+'…';
}

const TOKEN_STOP=new Set(['자료','내용','기능','설명','관계','판단','개념','실제','통해','대한','위해','경우','정의','형태','방식','부분','문항']);
function tokens(value){return new Set((String(value).match(/[가-힣A-Za-z0-9·]{2,}/g)||[]).map(x=>x.replace(/(?:은|는|이|가|을|를|과|와|의|에|에서|으로|로|도|만)$/u,'')).filter(x=>x.length>=2&&!TOKEN_STOP.has(x)));}
const GENERIC_TERMS=new Set(['언어','매체','자료','문장','담화','영상','광고','방송']);
function related(page,fact,except=[]){
  const excluded=new Set(except.map(x=>x.term));
  const text=String(fact),factTokens=tokens(text);
  const scored=page.concepts.filter(c=>!excluded.has(c.term)).map((c,i)=>{
    let score=0;
    if(text.includes(c.term))score+=GENERIC_TERMS.has(c.term)?1:4;
    for(const token of tokens(c.definition)){
      if(text.includes(token)||factTokens.has(token))score+=token.length>=4?3:2;
    }
    return {c,i,score};
  }).sort((x,y)=>y.score-x.score||x.i-y.i);
  return scored[0]?.c||page.concepts.find(c=>!excluded.has(c.term))||page.concepts[0];
}

const PROFILES={
  '개념 학습':{
    criterion:'정의와 성립 조건을 먼저 확인하고, 대표 사례와 반례가 같은 분석 층위에 놓였는지 살핀다.',
    second:'서로 비슷한 용어는 적용 대상과 자료 속 기능을 같은 기준으로 대조해야 한다.'
  },
  '언어':{
    criterion:'분석 단위를 확정한 뒤 형태·결합 환경·문맥을 확인하고, 실제 발음이나 문법 기능을 근거로 결론을 낸다.',
    second:'음운·형태 변화는 적용 순서를, 문장·담화 자료는 필수 성분과 맥락을 중심으로 판단한다.'
  },
  '매체':{
    criterion:'생산 목적과 예상 수용자를 확인하고, 문자·음성·영상·자막·배치가 수행하는 기능을 구체적인 화면 근거와 연결한다.',
    second:'표현 효과와 정보의 정확성·출처·윤리성은 서로 다른 기준으로 나누어 평가한다.'
  },
  '통합':{
    criterion:'원자료와 재구성 자료를 대응하여 핵심 정보가 유지·생략·추가·재배열된 양상을 확인한다.',
    second:'새 매체의 표현 방식과 수용자 참여 경로가 원자료의 목적과 관점을 해치지 않는지 살핀다.'
  },
  '실전 학습':{
    criterion:'언어 자료의 문법적 근거와 매체 자료의 표현 요소를 각각 분석한 뒤 두 판단을 종합한다.',
    second:'자료에 제시된 주체·대상·조건·결과를 바꾸지 않고 선택지와 대응해야 한다.'
  }
};
function profile(page){return PROFILES[page.group]||PROFILES['실전 학습'];}

function context(page,q){
  const f=point(page,q),g=point(page,q+3),h=point(page,q+6);
  const a=related(page,f),b=related(page,g,[a]),c=related(page,h,[a,b]),p=profile(page);
  return {a,b,c,f,g,h,p};
}

const STEMS=[
  p=>`「${p.title}」의 자료와 핵심 개념을 대응한 설명으로 가장 적절한 것은?`,
  p=>`「${p.title}」에서 혼동하기 쉬운 두 개념을 구별한 내용으로 가장 적절한 것은?`,
  p=>`<보기>의 판단 절차를 「${p.title}」에 적용한 것으로 가장 적절한 것은?`,
  p=>`「${p.title}」의 구체적 근거가 수행하는 역할을 설명한 것으로 가장 적절한 것은?`,
  p=>`「${p.title}」의 개념을 새로운 사례에 적용한 내용으로 가장 적절한 것은?`,
  p=>`「${p.title}」에 관한 학생의 분석을 바르게 수정한 것은?`,
  p=>`「${p.title}」의 핵심 개념을 확인할 수 있는 새 자료를 구성한 것으로 가장 적절한 것은?`,
  p=>`「${p.title}」의 표현 효과와 정보·문법적 정확성을 함께 평가한 것은?`,
  p=>`「${p.title}」에서 두 개념이 함께 작용하는 관계를 파악한 것으로 가장 적절한 것은?`,
  p=>`「${p.title}」의 두 근거를 종합하여 이해한 내용으로 가장 적절한 것은?`
];
const FOCUS=['정의 대응','개념 구별','분석 순서','근거 기능','새 사례 적용','오류 수정','사례 구성','효과와 정확성','복합 관계','종합 판단'];
const TASKS=[
  '자료 A의 핵심 사실을 가장 직접적으로 설명하는 개념을 고르고 정의와 근거가 정확히 대응하는지 판단한다.',
  '자료 A와 자료 B에 관련된 두 개념의 공통점보다 적용 대상과 기능의 차이를 먼저 확인한다.',
  '자료의 사실 확인, 개념의 성립 조건 대조, 실제 결과 검증의 순서를 지킨 선택지를 고른다.',
  '자료 A의 구체적인 표현이나 구성 요소가 어떤 역할을 하는지 자료 안의 결과로 설명한다.',
  '새 사례가 개념의 필수 조건과 적용 환경을 실제로 갖추었는지 확인하고 표면적 유사성만으로 분류하지 않는다.',
  '학생이 뒤바꾼 개념·주체·조건을 찾아 원자료의 근거와 정의에 맞게 수정한다.',
  '새 자료에는 개념의 정의뿐 아니라 그 정의를 확인할 수 있는 구체적인 형태·발화·화면 근거가 포함되어야 한다.',
  '표현 효과와 사실 정보 또는 문법적 분석의 정확성을 서로 다른 기준으로 평가한다.',
  '두 개념이 함께 나타나면 각각의 기능과 적용 순서를 분리하고 어느 자료가 각 기능의 근거인지 밝힌다.',
  '자료 A와 자료 B를 함께 고려하되 원자료의 주체·대상·조건·결과를 바꾸지 않고 종합한다.'
];
function withFocus(text,q){const f=FOCUS[q];return tidy(`${text} 이는 ‘${f}’${josa(f,'을/를')} 중심으로 한 판단이다.`,320);}
function definitionPhrase(definition){return `“${definition}”${josa(definition,'이라는/라는')} 뜻`;}

function view(page,q){
  const {a,b,c,f,g,h,p}=context(page,q);
  const parts=[
    `자료 A에는 ${quote(f)}라는 내용이 제시되어 있다.`,
    `자료 B에는 ${quote(g)}라는 내용이 제시되어 있다.`,
    `자료 C에는 ${quote(h)}라는 내용이 제시되어 있다.`,
    `${qj(a.term,'은/는')} ${definitionPhrase(a.definition)}이고, ${qj(b.term,'은/는')} ${definitionPhrase(b.definition)}이다.`,
    `${qj(c.term,'은/는')} ${definitionPhrase(c.definition)}이다.`,
    `판단할 때에는 ${p.criterion}`,
    p.second,
    TASKS[q],
    '선택지는 자료에 실제로 제시된 주체·대상·조건·결과를 유지해야 하며, 표현이 그럴듯하다는 이유만으로 자료에 없는 원인이나 효과를 덧붙여서는 안 된다.'
  ];
  return tidy(parts.join(' '),900);
}

function correctOption(page,q){
  const {a,b,f,g}=context(page,q);
  const patterns=[
    `${quote(f)}라는 자료의 내용은 ${qj(a.term,'의')} 정의인 “${a.definition}”와 자료 속 기능을 판단하는 직접 근거가 된다. 주체와 조건을 바꾸지 않았으므로 적절하다.`,
    `${qj(a.term,'은/는')} “${a.definition}”이고 ${qj(b.term,'은/는')} “${b.definition}”이므로, 두 개념은 적용 대상과 자료 속 기능을 구별해야 한다. ${quote(f)}는 앞 개념을 판단하는 구체적 근거가 된다.`,
    `먼저 ${quote(f)}라는 자료의 사실을 확인하고, 이어서 ${qj(a.term,'의')} 정의와 성립 조건을 대조한 뒤, ${quote(g)}가 결론을 보완하는지 검토하는 순서가 적절하다.`,
    `${quote(f)}라는 근거는 ${qj(a.term,'이/가')} 자료에서 어떤 기능을 하는지 직접 보여 준다. 표현의 겉모습이 아니라 실제 내용과 개념 정의를 연결했으므로 타당하다.`,
    `새 사례가 “${a.definition}”이라는 조건을 구체적으로 갖추고, ${quote(f)}에서 확인되는 적용 대상과 환경도 일치한다면 ${qj(a.term,'의')} 사례로 판단할 수 있다.`,
    `학생의 분석에서 ${qj(b.term,'을/를')} ${qj(a.term,'으로/로')} 잘못 분류한 부분을 고치고, ${qj(a.term,'의')} 정의를 “${a.definition}”으로 확인한 뒤 ${quote(f)}와 대응해야 한다.`,
    `${qj(a.term,'을/를')} 확인할 수 있는 새 자료라면 “${a.definition}”이라는 필수 조건과 그 조건이 드러나는 구체적인 형태·발화·화면 요소를 함께 제시해야 한다.`,
    `${quote(f)}가 주는 표현 효과와 그 내용이 ${qj(a.term,'의')} 정의 및 자료의 사실 관계에 맞는지는 별도로 검토해야 한다. 두 기준을 모두 충족할 때 적절하다고 평가할 수 있다.`,
    `${qj(a.term,'과/와')} ${qj(b.term,'이/가')} 함께 나타나더라도 두 개념의 기능을 하나로 합치지 말아야 한다. ${quote(f)}와 ${quote(g)}가 각각 어느 기능의 근거인지 나누어 설명하는 것이 적절하다.`,
    `${quote(f)}와 ${quote(g)}를 함께 고려하면 ${qj(a.term,'의')} 정의와 ${qj(b.term,'의')} 기능을 자료의 주체·대상·조건·결과를 바꾸지 않고 종합할 수 있다.`
  ];
  return {
    text:withFocus(patterns[q],q),
    explanation:`자료의 ${quote(f)}라는 근거와 ${qj(a.term,'의')} 정의를 같은 분석 층위에서 연결했다. 자료에 제시된 조건과 결과를 유지하고 ${qj(b.term,'과/와')} 구별했으므로 적절하다.`
  };
}

function wrongCandidates(page,q){
  const {a,b,c,f,g,h}=context(page,q);
  return [
    {
      text:withFocus(`${qj(a.term,'의')} 정의를 “${b.definition}”으로 바꾸고 ${quote(f)}를 그 사례로 판단한다. 두 용어의 설명을 맞바꾸었지만 자료의 표현이 비슷하므로 같은 개념으로 보아도 된다고 설명한다.`,q),
      explanation:`${qj(a.term,'의')} 정의는 “${a.definition}”이다. 이 선택지는 ${qj(b.term,'의')} 정의를 옮겨 붙여 두 개념의 적용 대상과 기능을 뒤바꾸었다.`
    },
    {
      text:withFocus(`${quote(f)}라는 자료의 내용을 ${qj(b.term,'의')} 근거로 연결하고, ${qj(a.term,'과/와')} ${qj(b.term,'의')} 성립 조건을 따로 구별하지 않는다. 결과가 비슷해 보인다는 점만으로 같은 분석을 적용한다.`,q),
      explanation:`자료의 해당 근거는 ${qj(a.term,'의')} 정의와 먼저 대응해야 한다. ${qj(b.term,'으로/로')} 연결하면 개념과 자료 근거의 분석 층위가 어긋난다.`
    },
    {
      text:withFocus(`${quote(g)}라는 결론을 먼저 정한 뒤 ${quote(f)}의 주체와 조건을 그 결론에 맞게 바꾼다. 이후 ${qj(a.term,'의')} 정의에서 필요한 조건은 일부만 확인해도 된다고 판단한다.`,q),
      explanation:'자료 분석은 결론을 먼저 정해 근거를 바꾸는 방식으로 이루어질 수 없다. 제시된 주체·조건을 유지하고 개념의 필수 조건을 모두 확인해야 한다.'
    },
    {
      text:withFocus(`${quote(h)}라는 표현이 이해를 돕거나 눈에 잘 띈다는 사실만으로, 그 안의 사실 정보와 ${qj(a.term,'의')} 적용도 정확하다고 판단한다. 표현 효과와 내용의 타당성을 하나의 기준으로 처리한다.`,q),
      explanation:'표현 효과와 사실·문법적 정확성은 별개의 기준이다. 자료가 효과적으로 보인다는 이유만으로 개념 적용과 사실 관계까지 옳다고 할 수 없다.'
    },
    {
      text:withFocus(`새 사례의 겉모습이 ${quote(f)}와 비슷하면 “${a.definition}”이라는 조건을 직접 확인하지 않아도 ${qj(a.term,'으로/로')} 분류할 수 있다고 본다. 적용 환경과 문맥은 판단에서 제외한다.`,q),
      explanation:`새 사례는 ${qj(a.term,'의')} 정의에 포함된 필수 조건과 적용 환경을 실제로 갖추어야 한다. 표면적 유사성만으로 분류할 수 없다.`
    },
    {
      text:withFocus(`${qj(a.term,'과/와')} ${qj(b.term,'이/가')} 함께 나타나는 자료에서 두 개념의 기능과 적용 순서를 서로 바꾸고, ${quote(f)}를 뒤 단계의 근거로 사용한다. 각 개념의 역할을 따로 밝히지 않는다.`,q),
      explanation:'둘 이상의 개념이 함께 나타나도 각 기능과 적용 순서는 구별해야 한다. 이 선택지는 두 개념의 역할과 근거를 서로 바꾸었다.'
    },
    {
      text:withFocus(`${quote(f)}라는 근거는 그대로 두지만 자료의 주체나 대상을 ${qj(c.term,'의')} 대상으로 바꾸어 해석한다. 원자료에 없는 조건을 추가해도 최종 결론이 비슷하면 적절하다고 본다.`,q),
      explanation:'자료에 제시된 주체·대상·조건은 선택지에서 임의로 바꿀 수 없다. 원자료에 없는 조건을 추가한 해석은 근거를 왜곡한다.'
    },
    {
      text:withFocus(`${qj(a.term,'의')} 정의 자체는 “${a.definition}”으로 제시하지만, 이를 ${quote(g)}와만 연결하고 ${quote(f)}라는 직접 근거는 제외한다. 더 멀리 있는 근거를 사용해도 용어가 맞으면 충분하다고 본다.`,q),
      explanation:'개념 정의가 맞더라도 자료의 직접 근거와 대응하지 않으면 분석이 성립하지 않는다. 해당 문항에서는 더 직접적인 근거인 자료 A를 우선 연결해야 한다.'
    }
  ];
}

export function makeQuestions(page,pageIndex){
  return Array.from({length:10},(_,q)=>{
    const answer=(pageIndex*10+q)%5;
    const correct=correctOption(page,q);
    const wrong=rotate(unique(wrongCandidates(page,q)),q).slice(0,4);
    const options=[];let wi=0;
    for(let i=0;i<5;i++)options.push(i===answer?{...correct,correct:true}:{...wrong[wi++],correct:false});
    return {no:q+1,stem:STEMS[q](page),view:view(page,q),options};
  });
}
