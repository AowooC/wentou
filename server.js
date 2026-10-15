// 疑点雷达 后端：静态页面 + OpenAI 代理。密钥只从环境变量 LLM_API_KEY 读取，绝不下发给前端。
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os'),{execFileSync}=require('child_process');
const crypto=require('crypto');
const ENV=process.env, KEY=ENV.LLM_API_KEY, MODEL=process.env.LLM_MODEL||'gpt-4.1-mini', A_MODEL=process.env.ANALYZE_MODEL||process.env.LLM_MODEL||'gpt-4.1', J_MODEL=process.env.JUDGE_MODEL||process.env.LLM_MODEL||'gpt-4.1', PORT=+ENV.PORT||8787, HOST=ENV.HOST||'0.0.0.0';
const SITE=(ENV.PUBLIC_URL||'https://wentou.onrender.com').replace(/\/$/,'');
const FREE_PER_IP=+ENV.FREE_ANALYSES_PER_IP_PER_DAY||5, DAILY_USD_CAP=+ENV.DAILY_USD_CAP||3, MAX_NOTE_CHARS=+ENV.MAX_NOTE_CHARS||6000, MAX_UPLOAD_MB=+ENV.MAX_UPLOAD_MB||5;
const DATA_DIR=ENV.DATA_DIR||path.join(__dirname,'data'); try{fs.mkdirSync(DATA_DIR,{recursive:true})}catch{}
const PRICE={'gpt-4.1':[2,8],'gpt-4.1-mini':[0.4,1.6],'gpt-4o-mini':[0.15,0.6],'gpt-5.4-mini':[0.75,4.5],'gpt-5-mini':[0.25,2]}; // USD / 1M tokens（按官网价格表维护）
const log=(level,msg,extra={})=>console.log(JSON.stringify({ts:new Date().toISOString(),level,msg,...extra}));
const day=()=>new Date(Date.now()+8*3600e3).toISOString().slice(0,10); // 按北京时间切日
let today=day(), spendUSD=0, ipCount=new Map(), ipJudge=new Map(), burst=new Map();
function rollDay(){const d=day();if(d!==today){today=d;spendUSD=0;ipCount.clear();ipJudge.clear();}}
const ipHash=ip=>crypto.createHash('sha256').update(ip+(ENV.IP_SALT||'wentou')).digest('hex').slice(0,12);
class HttpErr extends Error{constructor(code,msg){super(msg);this.code=code;}}
let usage={prompt:0,completion:0,calls:0};
const MOCK=process.env.LLM_MOCK==='1';
function mock(messages,name){ // 仅用于无额度时测试前后端链路，输出格式与真实模型一致，内容为占位
  const u=messages[messages.length-1].content;
  if(name==='analyze'){const spots=u.split('\n').map(l=>l.replace(/^\s*-\s*/,'').trim()).filter(l=>/所以|显然|差不多|就是|一定|很重要|？|没记全|吧/.test(l)&&!/^[>#]/.test(l)).slice(0,12)
     .map(l=>({type:/？|没记全|吧/.test(l)?'自标疑问':/所以|显然/.test(l)?'推理跳跃':/差不多|就是/.test(l)?'易混概念':/一定/.test(l)?'绝对化表述':'结论无理由',quote:l,concept:'[MOCK] '+l.slice(0,10),reason:'[MOCK] 占位理由',questions:[{q:'[MOCK] 请解释这句话背后的机制',expected:'x'},{q:'[MOCK] 举一个反例',expected:'x'}]}));return {spots};}
  if(name==='judge'){const it=JSON.parse(u);return {summary:'[MOCK] 占位总结',results:it.map(s=>{const n=s.qa.filter(q=>q.学生回答!=='（空白）').length;const level=n===s.qa.length?'已掌握':n?'部分理解':'未理解';
     return {index:s.index,level,feedback:'[MOCK] 占位反馈',sticking_point:level==='已掌握'?'无':'[MOCK] '+s.concept,ask_teacher:level==='已掌握'?[]:['[MOCK] 关于“'+s.quote.slice(0,12)+'”的问题'],review:'[MOCK] 复习建议'};})};}
  return {text:'[MOCK] OCR'};}
async function chat(messages,schemaName,schema,model=MODEL){
  rollDay(); if(spendUSD>=DAILY_USD_CAP) throw new HttpErr(503,'今日全站免费额度已用完，请明天再来（或先使用离线体验版）');
  if(MOCK) return {data:mock(messages,schemaName),usage:{prompt_tokens:0,completion_tokens:0}};
  const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',signal:AbortSignal.timeout(90000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+KEY},
    body:JSON.stringify({model,...(/^gpt-5/.test(model)?{reasoning_effort:process.env.LLM_EFFORT||'low'}:{temperature:0.2}),messages,response_format:{type:'json_schema',json_schema:{name:schemaName,strict:true,schema}}})});
  const j=await r.json(); if(!r.ok){log('error','openai_error',{status:r.status,code:j.error&&j.error.code});throw new HttpErr(502,'AI 服务暂时不可用，已切换离线体验版');}
  usage.prompt+=j.usage.prompt_tokens;usage.completion+=j.usage.completion_tokens;usage.calls++;const p=PRICE[model]||[2,8];spendUSD+=(j.usage.prompt_tokens*p[0]+j.usage.completion_tokens*p[1])/1e6;
  return {data:JSON.parse(j.choices[0].message.content),usage:j.usage};
}
const S=(props)=>({type:'object',additionalProperties:false,required:Object.keys(props),properties:props});
const str={type:'string'};
const TYPES=['易混概念','推理跳跃','结论无理由','术语未定义','绝对化表述','自标疑问','事实可能有误'];
const analyzeSchema=S({spots:{type:'array',items:S({type:{type:'string',enum:TYPES},quote:str,concept:str,reason:str,
  questions:{type:'array',items:S({q:str,expected:str})}})}});
const judgeSchema=S({results:{type:'array',items:S({index:{type:'integer'},level:{type:'string',enum:['已掌握','部分理解','未理解']},
  feedback:str,sticking_point:str,ask_teacher:{type:'array',items:str},review:str})},summary:str});
const SYS_A=`你是大学《普通心理学》助教。任务：审读学生的中文课堂笔记，找出所有“模糊/有歧义/可能理解不到位/有误”的地方，供后续追问。
逐行检查每一条笔记，对照以下清单，一条都不要漏：
- 易混概念：两个概念被等同或说“差不多/就是/也是这个意思”（如经典vs操作性条件反射、负强化vs惩罚、工作记忆vs短时记忆、前摄vs倒摄抑制、群体极化vs群体思维）。
- 推理跳跃：出现“所以/显然/因此/说明/证明”，但前后推理不成立或缺中间步骤（例：7±2，所以只能记7个东西；先快后慢，因此复习要趁早）。
- 结论无理由：只有“很重要/效果好/更好”等评价，没写为什么、相对什么而言。
- 术语未定义：提到术语、实验或“老师举了例子”，但没写清内容和结论。
- 绝对化表述：永久/无限/彻底/一定/都/只能等。
- 自标疑问：问号、“没听清/没记全/吧”等学生自己不确定之处。
- 事实可能有误：与教材主流观点不符或过度简化（如自我服务偏差的归因对象写得不准确）。
一句话可能同时属于多类，选最核心的一类；同一句不要重复标注。
quote：必须是笔记原文中连续出现的一段，逐字复制（含标点），不要改写、不要带行首“- ”，取最能体现问题的那一小段（通常一个分句）。
reason：一句话说明问题所在。不要在 reason 以外的地方透露正确答案。
questions：每处 2-3 个追问，必须检验真实理解而非背诵：至少一个要求把概念应用到一个新的具体情境/案例做判断，或预测结果、或解释机制；最多一个直接问定义；问题本身不能泄露答案（错误示例：“为什么负强化不会导致行为减少？”）。问题要具体、简短。
expected：该题参考答案要点（供判分用，不给学生看），要准确。
按在笔记中出现顺序排列。全部用简体中文。`;
const SYS_J=`你是严格但友善的《普通心理学》助教。输入是若干“疑点”，每个包含笔记原文、该处为何模糊（问题所在）、追问、参考要点、学生回答。请逐题对照参考要点，语义判定学生是否真正理解（不看关键词，看是否说清机制/区分/正确应用）。
判定规则（严格执行）：
- 已掌握：所有追问的核心要点都答对，且有机制解释或正确的应用/例子。
- 部分理解：至少一题核心要点答对，但有题空白/“不知道”/只复述笔记或常识性套话（如“要趁早复习”“情境会改变行为”）而没有解释机制。
- 未理解：全部空白/不知道；或关键判断答错（如把前摄说成倒摄、把负强化当惩罚）；或学生回答重复了笔记原文中的错误/模糊说法（对照“问题所在”）。任何一个核心概念方向性答错，最高只能判“部分理解”，若是该疑点的核心区分则判“未理解”。
- 宁严勿宽：拿不准时选更低一级。
feedback：1-2句，直接对学生说（用“你”），指出哪里对、哪里错，答错时给出正确要点。
sticking_point：精确卡点（已掌握写“无”）。ask_teacher：0-2个可直接拿去问老师的具体问题（已掌握为空数组）。review：一句具体复习建议。index 与输入一致。summary：一段整体总结（优势与最需优先澄清的2-3点）。简体中文。`;
async function extract(b){
  if(typeof b.data!=='string'||!/^(image\/(png|jpeg|webp)|application\/pdf)$/.test(b.mime||''))throw new HttpErr(400,'仅支持图片（jpg/png/webp）或 PDF');
  const buf=Buffer.from(b.data,'base64');if(buf.length>MAX_UPLOAD_MB*1048576)throw new HttpErr(413,`文件过大（上限 ${MAX_UPLOAD_MB}MB）`);
  if(/pdf/.test(b.mime)){const f=path.join(os.tmpdir(),'up'+Date.now()+'.pdf');fs.writeFileSync(f,buf);
    const t=execFileSync('pdftotext',['-layout','-l','10',f,'-'],{timeout:20000}).toString().slice(0,MAX_NOTE_CHARS);fs.unlinkSync(f);
    if(t.trim().length>20) return {text:t,method:'pdftotext'};
    throw new HttpErr(400,'PDF 无可提取文字（可能是扫描件），请截图后按图片上传');}
  if(/image/.test(b.mime)){const r=await chat([{role:'system',content:'把图片中的课堂笔记逐字转写为纯文本（保留分行和列表结构，保留原有错别字和问号，不要补充或纠正内容）。'},
    {role:'user',content:[{type:'text',text:'请转写'},{type:'image_url',image_url:{url:`data:${b.mime};base64,${b.data}`}}]}],'ocr',S({text:str}));
    return {text:r.data.text,method:'vision:'+MODEL,usage:r.usage};}
  throw new HttpErr(400,'仅支持图片（jpg/png/webp）或 PDF');
}
const routes={
  '/api/status':async(b,ip)=>{rollDay();return {llm:!!KEY||MOCK,model:MOCK?'MOCK':`${A_MODEL}`,free_left:Math.max(0,FREE_PER_IP-(ipCount.get(ip)||0)),free_per_day:FREE_PER_IP,global_ok:spendUSD<DAILY_USD_CAP};},
  '/api/feedback':async(b,ip)=>{const rec={ts:new Date().toISOString(),ip:ipHash(ip),useful:!!b.useful,comment:String(b.comment||'').slice(0,500),spots:+b.spots||0,mode:String(b.mode||'').slice(0,20)};
    log('info','feedback',rec);try{fs.appendFileSync(path.join(DATA_DIR,'feedback.jsonl'),JSON.stringify(rec)+'\n')}catch(e){log('error','feedback_write',{err:e.message})}return {ok:true};},
  '/api/analyze':async(b,ip)=>{if(typeof b.text!=='string'||b.text.trim().length<30)throw new HttpErr(400,'笔记太短（至少 30 字）');
    if(b.text.length>MAX_NOTE_CHARS)throw new HttpErr(413,`笔记过长（上限 ${MAX_NOTE_CHARS} 字），请分章节提交`);
    rollDay();const n=ipCount.get(ip)||0;if(n>=FREE_PER_IP)throw new HttpErr(429,`今天的 ${FREE_PER_IP} 次免费 AI 分析已用完，明天再来；也可先用离线体验版`);ipCount.set(ip,n+1);
    const r=await chat([{role:'system',content:SYS_A},{role:'user',content:b.text}],'analyze',analyzeSchema,A_MODEL);
    const seen=new Set();r.data.spots=r.data.spots.filter(s=>!seen.has(s.quote)&&seen.add(s.quote)).filter(s=>b.text.includes(s.quote)||(s.quote_unmatched=true)).sort((x,y)=>(b.text.indexOf(x.quote)+1||1e9)-(b.text.indexOf(y.quote)+1||1e9));return {...r.data,usage:r.usage,model:A_MODEL};},
  '/api/judge':async(b,ip)=>{if(!Array.isArray(b.items)||!b.items.length||b.items.length>25)throw new HttpErr(400,'参数错误');
    rollDay();const n=ipJudge.get(ip)||0;if(n>=FREE_PER_IP*2)throw new HttpErr(429,'今日判定次数已用完');ipJudge.set(ip,n+1);
    b.items=b.items.map(s=>({type:String(s.type).slice(0,10),quote:String(s.quote).slice(0,300),concept:String(s.concept).slice(0,80),reason:String(s.reason).slice(0,300),
      questions:(s.questions||[]).slice(0,3).map(q=>({q:String(q.q).slice(0,300),expected:String(q.expected).slice(0,500)})),answers:(s.answers||[]).slice(0,3).map(a=>String(a||'').slice(0,800))}));
    const items=b.items.map((s,i)=>({index:i,type:s.type,quote:s.quote,concept:s.concept,问题所在:s.reason,qa:s.questions.map((q,j)=>({问题:q.q,参考要点:q.expected,学生回答:(s.answers[j]||'').trim()||'（空白）'}))}));
    const r=await chat([{role:'system',content:SYS_J},{role:'user',content:JSON.stringify(items)}],'judge',judgeSchema,J_MODEL);return {...r.data,usage:r.usage};},
  '/api/extract':async(b,ip)=>{rollDay();const n=ipCount.get(ip)||0;if(/image/.test(b.mime||'')&&n>=FREE_PER_IP)throw new HttpErr(429,'今日免费额度已用完');return extract(b);}
};
const STATIC={'/':'index.html','/index.html':'index.html','/robots.txt':'robots.txt','/sitemap.xml':'sitemap.xml','/llms.txt':'llms.txt','/sample_notes.md':'sample_notes.md','/sample_notes_2.md':'sample_notes_2.md','/og.png':'og.png'};
const CT={html:'text/html; charset=utf-8',txt:'text/plain; charset=utf-8',md:'text/plain; charset=utf-8',xml:'application/xml; charset=utf-8',png:'image/png'};
const SEC={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY',
  'Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"};
http.createServer(async(req,res)=>{
  const t0=Date.now(),url=req.url.split('?')[0];
  const ip=(req.headers['x-forwarded-for']||'').split(',')[0].trim()||req.socket.remoteAddress||'?';
  const send=(c,o,t='application/json; charset=utf-8',h={})=>{res.writeHead(c,{'Content-Type':t,...SEC,...h});res.end(t.startsWith('application/json')?JSON.stringify(o):o);};
  try{
    if(url==='/healthz') return send(200,{ok:true,llm:!!KEY,uptime_s:Math.round(process.uptime())});
    if(routes[url]){
      if(req.method!=='POST'&&url!=='/api/status') return send(405,{error:'method not allowed'});
      // 突发限流：每 IP 每分钟 20 次
      const now=Date.now(),w=(burst.get(ip)||[]).filter(x=>now-x<60000);w.push(now);burst.set(ip,w);if(burst.size>5000)burst.clear();
      if(w.length>20) return send(429,{error:'请求太频繁，请稍后再试'});
      if(url!=='/api/status'&&url!=='/api/feedback'&&!KEY&&!MOCK) return send(503,{error:'AI 服务未配置，已切换离线体验版'});
      const limit=url==='/api/extract'?Math.ceil(MAX_UPLOAD_MB*1.4*1048576):256*1024;let body='',size=0;
      for await(const c of req){size+=c.length;if(size>limit){return send(413,{error:'请求体过大'});}body+=c;}
      let j;try{j=body?JSON.parse(body):{}}catch{return send(400,{error:'JSON 格式错误'})}
      const out=await routes[url](j,ip);
      if(url!=='/api/status')log('info','api',{path:url,ip:ipHash(ip),ms:Date.now()-t0,spend_today_usd:+spendUSD.toFixed(4)});
      return send(200,out);
    }
    const f=STATIC[url]; if(!f||req.method!=='GET') return send(404,'not found','text/plain; charset=utf-8');
    let buf=fs.readFileSync(path.join(__dirname,'public',f));if(!f.endsWith('.png'))buf=buf.toString().replaceAll('https://wentou.onrender.com',SITE);
    send(200,buf,CT[f.split('.').pop()],{'Cache-Control':f==='index.html'?'no-cache':'public, max-age=3600'});
  }catch(e){const code=e.code>=400&&e.code<600?e.code:500;log(code>=500?'error':'warn','request_failed',{path:url,code,err:e.message,ip:ipHash(ip)});send(code,{error:code===500?'服务器内部错误':e.message});}
}).listen(PORT,HOST,()=>log('info','started',{port:PORT,host:HOST,analyze:A_MODEL,judge:J_MODEL,ocr:MODEL,llm:!!KEY,free_per_ip:FREE_PER_IP,daily_usd_cap:DAILY_USD_CAP}));
