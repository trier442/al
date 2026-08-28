from pathlib import Path
import re

TARGET = Path('wordpress-content/2027-suteuk-cains-descendants.html')
html = TARGET.read_text(encoding='utf-8')

source_section = r'''
<section class="box"><h2 id="lit-text">수능특강 수록 원문</h2>
<div class="scene">
<h3>S#32. 훈의 방 안</h3>
<p>남폿불에 불이 댕겨진다.<br>
드러나는 사방탁자와 문갑, 그리고 서가에 가득한 책들.<br>
문이 열리며 오작녀가 밥상을 들고 들어온다. 엉거주춤 일어나 상을 받는 훈-.<br>
그의 손이 실수로 오작녀의 손과 겹쳐진다. 놀란 듯 바라보는 오작녀.<br>
훈, 어색하니 상을 받아 놓는다. 그 바람에 그릇의 숭늉이 흔들린다.<br>
나가는 오작녀를 보고.</p>
<p><strong>훈:</strong> 저⋯⋯ 거기 좀 앉으오.<br>
<strong>오작녀:</strong> ?</p>
<p>조심스레 앉는다.</p>
<p><strong>훈:</strong> ⋯⋯ 인제 오작녀도 자기 일을 좀 생각해야 할게요.<br>
<strong>오작녀:</strong> ⋯⋯.<br>
<strong>훈:</strong> 남편도 돌아오고.</p>
<p>겨우 말을 내뱉고 시선을 둘 데 없어 남폿불을 멍하니 바라본다. / 오작녀도 그쪽을 본다.<br>
찍찍 소리를 내며 타오르는 남폿불. / 오작녀의 눈에 왠지 모를 물기가 부풀어 오른다.</p>
<p><strong>오작녀:</strong> ⋯⋯ 제 일은 걱정 마시라우요. 제 일은 제가 알아서 하갓시요.<br>
<strong>훈:</strong> ⋯⋯ 아무래도 난 여기를 떠나야 될 것 같소⋯⋯ 그렇다고 당장 여기를 떠난다는 건 아니오. 무어 농토에 애착이 있어서가 아니라 왠지 지금 떠나고 말면 영원히 고향을 버리는 것 같애서⋯⋯ 아무튼 그 사람들이 내쫓지 않는 이상 여길 떠나고 싶진 않소⋯⋯ 처음 오작녀가 여기 와서 살림을 돌봐 줄 때부터 나는 내가 지주요 오작녀는 소작인의 딸이란 걸 생각해 본 적은 없소⋯⋯ 조금도 의리 관계 같은 것에 얽매여 행동을 자유롭게 못 한다거나 그럴 필요는 없소.<br>
<strong>오작녀:</strong> 저두 처음부터 선생님이 우리 집 지주라고 해서 와 있는 게 아니야요. ⋯⋯ 그리구 버릇없는 말 같지만 앞으로 선생님이 여기 계시는 동안만이라도 저더러 나가라는 말씀만은 말아 달라우요.<br>
<strong>훈:</strong> 아무래도 오작녀를 위해서 좋지 않을게요. 그리구 또 오작녀가 여기 있고 싶어 한대도 오작녀를 데려갈려는⋯⋯.<br>
<strong>오작녀:</strong> (똑바로 보며) 선생님 아무 말씀 마시라우요⋯⋯ 선생님이 나가라는 말씀만 않으신다믄⋯⋯ 나가라는 말씀만⋯⋯.</p>
<p>말을 못 맺고 격정에 못 이겨 튕겨나듯 밖으로 뛰어간다.</p>
<p><strong>훈:</strong> (눈을 감는)</p>
</div>

<div class="scene">
<h3>S#33. 과수원</h3>
<p>과목 사이로 허둥지둥 달려오는 오작녀. / 어느 나무 기둥에 이마를 부비며 흐느낀다. / 먼 뻐꾸기 소리.<br>
오작녀, 눈을 들어 집 쪽을 본다. / 불이 밝은 훈의 방, 봉창. / 먼 뻐꾸기 소리⋯⋯.<br>
F.O.</p>
</div>

<div class="view"><strong>[중략 부분 줄거리]</strong> 농민 대회가 열리고 토지 개혁을 단행하기로 결정되어 농민들은 지주들의 집을 차례로 찾아가 재산을 몰수하고, 결국 훈의 집에도 재산 몰수를 위해 찾아온다.</div>

<div class="scene">
<h3>S#101. 마당</h3>
<p>훈, 눈을 감는다.</p>
<p><strong>개털:</strong> (다시) 우리 민주 혁명에 불평을 품고 매일같이 술로써 소일하는 한편 순진한 청년들을 유혹하여 학당을 발판으로 반동 결사를 조직해 가지구 우리 면 농민 위원당 동무를 살해하게 한 사실 그리고 지주의 권력으로 소작인의 딸이자 남의 유부녀인 여성 동무를 유린한 사실 이런 사실을 보아⋯⋯.</p>
<p>“여보!” 새된 소리에 모두 놀라 그쪽을 본다. / 오작녀다.<br>
머리는 헝클어지고 얼굴은 열에 뜬 오작녀가 곧 쓰러질 듯이 하여 방문을 잡고 나서 있다.</p>
<p><strong>오작녀:</strong> 누가 그런 허튼소릴 적었소?<br>
<strong>개털:</strong> (분노의) 여성 동무 말을 삼가오. 이것은 농민 대회의 결정이오. 우리는 시방 여성 동무를 해방시키러 왔소!<br>
<strong>오작녀:</strong> 해방이구 뭐구 다 일없소. 돌아들 가시오.<br>
<strong>도섭:</strong> 아니 데 에미나이가 열병을 앓고 나더니. (개털에게) 동무 용서하시우. 데 에미나이가 앓구 나더니 속이 허해데서 데렙네다. (오작녀에게) 썩 들어가디 못하간!<br>
<strong>오작녀:</strong> 난 벌써 아버지의 딸이 아니야요.<br>
<strong>도섭:</strong> 칵!</p>
<p>달려들려는 도섭 영감을 제지하는.</p>
<p><strong>개털:</strong> 진정하오! 가사 싸움을 할 때가 앙이요. 자 그러믄 다시 계속해서⋯⋯ 이러한 모든 사실로 보아 우리 농민 대회는 지주 박훈을 악질 반동 지주로 규정하는 동시에 그의 모든 사유 재산을 몰수하는 데 이의가 없음.</p>
<p>그러고는 훈에게.</p>
<p><strong>개털:</strong> 이 집 열쇠를 이리 내오.</p>
<p>훈, 오작녀를 본다.</p>
<p><strong>훈:</strong> 오작녀가 맡아 있소.</p>
<p><strong>오작녀:</strong> (한 발 나서며) 안 돼요! 남의 집 열쇠는 왜 달래는 거야요?<br>
<strong>개털:</strong> 동무! 이 이상 우리 공작을 방해했다간 어떤 처벌을 당한다는 걸 알고 있소?<br>
<strong>오작녀:</strong> 이 집은 내 집이야요. 내가 살아 있는 동안은 누구 하나 이 집에 손을 못 대요.<br>
<strong>개털:</strong> (짐작이 간다는) 내 동무가 이 집에서 여러 해 고된 종살이를 했다는 걸 아오. 그런 사실은 중앙에 보고하겠소. 오늘 이 공작은 우리에게 맡기오. 다 알아서 처리할께니⋯⋯.<br>
<strong>오작녀:</strong> 당신네는 아무것도 몰라요!<br>
<strong>개털:</strong> 모르다니? 뭘 모른단 말이오?<br>
<strong>오작녀:</strong> 당신네는 아무것도 몰라요!<br>
<strong>개털:</strong> 아니 도대테⋯⋯.<br>
<strong>오작녀:</strong> 우리는 부부가 되시요!</p>
<p>말하고 그녀는 온몸의 맥이 빠지는 듯 눈을 감는다.</p>
<p><strong>훈:</strong> (놀라는)</p>
<p>개털 오바를 비롯한 모든 사람이 아연해서 웅성거린다.</p>
<p style="text-align:right;">- 황순원 원작·이상현 각색, 「카인의 후예」</p>
</div>
</section>
'''

if 'id="lit-text"' not in html:
    html = html.replace('<nav class="sut-nav"><a href="#lit-core">핵심 정리</a>', '<nav class="sut-nav"><a href="#lit-text">원문</a><a href="#lit-core">핵심 정리</a>', 1)
    marker = '<section class="box"><h2 id="lit-core">핵심 정리</h2>'
    if marker not in html:
        raise SystemExit('core marker not found')
    html = html.replace(marker, source_section + '\n' + marker, 1)

html = re.sub(r'<!-- revision: \d+ -->', '<!-- revision: 3 -->', html, count=1)

# Regression checks
required = [
    'id="lit-text"', 'S#32. 훈의 방 안', 'S#33. 과수원', 'S#101. 마당',
    '우리는 부부가 되시요!', '수능특강 8강 핵심 문항 연결', '변형문제 10제'
]
for token in required:
    if token not in html:
        raise SystemExit(f'missing required token: {token}')
if html.count('class="quiz"') != 10:
    raise SystemExit(f'quiz count mismatch: {html.count("class=\"quiz\"")}')

TARGET.write_text(html, encoding='utf-8')
Path('.audit-target').write_text(str(TARGET), encoding='utf-8')
print('patched', TARGET, 'chars=', len(html), 'quizzes=', html.count('class="quiz"'))
