// 每日错题情报生成器（GitHub Actions 里跑）
// 依赖：Node 20+（自带 fetch），环境变量 QODER_PAT / QODER_AGENT_ID / QODER_ENVIRONMENT_ID

import fs from 'node:fs';
import path from 'node:path';

const API = 'https://api.qoder.com';
const TIMEOUT_MS = 25000;
const OUT_DIR = path.resolve('intel');

const SYSTEM_PROMPT = `你是「砚边」英语备考站的每日值班教练，每天给一个备考四六级/大英赛的大学生写一段当天可执行的训练安排。
只输出一个 JSON 对象，不要 Markdown，不要代码块，不要解释。

格式：
{"line":"…","summary":"…","steps":[{"t":"…","m":8},{"t":"…","m":6},{"t":"…","m":5},{"t":"…","m":3}]}

硬约束：
1. summary 200–300 字，3 段：今天练什么 / 为什么现在练它 / 具体怎么练。段落之间用 \\n 分隔，不加小标题。
2. 不许编造用户的具体数字（不知道就别写数量成绩），只写动作、材料类型、时长。
3. 只允许一句鼓励，且必须是「事实 + 判断」；禁止 加油/相信自己/坚持就是胜利/厚积薄发/赋能/蜕变。
4. steps 恰好 4 条，每条 ≤18 字，含动作和时长或数量，按优先级排序，第一条是今天最该做的。
5. line ≤22 字，判断句，能独立看懂。
6. 不许出现英文单词（文章标题除外）、emoji、括号注释；不用「亲爱的」「同学」开头。
7. 语气像教练：短句、具体、不客套。`;

const day = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' }); // YYYY-MM-DD

const sleep = ms => new Promise(r => setTimeout(r, ms));

function extractJson(text) {
  const clean = String(text || '').replace(/```(?:json)?/gi, '').trim();
  try { return JSON.parse(clean); } catch {}
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
  if (s >= 0 && e > s) { try { return JSON.parse(clean.slice(s, e + 1)); } catch {} }
  return null;
}

function valid(out) {
  if (!out || typeof out.summary !== 'string' || typeof out.line !== 'string') return null;
  if (!Array.isArray(out.steps) || out.steps.length !== 4) return null;
  const steps = out.steps
    .map(s => ({ t: String(s?.t || '').slice(0, 24), m: Math.max(1, Math.min(60, Math.round(Number(s?.m) || 5))) }))
    .filter(s => s.t);
  if (steps.length !== 4) return null;
  const summary = out.summary.replace(/\r/g, '').trim();
  if (summary.length < 120 || summary.length > 420) return null;
  return { line: out.line.trim().slice(0, 30), summary, steps };
}

async function runAgent(payload) {
  const token = process.env.QODER_PAT;
  const agentId = process.env.QODER_AGENT_ID;
  const envId = process.env.QODER_ENVIRONMENT_ID;
  if (!token || !agentId || !envId) {
    console.log('[skip] 缺少 QODER_PAT / QODER_AGENT_ID / QODER_ENVIRONMENT_ID');
    return null;
  }
  const auth = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Accept: 'application/json' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let sid = '';
  try {
    const created = await fetch(API + '/api/v1/cloud/sessions', {
      method: 'POST', headers: auth, signal: ctrl.signal,
      body: JSON.stringify({
        agent: { type: 'agent', id: agentId },
        environment_id: envId,
        title: '砚边每日情报 ' + day,
        metadata: { kind: 'yanbian_intel_daily', day, temperature: 0.6, max_tokens: 900 }
      })
    });
    if (!created.ok) { console.log('[agent] create failed', created.status); return null; }
    sid = String((await created.json()).id || '');
    if (!/^sess_[A-Za-z0-9_-]+$/.test(sid)) { console.log('[agent] bad session id'); return null; }

    const sent = await fetch(`${API}/api/v1/cloud/sessions/${sid}/events`, {
      method: 'POST', headers: auth, signal: ctrl.signal,
      body: JSON.stringify({
        events: [
          { type: 'system.message', content: [{ type: 'text', text: SYSTEM_PROMPT }] },
          { type: 'user.message', content: [{ type: 'text', text: `日期：${day}\n今天的学习目标：四六级与全国大学生英语竞赛（备考中）。\n请按格式输出今天的情报。` }] }
        ]
      })
    });
    if (!sent.ok) { console.log('[agent] send failed', sent.status); return null; }

    const deadline = Date.now() + TIMEOUT_MS - 2000;
    while (Date.now() < deadline) {
      const listed = await fetch(`${API}/api/v1/cloud/sessions/${sid}/events?order=asc&limit=100`, { headers: auth, signal: ctrl.signal });
      if (!listed.ok) { console.log('[agent] list failed', listed.status); return null; }
      const page = await listed.json();
      const msgs = (Array.isArray(page.data) ? page.data : []).filter(e => e && e.type === 'agent.message');
      for (let i = msgs.length - 1; i >= 0; i--) {
        const text = (msgs[i].content || []).map(c => c?.text || '').join('');
        const out = valid(extractJson(text));
        if (out) return out;
      }
      await sleep(400);
    }
    console.log('[agent] timeout');
    return null;
  } catch (err) {
    console.log('[agent] error', err?.message || err);
    return null;
  } finally {
    clearTimeout(timer);
    if (sid) {
      try {
        await fetch(`${API}/api/v1/cloud/sessions/${sid}/cancel`, {
          method: 'POST', headers: auth, signal: AbortSignal.timeout(1500)
        });
      } catch {}
    }
  }
}

function readIndex() {
  try { return JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'index.json'), 'utf8')); } catch { return { days: [] }; }
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out = await runAgent({ day });

  if (!out) {
    console.log('[done] 本次没有生成新内容，保留旧文件');
    process.exit(0);
  }

  const payload = { day, ...out, source: 'agent', updatedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(OUT_DIR, 'latest.json'), JSON.stringify(payload, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, `${day}.json`), JSON.stringify(payload, null, 2) + '\n', 'utf8');

  const idx = readIndex();
  idx.days = [day, ...(idx.days || []).filter(d => d !== day)].slice(0, 30);
  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(idx, null, 2) + '\n', 'utf8');

  console.log('[done]', day, out.summary.length, '字');
})().catch(e => { console.error(e); process.exit(1); });
