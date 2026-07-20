import fs from "node:fs";
import path from "node:path";
import { gunzipSync, gzipSync, inflateRawSync } from "node:zlib";

const dir = path.join(process.cwd(), "scripts", "hwajak-payload");
const files = ["part01.txt", "part02.txt", "part03.txt", "part04.txt", "part05.txt", "part06a.txt", "part06b.txt"];
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const chunks = files.map((file) => fs.readFileSync(path.join(dir, file), "utf8").trim());
const targetIndex = files.indexOf("part02.txt");
const target = chunks[targetIndex];
const matches = [...target.matchAll(/[^A-Za-z0-9+/=]+/g)];

const crcTable = Array.from({ length: 256 }, (_, number) => {
  let value = number;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function isValidData(data) {
  return Array.isArray(data) && data.length === 57 && data.every((article) =>
    article && typeof article === "object" &&
    typeof article.slug === "string" && article.slug.startsWith("2027-suteuk-hwajak-") &&
    typeof article.title === "string" && article.title.length >= 2 &&
    typeof article.summary === "string" && article.summary.length >= 650 &&
    Array.isArray(article.blankSpans) && article.blankSpans.length === 15 &&
    Array.isArray(article.flow) && article.flow.length === 4 &&
    Array.isArray(article.points) && article.points.length >= 10 &&
    Array.isArray(article.facts10) && article.facts10.length >= 10
  );
}

function writeCleanPayload(data) {
  const cleanJson = JSON.stringify(data);
  const cleanBase64 = gzipSync(Buffer.from(cleanJson, "utf8"), { level: 9 }).toString("base64");
  const baseSize = Math.floor(cleanBase64.length / files.length);
  let cursor = 0;
  files.forEach((file, index) => {
    const end = index === files.length - 1 ? cleanBase64.length : cursor + baseSize;
    fs.writeFileSync(path.join(dir, file), `${cleanBase64.slice(cursor, end)}\n`, "utf8");
    cursor = end;
  });
  const verified = JSON.parse(gunzipSync(Buffer.from(files.map((file) => fs.readFileSync(path.join(dir, file), "utf8").trim()).join(""), "base64")).toString("utf8"));
  if (!isValidData(verified)) throw new Error("재압축한 payload의 최종 검증에 실패했습니다.");
  return { cleanJsonLength: cleanJson.length, cleanBase64Length: cleanBase64.length };
}

if (matches.length === 0) {
  const data = JSON.parse(gunzipSync(Buffer.from(chunks.join(""), "base64")).toString("utf8"));
  if (!isValidData(data)) throw new Error("복원 불필요 상태이지만 게시글 데이터 구조가 올바르지 않습니다.");
  console.log("화작 압축 데이터는 이미 정상입니다.");
  process.exit(0);
}

if (matches.length !== 1 || matches[0][0].length !== 4) {
  throw new Error(`예상하지 못한 손상 패턴: ${matches.map((match) => `${match.index}:${JSON.stringify(match[0])}`).join(", ")}`);
}

const damaged = matches[0];
const prefix = target.slice(0, damaged.index);
const suffix = target.slice(damaged.index + damaged[0].length);
const successes = [];

for (const first of alphabet) {
  for (const second of alphabet) {
    const replacement = `${first}${second}`;
    const candidate = `${prefix}${replacement}${suffix}`;
    const candidateChunks = [...chunks];
    candidateChunks[targetIndex] = candidate;
    try {
      const decoded = Buffer.from(candidateChunks.join(""), "base64");
      if (decoded.length < 20 || decoded[0] !== 0x1f || decoded[1] !== 0x8b || decoded[3] !== 0) continue;
      const raw = inflateRawSync(decoded.subarray(10, -8));
      const json = raw.toString("utf8");
      if (Buffer.from(json, "utf8").length !== raw.length) continue;
      const data = JSON.parse(json);
      if (isValidData(data)) {
        const expectedCrc = decoded.readUInt32LE(decoded.length - 8);
        const expectedSize = decoded.readUInt32LE(decoded.length - 4);
        successes.push({
          replacement,
          data,
          jsonLength: json.length,
          crcMatch: crc32(raw) === expectedCrc,
          sizeMatch: (raw.length >>> 0) === expectedSize,
        });
      }
    } catch {
      // DEFLATE 본문과 57개 JSON 구조를 모두 통과한 후보만 채택합니다.
    }
  }
}

const exact = successes.filter((item) => item.crcMatch && item.sizeMatch);
if (exact.length !== 1) {
  throw new Error(`CRC·크기를 모두 통과한 후보가 1개여야 하지만 ${exact.length}개입니다. JSON 후보: ${successes.map((item) => `${item.replacement}(crc=${item.crcMatch},size=${item.sizeMatch})`).join(", ")}`);
}

const recovered = exact[0];
const clean = writeCleanPayload(recovered.data);
console.log(`화작 압축 데이터 복원 완료: index=${damaged.index}, damaged=${JSON.stringify(damaged[0])}, replacement=${recovered.replacement}, jsonLength=${recovered.jsonLength}, cleanBase64Length=${clean.cleanBase64Length}`);
