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
    vocabMarked: {},           // 已记背 { word: 次数 }，每次点标记 +1
    vocabDaily: {},            // 每日记背次数 { 'YYYY-MM-DD': 次数 }，用于近七天折线图
    favExpr: [],               // 收藏表达 [en]
    favReading: [],            // 收藏阅读文章 [articleId]
    favListening: [],          // 收藏听说材料 [itemId]
    readingDone: {},           // 阅读整篇提交记录 {articleId: {answers, score, total, ts}}
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
      const state = { ...clone(DEFAULT_STATE), ...parsed,
        practice: { ...DEFAULT_STATE.practice, ...(parsed.practice || {}) } };
      if (!Array.isArray(state.favReading)) state.favReading = [];
      if (!Array.isArray(state.favListening)) state.favListening = [];
      if (!state.readingDone || typeof state.readingDone !== 'object' || Array.isArray(state.readingDone)) state.readingDone = {};
      if (!state.vocabDaily || typeof state.vocabDaily !== 'object' || Array.isArray(state.vocabDaily)) state.vocabDaily = {};
      return state;
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

  // 单词发音：美音(type=1) / 英音(type=2)，走有道 dictvoice（微信实测可用，无防盗链）。
  // 复用已挂载的可见播放器与手势解锁，保证手机微信和网页都能出声。
  function speakWord(word, accent) {
    if (!word) return;
    stopSpeak();
    const seq = ttsSeq;
    unlockAudio();
    const inApp = isInAppBrowser();
    let a;
    try { a = ensureAudio(true); } catch (e) { a = new Audio(); }
    if (!a) return;
    const type = accent === 'uk' ? '2' : '1';
    const url = 'https://dict.youdao.com/dictvoice?audio=' + encodeURIComponent(String(word).trim()) + '&type=' + type;
    let finished = false;
    a.onended = () => { finished = true; };
    a.onerror = () => {
      if (finished || seq !== ttsSeq) return;
      finished = true;
      revealPlayer('发音加载失败，请点播放键 ▶ 重试');
    };
    try { a.src = url; a.load(); } catch (e) {}
    try {
      const p = a.play();
      if (p && typeof p.catch === 'function') p.catch(() => { revealPlayer('请点下方播放键 ▶ 听发音'); });
    } catch (e) { revealPlayer('请点下方播放键 ▶ 听发音'); }
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
    dashboard: { title: '今日概览', mark: '序', lede: '砚边与你同在，English 重塑未来。', folio: 'FOLIO 01' },
    study:     { title: '研习路径', mark: '壹', lede: '四步功课，稳稳进阶。', folio: 'FOLIO 02' },
    reading:   { title: '阅读', mark: '贰', lede: '精读一篇，胜过泛读十篇。', folio: 'FOLIO 03' },
    writing:   { title: '写作表达库', mark: '叁', lede: '积累有质感的高级表达，而非套路模板。', folio: 'FOLIO 04' },
    vocab:     { title: '语境词汇', mark: '肆', lede: '在句子里记住一个词，才算真正拥有它。', folio: 'FOLIO 05' },
    listening: { title: '听说训练', mark: '伍', lede: '听懂、跟读、听写——把耳朵练出来。', folio: 'FOLIO 06' },
    mistakes:  { title: '错题本', mark: '陆', lede: '错过的题，是最值钱的提分线索。', folio: 'FOLIO 07' },
    mock:      { title: '模考计时', mark: '柒', lede: '在时间里练习，才能在考场上从容。', folio: 'FOLIO 08' },
    stats:     { title: '学习进度', mark: '捌', lede: '看得见的进步，才撑得起长期的坚持。', folio: 'FOLIO 09' },
    music:     { title: '英文音乐', mark: '拾', lede: '听歌磨耳朵，让语感在旋律里慢慢长出来。', folio: 'FOLIO 11' },
    news:      { title: '外刊速览', mark: '拾壹', lede: '每天一点，读懂世界。', folio: 'FOLIO 12' },
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
            <div class="hero-card__big">稳过四六级，冲刺<em>大英赛</em></div>
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
        <div class="stat-cell"><div class="stat-cell__num">${S.favExpr.length + (S.favReading || []).length + (S.favListening || []).length + S.mistakes.length}</div><div class="stat-cell__label">收藏 + 错题</div></div>
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
  // 每日一句：按本地日期确定切换一句英语学习名言/警句（含中文释义），每天自动更换
  const DAILY_NOTES = [
    ['The beautiful thing about learning is that no one can take it away from you.', '学到的东西，谁也夺不走。'],
    ['Education is the most powerful weapon which you can use to change the world.', '教育是你改变世界最有力的武器。'],
    ['Learning never exhausts the mind.', '学习永不会让心智枯竭。'],
    ['The expert in anything was once a beginner.', '任何领域的高手，都曾是初学者。'],
    ['Study the past if you would define the future.', '欲定未来，先读历史。'],
    ['Knowledge is power.', '知识就是力量。'],
    ['Practice makes perfect.', '熟能生巧。'],
    ['A journey of a thousand miles begins with a single step.', '千里之行，始于足下。'],
    ['The only person who is educated is the one who has learned how to learn and change.', '真正受过教育的人，是学会了如何学习与改变的人。'],
    ['Live as if you were to die tomorrow. Learn as if you were to live forever.', '像明天就要离世那样生活，像永远活着那样学习。'],
    ['Anyone who stops learning is old, whether at twenty or eighty.', '停止学习的人就老了，无论二十岁还是八十岁。'],
    ['It always seems impossible until it is done.', '做成之前，一切看似不可能。'],
    ['Success is the sum of small efforts, repeated day in and day out.', '成功是日复一日微小努力的累积。'],
    ['I am still learning.', '我仍在学习。'],
    ['The roots of education are bitter, but the fruit is sweet.', '教育的根是苦的，果实却是甜的。'],
    ['Learning is a treasure that will follow its owner everywhere.', '学识是随身相伴的财富。'],
    ['He who asks a question is a fool for five minutes; he who does not ask remains a fool forever.', '提问的人会傻五分钟，不提问的人会傻一辈子。'],
    ['An investment in knowledge pays the best interest.', '投资知识，回报最高。'],
    ['Genius is one percent inspiration and ninety-nine percent perspiration.', '天才是百分之一的灵感加百分之九十九的汗水。'],
    ['We learn from failure, not from success.', '我们从失败中学习，而非从成功中。'],
    ['The more I learn, the more I realize how much I do not know.', '我学得越多，越发现自己不懂的还有很多。'],
    ['You do not have to be great to start, but you have to start to be great.', '不必很优秀才能开始，但必须开始才能变得优秀。'],
    ['Discipline is the bridge between goals and accomplishment.', '自律是目标与成就之间的桥梁。'],
    ['If you think education is expensive, try ignorance.', '若以为教育太贵，试试无知的代价。']
  ];
  function dailyNote() {
    const now = new Date();
    const dayIndex = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
    return DAILY_NOTES[dayIndex % DAILY_NOTES.length];
  }

  RENDERERS.study = function () {
    const root = $('#view-study');
    const rows = DATA.studyPath.map(p => `
      <tr>
        <td>${p.no}</td>
        <td><strong>${p.title}</strong></td>
        <td style="color:var(--ink-soft)">${p.desc}</td>
        <td><span class="tag tag--pine">${p.target}</span></td>
      </tr>`).join('');
    const note = dailyNote();
    root.innerHTML = `
      <div class="card daily-note" style="margin-bottom:var(--sp-5)">
        <div class="card__label">A Note for Today</div>
        <p class="daily-note__en">“${esc(note[0])}”</p>
        <p class="daily-note__zh">${esc(note[1])}</p>
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

  /* ---------- 8. 阅读（整篇提交后统一判分） ---------- */
  const READING_FILTERS = ['全部', '四级', '六级', '大英赛', '已完成', '收藏'];
  let readingState = { id: 'r1', answered: {}, level: '全部', submitted: null };

  // 与关键句生成脚本使用同一套分句规则，保证段落/句位标注准确
  function splitReadingSentences(para) {
    const out = [];
    const re = /[^.!?]+(?:[.!?]+["”]?|$)/g;
    let m;
    while ((m = re.exec(para))) {
      const s = m[0].trim();
      if (s) out.push(s);
    }
    return out.length ? out : [para.trim()];
  }

  // 兼容旧数据：完整作答过的文章也算「已做」
  function readingDoneRecord(art) {
    const rec = S.readingDone && S.readingDone[art.id];
    if (rec && rec.answers) return rec;
    const answers = {};
    let all = true;
    art.questions.forEach((q, qi) => {
      const r = S.practice.reading[`${art.id}-${qi}`];
      if (r && r.chosen !== undefined) answers[qi] = r.chosen;
      else all = false;
    });
    if (!all) return null;
    const score = art.questions.filter((q, qi) => answers[qi] === q.answer).length;
    return { answers, score, total: art.questions.length, ts: 0 };
  }

  function prepareReadingArticle() {
    const art = DATA.reading.find(a => a.id === readingState.id);
    const rec = art && readingDoneRecord(art);
    readingState.submitted = rec || null;
    readingState.answered = rec ? { ...rec.answers } : {};
  }

  // 提交后在原文逐句标注题号，并把对应关键词加粗高亮；未提交时原文保持干净
  function readingPassageHtml(art, submitted) {
    const keyMap = window.YANBIAN_READING_KEYS || {};
    const marks = {};
    if (submitted) {
      art.questions.forEach((q, qi) => {
        const k = keyMap[`${art.id}-${qi}`];
        if (!k || !Number.isInteger(k.p) || !Number.isInteger(k.s)) return;
        if (!marks[k.p]) marks[k.p] = {};
        if (!marks[k.p][k.s]) marks[k.p][k.s] = [];
        marks[k.p][k.s].push({ qi, kw: k.kw || [] });
      });
    }
    return art.body.map((para, pi) => {
      const sents = splitReadingSentences(para);
      const html = sents.map((sent, si) => {
        const entries = marks[pi] && marks[pi][si];
        if (!entries || !entries.length) return esc(sent);
        const lower = sent.toLowerCase();
        const ranges = [];
        entries.forEach(e => (e.kw || []).forEach(w => {
          const text = String(w);
          const idx = lower.indexOf(text.toLowerCase());
          if (idx >= 0) ranges.push({ start: idx, end: idx + text.length, qi: e.qi + 1 });
        }));
        ranges.sort((a, b) => a.start - b.start);
        const merged = [];
        ranges.forEach(r => {
          const last = merged[merged.length - 1];
          if (last && r.start < last.end) {
            last.end = Math.max(last.end, r.end);
            if (!last.qs.includes(r.qi)) last.qs.push(r.qi);
          } else merged.push({ start: r.start, end: r.end, qs: [r.qi] });
        });
        let body = '', pos = 0;
        merged.forEach(r => {
          body += esc(sent.slice(pos, r.start));
          const tip = r.qs.map(n => `第${n}题关键词`).join(' / ');
          body += `<mark class="read-kw" title="${esc(tip)}">${esc(sent.slice(r.start, r.end))}</mark>`;
          pos = r.end;
        });
        body += esc(sent.slice(pos));
        const labels = [...new Set(entries.map(e => e.qi + 1))].sort((a, b) => a - b).map(n => `第${n}题`).join(' · ');
        return `<span class="read-sent"><span class="read-tag">${labels}</span>${body}</span>`;
      }).join(' ');
      return `<p>${html}</p>`;
    }).join('');
  }

  RENDERERS.reading = function () {
    const root = $('#view-reading');
    prepareReadingArticle();
    const doneCount = DATA.reading.filter(a => !!readingDoneRecord(a)).length;
    const favCount = S.favReading.length;
    const chips = READING_FILTERS.map(l => {
      const n = l === '已完成' ? doneCount : l === '收藏' ? favCount : 0;
      return `<button class="filter-chip ${l === readingState.level ? 'is-active' : ''}" data-rlevel="${l}">${l}${n ? ` (${n})` : ''}</button>`;
    }).join('');
    const filtered = () => {
      if (readingState.level === '已完成') return DATA.reading.filter(a => !!readingDoneRecord(a));
      if (readingState.level === '收藏') return DATA.reading.filter(a => S.favReading.includes(a.id));
      return readingState.level === '全部' ? DATA.reading : DATA.reading.filter(a => a.level === readingState.level);
    };
    const renderSelect = () => {
      const list = filtered();
      if (list.length && !list.some(a => a.id === readingState.id)) readingState.id = list[0].id;
      const opts = list.map(a => `<option value="${a.id}" ${a.id === readingState.id ? 'selected' : ''}>${esc(a.title)} · ${a.level}</option>`).join('');
      const sel = $('#readingSelect');
      if (sel) sel.innerHTML = opts || '<option value="">该分区暂无文章</option>';
      const cnt = $('#readingCount'); if (cnt) cnt.textContent = '共 ' + list.length + ' 篇';
    };
    root.innerHTML = `
      <div class="filter-bar">
        <span style="font-family:var(--font-serif);font-size:.9rem;color:var(--ink-soft)">按类别查找：</span>
        ${chips}
      </div>
      <div class="filter-bar">
        <label style="font-family:var(--font-serif);font-size:.9rem;color:var(--ink-soft)">选一篇文章：</label>
        <select id="readingSelect"></select>
        <span class="tag" id="readingCount">共 0 篇</span>
      </div>
      <div id="readingDoneList"></div>
      <div id="readingContent"></div>
    `;
    // 「已完成」分区独立列出每篇大题，提供单篇移除；只删完成记录与作答记录，错题本不动
    const renderDoneList = () => {
      const zone = $('#readingDoneList', root);
      if (!zone) return;
      if (readingState.level !== '已完成') { zone.innerHTML = ''; return; }
      const done = DATA.reading.filter(a => !!readingDoneRecord(a));
      if (!done.length) {
        zone.innerHTML = '<div class="card" style="margin-bottom:var(--sp-4)"><span style="font-family:var(--font-serif);color:var(--ink-soft)">还没有已完成的大题，做完一篇并提交后会出现在这里。</span></div>';
        return;
      }
      zone.innerHTML = `<div class="card read-done-list" style="margin-bottom:var(--sp-4)">
        <div class="card__label">已完成 · ${done.length} 篇</div>
        <div class="read-done-grid">${done.map(a => {
          const rec = readingDoneRecord(a);
          return `<div class="read-done-item">
            <button class="read-done-open" data-open-done="${a.id}"><b>${esc(a.title)}</b><span>${a.level} · ${rec.score}/${rec.total} 正确</span></button>
            <button class="read-done-remove" data-remove-done="${a.id}" title="移除完成记录">移除</button>
          </div>`;
        }).join('')}</div>
      </div>`;
      $$('[data-open-done]', zone).forEach(b => b.addEventListener('click', () => {
        readingState.id = b.dataset.openDone;
        prepareReadingArticle();
        const sel = $('#readingSelect'); if (sel) sel.value = readingState.id;
        renderArticle();
      }));
      $$('[data-remove-done]', zone).forEach(b => b.addEventListener('click', () => {
        const id = b.dataset.removeDone;
        if (S.readingDone) delete S.readingDone[id];
        const art = DATA.reading.find(a => a.id === id);
        if (art) art.questions.forEach((_, qi) => { delete S.practice.reading[`${id}-${qi}`]; });
        save();
        toast('已移出完成记录，错题本保留');
        RENDERERS.reading();
      }));
    };
    $$('[data-rlevel]', root).forEach(b => b.addEventListener('click', () => {
      readingState.level = b.dataset.rlevel;
      $$('[data-rlevel]', root).forEach(x => x.classList.toggle('is-active', x === b));
      renderSelect(); renderDoneList(); prepareReadingArticle(); renderArticle();
    }));
    const renderArticle = () => {
      const art = DATA.reading.find(a => a.id === readingState.id);
      if (!art || !filtered().some(a => a.id === art.id)) {
        $('#readingContent').innerHTML = '<div class="empty"><span class="empty__mark">∅</span><p>该分区暂无文章，换个类别看看。</p></div>';
        return;
      }
      const submitted = readingState.submitted;
      const key = (qi) => `${art.id}-${qi}`;
      const qs = art.questions.map((q, qi) => {
        const chosen = submitted ? submitted.answers[qi] : readingState.answered[qi];
        const revealed = !!submitted && chosen !== undefined;
        const optHtml = q.opts.map((o, oi) => {
          let cls = '';
          if (revealed) {
            if (oi === q.answer) cls = 'is-correct';
            else if (oi === chosen) cls = 'is-wrong';
          } else if (oi === chosen) cls = 'is-selected';
          return `<button class="opt ${cls}" data-q="${qi}" data-o="${oi}" ${submitted ? 'disabled' : ''}><span class="opt__key">${'ABCD'[oi]}</span><span>${esc(o.replace(/^[A-D]\.\s*/, ''))}</span></button>`;
        }).join('');
        return `<div class="question">
          <div class="question__q">${qi + 1}. ${esc(q.q)}</div>
          <div class="question__opts">${optHtml}</div>
          ${revealed ? `<div class="feedback"><strong>${chosen === q.answer ? '答对了' : '再想想'}</strong> · ${esc(q.why)}</div>` : ''}
        </div>`;
      }).join('');
      const answeredCount = art.questions.filter((_, qi) => readingState.answered[qi] !== undefined).length;
      const remaining = art.questions.length - answeredCount;
      const actions = submitted
        ? `<div class="read-actions"><span class="read-score">本次 ${submitted.score} / ${submitted.total} 题正确</span><button class="btn" id="readRedo">重做本篇</button></div>`
        : `<div class="read-actions"><button class="btn btn--primary" id="readSubmit" ${remaining ? 'disabled' : ''}>${remaining ? `还有 ${remaining} 题未作答` : '提交答案'}</button></div>`;
      const fav = S.favReading.includes(art.id);
      $('#readingContent').innerHTML = `
        <div class="card" style="margin-bottom:var(--sp-5)">
          <div class="passage">
            <div class="passage__head">
              <div class="passage__meta">${art.level} · ${art.meta}</div>
              <button class="read-fav ${fav ? 'is-fav' : ''}" data-rfav="${art.id}" title="${fav ? '取消收藏' : '收藏文章'}" aria-label="收藏文章">${fav ? '★' : '☆'}</button>
            </div>
            <div class="passage__title">${esc(art.title)}</div>
            ${readingPassageHtml(art, submitted)}
          </div>
        </div>
        <div class="sec-head"><span class="sec-head__no">§</span><h2>理解题</h2><span class="sec-head__note">${submitted ? '已提交 · 原文已标注题号与关键词' : `${art.questions.length} 小题 · 全部作答后提交`}</span></div>
        <div class="card" id="readingQs">${qs}</div>
        ${actions}
      `;
      $$('#readingQs .opt', root).forEach(btn => btn.addEventListener('click', () => {
        if (readingState.submitted) return;
        readingState.answered[+btn.dataset.q] = +btn.dataset.o;
        renderArticle();
      }));
      $('#readSubmit')?.addEventListener('click', () => {
        const answers = {};
        let score = 0;
        const ts = Date.now();
        art.questions.forEach((q, qi) => {
          const oi = readingState.answered[qi];
          if (oi === undefined) return;
          answers[qi] = oi;
          const correct = oi === q.answer;
          if (correct) score++;
          S.practice.reading[key(qi)] = { chosen: oi, correct, ts };
          if (!correct) addMistake({ id: key(qi), src: '阅读 · ' + art.title, q: q.q, opts: q.opts, answer: q.answer, chosen: oi, why: q.why, passage: (art.body || []).join('\n\n') });
        });
        S.readingDone = S.readingDone || {};
        S.readingDone[art.id] = { answers, score, total: art.questions.length, ts };
        readingState.submitted = S.readingDone[art.id];
        save(); renderDoneList(); renderArticle(); toast(`已提交 · 答对 ${score} / ${art.questions.length} 题`);
      });
      $('#readRedo')?.addEventListener('click', () => {
        readingState.submitted = null;
        readingState.answered = {};
        renderArticle();
        toast('已恢复原文，可重新作答');
      });
      $('[data-rfav]', root)?.addEventListener('click', () => {
        const id = $('[data-rfav]', root).dataset.rfav;
        if (S.favReading.includes(id)) { S.favReading = S.favReading.filter(x => x !== id); toast('已取消收藏'); }
        else { S.favReading.push(id); toast('已收藏文章'); }
        save(); RENDERERS.reading();
      });
    };
    renderSelect();
    renderDoneList();
    renderArticle();
  };

  function addMistake(m) {
    if (S.mistakes.some(x => x.id === m.id)) return;
    S.mistakes.unshift({ ...m, ts: Date.now() });
  }

  /* ---------- 9. 写作表达库 ---------- */
  RENDERERS.writing = function () {
    const root = $('#view-writing');
    const cats = [...new Set(DATA.writing.map(x => x.cat))];
    let activeCat = '全部';
    let favOnly = false;
    const render = () => {
      const base = favOnly ? DATA.writing.filter(x => S.favExpr.includes(x.en)) : DATA.writing;
      const list = activeCat === '全部' ? base : base.filter(x => x.cat === activeCat);
      // 单一层级：全部 / 我的收藏 / 各分类，放在同一排筛选里
      const chips = `
        <button class="filter-chip ${(!favOnly && activeCat === '全部') ? 'is-active' : ''}" data-wscope="all">全部</button>
        <button class="filter-chip ${favOnly ? 'is-active' : ''}" data-wscope="fav">我的收藏 (${S.favExpr.length})</button>`
        + cats.map(c => `<button class="filter-chip ${(!favOnly && c === activeCat) ? 'is-active' : ''}" data-cat="${c}">${c}</button>`).join('');
      const cards = list.map(x => {
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
        <div style="font-family:var(--font-serif);color:var(--ink-soft);margin-bottom:var(--sp-4)">按功能分类的表达库。点 ☆ 收藏到你的表达夹，点朗读听发音。<b>已收藏 ${S.favExpr.length} 条</b>，可在「我的收藏」分区单独查看。</div>
        <div class="filter-bar">${chips}</div>
        ${list.length
          ? `<div class="grid grid--2">${cards}</div>`
          : `<div class="empty"><span class="empty__mark">∅</span><p>${favOnly ? '还没有收藏表达，点卡片右下角的 ☆ 收藏后会出现在这里。' : '该分类暂无表达，换个类别看看。'}</p></div>`}
      `;
      $$('[data-wscope]', root).forEach(b => b.addEventListener('click', () => {
        favOnly = b.dataset.wscope === 'fav';
        activeCat = '全部';
        render();
      }));
      $$('[data-cat]', root).forEach(b => b.addEventListener('click', () => {
        favOnly = false;
        activeCat = b.dataset.cat;
        render();
      }));
      $$('.fav-btn', root).forEach(b => b.addEventListener('click', () => {
        const en = b.dataset.fav;
        if (S.favExpr.includes(en)) { S.favExpr = S.favExpr.filter(x => x !== en); toast('已取消收藏'); }
        else { S.favExpr.push(en); toast('已收藏到表达夹'); }
        save(); render();
      }));
      $$('.speak-btn', root).forEach(b => b.addEventListener('click', () => speak(b.dataset.speak)));
    };
    render();
  };

  /* ---------- 注册其余渲染器（见 app2 追加） ---------- */
  window.__YANBIAN__ = { $, $$, esc, getS: () => S, save, toast, speak, speakWord, addMistake, RENDERERS, navigate, streak, DATA, applyTheme, initVoices, updateChrome,
    currentView: () => currentView,
    // 后置数据/模块脚本加载完成后调用：只重绘当前视图，不重复绑定全局事件
    refresh: () => { if (RENDERERS[currentView]) RENDERERS[currentView](); }
  };

  /* ---------- 10. 启动 ---------- */
  let inited = false;
  function init() {
    if (inited) return;
    inited = true;
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
    if (window.__registerLateRenderers && !window.__YANBIAN_LATE_READY__) {
      window.__YANBIAN_LATE_READY__ = true;
      window.__registerLateRenderers();
    }
    // 注册独立模块渲染器（音乐 / 外刊新闻）
    if (window.__registerMusicView) window.__registerMusicView();
    if (window.__registerNewsView) window.__registerNewsView();
    // 每次从外部重新进入站点都回到概览首页，不恢复上次视图（尤其不恢复到模考答题页）
    S.lastView = 'dashboard'; save();
    navigate('dashboard', false);
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
      <span>已记背 <b>${Object.keys(S.vocabMarked || {}).length}</b> 个</span>
      <span>收藏 <b>${S.favExpr.length + (S.favReading || []).length + (S.favListening || []).length}</b> 条</span>
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
        if (!Array.isArray(S.favReading)) S.favReading = [];
        if (!Array.isArray(S.favListening)) S.favListening = [];
        if (!S.readingDone || typeof S.readingDone !== 'object' || Array.isArray(S.readingDone)) S.readingDone = {};
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

  // 本脚本带 defer，执行时 DOM 已解析完毕：立即渲染首屏，不等后面的大体积数据脚本。
  // 这样手机弱网下也能先看到概览页，而不是等 5MB 词库/外刊数据全部下载完才白屏结束。
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
