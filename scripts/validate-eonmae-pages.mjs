import fs from 'node:fs';
import path from 'node:path';
import { SOURCE_PROFILE_SLUGS } from './eonmae-source-profiles.mjs';
const ROOT=process.cwd(),DIR=path.join(ROOT,'wordpress-content');
const map=JSON.parse(fs.readFileSync(path.join(ROOT,'scripts','eonmae-page-map.json'),'utf8'));
const files=fs.readdirSync(DIR).filter(n=>/^2027-suteuk-eonmae-(?!index)(?:c|l|m|i|p)\d{2}\.html$/.test(n)).sort();
const errors=[],answers={1:0,2:0,3:0,4:0,5:0},stems=new Map();let qTotal=0,choiceTotal=0,expTotal=0;
function count(s,re){return [...s.matchAll(re)].length;}
function text(s=''){return s.replace(/<[^>]+>/g,' ').replace(/&[^;]+;/g,' ').replace(/\s+/g,' ').trim();}
function sameSet(a,b){return a.length===b.length&&[...a].sort().every((v,i)=>v===[...b].sort()[i]);}
if(files.length!==42)errors.push(`개별 글 수 ${files.length}`);
if(SOURCE_PROFILE_SLUGS.length!==42)errors.push(`원문 정제표 수 ${SOURCE_PROFILE_SLUGS.length}`);
if(!sameSet(files.map(x=>x.replace(/\.html$/,'')),SOURCE_PROFILE_SLUGS))errors.push('게시 글과 원문 정제표 슬러그 불일치');
for(const name of files){
 const html=fs.readFileSync(path.join(DIR,name),'utf8'),slug=name.replace(/\.html$/,''),spec=map[slug];
 if(!spec){errors.push(`${slug}: 정제표 없음`);continue;}
 const summary=Number(html.match(/data-summary-chars="(\d+)"/)?.[1]||0);if(summary<850||summary>1250)errors.push(`${slug}: 요약 ${summary}자`);
 const blankAnswers=[...html.matchAll(/class="blank-answer" hidden>([\s\S]*?)<\/span>/g)].map(m=>text(m[1]));
 const summaryBlanks=blankAnswers.slice(0,15),flowAnswers=blankAnswers.slice(15,19);
 if(count(html,/class="blank"/g)!==15)errors.push(`${slug}: 핵심 빈칸 ${count(html,/class="blank"/g)}개`);
 if(count(html,/class="flowblank"/g)!==4)errors.push(`${slug}: 흐름 빈칸 오류`);
 if(!sameSet(summaryBlanks,spec.blanks))errors.push(`${slug}: 핵심 빈칸 정제표 불일치`);
 if(!sameSet(flowAnswers,spec.flow.map(x=>x.answer)))errors.push(`${slug}: 흐름 답 정제표 불일치`);
 if(!/data-source-faithful="true"/.test(html))errors.push(`${slug}: 원문형 템플릿 표식 없음`);
 if(!/data-source-pages="[^"]+"/.test(html))errors.push(`${slug}: 원문 쪽수 없음`);
 if(count(html,/class="source-form"/g)<4)errors.push(`${slug}: 원문 문항 원형 4개 미만`);
 if(count(html,/class="deep-explanation"/g)!==1)errors.push(`${slug}: 심층 해설 영역 오류`);
 if(count(html,/class="source-facts"/g)!==1||count(html,/class="trap-card"/g)<5)errors.push(`${slug}: 원문 근거·오답 함정 부족`);
 if(count(html,/class="solve-steps"/g)!==1)errors.push(`${slug}: 풀이 절차 없음`);
 const points=html.match(/<ol class="points">([\s\S]*?)<\/ol>/)?.[1]||'';if(count(points,/<li>/g)!==10)errors.push(`${slug}: 출제 포인트 오류`);
 const conceptsBlock=html.match(/<div class="concept-grid">([\s\S]*?)<\/div><h2>/)?.[1]||'';
 const conceptTerms=[...conceptsBlock.matchAll(/<div class="concept"><strong>([\s\S]*?)<\/strong>/g)].map(m=>text(m[1]));
 if(conceptTerms.length<5)errors.push(`${slug}: 개념 정의 부족`);
 if(!sameSet(conceptTerms,spec.concepts))errors.push(`${slug}: 핵심 개념 정제표 불일치`);
 if(/자료 A에 따르면|자료 B에 따르면|자료 C에 따르면|정의와 구체적인 자료 근거를 같은 분석 층위|기본형이나 원자료를 먼저 확인하고, 결합 환경/.test(html))errors.push(`${slug}: 기존 범용 생성 문구 잔존`);
 if(!/원문 유형 기반 변형문제 10제/.test(html))errors.push(`${slug}: 원문형 문제 제목 없음`);
 const qs=[...html.matchAll(/<section class="q" data-answer="([1-5])" data-q="(\d+)" data-source-model="([^"]+)" data-archetype="([^"]+)">([\s\S]*?)<\/section>/g)];
 if(qs.length!==10)errors.push(`${slug}: 문항 ${qs.length}개`);qTotal+=qs.length;
 const pageOptions=[],models=new Set(),archetypes=new Set();
 for(const m of qs){answers[m[1]]++;models.add(m[3]);archetypes.add(m[4]);const body=m[5],stem=text(body.match(/<h3>([\s\S]*?)<\/h3>/)?.[1]||'');stems.set(stem,(stems.get(stem)||0)+1);
   const view=Number(body.match(/data-view-chars="(\d+)"/)?.[1]||0);if(view<300)errors.push(`${slug} ${m[2]}번 보기 ${view}자`);
   if(!/원문 유형/.test(body)||!/(㉠|\(가\)|원자료|교사|자료 유형)/.test(body))errors.push(`${slug} ${m[2]}번 원문형 자료 구조 부족`);
   const opts=[...body.matchAll(/<button[^>]*class="choice"[^>]*>([\s\S]*?)<\/button>/g)].map(x=>text(x[1]));
   const exps=[...body.matchAll(/<div class="choice-exp [^"]+"[^>]*hidden><strong>[\s\S]*?<p>([\s\S]*?)<\/p><\/div>/g)].map(x=>text(x[1]));
   choiceTotal+=opts.length;expTotal+=exps.length;pageOptions.push(...opts);
   if(opts.length!==5)errors.push(`${slug} ${m[2]}번 선택지 ${opts.length}개`);if(exps.length!==5)errors.push(`${slug} ${m[2]}번 해설 ${exps.length}개`);
   if(new Set(opts).size!==opts.length)errors.push(`${slug} ${m[2]}번 선택지 중복`);
   opts.forEach((o,i)=>{if(o.length<45)errors.push(`${slug} ${m[2]}번 ${i+1} 선택지 짧음`);if(/항상|절대|무조건|전혀|예외 없이/.test(o))errors.push(`${slug} ${m[2]}번 극단 표현`);});
   exps.forEach((e,i)=>{if(e.length<150)errors.push(`${slug} ${m[2]}번 ${i+1} 해설 짧음 ${e.length}`);if(!/판정:/.test(e)||!/근거:/.test(e)||!/원문형 함정:/.test(e))errors.push(`${slug} ${m[2]}번 ${i+1} 판정·근거·함정 누락`);});
 }
 if(models.size<4)errors.push(`${slug}: 원문 문항 원형 ${models.size}종`);
 if(archetypes.size<8)errors.push(`${slug}: 변형 문항 유형 ${archetypes.size}종`);
 if(new Set(pageOptions).size<46)errors.push(`${slug}: 페이지 내 선택지 중복 과다 ${50-new Set(pageOptions).size}개`);
}
for(let i=1;i<=5;i++)if(answers[i]!==84)errors.push(`정답 ${i}번 ${answers[i]}개`);
if(qTotal!==420||choiceTotal!==2100||expTotal!==2100)errors.push(`전체 수량 ${qTotal}/${choiceTotal}/${expTotal}`);
const maxStem=Math.max(...stems.values());if(maxStem>1)errors.push(`동일 발문 최대 ${maxStem}회`);
const index=path.join(DIR,'2027-suteuk-eonmae-index.html');if(!fs.existsSync(index))errors.push('통합 목록 없음');else{const ix=fs.readFileSync(index,'utf8');if(!/원문형 통합 목록/.test(ix)||count(ix,/class="card"/g)!==42)errors.push('통합 목록 원문형 구성 오류');}
if(errors.length){console.error(`검증 실패 ${errors.length}건`);errors.slice(0,260).forEach(e=>console.error('- '+e));process.exit(1);}
console.log('언어와 매체 42개 원문형 게시글 검증 통과');console.log(`- 문항/선택지/선택지별 해설: ${qTotal}/${choiceTotal}/${expTotal}`);console.log(`- 정답 분포: ${JSON.stringify(answers)}`);console.log('- 원문 쪽수·문항 원형·심층 해설·풀이 절차·오답 함정·판정/근거/함정 검증 통과');
