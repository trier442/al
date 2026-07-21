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
const SOURCE_PROFILES=Object.freeze({...decode('lang'),...decode('media')});
export function getSourceProfile(slug){
  const profile=SOURCE_PROFILES[slug];
  if(!profile)throw new Error(`${slug}: 원문형 문항 정제표가 없습니다.`);
  return JSON.parse(JSON.stringify(profile));
}
export function sourceProfileEntries(){
  return Object.entries(SOURCE_PROFILES).map(([slug,profile])=>[slug,JSON.parse(JSON.stringify(profile))]);
}
export const SOURCE_PROFILE_SLUGS=Object.freeze(Object.keys(SOURCE_PROFILES));
export const SOURCE_PROFILE_COUNT=SOURCE_PROFILE_SLUGS.length;
export function profileCount(){return SOURCE_PROFILE_COUNT;}
