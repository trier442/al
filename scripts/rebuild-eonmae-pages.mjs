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
const MANUAL_SLUGS=new Set(['2027-suteuk-eonmae-c01']);
const files=fs.readdirSync(CONTENT)
  .filter(name=>/^2027-suteuk-eonmae-(?!index)(?:c|l|m|i|p)\d{2}\.html$/.test(name))
  .sort();

if(files.length!==42)throw new Error(`언어와 매체 개별 글이 42개여야 하지만 ${files.length}개입니다.`);

const pages=files.map((name,index)=>{
  const slug=name.replace(/\.html$/,'');
  const spec=overrideSpec(slug,map[slug]);
  const page=applyPageOverrides(extractPage(path.join(CONTENT,name),defs,spec,index));
  page.summary=makeSummary(page);
  page.questions=makeQuestions(page,index).map(question=>({
    ...question,
    stem:question.stem.includes(page.title)?question.stem:`「${page.title}」 ${question.stem}`
  }));
  return page;
});

// 수동 완성 단원은 범용 생성기가 덮어쓰지 않는다. 다만 통합 목록 생성을 위해 메타데이터는 읽는다.
const generated=pages.filter(page=>!MANUAL_SLUGS.has(page.slug));
renderPages(generated,CONTENT,ASSETS);
renderIndex(pages,CONTENT);
console.log(`2027 언어와 매체 범용 생성 ${generated.length}개와 수동 완성 ${MANUAL_SLUGS.size}개를 보존하여 통합 목록을 갱신했습니다.`);
