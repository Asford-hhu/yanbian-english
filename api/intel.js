export const config = { runtime: 'edge' };

const SYS = `你是「砚边」的英语学习教练。只依据用户提供的 facts 写复盘，不得编造任何数字。
输出严格 JSON：{"line":"一句话判断，≤22字","summary":"200-300字，分3段","steps":[{"t":"动作","m":分钟数}×4],"usedFacts":["用到的字段名"]}
规则：1) summary 里出现的每个数字都必须来自 facts；2) 不写"加油""相信自己"等空话；3) 4 条步骤都要今天能做完；4) 不输出 Markdown。`;

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405, cors);

  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) return json({ source: 'none', reason: 'no-key' }, 200, cors);

  let facts;
  try { facts = (await req.json()).facts; } catch (e) { return json({ source: 'none', reason: 'bad-json' }, 200, cors); }
  if (!facts || typeof facts !== 'object') return json({ source: 'none', reason: 'no-facts' }, 200, cors);

  const base = process.env.DASHSCOPE_BASE_URL || 'https://ws-m6sujyrldqbyf7uv.cn-beijing.maas.aliyuncs.com/compatible-mode/v1';
  const model = process.env.DASHSCOPE_MODEL || 'qwen-plus';
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 12000);

  try {
    const r = await fetch(base + '/chat/completions', {
      method: 'POST',
      signal: ac.signal,
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model,
        temperature: 0.8,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYS },
          { role: 'user', content: JSON.stringify({ facts }) }
        ]
      })
    });
    if (!r.ok) return json({ source: 'none', reason: 'upstream-' + r.status }, 200, cors);
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || '';
    const obj = JSON.parse(text.replace(/^```json|```$/g, '').trim());
    return json({ source: 'agent', model, report: obj }, 200, cors);
  } catch (e) {
    return json({ source: 'none', reason: String(e).slice(0, 80) }, 200, cors);
  } finally {
    clearTimeout(timer);
  }
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...headers, 'content-type': 'application/json; charset=utf-8' }
  });
}
