import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const visibility=JSON.parse(fs.readFileSync(path.join(ROOT,'scripts','eonmae-visibility.json'),'utf8'));
const approved=[
  '2027-suteuk-eonmae-index.html',
  '2027-suteuk-eonmae-c01.html'
];
const errors=[];

if(visibility.hidden!==true)errors.push('전체 자동 게시 차단을 유지하려면 hidden은 true여야 합니다.');
if(visibility.mode!=='sequential')errors.push('mode가 sequential이 아닙니다.');
if(JSON.stringify(visibility.public_files)!==JSON.stringify(approved))errors.push('public_files가 현재 승인 목록과 다릅니다.');
if(visibility.expected_public_items!==2)errors.push('expected_public_items가 2가 아닙니다.');
if(visibility.expected_hidden_items!==41)errors.push('expected_hidden_items가 41이 아닙니다.');

const indexPath=path.join(ROOT,'wordpress-content',approved[0]);
const c01Path=path.join(ROOT,'wordpress-content',approved[1]);
for(const file of [indexPath,c01Path])if(!fs.existsSync(file))errors.push(`파일 누락: ${file}`);

if(fs.existsSync(indexPath)){
  const index=fs.readFileSync(indexPath,'utf8');
  if(!index.includes('data-eonmae-index="sequential"'))errors.push('순차 공개 목록 표식 누락');
  if(!index.includes('현재 1개'))errors.push('현재 공개 수 안내 누락');
  if(!index.includes('/2027-suteuk-eonmae-c01/'))errors.push('C01 링크 누락');
  if(/2027-suteuk-eonmae-(?:c0[2-7]|l\d{2}|m\d{2}|i\d{2}|p\d{2})\//.test(index))errors.push('미승인 단원 링크가 목록에 남아 있습니다.');
}
if(fs.existsSync(c01Path)){
  const c01=fs.readFileSync(c01Path,'utf8');
  if(!c01.includes('data-question-count="36"'))errors.push('C01 문항 수 표식 누락');
}

if(errors.length){
  console.error(`순차 공개 검증 실패 ${errors.length}건`);
  for(const e of errors)console.error(`- ${e}`);
  process.exit(1);
}
console.log('언어와 매체 순차 공개 검증 통과');
console.log('- 공개 승인: 통합 목록 + C01');
console.log('- 비공개 유지: 나머지 41개');
