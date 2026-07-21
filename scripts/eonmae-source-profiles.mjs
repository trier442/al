import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const DATA_DIR=path.join(path.dirname(fileURLToPath(import.meta.url)),'eonmae-source-data');
function readParts(prefix){
  return fs.readdirSync(DATA_DIR)
    .filter(name=>name.startsWith(prefix)&&name.endsWith('.b64'))
    .sort()
    .map(name=>fs.readFileSync(path.join(DATA_DIR,name),'utf8').trim())
    .join('');
}
function decode(prefix){
  return JSON.parse(gunzipSync(Buffer.from(readParts(prefix),'base64')).toString('utf8'));
}
function clone(value){return JSON.parse(JSON.stringify(value));}
function rewriteText(value){
  return String(value)
    .replaceAll('‘봄+이’이며','‘봄+이’로 분석되며')
    .replaceAll('‘오-+-면서’이며','‘오-+-면서’로 분석되며')
    .replaceAll('‘곳+곳+에’이며','‘곳+곳+에’로 분석되며')
    .replaceAll('‘꽃+내음+이’이며','‘꽃+내음+이’로 분석되며')
    .replaceAll('‘가득+하-+-다’이며','‘가득+하-+-다’로 분석되며')
    .replaceAll('실제 순서는 ‘만+이’이다.','실제 결합 순서에서는 보조사 ‘만’ 뒤에 주격 조사 ‘이’가 놓인다.')
    .replaceAll('민물로 무조건 씻는','민물로 곧바로 씻는')
    .replaceAll('‘인조 가죽이면 무조건 윤리적’','‘인조 가죽이라는 이유만으로 윤리적’')
    .replaceAll('기사에 전혀 언급되지 않은','기사에 언급되지 않은')
    .replaceAll('고려할 가치가 전혀 없다','고려할 가치가 없다')
    .replaceAll('리걸테크를 전혀 개발하지 않는','리걸테크를 개발하지 않는');
}
function normalize(profile,slug){
  const p=clone(profile);
  p.overview=p.overview.map(rewriteText);
  p.facts=p.facts.map(rewriteText);
  p.forms=p.forms.map(rewriteText);
  p.steps=p.steps.map(rewriteText);
  p.traps=p.traps.map(x=>({claim:rewriteText(x.claim),why:rewriteText(x.why)}));
  if(slug==='2027-suteuk-eonmae-i05'){
    p.facts[6]='자료에 제시되지 않은 평가 기준을 원문의 핵심 비교 근거로 추가하지 않는다.';
    p.traps[2]={claim:'원자료에 제시되지 않은 비용 자료를 핵심 비교 기준으로 삼는다.',why:'원자료에 제시되지 않은 기준을 핵심 근거로 추가한 판단이다.'};
  }
  return p;
}
const RAW_PROFILES={...decode('lang'),...decode('media')};
const SOURCE_PROFILES=Object.freeze(Object.fromEntries(Object.entries(RAW_PROFILES).map(([slug,profile])=>[slug,normalize(profile,slug)])));
export function getSourceProfile(slug){
  const profile=SOURCE_PROFILES[slug];
  if(!profile)throw new Error(`${slug}: 원문형 문항 정제표가 없습니다.`);
  return clone(profile);
}
export function sourceProfileEntries(){
  return Object.entries(SOURCE_PROFILES).map(([slug,profile])=>[slug,clone(profile)]);
}
export const SOURCE_PROFILE_SLUGS=Object.freeze(Object.keys(SOURCE_PROFILES));
export const SOURCE_PROFILE_COUNT=SOURCE_PROFILE_SLUGS.length;
export function profileCount(){return SOURCE_PROFILE_COUNT;}
