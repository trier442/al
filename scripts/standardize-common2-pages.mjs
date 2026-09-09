import fs from "node:fs";
import path from "node:path";

const site = "https://modukorean.co.kr";
const indexUrl = `${site}/bisang-park-common2-index/`;
const root = path.join(process.cwd(), "wordpress-content");

const pages = [
  ["bisang-park-common2-u01-longing", "1-1① 정희성 「한 그리움이 다른 그리움에게」", "정희성 「한 그리움이 다른 그리움에게」의 날과 씨 비유, 기다림과 연대, 수미상관과 해석의 근거를 정리한 비상 박영민 공통국어2 내신 대비 자료입니다."],
  ["bisang-park-common2-u02-dream", "1-1② 한용운 「나의 꿈」", "한용운 「나의 꿈」의 작은 별·맑은 바람·귀뚜라미 이미지, 반복 구조, 경어체와 ‘당신’을 향한 사랑을 정리한 비상 박영민 공통국어2 내신 대비 자료입니다."],
  ["bisang-park-common2-u03-creative-brain", "1-2① 정재승 「창의적인 사람들의 뇌에서는 무슨 일이 벌어질까」", "정재승 「창의적인 사람들의 뇌에서는 무슨 일이 벌어질까」의 핵심 내용과 글의 구조, 창의성에 관한 관점을 정리한 비상 박영민 공통국어2 내신 대비 자료입니다."],
  ["bisang-park-common2-u04-creativity-truth", "1-2② 박종하 「창의성의 오해와 진실」", "박종하 「창의성의 오해와 진실」의 핵심 내용, 글의 전개 방식과 창의성에 관한 오해와 진실을 정리한 비상 박영민 공통국어2 내신 대비 자료입니다."],
  ["bisang-park-common2-u05-language-media-change", "2-1 「국어와 매체의 변화」", "비상 박영민 공통국어2 2-1 「국어와 매체의 변화」의 중세 국어 특징과 매체 변화에 따른 소통 양상을 핵심 개념과 문제로 정리한 내신 대비 자료입니다."],
  ["bisang-park-common2-u06-orthography", "2-2 「한글 맞춤법과 국어 생활」", "비상 박영민 공통국어2 2-2 「한글 맞춤법과 국어 생활」의 맞춤법 원리, 소리와 형태, 띄어쓰기와 생활 속 표기를 정리한 내신 대비 자료입니다."],
  ["bisang-park-common2-u07-media-perspectives", "3-1 「매체를 보는 다양한 시선」", "비상 박영민 공통국어2 3-1 「매체를 보는 다양한 시선」의 인공지능 그림 기사, 공익 광고와 비판적 매체 수용 원리를 정리한 내신 대비 자료입니다."],
  ["bisang-park-common2-u08-report-writing", "3-2 「보고하는 글 함께 쓰기」", "비상 박영민 공통국어2 3-2 「보고하는 글 함께 쓰기」의 공동 보고서 작성 과정, 자료 조직, 작문 관습과 쓰기 윤리를 정리한 내신 대비 자료입니다."],
  ["bisang-park-common2-u09-seogyeong", "4-1① 작자 미상 「서경별곡」", "작자 미상 「서경별곡」의 이별 거부, 구슬과 끈의 비유, 화자의 불안과 질투, 고려 가요의 표현 특징을 정리한 비상 박영민 공통국어2 내신 대비 자료입니다."],
  ["bisang-park-common2-u10-jaemangmaega", "4-1② 월명사 「제망매가」", "월명사 「제망매가」의 10구체 향가 형식, 누이의 죽음과 인생무상, 불교적 승화와 미타찰의 의미를 정리한 비상 박영민 공통국어2 내신 대비 자료입니다."],
  ["bisang-park-common2-u11-jindallaekkot", "4-1③ 김소월 「진달래꽃」", "김소월 「진달래꽃」의 가정적 이별 상황, 진달래꽃의 의미, 감정 절제와 자기희생, 3음보와 수미상관을 정리한 비상 박영민 공통국어2 내신 대비 자료입니다."],
  ["bisang-park-common2-u12-ganghosasiga", "4-2① 맹사성 「강호사시가」", "맹사성 「강호사시가」의 사계절 강호 생활, 자연 친화와 풍류, 반복되는 ‘역군은이샷다’와 연군지정을 정리한 비상 박영민 공통국어2 내신 대비 자료입니다."],
  ["bisang-park-common2-u13-sangchungok", "4-2② 정극인 「상춘곡」", "정극인 「상춘곡」의 홍진과 자연의 대비, 풍월주인·물아일체·소요음영, 자연 속 풍류와 안빈낙도를 정리한 비상 박영민 공통국어2 내신 대비 자료입니다."],
  ["bisang-park-common2-u14-nonbat", "4-2③ 작자 미상 「논밭 갈아 김 매고」", "작자 미상 「논밭 갈아 김 매고」의 사설시조 형식, 농민의 현실적 생활상, 시간의 흐름과 노동 속 여유를 정리한 비상 박영민 공통국어2 내신 대비 자료입니다."],
  ["bisang-park-common2-u15-bombom", "4-3① 김유정 「봄·봄」", "김유정 「봄·봄」의 1인칭 주인공 시점, 나·봉필·점순의 갈등, 상황적·언어적 해학과 데릴사위 현실을 정리한 비상 박영민 공통국어2 내신 대비 자료입니다."],
  ["bisang-park-common2-u16-heungbojeon", "4-3② 작자 미상 「흥보전」", "작자 미상 「흥보전」의 판소리계 소설 특징, 흥보와 놀보의 대비, 박 타기 구조, 해학과 풍자 및 현실 인식을 정리한 비상 박영민 공통국어2 내신 대비 자료입니다."],
  ["bisang-park-common2-u17-consumption", "5-1 「소비에 대한 다양한 시선」", "비상 박영민 공통국어2 5-1 「소비에 대한 다양한 시선」의 윤리적 소비·합리적 소비·소비 성찰 관점을 비교하는 주제 통합적 읽기 내신 대비 자료입니다."],
  ["bisang-park-common2-u18-negotiation", "5-2 「협상을 통한 문제 해결」", "비상 박영민 공통국어2 5-2 「협상을 통한 문제 해결」의 사랑천 산책로 연장 문제, 협상 단계, 근원적 동기와 사회적 소통 윤리를 정리한 내신 대비 자료입니다."],
  ["bisang-park-common2-u19-argument-writing", "5-3 「논증하는 글 쓰기」", "비상 박영민 공통국어2 5-3 「논증하는 글 쓰기」의 주장·이유·근거, 논증 방법, 잊힐 권리 법제화 예시와 쓰기 윤리를 정리한 내신 대비 자료입니다."],
].map(([slug, label, excerpt]) => ({ slug, label, excerpt }));

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function navBlock(index, position) {
  const prev = pages[index - 1];
  const next = pages[index + 1];
  const prevLink = prev
    ? `<a rel="prev" href="${site}/${prev.slug}/" style="flex:1 1 260px;text-decoration:none;padding:12px 14px;border:1px solid #d6e0e7;border-radius:10px;background:#fff;color:#173e63">← 이전<br><strong>${escapeHtml(prev.label)}</strong></a>`
    : `<span style="flex:1 1 260px;padding:12px 14px;color:#788892">첫 자료입니다.</span>`;
  const nextLink = next
    ? `<a rel="next" href="${site}/${next.slug}/" style="flex:1 1 260px;text-decoration:none;padding:12px 14px;border:1px solid #d6e0e7;border-radius:10px;background:#fff;color:#173e63;text-align:right">다음 →<br><strong>${escapeHtml(next.label)}</strong></a>`
    : `<span style="flex:1 1 260px;padding:12px 14px;color:#788892;text-align:right">마지막 자료입니다.</span>`;
  return `<!-- common2-seq-nav:${position}:start -->\n<nav class="pk-seq-nav pk-seq-nav-${position}" aria-label="비상 박영민 공통국어2 학습 순서" style="display:flex;flex-wrap:wrap;gap:10px;align-items:stretch;margin:18px auto 24px;max-width:940px;padding:12px;border-radius:12px;background:#f6f9fc;border:1px solid #d8e2ea">${prevLink}<a href="${indexUrl}" style="flex:0 1 170px;text-decoration:none;padding:12px 14px;border:1px solid #b9ccd9;border-radius:10px;background:#eef5fa;color:#173e63;text-align:center;font-weight:700">공통국어2<br>통합 목차</a>${nextLink}</nav>\n<!-- common2-seq-nav:${position}:end -->`;
}

function ensureExcerpt(raw, excerpt) {
  if (/<!--\s*excerpt\s*:/i.test(raw)) return raw;
  const marker = /<!--\s*revision\s*:\s*[^>]*-->/i;
  if (marker.test(raw)) return raw.replace(marker, match => `${match}\n<!-- excerpt: ${excerpt} -->`);
  const typeMarker = /<!--\s*type\s*:\s*[^>]*-->/i;
  if (typeMarker.test(raw)) return raw.replace(typeMarker, match => `${match}\n<!-- excerpt: ${excerpt} -->`);
  const statusMarker = /<!--\s*status\s*:\s*[^>]*-->/i;
  return raw.replace(statusMarker, match => `${match}\n<!-- excerpt: ${excerpt} -->`);
}

let changed = 0;
for (let i = 0; i < pages.length; i++) {
  const page = pages[i];
  const file = path.join(root, `${page.slug}.html`);
  if (!fs.existsSync(file)) throw new Error(`공통국어2 파일이 없습니다: ${file}`);
  const original = fs.readFileSync(file, "utf8");
  let raw = original
    .replace(/<!-- common2-seq-nav:top:start -->[\s\S]*?<!-- common2-seq-nav:top:end -->\s*/g, "")
    .replace(/<!-- common2-seq-nav:bottom:start -->[\s\S]*?<!-- common2-seq-nav:bottom:end -->\s*/g, "")
    .trimEnd();

  raw = ensureExcerpt(raw, page.excerpt);
  const top = navBlock(i, "top");
  const bottom = navBlock(i, "bottom");
  const headerEnd = raw.indexOf("</header>");
  if (headerEnd >= 0) {
    const insertAt = headerEnd + "</header>".length;
    raw = `${raw.slice(0, insertAt)}\n${top}\n${raw.slice(insertAt)}`;
  } else {
    const firstBody = raw.search(/<div\b[^>]*class=["'][^"']*\bpk\b[^"']*["'][^>]*>/i);
    if (firstBody >= 0) {
      const close = raw.indexOf(">", firstBody) + 1;
      raw = `${raw.slice(0, close)}\n${top}\n${raw.slice(close)}`;
    } else {
      raw = `${top}\n${raw}`;
    }
  }
  raw = `${raw.trimEnd()}\n${bottom}\n`;

  if (raw !== original) {
    fs.writeFileSync(file, raw, "utf8");
    changed++;
  }
}

console.log(`비상 박영민 공통국어2 순차 링크/SEO 보정 완료: ${changed}/${pages.length}개 파일`);
