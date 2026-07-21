import fs from 'node:fs';
import path from 'node:path';
import { esc,meta,read,groupOf } from './eonmae-lib.mjs';

const CIRCLED=['①','②','③','④','⑤'];
function blankSpans(text,terms){
  const occupied=[],out=[];
  for(const term of [...terms].sort((a,b)=>b.length-a.length)){
    let from=0,found=-1;
    while(true){const at=text.indexOf(term,from);if(at<0)break;const end=at+term.length;if(!occupied.some(([s,e])=>at<e&&end>s)){found=at;break;}from=at+1;}
    if(found<0)throw new Error(`상세 설명에서 핵심어를 찾지 못했습니다: ${term}`);
    occupied.push([found,found+term.length]);out.push({start:found,end:found+term.length,answer:term});
  }
  return out.sort((a,b)=>a.start-b.start);
}
function renderSummary(page){
  const spans=blankSpans(page.summary,page.blanks);let cursor=0;const out=[];
  for(const span of spans){
    out.push(esc(page.summary.slice(cursor,span.start)));
    const boxes='□'.repeat(Math.max(4,Math.min(14,[...span.answer].length)));
    out.push(`<button type="button" class="blank" aria-pressed="false" aria-label="핵심어 빈칸: 클릭하여 정답 보기"><span class="blank-mask">${boxes}</span><span class="blank-answer" hidden>${esc(span.answer)}</span></button>`);
    cursor=span.end;
  }
  out.push(esc(page.summary.slice(cursor)));return out.join('');
}
function renderSourceGuide(page){
  const p=page.sourceProfile;
  const forms=p.forms.map((f,i)=>`<div class="source-form"><span>${i+1}</span><strong>${esc(f)}</strong></div>`).join('');
  const overview=p.overview.map(x=>`<p>${esc(x)}</p>`).join('');
  const steps=p.steps.map((x,i)=>`<li><b>${i+1}단계</b> ${esc(x)}</li>`).join('');
  const traps=p.traps.map(x=>`<div class="trap-card"><strong>${esc(x.claim)}</strong><p>${esc(x.why)}</p></div>`).join('');
  const facts=p.facts.slice(0,10).map(x=>`<li>${esc(x)}</li>`).join('');
  return `<section class="source-guide" data-source-pages="${esc(p.pages)}"><div class="source-head"><span>수능특강 원문 ${esc(p.pages)}쪽</span><h2>원문 자료와 문항 구조</h2><p>이 글의 변형문제는 아래 원문형을 기준으로 자료·발문·선지 판단 방식을 재구성했습니다.</p></div><div class="source-forms">${forms}</div><h2>핵심 내용 해설</h2><div class="deep-explanation">${overview}</div><h3>원문 근거 10개</h3><ol class="source-facts">${facts}</ol><h2>원문형 문제 풀이 절차</h2><ol class="solve-steps">${steps}</ol><h2>자주 틀리는 오답 함정</h2><div class="trap-grid">${traps}</div></section>`;
}
function renderQuestion(q){
  const answer=q.options.findIndex(o=>o.correct)+1;
  const choices=q.options.map((o,i)=>`<button type="button" class="choice" data-choice="${i+1}"><span>${CIRCLED[i]}</span>${esc(o.text)}</button>`).join('');
  const explanations=q.options.map((o,i)=>`<div class="choice-exp ${o.correct?'correct-exp':'wrong-exp'}" data-choice="${i+1}" hidden><strong>${CIRCLED[i]} ${o.correct?'정답 해설':'오답 해설'}</strong><p>${esc(o.explanation)}</p></div>`).join('');
  return `<section class="q" data-answer="${answer}" data-q="${q.no}" data-source-model="${esc(q.sourceModel)}" data-archetype="${esc(q.archetype)}"><div class="qmeta"><span>원문 ${esc(q.sourcePages)}쪽</span><b>${esc(q.sourceModel)}</b><em>${esc(q.archetype)}</em></div><h3>${q.no}. ${esc(q.stem)}</h3><div class="view" data-view-chars="${q.view.length}"><strong>&lt;보기&gt;</strong>${q.viewHtml}</div><div class="choices">${choices}</div><p class="result" hidden aria-live="polite"></p><div class="choice-explanations" hidden>${explanations}</div></section>`;
}
export function renderPages(pages,contentDir,assetsDir){
  const style=fs.readFileSync(path.join(assetsDir,'eonmae-style.css'),'utf8');
  const browser=fs.readFileSync(path.join(assetsDir,'eonmae-browser.js'),'utf8');
  for(const page of pages){
    const file=path.join(contentDir,`${page.slug}.html`),old=read(file);
    const revision=Number.parseInt(meta(old,'revision')||String(page.revision||1),10);
    const postId=meta(old,'post_id')||page.postId,type=meta(old,'type')||page.type||'page',categories=meta(old,'categories')||page.categories;
    const metadata=[`<!-- title: [2027 수능특강 언어와 매체] ${page.title} 원문형 해설 및 변형문제 -->`,`<!-- slug: ${page.slug} -->`,`<!-- status: publish -->`,`<!-- type: ${type} -->`,categories?`<!-- categories: ${categories} -->`:'',`<!-- revision: ${Number.isFinite(revision)?revision+1:2} -->`,postId?`<!-- post_id: ${postId} -->`:'',`<!-- excerpt: 2027 수능특강 언어와 매체 ${page.crumb} ${page.title}의 원문 자료 구조, 심층 내용 해설, 풀이 절차, 오답 함정, 원문 유형 기반 변형문제 10제와 50개 선택지별 해설입니다. -->`].filter(Boolean).join('\n');
    const premium=page.premiumUrl?`<aside class="premium"><strong>${esc(page.title)} 학습 자료</strong><a href="${esc(page.premiumUrl)}" target="_blank" rel="noopener noreferrer sponsored">추가 변형문제와 학습 자료 보기</a></aside>`:'';
    const flow=page.flow.map(f=>`<div class="flow-card"><strong>${esc(f.label)}</strong><button type="button" class="flowblank" aria-pressed="false"><span class="blank-mask">${'□'.repeat(Math.max(5,Math.min(14,[...f.answer].length)))}</span><span class="blank-answer" hidden>${esc(f.answer)}</span></button></div>`).join('');
    const concepts=page.concepts.map(c=>`<div class="concept"><strong>${esc(c.term)}</strong><span>${esc(c.definition)}</span></div>`).join('');
    const points=page.points.map(p=>`<li>${esc(p)}</li>`).join('');
    const questions=page.questions.map(renderQuestion).join('');
    const body=`${metadata}\n<style>${style}</style><main class="emx" data-source-faithful="true"><span class="crumb">${esc(page.crumb)}</span><h1>${esc(page.title)}</h1><section class="summary" data-summary-chars="${page.summary.length}"><h2>핵심 개념 먼저 잡기</h2><p class="guide">네모 빈칸을 클릭하면 핵심 개념과 판단 기준이 나타납니다.</p><p>${renderSummary(page)}</p></section>${renderSourceGuide(page)}${premium}<h2>분석 흐름 확인</h2><div class="flow-grid">${flow}</div><h2>핵심 개념 정확히 이해하기</h2><div class="concept-grid">${concepts}</div><h2>출제 포인트 10</h2><ol class="points">${points}</ol><div class="tip"><strong>판단 원칙</strong><br>문항 제목만 보고 답을 고르지 말고, &lt;보기&gt;의 자료 형식과 원문 근거를 먼저 대응합니다. 언어는 형태·환경·기능·결과를, 매체는 원자료·재구성 자료·표현 요소·수용자 반응을 순서대로 확인합니다.</div><h2>원문 유형 기반 변형문제 10제</h2><p>각 문항은 해당 수능특강 단원의 원문 자료 구성과 발문 방식을 따라 새 사례로 변형했습니다. 선택지를 누르면 판정·근거·오답 함정이 모두 나타납니다.</p>${questions}${premium}<p class="indexlink"><a href="https://modukorean.co.kr/2027-수능특강-언어와-매체-전체-해설-및-변형-문제/">언어와 매체 전체 목록으로 돌아가기</a></p></main><script>${browser}</script>\n`;
    fs.writeFileSync(file,body,'utf8');
  }
}
export function renderIndex(pages,contentDir){
  const groups=['개념 학습','언어','매체','통합','실전 학습'];const cards=new Map(groups.map(g=>[g,[]]));
  for(const p of pages){const group=groupOf(p.crumb);cards.get(group).push(`<a class="card" data-key="${esc(`${p.title} ${p.crumb} ${p.concepts.map(c=>c.term).join(' ')} ${p.sourceProfile.forms.join(' ')}`)}" href="https://modukorean.co.kr/${p.slug}/"><small>${esc(p.crumb)} · 원문 ${esc(p.sourceProfile.pages)}쪽</small><strong>${esc(p.title)}</strong><span>원문 구조 해설 · 풀이 절차 · 오답 함정 · 원문형 변형문제 10제</span></a>`);}
  const oldFile=path.join(contentDir,'2027-suteuk-eonmae-index.html'),old=read(oldFile),revision=Number.parseInt(meta(old,'revision')||'1',10),postId=meta(old,'post_id');
  const metadata=['<!-- title: 2027 수능특강 언어와 매체 전체 원문형 해설 및 변형문제 -->','<!-- slug: 2027-수능특강-언어와-매체-전체-해설-및-변형-문제 -->','<!-- status: publish -->','<!-- type: page -->',`<!-- revision: ${Number.isFinite(revision)?revision+1:2} -->`,postId?`<!-- post_id: ${postId} -->`:'','<!-- excerpt: 2027 수능특강 언어와 매체 42개 단원을 원문 자료 형식과 발문 유형에 맞춰 해설하고 420개 원문형 변형문제로 구성한 통합 목록입니다. -->'].filter(Boolean).join('\n');
  const sections=groups.map(g=>`<section class="group"><h2>${g} <small>(${cards.get(g).length}개)</small></h2><div class="grid">${cards.get(g).join('')}</div></section>`).join('');
  const css='.eix{max-width:1100px;margin:auto;line-height:1.65;color:#17211b}.hero{padding:30px;background:linear-gradient(135deg,#eaf7ee,#f8fbf9);border-radius:18px}.hero h1{margin:0 0 10px;color:#174b2b}.search{width:100%;padding:14px;margin:20px 0;border:2px solid #65a777;border-radius:10px;font-size:17px}.group{margin:35px 0}.group h2{color:#174b2b;border-bottom:3px solid #6ca77b;padding-bottom:8px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:13px}.card{display:block;padding:17px;border:1px solid #cedbd2;border-radius:12px;background:#fff;color:#17211b!important;text-decoration:none;box-shadow:0 3px 10px rgba(0,0,0,.04)}.card:hover{border-color:#2c7d48;transform:translateY(-2px)}.card small,.card span{display:block;color:#577064}.card strong{display:block;margin:5px 0}.note{padding:15px;background:#fff7e8;border-left:4px solid #e68724}.none{display:none;text-align:center;padding:30px}';
  const js="const i=document.getElementById('es'),cs=[...document.querySelectorAll('.card')],n=document.getElementById('none');i.addEventListener('input',()=>{const q=i.value.trim().toLowerCase();let k=0;cs.forEach(c=>{const s=!q||c.dataset.key.toLowerCase().includes(q);c.style.display=s?'block':'none';if(s)k++;});n.style.display=k?'none':'block';});";
  fs.writeFileSync(oldFile,`${metadata}\n<style>${css}</style><main class="eix"><header class="hero"><h1>2027 수능특강 언어와 매체 원문형 통합 목록</h1><p>공식 교재의 단원별 원문 자료 구조와 발문 유형을 정제하여 42개 글을 다시 구성했습니다. 각 글에는 원문 쪽수와 문항 원형, 핵심 내용 심층 해설, 단계별 풀이 절차, 오답 함정, 원문 유형 기반 변형문제 10제와 선택지별 판정·근거가 수록되어 있습니다.</p></header><p class="note">단원명·문법 개념·매체 제재·원문 유형을 입력하면 해당 자료만 볼 수 있습니다.</p><input id="es" class="search" type="search" placeholder="예: 최소 대립쌍, 서술어 자릿수, 기사→포스터, 화상 회의" aria-label="언어와 매체 자료 검색">${sections}<p id="none" class="none">검색 결과가 없습니다.</p></main><script>${js}</script>\n`,'utf8');
}
