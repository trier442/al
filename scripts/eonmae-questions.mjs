function tidy(text,max=150){
  const s=String(text).replace(/\s+/g,' ').trim();
  if(s.length<=max)return s;
  const cut=s.slice(0,max);const p=Math.max(cut.lastIndexOf('다.'),cut.lastIndexOf('.'),cut.lastIndexOf(','));
  return (p>70?cut.slice(0,p+1):cut.slice(0,max-1))+'…';
}
function unique(list){const out=[];for(const s of list){if(s&&!out.includes(s))out.push(s);}return out;}
function concept(page,i){return page.concepts[i%page.concepts.length];}
function fact(page,i){return page.facts[i%page.facts.length]||page.points[i%page.points.length];}
function view(page,q){
  const a=concept(page,q),b=concept(page,q+1),f1=fact(page,q),f2=fact(page,q+3);
  const criterion=['정의에 포함된 성립 조건을 빠짐없이 확인하고, 자료의 구체적인 형태나 표현이 그 조건에 대응하는지 판단한다.','유사한 두 개념은 공통점보다 적용 대상·환경·기능·결과의 차이를 중심으로 비교한다.','분석 과정은 기본 자료 확인, 결합 환경 표시, 적용 과정 추적, 실제 결과 검증의 순서로 진행한다.','선택지에서 원인과 결과, 생산자와 수용자, 형식과 기능이 뒤바뀌지 않았는지 점검한다.','한 사례에서 성립한 설명을 다른 환경으로 옮길 때에는 적용 조건이 그대로 유지되는지 확인한다.','오류를 고칠 때에는 틀린 용어만 바꾸지 말고 그 용어가 성립하는 조건과 근거까지 함께 바로잡는다.','새로운 사례를 만들 때에는 정의의 핵심 조건을 모두 만족하도록 형태·환경·기능을 구체화한다.','자료의 표현 효과와 정보의 정확성·공정성은 별개의 기준으로 평가한다.','둘 이상의 개념이 함께 작용할 때에는 각각의 기능과 선후 관계를 구분해 설명한다.','종합 판단에서는 주체, 대상, 적용 범위, 조건, 과정, 결과가 원자료와 모두 일치해야 한다.'][q];
  let text=`판단 기준: ${criterion} ‘${a.term}’의 뜻은 ${a.definition}. ‘${b.term}’의 뜻은 ${b.definition}. 자료에서는 ${f1} 또한 ${f2}`;
  while(text.length<330)text+=` 따라서 「${page.title}」의 개별 사례를 판단할 때에는 두 개념의 정의와 자료 속 근거를 직접 대응해야 한다.`;
  return text.slice(0,520);
}
function correctText(page,q){
  const a=concept(page,q),b=concept(page,q+1),f=fact(page,q),g=fact(page,q+2);
  const patterns=[
    `‘${a.term}’의 정의는 “${a.definition}”이며, 자료의 구체적인 표현이 이 조건에 해당하는지를 확인한다.`,
    `‘${a.term}’, ‘${b.term}’의 적용 대상과 기능을 각각 “${a.definition}”, “${b.definition}”이라는 기준으로 구별한다.`,
    `${f}라는 자료를 먼저 확인한 뒤 ‘${a.term}’의 성립 조건과 실제 결과를 차례로 대조한다.`,
    `‘${a.term}’ 개념을 판단할 때 ${f}를 근거로 삼고, 원인·과정·결과의 방향을 자료에 제시된 순서대로 설명한다.`,
    `${g}라는 사실은 ‘${a.term}’의 적용 범위를 구체화하는 근거이므로, 다른 환경에 적용할 때 조건의 유지 여부를 확인한다.`,
    `잘못된 분석을 고칠 때에는 ‘${a.term}’에 대한 설명을 ‘${b.term}’의 설명으로 단순 교체하지 않고, “${a.definition}”이라는 판단 기준까지 함께 바로잡는다.`,
    `‘${a.term}’의 새 사례를 만들려면 ${a.definition}이라는 조건을 만족하는 형태와 환경을 함께 제시해야 한다.`,
    `${f}의 표현 효과와 사실 정보의 정확성을 구분하여 평가하고, ‘${a.term}’의 기능이 실제 목적에 기여하는지 판단한다.`,
    `‘${a.term}’, ‘${b.term}’가 함께 작용하는 경우 각 기능을 분리하고, ${f}가 어느 단계의 근거인지 설명한다.`,
    `${f}와 ${g}를 종합하여 ‘${a.term}’의 주체·대상·조건·결과가 모두 일치하는 설명을 선택한다.`
  ];
  return tidy(patterns[q],158);
}
function distractors(page,q,correct){
  const a=concept(page,q),b=concept(page,q+1),c=concept(page,q+2),f=fact(page,q),g=fact(page,q+3);
  const context=['정의 적용 단계에서는','개념 비교 단계에서는','분석 절차를 따를 때에는','근거와 기능을 연결할 때에는','새 사례에 적용할 때에는','오류를 수정하는 과정에서는','사례를 구성하는 과정에서는','표현 효과를 평가할 때에는','복합 개념을 분석할 때에는','종합 판단 단계에서는'][q];
  const pool=[
    `‘${a.term}’ 개념의 정의를 “${b.definition}”로 바꾸고, ‘${b.term}’의 정의에는 “${a.definition}”를 배치하여 두 판단 기준을 서로 뒤바꾼다.`,
    `${f}를 ‘${b.term}’의 직접적인 결과로 분류하지만, ‘${a.term}’이 성립하기 위해 필요한 적용 환경은 다른 사례에서 가져온다.`,
    `‘${a.term}’의 정의 중 ${a.definition}이라는 조건은 유지하면서도, 자료의 실제 결과는 ‘${c.term}’의 기능으로 설명한다.`,
    `${g}를 근거로 ‘${b.term}’의 적용 범위를 정하지만, 선택지의 결론에서는 ‘${a.term}’의 대상과 기능을 같은 것으로 처리한다.`,
    `‘${a.term}’, ‘${b.term}’가 함께 나타난다고 보면서 두 현상의 선후 관계를 바꾸고, ${f}를 뒤 단계의 근거로 배치한다.`,
    `${f}의 표현 효과가 크다는 점을 근거로 ‘${a.term}’의 정확성이나 적절성도 성립한다고 판단하여 평가 기준을 합친다.`,
    `‘${a.term}’의 사례라고 분류한 뒤 ‘${b.term}’의 예외 조건을 적용하여, 기본형과 실제 형태가 서로 다른 층위에 놓이게 한다.`,
    `‘${c.term}’의 기능을 보완하기 위해 ‘${a.term}’ 관련 표현을 사용했다고 설명하지만, 자료에 제시된 생산 주체나 문법적 주체는 ‘${b.term}’의 대상으로 바꾼다.`
  ].map(x=>tidy(`${context} ${x}`,158));
  return unique(pool.filter(x=>x!==correct)).slice(q%3,q%3+4).concat(pool).filter((x,i,a)=>a.indexOf(x)===i).slice(0,4);
}
function explanation(page,q,text,correct){
  const a=concept(page,q),f=fact(page,q);
  if(correct)return `‘${a.term}’의 정확한 정의와 「${page.title}」의 구체적 근거를 같은 층위에서 대응하였다. ${f}라는 자료를 바탕으로 적용 조건과 결과를 바꾸지 않았으므로 적절하다.`;
  return `이 진술은 ${text}라고 보아 개념의 정의, 적용 환경, 분석 층위 가운데 하나 이상을 바꾸었다. 자료에서는 ‘${a.term}’의 정의를 “${a.definition}”로 이해해야 하며, ${f}라는 근거와 일치하는지도 확인해야 한다.`;
}
const STEMS=[
  p=>`「${p.title}」의 핵심 개념을 자료에 적용한 설명으로 가장 적절한 것은?`,
  p=>`「${p.title}」에서 서로 가까운 두 개념을 구별한 내용으로 가장 적절한 것은?`,
  p=>`<보기>의 분석 절차에 따라 「${p.title}」의 자료를 판단한 것으로 가장 적절한 것은?`,
  p=>`「${p.title}」의 구체적 근거와 개념의 기능을 연결한 것으로 가장 적절한 것은?`,
  p=>`<보기>의 조건을 「${p.title}」과 관련된 새로운 사례에 적용한 내용으로 가장 적절한 것은?`,
  p=>`「${p.title}」에 관한 학생의 잘못된 분석을 바르게 고친 것은?`,
  p=>`「${p.title}」의 개념을 활용하여 새 사례를 구성한 것으로 가장 적절한 것은?`,
  p=>`「${p.title}」의 표현 효과와 정보·문법적 정확성을 함께 평가한 것은?`,
  p=>`「${p.title}」에서 둘 이상의 개념이 작용하는 관계를 파악한 것으로 가장 적절한 것은?`,
  p=>`「${p.title}」의 자료를 종합적으로 이해한 내용으로 가장 적절한 것은?`
];
export function makeQuestions(page,pageIndex){
  return Array.from({length:10},(_,q)=>{
    const answer=(pageIndex*10+q)%5;
    const correct=correctText(page,q);
    const wrong=distractors(page,q,correct);
    const options=[];let w=0;
    for(let i=0;i<5;i++){const text=i===answer?correct:wrong[w++];options.push({text,correct:i===answer,explanation:explanation(page,q,text,i===answer)});}
    return {no:q+1,stem:STEMS[q](page),view:view(page,q),options};
  });
}
