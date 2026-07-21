import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const DIR=path.join(ROOT,'wordpress-content');
const files=fs.readdirSync(DIR)
  .filter(name=>/^2027-suteuk-eonmae-(?:index|(?:c|l|m|i|p)\d{2})\.html$/.test(name))
  .sort();

if(files.length!==43)throw new Error(`언어와 매체 비공개 대상은 43개여야 하지만 ${files.length}개입니다.`);

let changed=0;
for(const name of files){
  const file=path.join(DIR,name);
  const raw=fs.readFileSync(file,'utf8');
  if(!/<!--\s*status:\s*[^>]+-->/i.test(raw))throw new Error(`${name}: status 메타데이터가 없습니다.`);
  let next=raw.replace(/<!--\s*status:\s*[^>]+-->/i,'<!-- status: draft -->');
  if(/<!--\s*visibility:\s*[^>]+-->/i.test(next)){
    next=next.replace(/<!--\s*visibility:\s*[^>]+-->/i,'<!-- visibility: hidden -->');
  }else{
    next=next.replace('<!-- status: draft -->','<!-- status: draft -->\n<!-- visibility: hidden -->');
  }
  if(next!==raw){fs.writeFileSync(file,next,'utf8');changed++;}
}

console.log(`언어와 매체 43개 원고를 draft/hidden으로 표시했습니다. 변경 ${changed}개`);
