import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'wordpress-content');
const targets = fs.readdirSync(dir)
  .filter(name => /^(cheonja-kimsuhak-common2|mirae-sinyusik-common2).*\.html$/i.test(name))
  .sort();

const editorialPhrases = [
  '편집 지침', '편집 원칙', '제작 지침', '제작 원칙', '검수 지침', '검수 기준',
  '전면 보강 완료', '전면 수정 완료', '최종 교정 완료'
];

function clean(text) {
  let out = text;

  // 공개 페이지에서 부교재명을 전제로 한 쪽수 표시는 삭제한다.
  out = out.replace(/<small\b[^>]*>\s*(?:평가문제집|자습서)\s*\d+\s*[~～–—-]\s*\d+\s*쪽\s*<\/small>/gi, '');
  out = out.replace(/\s*·\s*(?:평가문제집|자습서)\s*\d+\s*[~～–—-]\s*\d+\s*쪽/gi, '');

  // 특정 부교재 이름은 공개 문구에서 일반적인 학습 표현으로 바꾼다.
  out = out.replace(/교과서\s*·\s*교사용\s*자료\s*·\s*자습서\s*·\s*평가문제집의\s*실제\s*학습\s*흐름을\s*바탕으로/gi, '교과서의 학습 흐름을 바탕으로');
  out = out.replace(/교사용\s*교과서\s*·\s*지도서\s*·\s*자습서\s*·\s*평가문제집/gi, '교재');
  out = out.replace(/자습서\s*·\s*교사용\s*교과서\s*·\s*평가문제집/gi, '교재');
  out = out.replace(/자습서\s*·\s*평가문제집/gi, '교재');
  out = out.replace(/평가문제집\s*·\s*자습서/gi, '교재');
  out = out.replace(/자습서/gi, '교재');
  out = out.replace(/평가문제집/gi, '교재');
  out = out.replace(/교재\s*·\s*교재/gi, '교재');
  out = out.replace(/교재\s*범위에\s*맞춰/gi, '학습 범위에 맞춰');
  out = out.replace(/교재\s*범위에\s*맞추어/gi, '학습 범위에 맞추어');

  // 제작 과정이나 내부 편집 상태를 알리는 문구만 해당 문단 안에서 제거한다.
  for (const phrase of editorialPhrases) {
    const esc = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`<p\\b[^>]*>(?:(?!<\\/p>)[\\s\\S])*?${esc}(?:(?!<\\/p>)[\\s\\S])*?<\\/p>`, 'gi'), '');
    out = out.replace(new RegExp(`<!--(?:(?!-->)[\\s\\S])*?${esc}(?:(?!-->)[\\s\\S])*?-->`, 'gi'), '');
  }

  out = out.replace(/>\s*·\s*</g, '><');
  out = out.replace(/\s{3,}/g, '  ');
  return out;
}

function restoreIndexHeader(name, text) {
  if (name === 'cheonja-kimsuhak-common2-index.html') {
    const header = `<header class="hero">\n<h1>천재 김수학 공통국어2 통합 학습 목차</h1>\n<p class="lead"><strong>4개 대단원·15개 학습 자료</strong>를 교재 순서대로 정리했습니다. 작품·제재의 핵심을 먼저 익힌 뒤 클릭형 빈칸, 상세 해설, 출제 포인트, 단답형·객관식·서술형 문제로 바로 점검할 수 있습니다.</p>\n<div class="status"><div class="stat"><b>4</b>대단원</div><div class="stat"><b>15</b>학습 자료</div><div class="stat"><b>15</b>클릭형 핵심어/글</div><div class="stat"><b>20</b>출제 포인트/글</div></div>\n</header>`;
    return text.replace(/<header class="hero">[\s\S]*?<\/header>/i, header);
  }
  if (name === 'mirae-sinyusik-common2-index.html') {
    const header = `<header class="hero">\n<p><strong>2022 개정 · 고1 공통국어2 · 미래엔(신유식)</strong></p>\n<h1>미래엔 신유식 공통국어2 통합 학습 목차</h1>\n<p class="lead"><strong>5개 대단원·13개 학습 자료</strong>를 교재 순서대로 정리했습니다. 작품·제재의 핵심을 먼저 파악한 뒤 클릭형 핵심어, 상세 해설, 출제 포인트, 단답형·객관식·서술형 문제로 바로 점검할 수 있습니다.</p>\n<div class="status"><div class="stat"><b>5</b>대단원</div><div class="stat"><b>13</b>학습 자료</div><div class="stat"><b>15</b>클릭형 핵심어/글</div><div class="stat"><b>20</b>출제 포인트/글</div></div>\n</header>`;
    return text.replace(/<header class="hero">[\s\S]*?<\/header>/i, header);
  }
  return text;
}

const changed = [];
for (const name of targets) {
  const file = path.join(dir, name);
  const before = fs.readFileSync(file, 'utf8');
  const after = restoreIndexHeader(name, clean(before));
  if (after !== before) {
    fs.writeFileSync(file, after, 'utf8');
    changed.push(name);
  }
}

const banned = /(평가문제집|자습서|편집 지침|편집 원칙|제작 지침|제작 원칙|검수 지침|검수 기준|전면 보강 완료|전면 수정 완료|최종 교정 완료)/;
const remaining = [];
for (const name of targets) {
  const text = fs.readFileSync(path.join(dir, name), 'utf8');
  if (banned.test(text)) remaining.push(name);
}
if (remaining.length) {
  console.error('삭제 대상 문구가 남아 있는 파일:', remaining.join(', '));
  process.exit(1);
}

console.log(`공통국어2 공개 문구 정리 완료: ${changed.length}/${targets.length}개 파일 수정`);
if (changed.length) console.log(changed.join('\n'));
