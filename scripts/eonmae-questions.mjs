function tidy(text,max=176){
  const s=String(text).replace(/\s+/g,' ').trim();
  if(s.length<=max)return s;
  const cut=s.slice(0,max);const p=Math.max(cut.lastIndexOf('다.'),cut.lastIndexOf('.'),cut.lastIndexOf(','));
  return (p>82?cut.slice(0,p+1):cut.slice(0,max-1))+'…';
}
function unique(list){const out=[];for(const s of list){if(s&&!out.includes(s))out.push(s);}return out;}
function concept(page,i){return page.concepts[i%page.concepts.length];}
function point(page,i){return page.points[i%page.points.length];}
function clean(value=''){return String(value).replace(/[‘’]/g,"'").replace(/[.!?]+$/,'').trim();}
function quote(value=''){return `“${clean(value)}”`;}
const TOKEN_STOP=new Set(['자료','내용','기능','설명','관계','판단','개념','실제','통해','대한','위해','경우','정의','형태','방식','부분']);
function tokens(value){return new Set((String(value).match(/[가-힣A-Za-z0-9·]{2,}/g)||[]).map(x=>x.replace(/(?:은|는|이|가|을|를|과|와|의|에|에서|으로|로|도|만)$/u,'')).filter(x=>x.length>=2&&!TOKEN_STOP.has(x)));}
function related(page,fact,offset=0){
  const text=String(fact);
  const exact=page.concepts.filter(c=>text.includes(c.term));
  if(exact.length)return exact[offset%exact.length];
  const ft=tokens(text);
  const scored=page.concepts.map((c,i)=>{const ct=tokens(`${c.term} ${c.definition}`);let score=0;for(const t of ft)if(ct.has(t))score++;return {c,i,score};}).sort((x,y)=>y.score-x.score||x.i-y.i);
  return scored[0].score>0?scored[0].c:concept(page,offset);
}
function unrelated(page,fact,except){
  return page.concepts.find(c=>c.term!==except.term&&!String(fact).includes(c.term))||page.concepts.find(c=>c.term!==except.term)||except;
}
function rotate(list,n){return [...list.slice(n%list.length),...list.slice(0,n%list.length)];}

const CRITERIA=[
  '자료의 구체적인 사실과 개념의 정의가 일치하는지 확인한다.',
  '두 개념의 적용 대상·환경·기능·결과를 같은 기준으로 비교한다.',
  '기본 자료, 적용 환경, 변화나 구성 과정, 실제 결과의 순서로 분석한다.',
  '자료에 제시된 근거가 어떤 개념이나 표현 요소의 기능을 뒷받침하는지 확인한다.',
  '새 사례가 개념의 필수 조건을 모두 갖추었는지 확인한 뒤 적용 범위를 결정한다.',
  '잘못된 용어뿐 아니라 잘못 연결된 근거와 분석 층위도 함께 수정한다.',
  '새 사례에는 개념의 정의를 확인할 수 있는 형태·환경·기능을 구체적으로 제시한다.',
  '표현 효과와 사실 정보의 정확성·공정성을 별개의 기준으로 평가한다.',
  '둘 이상의 개념이 함께 작용하면 각 기능과 선후 관계를 분리해 설명한다.',
  '두 개 이상의 근거를 종합하되 주체·대상·조건·결과를 바꾸지 않는다.'
];
const STEMS=[
  p=>`「${p.title}」의 자료 내용과 개념을 연결한 설명으로 가장 적절한 것은?`,
  p=>`「${p.title}」에서 서로 가까운 두 개념을 구별한 내용으로 가장 적절한 것은?`,
  p=>`<보기>의 분석 절차에 따라 「${p.title}」의 자료를 판단한 것으로 가장 적절한 것은?`,
  p=>`「${p.title}」의 구체적 근거가 수행하는 기능을 설명한 것으로 가장 적절한 것은?`,
  p=>`<보기>의 조건을 「${p.title}」 관련 새로운 사례에 적용한 내용으로 가장 적절한 것은?`,
  p=>`「${p.title}」에 관한 학생의 잘못된 분석을 바르게 고친 것은?`,
  p=>`「${p.title}」의 개념을 활용하여 새 사례를 구성한 것으로 가장 적절한 것은?`,
  p=>`「${p.title}」의 표현 효과와 문법·정보의 정확성을 함께 평가한 것은?`,
  p=>`「${p.title}」에서 둘 이상의 개념이 작용하는 관계를 파악한 것으로 가장 적절한 것은?`,
  p=>`「${p.title}」의 자료를 종합적으로 이해한 내용으로 가장 적절한 것은?`
];

function view(page,q){
  const f=point(page,q),g=point(page,q+3),a=related(page,f,q),b=unrelated(page,f,a);
  let text=`판단 기준: ${CRITERIA[q]} ‘${a.term}’의 정의는 “${a.definition}”이다. 비교할 개념인 ‘${b.term}’의 정의는 “${b.definition}”이다. 자료에는 ${quote(f)}라는 내용과 ${quote(g)}라는 내용이 제시되어 있다.`;
  while(text.length<340)text+=` 따라서 「${page.title}」에서는 용어의 정의와 구체적인 자료 근거를 같은 분석 층위에서 대응해야 한다.`;
  return text.slice(0,530);
}

function makeCorrect(page,q){
  const f=point(page,q),g=point(page,q+2),a=related(page,f,q),b=unrelated(page,f,a);
  const patterns=[
    `자료의 ${quote(f)}라는 내용은 「${page.title}」의 실제 사실과 개념의 적용 조건을 그대로 반영하므로 적절하다.`,
    `‘${a.term}’의 정의는 “${a.definition}”이고, ‘${b.term}’의 정의는 “${b.definition}”이므로 두 개념의 적용 대상과 기능을 구별해야 한다.`,
    `먼저 자료의 ${quote(f)}라는 내용을 확인한 뒤, 관련 개념의 성립 환경과 적용 과정, 실제 결과를 차례로 대조한다.`,
    `자료의 ${quote(f)}라는 내용은 「${page.title}」의 구체적인 근거이며, 해당 표현이나 문법 요소가 수행하는 기능을 직접 뒷받침한다.`,
    `새 사례에서 “${a.definition}”에 해당하는 특징이 구체적으로 확인된다면 ‘${a.term}’의 사례로 판단할 수 있으며, 자료의 ${quote(f)}라는 내용은 별도의 비교 근거로 활용한다.`,
    `잘못된 분석은 ‘${a.term}’의 정의를 “${a.definition}”이라고 바로잡고, 자료의 ${quote(f)}라는 근거와 같은 층위에서 다시 연결해야 한다.`,
    `‘${a.term}’의 새 사례는 정의에 포함된 조건을 보여 주어야 하며, 그 조건은 “${a.definition}”이다. 형태와 환경도 함께 제시해야 한다.`,
    `자료의 ${quote(f)}라는 표현이 주는 효과와 사실·문법 정보의 정확성을 따로 검토하고, 두 기준을 모두 충족하는지 판단한다.`,
    `‘${a.term}’·‘${b.term}’ 두 개념이 함께 나타날 때에는 각 기능을 분리하고, 자료의 ${quote(f)}가 어느 기능의 근거인지 밝혀야 한다.`,
    `자료의 ${quote(f)}라는 내용과 ${quote(g)}라는 내용을 함께 고려하면, 「${page.title}」의 주체·대상·조건·결과를 바꾸지 않고 종합할 수 있다.`
  ];
  return tidy(patterns[q]);
}

function wrongPool(page,q){
  const f=point(page,q),g=point(page,q+3),a=related(page,f,q),b=unrelated(page,f,a),c=unrelated(page,g,b);
  return [
    `자료의 ${quote(f)}라는 내용은 ‘${b.term}’의 정의를 보여 주는 근거이므로, ‘${a.term}’의 적용 조건과는 구별하지 않아도 된다고 본다.`,
    `‘${a.term}’의 정의를 다음과 같이 바꾼다. “${b.definition}”. 그리고 자료의 ${quote(f)}라는 내용을 새 정의에 맞는 사례로 분류한다.`,
    `자료의 ${quote(f)}라는 사실은 유지하지만 그 결과를 ‘${c.term}’의 기능으로 설명하여, 자료의 근거와 개념의 분석 층위를 다르게 연결한다.`,
    `자료의 ${quote(g)}라는 내용을 먼저 결론으로 정하고, ‘${a.term}’이 성립하는 환경과 적용 과정은 뒤에서 결과에 맞추어 설정한다.`,
    `자료의 ${quote(f)}라는 표현이 이해를 돕는다는 점만으로, 그 안에 포함된 사실 정보와 개념 적용도 적절하다고 판단한다.`,
    `‘${a.term}’·‘${b.term}’ 두 개념이 함께 나타나는 사례에서 각 기능의 적용 순서를 바꾸고, 자료의 ${quote(f)}를 뒤 단계의 근거로 사용한다.`,
    `새 사례의 겉모습이 자료의 ${quote(f)}와 비슷하다는 이유로, ‘${a.term}’의 정의에 포함된 “${a.definition}”의 충족 여부를 확인하지 않고 분류한다.`,
    `자료의 ${quote(f)}라는 근거는 유지하면서도 주체나 대상을 ‘${b.term}’의 대상으로 바꾸어 동일한 결론을 이끌어 낸다.`
  ].map(x=>tidy(x));
}

function explain(page,q,text,isCorrect){
  const f=point(page,q),a=related(page,f,q);
  if(isCorrect)return `자료의 ${quote(f)}라는 내용을 그대로 반영하고, ‘${a.term}’의 정의 및 적용 조건과 같은 층위에서 연결하였다. 주체·대상·과정·결과를 바꾸지 않았으므로 적절하다.`;
  return `이 선택지는 ${text} 자료의 근거를 다른 개념에 연결하거나 적용 환경·분석 순서·주체를 바꾸었다. ‘${a.term}’의 정의는 “${a.definition}”이며, 자료의 ${quote(f)}와 직접 대응해야 한다.`;
}

export function makeQuestions(page,pageIndex){
  return Array.from({length:10},(_,q)=>{
    const answer=(pageIndex*10+q)%5;
    const correct=makeCorrect(page,q);
    const wrong=rotate(unique(wrongPool(page,q).filter(x=>x!==correct)),q).slice(0,4);
    const options=[];let wi=0;
    for(let i=0;i<5;i++){
      const text=i===answer?correct:wrong[wi++];
      options.push({text,correct:i===answer,explanation:explain(page,q,text,i===answer)});
    }
    return {no:q+1,stem:STEMS[q](page),view:view(page,q),options};
  });
}
