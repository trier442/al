const LABELS=['㉠','㉡','㉢','㉣','㉤'];
const ALPHA=['A','B','C','D','E'];
const HANGUL=['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ'];

function esc(value=''){
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
function plain(value=''){return String(value).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();}
function pick(list,start,count){const out=[];for(let i=0;i<count;i++)out.push(list[(start+i)%list.length]);return out;}
function clip(text,max=175){const s=String(text).replace(/\s+/g,' ').trim();if(s.length<=max)return s;const cut=s.slice(0,max);const p=Math.max(cut.lastIndexOf('다.'),cut.lastIndexOf('.'),cut.lastIndexOf(','));return (p>80?cut.slice(0,p+1):cut.slice(0,max-1))+'…';}
function answerAt(pageIndex,q){return (pageIndex*10+q)%5;}
function formFor(profile,q){return profile.forms[q%profile.forms.length];}
function stepFor(profile,q){return profile.steps[q%profile.steps.length];}
function fact(profile,i){const text=profile.facts[i%profile.facts.length];return {text,truth:true,why:`원문 정제표에서 “${text}”로 확인되는 내용과 일치한다.`};}
function trap(profile,i){const t=profile.traps[i%profile.traps.length];return {text:t.claim,truth:false,why:t.why};}
function decorate(text,sourceModel,q){return `${text} — ‘${sourceModel}’의 ${q+1}번째 변형에서는 자료의 주체·조건·기능·결과를 이 순서로 확인한 판단이다.`;}
function explanation(profile,q,item,sourceModel,isAnswer){
  const verdict=item.truth?'적절하다':'부적절하다';
  const role=isAnswer?'문항이 요구한 조건에 해당하므로 이 선택지가 정답이다.':'문항이 요구한 조건과 반대이므로 정답이 아니다.';
  const trapNote=item.truth
    ? '자료의 일부 표현만 떼어 다른 개념·기능으로 바꾸거나, 원인과 결과의 방향을 뒤집는 선지와 구별해야 한다.'
    : item.why;
  return `판정: ${verdict}. 근거: ${item.why} ${role} 원문형 함정: ${trapNote} 풀이 절차: ${stepFor(profile,q)} 이 문항은 ‘${sourceModel}’의 발문과 자료 배열을 따라 만든 변형문제이므로, 보기의 표지와 선택지의 분석 대상을 일대일로 대응해야 한다.`;
}
function finalize(profile,q,pageIndex,sourceModel,correctItem,distractors){
  const a=answerAt(pageIndex,q),opts=[];let di=0;
  for(let i=0;i<5;i++)opts.push(i===a?correctItem:distractors[di++]);
  return opts.map((item,i)=>({
    text:decorate(item.optionText||clip(item.text),sourceModel,q),
    correct:i===a,
    explanation:explanation(profile,q,item,sourceModel,i===a)
  }));
}
function sourceBadge(profile,model){return `<div class="source-kicker"><strong>원문 유형</strong> ${esc(model)} <span>교재 ${esc(profile.pages)}쪽</span></div>`;}
function stepsHtml(profile){return `<p class="judge-rule"><strong>원문형 검토 순서:</strong> ${esc(profile.steps.join(' → '))}</p>`;}
function factsBlock(profile,start=0){const rows=pick(profile.facts,start,5);return `<div class="source-material"><strong>자료의 핵심 근거</strong>${rows.map((x,i)=>`<p><b>${LABELS[i]}</b> ${esc(x)}</p>`).join('')}</div>`;}

function contentQuestion(page,profile,q,pageIndex,askCorrect){
  const model=formFor(profile,q),a=answerAt(pageIndex,q);
  const viewHtml=sourceBadge(profile,model)+`<p>${esc(profile.overview[q%profile.overview.length])}</p>`+factsBlock(profile,q)+stepsHtml(profile);
  const correct=askCorrect?fact(profile,q*2+1):trap(profile,q*2+1);
  const distractors=[];
  for(let i=0;i<4;i++)distractors.push(askCorrect?trap(profile,q+i+2):fact(profile,q+i+2));
  const options=finalize(profile,q,pageIndex,model,correct,distractors);
  return {sourceModel:model,sourcePages:profile.pages,archetype:askCorrect?'핵심 근거 선별형':'내용 이해 오류 찾기형',viewHtml,view:plain(viewHtml),options,
    stem:askCorrect?`「${page.title}」의 원문 자료와 판단 기준을 가장 정확하게 설명한 것은?`:`「${page.title}」의 원문 자료를 이해한 내용으로 적절하지 않은 것은?`};
}

function taggedQuestion(page,profile,q,pageIndex,askCorrect){
  const model=formFor(profile,q),rows=pick(profile.facts,q+1,5),a=answerAt(pageIndex,q);
  const viewHtml=sourceBadge(profile,model)+`<p>${esc(profile.overview[(q+1)%profile.overview.length])}</p><div class="tagged-list">${rows.map((x,i)=>`<p><b>${LABELS[i]}</b> ${esc(x)}</p>`).join('')}</div>`+stepsHtml(profile);
  const correct=askCorrect
    ? {text:rows[a],truth:true,why:`${LABELS[a]}의 자료인 “${rows[a]}”를 원문 정제표와 같은 기준으로 분석하였다.`,optionText:`${LABELS[a]}은 “${clip(rows[a],145)}”라는 내용과 정확히 대응한다.`}
    : {text:profile.traps[(q+1)%profile.traps.length].claim,truth:false,why:profile.traps[(q+1)%profile.traps.length].why,optionText:`${LABELS[a]}의 자료를 “${clip(profile.traps[(q+1)%profile.traps.length].claim,140)}”라고 분석한다.`};
  const distractors=[];
  for(let i=0;i<5;i++)if(i!==a){
    if(askCorrect){const t=profile.traps[(q+i+2)%profile.traps.length];distractors.push({text:t.claim,truth:false,why:t.why,optionText:`${LABELS[i]}의 자료를 “${clip(t.claim,140)}”라고 분석한다.`});}
    else distractors.push({text:rows[i],truth:true,why:`${LABELS[i]}의 자료인 “${rows[i]}”를 그대로 반영한 분석이다.`,optionText:`${LABELS[i]}은 “${clip(rows[i],145)}”라는 내용과 정확히 대응한다.`});
  }
  const options=finalize(profile,q,pageIndex,model,correct,distractors);
  return {sourceModel:model,sourcePages:profile.pages,archetype:askCorrect?'㉠~㉤ 기능 판단형':'㉠~㉤ 자료 분석형',viewHtml,view:plain(viewHtml),options,
    stem:askCorrect?`<보기>의 ㉠~㉤을 원문과 같은 방식으로 분석한 내용으로 가장 적절한 것은?`:`<보기>의 ㉠~㉤을 원문과 같은 방식으로 분석한 내용으로 적절하지 않은 것은?`};
}

function pairingQuestion(page,profile,q,pageIndex,variant='form-step'){
  const model=formFor(profile,q),a=answerAt(pageIndex,q);
  const forms=pick(profile.forms,q,5),steps=pick(profile.steps,q,5);
  const viewHtml=sourceBadge(profile,model)+`<p>${esc(profile.overview[q%profile.overview.length])}</p><div class="pairing-grid"><div><strong>자료 유형</strong>${forms.map((x,i)=>`<p><b>${ALPHA[i]}</b> ${esc(x)}</p>`).join('')}</div><div><strong>판단 기준</strong>${steps.map((x,i)=>`<p><b>${HANGUL[i]}</b> ${esc(x)}</p>`).join('')}</div></div>`+stepsHtml(profile);
  const correct={text:`${forms[a]} — ${steps[a]}`,truth:true,why:`자료 유형 ${ALPHA[a]}와 판단 기준 ${HANGUL[a]}은 원문 정제표에서 같은 분석 단계로 연결된다.`,optionText:`${ALPHA[a]}의 ‘${forms[a]}’와 ${HANGUL[a]}의 ‘${steps[a]}’을 연결한다.`};
  const distractors=[];
  for(let i=0;i<5;i++)if(i!==a){const wrong=(i+1)%5;distractors.push({text:`${forms[i]} — ${steps[wrong]}`,truth:false,why:`${forms[i]}의 실제 판단 기준은 “${steps[i]}”인데 “${steps[wrong]}”으로 바꾸어 연결했다.`,optionText:`${ALPHA[i]}의 ‘${forms[i]}’와 ${HANGUL[wrong]}의 ‘${steps[wrong]}’을 연결한다.`});}
  const options=finalize(profile,q,pageIndex,model,correct,distractors);
  return {sourceModel:model,sourcePages:profile.pages,archetype:variant==='table'?'검토표 완성형':'짝짓기·표 완성형',viewHtml,view:plain(viewHtml),options,
    stem:variant==='table'?`<검토표>의 자료 유형과 판단 기준을 바르게 연결한 것은?`:`「${page.title}」의 원문 문항 원형과 풀이 기준을 바르게 짝지은 것은?`};
}

function dialogueQuestion(page,profile,q,pageIndex){
  const model=formFor(profile,q),a=answerAt(pageIndex,q),f=pick(profile.facts,q,3);
  const viewHtml=sourceBadge(profile,model)+`<div class="source-dialogue"><p><b>선생님:</b> ${esc(profile.overview[q%profile.overview.length])}</p><p><b>학생 1:</b> ${esc(f[0])}</p><p><b>학생 2:</b> ${esc(f[1])}</p><p><b>선생님:</b> ${esc(f[2])} 이 기준까지 확인해 봅시다.</p></div>`+stepsHtml(profile);
  const t=profile.traps[(q+2)%profile.traps.length];
  const correct={text:t.claim,truth:false,why:t.why,optionText:`학생의 추가 판단: ${clip(t.claim,145)}`};
  const distractors=[];for(let i=0;i<4;i++){const x=fact(profile,q+i+2);distractors.push({...x,optionText:`학생의 추가 판단: ${clip(x.text,145)}`});}
  const options=finalize(profile,q,pageIndex,model,correct,distractors);
  return {sourceModel:model,sourcePages:profile.pages,archetype:'교사·학생 대화형',viewHtml,view:plain(viewHtml),options,
    stem:`<보기>의 교사·학생 대화를 이어 갈 내용으로 적절하지 않은 것은?`};
}

function sourceTargetQuestion(page,profile,q,pageIndex,askCorrect){
  const model=formFor(profile,q),a=answerAt(pageIndex,q),src=pick(profile.facts,q,4),target=pick(profile.facts,q+4,4);
  const viewHtml=sourceBadge(profile,model)+`<div class="source-compare"><div><h4>(가) 원자료</h4>${src.map((x,i)=>`<p><b>${LABELS[i]}</b> ${esc(x)}</p>`).join('')}</div><div><h4>(나) 적용·재구성 자료</h4>${target.map((x,i)=>`<p><b>${LABELS[i]}</b> ${esc(x)}</p>`).join('')}</div></div>`+stepsHtml(profile);
  const correct=askCorrect?fact(profile,q+5):trap(profile,q+3);
  correct.optionText=askCorrect?`(가)의 조건을 (나)에 적용하면 ${clip(correct.text,145)}`:`(가)를 (나)로 바꾸는 과정에서 ${clip(correct.text,145)}`;
  const distractors=[];
  for(let i=0;i<4;i++){
    const x=askCorrect?trap(profile,q+i+1):fact(profile,q+i+1);
    x.optionText=askCorrect?`(가)의 조건을 (나)에 적용하면 ${clip(x.text,145)}`:`(가)를 (나)로 바꾸는 과정에서 ${clip(x.text,145)}`;
    distractors.push(x);
  }
  const options=finalize(profile,q,pageIndex,model,correct,distractors);
  return {sourceModel:model,sourcePages:profile.pages,archetype:askCorrect?'새 자료 적용형':'원자료→적용 자료 비교형',viewHtml,view:plain(viewHtml),options,
    stem:askCorrect?`(가)의 원문 판단 기준을 (나)의 새로운 자료에 적용한 내용으로 가장 적절한 것은?`:`(가)를 바탕으로 (나)를 분석하거나 재구성한 내용으로 적절하지 않은 것은?`};
}

function synthesisQuestion(page,profile,q,pageIndex){
  const model=formFor(profile,q),viewHtml=sourceBadge(profile,model)+profile.overview.map(x=>`<p>${esc(x)}</p>`).join('')+factsBlock(profile,q+1)+stepsHtml(profile);
  const correct=trap(profile,q+4);correct.optionText=`원문 구조와 핵심 내용을 종합하면 ${clip(correct.text,145)}`;
  const distractors=[];for(let i=0;i<4;i++){const x=fact(profile,q+i+1);x.optionText=`원문 구조와 핵심 내용을 종합하면 ${clip(x.text,145)}`;distractors.push(x);}
  const options=finalize(profile,q,pageIndex,model,correct,distractors);
  return {sourceModel:model,sourcePages:profile.pages,archetype:'종합 추론형',viewHtml,view:plain(viewHtml),options,
    stem:`「${page.title}」의 원문 자료 구조와 핵심 판단을 종합한 내용으로 적절하지 않은 것은?`};
}

export function makeQuestions(page,pageIndex){
  const p=page.sourceProfile;if(!p)throw new Error(`${page.slug}: 원문 유형 정제표가 연결되지 않았습니다.`);
  const builders=[
    ()=>contentQuestion(page,p,0,pageIndex,false),
    ()=>taggedQuestion(page,p,1,pageIndex,false),
    ()=>pairingQuestion(page,p,2,pageIndex,'form-step'),
    ()=>dialogueQuestion(page,p,3,pageIndex),
    ()=>sourceTargetQuestion(page,p,4,pageIndex,true),
    ()=>contentQuestion(page,p,5,pageIndex,true),
    ()=>taggedQuestion(page,p,6,pageIndex,true),
    ()=>sourceTargetQuestion(page,p,7,pageIndex,false),
    ()=>pairingQuestion(page,p,8,pageIndex,'table'),
    ()=>synthesisQuestion(page,p,9,pageIndex)
  ];
  return builders.map((build,i)=>({no:i+1,...build()}));
}
