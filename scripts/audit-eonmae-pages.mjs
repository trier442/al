import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'wordpress-content');
const files = fs.readdirSync(DIR)
  .filter((name) => /^2027-suteuk-eonmae-(?!index)[clmip]\d{2}\.html$/.test(name))
  .sort();

function plain(s='') {
  return String(s)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/\s+/g,' ').trim();
}
function count(src,re){ return [...src.matchAll(re)].length; }
function hash(s){ return crypto.createHash('sha1').update(s).digest('hex'); }

const rows=[];
const allStems=new Map();
const allOptions=new Map();
const allSolutions=new Map();
const allSummaryParas=new Map();
const answers={1:0,2:0,3:0,4:0,5:0};
const genericPhrases=[
  '이 단원의 핵심은',
  '서로 분리하여 외우는 것이 아니라 실제 자료의 어떤 부분이 각 개념의 조건을 만족하는지 확인하는 데 있다',
  '판단 과정은 ① 자료의 층위와 소통 상황 확인',
  '시험 직전에는 핵심어마다 ‘정의-판정 기준-대표 사례-주의할 예외’를 한 세트로 압축한다',
  '자료를 읽을 때 근거가 되는 부분에 밑줄을 긋고 선택지의 서술어와 정확히 대응시키면',
  '아래 문제는 원문 문항을 단순 재배열한 것이 아니라 같은 개념을 새로운 진술과 사례에 적용하도록 구성했다',
  '자료에서 기능과 적용 조건을 함께 확인해야 하는 핵심 개념'
];

for (const name of files){
  const html=fs.readFileSync(path.join(DIR,name),'utf8');
  const slug=name.replace(/\.html$/,'');
  const summary=html.match(/<div class="summary">([\s\S]*?)<\/div>/i)?.[1]||'';
  const summaryText=plain(summary);
  const points=html.match(/<div class="pointbox">([\s\S]*?)<\/div>/i)?.[1]||'';
  const keybox=html.match(/<div class="keybox">([\s\S]*?)<\/div>/i)?.[1]||'';
  const qs=[...html.matchAll(/<article class="q" data-answer="([1-5])">([\s\S]*?)<\/article>/gi)];
  const stems=[]; const options=[]; const solutions=[];
  for(const q of qs){
    answers[q[1]]++;
    const stem=plain(q[2].match(/<h3>([\s\S]*?)<\/h3>/i)?.[1]||'');
    stems.push(stem);
    allStems.set(stem,(allStems.get(stem)||0)+1);
    const opts=[...q[2].matchAll(/<button[^>]*class="choice"[^>]*>([\s\S]*?)<\/button>/gi)].map(m=>plain(m[1]).replace(/^\d+\s*/,''));
    options.push(...opts);
    for(const opt of opts) allOptions.set(opt,(allOptions.get(opt)||0)+1);
    const sol=plain(q[2].match(/<div class="solution">([\s\S]*?)<\/div>/i)?.[1]||'');
    if(sol){ solutions.push(sol); allSolutions.set(sol,(allSolutions.get(sol)||0)+1); }
  }
  const paragraphs=[...summary.matchAll(/<p>([\s\S]*?)<\/p>/gi)].map(m=>plain(m[1]));
  for(const p of paragraphs) if(p.length>80) allSummaryParas.set(p,(allSummaryParas.get(p)||0)+1);
  const genericHits=genericPhrases.filter(p=>html.includes(p));
  const glossaryGeneric=count(keybox,/자료에서 기능과 적용 조건을 함께 확인해야 하는 핵심 개념/g);
  const extreme=count(html,/(항상|오직|모두|절대|무조건|전혀|예외 없이|문맥과 상관없이 늘)/g);
  const title=plain(html.match(/<h1>([\s\S]*?)<\/h1>/i)?.[1]||'');
  rows.push({
    file:name,slug,title,
    summaryChars:summaryText.length,
    blanks:count(summary,/class="blank"/g),
    keyConcepts:count(keybox,/<li>/g),
    genericGlossaryDefinitions:glossaryGeneric,
    points:count(points,/<li>/g),
    questions:qs.length,
    choices:options.length,
    solutions:solutions.length,
    uniqueStems:new Set(stems).size,
    uniqueOptions:new Set(options).size,
    genericPhraseHits:genericHits.length,
    extremeExpressionHits:extreme,
    duplicateOptionsInsidePage:options.length-new Set(options).size,
    exactDuplicateQuestionBodies:qs.length-new Set(qs.map(q=>hash(plain(q[2])))).size
  });
}

const duplicateStems=[...allStems].filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]);
const duplicateOptions=[...allOptions].filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]);
const duplicateSolutions=[...allSolutions].filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]);
const duplicateSummaryParas=[...allSummaryParas].filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]);
const categoryCounts={};
for(const r of rows){ const k=r.file.match(/eonmae-([clmip])/)[1]; categoryCounts[k]=(categoryCounts[k]||0)+1; }
const totals={
  files:rows.length,
  categoryCounts,
  summaryMin:Math.min(...rows.map(r=>r.summaryChars)),
  summaryMax:Math.max(...rows.map(r=>r.summaryChars)),
  blanksMin:Math.min(...rows.map(r=>r.blanks)),
  blanksMax:Math.max(...rows.map(r=>r.blanks)),
  pointsMin:Math.min(...rows.map(r=>r.points)),
  pointsMax:Math.max(...rows.map(r=>r.points)),
  questions:rows.reduce((a,r)=>a+r.questions,0),
  choices:rows.reduce((a,r)=>a+r.choices,0),
  solutions:rows.reduce((a,r)=>a+r.solutions,0),
  answers,
  repeatedStemTypes:duplicateStems.length,
  repeatedOptionTypes:duplicateOptions.length,
  repeatedSolutionTypes:duplicateSolutions.length,
  repeatedSummaryParagraphTypes:duplicateSummaryParas.length,
  pagesWithGenericGlossary:rows.filter(r=>r.genericGlossaryDefinitions>0).length,
  pagesWithNinePoints:rows.filter(r=>r.points===9).length,
  pagesWithFewerThan10Points:rows.filter(r=>r.points<10).length,
  pagesWithFewerThan10Blanks:rows.filter(r=>r.blanks<10).length,
  pagesWithGenericPhraseHitsAtLeast5:rows.filter(r=>r.genericPhraseHits>=5).length,
  pagesWithExtremeExpressions:rows.filter(r=>r.extremeExpressionHits>0).length,
};
const report={generatedAt:new Date().toISOString(),totals,rows,
  topDuplicateStems:duplicateStems.slice(0,30),
  topDuplicateOptions:duplicateOptions.slice(0,50),
  topDuplicateSolutions:duplicateSolutions.slice(0,20),
  topDuplicateSummaryParagraphs:duplicateSummaryParas.slice(0,20)};
fs.writeFileSync(path.join(ROOT,'scripts','eonmae-audit-report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(totals,null,2));
