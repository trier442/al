import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const dir = path.join(process.cwd(), "scripts", "hwajak-payload");
const files = ["part01.txt", "part02.txt", "part03.txt", "part04.txt", "part05.txt", "part06a.txt", "part06b.txt"];
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const chunks = files.map((file) => fs.readFileSync(path.join(dir, file), "utf8").trim());
const targetIndex = files.indexOf("part02.txt");
const target = chunks[targetIndex];
const matches = [...target.matchAll(/[^A-Za-z0-9+/=]+/g)];

if (matches.length === 0) {
  const joined = chunks.join("");
  const data = JSON.parse(gunzipSync(Buffer.from(joined, "base64")).toString("utf8"));
  if (!Array.isArray(data) || data.length !== 57) throw new Error("복원 불필요 상태이지만 게시글 데이터가 57개가 아닙니다.");
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
    const candidate = `${prefix}${first}${second}${suffix}`;
    const candidateChunks = [...chunks];
    candidateChunks[targetIndex] = candidate;
    try {
      const json = gunzipSync(Buffer.from(candidateChunks.join(""), "base64")).toString("utf8");
      const data = JSON.parse(json);
      if (Array.isArray(data) && data.length === 57) {
        successes.push({ replacement: `${first}${second}`, candidate, jsonLength: json.length });
      }
    } catch {
      // gzip CRC와 JSON 파싱을 모두 통과한 후보만 채택합니다.
    }
  }
}

if (successes.length !== 1) {
  throw new Error(`복원 후보가 1개여야 하지만 ${successes.length}개입니다: ${successes.map((item) => item.replacement).join(", ")}`);
}

const recovered = successes[0];
fs.writeFileSync(path.join(dir, "part02.txt"), `${recovered.candidate}\n`, "utf8");
console.log(`화작 압축 데이터 복원 완료: index=${damaged.index}, damaged=${JSON.stringify(damaged[0])}, replacement=${recovered.replacement}, jsonLength=${recovered.jsonLength}`);
