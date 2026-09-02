import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const jobs = [
  {
    parts: [
      'scripts/complex02-gy-source.part01',
      'scripts/complex02-gy-source.part02',
      'scripts/complex02-gy-source.part03',
    ],
    output: 'wordpress-content/2027-suteuk-anonymous-gyenyeoga.html',
    sha: '311dad9db95066a00d5cf540a128cb1b6e99508d9124f60ced74123f9ccc2a5c',
  },
  {
    parts: [
      'scripts/complex02-sangron-source.part01',
      'scripts/complex02-sangron-source.part02',
      'scripts/complex02-sangron-source.part03',
    ],
    output: 'wordpress-content/2027-suteuk-jeong-yakyong-sangron.html',
    sha: '07e1a3bac1e302fdc8551e8851bf337d7c803bf3afe9ce5b10484e56850f39ea',
  },
];

for (const job of jobs) {
  for (const file of job.parts) {
    if (!fs.existsSync(path.join(ROOT, file))) throw new Error(`원고 조각을 찾지 못했습니다: ${file}`);
  }
  const encoded = job.parts
    .map((file) => fs.readFileSync(path.join(ROOT, file), 'utf8'))
    .join('')
    .replace(/\s+/g, '');
  const html = zlib.gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8');
  const actual = crypto.createHash('sha256').update(html).digest('hex');
  if (actual !== job.sha) throw new Error(`${job.output}: sha256 불일치 ${actual}`);
  const quizCount = (html.match(/<section class="quiz"/g) || []).length;
  const choiceCount = (html.match(/class="choice"/g) || []).length;
  if (quizCount !== 10) throw new Error(`${job.output}: 변형문제 ${quizCount}개`);
  if (choiceCount !== 50) throw new Error(`${job.output}: 선택지 ${choiceCount}개`);
  if (!html.includes('01 ② · 02 ④ · 03 ③ · 04 ④ · 05 ⑤ · 06 ⑤')) {
    throw new Error(`${job.output}: EBS 공식 정답 표식 누락`);
  }
  fs.writeFileSync(path.join(ROOT, job.output), html, 'utf8');
  console.log(`생성: ${job.output} / ${html.length}자 / ${actual}`);
}
