/* ============================================================
   砚边 · 英文音乐模块（独立渲染器）
   曲库来自 music-data.js（真实网易云歌曲ID + 官方封面）
   播放采用网易云外链播放器 iframe：点卡片「▶ 播放」后在底部
   常驻播放器加载对应歌曲，微信/网页均可点播放键收听。
   ============================================================ */
(function registerMusicView() {
  'use strict';
  const { $, $$, esc, RENDERERS } = window.__YANBIAN__;

  const MUSIC = window.YANBIAN_MUSIC || [];

  RENDERERS.music = function () {
    const root = $('#view-music');
    if (!root) return;
    let cat = '全部';
    let query = '';
    let current = null; // 当前歌曲

    const cats = ['全部', ...Array.from(new Set(MUSIC.map(m => m.cat)))];

    const list = () => {
      const q = query.trim().toLowerCase();
      return MUSIC.filter(m => {
        if (cat !== '全部' && m.cat !== cat) return false;
        if (q && !(m.title.toLowerCase().includes(q) || m.artist.toLowerCase().includes(q))) return false;
        return true;
      });
    };

    const cardHtml = (m) => {
      const ph = `<div class="music-card__cover" style="display:flex;align-items:center;justify-content:center;font-size:2.4rem;color:var(--accent)">♫</div>`;
      const cover = m.cover
        ? `<div class="music-card__cover-wrap" style="position:relative;aspect-ratio:1;background:var(--pine-wash);display:flex;align-items:center;justify-content:center">
             <span style="font-size:2.4rem;color:var(--accent);position:absolute">♫</span>
             <img class="music-card__cover" src="${esc(m.cover)}" alt="${esc(m.title)}" loading="lazy" referrerpolicy="no-referrer" style="position:relative;width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">
           </div>`
        : ph;
      const playing = current && current.id === m.id;
      return `<div class="music-card">
        ${cover}
        <div class="music-card__body">
          <div class="music-card__title">${esc(m.title)}</div>
          <div class="music-card__artist">${esc(m.artist)}</div>
          <div class="music-card__foot">
            <span class="tag ${playing ? 'tag--accent' : ''}" style="font-size:.72rem;padding:2px 8px">${esc(m.cat)} · ${esc(m.en)}</span>
            <button class="music-card__play" data-mid="${m.id}">${playing ? '▶ 播放中' : '▶ 播放'}</button>
          </div>
        </div>
      </div>`;
    };

    const playerHtml = (m) => {
      if (!m) return '';
      const src = `https://music.163.com/outchain/player?type=2&id=${m.id}&auto=0&height=66`;
      return `<div class="music-player-bar" id="musicPlayerBar">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:10px">
          <strong style="font-family:var(--font-serif)">正在播放：${esc(m.title)} — ${esc(m.artist)}</strong>
          <button class="btn btn--sm" id="musicClose">收起</button>
        </div>
        <iframe id="musicFrame" src="${src}" frameborder="0" scrolling="no" title="音乐播放器" referrerpolicy="no-referrer"></iframe>
        <div style="font-family:var(--font-serif);font-size:.76rem;color:var(--ink-faint);margin-top:6px">
          小提示：点播放器里的播放键 ▶ 即可收听；若微信内被拦截，点右上角「···」→ 在浏览器中打开。
        </div>
      </div>`;
    };

    const render = (keepFocus) => {
      const items = list();
      const chips = cats.map(c => `<button class="filter-chip ${c === cat ? 'is-active' : ''}" data-mcat="${esc(c)}">${esc(c)}</button>`).join('');
      const cards = items.length
        ? items.map(cardHtml).join('')
        : `<div class="empty"><span class="empty__mark">∅</span><p>没有找到匹配的歌曲，换个关键词试试。</p></div>`;
      root.innerHTML = `
        <div class="card" style="border-left:3px solid var(--accent);margin-bottom:var(--sp-5)">
          <div class="card__label">English Music · 英文磨耳朵</div>
          <p style="font-family:var(--font-serif);margin:0;color:var(--ink-soft);line-height:1.8">
            听歌是最不费力的语感训练。共 <b>${MUSIC.length}</b> 首流行英文歌，按风格分类。点「▶ 播放」在底部打开播放器，跟着唱、顺便记表达。
          </p>
        </div>
        <div class="filter-bar">${chips}</div>
        <div class="vocab-search">
          <input type="search" id="music-q" placeholder="搜歌名或歌手…" value="${esc(query)}" autocomplete="off">
          <span class="vocab-count">找到 ${items.length} 首</span>
        </div>
        <div class="music-grid">${cards}</div>
        ${current ? playerHtml(current) : ''}
      `;
      $$('[data-mcat]', root).forEach(b => b.addEventListener('click', () => { cat = b.dataset.mcat; query = ''; render(); }));
      const input = $('#music-q', root);
      if (input) {
        input.addEventListener('input', e => { query = e.target.value; render(true); });
        if (keepFocus) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
      }
      $$('[data-mid]', root).forEach(b => b.addEventListener('click', () => {
        current = MUSIC.find(m => String(m.id) === b.dataset.mid) || current;
        const wasAtPlayer = $('#musicPlayerBar');
        render(true);
        setTimeout(() => { const bar = $('#musicPlayerBar'); if (bar) bar.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 30);
      }));
      const close = $('#musicClose');
      if (close) close.addEventListener('click', () => { current = null; render(); });
    };
    render();
  };

  window.__registerMusicView = registerMusicView;
})();
