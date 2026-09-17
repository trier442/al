export const QUARTER_AD_START = '<!-- modu-quarter-ad:start -->';
export const QUARTER_AD_END = '<!-- modu-quarter-ad:end -->';

export const QUARTER_AD_HTML = `${QUARTER_AD_START}
<div class="modu-quarter-ad" style="display:inline-block; width:100%; text-align:center;" data-modu-quarter-ad="teennique-20260303"><div style="display:inline-block;"><div style="margin:10px; padding:15px; background:#fff; border:1px solid #dae2e3;"><div style="width:100%; max-width:800px;"><a href="https://kerion.info/t74by19vws" target="_blank" rel="noopener noreferrer sponsored nofollow"><img src="https://img.tenping.kr/Content/Upload/Images/2024120512170001_Dis_20260303172707.jpg" width="100%" style="width:100%; height:auto; border-radius:0;" alt="하이틴 패션 매거진 틴니크 청소년 피팅모델 모집"></a></div><div style="margin:10px;"><div style="margin:5px 0; color:#333; font-size:16px; line-height:1.4em; height:2.6em; display:-webkit-box; text-overflow:ellipsis; -webkit-line-clamp:2; -webkit-box-orient:vertical; word-wrap:break-word; font-weight:300; text-align:left; overflow:hidden; max-width:400px;">하이틴 패션 매거진 틴니크 청소년 피팅모델을 찾습니다!</div></div><div style="width:100%; margin:20px 0 5px; background-color:#f5fbff; text-align:left;"><a href="https://kerion.info/t74by19vws" target="_blank" rel="noopener noreferrer sponsored nofollow" style="text-decoration:none; display:block;"><div style="padding:17px 0; background-color:#dcf3ff;"><div style="line-height:1.4; margin:0; padding:0 0 0 20px; color:#234f83; font-size:21px; font-weight:300; display:inline-block;">상담 신청하기</div><div style="margin-right:20px; margin-top:-6px; float:right; display:inline-block; color:#234f83; font-size:30px; font-weight:300;">»</div></div></a></div></div></div></div>
${QUARTER_AD_END}`;

function removeMarkedAds(html) {
  const text = String(html ?? '');
  const start = QUARTER_AD_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const end = QUARTER_AD_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`${start}[\\s\\S]*?${end}\\s*`, 'gi'), '');
}

function findMeaningfulBlockEnds(html) {
  const ends = [];
  const re = /<\/(?:p|h2|h3|blockquote|figure|table|ul|ol|section)>/gi;
  let match;
  while ((match = re.exec(html))) ends.push(match.index + match[0].length);
  return ends;
}

function fallbackInsertionPoint(html) {
  const target = Math.max(0, Math.floor(html.length * 0.25));
  const nextTagEnd = html.indexOf('>', target);
  return nextTagEnd >= 0 ? nextTagEnd + 1 : html.length;
}

export function injectQuarterAd(content) {
  const clean = removeMarkedAds(content).trim();
  if (!clean) return QUARTER_AD_HTML;

  const ends = findMeaningfulBlockEnds(clean);
  let position;
  if (ends.length) {
    const ordinal = Math.max(1, Math.round(ends.length * 0.25));
    position = ends[Math.min(ends.length - 1, ordinal - 1)];
  } else {
    position = fallbackInsertionPoint(clean);
  }

  return `${clean.slice(0, position)}\n${QUARTER_AD_HTML}\n${clean.slice(position)}`.trim();
}

export function hasQuarterAd(content) {
  return String(content ?? '').includes(QUARTER_AD_START) && String(content ?? '').includes(QUARTER_AD_END);
}
