/* ============================================================
   砚边 · 英文音乐模块（独立渲染器）
   曲库来自 music-data.js（公有领域经典英文歌曲，本地自托管完整版 mp3）
   播放器使用页面原生 <audio controls>，由用户点击手势触发，微信内可正常出声。
   新增「歌词」独立入口：点卡片或播放器上的「歌词」打开站点风格弹窗，
   显示该文件对应的中英对照歌词（数据见 lyrics-data.js）。
   卡片、分类筛选、搜索、播放器条的视觉设计保持不变。
   ============================================================ */
(function registerMusicView() {
  'use strict';
  const { $, $$, esc, RENDERERS } = window.__YANBIAN__;

  const MUSIC = window.YANBIAN_MUSIC || [];
  const LYRICS = window.YANBIAN_LYRICS || {};

  // 用歌名生成一个稳定的渐变封面种子色，替代原外链封面（不联网、风格一致）
  const COVERS = {
    'amazing_grace': ['#6d5bd0', '#a78bfa'],
    'auld_lang_syne': ['#2f7d6b', '#5eead4'],
    'sweetheart': ['#b0568a', '#f0abfc'],
    'battle_hymn': ['#3f5b8c', '#93c5fd'],
    'john_brown': ['#7a5a2e', '#fcd34d'],
    'danny_boy': ['#2f6f4e', '#86efac'],
    'scarborough_fair': ['#4a6b7c', '#7dd3fc'],
    'swing_low': ['#6b4a7c', '#d8b4fe'],
    'oh_susanna': ['#8a6d2f', '#fde68a'],
    'old_folks': ['#3b6b6b', '#5eead4'],
    'camptown_races': ['#8c4a4a', '#fca5a5'],
    'yankee_doodle': ['#4a5b8c', '#a5b4fc'],
    'silent_night': ['#2b4a7c', '#93c5fd'],
    'jingle_bells': ['#8c3a3a', '#fca5a5'],
    'deck_the_halls': ['#2f6b4a', '#86efac'],
    'merry_christmas': ['#8c5a2f', '#fcd34d'],
    'joy_to_world': ['#6b4a8c', '#d8b4fe'],
    'twinkle': ['#4a6b8c', '#fde68a']
  };
  const coverStyle = (m) => {
    const c = COVERS[m.id] || ['#6d5bd0', '#a78bfa'];
    return `background:linear-gradient(135deg,${c[0]},${c[1]})`;
  };

  const audioSrc = (m) => m.file || ('audio/music/' + m.id + '.mp3');

  // 站点风格歌词弹窗（复用 .modal 样式，单例，不新增结构到 HTML）
  function ensureLyricModal() {
    let modal = document.getElementById('musicLyricModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'musicLyricModal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="modal__card music-lyric__card" role="dialog" aria-modal="true" aria-label="歌词">
        <button class="modal__close" id="musicLyricClose" aria-label="关闭">×</button>
        <div class="music-lyric__head">
          <h2 id="musicLyricTitle"></h2>
          <p class="modal__note" id="musicLyricSub"></p>
        </div>
        <div class="music-lyric__body" id="musicLyricBody"></div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeLyric(); });
    document.getElementById('musicLyricClose').addEventListener('click', closeLyric);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) closeLyric();
    });
    return modal;
  }
  function openLyric(m) {
    const modal = ensureLyricModal();
    const data = LYRICS[m.id];
    document.getElementById('musicLyricTitle').textContent = m.title;
    document.getElementById('musicLyricSub').textContent = `${m.artist} · ${m.cat} · ${data ? data.zh : ''}`;
    const body = document.getElementById('musicLyricBody');
    if (data && data.lines && data.lines.length) {
      body.innerHTML = data.lines.map(([en, zh]) =>
        `<div class="music-lyric__line"><div class="music-lyric__en">${esc(en)}</div><div class="music-lyric__zh">${esc(zh)}</div></div>`
      ).join('');
    } else {
      body.innerHTML = '<p class="modal__note">这首歌暂未收录歌词。</p>';
    }
    modal.hidden = false;
    body.scrollTop = 0;
  }
  function closeLyric() {
    const modal = document.getElementById('musicLyricModal');
    if (modal) modal.hidden = true;
  }

  RENDERERS.music = function () {
    const root = $('#view-music');
    if (!root) return;
    let cat = '全部';
    let query = '';
    let current = null;

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
      const playing = current && String(current.id) === String(m.id);
      return `<div class="music-card">
        <div class="music-card__cover-wrap" style="position:relative;aspect-ratio:1;${coverStyle(m)};display:flex;align-items:center;justify-content:center;overflow:hidden">
          <span style="font-size:2.4rem;color:rgba(255,255,255,.92);text-shadow:0 2px 12px rgba(0,0,0,.25)">♫</span>
          <button class="music-card__lyric" data-lyric="${esc(m.id)}" title="查看歌词">歌词</button>
        </div>
        <div class="music-card__body">
          <div class="music-card__title">${esc(m.title)}</div>
          <div class="music-card__artist">${esc(m.artist)}</div>
          <div class="music-card__foot">
            <span class="tag ${playing ? 'tag--accent' : ''}" style="font-size:.72rem;padding:2px 8px">${esc(m.cat)} · ${esc(m.en)}</span>
            <button class="music-card__play" data-mid="${esc(m.id)}">${playing ? '♫ 播放中' : '▶ 播放'}</button>
          </div>
        </div>
      </div>`;
    };

    const playerHtml = (m) => `
      <div class="music-player-bar" id="musicPlayerBar">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:10px">
          <strong style="font-family:var(--font-serif);font-size:.95rem">♫ ${esc(m.title)} — ${esc(m.artist)} <span class="tag tag--pine" style="margin-left:6px;font-size:.68rem">公有领域 · 完整版</span></strong>
          <span style="display:flex;gap:8px;align-items:center">
            <button class="btn btn--sm" id="musicLyricBtn">歌词</button>
            <button class="btn btn--sm" id="musicClose">收起</button>
          </span>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:56px;height:56px;border-radius:8px;flex-shrink:0;display:grid;place-items:center;color:#fff;font-size:1.4rem;${coverStyle(m)}">♫</div>
          <div style="flex:1;min-width:0">
            <audio id="musicAudio" controls preload="none" style="width:100%;height:42px" src="${esc(audioSrc(m))}">
              你的浏览器不支持音频播放。
            </audio>
            <div style="font-family:var(--font-serif);font-size:.74rem;color:var(--ink-faint);margin-top:4px">
              公有领域经典曲目，本地完整版，点播放键 ▶ 即可收听，无需联网外链或切换线路。
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
            听歌是最不费力的语感训练。共 <b>${MUSIC.length}</b> 首公有领域经典英文歌，按风格分类，均为<b>完整版原曲、本地播放</b>，不连外链、无需切换线路。点「▶ 播放」在下方收听，点卡片上的「歌词」对照中英歌词跟唱、顺便记表达。
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
        current = next;
        render(true);
        setTimeout(() => { const bar = $('#musicPlayerBar'); if (bar) bar.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 30);
      }));
      $$('[data-lyric]', root).forEach(b => b.addEventListener('click', () => {
        const next = MUSIC.find(m => String(m.id) === b.dataset.lyric);
        if (next) openLyric(next);
      }));
      const lyricBtn = $('#musicLyricBtn');
      if (lyricBtn && current) lyricBtn.addEventListener('click', () => openLyric(current));
      const close = $('#musicClose');
      if (close) close.addEventListener('click', () => {
        const audio = $('#musicAudio'); if (audio) { audio.pause(); audio.currentTime = 0; }
        current = null; render();
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
