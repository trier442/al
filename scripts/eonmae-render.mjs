import fs from 'node:fs';
import path from 'node:path';
import { esc,meta,read,groupOf } from './eonmae-lib.mjs';

const CIRCLED=['①','②','③','④','⑤'];
function blankSpans(text,terms){
  const occupied=[],out=[];
  for(const term of [...terms].sort((a,b)=>b.length-a.length)){
    let from=0,found=-1;
    while(true){
      const at=text.indexOf(term,from);if(at<0)break;
      const end=at+term.length;
      if(!occupied.some(([s,e])=>at<e&&end>s)){found=at;break;}
      from=at+1;
    }
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
  out.push(esc(page.summary.slice(cursor)));
  return out.join('');
}
function renderQuestion(q){
  const answer=q.options.findIndex(o=>o.correct)+1;
  const choices=q.options.map((o,i)=>`<button type="button" class="choice" data-choice="${i+1}"><span>${CIRCLED[i]}</span>${esc(o.text)}</button>`).join('');
  const explanations=q.options.map((o,i)=>`<div class="choice-exp ${o.correct?'correct-exp':'wrong-exp'}" data-choice="${i+1}" hidden><strong>${CIRCLED[i]} ${o.correct?'정답 해설':'오답 해설'}</strong><p>${esc(o.explanation)}</p></div>`).join('');
  return `<section class="q" data-answer="${answer}" data-q="${q.no}"><h3>${q.no}. ${esc(q.stem)}</h3><div class="view" data-view-chars="${q.view.length}"><strong>&lt;보기&gt;</strong><p>${esc(q.view)}</p></div><div class="choices">${choices}</div><p class="result" hidden aria-live="polite"></p><div class="choice-explanations" hidden>${explanations}</div></section>`;
}
function tipText(group){
  if(group==='개념 학습')return '핵심 용어의 정의와 성립 조건을 먼저 확인하고, 같은 자료를 설명하는 개념이라도 분석 층위와 적용 범위가 다른지 구별합니다.';
  if(group==='언어')return '분석 단위와 기본형을 확정한 뒤 결합 환경·문맥·적용 순서·실제 결과를 확인하고, 생략된 필수 성분도 문맥에서 복원합니다.';
  if(group==='매체')return '생산 목적과 예상 수용자를 확인하고, 문자·음성·영상·자막·배치의 기능과 정보의 정확성·출처·윤리성을 별도로 평가합니다.';
  if(group==='통합')return '원자료와 재구성 자료를 대응하여 핵심 정보의 유지·생략·추가·재배열, 수용자 참여 경로, 매체 변환의 적절성을 판단합니다.';
  return '언어 자료의 문법적 근거와 매체 자료의 표현 요소를 각각 분석한 뒤, 자료의 주체·대상·조건·결과를 바꾸지 않고 종합합니다.';
}

export function renderPages(pages,contentDir,assetsDir){
  const style=fs.readFileSync(path.join(assetsDir,'eonmae-style.css'),'utf8');
  const browser=fs.readFileSync(path.join(assetsDir,'eonmae-browser.js'),'utf8');
  for(const page of pages){
    const file=path.join(contentDir,`${page.slug}.html`),old=read(file);
    const revision=Number.parseInt(meta(old,'revision')||String(page.revision||1),10);
    const postId=meta(old,'post_id')||page.postId,type=meta(old,'type')||page.type||'page',categories=meta(old,'categories')||page.categories;
    const metadata=[
      `<!-- title: [2027 수능특강 언어와 매체] ${page.title} 해설 및 변형문제 -->`,
      `<!-- slug: ${page.slug} -->`,
      '<!-- status: publish -->',
      `<!-- type: ${type} -->`,
      categories?`<!-- categories: ${categories} -->`:'',
      `<!-- revision: ${Number.isFinite(revision)?revision+1:2} -->`,
      postId?`<!-- post_id: ${postId} -->`:'',
      `<!-- excerpt: 2027 수능특강 언어와 매체 ${page.crumb} ${page.title}의 상세 개념 설명, 클릭형 핵심어 15개, 분석 흐름 4개, 출제 포인트 10개, 변형문제 10제와 50개 선택지별 해설입니다. -->`
    ].filter(Boolean).join('\n');
    const premium=page.premiumUrl?`<aside class="premium"><strong>${esc(page.title)} 학습 자료</strong><a href="${esc(page.premiumUrl)}" target="_blank" rel="noopener noreferrer sponsored">추가 변형문제와 학습 자료 보기</a></aside>`:'';
    const flow=page.flow.map(f=>`<div class="flow-card"><strong>${esc(f.label)}</strong><button type="button" class="flowblank" aria-pressed="false"><span class="blank-mask">${'□'.repeat(Math.max(5,Math.min(14,[...f.answer].length)))}</span><span class="blank-answer" hidden>${esc(f.answer)}</span></button></div>`).join('');
    const concepts=page.concepts.map(c=>`<div class="concept"><strong>${esc(c.term)}</strong><span>${esc(c.definition)}</span></div>`).join('');
    const points=page.points.map(p=>`<li>${esc(p)}</li>`).join('');
    const questions=page.questions.map(renderQuestion).join('');
    const body=`${metadata}\n<style>${style}</style><main class="emx"><span class="crumb">${esc(page.crumb)}</span><h1>${esc(page.title)}</h1><section class="summary" data-summary-chars="${page.summary.length}"><h2>원문 없이 이해하는 상세 개념 설명</h2><p class="guide">네모 빈칸을 클릭하면 핵심 개념과 판단 기준이 나타납니다.</p><p>${renderSummary(page)}</p></section>${premium}<h2>분석 흐름 확인</h2><div class="flow-grid">${flow}</div><h2>핵심 개념 정확히 이해하기</h2><div class="concept-grid">${concepts}</div><h2>출제 포인트 10</h2><ol class="points">${points}</ol><div class="tip"><strong>판단 원칙</strong><br>${esc(tipText(page.group))}</div><h2>유형을 달리한 변형문제 10제</h2><p>선택지를 누르면 정오 판정과 다섯 선택지의 개별 해설이 모두 나타납니다.</p>${questions}${premium}<p class="indexlink"><a href="https://modukorean.co.kr/2027-수능특강-언어와-매체-전체-해설-및-변형-문제/">언어와 매체 전체 목록으로 돌아가기</a></p></main><script>${browser}</script>\n`;
    fs.writeFileSync(file,body,'utf8');
  }
}

export function renderIndex(pages,contentDir){
  const groups=['개념 학습','언어','매체','통합','실전 학습'];
  const cards=new Map(groups.map(g=>[g,[]]));
  for(const p of pages){
    const group=groupOf(p.crumb);
    cards.get(group).push(`<a class="card" data-key="${esc(`${p.title} ${p.crumb} ${p.concepts.map(c=>c.term).join(' ')}`)}" href="https://modukorean.co.kr/${p.slug}/"><small>${esc(p.crumb)}</small><strong>${esc(p.title)}</strong><span>교정 설명 · 빈칸 19개 · 변형문제 10제</span></a>`);
  }
  const oldFile=path.join(contentDir,'2027-suteuk-eonmae-index.html'),old=read(oldFile),revision=Number.parseInt(meta(old,'revision')||'1',10),postId=meta(old,'post_id');
  const metadata=['<!-- title: 2027 수능특강 언어와 매체 전체 해설 및 변형문제 -->','<!-- slug: 2027-수능특강-언어와-매체-전체-해설-및-변형-문제 -->','<!-- status: publish -->','<!-- type: page -->',`<!-- revision: ${Number.isFinite(revision)?revision+1:2} -->`,postId?`<!-- post_id: ${postId} -->`:'','<!-- excerpt: 2027 수능특강 언어와 매체 42개 단원의 교정된 상세 설명과 420개 변형문제 통합 목록입니다. -->'].filter(Boolean).join('\n');
  const sections=groups.map(g=>`<section class="group"><h2>${g} <small>(${cards.get(g).length}개)</small></h2><div class="grid">${cards.get(g).join('')}</div></section>`).join('');
  const css='.eix{max-width:1100px;margin:auto;line-height:1.65;color:#17211b}.hero{padding:30px;background:linear-gradient(135deg,#eaf7ee,#f8fbf9);border-radius:18px}.hero h1{margin:0 0 10px;color:#174b2b}.search{width:100%;padding:14px;margin:20px 0;border:2px solid #65a777;border-radius:10px;font-size:17px}.group{margin:35px 0}.group h2{color:#174b2b;border-bottom:3px solid #6ca77b;padding-bottom:8px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:13px}.card{display:block;padding:17px;border:1px solid #cedbd2;border-radius:12px;background:#fff;color:#17211b!important;text-decoration:none;box-shadow:0 3px 10px rgba(0,0,0,.04)}.card:hover{border-color:#2c7d48;transform:translateY(-2px)}.card small,.card span{display:block;color:#577064}.card strong{display:block;margin:5px 0}.note{padding:15px;background:#fff7e8;border-left:4px solid #e68724}.none{display:none;text-align:center;padding:30px}';
  const js="const i=document.getElementById('es'),cs=[...document.querySelectorAll('.card')],n=document.getElementById('none');i.addEventListener('input',()=>{const q=i.value.trim().toLowerCase();let k=0;cs.forEach(c=>{const s=!q||c.dataset.key.toLowerCase().includes(q);c.style.display=s?'block':'none';if(s)k++;});n.style.display=k?'none':'block';});";
  fs.writeFileSync(oldFile,`${metadata}\n<style>${css}</style><main class="eix"><header class="hero"><h1>2027 수능특강 언어와 매체 전체 통합 목록</h1><p>개념 학습 7개, 언어 15개, 매체 12개, 통합 6개, 실전 2개 등 총 42개 자료를 교정했습니다. 각 글에는 단원별 상세 설명, 클릭형 핵심어 15개, 분석 흐름 빈칸 4개, 핵심 개념 정의, 출제 포인트 10개, 변형문제 10제와 선택지별 해설이 수록되어 있습니다.</p></header><p class="note">단원명·문법 개념·매체 제재를 입력하면 해당 자료만 볼 수 있습니다.</p><input id="es" class="search" type="search" placeholder="예: 최소 대립쌍, 겹받침, 카드 뉴스, 아쿠아포닉스" aria-label="언어와 매체 자료 검색">${sections}<p id="none" class="none">검색 결과가 없습니다.</p></main><script>${js}</script>\n`,'utf8');
}
