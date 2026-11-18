/* ============================================================
   砚边 · 应用逻辑
   状态层 (localStorage) + 路由 + 各模块渲染与交互
   ============================================================ */

(() => {
  'use strict';

  /* ---------- 0. 工具 ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const today = () => new Date().toISOString().slice(0, 10);
  const fmtDate = (d) => new Date(d).toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric', weekday:'long' });
  const clone = (o) => (typeof structuredClone === 'function') ? structuredClone(o) : JSON.parse(JSON.stringify(o));

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-show'), 2200);
  }

  /* ---------- 1. 状态层 ---------- */
  const KEY = 'yansbian_study_v1';
  const DEFAULT_STATE = {
    theme: 'light',
    checkins: [],              // ['2026-11-18', ...]
    practice: { reading: {}, listening: {}, mock: {} }, // 各题答题记录 {qid: {chosen, correct, ts}}
    vocabSaved: [],            // 生词本 [word]
    favExpr: [],               // 收藏表达 [en]
    mistakes: [],              // [{id, src, q, opts, answer, chosen, why, ts}]
    mockRuns: [],              // [{ts, score, total, seconds}]
    lastView: 'dashboard'
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return clone(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      // 合并默认结构（兼容旧数据）
      return { ...clone(DEFAULT_STATE), ...parsed,
        practice: { ...DEFAULT_STATE.practice, ...(parsed.practice || {}) } };
    } catch (e) {
      return clone(DEFAULT_STATE);
    }
  }
  let S = loadState();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast('保存失败：本地存储空间不足'); }
  }

  function streak() {
    if (!S.checkins.length) return 0;
    const set = new Set(S.checkins);
    let count = 0;
    const d = new Date();
    // 若今天未打卡，从昨天开始计
    if (!set.has(today())) d.setDate(d.getDate() - 1);
    while (set.has(d.toISOString().slice(0, 10))) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }
  function checkIn() {
    const t = today();
    if (S.checkins.includes(t)) { toast('今天已经打过卡啦'); return; }
    S.checkins.push(t); save(); RENDERERS.dashboard(); updateChrome();
    toast('打卡成功 · 坚持第 ' + streak() + ' 天');
  }

  /* ---------- 2. TTS 发音（微信 / 桌面 处处有声） ----------
     2026-11-18 二次修复，定位到微信无声的真正原因：
     1) 百度 gettts 有防盗链：请求带 Referer 时返回 0 字节，不带才返回真实 MP3。
        页面 <meta name="referrer" content="no-referrer"> + audio.referrerPolicy 双保险。
     2) 微信 WebView 自动播放限制极严：把 audio 挂到 DOM 并显示原生控制条，
        自动播放被拦时用户点一下播放键 100% 出声（不再只弹一句提示）。
     3) 万一 no-referrer 被内核忽略：自动降级到有道 dictvoice（带 Referer 也能出声，
        但只支持短句，故降级时按 30 字符重新切片）。
     4) 桌面仍优先原生 speechSynthesis；长文按句分段串行播放。
     speak(text, rate) 签名不变，所有播放按钮（读句子 / 朗读全文 / 听说）无需改动。
  ------------------------------------------------------------------ */
  let voices = [];
  let currentAudio = null;      // 当前在线音频实例，便于打断
  let ttsSeq = 0;               // 异步竞态令牌：只播放最后一次点击
  let audioUnlocked = false;    // 是否已用静音音频解锁自动播放
  let segTimers = [];           // 分段播放定时器，便于打断
  let ttsBox = null, ttsAudio = null, ttsHint = null;

  function initVoices() {
    if (!('speechSynthesis' in window)) return;
    const load = () => { voices = window.speechSynthesis.getVoices() || []; };
    load();
    if (window.speechSynthesis.onvoiceschanged !== undefined) window.speechSynthesis.onvoiceschanged = load;
  }

  // 是否微信 / QQ 等内置浏览器（原生 TTS 常缺失或不出声）
  function isInAppBrowser() {
    const ua = navigator.userAgent || '';
    return /MicroMessenger/i.test(ua) || / QQ\//i.test(ua) || /QQBrowser/i.test(ua) || /Weibo/i.test(ua);
  }

  // 点击手势内同步播放一段静音音频，解锁微信 / QQ 自动播放限制
  function unlockAudio() {
    if (audioUnlocked) return;
    try {
      const silent = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjQwLjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
      const a = new Audio(silent);
      a.volume = 0.01;
      const p = a.play();
      if (p && typeof p.then === 'function') { p.then(() => { audioUnlocked = true; }).catch(() => {}); }
      else audioUnlocked = true;
    } catch (e) { audioUnlocked = true; }
  }

  // 按句子把长文本切成若干段，每段不超过 max 字符
  function splitForTts(text, max) {
    max = max || 180;
    const clean = String(text).replace(/\s+/g, ' ').trim();
    if (clean.length <= max) return [clean];
    const sents = clean.match(/[^.!?。！？]+[.!?。！？]*/g) || [clean];
    const parts = [];
    let buf = '';
    sents.forEach(s => {
      s = s.trim();
      if (!s) return;
      if (buf && (buf + ' ' + s).length > max) { parts.push(buf); buf = s; }
      else buf = buf ? buf + ' ' + s : s;
    });
    if (buf) parts.push(buf);
    const out = [];
    parts.forEach(p => {
      if (p.length <= max) { out.push(p); return; }
      const words = p.split(' '); let b = '';
      words.forEach(w => {
        if (b && (b + ' ' + w).length > max) { out.push(b); b = w; }
        else b = b ? b + ' ' + w : w;
      });
      if (b) out.push(b);
    });
    return out;
  }

  // 创建（或复用）一个挂载在 DOM 上的 audio。微信里显示原生控制条；桌面隐藏。
  // 挂在 DOM 上比游离的 new Audio() 更容易被微信允许播放。
  function ensureAudio(visible) {
    if (ttsAudio && ttsAudio.isConnected) {
      if (visible) { ttsBox.style.display = 'block'; ttsAudio.controls = true; }
      return ttsAudio;
    }
    hidePlayer();
    const box = document.createElement('div');
    box.id = 'yb-tts-player';
    box.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;' +
      'max-width:560px;margin:0 auto;background:#fff;border:1px solid #d8e3f2;' +
      'border-radius:14px;box-shadow:0 10px 36px rgba(30,60,110,.22);padding:12px 14px;' +
      'font:14px/1.5 -apple-system,system-ui,sans-serif;color:#2f3b52;display:' + (visible ? 'block' : 'none');
    const title = document.createElement('div');
    title.textContent = '朗读播放器';
    title.style.cssText = 'font-weight:700;margin-bottom:2px';
    const hint = document.createElement('div');
    hint.textContent = visible ? '点下方播放键 ▶ 即可听到声音（微信首次需手动点一次）' : '';
    hint.style.cssText = 'font-size:12px;color:#7b879b;margin-bottom:8px';
    const au = document.createElement('audio');
    au.controls = !!visible;
    au.preload = 'auto';
    // 关键：音频请求不带 Referer，绕开百度 TTS 防盗链
    try { au.referrerPolicy = 'no-referrer'; } catch (e) {}
    try { au.setAttribute('referrerpolicy', 'no-referrer'); } catch (e) {}
    au.style.cssText = 'width:100%;height:40px;display:block';
    const close = document.createElement('button');
    close.textContent = '收起';
    close.style.cssText = 'margin-top:8px;border:0;background:#eef3fb;color:#3a5a8c;' +
      'border-radius:8px;padding:5px 14px;font-size:12px;cursor:pointer';
    close.onclick = () => { stopSpeak(); };
    box.appendChild(title); box.appendChild(hint); box.appendChild(au); box.appendChild(close);
    document.body.appendChild(box);
    ttsBox = box; ttsAudio = au; ttsHint = hint;
    currentAudio = au;
    return au;
  }

  function revealPlayer(msg) {
    if (!ttsAudio || !ttsBox) return;
    ttsBox.style.display = 'block';
    try { ttsAudio.controls = true; } catch (e) {}
    if (msg && ttsHint) ttsHint.textContent = msg;
  }

  function hidePlayer() {
    if (ttsAudio) { try { ttsAudio.pause(); } catch (e) {} }
    if (ttsBox && ttsBox.parentNode) { try { ttsBox.parentNode.removeChild(ttsBox); } catch (e) {} }
    ttsBox = null; ttsAudio = null; ttsHint = null;
  }

  function stopSpeak() {
    ttsSeq++;
    try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) {}
    if (currentAudio) { try { currentAudio.pause(); } catch (e) {} }
    hidePlayer();
    currentAudio = null;
    segTimers.forEach(t => { try { clearTimeout(t); } catch (e) {} });
    segTimers = [];
  }

  // 主入口：签名不变。所有发音都在本函数的同步调用栈内启动
  function speak(text, rate = 0.95) {
    stopSpeak();
    const seq = ttsSeq;
    if (!text) return;
    unlockAudio();
    // 桌面优先原生（音质自然、离线可用）；微信内置浏览器跳过，直接走在线
    if (!isInAppBrowser() && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US'; u.rate = rate;
        const v = voices.find(x => x.lang && x.lang.indexOf('en') === 0 && /Google US English|Samantha|Microsoft.*English/i.test(x.name)) || voices.find(x => x.lang && x.lang.indexOf('en') === 0);
        if (v) u.voice = v;
        window.speechSynthesis.speak(u);
        return;
      } catch (e) { /* 落到在线方案 */ }
    }
    playOnline(text, rate, seq);
  }

  // 在线朗读：百度主源(no-referrer) → 有道短句备源 → 原生播放器手动点击
  function playOnline(text, rate, seq) {
    if (seq !== ttsSeq) return;
    const inApp = isInAppBrowser();
    let a;
    try { a = ensureAudio(inApp); } catch (e) { a = new Audio(); }
    if (!a) return;
    let segs = splitForTts(text, 180);
    const spd = Math.max(1, Math.min(9, Math.round(rate * 3.5)));
    let i = 0;
    let provider = 'baidu';
    let degraded = false;

    const urlFor = (s) => provider === 'youdao'
      ? 'https://dict.youdao.com/dictvoice?audio=' + encodeURIComponent(s) + '&le=eng'
      : 'https://fanyi.baidu.com/gettts?lan=en&text=' + encodeURIComponent(s) + '&spd=' + spd + '&source=web';

    const playSeg = () => {
      if (seq !== ttsSeq || i >= segs.length) return;
      let advanced = false;
      const next = () => {
        if (advanced || seq !== ttsSeq) return;
        advanced = true;
        i++;
        if (i < segs.length) {
          const t = setTimeout(playSeg, 150);
          segTimers.push(t);
        }
      };
      a.onended = next;
      a.onerror = () => {
        if (advanced || seq !== ttsSeq) return;
        advanced = true;
        if (!degraded) {
          // 百度被防盗链挡住（或网络异常）：切到有道短句音源，带 Referer 也能出声
          degraded = true;
          provider = 'youdao';
          segs = splitForTts(segs.slice(i).join(' '), 30);
          i = 0;
          revealPlayer('已切换备用音源，请点播放键 ▶');
          const t = setTimeout(playSeg, 80);
          segTimers.push(t);
        } else {
          revealPlayer('音源暂时不可用，请点播放键 ▶ 重试');
        }
      };
      try { a.src = urlFor(segs[i]); a.load(); } catch (e) {}
      // 关键：在手势栈内同步调用 play()；被自动播放策略拦截时露出原生播放键
      try {
        const p = a.play();
        if (p && typeof p.catch === 'function') p.catch(() => { revealPlayer('自动播放被拦截，请点下方播放键 ▶'); });
      } catch (e) { revealPlayer('请点播放键 ▶'); }
    };
    playSeg();
  }

  /* ---------- 3. 主题 ---------- */
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', S.theme);
  }
  function toggleTheme() {
    S.theme = S.theme === 'dark' ? 'light' : 'dark';
    save(); applyTheme();
    toast(S.theme === 'dark' ? '已切换到夜间模式' : '已切换到日间模式');
  }

  /* ---------- 4. 路由 ---------- */
  const VIEW_META = {
    dashboard: { title: '今日概览', mark: '序', lede: '把每一天，写成看得见的进步。', folio: 'FOLIO 01' },
    study:     { title: '研习路径', mark: '壹', lede: '四步功课，从输入到输出，稳稳地把水平提上去。', folio: 'FOLIO 02' },
    reading:   { title: '阅读', mark: '贰', lede: '精读一篇，胜过泛读十篇。', folio: 'FOLIO 03' },
    writing:   { title: '写作表达库', mark: '叁', lede: '积累有质感的高级表达，而非套路模板。', folio: 'FOLIO 04' },
    vocab:     { title: '语境词汇', mark: '肆', lede: '在句子里记住一个词，才算真正拥有它。', folio: 'FOLIO 05' },
    listening: { title: '听说训练', mark: '伍', lede: '听懂、跟读、听写——把耳朵练出来。', folio: 'FOLIO 06' },
    mistakes:  { title: '错题本', mark: '陆', lede: '错过的题，是最值钱的提分线索。', folio: 'FOLIO 07' },
    mock:      { title: '模考计时', mark: '柒', lede: '在时间里练习，才能在考场上从容。', folio: 'FOLIO 08' },
    stats:     { title: '学习进度', mark: '捌', lede: '看得见的进步，才撑得起长期的坚持。', folio: 'FOLIO 09' },
    resources: { title: '资源导航', mark: '玖', lede: '站在优质资源的肩上，少走弯路。', folio: 'FOLIO 10' }
  };
  let currentView = 'dashboard';
  const RENDERERS = {};

  function navigate(view, push = true) {
    if (!VIEW_META[view]) view = 'dashboard';
    currentView = view;
    S.lastView = view; save();
    $$('.view').forEach(v => v.classList.toggle('is-active', v.dataset.view === view));
    $$('.nav-item').forEach(n => n.classList.toggle('is-active', n.dataset.view === view));
    const m = VIEW_META[view];
    $('#viewTitle').textContent = m.title;
    $('#marginMark').textContent = m.mark;
    $('#viewLede').textContent = m.lede;
    $('#folio').textContent = m.folio;
    document.querySelector('.page-foot #footQuote').textContent = DATA.quotes[Math.floor(Math.random() * DATA.quotes.length)];
    if (RENDERERS[view]) RENDERERS[view]();
    closeSpine();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- 5. 顶栏信息 ---------- */
  function updateChrome() {
    $('#dateline').textContent = fmtDate(new Date());
    const st = streak();
    $('#streakMiniText').textContent = '连续 ' + st + ' 天';
    $('#streakTop').textContent = '✦ ' + st + ' 天';
  }

  /* ---------- 6. 概览 ---------- */
  function daysUntilExam() {
    // 大英赛：次年 4 月第 2 个周六（近似 4/11）；仅作激励估算
    const now = new Date();
    let year = now.getFullYear();
    let exam = new Date(year, 3, 11);
    if (now > exam) exam = new Date(year + 1, 3, 11);
    return Math.max(0, Math.ceil((exam - now) / 86400000));
  }
  function totalAnswered() {
    let n = 0;
    Object.values(S.practice).forEach(sec => { n += Object.keys(sec || {}).length; });
    return n;
  }
  function correctRate() {
    let total = 0, ok = 0;
    Object.values(S.practice).forEach(sec => {
      Object.values(sec || {}).forEach(r => { total++; if (r.correct) ok++; });
    });
    // 模考记录也计入
    S.mockRuns.forEach(r => { total += r.total; ok += r.score; });
    return total ? Math.round(ok / total * 100) : 0;
  }

  RENDERERS.dashboard = function () {
    const root = $('#view-dashboard');
    const days = daysUntilExam();
    const checked = S.checkins.includes(today());
    root.innerHTML = `
      <div class="hero-card">
        <div class="hero-card__row">
          <div class="hero-card__lead">
            <div class="hero-card__eyebrow">The Road Ahead</div>
            <div class="hero-card__big">稳过四六级，冲刺<em>大英赛省奖</em></div>
            <p class="hero-card__desc">从这里开始，把英语读成自己的书。按「研习路径」一步一步走，水平会像日记一样，一天天积累成册。</p>
          </div>
          <div class="countdown">
            <div class="countdown__num">${days}</div>
            <div class="countdown__unit">DAYS TO GO</div>
            <div class="countdown__label">距大英赛（估算）约 ${days} 天</div>
          </div>
        </div>
      </div>

      <div class="checkin-bar" style="margin-top:var(--sp-4)">
        <div class="checkin-bar__text">
          <strong>${checked ? '今日已打卡 ✓' : '今天，也来读一页吧'}</strong>
          <small>连续学习 ${streak()} 天 · 共打卡 ${S.checkins.length} 次</small>
        </div>
        <button class="btn btn--primary" id="checkinBtn" ${checked ? 'disabled' : ''}>${checked ? '已完成' : '每日打卡'}</button>
      </div>

      <div class="stat-strip" style="margin-top:var(--sp-4)">
        <div class="stat-cell"><div class="stat-cell__num">${totalAnswered()}</div><div class="stat-cell__label">累计答题</div></div>
        <div class="stat-cell"><div class="stat-cell__num">${correctRate()}%</div><div class="stat-cell__label">正确率</div></div>
        <div class="stat-cell"><div class="stat-cell__num">${S.vocabSaved.length}</div><div class="stat-cell__label">生词本</div></div>
        <div class="stat-cell"><div class="stat-cell__num">${S.favExpr.length + S.mistakes.length}</div><div class="stat-cell__label">收藏 + 错题</div></div>
      </div>

      <div class="sec-head"><span class="sec-head__no">§</span><h2>从这里继续</h2><span class="sec-head__note">Choose where to pick up</span></div>
      <div class="grid grid--auto">
        ${quickCard('reading', '阅读', '精读真题，积累表达', '贰')}
        ${quickCard('writing', '写作', '高级表达与替换词', '叁')}
        ${quickCard('vocab', '词汇', '在语境里记住单词', '肆')}
        ${quickCard('listening', '听说', '听写与跟读练习', '伍')}
      </div>
    `;
    $('#checkinBtn')?.addEventListener('click', checkIn);
    $$('.quick-card', root).forEach(c => c.addEventListener('click', () => navigate(c.dataset.goto)));
  };
  function quickCard(view, title, desc, mark) {
    return `<button class="card card--hover quick-card" data-goto="${view}" style="text-align:left;border-left:3px solid var(--accent)">
      <span class="card__label">${mark} · 功课</span>
      <h3>${title}</h3>
      <div style="font-family:var(--font-serif);font-size:.85rem;color:var(--ink-faint)">${desc}</div>
    </button>`;
  }

  /* ---------- 7. 研习路径 ---------- */
  RENDERERS.study = function () {
    const root = $('#view-study');
    const rows = DATA.studyPath.map(p => `
      <tr>
        <td>${p.no}</td>
        <td><strong>${p.title}</strong></td>
        <td style="color:var(--ink-soft)">${p.desc}</td>
        <td><span class="tag tag--pine">${p.target}</span></td>
      </tr>`).join('');
    root.innerHTML = `
      <div class="card" style="margin-bottom:var(--sp-5)">
        <div class="card__label">A Note to Myself</div>
        <p style="font-family:var(--font-serif);margin:0;color:var(--ink-soft)">你不是英语专业的，但你有清楚的目标：先把整体水平提到<b>“211 英语程度”</b>，再稳稳地过四六级、冲大英赛省奖。这条路不靠天赋，靠的是每天看得见的一点积累。下面的四步功课，按顺序走，别着急。</p>
      </div>
      <div class="sec-head"><span class="sec-head__no">§</span><h2>四步功课</h2><span class="sec-head__note">输入 → 输出 → 巩固</span></div>
      <div class="card" style="padding:0;overflow:hidden">
        <table class="path-table">
          <thead><tr><th></th><th>阶段</th><th>怎么做</th><th>对应模块</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="text-align:center;margin-top:var(--sp-5)">
        <button class="btn btn--primary" id="startPathBtn">从第一步开始 · 去背词</button>
      </div>
    `;
    $('#startPathBtn').addEventListener('click', () => navigate('vocab'));
  };

  /* ---------- 8. 阅读 ---------- */
  let readingState = { id: 'r1', answered: {} };
  RENDERERS.reading = function () {
    const root = $('#view-reading');
    const opts = DATA.reading.map((a, i) => `<option value="${a.id}" ${a.id === readingState.id ? 'selected' : ''}>${a.title} · ${a.level}</option>`).join('');
    root.innerHTML = `
      <div class="filter-bar">
        <label style="font-family:var(--font-serif);font-size:.9rem;color:var(--ink-soft)">选一篇文章：</label>
        <select id="readingSelect">${opts}</select>
        <span class="tag">答对会存入进度</span>
      </div>
      <div id="readingContent"></div>
    `;
    const renderArticle = () => {
      const art = DATA.reading.find(a => a.id === readingState.id);
      const key = (qi) => `${art.id}-${qi}`;
      const qs = art.questions.map((q, qi) => {
        const rec = S.practice.reading[key(qi)];
        const chosen = readingState.answered[key(qi)] ?? rec?.chosen;
        const showFeedback = chosen !== undefined;
        const optHtml = q.opts.map((o, oi) => {
          let cls = '';
          if (showFeedback) {
            if (oi === q.answer) cls = 'is-correct';
            else if (oi === chosen) cls = 'is-wrong';
          } else if (oi === chosen) cls = 'is-selected';
          return `<button class="opt ${cls}" data-q="${qi}" data-o="${oi}"><span class="opt__key">${'ABCD'[oi]}</span><span>${esc(o.replace(/^[A-D]\.\s*/, ''))}</span></button>`;
        }).join('');
        return `<div class="question">
          <div class="question__q">${qi + 1}. ${esc(q.q)}</div>
          <div class="question__opts">${optHtml}</div>
          ${showFeedback ? `<div class="feedback"><strong>${chosen === q.answer ? '答对了' : '再想想'}</strong> · ${esc(q.why)}</div>` : ''}
        </div>`;
      }).join('');
      $('#readingContent').innerHTML = `
        <div class="card" style="margin-bottom:var(--sp-5)">
          <div class="passage">
            <div class="passage__meta">${art.level} · ${art.meta}</div>
            <div class="passage__title">${esc(art.title)}</div>
            ${art.body.map(p => `<p>${esc(p)}</p>`).join('')}
          </div>
          <div style="margin-top:var(--sp-4);text-align:right">
            <button class="speak-btn" data-speak="${esc(art.body.join(' '))}"><svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15 9a4 4 0 0 1 0 6"/></svg>朗读全文</button>
          </div>
        </div>
        <div class="sec-head"><span class="sec-head__no">§</span><h2>理解题</h2><span class="sec-head__note">${art.questions.length} 小题</span></div>
        <div class="card" id="readingQs">${qs}</div>
      `;
      bindArticleEvents(art);
    };
    const bindArticleEvents = (art) => {
      $$('#readingQs .opt').forEach(btn => btn.addEventListener('click', () => {
        const qi = +btn.dataset.q, oi = +btn.dataset.o;
        const q = art.questions[qi];
        const key = `${art.id}-${qi}`;
        const correct = oi === q.answer;
        readingState.answered[key] = oi;
        S.practice.reading[key] = { chosen: oi, correct, ts: Date.now() };
        if (!correct) addMistake({ id: key, src: '阅读 · ' + art.title, q: q.q, opts: q.opts, answer: q.answer, chosen: oi, why: q.why });
        save(); renderArticle(); toast(correct ? '正确' : '已收入错题本');
      }));
      $('[data-speak]', $('#readingContent'))?.addEventListener('click', e => speak(e.currentTarget.dataset.speak));
    };
    $('#readingSelect').addEventListener('change', e => { readingState.id = e.target.value; readingState.answered = {}; renderArticle(); });
    renderArticle();
  };

  function addMistake(m) {
    if (S.mistakes.some(x => x.id === m.id)) return;
    S.mistakes.unshift({ ...m, ts: Date.now() });
  }

  /* ---------- 9. 写作表达库 ---------- */
  RENDERERS.writing = function () {
    const root = $('#view-writing');
    const cats = ['全部', ...new Set(DATA.writing.map(x => x.cat))];
    let activeCat = '全部';
    const render = () => {
      const list = activeCat === '全部' ? DATA.writing : DATA.writing.filter(x => x.cat === activeCat);
      const chips = cats.map(c => `<button class="filter-chip ${c === activeCat ? 'is-active' : ''}" data-cat="${c}">${c}</button>`).join('');
      const cards = list.map((x, i) => {
        const fav = S.favExpr.includes(x.en);
        return `<div class="card card--hover expr-card">
          <span class="expr-card__cat tag tag--accent">${x.cat}</span>
          <p class="expr-card__en">${esc(x.en)}</p>
          <p class="expr-card__zh">${esc(x.zh)}</p>
          <div style="font-family:var(--font-serif);font-size:.8rem;color:var(--ink-faint);margin-bottom:var(--sp-3)">✎ ${esc(x.tip)}</div>
          <div class="expr-card__foot">
            <button class="speak-btn" data-speak="${esc(x.en.replace(/→.*$/, ''))}"><svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15 9a4 4 0 0 1 0 6"/></svg>朗读</button>
            <button class="fav-btn ${fav ? 'is-fav' : ''}" data-fav="${esc(x.en)}" title="收藏">${fav ? '★' : '☆'}</button>
          </div>
        </div>`;
      }).join('');
      root.innerHTML = `
        <div style="font-family:var(--font-serif);color:var(--ink-soft);margin-bottom:var(--sp-4)">按功能分类的表达库。点 ☆ 收藏到你的表达夹，点朗读听发音。<b>已收藏 ${S.favExpr.length} 条</b>。</div>
        <div class="filter-bar">${chips}</div>
        <div id="favZone"></div>
        <div class="grid grid--2">${cards}</div>
      `;
      $$('.filter-chip', root).forEach(b => b.addEventListener('click', () => { activeCat = b.dataset.cat; render(); }));
      $$('.fav-btn', root).forEach(b => b.addEventListener('click', () => {
        const en = b.dataset.fav;
        if (S.favExpr.includes(en)) { S.favExpr = S.favExpr.filter(x => x !== en); toast('已取消收藏'); }
        else { S.favExpr.push(en); toast('已收藏到表达夹'); }
        save(); render();
      }));
      $$('.speak-btn', root).forEach(b => b.addEventListener('click', () => speak(b.dataset.speak)));
      renderFavZone();
    };
    const renderFavZone = () => {
      const zone = $('#favZone', root);
      if (!zone) return;
      if (!S.favExpr.length) { zone.innerHTML = ''; return; }
      zone.innerHTML = `<div class="card" style="margin-bottom:var(--sp-5);border-left:3px solid var(--pine)">
        <div class="card__label">My Collection · 我的表达夹</div>
        <ul style="font-family:var(--font-serif);font-size:.9rem;margin:0;padding-left:1.2rem;line-height:2">${S.favExpr.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      </div>`;
    };
    render();
  };

  /* ---------- 注册其余渲染器（见 app2 追加） ---------- */
  window.__YANBIAN__ = { $, $$, esc, getS: () => S, save, toast, speak, addMistake, RENDERERS, navigate, streak, DATA, applyTheme, initVoices, updateChrome, currentView: () => currentView };

  /* ---------- 10. 启动 ---------- */
  function init() {
    applyTheme();
    initVoices();
    updateChrome();
    // 导航绑定
    $$('.nav-item').forEach(n => n.addEventListener('click', () => navigate(n.dataset.view)));
    $('#themeToggle').addEventListener('click', toggleTheme);
    $('#themeToggleTop').addEventListener('click', toggleTheme);
    // 移动端菜单
    const spine = $('#spine'), scrim = $('#spineScrim');
    $('#menuBtn').addEventListener('click', () => { spine.classList.add('is-open'); scrim.classList.add('is-open'); });
    scrim.addEventListener('click', closeSpine);
    // 数据弹窗
    $('#dataBtn').addEventListener('click', openDataModal);
    $('#dataModalClose').addEventListener('click', closeDataModal);
    $('#dataModal').addEventListener('click', e => { if (e.target.id === 'dataModal') closeDataModal(); });
    $('#exportBtn').addEventListener('click', exportData);
    $('#importBtn').addEventListener('click', () => $('#importFile').click());
    $('#importFile').addEventListener('change', importData);
    $('#resetBtn').addEventListener('click', resetData);
    // 注册后半模块渲染器（app2.js）
    if (window.__registerLateRenderers) window.__registerLateRenderers();
    navigate(S.lastView || 'dashboard', false);
  }

  function closeSpine() {
    $('#spine')?.classList.remove('is-open');
    $('#spineScrim')?.classList.remove('is-open');
  }

  /* ---------- 11. 数据管理 ---------- */
  function openDataModal() {
    $('#modalStats').innerHTML = `
      <span>打卡 <b>${S.checkins.length}</b> 天</span>
      <span>答题 <b>${totalAnswered()}</b> 次</span>
      <span>生词 <b>${S.vocabSaved.length}</b> 个</span>
      <span>收藏 <b>${S.favExpr.length}</b> 条</span>
      <span>错题 <b>${S.mistakes.length}</b> 道</span>
      <span>模考 <b>${S.mockRuns.length}</b> 次</span>`;
    $('#dataModal').hidden = false;
  }
  function closeDataModal() { $('#dataModal').hidden = true; }
  function exportData() {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `砚边-学习数据-${today()}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast('备份已导出');
  }
  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || typeof parsed !== 'object') throw new Error('bad');
        S = { ...clone(DEFAULT_STATE), ...parsed,
          practice: { ...DEFAULT_STATE.practice, ...(parsed.practice || {}) } };
        save(); applyTheme(); closeDataModal();
        navigate('dashboard'); updateChrome();
        toast('数据导入成功');
      } catch (err) { toast('导入失败：文件格式不正确'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }
  function resetData() {
    if (!confirm('确定清空全部学习数据吗？此操作不可恢复。建议先导出备份。')) return;
    S = clone(DEFAULT_STATE); save(); applyTheme(); closeDataModal();
    navigate('dashboard'); updateChrome(); toast('数据已清空');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
