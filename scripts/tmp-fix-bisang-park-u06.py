from pathlib import Path
import re
p=Path('wordpress-content/bisang-park-common2-u06-orthography.html')
s=p.read_text(encoding='utf-8')
s=s.replace('<!-- revision: 1 -->','<!-- revision: 2 -->',1)
old='''<article class="q"><h3>10. 맞춤법을 실제 국어 생활에 적용하는 태도로 가장 적절한 것은?</h3><div class="choices"><div class="choice">① 발음이 같거나 비슷하면 어느 표기를 써도 의미 전달에는 문제가 없다고 본다.</div><div class="choice">② 인터넷에서는 빠른 소통이 중요하므로 맞춤법 규범은 적용하지 않는 것이 좋다고 본다.</div><div class="choice">③ 헷갈리는 표기는 자신의 발음 습관만을 기준으로 판단하면 충분하다고 본다.</div><div class="choice">④ 맞춤법은 암기 대상이므로 단어의 구조나 문법적 기능은 살펴볼 필요가 없다고 본다.</div><div class="choice">⑤ 발음과 함께 형태소·품사·문장 속 기능을 살펴 표기의 근거를 판단하고 정확하게 사용한다.</div></div><details class="solution"><summary>정답·해설 보기</summary><p><b>정답 ⑤</b></p><ol class="exp"><li><b>①</b> 표기 차이가 의미 파악과 의사소통에 영향을 줄 수 있다.</li><li><b>②</b> 매체 환경과 관계없이 정확한 의미 전달을 위해 규범을 고려할 필요가 있다.</li><li><b>③</b> 개인의 발음 습관만으로 표준 표기를 정할 수 없다.</li><li><b>④</b> 구조와 기능을 이해해야 새로운 사례에도 규정을 적용할 수 있다.</li><li><b>⑤</b> 이 단원에서 요구하는 실제 국어 생활의 적용 태도에 부합한다.</li></ol></details></article>'''
new='''<article class="q"><h3>10. 맞춤법을 실제 국어 생활에 적용하는 태도로 가장 적절한 것은?</h3><div class="choices"><div class="choice">① 발음과 형태, 문장 속 기능을 함께 살펴 표기의 근거를 판단한다.</div><div class="choice">② 인터넷에서 빠르게 쓰는 말은 공동의 표기 규범과 무관하므로 익숙한 대로 쓰는 것이 좋다.</div><div class="choice">③ 개인의 발음 습관을 기준으로 표기를 결정하면 표준어의 실제 쓰임을 따로 확인할 필요가 없다.</div><div class="choice">④ 맞춤법은 낱말별 암기만으로 충분하므로 형태소와 품사의 차이는 학습할 필요가 없다.</div><div class="choice">⑤ 표준 표기가 낯설게 느껴질 때에는 발음과 가장 비슷한 형태로 자유롭게 바꾸어 적는 것이 바람직하다.</div></div><details class="solution"><summary>정답·해설 보기</summary><p><b>정답 ①</b></p><ol class="exp"><li><b>①</b> 맞춤법을 실제 사례에 적용할 때 필요한 판단 태도를 정확히 설명한다.</li><li><b>②</b> 매체 환경과 관계없이 정확한 의미 전달을 위해 공동의 표기 규범을 고려해야 한다.</li><li><b>③</b> 개인의 발음 습관만으로 표준 표기를 정할 수 없다.</li><li><b>④</b> 형태소와 품사·문장 기능을 이해해야 새로운 사례에도 규정을 적용할 수 있다.</li><li><b>⑤</b> 표준 표기는 개인이 임의로 바꾸는 것이 아니라 규범에 따라 확인해야 한다.</li></ol></details></article>'''
if old not in s: raise SystemExit('target q10 block not found')
s=s.replace(old,new,1)
answers=re.findall(r'<p><b>정답 ([①②③④⑤])</b></p>',s)
assert answers==list('③⑤②④①③⑤②④①'), answers
arts=re.findall(r'<article class="q">([\s\S]*?)</article>',s)
circles='①②③④⑤'
for i,a in enumerate(arts,1):
    m=re.search(r'<b>정답 ([①②③④⑤])</b>',a); ans=circles.index(m.group(1))
    opts=[re.sub(r'<[^>]+>','',x).strip() for x in re.findall(r'<div class="choice">([\s\S]*?)</div>',a)]
    assert len(opts)==5
    lens=[len(x) for x in opts]
    assert lens[ans] < max(lens[:ans]+lens[ans+1:]), (i,lens)
for bad in ['편집 지침','편집 원칙','필요한 문항','정답 배열','선택지 길이','가장 긴 선택지','시험 대비 완전 정복']:
    assert bad not in s,bad
p.write_text(s,encoding='utf-8')
print('ANSWER_SEQ',answers)
print('Q10_FIXED')
