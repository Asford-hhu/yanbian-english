const fs = require('fs');
const http = require('http');
const BASE = process.argv[2] || 'http://127.0.0.1:8765/index.html?v=' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = u => new Promise((res, rej) => http.get(u, r => {
  let b = ''; r.on('data', d => b += d); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } });
}).on('error', rej));

(async () => {
  const page = (await getJson('http://127.0.0.1:9222/json/list')).find(x => x.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let n = 0; const pending = new Map(); const errors = [];
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const q = pending.get(m.id); pending.delete(m.id);
      m.error ? q.rej(new Error(JSON.stringify(m.error))) : q.res(m.result);
    } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const id = ++n; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params }));
  });
  const js = async expression => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result.value;
  };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: BASE });
  for (let i = 0; i < 200; i++) { if (await js('document.readyState') === 'complete') break; await sleep(100); }
  await sleep(400);

  const checks = [];
  const check = (name, ok, info) => checks.push([name, !!ok, info || '']);

  // 数据层：656 题的答案字母必须与整理稿解析中的“答案为(X)/答案解析：(X)”一致
  const dataCheck = await js(`(() => {
    const exams = window.YANBIAN_MOCK_EXAMS || [];
    let total = 0, keyMismatch = [], dirtyOpts = [], missingKey = [];
    const dirty = /(Section\\s+[ABC]|Directions:|Passage\\s+(One|Two)|\\s[0-9oOlI]{1,2}\\.\\s+|Diff\\s+ii\\s|theend|aged\\d|Africans\\d|colleagues\\d|residents\\d)/i;
    const POS = /正确答案|正确选项|项正确|选项正确|为正确答案|为正确选项|故为|故选|应为|应选|答案是|答案为|答案解析|吻合|相符|一致|为答案|正确/;
    const NEG = /排除|不符|未提及|无中生有|捏造|曲解|并非|不是|错误|而不是|并未|没有提|无关|干扰|与题干不合|不吻合|不相符|不一致|不正确/;
    const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const MANUAL = new Set(['CET4-202506-2-51','CET6-202506-1-2','CET6-202506-1-24','CET6-202506-1-25','CET4-202512-2-7','CET6-202512-1-1','CET6-202512-1-7','CET6-202512-1-13','CET6-202512-1-22','CET6-202512-2-15']);
    function extract(w){
      const lines=String(w||'').split('\\n').map(s=>s.trim()).filter(s=>s && !/^[（(][A-Z][）)]$/.test(s));
      const text=lines.join('\\n').replace(/([A-Z])\\s+(?=[项为选项])/g,'$1').replace(/(故|为|选)\\s+([A-Z])/g,'$1$2');
      const sents=text.split(/[。；！？\\n]/).map(s=>s.trim()).filter(Boolean);
      const pats=[/[（(]\\s*([A-Z])\\s*[）)]/g,/选项\\s*[（(]?\\s*([A-Z])/g,/([A-Z])\\s*项/g,/(?:故|为|选|应|是)\\s*([A-Z])(?![A-Za-z])/g];
      function find(s){const out=[];for(const p of pats){p.lastIndex=0;let m;while((m=p.exec(s)))out.push(m[1]);}return out;}
      const cand=[];
      sents.forEach((s,i)=>{if(!POS.test(s))return;const neg=NEG.test(s);let L=find(s);if(!L.length&&i>0)L=find(sents[i-1]);L.forEach(x=>cand.push([x,neg]));});
      if(!cand.length)return null;
      const good=cand.filter(c=>!c[1]);const pool=good.length?good:cand;const count={};pool.forEach(c=>count[c[0]]=(count[c[0]]||0)+1);
      return Object.keys(count).sort((a,b)=>count[b]-count[a])[0] || null;
    }
    for (const e of exams) for (const q of e.questions) {
      total++;
      const got=extract(q.why);
      if (!got && !MANUAL.has(e.id + '-' + q.no)) missingKey.push(e.id + '-' + q.no);
      else if (got && LETTERS.indexOf(got) !== q.answer) keyMismatch.push(e.id + '-' + q.no + ':' + q.answer + '->' + got);
      if (q.type !== 'matching') (q.opts || []).forEach((o, i) => { if (dirty.test(o)) dirtyOpts.push(e.id + '-' + q.no + '-' + i); });
    }
    return { total, keyMismatch, dirtyOpts, missingKey };
  })()`);
  check('题库共 656 题', dataCheck.total === 656, String(dataCheck.total));
  check('答案字母与整理稿逐题一致', dataCheck.keyMismatch.length === 0, dataCheck.keyMismatch.join(','));
  check('每题均可提取整理稿答案', dataCheck.missingKey.length === 0, dataCheck.missingKey.join(','));
  check('选项无混入章节/下一题/OCR 残字', dataCheck.dirtyOpts.length === 0, dataCheck.dirtyOpts.join(','));

  async function openResult(examId, tab) {
    await js("window.__YANBIAN__.navigate('mock')");
    await sleep(250);
    await js(`document.querySelector('[data-mtab="${tab}"]').click()`);
    await sleep(200);
    await js(`document.querySelector('[data-mstart="${examId}"]').click()`);
    await sleep(300);
    await js("document.querySelector('#mockSubmit').click()");
    await sleep(220);
    await js("document.querySelector('[data-mconfirm=\"ok\"]')?.click()");
    await sleep(420);
  }

  // 六级第 1 套：结果页选项必须带英文括号，和整理稿一致
  await openResult('CET6-1', 'cet6');
  const optsCheck = await js(`(() => {
    const rows = [...document.querySelectorAll('.res-q__opts > div')];
    const bad = rows.map(r => r.textContent.trim()).filter(t => !/^\\([A-Z]\\) /.test(t));
    return { total: rows.length, bad: bad.slice(0, 6), badCount: bad.length };
  })()`);
  check('结果页选项全部使用 (A) 格式', optsCheck.badCount === 0, `${optsCheck.badCount}/${optsCheck.total} ${optsCheck.bad.join('|')}`);

  // 四级第 3 套：复核此前答案不一致的第 50 题
  await openResult('CET4-3', 'cet4');
  const q50 = await js(`(() => {
    const card = [...document.querySelectorAll('.res-q')].find(n => n.querySelector('.res-q__h')?.textContent.includes('50.'));
    if (!card) return null;
    const rows = [...card.querySelectorAll('.res-q__opts > div')].map(r => ({ text: r.textContent.trim(), ans: r.classList.contains('is-ans') }));
    const ans = rows.find(r => r.ans);
    return { ans: ans && ans.text, why: card.querySelector('.res-q__why')?.textContent || '', badKey: ans && !ans.text.startsWith('(A) ') };
  })()`);
  check('四级第 3 套第 50 题答案改为 A', q50 && q50.ans && q50.ans.startsWith('(A) '), q50 ? q50.ans : '未找到题目');
  check('第 50 题解析与答案一致', q50 && q50.why.includes('答案为(A)'), (q50 ? q50.why : '').slice(0, 100));
  await js(`(() => { const c = [...document.querySelectorAll('.res-q')].find(n => n.querySelector('.res-q__h')?.textContent.includes('50.')); if (c) c.scrollIntoView({ block:'center', behavior:'instant' }); })()`);
  await sleep(250);
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync('C:/Users/Walon Ashford/Desktop/我的英语网站/mock-final-check.png', Buffer.from(shot.data, 'base64'));
  check('无 JS 异常', errors.length === 0, errors.join('|'));

  let pass = 0;
  for (const [name, ok, info] of checks) { console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + (info ? ' | ' + info : '')); if (ok) pass++; }
  console.log(`\n${pass}/${checks.length} passed`);
  ws.close();
  process.exit(pass === checks.length ? 0 : 1);
})().catch(e => { console.error('ERR', e); process.exit(2); });
