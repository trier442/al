import fs from 'node:fs';
import path from 'node:path';
import { extractPage, makeSummary } from './eonmae-lib.mjs';
import { makeQuestions } from './eonmae-questions.mjs';
import { renderPages, renderIndex } from './eonmae-render.mjs';
import { overrideSpec, applyPageOverrides } from './eonmae-overrides.mjs';

const ROOT=process.cwd();
const CONTENT=path.join(ROOT,'wordpress-content');
const ASSETS=path.join(ROOT,'scripts','eonmae-assets');
const defs=JSON.parse(fs.readFileSync(path.join(ROOT,'scripts','eonmae-concepts.json'),'utf8'));
const map=JSON.parse(fs.readFileSync(path.join(ROOT,'scripts','eonmae-page-map.json'),'utf8'));
const files=fs.readdirSync(CONTENT)
  .filter(name=>/^2027-suteuk-eonmae-(?!index)(?:c|l|m|i|p)\d{2}\.html$/.test(name))
  .sort();

if(files.length!==42)throw new Error(`언어와 매체 개별 글이 42개여야 하지만 ${files.length}개입니다.`);

const pages=files.map((name,index)=>{
  const slug=name.replace(/\.html$/,'');
  const spec=overrideSpec(slug,map[slug]);
  const page=applyPageOverrides(extractPage(path.join(CONTENT,name),defs,spec,index));
  page.summary=makeSummary(page);
  page.questions=makeQuestions(page,index);
  return page;
});

renderPages(pages,CONTENT,ASSETS);
renderIndex(pages,CONTENT);
console.log(`2027 언어와 매체 ${pages.length}개 글과 통합 목록을 교정 기준으로 재작성했습니다.`);
