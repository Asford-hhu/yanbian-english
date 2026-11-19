/* ============================================================
   砚边 · 外刊速览模块（独立渲染器）
   打开模块时通过 rss2json 拉取 BBC / Guardian 最新头条（带图），
   按"当天日期"缓存到 localStorage：同一天不重复请求，隔天自动刷新。
   网络失败时回退到内置精选，并显示离线提示。
   ============================================================ */
(function registerNewsView() {
  'use strict';
  const { $, $$, esc, RENDERERS } = window.__YANBIAN__;

  const CACHE_KEY = 'yansbian_news_v1';
  const SOURCES = {
    bbc: { name: 'BBC News', rss: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
    guardian: { name: 'The Guardian', rss: 'https://www.theguardian.com/world/rss' },
  };
  // 内置兜底（网络不可用时的引导，非新闻内容）
  const FALLBACK = [{
    title: 'Keep reading — the world is your textbook.',
    source: '砚边 · 外刊导读',
    desc: '外刊速览会在你打开本模块时自动拉取当天最新头条。若你看到这条提示，说明当前网络无法访问新闻接口；请检查网络后点右上角「刷新」。',
    link: 'https://www.bbc.com/news', img: '', date: ''
  }];

  const today = () => new Date().toISOString().slice(0, 10);

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (d.date !== today()) return null; // 隔天失效 → 自动刷新
      return d;
    } catch (e) { return null; }
  }
  function writeCache(src, items) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today(), src, items })); } catch (e) {}
  }

  function normalize(data, srcKey) {
    const items = (data.items || []).slice(0, 12).map(it => ({
      title: it.title || '',
      source: SOURCES[srcKey]?.name || '外刊',
      desc: (it.description || '').replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ').trim().slice(0, 180),
      link: it.link || '',
      img: it.thumbnail || (it.enclosure && /image/i.test(it.enclosure.type || '') ? it.enclosure.link : '') || '',
      date: (it.pubDate || '').slice(0, 16),
    }));
    return items;
  }

  function timeAgo(pub) {
    if (!pub) return '';
    const t = Date.parse(pub);
    if (isNaN(t)) return pub;
    const mins = Math.round((Date.now() - t) / 60000);
    if (mins < 60) return mins + ' 分钟前';
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + ' 小时前';
    return Math.round(hrs / 24) + ' 天前';
  }

  RENDERERS.news = function () {
    const root = $('#view-news');
    if (!root) return;
    let srcKey = 'bbc';
    const cached = readCache();
    let items = cached && cached.src === srcKey ? cached.items : null;
    let loading = !items;
    let updatedAt = cached && cached.date === today() ? cached.date : '';

    const cardHtml = (it) => `
      <article class="news-card">
        ${it.img ? `<img class="news-card__img" src="${esc(it.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'">` : ''}
        <div class="news-card__body">
          <div class="news-card__src">${esc(it.source)}</div>
          <div class="news-card__title">${esc(it.title)}</div>
          ${it.desc ? `<div class="news-card__desc">${esc(it.desc)}</div>` : ''}
          <div class="news-card__meta">
            <span>${esc(timeAgo(it.date))}</span>
            <a class="news-card__link" href="${esc(it.link)}" target="_blank" rel="noopener noreferrer">读原文 ↗</a>
          </div>
        </div>
      </article>`;

    const render = () => {
      const srcChips = Object.keys(SOURCES).map(k => `<button class="filter-chip ${k === srcKey ? 'is-active' : ''}" data-nsrc="${k}">${SOURCES[k].name}</button>`).join('');
      const body = loading
        ? `<div class="empty"><span class="empty__mark">◌</span><p>正在拉取今日外刊头条…</p></div>`
        : (items && items.length ? `<div class="news-grid">${items.map(cardHtml).join('')}</div>`
          : `<div class="news-grid">${FALLBACK.map(cardHtml).join('')}</div>`);
      root.innerHTML = `
        <div class="card" style="border-left:3px solid var(--accent);margin-bottom:var(--sp-5)">
          <div class="card__label">Foreign Press · 外刊速览</div>
          <p style="font-family:var(--font-serif);margin:0;color:var(--ink-soft);line-height:1.8">
            每天打开自动拉取 <b>BBC / Guardian</b> 等外刊头条（带图），按当天日期缓存，隔天自动更新。读英文标题练语感，点「读原文」看完整报道。
            ${updatedAt ? `<br><span style="font-size:.82rem;color:var(--ink-faint)">最近更新：${esc(updatedAt)}</span>` : ''}
          </p>
        </div>
        <div class="filter-bar">
          ${srcChips}
          <button class="btn btn--sm" id="newsRefresh">↻ 刷新</button>
          <span class="tag tag--pine">今日实时</span>
        </div>
        ${body}
      `;
      $$('[data-nsrc]', root).forEach(b => b.addEventListener('click', () => {
        if (b.dataset.nsrc === srcKey) return;
        srcKey = b.dataset.nsrc;
        const c = readCache();
        if (c && c.src === srcKey) { items = c.items; loading = false; render(); }
        else load(true);
      }));
      $('#newsRefresh').addEventListener('click', () => load(true));
    };

    function load(force) {
      const c = readCache();
      if (!force && c && c.src === srcKey) { items = c.items; loading = false; updatedAt = c.date; render(); return; }
      loading = true; render();
      const rss = SOURCES[srcKey].rss;
      const url = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(rss);
      fetch(url).then(r => {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      }).then(d => {
        if (d.status !== 'ok') throw new Error(d.message || 'feed error');
        items = normalize(d, srcKey);
        if (!items.length) throw new Error('empty');
        writeCache(srcKey, items);
        updatedAt = today();
        loading = false; render();
      }).catch(() => {
        loading = false;
        // 用缓存兜底，否则显示离线引导
        const cc = readCache();
        items = (cc && cc.items && cc.items.length) ? cc.items : FALLBACK;
        render();
      });
    }

    load(false);
  };

  window.__registerNewsView = registerNewsView;
})();
