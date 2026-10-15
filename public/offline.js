// 离线体验版（规则/启发式，仅支持中文普通心理学笔记）。Offline demo: rule-based, Chinese intro-psychology only.
const SAMPLE="> ⚠️ 示例数据：以下为虚构的学生课堂笔记，用于演示\"笔记澄清\"产品，非真实课程材料。\n\n# 普通心理学 第5讲 学习与记忆（课堂笔记）\n\n## 一、学习\n- 学习就是经验导致的行为变化。\n- 巴甫洛夫的狗：铃声+食物 → 狗听到铃声就流口水。这是经典条件反射。\n- 斯金纳箱：老鼠按杠杆得到食物，以后按得更多，这是操作性条件反射。\n- 经典条件反射和操作性条件反射其实差不多，都是建立联系。\n- 负强化就是惩罚，所以会让行为减少。\n- 消退以后行为就彻底没了，显然原来的联结被删除了。\n- 间歇强化比连续强化效果好，赌博机就是例子。\n- 泛化和分化：小阿尔伯特怕白鼠后也怕兔子，这叫泛化，分化反过来。\n- 观察学习（班杜拉）：小孩看大人打波波玩偶就会模仿，说明不需要强化也能学习。\n\n## 二、记忆\n- 记忆分三个阶段：感觉记忆、短时记忆、长时记忆。\n- 工作记忆就是短时记忆，换个名字而已。\n- 短时记忆容量是7±2，所以人一次只能记7个东西。\n- 复述可以让信息进入长时记忆，但老师说保持性复述和精细复述不一样，没听清。\n- 加工水平理论：加工越深记得越好。\n- 遗忘曲线：先快后慢。因此复习要趁早。\n- 艾宾浩斯用的是无意义音节，这个很重要。\n- 编码特异性原则：提取时的情境和编码时一致记得更好，老师举了潜水员的例子。\n- 前摄抑制和倒摄抑制，一个是旧的干扰新的，一个是新的干扰旧的（哪个是哪个？）。\n- 长时记忆是永久的、容量无限。\n\n## 课后\n- 老师说下周小测重点考强化程序和记忆模型，显然要背定义。\n";
const TYPE={confuse:"易混概念",jump:"推理跳跃",noreason:"结论无理由",undef:"术语未定义",abs:"绝对化表述",self:"自标疑问"};
// 知识库：易混/高频概念。kw=关键词组（任一命中算一点）
const KB=[
{id:"cc-oc",type:"confuse",re:/经典条件反射和操作性条件反射[^。\n]*差不多/,concept:"经典条件反射 vs 操作性条件反射",stick:"把两者都笼统归为“建立联系”，未区分联结对象（刺激-刺激 vs 行为-后果）及行为是否主动",
 qs:[{q:"经典条件反射里，被联结的是哪两样东西？操作性条件反射呢？",kw:[["刺激","铃声","食物"],["行为","后果","反应"]]},{q:"狗流口水和老鼠按杠杆，哪个是主动发出的行为、哪个是被引发的反射？",kw:[["按杠杆","老鼠"],["主动","自发","操作"],["引发","诱发","反射","被动"]]},{q:"举一个生活中的例子并说明它属于哪种条件反射、为什么。",kw:[["因为","属于","由于"]]}],ask:"两种条件反射的本质区别是联结内容不同还是行为性质不同？考试应如何作答？"},
{id:"neg",type:"confuse",re:/负强化就是惩罚/,concept:"负强化 vs 惩罚",stick:"误把“负强化”等同于惩罚；负强化是移除厌恶刺激以增加行为",
 qs:[{q:"强化和惩罚分别会让行为增加还是减少？",kw:[["强化"],["增加","提高","更多"],["减少","降低"]]},{q:"负强化里的“负”指什么？",kw:[["移除","去除","撤销","拿走","减去"]]},{q:"系安全带后刺耳提示音停止，于是更常系安全带——这是什么？",kw:[["负强化"]]}],ask:"负强化、正惩罚、负惩罚三者的区分标准是什么？"},
{id:"ext",type:"jump",re:/消退以后[^。\n]*删除/,concept:"消退（extinction）",stick:"认为消退=联结被删除，忽略了自然恢复现象",
 qs:[{q:"消退一段时间后再次出现条件刺激，会发生什么？",kw:[["自然恢复","自发恢复","恢复","又出现"]]},{q:"这说明消退是“删除”还是“抑制/新学习”？",kw:[["抑制","新学习","压制","没有删除","不是删除"]]}],ask:"自然恢复是否证明消退只是抑制？目前主流解释是什么？"},
{id:"wm",type:"confuse",re:/工作记忆就是短时记忆/,concept:"工作记忆 vs 短时记忆",stick:"把两者视为同义词；工作记忆强调对信息的主动加工与操作（Baddeley 多成分模型）",
 qs:[{q:"短时记忆主要强调存储还是加工？工作记忆呢？",kw:[["存储","储存","保持"],["加工","操作","处理"]]},{q:"Baddeley 工作记忆模型包含哪些成分？",kw:[["语音环","语音回路"],["视空","视觉空间"],["中央执行"],["情景缓冲"]]},{q:"心算 23×17 主要依赖哪个概念？为什么？",kw:[["工作记忆"],["加工","操作","计算","处理"]]}],ask:"教材中短时记忆与工作记忆是否作为两个不同概念考查？"},
{id:"72",type:"jump",re:/7±2，所以[^。\n]*/,concept:"短时记忆容量 7±2 与组块",stick:"把“7±2个组块”误读为“只能记7个东西”，忽略组块化",
 qs:[{q:"7±2 的单位是什么？",kw:[["组块","块","chunk"]]},{q:"为什么人能记住一个11位手机号？",kw:[["组块","分组","分段"]]},{q:"近年研究对容量的估计有何修正？",kw:[["4","四"]]}],ask:"7±2 与 Cowan 的 4±1 应以哪个为准？"},
{id:"rehearsal",type:"undef",re:/保持性复述和精细复述[^。\n]*/,concept:"保持性复述 vs 精细复述",stick:"两种复述未定义，不清楚哪种更利于进入长时记忆",
 qs:[{q:"保持性复述是怎么做的？",kw:[["重复","反复","念"]]},{q:"精细复述是怎么做的？",kw:[["意义","联系","已有知识","联想","加工"]]},{q:"哪种更容易进入长时记忆？与加工水平理论有何关系？",kw:[["精细"],["深","加工水平"]]}],ask:"“复述可以让信息进入长时记忆”是否只适用于精细复述？"},
{id:"pi",type:"self",re:/前摄抑制和倒摄抑制[^\n]*/,concept:"前摄抑制 vs 倒摄抑制",stick:"方向记混：前摄=旧干扰新，倒摄=新干扰旧",
 qs:[{q:"先学法语后学西班牙语，结果西班牙语单词总想成法语——这是哪种抑制？",kw:[["前摄"]]},{q:"换了新手机号后想不起旧号码——这是哪种？",kw:[["倒摄"]]},{q:"你用什么办法记住方向？",kw:[["前","旧","先"],["倒","新","后"]]}],ask:"有没有课堂实验范式能区分两种抑制？"},
{id:"ltm",type:"abs",re:/长时记忆是永久的[^。\n]*/,concept:"长时记忆的“永久”与“无限”",stick:"绝对化表述；长时记忆容量很大、保持时间长，但存在遗忘与重构",
 qs:[{q:"如果长时记忆是永久的，如何解释遗忘？",kw:[["提取","线索","干扰","消退","失败"]]},{q:"记忆会被改变吗？举例。",kw:[["重构","错误记忆","误导","洛夫特斯","Loftus"]]}],ask:"“容量无限”是教材原话还是“容量极大”？"},
{id:"ebb",type:"noreason",re:/无意义音节，这个很重要/,concept:"艾宾浩斯为何使用无意义音节",stick:"只记了“很重要”，没记重要的原因",
 qs:[{q:"为什么用无意义音节而不是真实单词？",kw:[["已有知识","意义","经验","干扰","控制","联想"]]},{q:"这种做法有什么局限？",kw:[["生态效度","现实","真实","日常"]]}],ask:"无意义音节的方法学意义及局限分别是什么？"},
{id:"int",type:"noreason",re:/间歇强化比连续强化效果好[^。\n]*/,concept:"间歇强化 vs 连续强化",stick:"“效果好”未说明指哪方面（习得速度 vs 抗消退）",
 qs:[{q:"哪种强化让行为“学得更快”？",kw:[["连续"]]},{q:"哪种强化让行为“更难消退”？为什么？",kw:[["间歇"],["预期","不确定","区分","不知道"]]},{q:"四种强化程序是哪些？赌博机属于哪种？",kw:[["比率","比例"],["间隔","时距"],["变化比率","可变比率","变比率"]]}],ask:"四种强化程序的反应模式图（累积记录）如何读？"},
{id:"forget",type:"jump",re:/先快后慢。因此复习要趁早/,concept:"遗忘曲线与复习策略",stick:"从“先快后慢”跳到“趁早复习”，中间缺少“间隔重复”逻辑",
 qs:[{q:"“先快后慢”具体指什么时间段遗忘最多？",kw:[["刚学","最初","一小时","一天","短时间"]]},{q:"除了趁早，复习还应如何安排？",kw:[["间隔","分散","多次","重复"]]}],ask:"分散练习效应和遗忘曲线是什么关系？"},
{id:"esp",type:"undef",re:/老师举了潜水员的例子/,concept:"编码特异性原则（潜水员实验）",stick:"只记得“举了例子”，例子内容和结论未记录",
 qs:[{q:"潜水员实验的设计和结果是什么？",kw:[["水下","陆地","岸上"],["一致","相同","匹配"]]},{q:"这对考试复习有什么启示？",kw:[["环境","情境","状态","相似"]]}],ask:"情境依赖记忆和状态依赖记忆的区别？"},
{id:"obs",type:"jump",re:/说明不需要强化也能学习/,concept:"观察学习与替代强化",stick:"“不需要强化”过于绝对，忽略替代强化与习得/表现之分",
 qs:[{q:"看到榜样被惩罚的孩子模仿得更少，说明什么？",kw:[["替代","榜样","间接"]]},{q:"“学会”与“表现出来”有区别吗？",kw:[["习得","表现","区别","不同"]]}],ask:"替代强化是否属于强化？班杜拉如何区分习得与表现？"}
];
const GENERIC=[
{type:"jump",re:/[^。\n]*(所以|显然|因此)[^。\n]*/g,concept:"推理跳跃",stick:"使用“所以/显然/因此”但中间推理未写出",qs:[{q:"把这句话中“所以/显然”前后的推理步骤补全。",kw:[["因为","由于","前提","步骤"]]},{q:"有没有反例能让这个结论不成立？",kw:[["反例","例外","不一定","不成立"]]}],ask:"这一结论的完整推理链是什么？"},
{type:"abs",re:/[^。\n]*(彻底|永久|无限|一定|总是|只能)[^。\n]*/g,concept:"绝对化表述",stick:"绝对化词语可能夸大结论",qs:[{q:"这句话在什么情况下不成立？",kw:[["不","例外","情况"]]},{q:"换一个更准确的说法。",kw:[["可能","通常","大多","一般","较"]]}],ask:"这个说法是否过于绝对？"},
{type:"self",re:/[^\n]*(没听清|？|\?|不懂|不太明白)[^\n]*/g,concept:"自标疑问",stick:"笔记中自己标出的未解问题",qs:[{q:"你目前的理解是什么？",kw:[["是","指"]]},{q:"教材哪一页/哪一节能找到答案？",kw:[["页","节","章"]]}],ask:"（笔记中自标的问题）"},
{type:"noreason",re:/[^。\n]*(很重要|效果好|更好)[^。\n]*/g,concept:"结论无理由",stick:"给出评价性结论但没有写原因",qs:[{q:"为什么？写出至少一个原因。",kw:[["因为","由于","原因"]]},{q:"“好/重要”是相对于什么而言？",kw:[["相对","比","方面"]]}],ask:"这个结论的依据是什么？"}
];
const DEMO_ANS={"cc-oc":["都是建立联系吧","老鼠按杠杆是主动的，狗流口水是被引发的反射","考试前紧张属于经典条件反射，因为考试情境和焦虑联结了"],
"neg":["强化让行为增加，惩罚让行为减少","负就是不好的东西",""],"ext":["","删除吧"],"wm":["短时记忆主要是存储，工作记忆是加工和操作","语音环、视空画板、中央执行、情景缓冲器","工作记忆，因为要在脑中操作计算"],
"72":["个","不知道",""],"rehearsal":["反复念","和已有知识建立联系","精细复述，加工更深"],"pi":["倒摄","前摄","不记得"],"ltm":["提取失败或干扰","会，洛夫特斯的误导实验"],
"ebb":["避免已有知识和意义联想的干扰",""],"int":["连续","间歇，因为不确定什么时候有奖励","比率和间隔，赌博机是变化比率"],"forget":["刚学完一小时内","间隔多次复习"],"esp":["在水下学的在水下回忆更好，情境一致",""],"obs":["","不知道"]};
let spots=[];
function esc(s){return s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))}
function analyze(text){
 const found=[];const overlap=(a,b)=>found.some(f=>a<f.end&&b>f.start);
 for(const k of KB){const m=k.re.exec(text);if(m&&!overlap(m.index,m.index+m[0].length))found.push({...k,start:m.index,end:m.index+m[0].length,text:m[0]});}
 let gi=0;for(const g of GENERIC){g.re.lastIndex=0;let m;while((m=g.re.exec(text))){let s=m.index,e=s+m[0].length;const t=m[0].replace(/^\s*-\s*/,"");s=e-t.length;if(t.trim().length<4||/^>|^#/.test(t)||overlap(s,e))continue;found.push({...g,id:"g"+(gi++),start:s,end:e,text:t,ask:g.ask==="（笔记中自标的问题）"?"请老师解释："+t:g.ask+"（原句："+t+"）"});}}
 return found.sort((a,b)=>a.start-b.start);
}
function render(text){
 spots=analyze(text);let html="",p=0;
 spots.forEach((s,i)=>{html+=esc(text.slice(p,s.start))+`<mark class="t-${s.type}" title="${TYPE[s.type]}：${s.concept}" onclick="document.getElementById('sp${i}').scrollIntoView({behavior:'smooth'})">[${i+1}] ${esc(text.slice(s.start,s.end))}</mark>`;p=s.end;});
 html+=esc(text.slice(p));document.getElementById("hl").innerHTML=html;document.getElementById("cnt").textContent=`（共 ${spots.length} 处）`;
 document.getElementById("qs").innerHTML=spots.map((s,i)=>`<div class="card" id="sp${i}"><b>[${i+1}] ${s.concept}</b> <span class="tag t-${s.type}">${TYPE[s.type]}</span><div class="note">原文：${esc(s.text)}</div>`+s.qs.map((q,j)=>`<div class="q">Q${j+1}. ${q.q}<input id="a${i}_${j}" placeholder="写下你的回答（不会可留空）"></div>`).join("")+`</div>`).join("");
 ["s2","s3"].forEach(id=>document.getElementById(id).hidden=false);document.getElementById("s4").hidden=true;
}
function score(ans,kw){if(!ans||!ans.trim())return 0;if(/不知道|不清楚|不记得|忘了/.test(ans))return 0;const hit=kw.filter(g=>g.some(w=>ans.includes(w))).length;return hit/kw.length;}
function judge(){
 const rows=spots.map((s,i)=>{const sc=s.qs.map((q,j)=>score(document.getElementById(`a${i}_${j}`).value,q.kw));const avg=sc.reduce((a,b)=>a+b,0)/sc.length;
  const lv=avg>=0.75?["已掌握","ok"]:avg>=0.35?["部分理解","mid"]:["未理解","bad"];const weak=s.qs.filter((q,j)=>sc[j]<0.5).map(q=>q.q);return{s,i,avg,lv,weak};});
 const todo=rows.filter(r=>r.lv[0]!=="已掌握");
 document.getElementById("list").innerHTML=`<p>共 ${rows.length} 处：已掌握 ${rows.length-todo.length}，待澄清 ${todo.length}。</p><table><tr><th>#</th><th>概念</th><th>判定</th><th>具体卡点</th><th>建议问老师 / 复习</th></tr>`+
 rows.map(r=>`<tr><td>${r.i+1}</td><td>${r.s.concept}</td><td class="${r.lv[1]}">${r.lv[0]}（${Math.round(r.avg*100)}%）</td><td>${r.s.stick}${r.weak.length?"<br><span class='note'>未答好：" + r.weak.join("；")+"</span>":""}</td><td>${r.lv[0]==="已掌握"?"—":r.s.ask}</td></tr>`).join("")+"</table>";
 document.getElementById("md").textContent="# 疑点清单\n\n"+todo.map(r=>`## ${r.s.concept}（${r.lv[0]}）\n- 原文：${r.s.text}\n- 卡点：${r.s.stick}\n- 问老师/复习：${r.s.ask}\n`).join("\n");
 document.getElementById("s4").hidden=false;document.getElementById("s4").scrollIntoView();
 return rows;
}
function demo(){notes.value=SAMPLE;render(SAMPLE);spots.forEach((s,i)=>{const a=DEMO_ANS[s.id]||["",""];s.qs.forEach((q,j)=>document.getElementById(`a${i}_${j}`).value=a[j]||"");});return judge();}
