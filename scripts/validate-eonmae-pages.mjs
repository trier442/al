import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd(),DIR=path.join(ROOT,'wordpress-content');
const map=JSON.parse(fs.readFileSync(path.join(ROOT,'scripts','eonmae-page-map.json'),'utf8'));
const files=fs.readdirSync(DIR).filter(n=>/^2027-suteuk-eonmae-(?!index)(?:c|l|m|i|p)\d{2}\.html$/.test(n)).sort();
const errors=[],answers={1:0,2:0,3:0,4:0,5:0},stems=new Map();let qTotal=0,choiceTotal=0,expTotal=0;
function count(s,re){return [...s.matchAll(re)].length;}
function text(s=''){return s.replace(/<[^>]+>/g,' ').replace(/&[^;]+;/g,' ').replace(/\s+/g,' ').trim();}
function sameSet(a,b){return a.length===b.length&&[...a].sort().every((v,i)=>v===[...b].sort()[i]);}
if(files.length!==42)errors.push(`개별 글 수 ${files.length}`);
for(const name of files){
 const html=fs.readFileSync(path.join(DIR,name),'utf8'),slug=name.replace(/\.html$/,''),spec=map[slug];
 if(!spec){errors.push(`${slug}: 정제표 없음`);continue;}
 const summary=Number(html.match(/data-summary-chars="(\d+)"/)?.[1]||0);if(summary<850||summary>1100)errors.push(`${slug}: 요약 ${summary}자`);
 const blankAnswers=[...html.matchAll(/class="blank-answer" hidden>([\s\S]*?)<\/span>/g)].map(m=>text(m[1]));
 const summaryBlanks=blankAnswers.slice(0,15),flowAnswers=blankAnswers.slice(15,19);
 if(count(html,/class="blank"/g)!==15)errors.push(`${slug}: 핵심 빈칸 ${count(html,/class="blank"/g)}개`);
 if(count(html,/class="flowblank"/g)!==4)errors.push(`${slug}: 흐름 빈칸 오류`);
 if(!sameSet(summaryBlanks,spec.blanks))errors.push(`${slug}: 핵심 빈칸 정제표 불일치`);
 if(!sameSet(flowAnswers,spec.flow.map(x=>x.answer)))errors.push(`${slug}: 흐름 답 정제표 불일치`);
 const points=html.match(/<ol class="points">([\s\S]*?)<\/ol>/)?.[1]||'';if(count(points,/<li>/g)!==10)errors.push(`${slug}: 출제 포인트 오류`);
 const conceptsBlock=html.match(/<div class="concept-grid">([\s\S]*?)<\/div><h2>/)?.[1]||'';
 const conceptTerms=[...conceptsBlock.matchAll(/<div class="concept"><strong>([\s\S]*?)<\/strong>/g)].map(m=>text(m[1]));
 if(conceptTerms.length<5)errors.push(`${slug}: 개념 정의 부족`);
 if(!sameSet(conceptTerms,spec.concepts))errors.push(`${slug}: 핵심 개념 정제표 불일치`);
 if(conceptTerms.some(t=>/^\d+$/.test(t)||/[은는이가을를의에로도만]$/u.test(t)&&!spec.concepts.includes(t)))errors.push(`${slug}: 부적절한 핵심 개념`);
 if(/자료에서 기능과 적용 조건을 함께 확인해야 하는 핵심 개념|이 단원의 핵심은|시험 직전에는 핵심어마다|‘\d+’의 뜻/.test(html))errors.push(`${slug}: 기존 범용·숫자 문구 잔존`);
 const qs=[...html.matchAll(/<section class="q" data-answer="([1-5])" data-q="(\d+)">([\s\S]*?)<\/section>/g)];if(qs.length!==10)errors.push(`${slug}: 문항 ${qs.length}개`);qTotal+=qs.length;
 const pageOptions=[];
 for(const m of qs){answers[m[1]]++;const body=m[3],stem=text(body.match(/<h3>([\s\S]*?)<\/h3>/)?.[1]||'');stems.set(stem,(stems.get(stem)||0)+1);
  const view=Number(body.match(/data-view-chars="(\d+)"/)?.[1]||0);if(view<300)errors.push(`${slug} ${m[2]}번 보기 ${view}자`);
  const opts=[...body.matchAll(/<button[^>]*class="choice"[^>]*>([\s\S]*?)<\/button>/g)].map(x=>text(x[1]));const exps=[...body.matchAll(/<div class="choice-exp [^"]+"[^>]*hidden>/g)];choiceTotal+=opts.length;expTotal+=exps.length;pageOptions.push(...opts);
  if(opts.length!==5)errors.push(`${slug} ${m[2]}번 선택지 ${opts.length}개`);if(exps.length!==5)errors.push(`${slug} ${m[2]}번 해설 ${exps.length}개`);
  if(new Set(opts).size!==opts.length)errors.push(`${slug} ${m[2]}번 선택지 중복`);
  opts.forEach((o,i)=>{if(o.length<55)errors.push(`${slug} ${m[2]}번 ${i+1} 선택지 짧음`);if(/항상|절대|무조건|전혀|예외 없이|문맥과 상관없이 늘/.test(o))errors.push(`${slug} ${m[2]}번 극단 표현`);});
 }
 if(new Set(pageOptions).size!==50)errors.push(`${slug}: 페이지 내 선택지 중복 ${50-new Set(pageOptions).size}개`);
}
for(let i=1;i<=5;i++)if(answers[i]!==84)errors.push(`정답 ${i}번 ${answers[i]}개`);
if(qTotal!==420||choiceTotal!==2100||expTotal!==2100)errors.push(`전체 수량 ${qTotal}/${choiceTotal}/${expTotal}`);
const maxStem=Math.max(...stems.values());if(maxStem>1)errors.push(`동일 발문 최대 ${maxStem}회`);
if(!fs.existsSync(path.join(DIR,'2027-suteuk-eonmae-index.html')))errors.push('통합 목록 없음');
if(errors.length){console.error(`검증 실패 ${errors.length}건`);errors.slice(0,180).forEach(e=>console.error('- '+e));process.exit(1);}
console.log('언어와 매체 42개 게시글 검증 통과');console.log(`- 문항/선택지/선택지별 해설: ${qTotal}/${choiceTotal}/${expTotal}`);console.log(`- 정답 분포: ${JSON.stringify(answers)}`);
