// Deno Deploy 版本：整个文件粘到 https://dash.deno.com 的 Playground 里即可
// 环境变量用 Deno.env.get（在 Deno Deploy 项目 Settings → Environment Variables 里加）

const SYS = `你是「砚边」的英语学习教练。只依据用户提供的 facts 写复盘，不得编造任何数字。
输出严格 JSON：{"line":"一句话判断，≤22字","summary":"200-300字，分3段","steps":[{"t":"动作","m":分钟数}×4],"usedFacts":["用到的字段名"]}
规则：1) summary 里出现的每个数字都必须来自 facts；2) 不写"加油""相信自己"等空话；3) 4 条步骤都要今天能做完；4) 不输出 Markdown。`;

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "content-type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const key = Deno.env.get("DASHSCOPE_API_KEY");
  if (!key) return json({ source: "none", reason: "no-key" });

  let facts: unknown;
  try {
    facts = (await req.json()).facts;
  } catch {
    return json({ source: "none", reason: "bad-json" });
  }
  if (!facts || typeof facts !== "object") return json({ source: "none", reason: "no-facts" });

  const base = Deno.env.get("DASHSCOPE_BASE_URL") ||
    "https://ws-m6sujyrldqbyf7uv.cn-beijing.maas.aliyuncs.com/compatible-mode/v1";
  const model = Deno.env.get("DASHSCOPE_MODEL") || "qwen-plus";

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 12000);

  try {
    const r = await fetch(base + "/chat/completions", {
      method: "POST",
      signal: ac.signal,
      headers: { "content-type": "application/json", authorization: "Bearer " + key },
      body: JSON.stringify({
        model,
        temperature: 0.8,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYS },
          { role: "user", content: JSON.stringify({ facts }) },
        ],
      }),
    });
    if (!r.ok) return json({ source: "none", reason: "upstream-" + r.status });
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || "";
    const obj = JSON.parse(text.replace(/^```json|```$/g, "").trim());
    return json({ source: "agent", model, report: obj });
  } catch (e) {
    return json({ source: "none", reason: String(e).slice(0, 80) });
  } finally {
    clearTimeout(timer);
  }
});
