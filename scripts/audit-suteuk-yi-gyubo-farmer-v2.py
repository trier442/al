from pathlib import Path
import ast, re

html_path = Path('wordpress-content/2027-suteuk-yi-gyubo-farmer.html')
source_path = Path('scripts/audit-suteuk-yi-gyubo-farmer.py')

# Reuse the audited content blocks from the first script without executing it.
tree = ast.parse(source_path.read_text(encoding='utf-8'))
vals = {}
for node in tree.body:
    if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
        if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
            vals[node.targets[0].id] = node.value.value

required_vars = ['new_header','core','flow','analysis','points','ebs','quizzes']
missing = [k for k in required_vars if k not in vals]
assert not missing, f'missing constants: {missing}'

s = html_path.read_text(encoding='utf-8')
s = s.replace('<!-- revision: 1 -->', '<!-- revision: 2 -->')

# Header replacement.
s, n = re.subn(r'<header class="sut-hero">.*?</header>', vals['new_header'], s, count=1, flags=re.S)
assert n == 1, 'header replace failed'

# Add direct navigation to the EBS question connection section.
s = s.replace('<a href="#lit-points">출제 포인트</a><a href="#lit-quiz">변형문제</a>', '<a href="#lit-points">출제 포인트</a><a href="#lit-ebs-check">교재 문항</a><a href="#lit-quiz">변형문제</a>')

# Replace all explanatory / point / quiz sections in one pass to avoid legacy markup differences.
core_m = re.search(r'<section class="box">\s*<h2 id="lit-core">', s)
quiz_m = re.search(r'<section class="box"><h2 id="lit-quiz">', s)
assert core_m and quiz_m and core_m.start() < quiz_m.start(), 'section boundaries not found'
download_pos = s.index('\n  <div class="download">', quiz_m.start())
combined = vals['core'] + vals['flow'] + vals['analysis'] + vals['points'] + vals['ebs'] + vals['quizzes']
s = s[:core_m.start()] + combined + s[download_pos:]

# Remove production/editorial language.
for phrase in ['월곡답가형 통일 구성', '교재 근거로 분석했습니다', '교재와 대조해 정리했습니다', '공식 해설을 기준으로']:
    assert phrase not in s, f'editorial phrase remains: {phrase}'

# Grounding and content checks.
checks = [
    '<!-- revision: 2 -->',
    '귀족 계층에 대한 농부의 원망',
    '㉠ 시적 청자를 명시하여 말을 건네는 작품: (가), (다)',
    '㉢ 의문형으로 시상을 종결하는 작품: (다)',
    '가장(家長), 손자의 할아버지',
    '03번에서 바로 이와 같은 해석이 부적절',
    '‘햇곡식’과 ‘조세’가 농민의 노동의 보람이라는 하나의 의미로 수렴된다는 해석이 잘못되었습니다',
]
for c in checks:
    assert c in s, f'missing grounded point: {c}'

assert s.count('class="quiz"') == 10, f'quiz count={s.count("class=\"quiz\"")}'
for m in re.finditer(r'<section class="quiz".*?</section>', s, re.S):
    block = m.group(0)
    assert block.count('class="choice"') == 5, 'choice count mismatch'
    h = re.search(r'<h3>(.*?)</h3>', block, re.S)
    if h and ('&lt;보기&gt;' in h.group(1) or '<보기>' in h.group(1)):
        assert 'class="view"' in block, 'view-required quiz missing view box'
    ans = re.search(r'data-answer="([1-5])"', block)
    assert ans, 'answer missing'
    label = '①②③④⑤'[int(ans.group(1))-1]
    assert f'정답 {label}' in block, 'answer label mismatch'

html_path.write_text(s, encoding='utf-8')
print('audited v2:', html_path, 'chars=', len(s), 'quizzes=', s.count('class="quiz"'))
