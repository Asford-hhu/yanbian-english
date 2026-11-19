/* ============================================================
   砚边 · 外刊速览模块（独立渲染器）
   - 内置全文兜底（news-data.js，构建时抓取 The Guardian 正文+图），离线秒开
   - 原 BBC 源只有一行摘要、且 bbc.co.uk 在国内不可达，"打开原文"必定超时，
     已整体改用 The Guardian：rss2json 可取到 600~1300 字真实英文正文。
   - 阅读完全在站内完成：点「读全文/精读」展开内置英文正文，不跳转、不等待。
   - 图片走 images.weserv.nl 代理（国外图床国内适配），失败自动占位。
   - 需看网页原版时：新窗口打开原文（blocked 时给出复制标题/链接兜底）。
   ============================================================ */
(function registerNewsView() {
  'use strict';
  const { $, $$, esc, RENDERERS } = window.__YANBIAN__;

  const CACHE_KEY = 'yansbian_news_v3';
  const RSS = 'https://www.theguardian.com/world/rss';
  const FALLBACK = window.YANBIAN_NEWS_FALLBACK || [];
  const IMG_PROXY = 'https://images.weserv.nl/?url=';
  const proxyImg = (raw) => {
    if (!raw) return '';
    const u = raw.replace(/^https?:\/\//, '');
    return IMG_PROXY + encodeURIComponent(u) + '&w=720&h=405&fit=cover&default=none';
  };

  const today = () => new Date().toISOString().slice(0, 10);
  function readCache() {
    try {
      const d = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (d && d.date === today() && d.items && d.items.length) return d;
    } catch (e) {}
    return null;
  }
  function writeCache(items) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today(), items })); } catch (e) {}
  }
  function strip(s) {
    return (s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ').trim().replace(/\s*Continue reading\.{0,3}\s*$/i, '');
  }
  function normalize(data) {
    return (data.items || []).slice(0, 12).map(it => {
      const raw = (it.enclosure && it.enclosure.link) || it.thumbnail || '';
      const full = strip(it.content || it.description || '');
      return {
        title: strip(it.title),
        desc: full.slice(0, 180),
        full: full,
        link: it.link || '',
        img: proxyImg(raw),
        rawimg: raw,
        date: (it.pubDate || '').slice(0, 22),
        source: 'The Guardian',
      };
    }).filter(x => x.title && x.full);
  }
  function timeAgo(pub) {
    if (!pub) return '';
    const t = Date.parse(pub);
    if (isNaN(t)) return pub;
    const mins = Math.round((Date.now() - t) / 60000);
    if (mins < 1) return '刚刚';
    if (mins < 60) return mins + ' 分钟前';
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + ' 小时前';
    return Math.round(hrs / 24) + ' 天前';
  }
  function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text); return true; }
    } catch (e) {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      return true;
    } catch (e) { return false; }
  }

  RENDERERS.news = function () {
    const root = $('#view-news');
    if (!root) return;
    const cached = readCache();
    let items = cached ? cached.items : FALLBACK.slice();
    let updatedAt = cached ? cached.date : '(内置全文)';
    let loading = false;

    const cardHtml = (it, i) => `
      <article class="news-card" data-ni="${i}">
        <div class="news-card__imgwrap" style="position:relative;width:100%;height:150px;background:var(--pine-wash);display:flex;align-items:center;justify-content:center;overflow:hidden">
          <span style="position:absolute;font-size:2rem;color:var(--accent)">▤</span>
          <img class="news-card__img" src="${esc(it.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" style="position:relative;width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">
        </div>
        <div class="news-card__body">
          <div class="news-card__src">${esc(it.source || 'The Guardian')}</div>
          <div class="news-card__title">${esc(it.title)}</div>
          <div class="news-card__desc news-card__desc--clamp">${esc(it.desc || '')}</div>
          <div class="news-card__meta">
            <span>${esc(timeAgo(it.date))}</span>
            <span style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="news-act" data-act="read" data-i="${i}" style="color:var(--accent)">读全文</button>
              <button class="news-act" data-act="copy" data-i="${i}" style="color:var(--ink-soft)">复制标题</button>
              ${it.link ? `<button class="news-act" data-act="open" data-i="${i}" style="color:var(--ink-soft)">网页原文↗</button>` : ''}
            </span>
          </div>
        </div>
      </article>`;

    const render = () => {
      const body = `<div class="news-grid">${items.map(cardHtml).join('')}</div>`;
      root.innerHTML = `
        <div class="card" style="border-left:3px solid var(--accent);margin-bottom:var(--sp-5)">
          <div class="card__label">Foreign Press · 外刊速览</div>
          <p style="font-family:var(--font-serif);margin:0;color:var(--ink-soft);line-height:1.8">
            每日头条，<b>英文全文已内置</b>，点「读全文」站内即可精读完整正文，无需跳转、秒开不卡。
            <br><span style="font-size:.82rem;color:var(--ink-faint)">更新：${esc(updatedAt)} · 来源 The Guardian</span>
          </p>
        </div>
        <div class="filter-bar">
          <span class="tag tag--pine">The Guardian · 国际头条</span>
          <button class="btn btn--sm" id="newsRefresh">↻ 刷新最新</button>
        </div>
        ${body}
        <div id="newsReader"></div>
      `;
      const refresh = $('#newsRefresh');
      if (refresh) refresh.addEventListener('click', () => {
        refresh.textContent = '↻ 拉取中…';
        load(true, () => { const b = $('#newsRefresh'); if (b) b.textContent = '↻ 刷新最新'; });
      });
      $$('[data-act]', root).forEach(b => b.addEventListener('click', () => {
        const it = items[+b.dataset.i];
        if (!it) return;
        const act = b.dataset.act;
        if (act === 'copy') {
          const ok = copyText(it.title + (it.link ? '\n' + it.link : ''));
          window.__YANBIAN__.toast(ok ? '标题与链接已复制' : '复制失败，请长按选择');
        } else if (act === 'read') {
          openReader(it);
        } else if (act === 'open') {
          window.open(it.link, '_blank', 'noopener,noreferrer');
          window.__YANBIAN__.toast('若打不开，请用「读全文」在站内看正文');
        }
      }));
    };

    function openReader(it) {
      const box = $('#newsReader');
      if (!box) return;
      // 正文按句分段，段首缩进，便于精读
      const paras = (it.full || it.desc || '').split(/(?<=[.!?])\s+/);
      const chunks = [];
      let buf = '';
      paras.forEach(p => { buf += (buf ? ' ' : '') + p; if (buf.length > 260) { chunks.push(buf); buf = ''; } });
      if (buf) chunks.push(buf);
      const bodyHtml = chunks.length
        ? chunks.map(p => `<p style="margin:0 0 var(--sp-3);text-indent:1.2em">${esc(p)}</p>`).join('')
        : `<p>${esc(it.desc || '')}</p>`;
      box.innerHTML = `
        <div class="card" style="margin-top:var(--sp-5);border-left:3px solid var(--accent)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
            <div class="card__label">全文精读 · ${esc(it.source || '外刊')}</div>
            <button class="btn btn--sm" id="readerClose">关闭</button>
          </div>
          <h3 style="font-family:var(--font-serif);margin:var(--sp-3) 0;line-height:1.45">${esc(it.title)}</h3>
          ${it.img ? `<img src="${esc(it.img)}" referrerpolicy="no-referrer" alt="" onerror="this.style.display='none'" style="width:100%;max-height:280px;object-fit:cover;border-radius:10px;margin-bottom:var(--sp-3);background:var(--pine-wash)">` : ''}
          <div style="font-family:var(--font-serif);line-height:1.95;color:var(--ink-soft);font-size:1rem">
            ${bodyHtml}
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:var(--sp-4)">
            ${it.link ? `<button class="btn btn--sm btn--primary" id="readerOpen">网页原版 ↗</button>` : ''}
            <button class="btn btn--sm" id="readerCopy">复制标题+链接</button>
          </div>
          <p style="font-family:var(--font-serif);font-size:.76rem;color:var(--ink-faint);margin:var(--sp-3) 0 0">
            以上为英文原文正文（来自 RSS 全文）。国外站点在国内常打不开，「网页原版」超时属正常，直接用本页精读即可。
          </p>
        </div>`;
      $('#readerClose')?.addEventListener('click', () => { box.innerHTML = ''; });
      $('#readerCopy')?.addEventListener('click', () => {
        const ok = copyText(it.title + (it.link ? '\n' + it.link : ''));
        window.__YANBIAN__.toast(ok ? '已复制标题与链接' : '复制失败，请长按选择');
      });
      $('#readerOpen')?.addEventListener('click', () => {
        window.open(it.link, '_blank', 'noopener,noreferrer');
        window.__YANBIAN__.toast('打不开时请继续用本页全文精读');
      });
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function load(force, done) {
      if (!force && cached) { if (done) done(); return; }
      const url = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(RSS);
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 8000);
      fetch(url, { signal: ctl.signal }).then(r => {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      }).then(d => {
        clearTimeout(timer);
        if (d.status !== 'ok') throw new Error('feed');
        const fresh = normalize(d);
        if (!fresh.length) throw new Error('empty');
        items = fresh; updatedAt = today(); writeCache(items); render();
        if (done) done();
      }).catch(() => {
        clearTimeout(timer);
        const c = readCache();
        items = c ? c.items : FALLBACK.slice();
        updatedAt = c ? c.date : '(内置全文)';
        render();
        if (done) done();
      });
    }

    render();
    // 打开时自动联网增强一次（8 秒超时即回退内置全文）
    load(false);
  };

  window.__registerNewsView = registerNewsView;
})();
