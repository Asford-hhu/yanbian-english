/* ============================================================
   砚边 · 英文音乐模块（独立渲染器）
   曲库来自 music-data.js（真实网易云歌曲ID + 官方封面）
   播放采用 Meting API 直连真实 MP3 + 页面原生 <audio controls>：

     首选主节点（可解析 VIP，返回完整版 6~14MB 原曲）：
       https://api.qijieya.cn/meting/?server=netease&type=url&id=<id>&br=320
     备用节点（部分无 VIP 权限，仅 30 秒试听，作兜底）：
       https://meting.jmstrand.cn/?server=netease&type=url&id=<id>
       https://api.injahow.cn/meting/?server=netease&type=url&id=<id>

   说明：旧版 injahow 节点对 VIP 歌曲只返回约 470KB 的 30 秒试听
   （jd-musicrep-ts 试听 CDN）；主节点 qijieya 走 jdymusic 完整曲库，
   实测 24 首全部返回 6~14MB 完整文件。点击时若主节点失败，播放器会
   自动依次切换到备用源。

   由用户点击原生播放键（手势内）触发，微信内置浏览器可正常出声。
   ============================================================ */
(function registerMusicView() {
  'use strict';
  const { $, $$, esc, RENDERERS } = window.__YANBIAN__;

  const MUSIC = window.YANBIAN_MUSIC || [];
  // 主节点在前：完整版；备用节点在后：可能只有试听，用于容灾
  const NODES = [
    (id) => 'https://api.qijieya.cn/meting/?server=netease&type=url&id=' + encodeURIComponent(id) + '&br=320',
    (id) => 'https://meting.jmstrand.cn/?server=netease&type=url&id=' + encodeURIComponent(id),
    (id) => 'https://api.injahow.cn/meting/?server=netease&type=url&id=' + encodeURIComponent(id),
  ];
  const audioUrl = (id, node) => NODES[node || 0](id);
  const coverUrl = (id) => 'https://api.qijieya.cn/meting/?server=netease&type=pic&id=' + encodeURIComponent(id) + '&cover=500';

  RENDERERS.music = function () {
    const root = $('#view-music');
    if (!root) return;
    let cat = '全部';
    let query = '';
    let current = null;
    let nodeIndex = 0;

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
      const cover = m.cover
        ? `<div class="music-card__cover-wrap" style="position:relative;aspect-ratio:1;background:var(--pine-wash);display:flex;align-items:center;justify-content:center">
             <span style="font-size:2.4rem;color:var(--accent);position:absolute">♫</span>
             <img class="music-card__cover" src="${esc(m.cover)}" alt="${esc(m.title)}" loading="lazy" referrerpolicy="no-referrer" style="position:relative;width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">
           </div>`
        : `<div class="music-card__cover" style="display:flex;align-items:center;justify-content:center;font-size:2.4rem;color:var(--accent);aspect-ratio:1;background:var(--pine-wash)">♫</div>`;
      const playing = current && String(current.id) === String(m.id);
      return `<div class="music-card">
        ${cover}
        <div class="music-card__body">
          <div class="music-card__title">${esc(m.title)}</div>
          <div class="music-card__artist">${esc(m.artist)}</div>
          <div class="music-card__foot">
            <span class="tag ${playing ? 'tag--accent' : ''}" style="font-size:.72rem;padding:2px 8px">${esc(m.cat)} · ${esc(m.en)}</span>
            <button class="music-card__play" data-mid="${m.id}">${playing ? '♫ 播放中' : '▶ 播放'}</button>
          </div>
        </div>
      </div>`;
    };

    const playerHtml = (m) => `
      <div class="music-player-bar" id="musicPlayerBar">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:10px">
          <strong style="font-family:var(--font-serif);font-size:.95rem">♫ ${esc(m.title)} — ${esc(m.artist)} <span class="tag tag--pine" style="margin-left:6px;font-size:.68rem">完整版</span></strong>
          <span style="display:flex;gap:8px;align-items:center">
            <button class="btn btn--sm" id="musicSwitch" title="当前线路播放失败时切换">↻ 换线路</button>
            <button class="btn btn--sm" id="musicClose">收起</button>
          </span>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <img src="${esc(m.cover || coverUrl(m.id))}" referrerpolicy="no-referrer" alt="" onerror="this.style.display='none'"
               style="width:56px;height:56px;object-fit:cover;border-radius:8px;background:var(--pine-wash);flex-shrink:0">
          <div style="flex:1;min-width:0">
            <audio id="musicAudio" controls preload="none" referrerpolicy="no-referrer" style="width:100%;height:42px" src="${esc(audioUrl(m.id, nodeIndex))}">
              你的浏览器不支持音频播放。
            </audio>
            <div style="font-family:var(--font-serif);font-size:.74rem;color:var(--ink-faint);margin-top:4px">
              完整版原曲，点播放键 ▶ 即可收听（约 3–6 分钟）。若卡住或只有 30 秒，点「↻ 换线路」；微信里没反应可点右上角「···」→ 在浏览器中打开。
            </div>
          </div>
        </div>
      </div>`;

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
            听歌是最不费力的语感训练。共 <b>${MUSIC.length}</b> 首流行英文歌，按风格分类，均为<b>完整版原曲</b>。点「▶ 播放」在下方用播放器收听，跟着唱、顺便记表达。
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
        const next = MUSIC.find(m => String(m.id) === b.dataset.mid);
        if (!next) return;
        const same = current && String(current.id) === String(next.id);
        current = next;
        if (!same) nodeIndex = 0;
        render(true);
        setTimeout(() => { const bar = $('#musicPlayerBar'); if (bar) bar.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 30);
      }));
      const close = $('#musicClose');
      if (close) close.addEventListener('click', () => { current = null; nodeIndex = 0; render(); });
      const sw = $('#musicSwitch');
      if (sw) sw.addEventListener('click', () => {
        nodeIndex = (nodeIndex + 1) % NODES.length;
        const audio = $('#musicAudio');
        if (audio && current) {
          audio.pause();
          audio.src = audioUrl(current.id, nodeIndex);
          audio.load();
          audio.play().catch(() => {});
          window.__YANBIAN__.toast(nodeIndex === 0 ? '已切换：完整版主线路' : '已切换：备用线路' + nodeIndex);
        }
      });
    };
    render();
  };

  window.__registerMusicView = registerMusicView;
  if (window.__YANBIAN__ && !window.__YANBIAN_MUSIC_READY__) {
    window.__YANBIAN_MUSIC_READY__ = true;
    registerMusicView();
    if (window.__YANBIAN__.refresh) window.__YANBIAN__.refresh();
  }
})();
