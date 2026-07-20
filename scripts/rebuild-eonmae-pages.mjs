import fs from 'node:fs';
import path from 'node:path';
import { extractPage } from './eonmae-lib.mjs';
import { makeQuestions } from './eonmae-questions.mjs';
import { renderPages,renderIndex } from './eonmae-render.mjs';

const ROOT=process.cwd();
const CONTENT=path.join(ROOT,'wordpress-content');
const ASSETS=path.join(ROOT,'scripts','eonmae-assets');
const defs=JSON.parse(fs.readFileSync(path.join(ROOT,'scripts','eonmae-concepts.json'),'utf8'));
const files=fs.readdirSync(CONTENT).filter(name=>/^2027-suteuk-eonmae-(?!index)(?:c|l|m|i|p)\d{2}\.html$/.test(name)).sort();
if(files.length!==42)throw new Error(`언어와 매체 개별 글이 42개여야 하지만 ${files.length}개입니다.`);
const pages=files.map((name,index)=>extractPage(path.join(CONTENT,name),defs,index));
pages.forEach((page,index)=>{page.questions=makeQuestions(page,index);});
renderPages(pages,CONTENT,ASSETS);
renderIndex(pages,CONTENT);
console.log(`2027 언어와 매체 ${pages.length}개 글과 통합 목록을 재작성했습니다.`);
