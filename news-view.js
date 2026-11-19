/* ============================================================
   砚边 · 外刊速览模块（独立渲染器）
   - 内置精选兜底（news-data.js），断网/限流也有内容，秒开不卡
   - 联网增强：打开时带 8 秒超时拉当天最新，成功则替换并缓存
   - 图片走 images.weserv.nl 代理（BBC 图床国内不可达），失败自动占位
   - 原文三入口：站内展开精读 / 打开原文 / 复制标题，解决"读不了原文"
   ============================================================ */
(function registerNewsView() {
  'use strict';
  const { $, $$, esc, RENDERERS } = window.__YANBIAN__;

  const CACHE_KEY = 'yansbian_news_v2';
  const SOURCES = {
    bbc: { name: 'BBC News', rss: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  };
  const FALLBACK = window.YANBIAN_NEWS_FALLBACK || [];
  const IMG_PROXY = 'https://images.weserv.nl/?url=';
  const proxyImg = (raw) => raw ? IMG_PROXY + encodeURIComponent(raw.replace(/^https?:\/\//, '')) + '&w=640&h=360&fit=cover&default=none' : '';

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
  function normalize(data) {
    return (data.items || []).slice(0, 12).map(it => {
      const raw = it.thumbnail || (it.enclosure && it.enclosure.thumbnail) || '';
      const desc = (it.description || it.content || '').replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ').trim();
      return {
        title: it.title || '',
        desc: desc.slice(0, 400),
        link: it.link || '',
        img: proxyImg(raw),
        rawimg: raw,
        date: (it.pubDate || '').slice(0, 22),
        source: 'BBC News',
      };
    }).filter(x => x.title);
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
    let updatedAt = cached ? cached.date : '(内置精选)';
    let loading = !cached;

    const cardHtml = (it, i) => `
      <article class="news-card" data-ni="${i}">
        <div class="news-card__imgwrap" style="position:relative;width:100%;height:150px;background:var(--pine-wash);display:flex;align-items:center;justify-content:center;overflow:hidden">
          <span style="position:absolute;font-size:2rem;color:var(--accent)">▤</span>
          <img class="news-card__img" src="${esc(it.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" style="position:relative;width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">
        </div>
        <div class="news-card__body">
          <div class="news-card__src">${esc(it.source || '外刊速览')}</div>
          <div class="news-card__title">${esc(it.title)}</div>
          <div class="news-card__desc news-card__desc--clamp">${esc(it.desc || '点下方「读原文/精读」查看完整内容。')}</div>
          <div class="news-card__meta">
            <span>${esc(timeAgo(it.date))}</span>
            <span style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="news-act" data-act="read" data-i="${i}" style="color:var(--accent)">精读</button>
              <button class="news-act" data-act="copy" data-i="${i}" style="color:var(--ink-soft)">复制标题</button>
              ${it.link ? `<a class="news-card__link" href="${esc(it.link)}" target="_blank" rel="noopener noreferrer">原文↗</a>` : ''}
            </span>
          </div>
        </div>
      </article>`;

    const render = () => {
      const body = loading
        ? `<div class="empty"><span class="empty__mark">◌</span><p>正在拉取今日外刊头条…（已显示内置精选，可先看）</p></div>`
        : `<div class="news-grid">${items.map(cardHtml).join('')}</div>`;
      root.innerHTML = `
        <div class="card" style="border-left:3px solid var(--accent);margin-bottom:var(--sp-5)">
          <div class="card__label">Foreign Press · 外刊速览</div>
          <p style="font-family:var(--font-serif);margin:0;color:var(--ink-soft);line-height:1.8">
            每日头条（带图），点「精读」在站内看英文摘要，点「原文」跳转完整报道，点「复制标题」可粘贴到翻译/搜索。图片与内容已做国内网络适配。
            <br><span style="font-size:.82rem;color:var(--ink-faint)">更新：${esc(updatedAt)}</span>
          </p>
        </div>
        <div class="filter-bar">
          <span class="tag tag--pine">${esc(SOURCES.bbc.name)} · 国际头条</span>
          <button class="btn btn--sm" id="newsRefresh">↻ 刷新最新</button>
        </div>
        ${body}
        <div id="newsReader"></div>
      `;
      const refresh = $('#newsRefresh');
      if (refresh) refresh.addEventListener('click', () => load(true));
      $$('[data-act]', root).forEach(b => b.addEventListener('click', () => {
        const it = items[+b.dataset.i];
        if (!it) return;
        if (b.dataset.act === 'copy') {
          const ok = copyText(it.title + (it.link ? '\n' + it.link : ''));
          window.__YANBIAN__.toast(ok ? '标题与链接已复制' : '复制失败，请长按选择');
        } else if (b.dataset.act === 'read') {
          openReader(it);
        }
      }));
    };

    function openReader(it) {
      const box = $('#newsReader');
      if (!box) return;
      const paras = (it.desc || '').split(/(?<=[.!?。！？])\s+/).filter(Boolean);
      box.innerHTML = `
        <div class="card" style="margin-top:var(--sp-5);border-left:3px solid var(--accent)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
            <div class="card__label">精读 · ${esc(it.source || '外刊')}</div>
            <button class="btn btn--sm" id="readerClose">关闭</button>
          </div>
          <h3 style="font-family:var(--font-serif);margin:var(--sp-3) 0;line-height:1.45">${esc(it.title)}</h3>
          <div style="font-family:var(--font-serif);line-height:1.9;color:var(--ink-soft);font-size:.98rem">
            ${paras.length ? paras.map(p => `<p style="margin:0 0 var(--sp-3)">${esc(p)}</p>`).join('') : '<p>'+esc(it.desc||'')+'</p>'}
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:var(--sp-4)">
            ${it.link ? `<a class="btn btn--sm btn--primary" href="${esc(it.link)}" target="_blank" rel="noopener noreferrer">打开完整原文 ↗</a>` : ''}
            <button class="btn btn--sm" id="readerCopy">复制标题+链接</button>
          </div>
          <p style="font-family:var(--font-serif);font-size:.76rem;color:var(--ink-faint);margin:var(--sp-3) 0 0">
            说明：以上为该报道的英文导语摘要。微信内若「打开原文」受限，可点「复制标题+链接」粘贴到浏览器阅读。
          </p>
        </div>`;
      $('#readerClose')?.addEventListener('click', () => { box.innerHTML = ''; });
      $('#readerCopy')?.addEventListener('click', () => {
        const ok = copyText(it.title + (it.link ? '\n' + it.link : ''));
        window.__YANBIAN__.toast(ok ? '已复制标题与链接' : '复制失败，请长按选择');
      });
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function load(force) {
      if (!force && cached) { render(); return; }
      loading = true; render();
      const rss = SOURCES.bbc.rss;
      const url = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(rss);
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 8000); // 8s 超时，避免微信久等
      fetch(url, { signal: ctl.signal }).then(r => {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      }).then(d => {
        clearTimeout(timer);
        if (d.status !== 'ok') throw new Error('feed');
        const fresh = normalize(d);
        if (!fresh.length) throw new Error('empty');
        items = fresh; updatedAt = today(); loading = false;
        writeCache(items); render();
      }).catch(() => {
        clearTimeout(timer);
        loading = false;
        // 有缓存用缓存，否则内置精选
        const c = readCache();
        items = c ? c.items : FALLBACK.slice();
        updatedAt = c ? c.date : '(内置精选)';
        render();
      });
    }

    render();
    // 打开时自动联网增强一次（带超时，失败快速回退）
    load(false);
  };

  window.__registerNewsView = registerNewsView;
})();
