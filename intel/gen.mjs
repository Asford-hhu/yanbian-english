// 每日情报生成器（GitHub Actions 里跑）
// 支持两种通道，优先阿里云百炼（OpenAI 兼容），其次 Qoder Cloud Agents
//   通道 A：DASHSCOPE_API_KEY  （阿里云百炼 → API-KEY，sk- 开头）
//   通道 B：QODER_PAT          （Qoder 控制台 → 个人访问令牌，pt- 开头）
// 两个都没配就打印 [skip] 并以 0 退出，不会把 Actions 跑红

import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('intel');
const DAY = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' }); // YYYY-MM-DD

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

const USER_PROMPT = `日期：${DAY}
今天的学习目标：四六级与全国大学生英语竞赛（备考中）。
请按格式输出今天的情报。`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------------------------------------------------------- 校验 */
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
  const banned = /加油|相信自己|坚持就是胜利|厚积薄发|赋能|蜕变/;
  if (banned.test(out.line + summary)) {
    console.log('[warn] 文案命中禁用词，仍按原样使用');
  }
  return { line: out.line.trim().slice(0, 30), summary, steps };
}

/* ------------------------------------------------- 通道 A：阿里云百炼 */
async function viaDashScope() {
  const key = process.env.DASHSCOPE_API_KEY || '';
  if (!key) return null;
  const model = process.env.DASHSCOPE_MODEL || 'qwen-plus';
  const base = process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  console.log('[dashscope] model =', model);

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(base + '/chat/completions', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(40000),
        body: JSON.stringify({
          model,
          temperature: 0.8,
          max_tokens: 1200,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: USER_PROMPT }
          ]
        })
      });
      const text = await res.text();
      if (!res.ok) {
        console.log('[dashscope] http', res.status, text.slice(0, 220));
        await sleep(1200 * attempt);
        continue;
      }
      let body = null;
      try { body = JSON.parse(text); } catch {}
      const content = body?.choices?.[0]?.message?.content || '';
      const out = valid(extractJson(content));
      if (out) return { ...out, source: 'agent', provider: 'dashscope', model };
      console.log('[dashscope] 输出不合规，重试', attempt, content.slice(0, 120));
      await sleep(800);
    } catch (err) {
      console.log('[dashscope] error', err?.message || err);
      await sleep(1200 * attempt);
    }
  }
  return null;
}

/* ------------------------------------------- 通道 B：Qoder Cloud Agents */
const QODER_API = 'https://api.qoder.com';
const qAuth = {
  Authorization: 'Bearer ' + (process.env.QODER_PAT || ''),
  'Content-Type': 'application/json',
  Accept: 'application/json'
};

async function qapi(p, init = {}) {
  const res = await fetch(QODER_API + p, {
    ...init,
    headers: { ...qAuth, ...(init.headers || {}) },
    signal: init.signal || AbortSignal.timeout(15000)
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { ok: res.ok, status: res.status, json, text };
}

function pickArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  for (const k of ['data', 'items', 'results', 'agents', 'environments', 'list']) {
    if (Array.isArray(payload[k])) return payload[k];
  }
  return [];
}

async function viaQoder() {
  if (!process.env.QODER_PAT) return null;
  let agentId = (process.env.QODER_AGENT_ID || '').trim();
  let envId = (process.env.QODER_ENVIRONMENT_ID || '').trim();

  if (!agentId) {
    const r = await qapi('/api/v1/cloud/agents?limit=50');
    const list = pickArray(r.json);
    console.log('[qoder] agents', r.status, list.length);
    if (!list.length) { console.log('[qoder] 账户里没有 Agent，跳过'); return null; }
    const want = list.find(a => /砚边|yanbian|intel|brief|英语/i.test(String(a.name || a.title || '')));
    agentId = String((want || list[0]).id || '');
  }
  if (!envId) {
    const r = await qapi('/api/v1/cloud/environments?limit=50');
    const list = pickArray(r.json);
    console.log('[qoder] environments', r.status, list.length);
    if (!list.length) { console.log('[qoder] 没有可用环境，跳过'); return null; }
    envId = String((list.find(e => e.is_default || e.default) || list[0]).id || '');
  }

  let sid = '';
  try {
    const created = await qapi('/api/v1/cloud/sessions', {
      method: 'POST',
      body: JSON.stringify({
        agent: { type: 'agent', id: agentId },
        environment_id: envId,
        title: '砚边每日情报 ' + DAY,
        metadata: { kind: 'yanbian_intel_daily', day: DAY }
      })
    });
    if (!created.ok) { console.log('[qoder] create failed', created.status, created.text.slice(0, 160)); return null; }
    sid = String(created.json?.id || '');

    const sent = await qapi(`/api/v1/cloud/sessions/${sid}/events`, {
      method: 'POST',
      body: JSON.stringify({
        events: [
          { type: 'system.message', content: [{ type: 'text', text: SYSTEM_PROMPT }] },
          { type: 'user.message', content: [{ type: 'text', text: USER_PROMPT }] }
        ]
      })
    });
    if (!sent.ok) { console.log('[qoder] send failed', sent.status); return null; }

    const deadline = Date.now() + 22000;
    while (Date.now() < deadline) {
      const listed = await qapi(`/api/v1/cloud/sessions/${sid}/events?order=asc&limit=100`);
      if (!listed.ok) return null;
      const msgs = pickArray(listed.json).filter(e => e && e.type === 'agent.message');
      for (let i = msgs.length - 1; i >= 0; i--) {
        const text = (msgs[i].content || []).map(c => c?.text || '').join('');
        const out = valid(extractJson(text));
        if (out) return { ...out, source: 'agent', provider: 'qoder' };
      }
      await sleep(400);
    }
    console.log('[qoder] timeout');
    return null;
  } finally {
    if (sid) {
      try { await fetch(`${QODER_API}/api/v1/cloud/sessions/${sid}/cancel`, { method: 'POST', headers: qAuth, signal: AbortSignal.timeout(1500) }); } catch {}
    }
  }
}

/* ---------------------------------------------------------------- 主流程 */
function readIndex() {
  try { return JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'index.json'), 'utf8')); } catch { return { days: [] }; }
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  if (!process.env.DASHSCOPE_API_KEY && !process.env.QODER_PAT) {
    console.log('[skip] 没配 DASHSCOPE_API_KEY（阿里云百炼）也没配 QODER_PAT，本次跳过');
    process.exit(0);
  }

  let out = await viaDashScope();
  if (!out) out = await viaQoder();

  if (!out) {
    console.log('[done] 本次没有生成新内容，保留旧文件');
    process.exit(0);
  }

  const payload = { day: DAY, line: out.line, summary: out.summary, steps: out.steps, source: 'agent', provider: out.provider, model: out.model || '', updatedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(OUT_DIR, 'latest.json'), JSON.stringify(payload, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, `${DAY}.json`), JSON.stringify(payload, null, 2) + '\n', 'utf8');

  const idx = readIndex();
  idx.days = [DAY, ...(idx.days || []).filter(d => d !== DAY)].slice(0, 30);
  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(idx, null, 2) + '\n', 'utf8');

  console.log('[done]', DAY, out.summary.length, '字 ·', out.provider);
})().catch(e => { console.error(e); process.exit(1); });
