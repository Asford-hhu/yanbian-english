/* ============================================================
   砚边 · 后半模块渲染器
   词汇 / 听说 / 错题本 / 模考计时 / 进度 / 资源导航
   由 app.js 的 init() 调用 window.__registerLateRenderers() 挂载
   ============================================================ */

(function registerLateRenderers() {
  'use strict';
  const { $, $$, esc, DATA, toast, speak, speakWord, addMistake, navigate } = window.__YANBIAN__;
  const R = window.__YANBIAN__.RENDERERS;
  const getS = () => window.__YANBIAN__.getS();
  const save = () => window.__YANBIAN__.save();

  /* ---------- 词汇：完整四六级词库（音标/英美音/词形/短语 + 语境例句） ---------- */
  // 合并原精讲词 + 完整四六级词库 + 旧1500词库，按单词去重（精讲词优先，保留其精心撰写的 tip）
  const VOCAB_ALL = (function buildVocab() {
    const seen = new Set();
    const merged = [];
    const push = (v) => {
      const k = String(v.word || '').toLowerCase();
      if (!k || seen.has(k)) return;
      seen.add(k); merged.push(v);
    };
    (DATA.vocab || []).forEach(v => push(Object.assign({ level: '精讲' }, v)));
    (window.YANBIAN_CET_VOCAB || []).forEach(v => push(v));
    (window.YANBIAN_VOCAB_1500 || []).forEach(v => push(v));
    return merged;
  })();

  R.vocab = function () {
    const root = $('#view-vocab');
    const S = getS();
    const PAGE = 24;
    let filter = 'all';       // all | saved | 四级 | 六级 | 精讲
    let query = '';
    let shown = PAGE;

    const matches = () => {
      const q = query.trim().toLowerCase();
      return VOCAB_ALL.filter(v => {
        if (filter === 'saved' && !S.vocabSaved.includes(v.word)) return false;
        if ((filter === '四级' || filter === '六级' || filter === '精讲') && v.level !== filter) return false;
        if (q && !(v.word.toLowerCase().includes(q) || (v.meaning || '').includes(q) || (v.sentence || '').toLowerCase().includes(q))) return false;
        return true;
      });
    };

    const cardHtml = (v) => {
      const saved = S.vocabSaved.includes(v.word);
      const lvl = v.level === '精讲' ? '<span class="tag tag--accent">精讲</span>'
        : v.level === '六级' ? '<span class="tag tag--pine">六级</span>'
        : v.level === '四级' ? '<span class="tag">四级</span>' : '';
      const phonetic = v.phonetic ? `<span class="word-card__phonetic">/${esc(v.phonetic)}/</span>` : '';
      const forms = (v.forms && v.forms.length)
        ? `<div class="word-card__extra"><b>词形</b> ${v.forms.map(f => `${esc(f.label)} <i>${esc(f.word)}</i>`).join(' · ')}</div>` : '';
      const phrases = (v.phrases && v.phrases.length)
        ? `<div class="word-card__extra"><b>短语</b> ${v.phrases.map(p => `${esc(p.en)}（${esc(p.zh)}）`).join('；')}</div>` : '';
      const sentence = v.sentence ? `<p class="word-card__sentence">${highlightWord(v.sentence, v.word)}</p>` : '';
      const tip = v.tip ? `<div style="font-family:var(--font-serif);font-size:.8rem;color:var(--ink-faint);margin-top:var(--sp-2)">✎ ${esc(v.tip)}</div>` : '';
      return `<div class="card card--hover word-card">
        <div class="word-card__head">
          <div><span class="word-card__word">${esc(v.word)}</span>${phonetic}${v.pos ? `<span class="word-card__pos">${esc(v.pos)}</span>` : ''}${lvl}</div>
          <div class="word-card__pron">
            <button class="pron-btn" data-word="${esc(v.word)}" data-accent="us" title="美音">美 ▶</button>
            <button class="pron-btn" data-word="${esc(v.word)}" data-accent="uk" title="英音">英 ▶</button>
          </div>
        </div>
        <div class="word-card__meaning">释义：${esc(v.meaning)}</div>
        ${forms}${phrases}${sentence}${tip}
        <div class="word-card__actions">
          ${v.sentence ? `<button class="speak-btn" data-speak="${esc(v.sentence)}"><svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15 9a4 4 0 0 1 0 6"/></svg>读例句</button>` : ''}
          <button class="btn btn--sm ${saved ? 'btn--pine' : ''}" data-save="${esc(v.word)}">${saved ? '✓ 已在生词本' : '+ 生词本'}</button>
        </div>
      </div>`;
    };

    const render = (keepFocus) => {
      const list = matches();
      const slice = list.slice(0, shown);
      const cards = slice.length ? slice.map(cardHtml).join('')
        : `<div class="empty"><span class="empty__mark">∅</span><p>${filter === 'saved' ? '生词本还是空的，遇到好词点「+ 生词本」吧。' : '没有找到匹配的词，换个关键词试试。'}</p></div>`;
      const moreBtn = list.length > shown
        ? `<div class="load-more"><button class="btn btn--outline" id="vocab-more">加载更多 · 还有 ${(list.length - shown)} 个</button></div>` : '';
      const chips = [['all', '全部'], ['saved', '生词本'], ['四级', '四级'], ['六级', '六级'], ['精讲', '精讲']]
        .map(([k, label]) => {
          let n = VOCAB_ALL.length;
          if (k === 'saved') n = S.vocabSaved.length;
          else if (k !== 'all') n = VOCAB_ALL.filter(v => v.level === k).length;
          return `<button class="filter-chip ${filter === k ? 'is-active' : ''}" data-fav="${k}">${label}${n ? ' (' + n + ')' : ''}</button>`;
        }).join('');
      root.innerHTML = `
        <div class="filter-bar">${chips}</div>
        <div class="vocab-search">
          <input type="search" id="vocab-q" placeholder="搜单词、释义…共 ${VOCAB_ALL.length} 词" value="${esc(query)}" autocomplete="off">
          <span class="vocab-count">找到 ${list.length} 个词</span>
        </div>
        <div class="grid grid--2">${cards}</div>
        ${moreBtn}
      `;
      $$('.filter-chip', root).forEach(b => b.addEventListener('click', () => { filter = b.dataset.fav; query = ''; shown = PAGE; render(); }));
      const input = $('#vocab-q', root);
      if (input) {
        input.addEventListener('input', (e) => { query = e.target.value; shown = PAGE; render(true); });
        if (keepFocus) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
      }
      const more = $('#vocab-more', root);
      if (more) more.addEventListener('click', () => { shown += PAGE; render(); });
      $$('[data-speak]', root).forEach(b => b.addEventListener('click', () => speak(b.dataset.speak)));
      $$('.pron-btn', root).forEach(b => b.addEventListener('click', () => speakWord(b.dataset.word, b.dataset.accent)));
      $$('[data-save]', root).forEach(b => b.addEventListener('click', () => {
        const w = b.dataset.save;
        if (S.vocabSaved.includes(w)) { S.vocabSaved = S.vocabSaved.filter(x => x !== w); toast('已从生词本移除'); }
        else { S.vocabSaved.push(w); toast('已加入生词本'); }
        save(); render(true);
      }));
    };
    render();
  };
  function highlightWord(sentence, word) {
    const base = word.replace(/[aeiou]$/i, '');
    const re = new RegExp('(' + base + '\\w*)', 'gi');
    return esc(sentence).replace(re, '<span class="hl">$1</span>');
  }

  /* ---------- 听说训练（按难/中/易分类） ---------- */
  let listenRate = 0.95;
  // 难度映射：结合场景与文本长度人工分级
  const LISTEN_DIFF = {
    l1:'易',l2:'中',l3:'易',l4:'中',l5:'中',l6:'难',l7:'中',l8:'易',
    l9:'易',l10:'易',l11:'中',l12:'易',l13:'易',l14:'中',l15:'难',
    l16:'中',l17:'易',l18:'中',l19:'中',l20:'中',l21:'中',l22:'中',l23:'难'
  };
  const getDiff = (l) => LISTEN_DIFF[l.id] || (l.text.length > 480 ? '难' : l.text.length > 420 ? '中' : '易');
  const DIFF_CLS = { '易':'tag--pine', '中':'tag', '难':'tag--accent' };

  R.listening = function () {
    const root = $('#view-listening');
    const S = getS();
    let diffFilter = '全部';
    const visibleList = () => diffFilter === '全部' ? DATA.listening : DATA.listening.filter(l => getDiff(l) === diffFilter);
    let cur = DATA.listening[0];
    let revealed = false;
    const render = () => {
      const list = visibleList();
      if (list.length && !list.includes(cur)) cur = list[0];
      const diffChips = ['全部','易','中','难'].map(d => `<button class="filter-chip ${d === diffFilter ? 'is-active' : ''}" data-ldiff="${d}">${d === '全部' ? '全部' : d}</button>`).join('');
      const blanksHtml = cur.blanks.map((b, i) => {
        const key = `${cur.id}-b${i}`;
        const val = S.practice.listening[key]?.chosen || '';
        const ans = b.answer;
        const done = S.practice.listening[key];
        return `<div class="question">
          <div class="question__q">${i + 1}. ${esc(b.sent)}</div>
          <input class="blank-input" data-key="${key}" data-answer="${esc(ans)}" value="${esc(val)}" placeholder="听后填空"
            style="font-family:var(--font-serif);padding:8px 12px;border:1px solid var(--rule-strong);border-radius:var(--radius);background:var(--paper);width:min(280px,100%)">
          ${done ? `<span style="font-family:var(--font-serif);font-size:.85rem;margin-left:10px;color:${done.correct ? 'var(--success)' : 'var(--danger)'}">${done.correct ? '✓ 正确' : '✗ 正确答案：' + esc(ans)}</span>` : ''}
        </div>`;
      }).join('');
      root.innerHTML = `
        <div class="filter-bar">
          <span style="font-family:var(--font-serif);font-size:.9rem;color:var(--ink-soft)">按难度查找：</span>
          ${diffChips}
          <span class="tag tag--pine">共 ${list.length} 篇</span>
        </div>
        <div class="filter-bar">
          ${list.map(l => `<button class="filter-chip ${l.id === cur.id ? 'is-active' : ''}" data-l="${DATA.listening.indexOf(l)}"><span class="tag ${DIFF_CLS[getDiff(l)]}" style="margin-right:5px;padding:1px 6px;font-size:.7rem">${getDiff(l)}</span>${esc(l.title)}</button>`).join('')}
        </div>
        <div class="listen-panel">
          <div class="listen-panel__top">
            <button class="listen-play" id="playBtn" aria-label="播放"><svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7z"/></svg></button>
            <div class="listen-panel__hint"><span class="tag ${DIFF_CLS[getDiff(cur)]}" style="padding:1px 7px;font-size:.72rem;margin-right:6px">${getDiff(cur)}</span>${esc(cur.level)} · 点击播放，可反复听；速速调至 0.8× 练辨音</div>
            <div class="speed-row">${[0.8, 0.95, 1.1].map(r => `<button class="${r === listenRate ? 'is-active' : ''}" data-rate="${r}">${r}×</button>`).join('')}</div>
          </div>
          <div class="transcript">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-3);gap:var(--sp-3);flex-wrap:wrap">
              <strong style="font-family:var(--font-serif)">${esc(cur.title)}</strong>
              <button class="btn btn--sm" id="toggleTranscript">${revealed ? '隐藏原文' : '显示原文'}</button>
            </div>
            <div id="transcriptText" style="${revealed ? '' : 'filter:blur(5px);user-select:none;cursor:pointer'}" title="${revealed ? '' : '点击显示原文'}">
              ${cur.text.split('\n').map(l => `<p>${esc(l)}</p>`).join('')}
            </div>
            <div style="font-family:var(--font-serif);font-size:.82rem;color:var(--ink-faint);margin-top:var(--sp-3);padding:var(--sp-3);background:var(--pine-wash);border-radius:var(--radius)">📌 ${esc(cur.notes)}</div>
          </div>
        </div>
        <div class="sec-head"><span class="sec-head__no">§</span><h2>听写填空</h2><span class="sec-head__note">先听后写，核对答案</span></div>
        <div class="card">${blanksHtml}<div style="margin-top:var(--sp-4)"><button class="btn btn--primary" id="checkBlanks">核对答案</button></div></div>
      `;
      $$('[data-ldiff]', root).forEach(b => b.addEventListener('click', () => {
        diffFilter = b.dataset.ldiff;
        const nl = visibleList();
        if (nl.length && !nl.includes(cur)) cur = nl[0];
        render();
      }));
      $$('[data-l]', root).forEach(b => b.addEventListener('click', () => { cur = DATA.listening[+b.dataset.l]; revealed = false; render(); }));
      $('#playBtn').addEventListener('click', () => speak(cur.text.replace(/\n/g, ' '), listenRate));
      $$('[data-rate]', root).forEach(b => b.addEventListener('click', () => { listenRate = +b.dataset.rate; render(); }));
      $('#toggleTranscript').addEventListener('click', () => { revealed = !revealed; render(); });
      const tt = $('#transcriptText');
      if (!revealed) tt.addEventListener('click', () => { revealed = true; render(); });
      $('#checkBlanks').addEventListener('click', () => {
        let ok = 0;
        $$('.blank-input', root).forEach(inp => {
          const val = inp.value.trim().toLowerCase();
          const ans = inp.dataset.answer.toLowerCase();
          const correct = val === ans;
          if (correct) ok++;
          S.practice.listening[inp.dataset.key] = { chosen: inp.value, correct, ts: Date.now() };
        });
        save(); toast(`答对 ${ok} / ${cur.blanks.length}`); render();
      });
    };
    render();
  };

  /* ---------- 错题本 ---------- */
  R.mistakes = function () {
    const root = $('#view-mistakes');
    const S = getS();
    if (!S.mistakes.length) {
      root.innerHTML = `<div class="empty"><span class="empty__mark">✎</span><p>错题本还是空的。去做几道题，答错的会自动收进来。</p><div style="margin-top:var(--sp-4)"><button class="btn btn--primary" data-go="reading">去阅读练习</button></div></div>`;
      $('[data-go]', root)?.addEventListener('click', () => navigate('reading'));
      return;
    }
    root.innerHTML = `
      <div style="font-family:var(--font-serif);color:var(--ink-soft);margin-bottom:var(--sp-4)">共 <b>${S.mistakes.length}</b> 道错题。点开看解析，考点都是提分线索。重练答对后可移除。</div>
      ${S.mistakes.map((m, i) => `<div class="card mistake-item" style="margin-bottom:var(--sp-3)">
        <div>
          <div class="mistake-item__src">${esc(m.src)}</div>
          <div class="mistake-item__q">${i + 1}. ${esc(m.q)}</div>
          <div class="mistake-item__ans">你选：<i>${esc(m.opts?.[m.chosen] ?? '—')}</i> · 正确：<b>${esc(m.opts?.[m.answer] ?? '—')}</b></div>
          <div style="font-family:var(--font-serif);font-size:.84rem;color:var(--ink-soft);margin-top:var(--sp-2)">${esc(m.why || '')}</div>
        </div>
        <button class="btn btn--sm remove-mistake" data-id="${esc(m.id)}">移除</button>
      </div>`).join('')}
      <div style="text-align:center;margin-top:var(--sp-4)"><button class="btn" id="clearMistakes">清空错题本</button></div>
    `;
    $$('.remove-mistake', root).forEach(b => b.addEventListener('click', () => {
      S.mistakes = S.mistakes.filter(x => x.id !== b.dataset.id); save(); R.mistakes(); toast('已移除');
    }));
    $('#clearMistakes').addEventListener('click', () => {
      if (!confirm('确定清空全部错题？')) return;
      S.mistakes = []; save(); R.mistakes(); toast('错题本已清空');
    });
  };

  /* ---------- 模考计时 ---------- */
  let timer = { running: false, remain: 0, total: 0, tick: null, sectionIdx: 0, answers: {} };
  R.mock = function () {
    const root = $('#view-mistakes'); // placeholder to satisfy linter; real render below
    const view = $('#view-mock');
    const sec = DATA.mock.sections[timer.sectionIdx];
    const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const totalSeconds = DATA.mock.sections.reduce((a, s) => a + s.minutes * 60, 0);
    const remain = timer.total ? timer.remain : totalSeconds;
    const progress = timer.total ? (1 - timer.remain / timer.total) * 100 : 0;

    if (timer.sectionIdx >= DATA.mock.sections.length || timer.finished) {
      view.innerHTML = `<div class="empty"><span class="empty__mark">✦</span><p>本次模考已完成。想再来一次？</p><div style="margin-top:var(--sp-4)"><button class="btn btn--primary" id="restartMock">重新开始</button></div></div>`;
      $('#restartMock').addEventListener('click', () => { resetTimer(); R.mock(); });
      return;
    }

    view.innerHTML = `
      <div class="card" style="text-align:center">
        <div class="card__label">${esc(DATA.mock.title)}</div>
        <div class="timer-dial" id="dial" style="--progress:${progress}%">
          <div class="timer-dial__inner">
            <div class="timer-dial__time" id="timerTime">${mmss(remain)}</div>
            <div class="timer-dial__state">${timer.running ? '计时中…' : (timer.total ? '已暂停' : '准备开始')}</div>
          </div>
        </div>
        <div class="timer-controls">
          <button class="btn btn--primary" id="startTimer">${timer.running ? '暂停' : (timer.total ? '继续' : '开始计时')}</button>
          <button class="btn" id="resetTimer">重置</button>
          <button class="btn btn--pine" id="nextSection">交卷 / 下一部分</button>
        </div>
        <div class="mock-meta">
          <span>当前：<b>${esc(sec.name)}</b></span>
          <span>本部分 <b>${sec.minutes} 分钟</b></span>
          <span>共 <b>${DATA.mock.sections.length} 部分</b></span>
        </div>
      </div>
      <div class="sec-head"><span class="sec-head__no">§</span><h2>${esc(sec.name)}</h2><span class="sec-head__note">计时期间也可作答</span></div>
      <div class="card" id="mockQs">
        ${sec.questions.map((q, qi) => {
          const chosen = timer.answers[`${timer.sectionIdx}-${qi}`];
          return `<div class="question" data-q="${qi}">
            <div class="question__q">${qi + 1}. ${esc(q.q)}</div>
            <div class="question__opts">${q.opts.map((o, oi) => `<button class="opt ${chosen === oi ? 'is-selected' : ''}" data-qi="${qi}" data-oi="${oi}"><span class="opt__key">${'ABCD'[oi]}</span><span>${esc(o.replace(/^[A-D]\.\s*/, ''))}</span></button>`).join('')}</div>
          </div>`;
        }).join('')}
      </div>
    `;
    $$('#mockQs .opt').forEach(b => b.addEventListener('click', () => {
      const qi = +b.dataset.qi, oi = +b.dataset.oi;
      timer.answers[`${timer.sectionIdx}-${qi}`] = oi;
      $$(`#mockQs .question[data-q="${qi}"] .opt`).forEach(x => x.classList.remove('is-selected'));
      b.classList.add('is-selected');
    }));
    $('#startTimer').addEventListener('click', toggleTimer);
    $('#resetTimer').addEventListener('click', () => { resetTimer(); R.mock(); toast('计时已重置'); });
    $('#nextSection').addEventListener('click', gradeAndAdvance);
  };

  function toggleTimer() {
    if (timer.running) {
      clearInterval(timer.tick); timer.running = false;
    } else {
      if (!timer.total) {
        timer.total = DATA.mock.sections.reduce((a, s) => a + s.minutes * 60, 0);
        timer.remain = timer.total;
      }
      timer.running = true;
      timer.tick = setInterval(() => {
        timer.remain--;
        const t = $('#timerTime'), d = $('#dial');
        if (t) t.textContent = `${String(Math.floor(timer.remain / 60)).padStart(2, '0')}:${String(timer.remain % 60).padStart(2, '0')}`;
        if (d) d.style.setProperty('--progress', (1 - timer.remain / timer.total) * 100 + '%');
        if (timer.remain <= 0) { clearInterval(timer.tick); timer.running = false; toast('时间到！请交卷'); }
      }, 1000);
    }
    R.mock();
  }
  function resetTimer() {
    clearInterval(timer.tick);
    timer = { running: false, remain: 0, total: 0, tick: null, sectionIdx: 0, answers: {} };
  }
  function gradeAndAdvance() {
    const sec = DATA.mock.sections[timer.sectionIdx];
    let correct = 0;
    sec.questions.forEach((q, qi) => {
      const chosen = timer.answers[`${timer.sectionIdx}-${qi}`];
      const ok = chosen === q.answer;
      if (ok) correct++;
      else addMistake({ id: `mock-${timer.sectionIdx}-${qi}`, src: '模考 · ' + sec.name, q: q.q, opts: q.opts, answer: q.answer, chosen: chosen ?? -1, why: q.why });
    });
    const S = getS();
    S.mockRuns.push({ ts: Date.now(), score: correct, total: sec.questions.length, seconds: timer.total - timer.remain });
    save();
    if (timer.sectionIdx < DATA.mock.sections.length - 1) {
      timer.sectionIdx++;
      clearInterval(timer.tick); timer.running = false;
      toast(`本部分答对 ${correct}/${sec.questions.length}，进入下一部分`);
      R.mock();
    } else {
      clearInterval(timer.tick); timer.running = false; timer.finished = true;
      const totalCorrect = S.mockRuns.slice(-DATA.mock.sections.length).reduce((a, r) => a + r.score, 0);
      const totalQ = S.mockRuns.slice(-DATA.mock.sections.length).reduce((a, r) => a + r.total, 0);
      toast(`模考完成！共答对 ${totalCorrect}/${totalQ}`);
      R.mock();
    }
  }

  /* ---------- 进度统计 ---------- */
  R.stats = function () {
    const root = $('#view-stats');
    const S = getS();
    // 近 7 天答题分布（用打卡与答题时间戳近似）
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      let n = S.checkins.includes(key) ? 1 : 0;
      Object.values(S.practice).forEach(sec => Object.values(sec || {}).forEach(r => { if (r.ts && new Date(r.ts).toISOString().slice(0, 10) === key) n++; }));
      days.push({ key, n, label: ['日','一','二','三','四','五','六'][d.getDay()] });
    }
    const maxN = Math.max(1, ...days.map(d => d.n));
    const bars = days.map((d, i) => `<div class="bar ${i === 6 ? 'is-today' : ''}" style="height:${Math.max(3, d.n / maxN * 100)}%" title="${d.key} · ${d.n} 次"><span>${d.label}</span></div>`).join('');

    // 热力图（近 30 天打卡）
    let cells = '';
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const on = S.checkins.includes(d.toISOString().slice(0, 10));
      cells += `<div class="heat-cell" data-lvl="${on ? (i < 7 ? 3 : 2) : 0}" title="${d.toISOString().slice(0, 10)}"></div>`;
    }

    const rate = (() => {
      let t = 0, o = 0;
      Object.values(S.practice).forEach(sec => Object.values(sec || {}).forEach(r => { t++; if (r.correct) o++; }));
      S.mockRuns.forEach(r => { t += r.total; o += r.score; });
      return t ? Math.round(o / t * 100) : 0;
    })();
    const avgSec = S.mockRuns.length ? Math.round(S.mockRuns.reduce((a, r) => a + r.seconds, 0) / S.mockRuns.length) : 0;

    root.innerHTML = `
      <div class="stat-strip" style="margin-bottom:var(--sp-5)">
        <div class="stat-cell"><div class="stat-cell__num">${S.checkins.length}</div><div class="stat-cell__label">累计打卡</div></div>
        <div class="stat-cell"><div class="stat-cell__num">${rate}%</div><div class="stat-cell__label">总正确率</div></div>
        <div class="stat-cell"><div class="stat-cell__num">${S.mockRuns.length}</div><div class="stat-cell__label">模考次数</div></div>
        <div class="stat-cell"><div class="stat-cell__num">${avgSec ? Math.floor(avgSec / 60) + '′' : '—'}</div><div class="stat-cell__label">平均用时</div></div>
      </div>
      <div class="sec-head"><span class="sec-head__no">§</span><h2>近七日活跃</h2><span class="sec-head__note">每天的学习足迹</span></div>
      <div class="chart-wrap"><div class="bars">${bars}</div><div class="chart-legend"><span><i class="legend-dot" style="background:var(--pine)"></i>学习活跃度</span><span><i class="legend-dot" style="background:var(--accent)"></i>今天</span></div></div>
      <div class="sec-head"><span class="sec-head__no">§</span><h2>打卡日历</h2><span class="sec-head__note">近 30 天 · 每格一天</span></div>
      <div class="chart-wrap"><div class="heatmap">${cells}</div><div class="chart-legend"><span>浅色未打卡，深色已打卡</span></div></div>
      <div style="text-align:center;margin-top:var(--sp-5)"><button class="btn" id="goMock">去做一次模考 →</button></div>
    `;
    $('#goMock').addEventListener('click', () => navigate('mock'));
  };

  /* ---------- 资源导航 ---------- */
  R.resources = function () {
    const root = $('#view-resources');
    const groups = DATA.resources.map(g => `
      <div class="resource-group">
        <div class="sec-head"><span class="sec-head__no">§</span><h2>${esc(g.group)}</h2></div>
        <div class="grid" style="gap:var(--sp-3)">
          ${g.items.map(it => `<a class="resource-link" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">
            <span class="resource-link__icon">${esc(it.icon)}</span>
            <span class="resource-link__body"><span class="resource-link__title">${esc(it.title)}</span><span class="resource-link__desc">${esc(it.desc)}</span></span>
            <span class="resource-link__arrow">↗</span>
          </a>`).join('')}
        </div>
      </div>`).join('');
    root.innerHTML = `
      <div class="card" style="margin-bottom:var(--sp-5);border-left:3px solid var(--pine)">
        <div class="card__label">How This Works</div>
        <p style="font-family:var(--font-serif);margin:0;color:var(--ink-soft)">本站内置的内容是精挑细选的<b>离线样例</b>，确保随时可打开、可练习；这里是<b>实时更新的外部资源</b>，链接到 B 站刘晓燕、官方考试网站、权威词典等。两者配合：用本站打基础，用这些资源跟进最新课程与信息。</p>
      </div>
      ${groups}
    `;
  };

  window.__registerLateRenderers = registerLateRenderers;
})();
