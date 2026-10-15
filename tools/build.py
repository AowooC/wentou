# 生成 public/index.html（中文）与 public/en/index.html（English）。用法：python3 tools/build.py
import json,os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));U='https://wentou.onrender.com'
T={
'zh':dict(html='zh-CN',path='/',og='zh_CN',sitename='问透 Wentou',ogimg='og.png',h1='<h1>问透 <small>Wentou</small></h1>',samples=[('Sample: Intro Psych (English)','/sample_notes_en.md'),('示例：普通心理学（中文）','/sample_notes.md'),('示例：社会心理学（中文）','/sample_notes_2.md')],demobtn='<button class="g" id="demo">离线演示（中文示例）</button>',
 title='问透 Wentou · 心理学笔记追问助手｜普通心理学 / 考研心理学 查漏补缺',
 desc='问透：上传心理学课堂笔记（普通心理学、发展、社会、认知、研究方法等），AI 找出模糊表述、易混概念和推理跳跃，逐点追问检验你是否真懂，生成可拿去问老师的疑点清单。适合全球心理学大学生与考研复习，支持中英文，免费试用。',
 kw='普通心理学,心理学笔记,考研心理学,312心理学,347心理学,易混概念,AI学习助手,疑点清单',
 ogt='问透 · 把心理学笔记里的“好像懂了”问透',
 tag='把心理学笔记里的“好像懂了”，问到真懂。',
 intro='<p>粘贴你的<b>心理学</b>课堂笔记（中文或英文均可），问透会：</p><ol><li>标出模糊点：结论没理由、术语没定义、“所以/显然”的推理跳跃、<b>易混概念</b>（经典 vs 操作性条件反射、负强化 vs 惩罚、工作记忆 vs 短时记忆、相关 vs 因果……）</li><li>每处追问 2–3 个问题，考你能不能解释机制、区分概念、用到新情境</li><li>根据回答判断 <b>已掌握 / 部分理解 / 未理解</b>，生成可直接拿去问老师的《疑点清单》</li></ol>',
 who='适合：全球心理学专业与选修心理学课程的大学生、312/347 心理学考研复习。目前只支持心理学笔记。免费试用：每天 <span id="quota">5</span> 次 AI 分析。',
 faq=[('问透能做什么？','粘贴或上传心理学笔记后，问透标出结论无理由、术语未定义、推理跳跃、易混概念等模糊点，每处追问 2–3 个问题，根据回答判断是否真正理解，最后生成可拿去问老师或复习的疑点清单。'),
  ('适合哪些人？','全球修读心理学课程的大学生（专业或选修），以及备考 312/347 心理学考研的同学。只支持心理学笔记。'),
  ('支持哪些语言？','界面支持中文和英文；追问、反馈和疑点清单会使用与你笔记相同的语言。'),
  ('收费吗？','目前免费试用，每个网络每天 5 次 AI 分析；额度用完后可使用离线体验版（仅中文普通心理学）。'),
  ('我的笔记会被保存吗？','不会。笔记和回答只在处理请求时发送给 AI 服务（OpenAI）生成结果，服务器不保存笔记内容；只有你主动提交的反馈会被记录。'),
  ('AI 的判断一定正确吗？','不一定。问透是学习辅助工具，结果可能有误，请以教材和授课老师为准。')],
 offer='每天 5 次免费 AI 分析',
 disclaimer='<b>免责声明：</b>问透是学习辅助工具，AI 生成的标注、追问和判定可能有误，不构成权威答案或成绩评定，请以教材与授课老师为准。示例笔记为虚构数据。',
 privacy='<b>隐私说明：</b>你粘贴/上传的笔记和回答仅在处理本次请求时发送至 AI 服务（OpenAI API）用于生成结果，服务器不保存笔记、图片或回答内容；日志只记录匿名化的请求统计。你主动提交的“有用/没用”反馈及留言会被保存，用于改进产品。请勿上传含个人敏感信息的内容。',
 L=dict(s1='① 粘贴笔记',ph='把心理学课堂笔记粘贴到这里（中文或英文）……',upload='上传图片/PDF：',sample1='示例：普通心理学（中文）',sample2='示例：社会心理学（中文）',sample3='Sample: Intro Psych (English)',analyze='分析笔记',demo='离线演示（中文示例）',
  s2='② 模糊点高亮',s3='③ 追问（每处 2–3 题）',judge='判定理解 & 生成疑点清单',s4='④ 疑点清单',copy='复制为 Markdown',fbq='这份结果对你有用吗？',yes='👍 有用',no='👎 没用',fbph='（可选）一句话告诉我们哪里好/哪里不好',faqh='常见问题',
  types={'易混概念':'易混概念','推理跳跃':'推理跳跃','结论无理由':'结论无理由','术语未定义':'术语未定义','绝对化表述':'绝对化表述','自标疑问':'自标疑问','事实可能有误':'事实可能有误'},
  levels={'已掌握':'已掌握','部分理解':'部分理解','未理解':'未理解'},
  steps='步骤：① 粘贴笔记 → ② 高亮模糊点 → ③ 回答追问 → ④ 生成《疑点清单》。',
  m_off='⚪ 离线体验版（AI 服务未配置）',m_cap='⚪ 今日全站 AI 额度已用完，当前为离线体验版',m_quota='⚪ 你今天的免费 AI 次数已用完，当前为离线体验版',m_ai='🟢 AI 模式 · 今日剩余 {n} 次免费分析（失败时自动切换离线体验版）',m_nobe='⚪ 离线体验版（未连接服务器）',
  offnote='（离线体验版只能识别中文普通心理学笔记中的常见问题，结果仅供演示。）',fallback='（当前为离线体验版）',
  analyzing='AI 分析中，约需 15–20 秒…',judging='AI 判定中，约需 10 秒…',count='（共 {n} 处，AI 检测 · {subj}）',why='为何模糊：',orig='原文：',ansph='写下你的回答（不会可留空）',
  th=['#','概念','判定','反馈 / 具体卡点','问老师 / 复习'],stick='卡点：',sum='共 {n} 处：已掌握 {m}，待澄清 {t}。',toolong='笔记过长（上限 6000 字），请分章节提交',thanks='谢谢反馈！',fbfail='提交失败：',
  md_h='# 疑点清单',md_o='原文',md_s='卡点',md_a='问老师',md_r='复习',notpsy='')),
'en':dict(html='en',path='/en/',og='en_US',sitename='Wentou',ogimg='og-en.png',
 h1='<h1>Wentou <small>study smarter for Psych</small></h1>',
 samples=[('Sample: PSYC 101 – Learning & Memory','/sample_notes_en_memory.md'),('Sample: Research Methods & Development','/sample_notes_en.md')],demobtn='',
 title='Wentou — Check your psych lecture notes & find what you don’t understand | Intro Psych study tool',
 desc='Paste your Intro Psych (PSYC 101) lecture notes and Wentou finds the fuzzy spots — classical vs. operant conditioning, correlation vs. causation, working vs. short-term memory — then quizzes you Socratic-style so you know what you actually understand before the midterm. Free psychology study tool for college students, AP Psych, MCAT and GRE prep.',
 kw='psychology study tool,check my lecture notes,what I don’t understand,active recall,intro psych,PSYC 101,AP Psychology,MCAT psych soc,study for psych midterm,psychology flashcards alternative,Socratic questions,self-testing',
 ogt='Wentou — find out what you don’t actually understand in your psych notes',
 tag='Your notes look fine. Do you actually get them? Find out before the midterm.',
 intro='<p>Re-reading your notes feels like studying, but it mostly builds a false sense of “yeah, I know this.” Wentou turns your <b>Intro Psych</b> notes into <b>active recall</b>:</p><ol><li><b>Spots the fuzzy parts</b> — claims with no “why,” undefined terms, “so obviously…” leaps, and the classic mix-ups (classical vs. operant conditioning, negative reinforcement vs. punishment, correlation vs. causation, working vs. short-term memory).</li><li><b>Asks you 2–3 Socratic follow-up questions</b> per spot — explain it, tell concepts apart, apply them to a new scenario. Like a good TA in office hours, minus the wait.</li><li><b>Gives you a “what I don’t get yet” list</b> — mastered / partly there / not yet, with specific questions to bring to office hours, your TA or your study group.</li></ol>',
 who='Built for college psych students — PSYC 101 / Intro Psych, Research Methods, Developmental, Social, Cognitive — plus AP Psych and the psych/soc section of the MCAT. Psychology notes only. Free: <span id="quota">5</span> AI checks per day.',
 faq=[('What does Wentou actually do?','You paste your psych lecture notes. Wentou highlights the spots where your understanding is likely shaky, asks you a few Socratic questions about each one, tells you honestly whether your answers show you get it, and gives you a short list of what to review or ask your professor or TA about.'),
  ('Is this cheating? Is it allowed under my school’s academic integrity policy?','Wentou is a study aid, not a homework or essay generator: it never writes assignments for you, it asks you questions about your own notes. That is the same kind of self-testing your professor and learning center recommend. Still, every course sets its own AI policy — if you are unsure, check your syllabus or ask your instructor, and do not use it during closed-book quizzes or exams.'),
  ('Is my data private? Do you store my notes?','No accounts, no notes stored. Your notes and answers are sent to our AI provider (OpenAI API) only to generate your results and are not saved on our server; logs contain anonymized usage stats only. Only feedback you choose to submit is kept. Avoid pasting anything personal — like student IDs, grades or other people’s information. Wentou is not affiliated with your school, so nothing is shared with it.'),
  ('Will this help my grade or GPA?','Testing yourself (active recall) and finding gaps early are among the best-supported study strategies in learning science. Wentou makes that faster, but it cannot promise a grade — you still have to do the reviewing.'),
  ('Which classes does it work for?','Any psychology course: Intro Psych / PSYC 101, AP Psychology, Research Methods & Stats, Developmental, Social, Cognitive, Biopsych, Abnormal. It also helps with the psych/soc section of the MCAT and the GRE Psychology test. Non-psychology notes are politely declined for now.'),
  ('Is it free?','Yes — 5 AI checks per day per network while we are in beta. No sign-up, no credit card.'),
  ('Can the AI be wrong?','Yes. Treat its feedback like a study partner’s, not an answer key: your textbook, professor and TA have the final word.')],
 offer='Free beta: 5 AI checks per day',
 disclaimer='<b>Disclaimer:</b> Wentou is an independent study aid and is not affiliated with any university, College Board, AAMC or ETS. AI-generated highlights, questions and feedback can be wrong and are not grades or official answers. Follow your course’s academic integrity and AI policies. Sample notes are made-up.',
 privacy='<b>Privacy:</b> No account required. Notes, images and answers you submit are sent to our AI provider (OpenAI API) only to process that request and are not stored on our server; logs contain anonymized usage statistics only. Feedback you choose to submit (“useful / not useful” and comments) is stored to improve the product. Please don’t include personal or identifying information such as student IDs or grades.',
 L=dict(s1='① Paste your notes',ph='Paste your psych lecture notes here — rough bullet points are fine…',upload='Or upload a photo of your notes / a PDF: ',analyze='Check my notes',demo='',
  s2='② Here’s where your notes get fuzzy',s3='③ Quick check: answer in your own words',judge='See what I really understand',s4='④ Your “what I don’t get yet” list',copy='Copy as Markdown',fbq='Was this helpful?',yes='👍 Helpful',no='👎 Not really',fbph='(Optional) What worked, what didn’t?',faqh='FAQ',
  types={'易混概念':'Easy to mix up','推理跳跃':'Logic leap','结论无理由':'Missing the “why”','术语未定义':'Undefined term','绝对化表述':'Overgeneralization','自标疑问':'You flagged this','事实可能有误':'Might be wrong'},
  levels={'已掌握':'Got it','部分理解':'Partly there','未理解':'Not yet'},
  steps='How it works: ① paste notes → ② see the fuzzy spots → ③ answer a few questions → ④ get your review list.',
  m_off='⚪ Offline demo (AI not configured)',m_cap='⚪ We’ve hit today’s AI budget — try again tomorrow',m_quota='⚪ You’ve used today’s 5 free checks — come back tomorrow',m_ai='🟢 AI ready · {n} free checks left today',m_nobe='⚪ Offline (can’t reach the server)',
  offnote=' (The offline fallback only handles Chinese-language sample notes, so it won’t say much about English notes.)',fallback='',
  analyzing='Reading your notes… about 15–20 seconds.',judging='Checking your answers… about 10 seconds.',count='({n} spots · {subj})',why='Why this is fuzzy: ',orig='From your notes: ',ansph='Your answer — a sentence or two is fine (skip if unsure)',
  th=['#','Concept','Verdict','Feedback / where you’re stuck','Ask in office hours / review'],stick='Where you’re stuck: ',sum='{n} spots: {m} got it, {t} to review.',toolong='That’s a lot of notes (max 6,000 characters) — try one lecture at a time.',thanks='Thanks — that really helps!',fbfail='Couldn’t send: ',
  md_h='# What I don’t get yet',md_o='From my notes',md_s='Where I’m stuck',md_a='Ask in office hours',md_r='Review',notpsy=''))}
TPL=open(os.path.join(ROOT,'tools','template.html'),encoding='utf-8').read()
for k,t in T.items():
  other='en' if k=='zh' else 'zh'
  ld={"@context":"https://schema.org","@graph":[{"@type":"WebApplication","name":t['sitename'],"url":U+t['path'],"applicationCategory":"EducationalApplication","operatingSystem":"Web","inLanguage":t['html'],"description":t['desc'],
      "audience":{"@type":"EducationalAudience","educationalRole":"student"},"about":{"@type":"Thing","name":"Psychology"},"offers":{"@type":"Offer","price":"0","priceCurrency":"CNY" if k=='zh' else "USD","description":t['offer']}},
      {"@type":"FAQPage","inLanguage":t['html'],"mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in t['faq']]}]}
  rep={'{{HTML}}':t['html'],'{{TITLE}}':t['title'],'{{DESC}}':t['desc'],'{{KW}}':t['kw'],'{{CANON}}':U+t['path'],'{{OGLOCALE}}':t['og'],'{{OGT}}':t['ogt'],
   '{{LDJSON}}':json.dumps(ld,ensure_ascii=False),'{{TAG}}':t['tag'],'{{INTRO}}':t['intro'],'{{WHO}}':t['who'],'{{DISC}}':t['disclaimer'],'{{PRIV}}':t['privacy'],
   '{{FAQ}}':''.join(f'<p><b>{q}</b> {a}</p>' for q,a in t['faq']),'{{LJSON}}':json.dumps({**t['L'],'lang':k},ensure_ascii=False),
   '{{SITENAME}}':t['sitename'],'{{OGIMG}}':t['ogimg'],'{{H1}}':t['h1'],'{{DEMOBTN}}':t['demobtn'],'{{SAMPLES}}':''.join(f'<button id="loadSample{i}" data-sample="{f}">{l}</button>' for i,(l,f) in enumerate(t['samples'])),'{{SWITCH}}':'<a href="/en/" id="sw" data-l="en" hreflang="en">English</a>' if k=='zh' else '<a href="/" id="sw" data-l="zh" hreflang="zh-CN">中文</a>'}
  for kk,v in t['L'].items():
    if isinstance(v,str): rep['{{L.'+kk+'}}']=v
  h=TPL
  for a,b in rep.items(): h=h.replace(a,b)
  assert '{{' not in h, h[h.index('{{'):h.index('{{')+40]
  out=os.path.join(ROOT,'public','index.html' if k=='zh' else 'en/index.html');os.makedirs(os.path.dirname(out),exist_ok=True);open(out,'w',encoding='utf-8').write(h)
print('built')
