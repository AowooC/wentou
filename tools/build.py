# 生成 public/index.html（中文）与 public/en/index.html（English）。用法：python3 tools/build.py
import json,os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));U='https://wentou.onrender.com'
T={
'zh':dict(html='zh-CN',path='/',og='zh_CN',
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
'en':dict(html='en',path='/en/',og='en_US',
 title='Wentou · AI follow-up questions for your psychology lecture notes',
 desc='Wentou finds vague claims, confusable concepts and reasoning gaps in your psychology lecture notes (intro, developmental, social, cognitive, research methods), asks 2–3 probing questions on each, checks whether you really understand, and builds a list of questions to bring to your professor. Free for psychology students worldwide; works in English and Chinese.',
 kw='psychology notes,intro psychology,psych 101,study tool,AI tutor,confusing concepts,exam review,correlation vs causation',
 ogt='Wentou · Turn "I think I get it" into real understanding',
 tag='Turn “I think I get it” into real understanding of your psychology notes.',
 intro='<p>Paste your <b>psychology</b> lecture notes (English or Chinese). Wentou will:</p><ol><li>Highlight vague spots: claims without reasons, undefined terms, “so / obviously” reasoning jumps, <b>confusable concepts</b> (classical vs operant conditioning, negative reinforcement vs punishment, correlation vs causation, random sampling vs random assignment…)</li><li>Ask 2–3 probing questions per spot: explain the mechanism, tell concepts apart, apply them to new situations</li><li>Judge your answers as <b>mastered / partial / not yet</b> and build a ready-to-use list of questions for your professor or review</li></ol>',
 who='For psychology students worldwide (majors and anyone taking a psych course). Psychology notes only. Free: <span id="quota">5</span> AI analyses per day.',
 faq=[('What does Wentou do?','It flags vague or confusable spots in your psychology notes, asks 2–3 probing questions per spot, judges whether you really understand from your answers, and outputs a list of open questions for your professor or review.'),
  ('Who is it for?','University students taking psychology courses anywhere in the world, from Psych 101 to developmental, social, cognitive or research methods. It only supports psychology notes.'),
  ('Which languages are supported?','The interface is in English and Chinese. Questions, feedback and the final list are written in the same language as your notes.'),
  ('Is it free?','Yes, currently 5 AI analyses per network per day. After that an offline demo is available (Chinese intro-psych only).'),
  ('Are my notes stored?','No. Notes and answers are sent to the AI service (OpenAI) only to process your request and are not stored on our server. Only feedback you choose to submit is saved.'),
  ('Is the AI always right?','No. Wentou is a study aid and can make mistakes; your textbook and instructor are the authority.')],
 offer='5 free AI analyses per day',
 disclaimer='<b>Disclaimer:</b> Wentou is a study aid. AI-generated highlights, questions and judgments may be wrong and are not authoritative answers or grades; rely on your textbook and instructor. Sample notes are made-up data.',
 privacy='<b>Privacy:</b> Notes, images and answers you submit are sent to an AI service (OpenAI API) only to process that request and are not stored on our server; logs contain anonymized request statistics only. Feedback (“useful / not useful” and comments) you choose to submit is stored to improve the product. Please do not upload sensitive personal information.',
 L=dict(s1='① Paste your notes',ph='Paste your psychology lecture notes here (English or Chinese)…',upload='Upload photo / PDF: ',sample1='示例：普通心理学（中文）',sample2='示例：社会心理学（中文）',sample3='Sample: Intro Psych (English)',analyze='Analyze notes',demo='Offline demo (Chinese sample)',
  s2='② Highlighted vague spots',s3='③ Follow-up questions (2–3 per spot)',judge='Check my understanding & build the list',s4='④ Your open-questions list',copy='Copy as Markdown',fbq='Was this useful?',yes='👍 Useful',no='👎 Not useful',fbph='(Optional) one sentence on what worked or didn’t',faqh='FAQ',
  types={'易混概念':'Confusable concepts','推理跳跃':'Reasoning jump','结论无理由':'Claim without reason','术语未定义':'Undefined term','绝对化表述':'Overgeneralization','自标疑问':'Self-flagged doubt','事实可能有误':'Possibly incorrect'},
  levels={'已掌握':'Mastered','部分理解':'Partial','未理解':'Not yet'},
  steps='Steps: ① paste notes → ② see highlighted spots → ③ answer follow-ups → ④ get your open-questions list.',
  m_off='⚪ Offline demo (AI not configured)',m_cap='⚪ Today’s site-wide AI budget is used up; offline demo active',m_quota='⚪ You’ve used today’s free AI analyses; offline demo active',m_ai='🟢 AI mode · {n} free analyses left today (falls back to offline demo on errors)',m_nobe='⚪ Offline demo (no server)',
  offnote=' (The offline demo only recognizes common issues in Chinese intro-psychology notes; for demonstration only.)',fallback=' (offline demo active)',
  analyzing='Analyzing with AI, about 15–20 s…',judging='Judging with AI, about 10 s…',count='({n} spots, AI · {subj})',why='Why it’s vague: ',orig='Quote: ',ansph='Your answer (leave blank if unsure)',
  th=['#','Concept','Verdict','Feedback / sticking point','Ask your professor / review'],stick='Sticking point: ',sum='{n} spots: {m} mastered, {t} to clarify.',toolong='Notes too long (max 6000 characters); please split by section',thanks='Thanks for the feedback!',fbfail='Failed: ',
  md_h='# Open questions',md_o='Quote',md_s='Sticking point',md_a='Ask',md_r='Review',notpsy=''))}
TPL=open(os.path.join(ROOT,'tools','template.html'),encoding='utf-8').read()
for k,t in T.items():
  other='en' if k=='zh' else 'zh'
  ld={"@context":"https://schema.org","@graph":[{"@type":"WebApplication","name":"问透 Wentou" if k=='zh' else "Wentou","url":U+t['path'],"applicationCategory":"EducationalApplication","operatingSystem":"Web","inLanguage":t['html'],"description":t['desc'],
      "audience":{"@type":"EducationalAudience","educationalRole":"student"},"about":{"@type":"Thing","name":"Psychology"},"offers":{"@type":"Offer","price":"0","priceCurrency":"USD","description":t['offer']}},
      {"@type":"FAQPage","inLanguage":t['html'],"mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in t['faq']]}]}
  rep={'{{HTML}}':t['html'],'{{TITLE}}':t['title'],'{{DESC}}':t['desc'],'{{KW}}':t['kw'],'{{CANON}}':U+t['path'],'{{OGLOCALE}}':t['og'],'{{OGT}}':t['ogt'],
   '{{LDJSON}}':json.dumps(ld,ensure_ascii=False),'{{TAG}}':t['tag'],'{{INTRO}}':t['intro'],'{{WHO}}':t['who'],'{{DISC}}':t['disclaimer'],'{{PRIV}}':t['privacy'],
   '{{FAQ}}':''.join(f'<p><b>{q}</b> {a}</p>' for q,a in t['faq']),'{{LJSON}}':json.dumps({**t['L'],'lang':k},ensure_ascii=False),
   '{{SWITCH}}':'<a href="/en/" id="sw" data-l="en" hreflang="en">English</a>' if k=='zh' else '<a href="/" id="sw" data-l="zh" hreflang="zh-CN">中文</a>'}
  for kk,v in t['L'].items():
    if isinstance(v,str): rep['{{L.'+kk+'}}']=v
  h=TPL
  for a,b in rep.items(): h=h.replace(a,b)
  assert '{{' not in h, h[h.index('{{'):h.index('{{')+40]
  out=os.path.join(ROOT,'public','index.html' if k=='zh' else 'en/index.html');os.makedirs(os.path.dirname(out),exist_ok=True);open(out,'w',encoding='utf-8').write(h)
print('built')
