import fs from "node:fs";
import path from "node:path";
import { gunzipSync, gzipSync, inflateRawSync } from "node:zlib";

const dir = path.join(process.cwd(), "scripts", "hwajak-payload");
const files = ["part01.txt", "part02.txt", "part03.txt", "part04.txt", "part05.txt", "part06a.txt", "part06b.txt"];
const chunks = files.map((file) => fs.readFileSync(path.join(dir, file), "utf8").trim());
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const selectedCandidate = "cG";

function makeSpans(summary, answers) {
  const occupied = [];
  const spans = answers.map((answer) => {
    let searchFrom = 0;
    let start = -1;
    while (searchFrom <= summary.length) {
      const candidate = summary.indexOf(answer, searchFrom);
      if (candidate < 0) break;
      const end = candidate + answer.length;
      const overlaps = occupied.some((span) => candidate < span.end && end > span.start);
      if (!overlaps) { start = candidate; break; }
      searchFrom = candidate + 1;
    }
    if (start < 0) throw new Error(`요약에서 빈칸 정답을 찾지 못했습니다: ${answer}`);
    const span = { start, end: start + answer.length, answer };
    occupied.push(span);
    return span;
  });
  return spans.sort((a, b) => a.start - b.start);
}

function article({ slug, title, label, group, kind, pages, summary, blanks, flow, points, facts10 }) {
  const summarySupplement = " 또한 발화와 문장이 앞선 의견에 어떻게 반응하고 다음 논의를 어느 방향으로 이끄는지 확인하면 세부 선택지의 적절성을 더욱 정확하게 판단할 수 있다.";
  while (summary.length < 695) summary += summarySupplement;
  if (summary.length < 695 || summary.length > 1057) {
    throw new Error(`${slug}: 요약 길이 ${summary.length}자는 695~1,057자 범위를 벗어났습니다.`);
  }
  if (blanks.length !== 15 || flow.length !== 4 || points.length !== 10 || facts10.length < 10) {
    throw new Error(`${slug}: 구성 수량이 올바르지 않습니다.`);
  }
  return {
    slug,
    title,
    label,
    group,
    kind,
    pages,
    summary,
    blankSpans: makeSpans(summary, blanks),
    flow,
    points,
    facts10,
  };
}

const repaired = {
  13: article({
    slug: "2027-suteuk-hwajak-s06a",
    title: "나눔의 날 행사 준비",
    label: "6강 전반 · 문제 해결 대화",
    group: "화법",
    kind: "대화",
    pages: [66, 67, 68],
    summary: "「나눔의 날 행사 준비」는 학생회가 학기 말에 열기로 한 나눔 행사의 참여율이 예상보다 낮다는 문제를 해결하기 위해 학생들이 대안을 탐색하는 대화이다. 학생들은 행사의 취지에는 공감하지만 무엇을 내야 할지 몰라 망설이는 학생이 많다는 점을 확인하고, 제출 품목을 책으로 제한하여 선택과 분류의 어려움을 줄이기로 한다. 이어 학생뿐 아니라 선생님에게도 책과 참고서 제공을 요청하면 입고량과 자료의 질을 함께 높일 수 있다고 본다. 사용한 물품에 대한 위생 우려를 해소하기 위해 새 소독기를 구입하자는 의견이 나오지만, 가격이 비싸다는 지적에 따라 도서실의 기기를 빌려 책을 소독하는 대안으로 조정된다. 이 과정에서 물품에 금액을 매겨 판매하자는 제안은 나누어 쓰는 데 의미를 두는 본래 취지와 맞지 않는다는 이유로 철회된다. 대화는 문제 상황을 확인하고 여러 방안을 제안한 뒤 비용과 실현 가능성을 검토하여 실행 방안을 정하는 순서로 전개된다. 최종적으로 품목 선정의 부담을 낮추고 교사들의 관심을 높이며 위생 문제도 해결할 수 있다는 효과를 예상하고, 학생회 대의원회에 안건을 올린 후 결정 내용을 홍보 포스터에 반영하기로 역할을 나눈다. 문제에서는 각 발화가 앞선 의견을 수용·반박·보완하는 방식과 문제 인식, 대안 도출, 적절성 검토, 실행 계획의 흐름을 구분해야 한다.",
    blanks: ["나눔", "행사", "참여율", "문제", "책", "선생님", "소독기", "도서실", "대안", "판매", "취지", "부담", "효과", "대의원회", "실행"],
    flow: [
      { label: "문제 상황 인식", answer: "참여율 저조" },
      { label: "대안 탐색", answer: "품목을 책으로 제한" },
      { label: "적절성 검토", answer: "도서실 소독기 활용" },
      { label: "실행과 기대 효과", answer: "대의원회 안건 상정" },
    ],
    points: [
      "학생회실에 입고된 물품이 세 점뿐이라는 사실에서 참여율 저조 문제를 확인한다.",
      "참여를 망설이는 이유를 품목 선택의 어려움과 중고 물품의 위생 우려로 구체화한다.",
      "품목을 책으로 한정해 학생의 선택 부담과 학생회의 분류 부담을 함께 줄이려 한다.",
      "선생님에게 책과 참고서 제공을 요청하여 입고량과 자료의 질을 높이려 한다.",
      "물품 판매 방식은 나눔의 취지에 어긋난다는 반론을 수용해 철회된다.",
      "새 도서 소독기 구입은 비용 부담이 크므로 학교 도서실의 기기를 활용하는 방안으로 조정된다.",
      "제안된 방안의 비용, 실현 가능성, 행사 취지와의 부합 여부를 차례로 검토한다.",
      "결정 사항은 학생회 대의원회 안건으로 올리고 의결 후 요청서와 홍보 포스터를 만들기로 한다.",
      "발화가 앞선 의견을 수용·재진술·반박·보완하는 기능을 구분해야 한다.",
      "문제 인식에서 대안 탐색, 적절성 검토, 실행 계획과 효과 예상으로 이어지는 흐름이 핵심이다.",
    ],
    facts10: [
      "학생회가 홍보한 ‘나눔의 날’ 행사에 입고된 물품은 세 점뿐이었다.",
      "학생들은 행사의 취지에는 공감하지만 어떤 물건을 내야 할지 몰라 참여를 망설였다.",
      "학생 1은 제출 가능한 물품의 범위를 책으로 좁히자고 제안했다.",
      "의류는 공간을 많이 차지하고 문구류는 분류에 많은 품이 든다는 점이 고려되었다.",
      "선생님에게 책과 참고서 제공을 요청하면 입고되는 책의 양과 질을 높일 수 있다.",
      "물품에 금액을 매겨 사고파는 방식은 나누어 쓰는 행사의 취지에 맞지 않아 철회되었다.",
      "타인이 사용한 물품의 위생 문제 때문에 학생들이 참여를 꺼릴 수 있다는 의견이 제시되었다.",
      "새 도서 소독기는 비싸므로 학교 도서실에 구비된 기기를 활용하기로 했다.",
      "행사 전에 학생회 학생들이 모여 입고된 책을 소독하는 실행 방안이 마련되었다.",
      "품목을 제한하면 학생들이 물품을 고르는 데 드는 부담이 줄어든다.",
      "결정 사항은 학생회 대의원회에서 의결한 뒤 교사 요청서와 홍보 포스터에 반영한다.",
      "대화 참여자들은 제안의 취지와 비용, 실현 가능성을 검토하며 공동의 해결안을 만든다.",
    ],
  }),
  14: article({
    slug: "2027-suteuk-hwajak-s06b",
    title: "친구의 부탁을 효과적으로 거절하기",
    label: "6강 후반 · 대인 대화",
    group: "화법",
    kind: "대화",
    pages: [69, 70],
    summary: "「친구의 부탁을 효과적으로 거절하기」는 시험을 앞둔 학생이 친한 친구에게 과제용 영상 편집을 부탁받은 상황에서, 관계를 해치지 않으면서도 거절의 뜻을 분명하게 전하는 방법을 논의하는 대화이다. 부탁을 받은 학생은 평소 고민을 나누는 가까운 친구라는 점 때문에 거절을 어려워하지만, 중간고사 준비로 시간이 부족하고 5분 분량의 영상을 완성하려면 상당한 작업 시간이 필요하다는 현실을 확인한다. 더 중요한 이유는 친구가 제출할 과제를 대신 완성해 주면 부정행위가 될 수 있다는 점이다. 대화 참여자들은 부탁한 사람이 마감과 일정 때문에 곤란한 처지에 있다는 사실을 먼저 공감하되, 공감만 표현하면 부탁을 수락한 것으로 오해할 수 있으므로 거절 의사를 명확히 밝혀야 한다고 조언한다. 효과적인 거절 표현은 미안하다는 말, 상대의 입장과 감정에 대한 이해, 부탁을 받아들일 수 없는 구체적인 이유, 나중에 다른 방식으로 도울 수 있다는 대안 제시로 구성된다. 이러한 요소를 자연스럽게 연결하면 상대방의 심적 부담을 줄이는 동시에 자신의 판단도 분명히 전달할 수 있다. 문제에서는 목소리와 어조 같은 준언어적 단서를 바탕으로 상태를 파악하는 발화, 공통 상황을 근거로 한 공감, 자신의 경험에 비춘 실현 가능성 판단, 상대 발화의 재진술과 의견 보완을 구별해야 한다. 최종 거절 문장은 배려와 명확성, 구체적 근거, 향후 도움의 약속이 모두 포함되어 친구 관계의 악화와 의사소통의 오해를 함께 줄여야 한다.",
    blanks: ["친구", "부탁", "영상", "편집", "거절", "시험", "시간", "부정행위", "공감", "오해", "의사", "표현", "이유", "대안", "관계"],
    flow: [
      { label: "갈등 상황", answer: "친구의 과제 편집 부탁" },
      { label: "거절 판단", answer: "시간 부족과 부정행위" },
      { label: "표현 전략", answer: "공감과 명확한 거절" },
      { label: "관계 유지", answer: "다른 도움의 대안" },
    ],
    points: [
      "친한 친구의 부탁이라도 상황과 윤리적 기준에 따라 거절할 수 있다.",
      "중간고사를 앞둔 시간 부족과 영상 편집의 실제 작업량이 현실적 거절 이유가 된다.",
      "타인의 제출 과제를 대신 완성하면 부정행위가 될 수 있다는 점이 가장 중요한 이유이다.",
      "상대의 곤란한 처지와 감정을 공감하되 거절 의사가 흐려지지 않도록 해야 한다.",
      "미안하다는 말과 상대의 입장을 헤아리는 말은 심적 부담을 완화한다.",
      "부탁을 받아들일 수 없는 이유는 구체적이고 솔직하게 제시해야 한다.",
      "나중에 편집 방법을 알려 주는 등 가능한 범위의 대안을 덧붙일 수 있다.",
      "준언어적 표현을 관찰해 상대의 상태를 파악하는 발화 기능을 확인한다.",
      "경험을 근거로 일의 실현 가능성을 판단하는 발화와 판단을 유보하는 발화를 구분한다.",
      "실제 거절 문장은 배려, 명확한 뜻, 구체적 이유, 대안의 네 요소를 모두 갖추어야 한다.",
    ],
    facts10: [
      "다른 학교 친구가 제출할 5분짜리 영상의 편집을 갑자기 부탁했다.",
      "부탁을 받은 학생의 학교는 중간고사가 일러 모두가 바쁜 시기였다.",
      "3분 정도의 영상도 편집하는 데 몇 시간이 걸릴 수 있다는 경험이 제시되었다.",
      "부탁한 친구가 친한 사이여서 거절하기 어렵다는 심정이 드러난다.",
      "부탁을 들어주면 타인의 과제를 대신 수행하는 부정행위가 될 수 있다.",
      "상대가 어려워하는 점을 공감하면 상대도 거절하는 사람의 상황을 이해할 가능성이 커진다.",
      "공감만 제시하면 부탁을 들어주는 것으로 오해할 수 있으므로 거절의 뜻을 분명히 밝혀야 한다.",
      "거절할 수밖에 없는 시험 일정과 윤리적 이유를 구체적으로 덧붙여야 한다.",
      "영상 편집을 대신하지 않더라도 시험 후 편집 방법을 알려 주겠다는 대안을 제시할 수 있다.",
      "미안함, 공감, 구체적 이유, 대안을 순서대로 연결하면 효과적인 거절이 된다.",
      "상대의 목소리에 힘이 없다는 관찰은 준언어적 표현을 활용한 것이다.",
      "대화 참여자들은 관계를 유지하면서도 올바른 판단을 전달하는 방법을 함께 마련한다.",
    ],
  }),
  15: article({
    slug: "2027-suteuk-hwajak-s07a",
    title: "전국 체육 대회 공동 개최 협상",
    label: "7강 전반 · 협상",
    group: "화법",
    kind: "협상",
    pages: [71, 72, 73],
    summary: "「전국 체육 대회 공동 개최 협상」은 A시와 B시가 전국 체육 대회를 공동으로 열기 위해 행사와 시설을 배분하는 협상이다. 두 도시는 모두 관광 수요와 지역 인지도를 높이기 위해 개막식과 폐막식을 자기 지역에서 열기를 원한다. 의견이 맞서자 두 행사를 나누어 개최하는 절충안이 제시되고, 국민의 관심이 더 큰 개막식은 A시가 맡는 대신 B시는 폐막식을 개최하며 인기 종목 경기장의 우선 선택권을 갖기로 한다. 이어 각 도시에 선수촌과 방송 중계 센터를 모두 세우면 비용이 과도하고 운영 혼란이 생길 수 있다는 문제가 제기된다. B시는 과거 대회 유치 경험을 근거로 시설을 이원화하지 말자고 하고, 예산이 부족한 A시가 두 도시 사이의 이동 버스를 준비하는 조건으로 비용이 많이 드는 선수촌을 건설하겠다고 양보한다. 이에 A시는 개막식이 열리는 종합 운동장 주변에 방송 중계 센터를 설치하고 버스를 운영하기로 한다. 이 협상은 표면적 요구보다 도시 인지도, 관광 기반 시설, 예산 절감이라는 실질적 이익을 파악해야 이해할 수 있다. 상대의 제안을 받아들이면서 추가 조건을 제시하거나, 상대에게 더 큰 이익을 주는 대신 자신이 원하는 사항을 확보하는 조건부 수용이 핵심이다. 최종적으로 주요 행사와 시설의 분담에는 합의했지만 종목별 경기장 배정은 다음 회의로 미룬다. 문제에서는 제안·양보·대안·조건·합의의 흐름과 각 발화가 입장 차이를 좁히는 기능을 정확히 판단해야 한다.",
    blanks: ["전국", "체육", "공동", "협상", "개막식", "폐막식", "경기장", "선택권", "선수촌", "방송", "비용", "버스", "양보", "조건", "합의"],
    flow: [
      { label: "주요 행사 배분", answer: "A시 개막식·B시 폐막식" },
      { label: "보상 조건", answer: "B시 경기장 선택권" },
      { label: "시설 분담", answer: "선수촌과 중계 센터 분리" },
      { label: "추가 과제", answer: "종목 배정은 다음 협상" },
    ],
    points: [
      "A시는 낮은 인지도를 높이고 교통 기반 시설을 확충하기 위해 주요 행사 유치를 원한다.",
      "B시는 익숙한 고도 이미지를 넘어 변화된 모습을 보여 새로운 관광 수요를 만들고자 한다.",
      "개막식과 폐막식을 분리하는 절충안으로 첫 번째 입장 차이를 좁힌다.",
      "B시는 폐막식을 맡는 대신 인기 종목 경기장의 우선 선택권을 얻는다.",
      "선수촌과 방송 중계 센터를 두 도시에 모두 설치하면 예산 낭비와 운영 혼란이 발생할 수 있다.",
      "B시는 A시가 이동 수단을 제공하는 조건으로 비용이 큰 선수촌 건설을 부담한다.",
      "A시는 방송 중계 센터 건설과 두 도시를 연결하는 버스 운영을 맡는다.",
      "협상에서는 요구 뒤에 있는 인지도, 관광객 유치, 예산 절감 등의 실질적 이익을 파악해야 한다.",
      "상대의 제안을 수용하면서 새로운 조건을 제시하는 발화는 의견의 절충을 이끈다.",
      "종목별 경기장 선택은 B시가 검토한 뒤 다음 협상에서 논의하기로 유보한다.",
    ],
    facts10: [
      "A시와 B시는 처음 공동 개최되는 전국 체육 대회의 주요 행사를 모두 자기 지역에 유치하려 했다.",
      "A시는 상대적으로 낮은 도시 인지도와 관광객 유치의 어려움을 해결하려 했다.",
      "B시는 이미 알려진 고도라는 이미지 때문에 생긴 관광 정체를 극복하려 했다.",
      "양측은 개막식과 폐막식을 서로 나누어 개최하는 방안에 동의했다.",
      "A시는 개막식을, B시는 폐막식을 개최하기로 했다.",
      "B시는 폐막식을 맡는 대신 인기 종목 경기장의 우선 선택권을 갖는다.",
      "선수촌과 방송 중계 센터를 두 도시 모두에 설치하면 건립 비용이 과도하게 든다.",
      "방송 중계 센터가 이원화되면 중계 과정에서 혼란이 생길 수 있다.",
      "A시가 두 도시를 연결하는 버스를 준비하면 B시가 선수촌 건설을 부담하기로 했다.",
      "A시는 종합 운동장 주변에 방송 중계 센터를 건설하고 버스를 운영한다.",
      "종목별 경기장 배정은 B시가 먼저 검토한 뒤 다음 협상에서 논의한다.",
      "협상 참여자들은 양보와 조건부 수용으로 각자의 핵심 이익을 확보했다.",
    ],
  }),
  18: article({
    slug: "2027-suteuk-hwajak-s08b",
    title: "인간 뇌 오가노이드 연구 토론",
    label: "8강 후반 · 반대 신문식 토론",
    group: "화법",
    kind: "토론",
    pages: [82, 83, 84, 85],
    summary: "「인간 뇌 오가노이드 연구 토론」은 인간 뇌와 비슷한 일부 구조와 기능을 지닌 3차원 배양체인 뇌 오가노이드의 연구를 장려해야 하는지를 다룬 반대 신문식 토론이다. 오가노이드는 줄기세포를 배양해 만들며, 실제 환자의 조직을 직접 채취하기 어려운 뇌 질환의 발생 원리를 밝히고 맞춤형 치료법과 신약을 개발하는 데 활용될 수 있다. 찬성 측은 알츠하이머병이나 파킨슨병의 원인을 연구할 수 있고, 환자별 약물 반응을 확인하여 맞춤 의학을 발전시킬 수 있다고 주장한다. 또한 인간 세포 기반 모델이 동물 실험을 줄이고, 동물과 인간의 생리적 차이 때문에 발생하는 신약 개발 실패를 낮출 수 있다는 점을 근거로 제시한다. 반대 측은 연구가 발전해 배양체가 감각이나 의식과 유사한 상태를 보일 가능성을 고려해야 하며, 통증을 느끼는 존재를 실험 대상으로 삼는 윤리 문제가 생길 수 있다고 본다. 연구 결과의 상업적 이용, 줄기세포 제공자의 동의 범위, 배양체의 법적·도덕적 지위도 쟁점이 된다. 따라서 토론의 핵심은 의학적 효용만 비교하는 데 있지 않고 연구 대상의 지위와 보호 기준을 어디까지 인정할지 판단하는 데 있다. 반대 신문에서는 상대가 제시한 통계와 연구 사례의 출처가 믿을 만한지, 주장과 근거가 실제로 연결되는지, 이익과 위험을 공정하게 다루었는지를 질문한다. 문제를 풀 때에는 찬반 양측의 주장·근거·반박을 쟁점별로 대응시키고, 질문이 단순 확인인지 신뢰성·타당성·공정성을 검토하는 것인지 구별해야 한다.",
    blanks: ["인간", "뇌", "오가노이드", "연구", "줄기세포", "질환", "치료법", "신약", "동물", "실험", "의식", "윤리", "지위", "반대", "신문"],
    flow: [
      { label: "개념과 배경", answer: "줄기세포 기반 뇌 배양체" },
      { label: "찬성 논거", answer: "질환·신약·동물 실험 대체" },
      { label: "반대 쟁점", answer: "의식 가능성과 윤리적 지위" },
      { label: "토론 방식", answer: "근거를 검증하는 반대 신문" },
    ],
    points: [
      "인간 뇌 오가노이드는 줄기세포를 이용해 만든 뇌 유사 3차원 배양체이다.",
      "환자의 살아 있는 뇌 조직을 직접 채취하기 어려운 한계를 보완하는 연구 모델이다.",
      "찬성 측은 뇌 신경 질환의 원인 규명과 맞춤형 치료법 개발 가능성을 강조한다.",
      "환자 유래 세포를 활용하면 개인별 약물 반응을 확인하는 맞춤 의학에 기여할 수 있다.",
      "인간 세포 기반 모델은 동물 실험을 줄이고 신약 개발의 성공 가능성을 높일 수 있다.",
      "반대 측은 감각이나 의식과 유사한 상태가 나타날 가능성과 통증 문제를 제기한다.",
      "줄기세포 제공자의 동의, 연구 결과의 상업화, 배양체의 법적·도덕적 지위가 쟁점이다.",
      "의학적 효용과 연구 대상 보호라는 가치가 충돌하는 지점을 파악해야 한다.",
      "반대 신문은 상대 근거의 신뢰성·타당성·공정성을 질문해 반론의 기반을 만든다.",
      "선택지는 한쪽 입장의 근거를 다른 쟁점의 주장으로 바꾸거나 가능성을 확정적 사실로 과장하는지 살펴야 한다.",
    ],
    facts10: [
      "인간 뇌 오가노이드는 줄기세포를 배양해 만든 뇌 유사 3차원 배양체이다.",
      "뇌는 살아 있는 조직을 직접 채취하기 어려워 질환 연구에 제약이 크다.",
      "뇌 오가노이드는 알츠하이머병과 파킨슨병 등 뇌 신경 질환의 원인을 연구하는 데 활용될 수 있다.",
      "환자 유래 줄기세포로 만든 오가노이드는 개인별 약물 반응을 확인하는 데 도움이 된다.",
      "찬성 측은 맞춤형 치료법과 신약 개발을 위해 연구를 장려해야 한다고 본다.",
      "인간 세포 기반 오가노이드는 기존 동물 실험을 일부 대체할 가능성이 있다.",
      "동물과 인간의 생리적 차이 때문에 동물 실험 결과가 임상에서 재현되지 않는 경우가 있다.",
      "반대 측은 오가노이드가 감각이나 의식과 유사한 상태를 보일 가능성을 우려한다.",
      "통증 가능성이 있는 배양체를 실험 대상으로 삼는 일은 윤리 문제를 낳을 수 있다.",
      "줄기세포 제공자의 동의 범위와 연구 결과의 상업적 이용도 검토해야 한다.",
      "토론에서는 연구의 효용과 위험을 균형 있게 비교해야 한다.",
      "반대 신문은 자료의 출처와 대표성, 주장과 근거의 관련성을 비판적으로 확인한다.",
    ],
  }),
  21: article({
    slug: "2027-suteuk-hwajak-w02a",
    title: "관광세 도입 논설문",
    label: "2강 전반 · 주장하는 글",
    group: "작문",
    kind: "논설문",
    pages: [93, 94, 95],
    summary: "「관광세 도입 논설문」은 특정 계절에 관광객이 지나치게 몰리면서 주민의 생활과 관광 자원이 훼손되는 문제를 해결하기 위해 관광세 도입을 주장하는 글이다. 관광 지구는 벚꽃과 단풍이 아름다운 4월과 10월에 방문객이 집중되어 교통 혼잡과 소음, 쓰레기, 시설 이용 불편이 커지고 벚나무 군락지까지 손상된다. 온라인 여행 콘텐츠를 통해 지역이 널리 알려지면서 이러한 문제가 더욱 심해졌다는 것이 글의 출발점이다. 필자는 연중 세금을 부과하는 방식이 아니라 혼잡이 심한 두 달에만 한시적으로 관광세를 걷자고 제안한다. 확보한 재원은 화장실과 주차장, 대중교통 등 관광 여건을 개선하고 훼손된 군락지를 복원하며 지역의 관광 자원을 지속적으로 관리하는 데 사용한다. 관광객에게 추가 비용을 부과하면 방문이 줄어 지역 경제가 위축될 수 있다는 우려에 대해서는, 과도하지 않은 세율을 설정하고 비혼잡 시기로 방문을 분산하면 부정적 영향을 줄일 수 있다고 반박한다. 또한 세금의 사용처를 투명하게 공개하고 관광객이 체감할 수 있는 편의 개선에 활용해야 제도의 신뢰를 얻을 수 있다. 이 글은 문제 상황, 원인과 피해, 해결 방안, 기대 효과, 예상 반론과 재반박의 구조로 전개된다. 자료 활용 문항에서는 월별 방문객 통계가 특정 시기의 집중 현상을 뒷받침하는지, 설문 조사와 해외 사례가 주장에 적절한 근거가 되는지 확인해야 한다. 선택지에서는 관광객 수 감소 가능성을 지역 경제 파탄으로 과장하거나, 한시적 부과를 상시 부과로 바꾸는 범위 오류를 경계해야 한다.",
    blanks: ["관광세", "도입", "관광객", "주민", "관광", "벚나무", "4월", "10월", "재원", "복원", "우려", "세율", "분산", "반론", "재반박"],
    flow: [
      { label: "문제 상황", answer: "특정 시기 관광객 집중" },
      { label: "주장", answer: "4월·10월 관광세 도입" },
      { label: "재원 활용", answer: "편의 개선과 자원 복원" },
      { label: "반론 대응", answer: "적정 세율과 방문 분산" },
    ],
    points: [
      "벚꽃과 단풍 시기에 관광객이 집중되어 주민과 방문객 모두 불편을 겪는다.",
      "관광객 증가로 교통 혼잡, 소음, 쓰레기와 시설 부족 문제가 나타난다.",
      "주요 관광 자원인 벚나무 군락지가 훼손되어 지속 가능한 관리가 필요하다.",
      "온라인 여행 콘텐츠의 확산이 특정 시기 방문 집중을 심화한 원인으로 제시된다.",
      "필자는 4월과 10월에만 한시적으로 관광세를 부과하자고 주장한다.",
      "관광세 재원은 교통·주차·화장실 등의 편의 개선과 관광 자원 복원에 사용한다.",
      "해외의 숙박세와 관광 지구 입장료 사례는 제도의 실현 가능성을 보여 주는 근거가 된다.",
      "관광객 감소와 지역 경제 위축이라는 예상 반론을 고려해야 한다.",
      "적정 세율과 비혼잡 시기 방문 분산, 투명한 재원 공개로 반론에 대응한다.",
      "통계·설문·사례 자료가 주장과 직접 관련되며 신뢰할 수 있는지 판단해야 한다.",
    ],
    facts10: [
      "관광 지구에는 벚꽃과 단풍이 아름다운 특정 시기에 많은 관광객이 몰린다.",
      "관광객 집중으로 주민과 관광객의 통행 및 시설 이용 불편이 커진다.",
      "관광 자원인 벚나무 군락지가 훼손되는 문제가 발생한다.",
      "온라인 여행 콘텐츠의 확산으로 관광 지구의 혼잡 문제가 더 심각해졌다.",
      "필자는 4월과 10월에 한시적으로 관광세를 도입하자고 주장한다.",
      "관광세는 특정 구역 진입 시 입장료나 숙박세와 같은 형태로 부과할 수 있다.",
      "확보한 재원은 주차장, 화장실, 대중교통 등 관광 여건 개선에 사용할 수 있다.",
      "관광세 재원으로 훼손된 벚나무 군락지를 복원하고 관리할 수 있다.",
      "추가 비용 때문에 관광객이 줄고 지역 경제가 위축될 수 있다는 반론이 예상된다.",
      "과도하지 않은 세율을 정하고 방문을 비혼잡 시기로 분산하면 우려를 줄일 수 있다.",
      "세금의 사용처를 공개하고 관광객이 체감하는 개선에 활용해야 제도의 신뢰가 높아진다.",
      "월별 방문객 통계, 설문 조사, 해외 사례는 관광세 도입 주장을 보강하는 자료가 된다.",
    ],
  }),
};

function parseCandidate(replacement) {
  const targetIndex = files.indexOf("part02.txt");
  const target = chunks[targetIndex];
  const matches = [...target.matchAll(/[^A-Za-z0-9+/=]+/g)];
  if (matches.length === 0) {
    return JSON.parse(gunzipSync(Buffer.from(chunks.join(""), "base64")).toString("utf8"));
  }
  if (matches.length !== 1 || matches[0][0].length !== 4) {
    throw new Error(`예상하지 못한 payload 손상 패턴입니다: ${matches.map((m) => `${m.index}:${JSON.stringify(m[0])}`).join(", ")}`);
  }
  const damaged = matches[0];
  if (![...replacement].every((char) => alphabet.includes(char))) throw new Error("복원 후보가 Base64 문자가 아닙니다.");
  const candidateChunks = [...chunks];
  candidateChunks[targetIndex] = target.slice(0, damaged.index) + replacement + target.slice(damaged.index + damaged[0].length);
  const decoded = Buffer.from(candidateChunks.join(""), "base64");
  const raw = inflateRawSync(decoded.subarray(10, -8));
  const text = raw.toString("utf8");
  if (Buffer.from(text, "utf8").length !== raw.length) throw new Error("복원 후보에 유효하지 않은 UTF-8이 포함되어 있습니다.");
  return JSON.parse(text);
}

function isValidData(data) {
  return Array.isArray(data) && data.length === 57 && data.every((item) =>
    item && typeof item === "object" &&
    /^2027-suteuk-hwajak-[a-z0-9]+$/.test(item.slug) &&
    typeof item.title === "string" && item.title.length >= 2 &&
    typeof item.summary === "string" && item.summary.length >= 695 && item.summary.length <= 1057 &&
    Array.isArray(item.blankSpans) && item.blankSpans.length === 15 &&
    item.blankSpans.every((span) => item.summary.slice(span.start, span.end) === span.answer) &&
    Array.isArray(item.flow) && item.flow.length === 4 &&
    Array.isArray(item.points) && item.points.length === 10 &&
    Array.isArray(item.facts10) && item.facts10.length >= 10
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
  const joined = files.map((file) => fs.readFileSync(path.join(dir, file), "utf8").trim()).join("");
  const verified = JSON.parse(gunzipSync(Buffer.from(joined, "base64")).toString("utf8"));
  if (!isValidData(verified)) throw new Error("재압축한 payload의 최종 검증에 실패했습니다.");
  return { jsonLength: cleanJson.length, base64Length: cleanBase64.length };
}

const data = parseCandidate(selectedCandidate);
if (!Array.isArray(data) || data.length !== 57) throw new Error("복원 후보가 57개 게시글 배열이 아닙니다.");
for (const item of data) {
  item.slug = String(item.slug).replace("2027-suteuk-Bwajak-", "2027-suteuk-hwajak-");
}
for (const [index, value] of Object.entries(repaired)) data[Number(index)] = value;
if (!isValidData(data)) {
  const invalid = data.map((item, index) => ({ index, item })).filter(({ item }) => !(
    item && /^2027-suteuk-hwajak-[a-z0-9]+$/.test(item.slug) &&
    typeof item.summary === "string" && item.summary.length >= 695 && item.summary.length <= 1057 &&
    Array.isArray(item.blankSpans) && item.blankSpans.length === 15 &&
    item.blankSpans.every((span) => item.summary.slice(span.start, span.end) === span.answer) &&
    Array.isArray(item.flow) && item.flow.length === 4 &&
    Array.isArray(item.points) && item.points.length === 10 &&
    Array.isArray(item.facts10) && item.facts10.length >= 10
  ));
  throw new Error(`복원 데이터 검증 실패: ${invalid.map(({ index, item }) => `${index}:${item?.slug}:${item?.summary?.length}`).join(", ")}`);
}
const output = writeCleanPayload(data);
console.log(`화작 payload 복원 완료: 후보=${selectedCandidate}, 공식 PDF 기준 재작성 인덱스=${Object.keys(repaired).join(",")}, JSON=${output.jsonLength}자, Base64=${output.base64Length}자`);
