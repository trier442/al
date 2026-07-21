import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const SOURCE=path.join(ROOT,'scripts','eonmae-c01-source.b64');
const OUTPUT=path.join(ROOT,'wordpress-content','2027-suteuk-eonmae-c01.html');
const EXPECTED='f4ccd8646ce25194d1f59003b04ac9d8b3f5ae192d3db9e0b056e7ee6161d2fc';

if(!fs.existsSync(SOURCE))throw new Error('C01 압축 원고를 찾지 못했습니다.');
const encoded=fs.readFileSync(SOURCE,'utf8').replace(/\s+/g,'');
const html=zlib.gunzipSync(Buffer.from(encoded,'base64')).toString('utf8');
const digest=crypto.createHash('sha256').update(html).digest('hex');
if(digest!==EXPECTED)throw new Error(`C01 원고 무결성 오류: ${digest}`);
if(!html.includes('data-manual-page="c01"')||!html.includes('data-manual-version="2026-07-21-v1"'))throw new Error('C01 수동 완성본 표식이 없습니다.');
fs.writeFileSync(OUTPUT,html,'utf8');
console.log(`C01 원문형 완성본 생성: ${html.length}자 / sha256 ${digest}`);
