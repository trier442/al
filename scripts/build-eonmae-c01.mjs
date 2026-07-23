import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const SOURCE=path.join(ROOT,'scripts','eonmae-c01-source.b64');
const OUTPUT=path.join(ROOT,'wordpress-content','2027-suteuk-eonmae-c01.html');
const EXPECTED='3c9ebc50f1d2bf743aca25a5bd73b5e2a8d853ec12b84b62cf19c38cac1ec6a6';

if(!fs.existsSync(SOURCE))throw new Error('C01 압축 원고를 찾지 못했습니다.');
const encoded=fs.readFileSync(SOURCE,'utf8').replace(/\s+/g,'');
const html=zlib.gunzipSync(Buffer.from(encoded,'base64')).toString('utf8');
const actual=crypto.createHash('sha256').update(html).digest('hex');
if(actual!==EXPECTED)throw new Error(`C01 원고 무결성 오류: ${actual}`);
if(!html.includes('data-manual-page="c01"')||!html.includes('data-manual-version="2026-07-23-v1"'))throw new Error('C01 수동 완성본 표식이 없습니다.');
fs.writeFileSync(OUTPUT,html,'utf8');
console.log(`C01 검수 완료본 생성: ${html.length}자 / sha256 ${actual}`);
