import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const args = process.argv.slice(2);

function option(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const inputPath = option("--input", "/tmp/pdfs/2027-reading-answers-raw.txt");
const outputPath = option("--output", path.join(root, "scripts/data/2027-reading-source.json"));
const contentDir = option("--content-dir", path.join(root, "wordpress-content"));
const spacingHelper = option("--spacing-helper", path.join(root, "scripts/normalize-korean-spacing.py"));
const keywordHelper = option("--keyword-helper", path.join(root, "scripts/extract-korean-keywords.py"));
const pythonPath = option("--pythonpath", "/tmp/pydeps");

function htmlText(value) {
  return value
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|8216|8217);/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function currentTitle(number) {
  const file = path.join(contentDir, `2027-suteuk-reading-${String(number).padStart(2, "0")}.html`);
  const html = fs.readFileSync(file, "utf8");
  const match = html.match(/<!--\s*title:\s*\[2027 수능특강 독서\]\s*(.*?)\s*해설·요약 및 변형문제\s*-->/);
  if (!match) throw new Error(`${file}: 제목 메타데이터를 찾지 못했습니다.`);
  return match[1].trim();
}

function currentFlow(number) {
  const file = path.join(contentDir, `2027-suteuk-reading-${String(number).padStart(2, "0")}.html`);
  const html = fs.readFileSync(file, "utf8");
  const list = (html.match(/<ol class="flow">([\s\S]*?)<\/ol>/i) || [])[1] || "";
  return [...list.matchAll(/<li>([\s\S]*?)<\/li>/gi)].map((match) => htmlText(match[1]));
}

function currentTerms(number) {
  const file = path.join(contentDir, `2027-suteuk-reading-${String(number).padStart(2, "0")}.html`);
  const html = fs.readFileSync(file, "utf8");
  return [...html.matchAll(/<span class="kb-answer" hidden>([\s\S]*?)<\/span>/gi)]
    .map((match) => htmlText(match[1]))
    .filter((term) => term.length >= 2 && term.length <= 32 && !/(?:문단|해결 방안|중심으로|답[①②③④⑤]|해제)/.test(term));
}

function normalizeTitle(value) {
  return value
    .normalize("NFC")
    .replace(/[\s:：,·ㆍ\-–—「」『』〈〉《》()（）]/g, "")
    .replace(/및/g, "")
    .toLowerCase();
}

function isJunkLine(line) {
  return !line
    || /^\d{2}\s+본문\s+\d+(?:~\d+)?쪽(?:\s+.*)?$/.test(line)
    || /^\d+\s+2027학년도 EBS 수능특강 독서$/.test(line)
    || /^27학년도 .*\.indd\s+\d+/.test(line)
    || /^정답과 해설\s*\d*$/.test(line)
    || /^지문으로 이해하기/.test(line)
    || /^\d{1,3}$/.test(line)
    || /^(?:인문·예술|사회·문화|과학·기술|통합|주제 통합|실전 학습)$/.test(line);
}

function joined(lines) {
  return lines
    .filter((line) => !isJunkLine(line))
    .join("")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:?!])/g, "$1")
    .trim();
}

function sectionStarts(lines) {
  const starts = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (/^■\s+/.test(lines[index])) {
      starts.push({ index, title: lines[index].replace(/^■\s+/, "").trim() });
      continue;
    }
    if (lines[index] === "페니실린" && lines[index + 1] === "가" && /^해제\s+/.test(lines[index + 2] || "")) {
      starts.push({ index, title: "페니실린" });
    }
  }
  return starts;
}

function isTopicLine(line) {
  return /^주제\s+/.test(line) && line !== "주제 통합";
}

function parseParts(lines) {
  const hejaeIndexes = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (/^해제\s+/.test(lines[index])) hejaeIndexes.push(index);
  }

  return hejaeIndexes.map((start, partIndex) => {
    const end = hejaeIndexes[partIndex + 1] ?? lines.length;
    let label = "";
    for (let cursor = start - 1; cursor >= 0 && cursor >= start - 4; cursor -= 1) {
      if (/^[가나다라마바사]$/.test(lines[cursor])) {
        label = lines[cursor];
        break;
      }
      if (!isJunkLine(lines[cursor])) break;
    }

    let topicIndex = -1;
    for (let cursor = start + 1; cursor < end; cursor += 1) {
      if (isTopicLine(lines[cursor])) {
        topicIndex = cursor;
        break;
      }
    }
    if (topicIndex < 0) throw new Error(`해제 뒤의 주제를 찾지 못했습니다: ${joined(lines.slice(start, Math.min(end, start + 12)))}`);

    let configIndex = -1;
    for (let cursor = topicIndex + 1; cursor < end; cursor += 1) {
      if (lines[cursor] === "구성") {
        configIndex = cursor;
        break;
      }
    }

    const summary = joined([lines[start].replace(/^해제\s+/, ""), ...lines.slice(start + 1, topicIndex)]);
    const topic = joined([
      lines[topicIndex].replace(/^주제\s+/, ""),
      ...lines.slice(topicIndex + 1, configIndex >= 0 ? configIndex : end),
    ]);
    const flow = [];
    if (configIndex >= 0) {
      let active = "";
      for (let cursor = configIndex + 1; cursor < end; cursor += 1) {
        const line = lines[cursor];
        if (isJunkLine(line)) continue;
        if (/^\d{2}\s+/.test(line) || /^정답이 정답인 이유/.test(line) || /^오답이 오답인 이유/.test(line)) break;
        if (/^[가나다라마바사]$/.test(line) && /^해제\s+/.test(lines[cursor + 1] || "")) break;
        const bullet = line.match(/^•\s*(\d+문단:\s*.*)$/);
        if (bullet) {
          if (active) flow.push(active);
          active = bullet[1];
        } else if (active && line !== "구성") {
          active += line;
        }
      }
      if (active) flow.push(active);
    }
    return { label, summary, topic, flow };
  });
}

function sentenceList(value) {
  return value
    .replace(/([.!?])\s+/g, "$1\n")
    .split(/\n+/)
    .map((sentence) => sentence.replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, "").trim())
    .filter(Boolean);
}

function factCandidates(sectionText, summaries) {
  const blocked = /(?:정답이 정답인 이유|오답이 오답인 이유|정답과 해설|예시 답안|선택지|적절하|적절하지|단어의 의미|답\s*[①②③④⑤]|본문\s*\d|\.indd|(?:^|\s)(?:해제|주제|구성)\s|[가나다]해제)/;
  const candidates = [...summaries.flatMap(sentenceList), ...sentenceList(sectionText)];
  const seen = new Set();
  const output = [];
  for (let candidate of candidates) {
    candidate = candidate
      .replace(/^\d{2}\s+[^.?!]{0,40}답\s*[①②③④⑤]\s*/, "")
      .replace(/^[①②③④⑤]\s*/, "")
      .replace(/^\(?[가나다]\)?의\s*\d+(?:,\s*\d+)*문단(?:에 따르면|에서)\s*,?\s*/, "")
      .replace(/^\d+(?:,\s*\d+)*문단(?:에 따르면|에서)\s*,?\s*/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (candidate.length < 28 || candidate.length > 220 || blocked.test(candidate)) continue;
    const key = candidate.replace(/[\s,.!?‘’“”'"()（）]/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(candidate);
    if (output.length >= 36) break;
  }
  return output;
}

function normalizeWithKiwi(values) {
  const result = spawnSync("python3", [spacingHelper], {
    input: JSON.stringify(values),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, PYTHONPATH: pythonPath },
  });
  if (result.status !== 0) {
    throw new Error(`한국어 띄어쓰기 정규화 실패:\n${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout);
}

function extractKeywords(records) {
  const payload = records.map((record) => ({
    title: record.title,
    summaries: record.parts.map((part) => part.summary),
    support: `${record.parts.map((part) => part.topic).join(" ")} ${record.parts.flatMap((part) => part.flow.map((item) => item.text)).join(" ")}`,
    seeds: record.keywordSeeds,
  }));
  const result = spawnSync("python3", [keywordHelper], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, PYTHONPATH: pythonPath },
  });
  if (result.status !== 0) throw new Error(`핵심어 추출 실패:\n${result.stderr || result.stdout}`);
  return JSON.parse(result.stdout);
}

const fixedTerms = [
  "월턴", "후설", "마리탱", "요하네스 메스너", "역선택", "세런디피티", "베타-락탐",
  "펩티도글리칸", "그람 양성균", "그람 음성균", "세포벽", "외막", "업로딩",
  "계산 기능주의", "리프로그래밍", "부분적 리프로그래밍", "야마나카 인자",
  "유도 만능 줄기세포", "보스트룀", "하디-바인베르크", "하이데거", "아비투스",
  "히스톤 아세틸화", "DNA 메틸화", "무모순성", "초소수성", "표피 효과",
  "전략적 독서", "훑어보기", "질문하기", "확인하기", "재검토하기", "시각 바꾸기",
  "개밥바라기", "지시체", "가처분 소득", "한계 소비 성향", "항상 소득 이론",
  "생애 주기 이론", "라플라스 법칙", "계면 활성제", "벤 데이 도트", "형평사",
  "가상 메모리", "주기억 장치", "보조 기억 장치", "페이징", "페이지 교체",
  "정단 분열 조직", "슈트 정단 분열 조직", "뿌리 정단 분열 조직", "에너지 섭취량",
  "세균학자", "푸른곰팡이", "포도상구균", "영양액", "집락", "항박테리아",
  "줄기세포", "최적 조절법", "한계점", "차이 공간", "경계면", "최댓값",
  "세포 리프로그래밍", "Ⅱ형 폐포 세포", "양중 능력표", "브라시에", "상관주의",
  "롤런드", "샤드", "질점", "주파수", "상호 텍스트성", "조세 열거주의",
  "조세 포괄주의", "공화주의자", "성차별주의", "인종차별주의",
  "조건설", "합법칙적 조건설", "초전도체", "초유체", "좁은 의미의 법적 의제",
  "넓은 의미의 법적 의제", "전용된 독서 공간", "Ⅱ형 폐포 세포", "양자점", "코어",
  "양중 능력", "플레밍", "플로리", "몰리나", "사실론성의 원리", "이기론", "성리학",
  "안정 모멘트", "양중 모멘트", "평형추", "크레인 받침목",
];

function fuzzyTermPattern(term) {
  return term
    .split("")
    .map((character) => character === " " ? "\\s*" : character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s*");
}

function fixTechnicalSpacing(value, terms) {
  let output = value;
  const uniqueTerms = [...new Set([...fixedTerms, ...terms])]
    .filter((term) => term.length >= 2 && term.length <= 36)
    .sort((left, right) => right.length - left.length);
  for (const term of uniqueTerms) {
    output = output.replace(new RegExp(fuzzyTermPattern(term), "g"), term);
  }
  return output
    .replace(/\s*·\s*/g, "·")
    .replace(/(\d+)\s+(단계|문단|가지|개|년|회|강)/g, "$1$2")
    .replace(/해야한다고/g, "해야 한다고")
    .replace(/하려했다/g, "하려 했다")
    .replace(/하고자한다/g, "하고자 한다")
    .replace(/가능하게할/g, "가능하게 할")
    .replace(/드러내게하는/g, "드러내게 하는")
    .replace(/해야한다고/g, "해야 한다고")
    .replace(/하고있/g, "하고 있")
    .replace(/받지못/g, "받지 못")
    .replace(/하려하였다/g, "하려 하였다")
    .replace(/하고자하였다/g, "하고자 하였다")
    .replace(/수있/g, "수 있")
    .replace(/수없/g, "수 없")
    .replace(/뿐아니라/g, "뿐 아니라")
    .replace(/뿐만아니라/g, "뿐만 아니라")
    .replace(/야한다고/g, "야 한다고")
    .replace(/해야한다/g, "해야 한다")
    .replace(/하려고한다/g, "하려고 한다")
    .replace(/이루어져야한다/g, "이루어져야 한다")
    .replace(/야한다/g, "야 한다")
    .replace(/받도록하는/g, "받도록 하는")
    .replace(/하도록해/g, "하도록 해")
    .replace(/하도록한다/g, "하도록 한다")
    .replace(/하게하는/g, "하게 하는")
    .replace(/하게된다/g, "하게 된다")
    .replace(/하기도한다/g, "하기도 한다")
    .replace(/기도한다/g, "기도 한다")
    .replace(/않게하려고/g, "않게 하려고")
    .replace(/하려고한/g, "하려고 한")
    .replace(/해야함/g, "해야 함")
    .replace(/하고자함/g, "하고자 함")
    .replace(/하고자했/g, "하고자 했")
    .replace(/야하지만/g, "야 하지만")
    .replace(/려면\s*[‘“]/g, (match) => `${match.slice(0, 2)} ${match.slice(-1)}`)
    .replace(/줄이기는하겠지만/g, "줄이기는 하겠지만")
    .replace(/위태롭게한다/g, "위태롭게 한다")
    .replace(/(\d+)\s+세기/g, "$1세기")
    .replace(/(\d+)년\s+간/g, "$1년간")
    .replace(/(\d+)\s+배/g, "$1배")
    .replace(/(\d+)\s+항/g, "$1항")
    .replace(/(\d+)\s+(억|만|천|백|원|%)/g, "$1$2")
    .replace(/(\d+)\s+문\s*단/g, "$1문단")
    .replace(/자기장과 유도와 전류가/g, "자기장과 유도 전류가")
    .replace(/양자점은코어/g, "양자점은 코어")
    .replace(/효과가 없는 데, 그 이유/g, "효과가 없는데, 그 이유")
    .replace(/\s+/g, " ")
    .trim();
}

const raw = fs.readFileSync(inputPath, "utf8").normalize("NFC");
const lines = raw.split(/\r?\n/).map((line) => line.replace(/^\f/, "").trim());
const starts = sectionStarts(lines);
if (starts.length !== 72) throw new Error(`공식 해설 섹션 수가 72개가 아닙니다: ${starts.length}`);

const records = starts.map((start, index) => {
  const end = starts[index + 1]?.index ?? lines.length;
  const pageNumber = index + 1;
  const title = currentTitle(pageNumber);
  const titleMatches = start.title === "페니실린"
    ? /페니실린/.test(title)
    : normalizeTitle(start.title) === normalizeTitle(title);
  if (!titleMatches) throw new Error(`${pageNumber}번 제목 불일치: ${title} / ${start.title}`);
  const sectionLines = lines.slice(start.index + 1, end);
  const parts = parseParts(sectionLines);
  if (!parts.length) throw new Error(`${pageNumber}번 ${title}: 해제 없음`);
  return {
    number: pageNumber,
    title,
    officialHeading: start.title,
    parts,
    sectionText: joined(sectionLines),
    fallbackFlow: currentFlow(pageNumber),
    keywordSeeds: currentTerms(pageNumber),
  };
});

const strings = [];
const slots = [];
function addSlot(object, key, value) {
  slots.push({ object, key, index: strings.length });
  strings.push(value);
}
for (const record of records) {
  addSlot(record, "sectionText", record.sectionText);
  for (const part of record.parts) {
    addSlot(part, "summary", part.summary);
    addSlot(part, "topic", part.topic);
    for (let index = 0; index < part.flow.length; index += 1) {
      addSlot(part.flow, index, part.flow[index]);
    }
  }
}
const normalized = normalizeWithKiwi(strings);
for (const slot of slots) slot.object[slot.key] = normalized[slot.index];

for (const record of records) {
  const titleTerms = record.title.split(/(?:,|:|과 |와 | 및 |에 대한 |을 이용한 |의 )/).map((term) => term.trim()).filter(Boolean);
  const canonicalTerms = [...record.keywordSeeds, ...titleTerms];
  record.sectionText = fixTechnicalSpacing(record.sectionText, canonicalTerms);
  let flowIndex = 0;
  for (const part of record.parts) {
    part.summary = fixTechnicalSpacing(part.summary, canonicalTerms);
    part.topic = fixTechnicalSpacing(part.topic, canonicalTerms);
    part.flow = part.flow.map((item) => fixTechnicalSpacing(item, canonicalTerms));
    part.topic = part.topic.replace(/\s+\d{1,3}$/, "").trim();
    part.flow = part.flow.map((item) => item.replace(/^\d+\s*문단:\s*/, "").trim());
    if (!part.flow.length && record.fallbackFlow.length) {
      const expected = record.parts.length > 1
        ? record.fallbackFlow.filter((item) => item.startsWith(`(${part.label})`))
        : record.fallbackFlow;
      part.flow = expected.map((item) => item.replace(/^\([가나다]\)\s*/, "").replace(/^\d+문단:\s*/, "").trim());
    }
    part.flow = part.flow.map((text, index) => ({ paragraph: index + 1, text: text.replace(/^\d+\s*문단:\s*/, "").trim() }));
    flowIndex += part.flow.length;
  }
  record.factPool = factCandidates(record.sectionText, record.parts.map((part) => part.summary));
  delete record.sectionText;
  delete record.fallbackFlow;
}

const keywordPages = extractKeywords(records);
records.forEach((record, index) => { record.keywordCandidates = keywordPages[index]; });

const output = {
  source: "2027학년도 EBS 수능특강 독서 정답과 해설의 해제·주제·구성 대조본",
  generatedAt: new Date().toISOString(),
  pages: records,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ pages: records.length, parts: records.reduce((sum, record) => sum + record.parts.length, 0), output: outputPath }, null, 2));
