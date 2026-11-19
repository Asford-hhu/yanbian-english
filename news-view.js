/* ============================================================
   砚边 · 外刊速览模块（独立渲染器）
   数据源：中新网英文 ECNS（www.ecns.cn）—— 国内直连、稳定、每日更新
     - RSS: https://www.ecns.cn/rss/rss.xml  （Access-Control-Allow-Origin:*，浏览器可直接读）
     - 文章页：同域 CORS 开放，可提取英文全文 + 国内CDN配图(image.cns.com.cn，直连无需代理)
   为什么换源：原 BBC/Guardian 国外站国内不可达、打开原文超时、图床被墙。
   本方案彻底不依赖任何国外站点或图床代理：
     - 打开即显示内置最新全文（news-data.js，构建时抓取），秒开；
     - 随即浏览器直连 ECNS RSS 拉当天最新列表，逐篇取全文，按天缓存；
     - 全文在站内展开，配图为国内 CDN 直链（微信/电脑均可显示）。
   题材：时政/科技/财经/文化/社会，贴近四六级与外刊阅读热点。
   ============================================================ */
(function registerNewsView() {
  'use strict';
  const { $, $$, esc, RENDERERS } = window.__YANBIAN__;

  const CACHE_KEY = 'yansbian_news_ecns_v1';
  const RSS = 'https://www.ecns.cn/rss/rss.xml';
  const FALLBACK = window.YANBIAN_NEWS_FALLBACK || [];
  const MAX = 16;

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
  function decodeEntities(s) {
    return (s || '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  }
  function strip(s) {
    return decodeEntities((s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  }
  function cdata(s) {
    const m = (s || '').match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
    return decodeEntities((m ? m[1] : s || '').trim());
  }
  function timeAgo(pub) {
    if (!pub) return '';
    const t = Date.parse(pub.replace(/-/g, '/'));
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

  // —— 浏览器端解析 RSS ——
  function parseRss(xml) {
    const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    const out = [];
    for (const b of blocks) {
      const g = (tag) => {
        const m = b.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>', 'i'));
        return m ? m[1] : '';
      };
      const title = cdata(g('title'));
      let link = strip(g('link')).replace(/^http:/, 'https:');
      if (!title || !link || /\/video\//.test(link)) continue;
      out.push({
        title, link,
        column: strip(g('column')) || 'Ecns wire',
        date: strip(g('pubDate')),
        desc: strip(g('description')),
        full: '', img: '', source: 'ECNS 中新网英文',
      });
      if (out.length >= MAX) break;
    }
    return out;
  }

  // —— 浏览器端解析文章页：英文全文 + 国内CDN配图 ——
  function parseArticle(htmlSrc) {
    const ps = htmlSrc.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
    const paras = [];
    for (const p of ps) {
      const t = strip(p.replace(/<[^>]*>/gi, ''));
      if (t.length >= 45 && /[a-zA-Z]{3}/.test(t) && !/Copyright|All Rights Reserved/i.test(t)) paras.push(t);
    }
    const full = paras.join('\n');
    const imgs = htmlSrc.match(/\/\/image\.cns\.com\.cn\/ecns_editor\/transform\/[^"'\s]+\.(?:jpg|jpeg|png)/gi) || [];
    const img = imgs.length ? 'https:' + imgs[0] : '';
    return { full, img };
  }

  RENDERERS.news = function () {
    const root = $('#view-news');
    if (!root) return;
    const cached = readCache();
    let items = cached ? cached.items : FALLBACK.slice();
    let updatedAt = cached ? cached.date : '(内置最新)';
    let loading = false;

    const cardHtml = (it, i) => `
      <article class="news-card" data-ni="${i}">
        <div class="news-card__imgwrap" style="position:relative;width:100%;height:150px;background:var(--pine-wash);display:flex;align-items:center;justify-content:center;overflow:hidden">
          <span style="position:absolute;font-size:2rem;color:var(--accent)">▤</span>
          ${it.img ? `<img class="news-card__img" src="${esc(it.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" style="position:relative;width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">` : ''}
        </div>
        <div class="news-card__body">
          <div class="news-card__src">${esc(it.column || it.source || 'ECNS')} · ${esc(it.source || '中新网英文')}</div>
          <div class="news-card__title">${esc(it.title)}</div>
          <div class="news-card__desc news-card__desc--clamp">${esc(it.desc || (it.full || '').slice(0, 180))}</div>
          <div class="news-card__meta">
            <span>${esc(timeAgo(it.date))}</span>
            <span style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="news-act" data-act="read" data-i="${i}" style="color:var(--accent)">读全文</button>
              <button class="news-act" data-act="copy" data-i="${i}" style="color:var(--ink-soft)">复制标题</button>
              <button class="news-act" data-act="open" data-i="${i}" style="color:var(--ink-soft)">网页原文↗</button>
            </span>
          </div>
        </div>
      </article>`;

    const render = () => {
      root.innerHTML = `
        <div class="card" style="border-left:3px solid var(--accent);margin-bottom:var(--sp-5)">
          <div class="card__label">Foreign Press · 外刊速览</div>
          <p style="font-family:var(--font-serif);margin:0;color:var(--ink-soft);line-height:1.8">
            来自<b>中新网英文 ECNS</b>的当日国际/科技/财经/文化报道，英文全文站内可读，配图为国内 CDN 直链，微信与电脑均可打开。
            <br><span style="font-size:.82rem;color:var(--ink-faint)">更新：${esc(updatedAt)} · 每日自动刷新 · 国内直连稳定</span>
          </p>
        </div>
        <div class="filter-bar">
          <span class="tag tag--pine">ECNS · 国际热点</span>
          <span class="tag">四六级 / 外刊阅读素材</span>
          <button class="btn btn--sm" id="newsRefresh">↻ 刷新最新</button>
        </div>
        ${loading ? '<div class="empty"><span class="empty__mark">◌</span><p>正在拉取中新网英文最新报道…（下方已有内容可先读）</p></div>' : ''}
        <div class="news-grid">${items.map(cardHtml).join('')}</div>
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
        }
      }));
    };

    function openReader(it) {
      const box = $('#newsReader');
      if (!box) return;
      const full = it.full || it.desc || '';
      // 按句分段，便于精读
      const sents = full.split(/(?<=[.!?])\s+/);
      const chunks = []; let buf = '';
      sents.forEach(p => { buf += (buf ? ' ' : '') + p; if (buf.length > 260) { chunks.push(buf); buf = ''; } });
      if (buf) chunks.push(buf);
      const bodyHtml = chunks.length
        ? chunks.map(p => `<p style="margin:0 0 var(--sp-3);text-indent:1.2em">${esc(p)}</p>`).join('')
        : `<p>${esc(full)}</p>`;
      box.innerHTML = `
        <div class="card" style="margin-top:var(--sp-5);border-left:3px solid var(--accent)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
            <div class="card__label">全文精读 · ${esc(it.column || it.source || 'ECNS')}</div>
            <button class="btn btn--sm" id="readerClose">关闭</button>
          </div>
          <h3 style="font-family:var(--font-serif);margin:var(--sp-3) 0;line-height:1.45">${esc(it.title)}</h3>
          ${it.img ? `<img src="${esc(it.img)}" referrerpolicy="no-referrer" alt="" onerror="this.style.display='none'" style="width:100%;max-height:300px;object-fit:cover;border-radius:10px;margin-bottom:var(--sp-3);background:var(--pine-wash)">` : ''}
          <div style="font-family:var(--font-serif);line-height:1.95;color:var(--ink-soft);font-size:1rem">
            ${bodyHtml}
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:var(--sp-4)">
            <button class="btn btn--sm" id="readerCopy">复制标题+链接</button>
            <button class="btn btn--sm btn--primary" id="readerOpen">网页原版 ↗</button>
          </div>
          <p style="font-family:var(--font-serif);font-size:.76rem;color:var(--ink-faint);margin:var(--sp-3) 0 0">
            来源中新网英文（ECNS），全文与配图均为国内直连，适合四六级与外刊精读积累。
          </p>
        </div>`;
      $('#readerClose')?.addEventListener('click', () => { box.innerHTML = ''; });
      $('#readerCopy')?.addEventListener('click', () => {
        const ok = copyText(it.title + (it.link ? '\n' + it.link : ''));
        window.__YANBIAN__.toast(ok ? '已复制标题与链接' : '复制失败，请长按选择');
      });
      $('#readerOpen')?.addEventListener('click', () => window.open(it.link, '_blank', 'noopener,noreferrer'));
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function fetchText(url, ms) {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), ms || 8000);
      return fetch(url, { signal: ctl.signal }).then(r => {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.text();
      }).finally(() => clearTimeout(t));
    }

    function load(force, done) {
      if (!force && cached) { if (done) done(); return; }
      loading = true; render();
      fetchText(RSS, 8000).then(xml => {
        const metas = parseRss(xml);
        if (!metas.length) throw new Error('empty rss');
        // 逐篇取全文（并发上限 6，单篇 6s 超时），失败则用 RSS 摘要兜底
        let idx = 0;
        const worker = async () => {
          while (idx < metas.length) {
            const it = metas[idx++];
            try {
              const htmlSrc = await fetchText(it.link, 6000);
              const parsed = parseArticle(htmlSrc);
              if (parsed.full.length > 200) { it.full = parsed.full; it.img = parsed.img; }
              else { it.full = it.desc; }
            } catch (e) { it.full = it.desc || it.full; }
          }
        };
        return Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]).then(() => metas);
      }).then(fresh => {
        fresh = fresh.filter(x => x.title && (x.full || x.desc));
        if (!fresh.length) throw new Error('empty');
        items = fresh; updatedAt = today(); loading = false; writeCache(items); render();
        if (done) done();
      }).catch(() => {
        loading = false;
        const c = readCache();
        items = c ? c.items : FALLBACK.slice();
        updatedAt = c ? c.date : '(内置最新)';
        render();
        if (done) done();
      });
    }

    render();
    load(false);
  };

  window.__registerNewsView = registerNewsView;
})();
