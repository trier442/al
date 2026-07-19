import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contentDir = path.join(root, "wordpress-content");
const dataPath = path.join(root, "scripts/data/2027-reading-source.json");
const indexUrl = "https://modukorean.co.kr/2027-수능특강-독서-전체-지문-해설-및-변형-문제/";
const write = process.argv.includes("--write");
const source = JSON.parse(fs.readFileSync(dataPath, "utf8"));

const numerals = ["", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];
const optionNumerals = ["", "①", "②", "③", "④", "⑤"];
const stopWords = new Set([
  "이", "그", "글", "이글", "내용", "설명", "대해", "대한", "통해", "이를", "이러한", "따라",
  "경우", "것", "것은", "것을", "것이", "것으로", "있는", "있다", "한다", "하였다", "제시",
  "중심", "관련", "관계", "과정", "방법", "의의", "특징", "개념", "문제", "입장", "견해", "이론",
  "대한", "위한", "그리고", "그러나", "반면", "따라서", "또한", "먼저", "때문", "수", "등",
]);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlText(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
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

function metaValue(html, key) {
  const match = html.match(new RegExp(`<!--\\s*${key}\\s*:\\s*(.*?)\\s*-->`));
  return match ? match[1].trim() : "";
}

function metadata(html, page) {
  const keys = ["title", "slug", "post_id", "status", "type", "categories"];
  const lines = keys.map((key) => {
    const value = metaValue(html, key);
    return value ? `<!-- ${key}: ${value} -->` : "";
  }).filter(Boolean);
  lines.push("<!-- revision: 2 -->");
  lines.push(`<!-- excerpt: 2027 수능특강 독서 「${page.title}」 핵심 요약, 괄호형 10문제, 문단별 네모 빈칸, 출제 포인트 10개와 제시문 기반 변형문제 10제입니다. -->`);
  return `${lines.join("\n")}\n`;
}

function sentenceList(value) {
  return value
    .replace(/([.!?])\s+/g, "$1\n")
    .split(/\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function wordTokens(value) {
  return (value.match(/[A-Za-z0-9가-힣]+(?:[-–][A-Za-z0-9가-힣]+)*/g) || [])
    .map((token) => token.toLowerCase())
    .filter((token) => token.length >= 2 && !stopWords.has(token));
}

function tokenSet(value) {
  return new Set(wordTokens(value));
}

function overlapScore(left, right) {
  const a = tokenSet(left);
  const b = tokenSet(right);
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const token of a) if (b.has(token)) common += 1;
  return common / new Set([...a, ...b]).size;
}

function normalizeFact(value) {
  return value
    .replace(/^\(?[가나다]\)?의\s*\d+(?:,\s*\d+)*\s*문단(?:에 따르면|에서|을 통해)\s*,?\s*/, "")
    .replace(/^\d+(?:,\s*\d+)*\s*문단(?:에 따르면|에서|을 통해)\s*,?\s*/, "")
    .replace(/^한편\s+\d+\s*문단(?:에 따르면|에서)\s*,?\s*/, "")
    .replace(/^[㉠㉡㉢㉣㉤]은\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

const pointOverrides = new Map([
  [1, [
    "SQ3R은 글을 능동적으로 읽기 위한 전략적 독서 방법이다.",
    "SQ3R은 훑어보기, 질문하기, 읽기, 확인하기, 재검토하기의 다섯 단계로 진행된다.",
    "훑어보기에서는 제목과 목차 등을 살펴 글의 전체 구조를 예측한다.",
    "질문하기에서는 훑어본 내용을 바탕으로 읽기의 초점을 질문으로 만든다.",
    "읽기에서는 앞서 만든 질문의 답을 찾으며 글을 구체적으로 이해한다.",
    "확인하기에서는 핵심 내용을 자신의 말로 표현하거나 다른 사람의 답과 비교한다.",
    "재검토하기에서는 글 전체를 다시 훑고 이해가 불분명한 부분을 재확인한다.",
    "CSQ3R은 SQ3R에 저자의 관점에서 전달 방식을 생각하는 시각 바꾸기를 더한 방법이다.",
    "SQ3R과 CSQ3R은 필요에 따라 이전 단계로 돌아가며 배경지식을 활용할 수 있다.",
    "두 방법은 능동적 읽기 습관과 읽기에 대한 긍정적 인식을 형성하는 데 기여한다.",
  ]],
  [2, [
    "논리학은 사고의 오류를 피하고 올바르게 판단하는 방법을 체계적으로 연구한다.",
    "형식 논리학은 주장과 명제 사이의 논리적 연결 구조가 정합적인지를 중시한다.",
    "명제 논리는 참과 거짓을 판별할 수 있는 문장들의 결합 관계를 다룬다.",
    "술어 논리는 명제 내부의 구조를 분석하여 더 복잡한 관계를 표현한다.",
    "형식 논리학은 전제와 결론이 모순 없이 연결되는 무모순성을 판단 기준으로 삼는다.",
    "형식 논리학은 구조적 타당성을 분석하지만 논리 판단의 궁극적 근거는 밝히지 못한다.",
    "후설은 논리 판단이 인간 의식 속에서 구성되는 근원적 조건을 탐구했다.",
    "후설은 논리 규칙이 경험 이전의 선험적 구조에서 비롯된다고 보았다.",
    "선험적 논리학은 논리 판단을 단순한 기호 조작이 아닌 의식의 의미 구성 활동으로 이해한다.",
    "후설은 논리학을 인간 사고의 본질을 탐구하는 철학적 학문으로 확장하고자 했다.",
  ]],
  [9, [
    "인클루시브 디자인은 인간의 다양성을 폭넓게 수용하려는 설계 방식이다.",
    "기존 디자인은 미적 요소뿐 아니라 기능·사용성·상징성 등을 종합적으로 고려했다.",
    "기존 방식은 사용자 개개인의 특성을 충분히 반영하지 못해 일부 사용자를 소외시켰다.",
    "인클루시브 디자인은 이러한 소외 문제를 해결하기 위해 등장했다.",
    "인클루시브 디자인은 사용자의 물리적·사회적 조건과 무관한 이용 가능성을 추구한다.",
    "인클루시브 디자인은 모든 사용자가 인공물을 안전하고 편리하게 경험하도록 설계한다.",
    "특정 계층만 배려하는 데 그치지 않고 다양한 사용자를 설계 단계부터 고려한다.",
    "누구나 언제든 배제될 수 있다는 전제가 인클루시브 디자인의 출발점이다.",
    "복수의 사용 방식을 함께 제공하는 것은 접근성과 포용성을 높이는 방법이다.",
    "인클루시브 디자인의 궁극적 목적은 사용자 차이를 포용하고 배제를 줄이는 데 있다.",
  ]],
  [39, [
    "법적 의제는 사실이 아닌 것을 법적으로 사실인 것처럼 취급하는 장치이다.",
    "헨리 메인은 법적 의제를 좁은 의미와 넓은 의미로 구분하여 분석한다.",
    "메인은 법적 의제의 유용성을 인정한 블랙스톤의 평가에 동의한다.",
    "법적 의제는 법의 명시적 변화를 꺼리는 사회에서 법이 사회 변화에 적응하도록 돕는다.",
    "법적 의제는 사회의 진보 과정에서 법과 사회의 조화를 이끄는 기능을 수행한다.",
    "법적 의제는 사실과 법적 평가 사이의 불일치를 감수한다는 성격을 지닌다.",
    "유년기의 사회에서는 법적 의제가 변화에 대한 거부감을 극복하는 유용한 수단이 될 수 있다.",
    "성숙한 사회에서는 법적 의제가 오히려 법 체계의 혼란을 낳을 수 있다.",
    "근대적 법 체계에서 법적 의제는 개념을 체계적으로 분류하는 일을 저해할 수 있다.",
    "메인은 법적 의제의 역사적 유용성과 근대 법 체계에서의 한계를 함께 제시한다.",
  ]],
  [57, [
    "조세 법률주의는 세금의 부과와 징수가 반드시 법률에 근거해야 한다는 원칙이다.",
    "조세 열거주의는 법률에 명시된 사항만을 엄격하게 적용하여 과세하려는 입장이다.",
    "조세 포괄주의는 문언뿐 아니라 입법 취지와 과세 목적까지 종합하여 과세하려는 입장이다.",
    "현대 조세 실무에서는 조세 열거주의와 조세 포괄주의 사이의 균형이 요구된다.",
    "상속세는 사망한 사람의 재산이 상속인에게 이전될 때 부과되는 세금이다.",
    "상속세의 납세 의무는 원칙적으로 재산을 상속받는 사람에게 주어진다.",
    "증여세는 생존한 사람이 재산을 타인에게 무상으로 이전할 때 부과되는 세금이다.",
    "증여세의 납세 의무는 원칙적으로 재산을 받은 사람에게 주어지지만 예외가 있다.",
    "상속세와 증여세는 조세의 공평성과 부의 재분배를 실현하는 도구이다.",
    "상속세와 증여세는 본질적으로 유사하지만 부과 방식과 적용 기준에서 차이를 보인다.",
  ]],
  [64, [
    "세런디피티는 우연히 이루어졌지만 큰 파급 효과를 지닌 발견을 가리킨다.",
    "플레밍은 푸른곰팡이가 일으킨 항균 효과를 관찰하여 페니실린을 발견했다.",
    "플레밍은 페니실린의 임상적 가치를 낮게 평가하여 실용화 단계로 나아가지 않았다.",
    "플로리 연구 팀은 페니실린을 정제하고 대량 생산하는 방법을 찾아 상용화를 이끌었다.",
    "페니실린은 베타-락탐이라는 사각형 고리 구조를 지닌다.",
    "베타-락탐은 박테리아의 펩티도글리칸 합성을 방해한다.",
    "펩티도글리칸은 박테리아의 세포벽을 이루어 세포를 보호하는 중요한 성분이다.",
    "페니실린은 동물 세포에는 없는 펩티도글리칸을 표적으로 삼아 선택적으로 작용한다.",
    "페니실린은 세포벽의 펩티도글리칸에 작용하므로 그람 양성균에 효과를 낸다.",
    "그람 음성균은 외막이 페니실린의 작용을 차단하므로 페니실린의 효과가 제한된다.",
  ]],
  [70, [
    "계산 기능주의는 인간의 정신을 정보 구조와 계산 과정의 작동으로 이해한다.",
    "마음 업로딩은 기억과 자아를 구성하는 정보 패턴을 디지털 형태로 옮기는 기술이다.",
    "업로딩 옹호론은 정신을 뇌와 다른 물질적 기반에도 이전할 수 있다고 본다.",
    "업로딩이 성립하려면 자아를 이루는 심리적 특성이 손실 없이 보존되어야 한다.",
    "계산 기능주의의 관점에서는 업로딩이 신체적 죽음 이후의 생존 가능성을 열 수 있다.",
    "체화된 인지 이론은 정신이 뇌의 정보 처리만으로 성립한다는 관점을 비판한다.",
    "체화된 인지는 인지가 뇌뿐 아니라 신체 구조와 환경까지 포함한다고 본다.",
    "몸의 종류는 마음의 구조와 작동 방식에 중요한 차이를 만든다.",
    "신체가 달라지면 세계를 개념적으로 이해하는 방식도 달라질 수 있다.",
    "체화된 인지의 관점에서는 인간 정신을 다른 신체로 온전히 이전하거나 공유하기 어렵다.",
  ]],
]);

const keywordOverrides = new Map([
  [6, ["롤스", "공정", "특정 문화", "보편적 정의 원칙", "매킨타이어", "공동체", "덕", "실천", "공동체적 맥락", "덕목"]],
  [8, ["폐포", "신전성", "표면 장력", "라플라스 법칙", "반지름", "Ⅱ형 폐포 세포", "계면 활성제", "물 분자", "인력", "안정된 부피"]],
  [16, ["자연법", "보편적 도덕 규범", "실정법", "고대 스토아 학파", "중세 토마스 아퀴나스", "자크 마리탱", "내면적 질서", "요하네스 메스너", "사회적 현실", "보완적 관계"]],
  [20, ["성리학", "장재", "정이", "주희", "우주의 근원", "도덕 실천", "천인 합일", "인간 내면", "이기론", "철학적 체계"]],
  [31, ["디지털 금융", "착오 송금", "송금인", "은행", "수취인", "부당 이득 반환 청구", "민사상 반환 의무", "예금 보험 공사", "송금 반환 지원 제도", "공공 차원"]],
  [39, ["법적 의제", "헨리 메인", "사실이 아닌 것", "좁은 의미의 법적 의제", "넓은 의미의 법적 의제", "사회의 진보 과정", "법과 사회의 조화", "유용성", "근대적인 법 체계", "체계적 분류"]],
  [41, ["양자점 디스플레이", "전자", "에너지 변동 폭", "빛 에너지", "입자 크기", "에너지 밴드", "양자점", "코어", "리간드", "표면층"]],
  [50, ["CFC", "오존층 파괴", "남극 오존 구멍", "성층권", "태양 복사선", "몰리나", "롤런드", "염소 원자", "몬트리올 의정서", "사용 제한 조치"]],
  [56, ["상관주의", "사변적 실재론", "브라시에", "소멸 개념", "메이야수", "사실론성의 원리", "실재", "형이상학적 기반", "의미의 장", "매개 구조"]],
  [57, ["조세 법률주의", "세금 부과", "조세 열거주의", "조세 포괄주의", "현대 조세 실무", "상속세", "증여세", "납세 의무", "공평성", "부의 재분배"]],
  [61, ["조건설", "인과 관계", "발견 공식", "조건 공식", "택일적 인과 관계", "대안", "합법칙적 조건설", "합법칙적 조건 공식", "판단 과정", "사례"]],
  [64, ["세런디피티", "페니실린 발견", "플레밍", "푸른곰팡이", "항균 효과", "플로리", "베타-락탐", "펩티도글리칸", "그람 양성균", "그람 음성균"]],
  [68, ["오너스", "거시적 물리계", "양자 역학적 현상", "액체 헬륨", "수은", "절대 온도", "전기 저항", "초전도체", "상전이", "초유체"]],
]);

function selectPoints(page) {
  if (pointOverrides.has(page.number)) return pointOverrides.get(page.number);
  const core = page.parts.map((part) => `${part.summary} ${part.topic}`).join(" ");
  const blocked = /(?:정답|오답|선택지|적절하|적절하지|예시 답안|ⓐ|ⓑ|ⓒ|ⓓ|㉠|㉡|㉢|㉣|㉤|<보기>|질문|답을 찾|바꿔 쓸|뜻을 (?:지니|가지)|학생|그런데|제시하고 있지 않|설명하고 있지 않|말할 수 없|동의하지 않을|평가할 수 있|사용된 사례|[ABC]\s*(?:씨|국|기업|회사|교수|연구 팀))/;
  const primary = page.parts.flatMap((part) => sentenceList(part.summary));
  const extra = page.factPool.map(normalizeFact);
  const candidates = [...primary, ...extra]
    .filter((fact) => fact.length >= 26 && fact.length <= 210 && !blocked.test(fact))
    .filter((fact) => !/^\([가나다]\)(?:는|에서는|의)/.test(fact))
    .filter((fact) => !/^(?:이|그|이러한|이와 같은) 입장에서는/.test(fact))
    .filter((fact) => !/^[은는이가을를와과]\s+/.test(fact))
    .filter((fact) => !/^(?:이 글은|그러므로|따라서|즉)\s*$/.test(fact))
    .filter((fact) => overlapScore(fact, core) > 0);
  const selected = [];
  for (const fact of candidates) {
    if (selected.some((item) => item === fact || item.includes(fact) || fact.includes(item) || overlapScore(item, fact) > 0.86)) continue;
    selected.push(fact);
    if (selected.length === 10) break;
  }
  const flowFallback = page.parts.flatMap((part) => part.flow.map((item) => {
    const label = part.label ? `(${part.label}) ${item.paragraph}문단` : `${item.paragraph}문단`;
    return `${label}에서는 ${item.text}을 중심으로 내용을 전개한다.`;
  }));
  for (const fact of flowFallback) {
    if (selected.length === 10) break;
    if (!selected.some((item) => overlapScore(item, fact) > 0.72)) selected.push(fact);
  }
  if (selected.length < 10) throw new Error(`${page.number}번 ${page.title}: 출제 포인트를 10개 만들지 못했습니다.`);
  return selected.slice(0, 10);
}

function allOccurrences(text, term) {
  const output = [];
  for (let index = text.indexOf(term); index >= 0; index = text.indexOf(term, index + Math.max(1, term.length))) {
    const before = text[index - 1] || "";
    const after = text.slice(index + term.length);
    if (/[A-Za-z0-9가-힣]/.test(before)) continue;
    if (/^[A-Za-z0-9]/.test(after)) continue;
    if (/^[가-힣]/.test(after) && !/^(?:은|는|이|가|을|를|의|에|에서|에서의|에게|으로|로|와|과|도|만|부터|까지|보다|처럼|라고|이라고|이라는|라는|란|인|이다|이며|이나|나|들이|들을|에는|에서는|에게는|으로서|으로써)(?:\s|[,.;:!?]|$)/.test(after)) continue;
    output.push(index);
  }
  return output;
}

function termKey(value) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function conflictsWithTerms(key, usedTerms) {
  for (const used of usedTerms) {
    if (key === used) return true;
    if (/^[a-z0-9-]+$/.test(key) && /^[a-z0-9-]+$/.test(used)) continue;
    if (Math.min(key.length, used.length) >= 3 && (key.includes(used) || used.includes(key))) return true;
  }
  return false;
}

function candidateTerms(page) {
  const contexts = page.parts.map((part) => part.summary);
  const support = `${page.parts.map((part) => part.topic).join(" ")} ${page.parts.flatMap((part) => part.flow.map((item) => item.text)).join(" ")}`;
  const candidates = [];
  const add = (partIndex, start, term, score) => {
    term = term.trim().replace(/^[‘’“”"']+|[‘’“”"'.,;:!?]+$/g, "");
    if (term.length < 2 || term.length > 30 || stopWords.has(term.toLowerCase())) return;
    if (/^(?:이 글|이러한|그리고|그러나|따라서|반대로|반면|결국|더불어|먼저|마지막으로)/.test(term)) return;
    if (/^(?:적|속|경우|때)\s|적$/.test(term)) return;
    if (/^(?:가능|가능성|필요|한계|극복|정의|비판|관점|주장|발견|구조|방식|영향|활용|의미|요인|요인들|분야|응용|개념|개념들|이유|고려|측면|관심|시도|사람|사람들|전제|이해|발전|근거|설명들|걸음|각각|기존|사실|방향|분석|장치|방안|동시)$/.test(term)) return;
    if (/(?:개념과|의제와|욕구들 가운데|관계 속|공간 속|맥락 안|생계 경쟁 속)$/.test(term)) return;
    if (/(?:을|를|에서|으로|에게|부터|까지)$/.test(term)) return;
    if (/의$/.test(term) && !/(?:주의|의의|정의)$/.test(term)) return;
    if (/와$/.test(term) && !/효과$/.test(term)) return;
    if (/^(?:과|와)\s/.test(term)) return;
    if (/(?:하지만|하였고|하는|되는|있는|없는|따른|관한|관련지어|위해|유용성도|나름의)\b/.test(term)) return;
    if (/(?:하고|하였고|하였다|되었다|한다|라고|지만|으며|하여|이다|이며)$/.test(term)) return;
    if (/\s/.test(term) && /(?:하였다|하였고|한다|한다고|되었다|된다|였고|이다|있다|없다|하게|사실이|마치|유용성도)$/.test(term)) return;
    if (/[,.!?;:]/.test(term)) return;
    candidates.push({ partIndex, start, end: start + term.length, term, score });
  };

  contexts.forEach((text, partIndex) => {
    for (const keyword of keywordOverrides.get(page.number) || []) {
      for (const start of allOccurrences(text, keyword)) add(partIndex, start, keyword, 1000);
    }
    for (const [rank, keyword] of (page.keywordCandidates || []).entries()) {
      for (const start of allOccurrences(text, keyword)) add(partIndex, start, keyword, 600 - rank * 2 + Math.min(80, keyword.length * 8));
    }
    for (const seed of page.keywordSeeds || []) {
      for (const start of allOccurrences(text, seed)) add(partIndex, start, seed, 330);
    }
    for (const match of text.matchAll(/[‘“"]([^’”"]{2,30})[’”"]/g)) add(partIndex, match.index + 1, match[1], 290);
    const tokens = [...text.matchAll(/[A-Za-z0-9가-힣]+(?:[-–][A-Za-z0-9가-힣]+)*/g)].map((match) => ({ text: match[0], start: match.index, end: match.index + match[0].length }));
    for (let index = 0; index < tokens.length; index += 1) {
      for (let size = 1; size <= 1 && index + size <= tokens.length; size += 1) {
        const first = tokens[index];
        const last = tokens[index + size - 1];
        const between = text.slice(first.start, last.end);
        if (/[,;:!?()[\]{}]/.test(between) || /(?:지만|하며|하여|해서|되어|으로써|때문|위해|하였|하다고|하는|되는|있는|없는|같은|따른|관한|지어|면서)(?:\s|$)/.test(between)) continue;
        const firstWord = first.text.toLowerCase();
        const lastWord = last.text.toLowerCase();
        if (stopWords.has(firstWord) || stopWords.has(lastWord)) continue;
        let score = size * 16 + Math.min(18, between.length);
        if (support.includes(between)) score += 95;
        if (page.title.includes(between)) score += 85;
        if (/[A-Z0-9]/.test(between)) score += 35;
        const frequency = allOccurrences(contexts.join(" "), between).length;
        score += Math.min(50, frequency * 12);
        add(partIndex, first.start, between, score);
      }
    }
  });
  return candidates;
}

function selectKeywords(page) {
  const contexts = page.parts.map((part) => part.summary);
  const partOffsets = [];
  let total = 0;
  for (const context of contexts) {
    partOffsets.push(total);
    total += context.length + 1;
  }
  const candidates = candidateTerms(page).map((candidate) => ({
    ...candidate,
    globalStart: partOffsets[candidate.partIndex] + candidate.start,
    globalEnd: partOffsets[candidate.partIndex] + candidate.end,
  }));
  const selected = [];
  const usedTerms = new Set();
  candidates.sort((left, right) => right.score - left.score || right.term.length - left.term.length || left.globalStart - right.globalStart);
  for (const candidate of candidates) {
    if (selected.length === 10) break;
    const key = termKey(candidate.term);
    const available = !(candidate.score >= 900 ? usedTerms.has(key) : conflictsWithTerms(key, usedTerms)) && !selected.some((item) => candidate.globalStart < item.globalEnd && candidate.globalEnd > item.globalStart);
    if (!available) continue;
    const coveredPart = selected.filter((item) => item.partIndex === candidate.partIndex).length;
    const desiredForPart = Math.max(2, Math.round((contexts[candidate.partIndex].length / total) * 10));
    if (coveredPart >= desiredForPart && selected.length < 8 && contexts.length > 1) continue;
    selected.push(candidate);
    usedTerms.add(key);
  }
  if (selected.length < 10) {
    const zoneCandidates = [...candidates].sort((left, right) => left.globalStart - right.globalStart);
    for (let zone = 0; zone < 10 && selected.length < 10; zone += 1) {
      const target = ((zone + 0.5) / 10) * total;
      const available = zoneCandidates.filter((candidate) => {
      const key = termKey(candidate.term);
      return !(candidate.score >= 900 ? usedTerms.has(key) : conflictsWithTerms(key, usedTerms)) && !selected.some((item) => candidate.globalStart < item.globalEnd && candidate.globalEnd > item.globalStart);
      });
      available.sort((left, right) => Math.abs(left.globalStart - target) - Math.abs(right.globalStart - target) || right.score - left.score);
      if (!available.length) continue;
      const picked = available[0];
      selected.push(picked);
      usedTerms.add(picked.term.replace(/\s+/g, "").toLowerCase());
    }
  }
  if (selected.length !== 10) throw new Error(`${page.number}번 ${page.title}: 괄호형 핵심어가 ${selected.length}개입니다.`);
  return selected.sort((left, right) => left.globalStart - right.globalStart).map((item, index) => ({ ...item, number: index + 1 }));
}

function renderSummaryPart(text, keywords, partIndex) {
  const local = keywords.filter((item) => item.partIndex === partIndex).sort((left, right) => right.start - left.start);
  let output = text;
  for (const item of local) {
    const answer = escapeHtml(item.term);
    const blank = `<span class="paren-wrap">(<button type="button" class="study-blank paren-blank" aria-pressed="false" aria-label="${item.number}번 괄호 빈칸: 정답 보기"><span class="blank-mask">${numerals[item.number]}</span><span class="blank-answer" hidden>${answer}</span></button>)</span>`;
    output = `${output.slice(0, item.start)}${blank}${output.slice(item.end)}`;
  }
  return output;
}

function flowBlank(flowText, keywords) {
  const terms = keywords.map((item) => item.term).sort((left, right) => right.length - left.length);
  let answer = terms.find((term) => flowText.includes(term));
  if (!answer) {
    const tokens = wordTokens(flowText).filter((token) => token.length >= 2);
    answer = tokens.sort((left, right) => right.length - left.length)[0] || flowText.split(/\s+/)[0];
  }
  const start = flowText.indexOf(answer);
  const blank = `<button type="button" class="study-blank square-blank" aria-pressed="false" aria-label="문단 요약 네모 빈칸: 정답 보기"><span class="blank-mask">${"□".repeat(Math.min(6, Math.max(2, answer.length)))}</span><span class="blank-answer" hidden>${escapeHtml(answer)}</span></button>`;
  return start >= 0 ? `${escapeHtml(flowText.slice(0, start))}${blank}${escapeHtml(flowText.slice(start + answer.length))}` : `${blank} ${escapeHtml(flowText)}`;
}

function rotate(values, amount) {
  const offset = ((amount % values.length) + values.length) % values.length;
  return [...values.slice(offset), ...values.slice(0, offset)];
}

function placeOptions(options, correctIndex, seed) {
  const pairs = options.map((option, index) => ({ ...option, correct: index === correctIndex }));
  const rotated = rotate(pairs, seed % pairs.length);
  return { options: rotated, answer: rotated.findIndex((option) => option.correct) + 1 };
}

function distinctOptions(target, keywords, seed) {
  const pool = [target, ...rotate(keywords.map((item) => item.term).filter((term) => term !== target), seed)];
  return [...new Set(pool)].slice(0, 5);
}

function factForTerm(term, page, points) {
  return [...page.parts.flatMap((part) => sentenceList(part.summary)), ...points, ...page.factPool.map(normalizeFact)]
    .find((fact) => fact.includes(term) && fact.length <= 210) || page.parts.find((part) => part.summary.includes(term))?.summary || page.parts[0].summary;
}

function blankQuiz(number, stem, term, page, points, keywords) {
  const fact = factForTerm(term, page, points);
  const view = escapeHtml(fact).replace(escapeHtml(term), '<mark class="quiz-gap">(가)</mark>');
  const optionTerms = distinctOptions(term, keywords, number);
  const rawOptions = optionTerms.map((option) => ({
    text: option,
    note: option === term
      ? `보기의 문맥상 정답은 ‘${term}’이다.`
      : `‘${option}’도 제시문에 등장하지만, 이 빈칸의 정답은 ‘${term}’이다.`,
  }));
  const placed = placeOptions(rawOptions, optionTerms.indexOf(term), number * 2 + 1);
  return { number, stem, view, ...placed, ground: `보기의 빈칸 앞뒤 관계를 확인하면 정답은 ‘${term}’이다.` };
}

function recognitionQuiz(number, term, page, points, keywords) {
  const fact = factForTerm(term, page, points);
  const view = escapeHtml(fact).replace(escapeHtml(term), '<mark class="quiz-gap">(가)</mark>');
  const optionTerms = distinctOptions(term, keywords, number + 2);
  const rawOptions = optionTerms.map((option) => ({
    text: option,
    note: option === term
      ? `빈칸 앞뒤를 복원한 정답은 ‘${term}’이다.`
      : "이 선택지를 빈칸에 넣으면 제시문의 원문과 일치하지 않는다.",
  }));
  const placed = placeOptions(rawOptions, optionTerms.indexOf(term), number + 1);
  return {
    number,
    stem: "&lt;보기&gt;의 (가)에 들어갈 말로 가장 적절한 것은?",
    view,
    ...placed,
    ground: `제시문의 해당 문장을 복원하면 (가)는 ‘${term}’이다.`,
  };
}

function sequenceQuiz(number, page) {
  const flows = page.parts.flatMap((part) => part.flow.map((item) => ({
    text: `${part.label ? `(${part.label}) ` : ""}${item.paragraph}문단: ${item.text}`,
  })));
  while (flows.length < 3) flows.push({ text: page.parts[0].topic });
  const chosen = [flows[0], flows[Math.floor((flows.length - 1) / 2)], flows[flows.length - 1]];
  const shown = [chosen[1], chosen[0], chosen[2]];
  const labels = ["A.", "B.", "C."];
  const view = shown.map((item, index) => `${labels[index]} ${escapeHtml(item.text)}`).join("<br>");
  const correct = "B → A → C";
  const options = [correct, "A → B → C", "B → C → A", "C → A → B", "C → B → A"];
  const rawOptions = options.map((option) => ({
    text: option,
    note: option === correct ? `실제 전개 순서는 ${correct}이다.` : `실제 전개 순서인 ${correct}와 다르다.`,
  }));
  const placed = placeOptions(rawOptions, 0, number + 2);
  return { number, stem: "&lt;보기&gt;의 문단 핵심을 제시문의 전개 순서대로 배열한 것은?", view, ...placed, ground: `문단별 요약을 대조하면 ${correct}의 순서가 된다.` };
}

function flowEntries(page) {
  return page.parts.flatMap((part) => part.flow.map((item) => ({
    part: part.label,
    paragraph: item.paragraph,
    text: item.text,
    label: `${part.label ? `(${part.label}) ` : ""}${item.paragraph}문단`,
    summary: part.summary,
  })));
}

function pairTexts(left, right, alternatives) {
  const values = [...new Set([left, right, ...alternatives].filter(Boolean))];
  const pairs = [[left, right], [right, left], [left, values[2] || right], [values[2] || right, right], [values[3] || right, values[2] || left]];
  const output = [];
  for (const [first, second] of pairs) {
    const text = `(가) ${first} / (나) ${second}`;
    if (!output.includes(text)) output.push(text);
  }
  for (const first of values) {
    for (const second of values) {
      if (output.length >= 5) break;
      const text = `(가) ${first} / (나) ${second}`;
      if (!output.includes(text)) output.push(text);
    }
  }
  return output.slice(0, 5);
}

function paragraphMappingQuiz(number, page) {
  const flows = flowEntries(page);
  const left = flows[0];
  const right = flows[flows.length - 1];
  const alternatives = flows.slice(1, -1).map((item) => item.text).concat(page.parts.map((part) => part.topic));
  const correct = `(가) ${left.text} / (나) ${right.text}`;
  const texts = pairTexts(left.text, right.text, alternatives);
  const rawOptions = texts.map((text) => ({
    text,
    note: text === correct ? `두 자료는 각각 ${left.label}, ${right.label}의 핵심을 정확히 정리한다.` : `보기의 (가), (나)를 문단별 구성과 대조하면 내용 연결이 맞지 않는다.`,
  }));
  const placed = placeOptions(rawOptions, 0, number);
  return {
    number,
    stem: "&lt;보기&gt;의 (가), (나)를 문단별 핵심 내용과 바르게 연결한 것은?",
    view: `(가) ${escapeHtml(left.text)}<br><br>(나) ${escapeHtml(right.text)}`,
    ...placed,
    ground: `(가)는 ‘${left.text}’, (나)는 ‘${right.text}’에 해당한다.`,
  };
}

function topicQuiz(number, page) {
  const correct = page.parts.map((part) => `${part.label ? `(${part.label}) ` : ""}${part.topic}`).join(" / ");
  const partials = page.parts.flatMap((part) => part.flow.map((item) => `${part.label ? `(${part.label}) ` : ""}${item.text}`));
  const options = [correct, ...partials.filter((item) => item !== correct).slice(0, 4)];
  while (options.length < 5) options.push(`${page.title}에서 일부 개념만을 설명하는 글`);
  const rawOptions = options.slice(0, 5).map((text) => ({
    text,
    note: text === correct ? "제시문의 모든 핵심 내용을 포괄하는 중심 주제이다." : "제시문의 일부 문단만 설명하거나 전체 논지를 충분히 포괄하지 못한다.",
  }));
  const placed = placeOptions(rawOptions, 0, number + 3);
  const viewFacts = page.parts.map((part) => sentenceList(part.summary).slice(-2).join(" ")).join(" ");
  return { number, stem: "&lt;보기&gt;를 바탕으로 파악한 제시문의 중심 주제로 가장 적절한 것은?", view: escapeHtml(viewFacts), ...placed, ground: `전체 논지를 포괄하는 주제는 ‘${correct}’이다.` };
}

function titleQuiz(number, page) {
  const correct = page.title;
  const partials = flowEntries(page).map((item) => item.text).filter((text) => text !== correct);
  const options = [correct, ...new Set(partials)].slice(0, 5);
  while (options.length < 5) options.push(`${page.parts[0].topic}의 한 측면`);
  const rawOptions = options.map((text) => ({
    text,
    note: text === correct ? "보기의 핵심 범위와 논지 전체를 포괄하는 제목이다." : "보기의 일부 내용에만 해당하여 제시문 전체의 제목으로는 범위가 좁다.",
  }));
  const placed = placeOptions(rawOptions, 0, number + 3);
  const facts = page.parts.map((part) => sentenceList(part.summary).slice(0, 2).join(" ")).join(" ");
  return { number, stem: "&lt;보기&gt;의 내용을 포괄하는 제목으로 가장 적절한 것은?", view: escapeHtml(facts), ...placed, ground: `보기의 전체 내용을 가장 넓게 포괄하는 제목은 ‘${correct}’이다.` };
}

function pairedConceptQuiz(number, page, points, keywords) {
  let firstItem = keywords[7];
  let secondItem = keywords[8];
  outer: for (let left = 0; left < keywords.length; left += 1) {
    for (let right = left + 1; right < keywords.length; right += 1) {
      const leftFact = factForTerm(keywords[left].term, page, points);
      const rightFact = factForTerm(keywords[right].term, page, points);
      if (leftFact !== rightFact && overlapScore(leftFact, rightFact) < 0.68) {
        firstItem = keywords[left];
        secondItem = keywords[right];
        break outer;
      }
    }
  }
  const first = firstItem.term;
  const second = secondItem.term;
  const firstFact = factForTerm(first, page, points);
  const secondFact = factForTerm(second, page, points);
  const alternatives = keywords.map((item) => item.term).filter((term) => term !== first && term !== second);
  const correct = `A ${first} / B ${second}`;
  const texts = pairTexts(first, second, alternatives).map((text) => text.replace("(가)", "A").replace("(나)", "B"));
  const rawOptions = texts.map((text) => ({
    text,
    note: text === correct ? "A와 B의 정답을 정확히 짝지었다." : `자료의 핵심어 연결은 ${correct}이다.`,
  }));
  const placed = placeOptions(rawOptions, 0, number + 4);
  const firstView = escapeHtml(firstFact).replace(escapeHtml(first), '<mark class="quiz-gap">A</mark>');
  const secondView = escapeHtml(secondFact).replace(escapeHtml(second), '<mark class="quiz-gap">B</mark>');
  return { number, stem: "&lt;보기&gt;의 A, B에 들어갈 핵심어를 바르게 짝지은 것은?", view: `(가) ${firstView}<br><br>(나) ${secondView}`, ...placed, ground: `A와 B의 정답은 각각 ‘${first}’, ‘${second}’이다.` };
}

function integratedTopicQuiz(number, page) {
  const first = page.parts[0];
  const second = page.parts[1];
  const correct = `(가) ${first.topic} / (나) ${second.topic}`;
  const alternatives = first.flow.map((item) => item.text).concat(second.flow.map((item) => item.text));
  const texts = pairTexts(first.topic, second.topic, alternatives);
  const rawOptions = texts.map((text) => ({
    text,
    note: text === correct ? "(가), (나)의 핵심 내용을 각각 정확히 포괄한다." : "두 제시문의 주제를 서로 바꾸었거나 일부 문단의 내용으로 범위를 좁혔다.",
  }));
  const placed = placeOptions(rawOptions, 0, number + 2);
  const firstView = sentenceList(first.summary).slice(0, 2).join(" ");
  const secondView = sentenceList(second.summary).slice(0, 2).join(" ");
  return { number, stem: "&lt;보기&gt;의 (가), (나)의 중심 주제를 바르게 짝지은 것은?", view: `(가) ${escapeHtml(firstView)}<br><br>(나) ${escapeHtml(secondView)}`, ...placed, ground: `(가)와 (나)의 핵심 주제는 각각 ‘${first.topic}’, ‘${second.topic}’이다.` };
}

function makeQuizzes(page, points, keywords) {
  return [
    blankQuiz(1, "&lt;보기&gt;의 (가)에 들어갈 핵심어로 가장 적절한 것은?", keywords[0].term, page, points, keywords),
    recognitionQuiz(2, keywords[2].term, page, points, keywords),
    sequenceQuiz(3, page),
    paragraphMappingQuiz(4, page),
    titleQuiz(5, page),
    blankQuiz(6, "&lt;보기&gt;의 설명을 완성할 때 (가)에 들어갈 말로 가장 적절한 것은?", keywords[5].term, page, points, keywords),
    recognitionQuiz(7, keywords[7].term, page, points, keywords),
    blankQuiz(8, "&lt;보기&gt;에서 설명하는 원리·대상에 해당하는 핵심어는?", keywords[9].term, page, points, keywords),
    page.parts.length > 1 ? integratedTopicQuiz(9, page) : pairedConceptQuiz(9, page, points, keywords),
    topicQuiz(10, page),
  ];
}

function renderQuiz(quiz) {
  return `<section class="quiz" data-answer="${quiz.answer}"><h3>${quiz.number}. ${quiz.stem}</h3><div class="view"><strong>보기</strong><div>${quiz.view}</div></div><div class="choices">${quiz.options.map((option, index) => `<button type="button" class="choice" data-choice="${index + 1}">${optionNumerals[index + 1]} ${escapeHtml(option.text)}</button>`).join("")}</div><div class="feedback" role="status" aria-live="polite"></div><div class="solution"><p class="answer">정답 ${optionNumerals[quiz.answer]}</p><div class="answer-ground"><strong>정답 근거</strong><p>${escapeHtml(quiz.ground)}</p></div><ol class="option-notes">${quiz.options.map((option, index) => `<li><strong>${optionNumerals[index + 1]}</strong> ${escapeHtml(option.note)}</li>`).join("")}</ol></div></section>`;
}

function premiumInfo(html, page) {
  const anchors = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  const premium = anchors.find((anchor) => /contents\.premium\.naver\.com/.test(anchor[1]));
  return premium ? { url: premium[1], label: htmlText(premium[2]) } : { url: "", label: `${page.title} 변형문제 자료` };
}

const css = `<style>
.sut-read{--accent:#174f6d;--accent2:#2d789e;--soft:#eef7fb;--line:#c8d8df;max-width:920px;margin:0 auto;color:#17232a;font-size:17px;line-height:1.82;overflow-wrap:anywhere}.sut-read *{box-sizing:border-box}.read-hero{margin:0 0 18px;padding:28px;border:1px solid var(--line);border-radius:18px;background:linear-gradient(135deg,#eaf5fa,#fff)}.read-kicker{margin:0 0 6px;color:var(--accent);font-size:14px;font-weight:900}.read-hero h1{margin:5px 0 10px;color:#102f40;font-size:31px;line-height:1.35}.read-topic{margin:0;color:#425a66}.index-link{display:inline-block;margin-top:15px;padding:10px 14px;border-radius:9px;background:var(--accent);color:#fff!important;text-decoration:none;font-weight:800}.read-nav{position:sticky;top:0;z-index:20;display:flex;gap:8px;margin:0 0 24px;padding:10px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.96);box-shadow:0 6px 18px rgba(16,47,64,.08);overflow-x:auto}.read-nav a{flex:0 0 auto;padding:8px 11px;border-radius:8px;color:var(--accent)!important;text-decoration:none;font-size:14px;font-weight:800}.read-nav a:hover{background:var(--soft)}.sut-read h2{scroll-margin-top:88px;margin:40px 0 15px;padding:0 0 9px;border-bottom:3px solid var(--accent2);color:var(--accent);font-size:25px;line-height:1.4}.sut-read h3{color:#243f4d;line-height:1.55}.section-guide{margin:0 0 16px;color:#536a75}.part-card,.core-card{margin:15px 0;padding:20px;border:1px solid var(--line);border-radius:14px;background:#fff}.part-label{display:inline-block;margin:0 0 10px;padding:4px 10px;border-radius:14px;background:var(--accent);color:#fff;font-size:14px;font-weight:900}.core-summary{margin:0;text-align:justify}.study-blank{display:inline-block!important;width:auto!important;min-width:44px!important;margin:0 3px!important;padding:1px 8px!important;vertical-align:baseline!important;border:0!important;border-radius:6px!important;background:#fff!important;color:#111!important;font:inherit!important;font-weight:900!important;line-height:1.48!important;cursor:pointer!important}.paren-wrap{white-space:nowrap;color:var(--accent);font-weight:900}.paren-blank{min-width:38px!important;border-bottom:2px solid var(--accent2)!important;border-radius:3px!important;color:var(--accent)!important}.square-blank{border:2px dashed var(--accent2)!important;background:#fafdff!important}.study-blank:hover,.study-blank.revealed{background:#dff2fa!important;color:#0b577c!important}.blank-answer[hidden],.blank-mask[hidden]{display:none!important}.paragraph-list{list-style:none;margin:0;padding:0}.paragraph-list li{display:grid;grid-template-columns:88px 1fr;gap:12px;align-items:start;margin:10px 0;padding:15px;border:1px solid var(--line);border-radius:11px;background:#fff}.paragraph-no{display:inline-block;padding:5px 8px;border-radius:8px;background:var(--soft);color:var(--accent);font-weight:900;text-align:center}.points{counter-reset:point;list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.points li{counter-increment:point;margin:0;padding:16px;border:1px solid var(--line);border-radius:12px;background:#fff}.points li:before{content:counter(point);display:inline-grid;place-items:center;width:27px;height:27px;margin-right:8px;border-radius:50%;background:var(--accent);color:#fff;font-size:14px;font-weight:900}.premium-ad{margin:26px 0;padding:22px;border:2px solid #e78722;border-radius:14px;background:#fff6e5;text-align:center}.premium-ad strong{display:block;margin-bottom:10px;color:#8a4600}.premium-ad a{display:inline-block;padding:13px 18px;border-radius:9px;background:#dd6812;color:#fff!important;text-decoration:none;font-size:18px;font-weight:900}.quiz{margin:20px 0;padding:22px;border:1px solid var(--line);border-radius:15px;background:#fff;box-shadow:0 5px 16px rgba(16,47,64,.05)}.quiz h3{margin:0 0 14px;font-size:19px}.view{margin:12px 0 16px;padding:16px;border-left:5px solid var(--accent2);border-radius:0 10px 10px 0;background:#f3f8fa}.view>strong{display:block;margin-bottom:6px;color:var(--accent)}.quiz-gap{padding:1px 6px;border-radius:5px;background:#fff1b8;color:#6f4a00}.choice{display:block;width:100%;margin:9px 0;padding:13px 15px;border:1px solid #b9cbd3;border-radius:9px;background:#fff;color:#111!important;text-align:left;font:inherit;cursor:pointer}.choice:hover{background:var(--soft)}.choice.correct{border-color:#2f8a50;background:#e4f6e9;color:#111!important;font-weight:700}.choice.wrong{border-color:#c84b4b;background:#fff0f0;color:#111!important}.feedback{display:none;margin-top:12px;padding:11px 13px;border-radius:9px;font-weight:900}.feedback.show{display:block}.feedback.ok{background:#e4f6e9;color:#1e6c3b}.feedback.no{background:#fff0f0;color:#9b2929}.solution{display:none;margin-top:12px;padding:17px;border-radius:10px;background:#f4f7f8}.solution.show{display:block}.answer{color:#1f673c;font-weight:900}.answer-ground{padding:13px;border-left:4px solid var(--accent2);background:#fff}.answer-ground p{margin:5px 0 0}.option-notes{margin:12px 0 0;padding-left:24px}.option-notes li{margin:8px 0}.back{text-align:center;margin:25px 0}.back a{color:var(--accent)!important;font-weight:900}
@media(max-width:680px){.sut-read{font-size:16px}.read-hero{padding:20px}.read-hero h1{font-size:26px}.sut-read h2{font-size:22px}.part-card,.core-card,.quiz{padding:16px}.points{grid-template-columns:1fr}.paragraph-list li{grid-template-columns:1fr;gap:8px}.paragraph-no{width:max-content}.premium-ad a{width:100%;font-size:16px}.study-blank{min-width:38px!important;padding:1px 6px!important}}
</style>`;

const script = `<script>(function(){function init(){document.querySelectorAll('.sut-read .study-blank').forEach(function(button){button.addEventListener('click',function(){var show=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(show));button.classList.toggle('revealed',show);button.querySelector('.blank-mask').hidden=show;button.querySelector('.blank-answer').hidden=!show})});document.querySelectorAll('.sut-read .quiz').forEach(function(quiz){quiz.querySelectorAll('.choice').forEach(function(button){button.addEventListener('click',function(){var answer=String(quiz.dataset.answer);var correct=String(button.dataset.choice)===answer;quiz.querySelectorAll('.choice').forEach(function(choice){choice.classList.remove('correct','wrong');if(String(choice.dataset.choice)===answer)choice.classList.add('correct')});if(!correct)button.classList.add('wrong');var feedback=quiz.querySelector('.feedback');feedback.className='feedback show '+(correct?'ok':'no');feedback.textContent=correct?'정답입니다. 선택지별 해설을 확인하세요.':'오답입니다. 초록색 선택지가 정답입니다.';quiz.querySelector('.solution').classList.add('show')})})})}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init()})();</script>`;

function renderPage(page, original) {
  const keywords = selectKeywords(page);
  const points = selectPoints(page);
  const quizzes = makeQuizzes(page, points, keywords);
  const premium = premiumInfo(original, page);
  const tag = htmlText((original.match(/<span class="tag">([\s\S]*?)<\/span>/i) || [])[1] || "2027 수능특강 독서");
  const topic = page.parts.map((part) => `${part.label ? `(${part.label}) ` : ""}${part.topic}`).join(" / ");
  const premiumBlock = premium.url ? `<aside class="premium-ad"><strong>전체 변형문제 자료</strong><a href="${escapeHtml(premium.url)}" target="_blank" rel="noopener noreferrer sponsored">${escapeHtml(premium.label)}</a></aside>` : "";
  const core = page.parts.map((part, index) => `<div class="core-card">${page.parts.length > 1 ? `<span class="part-label">(${part.label}) ${escapeHtml(part.topic)}</span>` : ""}<p class="core-summary">${renderSummaryPart(part.summary, keywords, index)}</p></div>`).join("\n");
  const paragraph = page.parts.map((part) => `<div class="part-card">${page.parts.length > 1 ? `<span class="part-label">(${part.label}) 문단별 정리</span>` : ""}<ol class="paragraph-list">${part.flow.map((item) => `<li><span class="paragraph-no">${item.paragraph}문단</span><div>${flowBlank(item.text, keywords)}</div></li>`).join("")}</ol></div>`).join("\n");
  return `${metadata(original, page)}${css}<article class="sut-read"><header class="read-hero"><p class="read-kicker">${escapeHtml(tag)}</p><h1>${escapeHtml(page.title)}</h1><p class="read-topic">${escapeHtml(topic)}</p><a class="index-link" href="${indexUrl}">2027 수능특강 독서 전체 목록</a></header><nav class="read-nav" aria-label="학습 목차"><a href="#read-core">핵심 요약</a><a href="#read-paragraphs">문단 정리</a><a href="#read-points">출제 포인트</a><a href="#read-quizzes">변형문제</a></nav><section id="read-core"><h2>핵심 내용 요약·괄호형 10문제</h2><p class="section-guide">제시문의 핵심만 중복 없이 정리했습니다. ${numerals.slice(1).join(" ")} 괄호를 누르면 정답이 나타납니다.</p>${core}</section>${premiumBlock}<section id="read-paragraphs"><h2>문단별 내용 요약·네모 빈칸</h2><p class="section-guide">각 문단의 역할을 확인한 뒤 네모 빈칸을 눌러 핵심어를 점검하세요.</p>${paragraph}</section><section id="read-points"><h2>출제 포인트 10</h2><ol class="points">${points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ol></section><section id="read-quizzes"><h2>제시문 기반 변형문제 10제</h2><p class="section-guide">모든 문항에 풀이에 필요한 제시문 내용을 &lt;보기&gt;로 제공합니다. 선택지를 누르면 정답과 선택지별 해설이 나타납니다.</p>${quizzes.map(renderQuiz).join("\n")}</section><div class="back"><a href="${indexUrl}">2027 수능특강 독서 전체 지문 통합 목록으로 돌아가기</a></div>${premiumBlock}</article>${script}\n`;
}

const stats = { pages: 0, parts: 0, parenthetical: 0, paragraphBlanks: 0, points: 0, quizzes: 0, choices: 0 };
for (const page of source.pages) {
  const file = path.join(contentDir, `2027-suteuk-reading-${String(page.number).padStart(2, "0")}.html`);
  const original = fs.readFileSync(file, "utf8");
  const output = renderPage(page, original);
  stats.pages += 1;
  stats.parts += page.parts.length;
  stats.parenthetical += (output.match(/class="study-blank paren-blank"/g) || []).length;
  stats.paragraphBlanks += (output.match(/class="study-blank square-blank"/g) || []).length;
  stats.points += (output.match(/<ol class="points">/g) || []).length * 10;
  stats.quizzes += (output.match(/<section class="quiz"/g) || []).length;
  stats.choices += (output.match(/class="choice"/g) || []).length;
  if (write) fs.writeFileSync(file, output);
}
console.log(JSON.stringify({ mode: write ? "write" : "dry-run", ...stats }, null, 2));
