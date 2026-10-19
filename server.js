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
  if(name==='judge'){const it=JSON.parse(u).spots;return {summary:'[MOCK] 占位总结',results:it.map(s=>{const n=s.qa.filter(q=>q.answer!=='(blank)').length;const level=n===s.qa.length?'已掌握':n?'部分理解':'未理解';
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
function outLang(t){const n=(t.match(/[\p{L}]/gu)||[]).length||1,c=k=>(t.match(k)||[]).length/n;
  if(c(/[\u3040-\u30ff]/g)>.05)return 'Japanese';if(c(/[\uac00-\ud7af]/g)>.1)return 'Korean';if(c(/[\u4e00-\u9fff]/g)>.3)return /[們這個說為學會時]/.test(t)?'Traditional Chinese':'Simplified Chinese';
  return 'the same language as the notes (they are NOT Chinese; if they are mostly English, use English)';}
const S=(props)=>({type:'object',additionalProperties:false,required:Object.keys(props),properties:props});
const str={type:'string'};
const TYPES=['易混概念','推理跳跃','结论无理由','术语未定义','绝对化表述','自标疑问','事实可能有误'];
const analyzeSchema=S({is_psychology:{type:'boolean'},subject:str,language:str,notice:str,spots:{type:'array',items:S({type:{type:'string',enum:TYPES},quote:str,concept:str,reason:str,
  questions:{type:'array',items:S({q:str,expected:str})}})}});
const judgeSchema=S({results:{type:'array',items:S({index:{type:'integer'},level:{type:'string',enum:['已掌握','部分理解','未理解']},
  feedback:str,sticking_point:str,ask_teacher:{type:'array',items:str},review:str})},summary:str});
const SYS_A=`You are a teaching assistant for university-level PSYCHOLOGY courses (intro/general psychology and any psychology subfield: cognitive, developmental, social, biological, clinical/abnormal, personality, research methods & statistics, etc.), helping psychology students worldwide.
Task: audit the student's lecture notes and find every vague, ambiguous, possibly misunderstood or incorrect spot, to be probed with follow-up questions.
LANGUAGE: detect the main language of the notes and write EVERY text field (concept, reason, questions, expected, notice) in that same language. Keep the "type" field as one of the given enum values (internal codes).
SCOPE: if the notes are not about psychology, set is_psychology=false, return an empty spots array, and put a short polite message in "notice" explaining that this tool currently supports psychology notes only. If they are psychology, is_psychology=true and notice="".
Check every line against this checklist, miss nothing:
- 易混概念 (confusable concepts): two concepts equated or "basically the same" (e.g. classical vs operant conditioning, negative reinforcement vs punishment, working vs short-term memory, correlation vs causation, random sampling vs random assignment, IV vs DV).
- 推理跳跃 (reasoning jump): "so/therefore/obviously/所以/显然/因此/说明/证明" where the inference does not hold or steps are missing.
- 结论无理由 (claim without reason): evaluative claims like "important/better/效果好/很重要" without why or compared to what.
- 术语未定义 (undefined term): a term, study or "the professor gave an example" without its content/conclusion.
- 绝对化表述 (overgeneralization): always/never/all/permanent/unlimited/彻底/一定/只能.
- 自标疑问 (self-flagged doubt): question marks, "didn't catch / check / ??/没听清/吧".
- 事实可能有误 (possibly incorrect): conflicts with mainstream textbook knowledge or is oversimplified (e.g. misinterpreting p-values or heritability).
One sentence may fit several types: pick the core one; never flag the same sentence twice.
quote: an exact contiguous substring of the notes, copied character by character (incl. punctuation, without the leading "- "); never join or skip fragments. Use the full clause that shows the problem (include the concept name so it is understandable on its own).
reason: one sentence on what the problem is; do not reveal the correct answer outside reason.
questions: 2-3 per spot that test real understanding, not recall: at least one must apply the concept to a NEW concrete scenario, predict an outcome, or explain a mechanism; at most one plain definition question; questions must not leak the answer. Short and specific. Every scenario you invent must be a clear-cut, textbook-correct instance of the concept that experts would classify the same way; avoid borderline cases that fit several concepts (e.g. a deliberate action triggered by a cue, like opening the door when a bell rings, is operant/discriminative-stimulus behavior, not a classical-conditioning example). Double-check each expected answer against mainstream textbooks before outputting.
expected: accurate reference answer points for grading (hidden from the student).
TONE: when writing in English, sound like a friendly, encouraging TA in office hours using the Socratic method — conversational, second person ("What do you think would happen if…?", "How would you explain to a friend why…?"), use relatable US/UK college-life scenarios (dorms, roommates, studying for midterms, part-time jobs, social media), no condescension. In other languages keep a friendly, natural tone too.
subject: the psychology subfield/topic of the notes. Order spots as they appear in the notes.`;
const SYS_J=`You are a strict but friendly psychology teaching assistant. Input: "spots", each with the original note quote, what is wrong/vague about it, follow-up questions, reference points, and the student's answers. Compare each answer with the reference points and judge semantically whether the student truly understands (not keyword matching: did they explain the mechanism / make the distinction / apply it correctly?).
LANGUAGE: write feedback, sticking_point, ask_teacher, review and summary in the SAME language as the notes/questions (field "lang" gives it). The "level" field must stay one of the enum codes.
Rules (apply strictly):
- 已掌握 (mastered): core points of all questions correct, with a mechanism explanation or correct application/example.
- 部分理解 (partial): at least one core point correct, but some answers blank / "don't know" / only restating the note or generic filler without mechanism.
- 未理解 (not understood): all blank/don't know; or a key judgment is wrong (e.g. proactive vs retroactive reversed, negative reinforcement = punishment, correlation = causation); or the answer repeats the error in the original note. A directional error on the spot's core distinction => 未理解.
- When unsure, choose the lower level.
feedback: 1-2 sentences addressed to the student ("you"), saying what is right/wrong and giving the correct point if wrong. sticking_point: the precise sticking point ("none"/"无" if mastered). ask_teacher: 0-2 concrete questions to ask the instructor (empty if mastered). review: one concrete review tip. index must match input. summary: one paragraph (strengths + top 2-3 priorities). In English, be warm and encouraging like a supportive TA (e.g. "Nice work on…", "Worth bringing to office hours:"), but stay honest about gaps.`;
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
    const L=outLang(b.text);const r=await chat([{role:'system',content:SYS_A},{role:'user',content:`OUTPUT LANGUAGE for all text fields: ${L}.\n\n<notes>\n${b.text}\n</notes>`}],'analyze',analyzeSchema,A_MODEL);
    const seen=new Set();r.data.spots=r.data.spots.filter(s=>!seen.has(s.quote)&&seen.add(s.quote)).map(s=>{if(!b.text.includes(s.quote)){const p=s.quote.split(/[，。？！?!,.;；…—\s]+/).filter(x=>x.length>=3&&b.text.includes(x)).sort((a,c)=>c.length-a.length)[0];if(p)s.quote=p;else s.quote_unmatched=true;}return s;}).sort((x,y)=>(b.text.indexOf(x.quote)+1||1e9)-(b.text.indexOf(y.quote)+1||1e9));return {...r.data,usage:r.usage,model:A_MODEL};},
  '/api/judge':async(b,ip)=>{if(!Array.isArray(b.items)||!b.items.length||b.items.length>25)throw new HttpErr(400,'参数错误');
    rollDay();const n=ipJudge.get(ip)||0;if(n>=FREE_PER_IP*2)throw new HttpErr(429,'今日判定次数已用完');ipJudge.set(ip,n+1);
    b.items=b.items.map(s=>({type:String(s.type).slice(0,10),quote:String(s.quote).slice(0,300),concept:String(s.concept).slice(0,80),reason:String(s.reason).slice(0,300),
      questions:(s.questions||[]).slice(0,3).map(q=>({q:String(q.q).slice(0,300),expected:String(q.expected).slice(0,500)})),answers:(s.answers||[]).slice(0,3).map(a=>String(a||'').slice(0,800))}));
    const items=b.items.map((s,i)=>({index:i,type:s.type,quote:s.quote,concept:s.concept,problem:s.reason,qa:s.questions.map((q,j)=>({question:q.q,reference:q.expected,answer:(s.answers[j]||'').trim()||'(blank)'}))}));
    const r=await chat([{role:'system',content:SYS_J},{role:'user',content:`OUTPUT LANGUAGE for all text fields: ${outLang(items.map(i=>i.quote+i.concept+i.qa.map(q=>q.question).join('')).join(''))}.\n\n`+JSON.stringify({spots:items})}],'judge',judgeSchema,J_MODEL);return {...r.data,usage:r.usage};},
  '/api/extract':async(b,ip)=>{rollDay();const n=ipCount.get(ip)||0;if(/image/.test(b.mime||'')&&n>=FREE_PER_IP)throw new HttpErr(429,'今日免费额度已用完');return extract(b);}
};
const STATIC={'/':'index.html','/index.html':'index.html','/en/':'en/index.html','/en/index.html':'en/index.html','/offline.js':'offline.js','/sample_notes_en.md':'sample_notes_en.md','/robots.txt':'robots.txt','/sitemap.xml':'sitemap.xml','/llms.txt':'llms.txt','/sample_notes.md':'sample_notes.md','/sample_notes_2.md':'sample_notes_2.md','/og.png':'og.png','/og-en.png':'og-en.png','/a17d8c2856d04fe5ff17dd03884db011.txt':'a17d8c2856d04fe5ff17dd03884db011.txt','/sample_notes_en_memory.md':'sample_notes_en_memory.md'};
const CT={js:'text/javascript; charset=utf-8',html:'text/html; charset=utf-8',txt:'text/plain; charset=utf-8',md:'text/plain; charset=utf-8',xml:'application/xml; charset=utf-8',png:'image/png'};
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
    if(url==='/en'){res.writeHead(301,{Location:'/en/'});return res.end();}
    const f=STATIC[url]; if(!f||req.method!=='GET') return send(404,'not found','text/plain; charset=utf-8');
    let buf=fs.readFileSync(path.join(__dirname,'public',f));if(!f.endsWith('.png'))buf=buf.toString().replaceAll('https://wentou.onrender.com',SITE);
    send(200,buf,CT[f.split('.').pop()],{'Cache-Control':f.endsWith('index.html')?'no-cache':'public, max-age=3600'});
  }catch(e){const code=e.code>=400&&e.code<600?e.code:500;log(code>=500?'error':'warn','request_failed',{path:url,code,err:e.message,ip:ipHash(ip)});send(code,{error:code===500?'服务器内部错误':e.message});}
}).listen(PORT,HOST,()=>log('info','started',{port:PORT,host:HOST,analyze:A_MODEL,judge:J_MODEL,ocr:MODEL,llm:!!KEY,free_per_ip:FREE_PER_IP,daily_usd_cap:DAILY_USD_CAP}));
