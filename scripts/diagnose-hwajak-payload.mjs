import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const dir = path.join(process.cwd(), "scripts", "hwajak-payload");
const files = ["part01.txt", "part02.txt", "part03.txt", "part04.txt", "part05.txt", "part06a.txt", "part06b.txt"];
const chunks = [];

for (const file of files) {
  const value = fs.readFileSync(path.join(dir, file), "utf8").trim();
  const invalid = [];
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (!/[A-Za-z0-9+/=]/.test(char)) {
      invalid.push({
        index,
        char: JSON.stringify(char),
        code: `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`,
        context: JSON.stringify(value.slice(Math.max(0, index - 12), index + 13)),
      });
    }
  }
  console.log(`${file}: length=${value.length}, mod4=${value.length % 4}, start=${value.slice(0,16)}, end=${value.slice(-16)}, padding=${(value.match(/=+$/)||[''])[0].length}, invalid=${invalid.length}`);
  invalid.forEach((item) => console.log(`  invalid index=${item.index}, char=${item.char}, code=${item.code}, context=${item.context}`));
  chunks.push(value);
}

const joined = chunks.join("");
console.log(`joined: length=${joined.length}, mod4=${joined.length % 4}, start=${joined.slice(0,16)}, end=${joined.slice(-16)}`);
const decoded = Buffer.from(joined, "base64");
console.log(`decoded: bytes=${decoded.length}, header=${decoded.subarray(0,10).toString("hex")}, tail=${decoded.subarray(-12).toString("hex")}`);

try {
  const json = gunzipSync(decoded).toString("utf8");
  const data = JSON.parse(json);
  console.log(`gunzip joined success: jsonChars=${json.length}, articles=${data.length}`);
} catch (error) {
  console.error(`gunzip joined failed: ${error.code || error.name}: ${error.message}`);
}

try {
  const decodedParts = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk, "base64")));
  const json = gunzipSync(decodedParts).toString("utf8");
  const data = JSON.parse(json);
  console.log(`gunzip decoded-parts success: bytes=${decodedParts.length}, articles=${data.length}`);
} catch (error) {
  console.error(`gunzip decoded-parts failed: ${error.code || error.name}: ${error.message}`);
}
