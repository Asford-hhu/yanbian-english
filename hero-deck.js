/* ============================================================================
   砚边 · 桌面端首屏（Hero + 模块台 + 内嵌面板）
   ----------------------------------------------------------------------------
   只做三件事，且全部只在 ≥721px 生效：
     1. 在「今日概览」视图顶部插入首屏 Hero（背景视频 + 大标题 + CTA）。
     2. 在 Hero 下方铺一张「模块台」：12 个模块卡片，前两块是今日概览与研习。
     3. 点卡片 = 在当前页面内嵌打开该模块（把 #view-xxx 搬进玻璃面板，关闭时原位放回）。
   不改任何模块的渲染与判分逻辑；不动手机端；关掉本脚本页面即回到原样。
   ============================================================================ */
(function () {
  'use strict';

  const R = window.__YANBIAN__;
  if (!R) return;

  const MQ = window.matchMedia('(min-width: 721px)');
  const VIDEO = 'https://strvid.nyc3.cdn.digitaloceanspaces.com/motionsite/summit-hero-1.mp4';

  /* ---------------------------------------------------------------- 模块清单 */
  const MODULES = [
    { view: 'dashboard', mark: '序', name: '今日概览', desc: '打卡、倒计时、这一轮的统计——今天从这里开始。', lead: true },
    { view: 'study',     mark: '壹', name: '研习路径', desc: '阅读 → 写作 → 词汇 → 听说，四步一轮；点开看每一步怎么走。', lead: true },
    { view: 'reading',   mark: '贰', name: '阅读',     desc: '精读真题，积累表达' },
    { view: 'writing',   mark: '叁', name: '写作',     desc: '高级表达与替换词' },
    { view: 'vocab',     mark: '肆', name: '词汇',     desc: '在语境里记住单词' },
    { view: 'listening', mark: '伍', name: '听说',     desc: '听写与跟读练习' },
    { view: 'mistakes',  mark: '陆', name: '错题本',   desc: '错题与词汇错词都收在这里' },
    { view: 'mock',      mark: '柒', name: '模考',     desc: '在时间里练一遍' },
    { view: 'stats',     mark: '捌', name: '进度',     desc: '看得见的进步' },
    { view: 'resources', mark: '玖', name: '资源',     desc: '少走弯路的资源清单' },
    { view: 'music',     mark: '拾', name: '英文音乐', desc: '听歌磨耳朵' },
    { view: 'news',      mark: '拾壹', name: '外刊速览', desc: '每天一点，读懂世界' }
  ];

  const META = {
    dashboard: { mark: '序',   title: '今日概览', lede: '砚边与你同在，English 重塑未来。',       folio: 'FOLIO 01' },
    study:     { mark: '壹',   title: '研习路径', lede: '四步功课，稳稳进阶。',                     folio: 'FOLIO 02' },
    reading:   { mark: '贰',   title: '阅读',     lede: '精读一篇，胜过泛读十篇。',                 folio: 'FOLIO 03' },
    writing:   { mark: '叁',   title: '写作表达库', lede: '积累有质感的高级表达，而非套路模板。',   folio: 'FOLIO 04' },
    vocab:     { mark: '肆',   title: '语境词汇', lede: '在句子里记住一个词，才算真正拥有它。',     folio: 'FOLIO 05' },
    listening: { mark: '伍',   title: '听说训练', lede: '听懂、跟读、听写——把耳朵练出来。',         folio: 'FOLIO 06' },
    mistakes:  { mark: '陆',   title: '错题本',   lede: '错过的题，是最值钱的提分线索。',           folio: 'FOLIO 07' },
    mock:      { mark: '柒',   title: '模考计时', lede: '在时间里练习，才能在考场上从容。',         folio: 'FOLIO 08' },
    stats:     { mark: '捌',   title: '学习进度', lede: '看得见的进步，才撑得起长期的坚持。',       folio: 'FOLIO 09' },
    resources: { mark: '玖',   title: '资源导航', lede: '站在优质资源的肩上，少走弯路。',           folio: 'FOLIO 10' },
    music:     { mark: '拾',   title: '英文音乐', lede: '听歌磨耳朵，让语感在旋律里慢慢长出来。',   folio: 'FOLIO 11' },
    news:      { mark: '拾壹', title: '外刊速览', lede: '每天一点，读懂世界。',                     folio: 'FOLIO 12' }
  };

  const HERO_NAV = ['dashboard', 'study', 'reading', 'vocab', 'mistakes'];
  const NAV_LABEL = { dashboard: '概览', study: '研习', reading: '阅读', vocab: '词汇', mistakes: '错题本' };
  const MINI = [
    ['music', '英文音乐', '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'],
    ['news', '外刊速览', '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>'],
    ['stats', '学习进度', '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'],
    ['resources', '资源导航', '<path d="M5 4h4l2 2h8v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M9 12h6M9 15h4"/>']
  ];

  /* ------------------------------------------------------------------- 状态 */
  let heroEl = null, indexEl = null, panel = null, dashWrap = null, backBtn = null;
  let graph = null, graphPending = null; // 图谱模块（≥1080px 才动态导入）
  /* 全屏导图浮层：只搬运同一个 stage DOM，不重建 WebGL 上下文 */
  let fsEl = null, fsStage = null, fsNote = null, fsOpen = false;
  let fsPlaceholder = null, fsDetailHolder = null, fsDetailNext = null;
  let fsDown = null, fsTimer = 0, fsLastFocus = null, fsScrollY = 0, fsPadRight = '';
  let mounted = false, panelOpen = false, panelView = null;
  let movedNode = null, slotNode = null, lastTrigger = null, retryTimer = 0, hideTimer = 0;
  let lastRoute = null, peekView = 'dashboard';
  // 一旦从首屏进了普通模块页，侧栏点「概览」就回普通概览页、不再强制回全屏；
  // 只有点「返回全屏」按钮才清除本标记、恢复视频首屏。
  let leftHero = false;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const el = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* --------------------------------------------------------------- 实时数字 */
  function liveStats() {
    const S = R.getS() || {};
    const practice = S.practice || {};
    let total = 0, ok = 0;
    Object.keys(practice).forEach(k => {
      const sec = practice[k] || {};
      Object.keys(sec).forEach(id => { const r = sec[id]; total++; if (r && r.correct) ok++; });
    });
    (S.mockRuns || []).forEach(r => { total += r.total || 0; ok += r.score || 0; });
    const now = new Date();
    let exam = new Date(now.getFullYear(), 3, 11);
    if (now > exam) exam = new Date(now.getFullYear() + 1, 3, 11);
    const days = Math.max(0, Math.ceil((exam - now) / 86400000));
    let streak = 0;
    try { streak = R.streak ? R.streak() : 0; } catch (e) { streak = 0; }
    return { days, streak, rate: total ? Math.round(ok / total * 100) : 0, answered: total };
  }

  function updateLive() {
    const dateEl = $('#vdDate');
    if (dateEl) dateEl.textContent = fmtDate(new Date());
    if (indexEl) showPeek(peekView);
  }

  function fmtDate(d) {
    const wk = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · 星期${wk}`;
  }

  /* ------------------------------------------------------------------- Hero */
  function buildHero() {
    const nav = HERO_NAV.map(v =>
      `<button type="button" data-vd-open="${v}"${v === 'dashboard' ? ' class="is-on" aria-current="page"' : ''}>${NAV_LABEL[v]}</button>`
    ).join('');

    const mini = MINI.map(([v, label, svg]) =>
      `<button type="button" data-vd-open="${v}" title="${label}" aria-label="${label}">
         <svg viewBox="0 0 24 24" aria-hidden="true">${svg}</svg>
       </button>`
    ).join('');

    const node = el(`
      <section class="vd-hero" aria-label="首屏">
        <video class="vd-hero__video" autoplay muted loop playsinline preload="auto" aria-hidden="true"></video>
        <div class="vd-hero__veil" aria-hidden="true"></div>
        <div class="vd-hero__grain" aria-hidden="true"></div>

        <div class="vd-hero__bar">
          <div class="vd-hero__brand">
            <svg class="vd-hero__peak" viewBox="0 0 40 26" aria-hidden="true">
              <path d="M2 23 13 5l7 11 5-7 6 14"/>
              <path d="M9.5 12h5"/>
            </svg>
            <span class="vd-hero__wordmark">Yanbian</span>
            <span class="vd-hero__cn">砚边</span>
          </div>
          <nav class="vd-hero__nav" aria-label="模块快捷入口">${nav}</nav>
          <div class="vd-hero__aside">
            <button type="button" class="vd-hero__mini" data-vd-theme title="切换主题" aria-label="切换主题">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/></svg>
            </button>
            <button type="button" class="vd-hero__mini" data-vd-data title="数据管理" aria-label="数据管理">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 20h16"/></svg>
            </button>
            <button type="button" class="vd-hero__talk" data-vd-open="stats">进度 <i>↗</i></button>
          </div>
        </div>

        <div class="vd-hero__main">
          <p class="vd-hero__eyebrow">The Road Ahead · <b>Folio 01</b></p>
          <h1 class="vd-hero__title">Explore.<br>Dream.<br><em>Discover.</em></h1>
          <p class="vd-hero__sub">大学生的英语研习平台——读懂长句、写清想法、记牢词、磨出耳朵，四步功课，一天一点，把英语读成自己的书。</p>
          <p class="vd-hero__sub-en">We inspire journeys that awaken curiosity and create unforgettable experiences.</p>
          <div class="vd-hero__cta">
            <button type="button" class="vd-btn vd-btn--glass" data-vd-open="dashboard">
              <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.9" y="1.9" width="4.9" height="4.9" rx="1.1"/><rect x="9.2" y="1.9" width="4.9" height="4.9" rx="1.1"/><rect x="1.9" y="9.2" width="4.9" height="4.9" rx="1.1"/><rect x="9.2" y="9.2" width="4.9" height="4.9" rx="1.1"/></svg>
              打开今日概览
            </button>
            <button type="button" class="vd-btn vd-btn--gold" data-vd-open="study">开始今日研习 <span aria-hidden="true">↗</span></button>
          </div>
        </div>

        <div class="vd-hero__foot">
          <div class="vd-here">
            <i class="vd-here__dot" aria-hidden="true"></i>
            <span>今日功课 <b>${MODULES.length}</b> 项 · 从右侧目录进入</span>
          </div>
          <div class="vd-hero__links">
            <span class="vd-hero__date" id="vdDate"></span>
            ${mini}
          </div>
        </div>
      </section>`);

    node.appendChild(buildIndex());

    const v = $('.vd-hero__video', node);
    v.muted = true;
    v.addEventListener('error', () => node.classList.add('is-nofilm'));
    v.src = VIDEO;
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
    return node;
  }

  /* ------------------------------------------------------------- 作品目录卡 */
  function buildIndex() {
    const rows = MODULES.map((m, i) => `
      <button type="button" class="vd-ix" data-vd-open="${m.view}" data-vd-ix="${m.view}">
        <span class="vd-ix__no">${String(i + 1).padStart(2, '0')}</span>
        <span class="vd-ix__name">${m.name}</span>
        <span class="vd-ix__arrow" aria-hidden="true">↗</span>
      </button>`).join('');

    const graphOn = window.matchMedia('(min-width:1080px)').matches;
    const node = el(`
      <section class="vd-index${graphOn ? ' is-graph' : ''}" aria-label="目录">
        <div class="vd-index__head">
          <b>目录</b><i>Index</i>
          <div class="wg-tabs" role="tablist" aria-label="目录显示方式">
            <button type="button" class="wg-tab${graphOn ? ' is-on' : ''}" data-wg-tab="graph" role="tab" aria-selected="${graphOn}">图谱</button>
            <button type="button" class="wg-tab${graphOn ? '' : ' is-on'}" data-wg-tab="list" role="tab" aria-selected="${!graphOn}">目录</button>
          </div>
        </div>
        <div class="wg-list" id="wgList"${graphOn ? ' hidden' : ''}>
          <div class="vd-index__grid">${rows}</div>
          <p class="vd-index__peek">
            <b id="vdIxName">今日概览</b><span id="vdIxDesc"></span>
          </p>
        </div>
        ${graphOn ? `
        <div class="wg-stage" id="wgStage" aria-label="单词关系图谱">
          <button type="button" class="wg-expand" id="wgExpand" title="全屏查看导图" aria-label="全屏查看导图">⤢ 全屏</button>
          <div class="wg-loading">正在织网…</div>
          <div class="wg-empty" hidden><b>还没有可展示的词</b><span>先去做一轮词汇小测，图谱会自动接上你的错词。</span></div>
        </div>
        <div class="wg-tools" aria-hidden="false">
          <span class="wg-key"><i style="background:#7FE8E0"></i>主路</span>
          <span class="wg-key"><i style="background:#3E8FA8"></i>旁支</span>
          <span class="wg-key"><i style="background:#F4BA3B"></i>正在传导</span>
          <span class="wg-spacer"></span>
          <button type="button" class="wg-btn" id="wgShuffle" title="换一个中心词">↻ 换一个</button>
        </div>
        <div class="wg-detail">
          <div class="wg-detail__row">
            <span class="wg-detail__w" id="wg-d-word"></span>
            <span class="wg-detail__p" id="wg-d-phon"></span>
            <span class="wg-detail__n" id="wg-d-note"></span>
          </div>
          <div class="wg-detail__m" id="wg-d-mean"></div>
        </div>` : ''}
      </section>`);
    indexEl = node;
    return node;
  }

  /* 悬停/聚焦时更新目录卡底部那行小注 */
  function showPeek(view) {
    if (!indexEl) return;
    const m = MODULES.find(x => x.view === view);
    if (!m) return;
    peekView = view;
    const nameEl = $('#vdIxName', indexEl);
    const descEl = $('#vdIxDesc', indexEl);
    if (nameEl) nameEl.textContent = m.name;
    if (descEl) descEl.textContent = peekText(view);
    indexEl.querySelectorAll('.vd-ix').forEach(b => {
      b.classList.toggle('is-on', b.dataset.vdIx === view);
    });
  }

  function peekText(view) {
    const m = MODULES.find(x => x.view === view);
    if (!m) return '';
    if (view === 'dashboard') {
      const st = liveStats();
      return `距大英赛 ${st.days} 天 · 连续 ${st.streak} 天 · 正确率 ${st.rate}%`;
    }
    if (view === 'study') return '阅读 → 写作 → 词汇 → 听说，四步一轮。';
    return m.desc || (META[view] && META[view].lede) || '';
  }

  /* ------------------------------------------------------- 返回全屏悬浮键
     进入任意模块页（非概览）时显示：点它回到全屏首屏。
     显隐完全由 body class 驱动——syncRoute 会在 v!=='dashboard' 时去掉
     vd-hero-mode，CSS 据此显示本按钮；回概览后自动隐藏，无需额外状态。 */
  function buildBack() {
    return el(`
      <button type="button" class="vd-back" data-vd-back
              title="返回全屏首页" aria-label="返回全屏首页">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>
        </svg>
        <span>返回全屏</span>
      </button>`);
  }

  /* 面板是「页内展开、不跳页」，站点 currentView 仍是 dashboard，
     所以侧栏高亮需要单独跟着面板里的模块走；关闭时再恢复到站点当前视图。 */
  function syncSpine(view) {
    document.querySelectorAll('.spine .nav-item').forEach(n => {
      n.classList.toggle('is-active', n.dataset.view === view);
    });
  }

  /* --------------------------------------------------------------- 内嵌面板 */
  function buildPanel() {
    const node = el(`
      <div class="vd-panel" aria-hidden="true">
        <div class="vd-panel__scrim" data-vd-close></div>
        <div class="vd-panel__sheet" role="dialog" aria-modal="true" aria-labelledby="vdPanelTitle">
          <header class="vd-panel__head">
            <span class="vd-panel__mark" id="vdPanelMark">序</span>
            <div class="vd-panel__meta">
              <span class="vd-panel__folio" id="vdPanelFolio">FOLIO 01</span>
              <h2 class="vd-panel__title" id="vdPanelTitle">今日概览</h2>
              <p class="vd-panel__lede" id="vdPanelLede"></p>
            </div>
            <button type="button" class="vd-panel__close" data-vd-close>关闭 ✕</button>
          </header>
          <div class="vd-panel__body" id="vdPanelBody"></div>
          <footer class="vd-panel__foot">
            <span>模块在页内展开，不离开首屏</span>
            <span>按 <kbd>ESC</kbd> 关闭</span>
          </footer>
        </div>
      </div>`);
    return node;
  }

  function openPanel(view, trigger) {
    if (!mounted || !MQ.matches || !panel) return;
    if (fsOpen) closeFs();
    if (panelOpen) closePanel(true);
    const meta = META[view];
    if (!meta) return;

    $('#vdPanelMark', panel).textContent = meta.mark;
    $('#vdPanelTitle', panel).textContent = meta.title;
    $('#vdPanelLede', panel).textContent = meta.lede;
    $('#vdPanelFolio', panel).textContent = meta.folio;

    const body = $('#vdPanelBody', panel);
    panelView = view;
    lastTrigger = trigger || null;
    syncSpine(view);

    if (view === 'dashboard') {
      if (dashWrap) body.replaceChildren(dashWrap);
    } else {
      const node = document.getElementById('view-' + view);
      if (!node) return;
      if (!node.childElementCount && R.RENDERERS[view]) {
        try { R.RENDERERS[view](); } catch (e) { console.warn('[hero-deck] render', view, e); }
      }
      slotNode = document.createComment('vd-slot');
      node.parentNode.insertBefore(slotNode, node);
      movedNode = node;
      body.replaceChildren(node);
    }

    panelOpen = true;
    clearTimeout(hideTimer);
    panel.hidden = false;
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('vd-panel-open');
    lockScroll();
    requestAnimationFrame(() => panel.classList.add('is-open'));
    const close = $('.vd-panel__close', panel);
    if (close) close.focus({ preventScroll: true });
    ensureRendered(view);
  }

  /* 数据脚本晚到时兜底：面板开着但内容是空的，就每 500ms 再画一次 */
  function ensureRendered(view) {
    clearTimeout(retryTimer);
    let tries = 0;
    const tick = () => {
      if (!panelOpen || panelView !== view) return;
      const target = view === 'dashboard' ? dashWrap : document.getElementById('view-' + view);
      if (target && target.childElementCount) return;
      try { if (R.RENDERERS[view]) R.RENDERERS[view](); } catch (e) {}
      if (++tries < 16) retryTimer = setTimeout(tick, 500);
    };
    retryTimer = setTimeout(tick, 400);
  }

  function closePanel(immediate) {
    if (!panelOpen || !panel) return;
    panelOpen = false;
    document.body.classList.remove('vd-panel-open');
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    syncSpine((R.currentView && R.currentView()) || 'dashboard');
    unlockScroll();

    if (movedNode && slotNode && slotNode.parentNode) {
      slotNode.parentNode.replaceChild(movedNode, slotNode);
    } else if (movedNode && !document.contains(movedNode)) {
      const page = document.getElementById('page');
      if (page) page.appendChild(movedNode);
    }
    movedNode = null;
    slotNode = null;
    panelView = null;
    clearTimeout(retryTimer);

    /* 淡出动画走完再彻底摘掉，免得一个全屏透明层留在页面上 */
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (panel && !panelOpen) panel.hidden = true;
    }, immediate ? 0 : 320);

    const back = lastTrigger;
    lastTrigger = null;
    if (back && document.contains(back)) {
      try { back.focus({ preventScroll: true }); } catch (e) {}
    }
  }

  /* 锁滚动时补上滚动条宽度，避免整页左右跳一下 */
  function lockScroll() {
    if (document.body.classList.contains('vd-locked')) return;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = gap > 0 ? gap + 'px' : '';
    document.body.classList.add('vd-locked');
  }
  function unlockScroll() {
    document.body.classList.remove('vd-locked');
    document.body.style.paddingRight = '';
  }

  /* ------------------------------------------------------------------ 挂载 */
  function afterRender() {
    const root = document.getElementById('view-dashboard');
    if (!root || !heroEl) return;

    const wrap = document.createElement('div');
    wrap.className = 'vd-dash-body';
    Array.from(root.childNodes).forEach(n => wrap.appendChild(n));
    dashWrap = wrap;

    root.append(heroEl);
    updateLive();
    showPeek('dashboard');
    if (panelOpen && panelView === 'dashboard') $('#vdPanelBody', panel).replaceChildren(dashWrap);
  }

  function mount() {
    if (mounted || !MQ.matches) return;
    const root = document.getElementById('view-dashboard');
    if (!root) return;

    heroEl = buildHero();
    panel = buildPanel();
    backBtn = buildBack();
    document.body.append(panel, backBtn);

    mounted = true;
    document.body.classList.add('vd-ready');
    afterRender();
    syncRoute(true);
    mountGraph();
  }

  /* 桌面 ≥1080px 才动态导入 three；手机/窄屏永不请求 three 与 hero-graph.js */
  function mountGraph() {
    if (graph || graphPending || !indexEl) return;
    if (!window.matchMedia('(min-width:1080px)').matches) return;
    const stage = $('#wgStage', indexEl);
    if (!stage) return;
    graphPending = import('./hero-graph.js?v=20261125o').then(mod => {
      graphPending = null;
      if (!mounted || !indexEl || !stage.isConnected) return;
      graph = window.YANBIAN_HERO_GRAPH || (mod && mod.YANBIAN_HERO_GRAPH);
      const ok = graph && graph.mount(stage);
      if (!ok) {
        graph = null;
        const loading = $('.wg-loading', stage); if (loading) loading.remove();
        const empty = $('.wg-empty', stage); if (empty) empty.hidden = false;
        const Y = window.__YANBIAN__;
        Y && Y.toast && Y.toast('这台设备的浏览器不支持 3D 图谱');
        switchWgTab('list');
      }
    }).catch(err => {
      graphPending = null;
      const loading = $('.wg-loading', stage); if (loading) loading.remove();
      switchWgTab('list');
    });
  }

  /* ------------------------------------------------------ 全屏导图浮层 */
  function buildFs() {
    if (fsEl) return;
    fsEl = el(`
      <div class="wg-fs" id="wgFs" hidden aria-hidden="true">
        <div class="wg-fs__veil"></div>
        <div class="wg-fs__inner" role="dialog" aria-modal="true" aria-label="单词关系导图">
          <div class="wg-fs__stage" id="wgFsStage"></div>
          <div class="wg-fs__note" id="wgFsNote"></div>
          <button class="wg-fs__close" id="wgFsClose" type="button" aria-label="关闭图谱">✕<span>ESC</span></button>
        </div>
      </div>`);
    document.body.appendChild(fsEl);
    fsStage = $('#wgFsStage', fsEl);
    fsNote = $('#wgFsNote', fsEl);
  }

  function fsReady() { return !!(graph && graph.isReady && graph.isReady()); }

  function openFs() {
    if (fsOpen || !mqGraph()) return;
    if (fsTimer) { clearTimeout(fsTimer); finishFsClose(); } // 上次关闭动画未播完：先收尾
    const stage = indexEl && $('#wgStage', indexEl);
    if (!stage) return;
    if (!fsReady()) {
      const Y = window.__YANBIAN__;
      Y && Y.toast && Y.toast('图谱还没准备好');
      return;
    }
    buildFs();
    clearTimeout(fsTimer);
    fsLastFocus = document.activeElement;
    // 用注释节点占位，关掉时原样搬回；WebGL 上下文与 renderer 全程不重建
    fsPlaceholder = document.createComment('wg-stage');
    stage.parentNode.insertBefore(fsPlaceholder, stage);
    fsStage.appendChild(stage);
    const detail = $('.wg-detail', indexEl);
    if (detail) {
      fsDetailHolder = detail.parentNode;
      fsDetailNext = detail.nextSibling;
      fsNote.appendChild(detail);
    }
    fsEl.hidden = false;
    fsEl.setAttribute('aria-hidden', 'false');
    fsOpen = true;
    fsScrollY = window.scrollY;
    fsPadRight = document.body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    if (gap > 0) document.body.style.paddingRight = gap + 'px';
    document.body.classList.add('wg-fs-open');
    requestAnimationFrame(() => fsEl && fsEl.classList.add('is-open'));
    const close = $('#wgFsClose', fsEl); if (close) close.focus();
  }

  /* 动画播完再搬回 DOM，关闭时能看到画布随浮层一起收拢 */
  function finishFsClose() {
    fsTimer = 0;
    if (!fsEl) return;
    const stage = fsStage && (fsStage.firstElementChild || $('#wgStage', fsStage));
    if (stage && fsPlaceholder && fsPlaceholder.parentNode) {
      fsPlaceholder.parentNode.replaceChild(stage, fsPlaceholder);
    }
    fsPlaceholder = null;
    const detail = fsNote && (fsNote.firstElementChild || $('.wg-detail', fsNote));
    if (detail && fsDetailHolder) {
      fsDetailHolder.insertBefore(detail, fsDetailNext && fsDetailNext.parentNode === fsDetailHolder ? fsDetailNext : null);
    }
    fsDetailHolder = fsDetailNext = null;
    if (!fsOpen) fsEl.hidden = true;
    document.body.classList.remove('wg-fs-open');
    document.body.style.paddingRight = fsPadRight;
    if (fsLastFocus && document.contains(fsLastFocus)) { try { fsLastFocus.focus(); } catch (_) {} }
    fsLastFocus = null;
    if (typeof fsScrollY === 'number' && window.scrollY !== fsScrollY) window.scrollTo(0, fsScrollY);
  }

  function closeFs() {
    if (!fsOpen) return;
    fsOpen = false;
    fsEl.classList.remove('is-open');
    fsEl.setAttribute('aria-hidden', 'true');
    clearTimeout(fsTimer);
    fsTimer = setTimeout(finishFsClose, 260);
  }

  function mqGraph() { return window.matchMedia('(min-width:1080px)').matches; }

  function switchWgTab(tab) {
    const root = indexEl; if (!root) return;
    if (fsOpen) closeFs();
    const graphOn = tab === 'graph';
    root.classList.toggle('is-graph', graphOn);
    root.querySelectorAll('[data-wg-tab]').forEach(b => {
      const on = b.dataset.wgTab === tab;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', String(on));
    });
    const list = $('#wgList', root); if (list) list.hidden = graphOn;
    const stage = $('#wgStage', root); if (stage) stage.hidden = !graphOn;
    const tools = $('.wg-tools', root); if (tools) tools.hidden = !graphOn;
    const detail = $('.wg-detail', root); if (detail) detail.hidden = !graphOn;
    graph && graph.setTab && graph.setTab(tab);
  }

  function unmount() {
    if (!mounted) return;
    if (fsOpen) closeFs();
    if (graph) { graph.unmount && graph.unmount(); graph = null; }
    graphPending = null;
    closePanel(true);
    const root = document.getElementById('view-dashboard');
    if (root) {
      if (heroEl) heroEl.remove();
      if (dashWrap) { root.append(...Array.from(dashWrap.childNodes)); dashWrap = null; }
    }
    if (panel) panel.remove();
    if (backBtn) backBtn.remove();
    heroEl = indexEl = panel = backBtn = null;
    mounted = false;
    panelOpen = false;
    unlockScroll();
    document.body.classList.remove('vd-ready', 'vd-hero-mode', 'vd-panel-open');
  }

  /* ------------------------------------------------------------- 路由同步 */
  function syncRoute(force) {
    const v = (R.currentView && R.currentView()) || 'dashboard';
    const changed = force || v !== lastRoute;
    lastRoute = v;
    if (!mounted) return;
    // 进过非概览的模块页就标记为「已离开首屏」，之后侧栏回概览只显示普通页。
    if (changed && v !== 'dashboard') leftHero = true;
    document.body.classList.toggle('vd-hero-mode', MQ.matches && v === 'dashboard' && !leftHero);

    // 原设计里概览内容(dashWrap)默认不挂 DOM、只在打开「今日概览」面板时放入。
    // 现在多了一个「回普通概览页」的状态：此时把内容挂回 root、放在 Hero 之前
    // （Hero 由 CSS 在 vd-hero-mode 关闭时隐藏）；回全屏或进别的模块时摘掉。
    const root = document.getElementById('view-dashboard');
    if (root && dashWrap) {
      const plain = v === 'dashboard' && leftHero && MQ.matches;
      if (plain && dashWrap.parentNode !== root) root.insertBefore(dashWrap, heroEl);
      else if (!plain && dashWrap.parentNode === root) dashWrap.remove();
    }

    if (panelOpen && changed && panelView && v !== panelView) closePanel(true);
    if (!panelOpen) updateLive();
  }

  /* ------------------------------------------------------------- 事件绑定 */
  function bind() {
    document.addEventListener('click', e => {
      const t = e.target;
      if (!(t instanceof Element)) return;

      // 概览面板里的「从这里继续」快捷卡：不要跳页，直接在面板里换模块
      const quick = t.closest('.quick-card');
      if (quick && panelOpen && panelView === 'dashboard' && quick.dataset.goto) {
        e.preventDefault();
        e.stopPropagation();
        openPanel(quick.dataset.goto, quick);
        return;
      }

      // 侧栏是「真正跳页」，面板是「页内展开」：面板开着时点侧栏模块必须先关面板，
      // 否则面板留在屏幕上、返回全屏键又被 vd-panel-open 隐藏，用户卡在里面回不了首屏。
      // 这里只关面板、不拦截事件，让 app.js 的导航监听照常执行。
      if (t.closest('.spine .nav-item[data-view]') && panelOpen) {
        closePanel(true);
        return;
      }

      // 返回全屏：关掉可能开着的面板，回到「今日概览」的全屏首屏
      if (t.closest('[data-vd-back]')) {
        e.preventDefault();
        if (panelOpen) closePanel(true);
        leftHero = false;   // 显式回全屏：清除「已离开」标记，让概览重新以首屏呈现
        if (typeof R.navigate === 'function') R.navigate('dashboard');
        return;
      }

      const openBtn = t.closest('[data-vd-open]');
      if (openBtn) {
        e.preventDefault();
        openPanel(openBtn.dataset.vdOpen, openBtn);
        return;
      }
      if (t.closest('[data-vd-close]')) { e.preventDefault(); closePanel(); return; }
      if (t.closest('[data-vd-theme]')) {
        e.preventDefault();
        const btn = document.getElementById('themeToggle');
        if (btn) btn.click();
        return;
      }
      if (t.closest('[data-vd-data]')) {
        e.preventDefault();
        const btn = document.getElementById('dataBtn');
        if (btn) btn.click();
        return;
      }
    }, true);

    /* 全屏导图：按钮 / 关闭 / 面板打开时自动收起 */
    document.addEventListener('click', e => {
      if (!(e.target instanceof Element)) return;
      if (e.target.closest('#wgExpand')) { e.preventDefault(); openFs(); return; }
      if (e.target.closest('#wgFsClose')) { e.preventDefault(); closeFs(); return; }
    }, true);

    /* 卡片图谱区：点空白开全屏；拖拽或点节点都不触发 */
    document.addEventListener('pointerdown', e => {
      if (!(e.target instanceof Element) || !indexEl) return;
      const stage = $('#wgStage', indexEl);
      if (!stage || !stage.contains(e.target)) return;
      if (e.target.closest('#wgExpand')) return;
      fsDown = { x: e.clientX, y: e.clientY, t: performance.now() };
    }, true);
    document.addEventListener('pointerup', e => {
      if (!fsDown) return;
      const d = fsDown; fsDown = null;
      if (fsOpen || !mqGraph() || !fsReady()) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) >= 6 || performance.now() - d.t >= 400) return;
      if (graph.hitTest && graph.hitTest(e.clientX, e.clientY)) return; // 点节点看释义，交给 hero-graph
      openFs();
    }, true);

    /* 窗口缩窄：<1080px 自动收起浮层回卡片态 */
    window.addEventListener('resize', () => { if (fsOpen && !mqGraph()) closeFs(); });

    /* 目录卡：图谱 / 目录 双态切换 + 换一个中心词 */
    document.addEventListener('click', e => {
      if (!(e.target instanceof Element)) return;
      const tab = e.target.closest('[data-wg-tab]');
      if (tab && indexEl && indexEl.contains(tab)) { e.preventDefault(); switchWgTab(tab.dataset.wgTab); return; }
      const shuffle = e.target.closest('#wgShuffle');
      if (shuffle && indexEl && indexEl.contains(shuffle)) {
        e.preventDefault();
        if (!graph || !graph.isReady || !graph.isReady()) { const Y = window.__YANBIAN__; Y && Y.toast && Y.toast('图谱还在织网，稍等一下'); return; }
        graph.refresh && graph.refresh();
      }
    }, true);

    /* 目录卡：鼠标移过 / 键盘聚焦都更新底部那行小注 */
    const peekAt = e => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const ix = t.closest('.vd-ix');
      if (ix && ix.dataset.vdIx) showPeek(ix.dataset.vdIx);
    };
    document.addEventListener('mouseover', peekAt, true);
    document.addEventListener('focusin', peekAt, true);

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (fsOpen) { closeFs(); return; } // 一次只关一层：先收浮层，不动面板
      if (panelOpen) closePanel();
    });

    document.addEventListener('visibilitychange', () => {
      const v = heroEl && heroEl.querySelector('.vd-hero__video');
      if (!v) return;
      if (document.hidden) v.pause();
      else { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
    });

    const onChange = () => { if (MQ.matches) mount(); else unmount(); };
    if (MQ.addEventListener) MQ.addEventListener('change', onChange);
    else if (MQ.addListener) MQ.addListener(onChange);

    const title = document.getElementById('viewTitle');
    if (title) {
      new MutationObserver(() => { if (fsOpen) closeFs(); syncRoute(false); }).observe(title, { childList: true, characterData: true, subtree: true });
    }
  }

  /* ------------------------------------------------------- 接管概览渲染器 */
  function patchRenderer() {
    const list = R.RENDERERS;
    if (!list || !list.dashboard || list.dashboard.__vd) return;
    const orig = list.dashboard;
    const wrapped = function () {
      const out = orig.apply(this, arguments);
      if (mounted) afterRender();
      return out;
    };
    wrapped.__vd = true;
    list.dashboard = wrapped;
  }

  bind();
  patchRenderer();
  if (MQ.matches) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
    else mount();
  }
})();
