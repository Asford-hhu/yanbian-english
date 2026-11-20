/* ============================================================
   砚边 · 外刊研习 v2（独立渲染器）
   ------------------------------------------------------------
   · 八分区：每日热点 / 科技与AI / 生态与环境 / 文化与社会 /
             经济与发展 / 健康与生活 / 双语精读 / 我的收藏
   · 每区内置 14-21 篇存量，离线秒开；每日确定性置顶 2-3 篇「今日上新」
   · 后台从 ECNS RSS 增量补充真实最新文章（失败静默，不影响内置）
   · 收藏使用独立 localStorage 键，分区更新 / 每日刷新都不会清掉
   · 移动端：每页 6 篇 + IntersectionObserver 续载 + 图片懒加载 + 转圈
   ★ 不改动朗读 / 搜索 / 筛选 / 文章单选 / 任何其他模块
   ============================================================ */
(function registerNewsView() {
  'use strict';
  const API = window.__YANBIAN__ || {};
  const $ = API.$, $$ = API.$$, esc = API.esc, RENDERERS = API.RENDERERS || {};
  const toast = API.toast || function () {};

  const DATA = window.YANBIAN_NEWS_V2 || { categories: [], articles: [] };
  const CATS = DATA.categories || [];
  const ALL = DATA.articles || [];

  const FAV_KEY = 'yansbian_news_fav_v1';
  const EXTRA_KEY = 'yansbian_news_extra_v1';
  const PAGE = 6;
  const RSS = 'https://www.ecns.cn/rss/rss.xml';
  const dayId = () => Math.floor(Date.now() / 86400000);

  const LEVELS = { CET4: '四级', CET6: '六级', CONTEST: '大英赛' };
  const KW = {
    tech: /ai\b|artificial intelligence|technology|digital|chip|robot|space|science|algorithm|quantum|semiconductor|innovation/i,
    eco: /climate|environment|green|carbon|ecology|wildlife|pollution|emission|biodiversity|sustainable|renewable/i,
    culture: /culture|art\b|museum|festival|heritage|society|education|youth|travel|history|literature|language/i,
    econ: /economy|economic|business|trade|market|invest|finance|development|industry|export|growth|company/i,
    health: /health|medical|medicine|psychology|psychological|mental|diet|exercise|wellbeing|disease|sleep|study finds/i,
    bilingual: /bilingual|translation|english learning|language point|点津/i
  };

  /* ---------- 基础工具 ---------- */
  function parse(s, fb) { try { const v = JSON.parse(s); return v == null ? fb : v; } catch (e) { return fb; } }
  function readFav() { try { return parse(localStorage.getItem(FAV_KEY), []); } catch (e) { return []; } }
  function writeFav(a) { try { localStorage.setItem(FAV_KEY, JSON.stringify(a)); } catch (e) {} }
  function readExtra() {
    try { const d = parse(localStorage.getItem(EXTRA_KEY), null); if (d && d.day === dayId() && Array.isArray(d.items)) return d.items; } catch (e) {}
    return null;
  }
  function writeExtra(items) { try { localStorage.setItem(EXTRA_KEY, JSON.stringify({ day: dayId(), items })); } catch (e) {} }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h >>> 0); }
  function decode(s) { return (s || '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'); }
  function strip(s) { return decode((s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim(); }
  function cdata(s) { const m = (s || '').match(/<!\[CDATA\[([\s\S]*?)\]\]>/); return decode((m ? m[1] : s || '').trim()); }
  function clampDate(s) { return (s || '').slice(0, 10); }
  function levelOf(a) { return LEVELS[a.level] || '六级'; }

  /* ---------- 今日上新：按日期确定性选出每区 3 篇 ---------- */
  function todayPicks(catId) {
    const pool = ALL.filter(a => a.cat === catId);
    if (pool.length < 4) return [];
    const d = dayId();
    return pool.map(a => ({ id: a.id, k: hash(a.id + '#' + d) }))
      .sort((x, y) => x.k - y.k).slice(0, 3).map(x => x.id);
  }

  function catOf(text) {
    for (const k in KW) if (KW[k].test(text)) return k;
    return 'daily';
  }

  /* ---------- 状态 ---------- */
  let state = { cat: (CATS[0] && CATS[0].id) || 'daily', page: 1 };
  let extras = readExtra() || [];
  let observer = null;
  let busy = false;

  function pool(catId) {
    if (catId === '__fav') {
      const fav = readFav();
      return fav.map(id => ALL.concat(extras).find(a => a.id === id)).filter(Boolean);
    }
    const built = ALL.filter(a => a.cat === catId);
    const fresh = extras.filter(a => a.cat === catId && !built.some(b => b.link === a.link));
    const picks = todayPicks(catId);
    const sorted = built.slice().sort((a, b) => {
      const pa = picks.indexOf(a.id), pb = picks.indexOf(b.id);
      if (pa !== -1 && pb !== -1) return pa - pb;
      if (pa !== -1) return -1;
      if (pb !== -1) return 1;
      return 0;
    });
    return fresh.concat(sorted);
  }

  function cardHtml(a, i) {
    const fav = readFav().indexOf(a.id) !== -1;
    const isNew = a.id.indexOf('x-') === 0 || todayPicks(a.cat).indexOf(a.id) !== -1;
    const imgs = (a.images || []).slice(0, 3);
    const cover = imgs[0] || '';
    return `
      <article class="n2-card" data-i="${i}">
        <div class="n2-card__media">
          <div class="n2-card__ph" aria-hidden="true">▤</div>
          ${cover ? `<img src="${esc(cover)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.style.display='none'">` : ''}
          <span class="n2-card__level">${esc(levelOf(a))}</span>
          ${isNew ? '<span class="n2-card__new">今日上新</span>' : ''}
          <button class="n2-card__fav ${fav ? 'is-fav' : ''}" data-act="fav" data-i="${i}" title="收藏" aria-label="收藏">${fav ? '★' : '☆'}</button>
        </div>
        <div class="n2-card__body">
          <div class="n2-card__src">${esc(a.source || 'Official source')}${a.date ? ' · ' + esc(clampDate(a.date)) : ''}${a.words ? ' · ' + a.words + ' 词' : ''}</div>
          <h3 class="n2-card__title">${esc(a.title)}</h3>
          ${a.titleZh ? `<div class="n2-card__zh">${esc(a.titleZh)}</div>` : ''}
          <p class="n2-card__desc">${esc(a.desc || (a.full || '').slice(0, 180))}</p>
          <div class="n2-card__acts">
            <button class="n2-act n2-act--primary" data-act="read" data-i="${i}">全文精读</button>
            ${a.link ? `<button class="n2-act" data-act="open" data-i="${i}">原站↗</button>` : ''}
          </div>
        </div>
      </article>`;
  }

  function shell() {
    const tabs = CATS.map(c => `<button class="filter-chip ${c.id === state.cat ? 'is-active' : ''}" data-cat="${esc(c.id)}"><span class="n2-tab__icon">${esc(c.icon || '·')}</span>${esc(c.name)}</button>`).join('')
      + `<button class="filter-chip ${state.cat === '__fav' ? 'is-active' : ''}" data-cat="__fav"><span class="n2-tab__icon">★</span>我的收藏</button>`;
    return `
      <div class="n2">
        <div class="card n2-hero">
          <div class="card__label">Foreign Press · 外刊研习</div>
          <p>按主题精读国内官方英文源的真实报道。<b>七个主题分区 + 我的收藏</b>，每区常驻 ${ALL.length ? '14–21' : '若干'} 篇，每日上新 2–3 篇；收藏独立保存，不会被刷新冲掉。</p>
          <div class="n2-hero__meta"><span>图文相符 · 每篇 2–3 幅国内 CDN 高清图</span><span>四级 / 六级 / 大英赛分级</span><span>手机端分页续载</span></div>
        </div>
        <div class="filter-bar n2-tabs">${tabs}</div>
        <div class="n2-count" id="n2Count"></div>
        <div class="n2-spinner" id="n2Spinner" hidden><span class="n2-spinner__ring"></span><span>正在加载更多…</span></div>
        <div class="news-grid n2-grid" id="n2Grid"></div>
        <div class="n2-sentinel" id="n2Sentinel"></div>
        <div id="n2Reader"></div>
      </div>`;
  }

  function currentList() { return pool(state.cat); }

  function paintGrid() {
    const root = $('#view-news');
    if (!root) return;
    const list = currentList();
    const shown = list.slice(0, state.page * PAGE);
    const grid = $('#n2Grid', root);
    if (!grid) return;
    grid.innerHTML = shown.map(cardHtml).join('');
    const cnt = $('#n2Count', root);
    if (cnt) cnt.innerHTML = `本篇区共 <b>${list.length}</b> 篇 · 已显示 ${shown.length} 篇${state.cat === '__fav' ? ' · 收藏不会因更新丢失' : ''}`;
    bindCards();
    setupObserver();
  }

  function appendGrid() {
    const root = $('#view-news');
    const grid = $('#n2Grid', root);
    if (!grid) return;
    const list = currentList();
    const start = shownCount();
    const more = list.slice(start, start + PAGE);
    if (!more.length) { if (observer) observer.disconnect(); return; }
    grid.insertAdjacentHTML('beforeend', more.map((a) => cardHtml(a, start + more.indexOf(a))).join(''));
    const cnt = $('#n2Count', root);
    if (cnt) cnt.innerHTML = `本篇区共 <b>${list.length}</b> 篇 · 已显示 ${Math.min(start + PAGE, list.length)} 篇`;
    bindCards();
  }

  function shownCount() { const g = $('#n2Grid'); return g ? g.querySelectorAll('.n2-card').length : 0; }

  function setupObserver() {
    if (observer) { observer.disconnect(); observer = null; }
    const el = $('#n2Sentinel');
    if (!el || !window.IntersectionObserver) return;
    observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting || busy) return;
      const list = currentList();
      if (shownCount() >= list.length) return;
      busy = true;
      const sp = $('#n2Spinner');
      if (sp) sp.hidden = false;
      setTimeout(() => { state.page++; appendGrid(); busy = false; if (sp) sp.hidden = true; }, 260);
    }, { rootMargin: '240px' });
    observer.observe(el);
  }

  function bindCards() {
    const root = $('#view-news');
    $$('.n2-card [data-act]', root || document).forEach(b => {
      if (b.__n2bound) return;
      b.__n2bound = true;
      b.addEventListener('click', () => {
        const a = currentList()[+b.dataset.i];
        if (!a) return;
        if (b.dataset.act === 'fav') {
          const f = readFav(), k = f.indexOf(a.id);
          if (k >= 0) { f.splice(k, 1); toast('已取消收藏'); } else { f.push(a.id); toast('已收藏到外刊收藏夹'); }
          writeFav(f);
          if (state.cat === '__fav') { state.page = 1; paintGrid(); }
          else { const btn = b; btn.classList.toggle('is-fav'); btn.textContent = btn.classList.contains('is-fav') ? '★' : '☆'; }
        } else if (b.dataset.act === 'read') openReader(a);
        else if (b.dataset.act === 'open' && a.link) window.open(a.link, '_blank', 'noopener,noreferrer');
      });
    });
  }

  function gallery(a) {
    const imgs = (a.images || []).slice(0, 3).filter(Boolean);
    if (!imgs.length) return '';
    return `<div class="n2-gallery">${imgs.map((u, i) => `<figure class="n2-gallery__item"><img src="${esc(u)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-full="${esc(u)}" onerror="this.closest('figure').style.display='none'"><figcaption>配图 ${i + 1} / ${imgs.length}</figcaption></figure>`).join('')}</div>`;
  }

  function openReader(a) {
    const box = $('#n2Reader');
    if (!box) return;
    const fav = readFav().indexOf(a.id) !== -1;
    const full = a.full || a.desc || '';
    const paras = full.split(/\n+/).filter(p => p.trim().length > 30);
    const body = paras.length ? paras.map(p => `<p>${esc(p.trim())}</p>`).join('') : `<p>${esc(full)}</p>`;
    box.innerHTML = `
      <div class="card n2-reader">
        <div class="n2-reader__top">
          <div class="card__label">全文精读 · ${esc(levelOf(a))} · ${esc(a.source || '')}</div>
          <button class="btn btn--sm" data-r="close">关闭</button>
        </div>
        <h2 class="n2-reader__title">${esc(a.title)}</h2>
        ${a.titleZh ? `<div class="n2-reader__zh">${esc(a.titleZh)}</div>` : ''}
        <div class="n2-reader__meta">${a.date ? esc(clampDate(a.date)) + ' · ' : ''}${a.words ? a.words + ' 词 · ' : ''}约 ${Math.max(1, Math.round(full.length / 1300))} 分钟</div>
        ${gallery(a)}
        <div class="n2-reader__body">${body}</div>
        ${a.zh ? `<div class="n2-reader__trans"><div class="card__label">参考译文 / 双语精读</div><p>${esc(a.zh)}</p></div>` : ''}
        <div class="n2-reader__acts">
          <button class="btn btn--sm" data-r="fav">${fav ? '★ 已收藏' : '☆ 收藏这篇'}</button>
          <button class="btn btn--sm" data-r="copy">复制标题+链接</button>
          ${a.link ? '<button class="btn btn--sm btn--primary" data-r="open">阅读原版 ↗</button>' : ''}
        </div>
      </div>`;
    $$('[data-r]', box).forEach(b => b.addEventListener('click', () => {
      const act = b.dataset.r;
      if (act === 'close') { box.innerHTML = ''; return; }
      if (act === 'fav') {
        const f = readFav(), k = f.indexOf(a.id);
        if (k >= 0) { f.splice(k, 1); toast('已取消收藏'); } else { f.push(a.id); toast('已收藏到外刊收藏夹'); }
        writeFav(f); b.textContent = k >= 0 ? '☆ 收藏这篇' : '★ 已收藏';
      }
      if (act === 'copy') {
        let ok = false;
        try { if (navigator.clipboard) { navigator.clipboard.writeText(a.title + (a.link ? '\n' + a.link : '')); ok = true; } } catch (e) {}
        if (!ok) { const t = document.createElement('textarea'); t.value = a.title + '\n' + (a.link || ''); document.body.appendChild(t); t.select(); try { ok = document.execCommand('copy'); } catch (e) {} document.body.removeChild(t); }
        toast(ok ? '已复制标题与链接' : '复制失败，请长按选择');
      }
      if (act === 'open' && a.link) window.open(a.link, '_blank', 'noopener,noreferrer');
    }));
    $$('.n2-gallery img', box).forEach(img => img.addEventListener('click', () => lightbox(img.dataset.full)));
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function lightbox(url) {
    let mask = document.querySelector('.n2-lightbox');
    if (!mask) { mask = document.createElement('div'); mask.className = 'n2-lightbox'; document.body.appendChild(mask); }
    mask.innerHTML = `<button class="n2-lightbox__close" aria-label="关闭">×</button><img src="${esc(url)}" alt="外刊配图大图">`;
    mask.hidden = false;
    const close = () => { mask.hidden = true; mask.innerHTML = ''; };
    mask.querySelector('.n2-lightbox__close').addEventListener('click', close);
    mask.addEventListener('click', e => { if (e.target === mask) close(); });
  }

  function fetchText(url, ms) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms || 6000);
    return fetch(url, { signal: ctl.signal }).then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.text(); }).finally(() => clearTimeout(t));
  }

  /* ---------- 后台增量：ECNS RSS 最新文章，失败静默 ---------- */
  function loadFresh() {
    if (readExtra()) return;
    fetchText(RSS, 7000).then(xml => {
      const blocks = (xml.match(/<item>[\s\S]*?<\/item>/g) || []).slice(0, 24);
      const metas = [];
      for (const b of blocks) {
        const g = t => { const m = b.match(new RegExp('<' + t + '[^>]*>([\\s\\S]*?)</' + t + '>', 'i')); return m ? m[1] : ''; };
        const title = cdata(g('title')), link = strip(g('link')).replace(/^http:/, 'https:');
        if (!title || !link || /\/video\//i.test(link)) continue;
        const rawDesc = g('description');
        metas.push({ title, link, rawDesc, desc: strip(rawDesc), date: strip(g('pubDate')), column: strip(g('column')) || 'Ecns wire' });
      }
      const use = metas.slice(0, 18);
      const out = [];
      let idx = 0;
      const worker = async () => {
        while (idx < use.length) {
          const m = use[idx++];
          let full = m.desc, images = [];
          try {
            const html = await fetchText(m.link, 5000);
            const ps = (html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || []).map(p => strip(p)).filter(t => t.length > 55 && /[a-zA-Z]{3}/.test(t));
            if (ps.length) full = ps.join('\n');
            images = [...new Set((html.match(/\/\/image\.cns\.com\.cn\/ecns_editor\/transform\/[^"'\s]+\.(?:jpg|jpeg|png)/gi) || []).map(u => 'https:' + u))].slice(0, 3);
          } catch (e) {}
          if (!images.length) { const cand = g0(m.rawDesc || m.desc); if (cand) images = [cand]; }
          const cat = catOf(m.title + ' ' + m.desc);
          out.push({ id: 'x-' + hash(m.link), cat, title: m.title, titleZh: '', desc: m.desc, full, images, source: 'ECNS 中新网英文', link: m.link, date: m.date, level: 'CET6', words: Math.round(full.split(/\s+/).length) });
        }
      };
      return Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]).then(() => out);
    }).then(items => {
      extras = items.filter(x => x.title);
      writeExtra(extras);
      const sp = $('#n2Spinner');
      if (sp) { sp.hidden = false; sp.lastElementChild.textContent = `今日新增 ${extras.length} 篇，正在更新…`; }
      setTimeout(() => { state.page = 1; paintGrid(); if (sp) sp.hidden = true; const c = $('#n2Count'); if (c) c.insertAdjacentHTML('beforeend', ' <span class="n2-fresh">· 已同步今日最新</span>'); }, 400);
    }).catch(() => {});
  }

  function g0(desc) {
    const m = (desc || '').match(/(?:https?:)?\/\/[^"'\s<>]+\.(?:jpg|jpeg|png)/i);
    if (!m) return '';
    return m[0].indexOf('http') === 0 ? m[0].replace(/^http:/, 'https:') : 'https:' + m[0];
  }

  RENDERERS.news = function () {
    const root = $('#view-news');
    if (!root) return;
    if (observer) { observer.disconnect(); observer = null; }
    state = { cat: (CATS[0] && CATS[0].id) || 'daily', page: 1 };
    root.innerHTML = shell();
    $$('[data-cat]', root).forEach(b => b.addEventListener('click', () => {
      $$('[data-cat]', root).forEach(x => x.classList.remove('is-active'));
      b.classList.add('is-active');
      state.cat = b.dataset.cat; state.page = 1;
      $('#n2Reader').innerHTML = '';
      paintGrid();
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    paintGrid();
    setTimeout(loadFresh, 350);
  };

  window.__registerNewsView = registerNewsView;
})();
