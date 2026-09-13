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

  // 공개 페이지에서 출처·제작 메타로만 쓰인 쪽수 표시는 삭제한다.
  out = out.replace(/<small\b[^>]*>\s*(?:평가문제집|자습서)\s*\d+\s*[~～–—-]\s*\d+\s*쪽\s*<\/small>/gi, '');
  out = out.replace(/\s*·\s*(?:평가문제집|자습서)\s*\d+\s*[~～–—-]\s*\d+\s*쪽/gi, '');

  // 공개 문구에서 특정 부교재 이름은 드러내지 않고 자연스럽게 일반화한다.
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

  // 제작 과정이나 내부 편집 상태를 알리는 공개용 안내 문구는 제거한다.
  for (const phrase of editorialPhrases) {
    const esc = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`<p\\b[^>]*>[\\s\\S]*?${esc}[\\s\\S]*?<\\/p>`, 'gi'), '');
    out = out.replace(new RegExp(`<!--[\\s\\S]*?${esc}[\\s\\S]*?-->`, 'gi'), '');
  }

  // 흔히 남는 어색한 구두점과 공백을 정리한다.
  out = out.replace(/>\s*·\s*</g, '><');
  out = out.replace(/\s{3,}/g, '  ');
  return out;
}

const changed = [];
for (const name of targets) {
  const file = path.join(dir, name);
  const before = fs.readFileSync(file, 'utf8');
  const after = clean(before);
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
