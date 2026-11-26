/* 词汇随机过词小测 —— 纯静态、零依赖；只渲染 #view-vocab 与 #view-mistakes 的词汇错题分区 */
(function () {
  'use strict';
  const Y = window.__YANBIAN__;
  if (!Y) return;
  const { $, $$, esc, getS, save, toast, speakWord, RENDERERS, navigate } = Y;

  const ROUND_SIZE = 10;
  const RECENT_CAP = 200;
  const RUN_CAP = 200;
  const LOG_PAGE = 10;
  const AUTO_NEXT_MS = 650;

  const CATS = [
    { key: 'cet4', name: '四级词汇', tag: '四级', level: '四级' },
    { key: 'cet6', name: '六级词汇', tag: '六级', level: '六级' },
    { key: 'mix', name: '四六级综合', tag: '综合', level: '' }
  ];
  const CAT_TITLE = { cet4: '四级小测', cet6: '六级小测', mix: '综合小测', wrong: '错词重练' };
  const CAT_TAG = { cet4: '四级', cet6: '六级', mix: '综合', wrong: '错词' };

  let run = null;          // { items, idx, locked, chosen, correct, startedAt, wrong, cat }
  let nextTimer = null;
  let mode = 'list';       // 'list' | 'hub' | 'quiz' | 'result' | 'history'
  let histFilter = 'all';  // 'all' | 'cet4' | 'cet6' | 'mix' | 'wrong'
  let histShown = LOG_PAGE;

  /* 短释义：先剥词性前缀，再从完整长释义里取前两个中文义项；同一义项不重复 */
  function shortGloss(v) {
    const uniq = str => str.split('，').map(x => x.trim()).filter(Boolean)
      .filter((x, i, a) => a.indexOf(x) === i).join('，');
    let s = String((v && v.meaning) || '').trim();
    if (!s) return '';
    s = s.replace(/[。.；;\s]+$/, '');
    s = s.replace(/^[A-Za-z]{1,6}\.\s*/, '');
    /* 一个词条里常混着第二个词性（如「铝、a. 铝的」），只保留第一个义项组 */
    s = s.split(/[,，、；;]\s*[A-Za-z]{1,6}\.\s*/)[0].replace(/[,，、；;\s]+$/, '');
    if (!s) return '';
    if (s.length <= 12) return uniq(s.replace(/[；;]/g, '，').replace(/[,，]\s*/g, '，'));
    s = s.split('；')[0];
    let parts = s.split(/[,，]/).map(x => x.trim()).filter(Boolean)
      .filter((x, i, a) => a.indexOf(x) === i);
    if (!parts.length) return '';
    let out = parts.slice(0, 2).join('，');
    if (out.length > 16) out = parts[0];
    return out.replace(/[。.]$/, '');
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pool() {
    return (Y.VOCAB_ALL || []).filter(v => v && v.word && v.meaning && String(v.meaning).length >= 2);
  }

  /* 选择页词数按全量词库计（与词汇页口径一致：3971 / 2223 / 6194）；
     抽题仍用 pool() 过滤掉无释义的词，两者分工不同。 */
  function countOf(cat) {
    const all = Y.VOCAB_ALL || [];
    if (cat === 'cet4') return all.filter(v => v && v.level === '四级').length;
    if (cat === 'cet6') return all.filter(v => v && v.level === '六级').length;
    return all.length;
  }

  /* 分类词池：cet4/cet6 按 level 过滤；mix 全量 */
  function catPool(cat) {
    const all = pool();
    if (cat === 'cet4') return all.filter(v => v.level === '四级');
    if (cat === 'cet6') return all.filter(v => v.level === '六级');
    return all;
  }

  /* 干扰项：先同 level 再跨 level，按 4 倍量优先取候选；短释义去重、不互相包含、不同词 */
  function distractors(v, answer, all) {
    const key = String(v.word).toLowerCase();
    const same = shuffle(all.filter(c => String(c.word).toLowerCase() !== key && c.level === v.level));
    const cross = shuffle(all.filter(c => String(c.word).toLowerCase() !== key && c.level !== v.level));
    const stream = same.slice(0, 16).concat(cross.slice(0, 16), same.slice(16), cross.slice(16));
    const picked = [];
    const used = new Set([answer]);
    for (const cand of stream) {
      if (picked.length >= 3) break;
      const g = shortGloss(cand);
      if (!g || g.length < 2 || used.has(g)) continue;
      if (g.includes(answer) || answer.includes(g)) continue;
      picked.push(g);
      used.add(g);
    }
    return picked.length === 3 ? picked : null;
  }

  function makeItem(v, all) {
    const answer = shortGloss(v);
    if (!answer || answer.length < 2) return null;
    const ds = distractors(v, answer, all);
    if (!ds) return null;
    const options = shuffle([answer].concat(ds));
    return {
      word: v.word,
      phonetic: v.phonetic || '',
      level: v.level || '',
      meaning: v.meaning,
      gloss: answer,
      sentence: v.sentence || '',
      options: options,
      answer: options.indexOf(answer)
    };
  }

  /* 抽题：cat 决定词池；传 list 时只用这些词；默认排除最近测过的词（不足 40 个则放弃排除） */
  function buildRound(cat, list) {
    const all = catPool(cat);
    if (!all.length) return [];
    const S = getS();
    let queue, target;
    if (list && list.length) {
      const byWord = new Map(all.map(v => [String(v.word).toLowerCase(), v]));
      const seen = new Set();
      queue = list.map(w => byWord.get(String(w).toLowerCase())).filter(v => {
        if (!v || seen.has(String(v.word).toLowerCase())) return false;
        seen.add(String(v.word).toLowerCase());
        return true;
      }).slice(0, ROUND_SIZE);
      target = Math.min(ROUND_SIZE, queue.length);
    } else {
      const recent = new Set((S.vocabQuizRecent || []).map(w => String(w).toLowerCase()));
      let base = all.filter(v => !recent.has(String(v.word).toLowerCase()));
      if (base.length < 40) base = all;
      queue = shuffle(base).slice(0, ROUND_SIZE);
      target = Math.min(ROUND_SIZE, queue.length);
    }
    const backup = shuffle(all);
    let bi = 0, failures = 0;
    const items = [];
    while (items.length < target && (queue.length || bi < backup.length) && failures < 40) {
      const v = queue.shift() || backup[bi++];
      const item = makeItem(v, all);
      if (item) { items.push(item); failures = 0; }
      else failures++;
    }
    return items;
  }

  /* 答错立刻落库：按小写去重，times++ / ts 更新 / 挪到最前 */
  function recordWrong(word, chosen, item) {
    const S = getS();
    const list = (S.vocabWrong || []).slice();
    const key = String(word).toLowerCase();
    const at = list.findIndex(x => String(x.word).toLowerCase() === key);
    if (at >= 0) {
      const old = list[at];
      const updated = {
        word: old.word,
        phonetic: old.phonetic || item.phonetic,
        level: old.level || item.level,
        meaning: old.meaning || item.meaning,
        gloss: item.gloss,
        chosen: chosen,
        ts: Date.now(),
        times: (old.times || 1) + 1
      };
      list.splice(at, 1);
      list.unshift(updated);
    } else {
      list.unshift({
        word: item.word,
        phonetic: item.phonetic,
        level: item.level,
        meaning: item.meaning,
        gloss: item.gloss,
        chosen: chosen,
        ts: Date.now(),
        times: 1
      });
    }
    S.vocabWrong = list;
    save();
  }

  function phonText(p) {
    if (!p) return '';
    return p.charAt(0) === '/' ? p : '/' + p + '/';
  }

  function bindSay(root) {
    $$('[data-vq-say]', root || document).forEach(b => {
      b.addEventListener('click', e => { e.stopPropagation(); speakWord(b.dataset.vqSay); });
    });
  }

  function mmss(sec) {
    const s = Math.max(0, Number(sec) || 0);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  const catOf = r => (r && r.cat) || 'mix';
  const runsAll = () => {
    const raw = getS().vocabQuizRuns;
    return Array.isArray(raw) ? raw.filter(r => r && typeof r === 'object' && Number(r.ts) > 0) : [];
  };
  function aggOf(list) {
    const n = list.length;
    const total = list.reduce((s, r) => s + (Number(r.total) || 0), 0);
    const right = list.reduce((s, r) => s + (Number(r.correct) || 0), 0);
    const pcts = list.map(r => r.total ? Math.round((r.correct || 0) / r.total * 100) : 0);
    return {
      n: n, total: total, right: right,
      avg: total ? Math.round(right / total * 100) : 0,
      best: pcts.length ? Math.max.apply(null, pcts) : 0
    };
  }
  function fmtWhen(ts) {
    const d = new Date(Number(ts) || Date.now());
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const now = new Date();
    const zero = x => new Date(x.getFullYear(), x.getMonth(), x.getDate());
    const diff = Math.round((zero(now) - zero(d)) / 86400000);
    if (diff === 0) return '今天 ' + hh + ':' + mm;
    if (diff === 1) return '昨天 ' + hh + ':' + mm;
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + hh + ':' + mm;
  }

  /* 结果页与错题本共用的错词卡片；withRemove 只在错题本里为 true */
  function wrongCardHtml(w, withRemove) {
    const phon = phonText(w.phonetic);
    return `<div class="card vq-wrong" style="margin-bottom:var(--sp-3)">
      <div class="vq-wrong__head">
        <span class="tag tag--accent">词汇</span>
        <b class="vq-wrong__word">${esc(w.word)}</b>
        ${phon ? `<i class="vq-wrong__phon">${esc(phon)}</i>` : ''}
        ${w.level ? `<span class="tag">${esc(w.level)}</span>` : ''}
      </div>
      <div class="vq-wrong__meaning">${esc(w.meaning || '')}</div>
      <div class="mistake-item__ans">你选：<i>${esc(w.chosen || '—')}</i> · 正确：<b>${esc(w.gloss || '')}</b></div>
      <div class="vq-wrong__ops">
        <button class="btn btn--sm btn--outline" data-vq-say="${esc(w.word)}">🔊 朗读</button>
        ${withRemove ? `<button class="btn btn--sm remove-vq-wrong" data-vword="${esc(w.word)}">移除</button>` : ''}
      </div>
    </div>`;
  }

  function scheduleNext() {
    clearTimeout(nextTimer);
    nextTimer = setTimeout(() => { nextTimer = null; next(); }, AUTO_NEXT_MS);
  }

  function next() {
    clearTimeout(nextTimer);
    nextTimer = null;
    if (!run || mode !== 'quiz') return;
    run.idx++;
    run.locked = false;
    run.chosen = -1;
    if (run.idx >= run.items.length) finish();
    else render();
  }

  function choose(i) {
    if (!run || mode !== 'quiz' || run.locked || run.idx >= run.items.length) return;
    const root = $('#view-vocab');
    if (!root) return;
    const item = run.items[run.idx];
    if (!item || !item.options[i]) return;
    run.locked = true;
    run.chosen = i;
    const opts = $$('[data-vq-opt]', root);
    const fb = root.querySelector('#vq-feedback');
    const nextBtn = root.querySelector('#vq-next');
    const detail = '<div style="font-family:var(--font-serif);color:var(--ink-soft);font-size:.88rem;line-height:1.7;margin-top:var(--sp-2)">' + esc(item.meaning) + '</div>'
      + (item.sentence ? '<div style="font-family:var(--font-serif);color:var(--ink-faint);font-size:.84rem;line-height:1.7;margin-top:var(--sp-1)">' + esc(item.sentence) + '</div>' : '');
    if (i === item.answer) {
      run.correct++;
      opts[i].classList.add('is-correct');
      fb.hidden = false;
      fb.innerHTML = '✓ 答对' + detail;
      scheduleNext();
    } else {
      opts[i].classList.add('is-wrong');
      opts[item.answer].classList.add('is-correct');
      opts.forEach(b => { b.disabled = true; });
      fb.hidden = false;
      fb.innerHTML = '✗ 正确答案：' + esc(item.options[item.answer]) + detail;
      const chosen = item.options[i];
      run.wrong.push({ word: item.word, phonetic: item.phonetic, level: item.level, meaning: item.meaning, gloss: item.gloss, chosen: chosen });
      recordWrong(item.word, chosen, item);
      nextBtn.hidden = false;
    }
  }

  /* 进度按「已答题数 / 总数」显示：当前题答完进入下一题时前进 */
  function render() {
    const root = $('#view-vocab');
    if (!root || !run) return;
    mode = 'quiz';
    const item = run.items[run.idx];
    const total = run.items.length;
    const pct = Math.round(run.idx / total * 100);
    const phon = phonText(item.phonetic);
    const title = CAT_TITLE[run.cat] || '随机小测';
    root.innerHTML = `
      <div class="vq-head">
        <button class="btn btn--sm btn--outline" id="vq-back">← 返回记词</button>
        <span class="vq-step">${esc(title)} · 第 <b>${run.idx + 1}</b> / ${total} 题</span>
      </div>
      <div class="vq-bar"><i style="width:${pct}%"></i></div>
      <div class="card vq-card">
        <div class="vq-wordrow">
          <span class="vq-word">${esc(item.word)}</span>
          ${phon ? `<span class="vq-phon">${esc(phon)}</span>` : ''}
          ${item.level ? `<span class="tag">${esc(item.level)}</span>` : ''}
          <button class="btn btn--sm btn--outline vq-say" data-vq-say="${esc(item.word)}" title="朗读">🔊</button>
        </div>
        <div class="vq-ask">选出正确的中文释义</div>
        <div class="vq-opts">
          ${item.options.map((g, i) => `<button type="button" class="opt" data-vq-opt="${i}"><span class="opt__key">${'ABCD'[i]}</span><span>${esc(g)}</span></button>`).join('')}
        </div>
        <div class="feedback" id="vq-feedback" aria-live="polite" hidden></div>
      </div>
      <div class="vq-actions">
        <button class="btn btn--primary" id="vq-next" hidden>下一题 ↵</button>
      </div>`;
    bindSay(root);
    root.querySelector('#vq-back').addEventListener('click', close);
    $$('[data-vq-opt]', root).forEach(b => b.addEventListener('click', () => choose(+b.dataset.vqOpt)));
    root.querySelector('#vq-next').addEventListener('click', () => {
      if (run && run.locked && !root.querySelector('#vq-next').hidden) next();
    });
    document.scrollingElement.scrollTop = 0;
  }

  function renderResult() {
    const root = $('#view-vocab');
    if (!root || !run) return;
    mode = 'result';
    const total = run.items.length;
    const pct = total ? Math.round(run.correct / total * 100) : 0;
    const seconds = Math.round((Date.now() - run.startedAt) / 1000);
    const mmssText = mmss(seconds);
    const catName = CAT_TITLE[run.cat] || '随机小测';
    let verdict;
    if (run.correct === total) verdict = '全对。换一批词继续。';
    else if (pct >= 90) verdict = '这一轮很稳，继续保持。';
    else if (pct >= 70) verdict = '还行，错的几个已经收进错题本。';
    else verdict = '再走一轮，错词明天要复习一遍。';
    const wrong = run.wrong;
    root.innerHTML = `
      <div class="vq-result">
        <div class="vq-score"><b>${pct}</b><span>%</span></div>
        <div class="vq-stats">${run.correct} / ${total} 题 · 用时 ${mmssText} · ${esc(catName)}</div>
        <div class="vq-verdict">${esc(verdict)}</div>
        <div class="vq-actions">
          <button class="btn btn--primary" id="vq-again">再测一轮</button>
          ${wrong.length ? `<button class="btn btn--outline" id="vq-retry-wrong">只测这 ${wrong.length} 个错词</button>` : ''}
          <button class="btn btn--outline" id="vq-to-mistakes">去错题本</button>
          <button class="btn" id="vq-back2">返回记词</button>
        </div>
        <div class="vq-tip">${wrong.length ? '错词已加入错题本 · 词汇错题' : '这一轮没有错词，错题本没有新增。'} <button class="vq-link" id="vq-to-log">看记录 →</button></div>
        ${wrong.length ? `<div class="vq-sub">本轮错词 · ${wrong.length} 个</div><div class="grid grid--2">${wrong.map(w => wrongCardHtml(w, false)).join('')}</div>` : ''}
      </div>`;
    bindSay(root);
    root.querySelector('#vq-again').addEventListener('click', () => openCat(run.cat));
    const retry = root.querySelector('#vq-retry-wrong');
    if (retry) retry.addEventListener('click', () => openCat('wrong', wrong.map(w => w.word)));
    root.querySelector('#vq-to-log').addEventListener('click', () => openHistory('all'));
    root.querySelector('#vq-to-mistakes').addEventListener('click', () => {
      if (Y.setMistakeTab) Y.setMistakeTab('词汇错题');
      navigate('mistakes');
    });
    root.querySelector('#vq-back2').addEventListener('click', close);
    document.scrollingElement.scrollTop = 0;
  }

  function finish() {
    const S = getS();
    const total = run.items.length;
    const seconds = Math.round((Date.now() - run.startedAt) / 1000);
    const runs = runsAll();
    runs.unshift({ ts: Date.now(), total: total, correct: run.correct, seconds: seconds, cat: run.cat || 'mix' });
    S.vocabQuizRuns = runs.slice(0, RUN_CAP);
    const recent = (S.vocabQuizRecent || []).slice();
    const words = run.items.map(x => String(x.word).toLowerCase()).filter((w, i, a) => a.indexOf(w) === i);
    S.vocabQuizRecent = words.concat(recent.filter(w => words.indexOf(w) < 0)).slice(0, RECENT_CAP);
    save();
    renderResult();
  }

  /* ---------------- 选择页 ---------------- */
  function openHub() {
    clearTimeout(nextTimer);
    nextTimer = null;
    run = null;
    renderHub();
  }

  function renderHub() {
    const root = $('#view-vocab');
    if (!root) return;
    mode = 'hub';
    const runs = runsAll();
    const a = aggOf(runs);
    const catsHtml = CATS.map(c => {
      const n = countOf(c.key);
      const sub = runs.filter(r => catOf(r) === c.key); // runs 已按时间倒序，sub[0] 即该分类最近一轮
      const s = aggOf(sub);
      const recentPct = sub[0] && sub[0].total ? Math.round((sub[0].correct || 0) / sub[0].total * 100) : s.avg;
      const stat = s.n ? `最近 ${recentPct}% · 已测 ${s.n} 轮` : '还没测过';
      return `<div class="card vq-cat">
        <div class="vq-cat__top"><span class="tag tag--accent">${esc(c.tag)}</span><span class="vq-cat__count">${n} 词</span></div>
        <div class="vq-cat__name">${esc(c.name)}</div>
        <div class="vq-cat__stat">${esc(stat)}</div>
        <button class="btn btn--sm btn--primary vq-cat__btn" data-vq-cat="${c.key}">开始 10 题 →</button>
      </div>`;
    }).join('');
    const reportMid = a.n
      ? `共 ${a.n} 轮 · 平均 ${a.avg}% · 最好 ${a.best}%`
      : '还没有记录，做完一轮就会出现在这里';
    root.innerHTML = `
      <div class="vq-head">
        <button class="btn btn--sm btn--outline" id="vq-back">← 返回记词</button>
        <span class="vq-step">随机小测 · 一次 10 题</span>
      </div>
      <div class="vq-hub">
        <div class="vq-hub__title">选择一组开始</div>
        <div class="vq-hub__sub">看英文选中文，答错的词会自动收进错题本。</div>
        <div class="vq-cats">${catsHtml}</div>
        <div class="vq-report" id="vq-report" role="button" tabindex="0">
          <span class="vq-report__label">我的记录</span>
          <span class="vq-report__mid">${esc(reportMid)}</span>
          <span class="vq-report__go">查看 →</span>
        </div>
        <div class="vq-note">每轮 10 题，答错的词自动进「错题本 · 词汇错题」。</div>
      </div>`;
    root.querySelector('#vq-back').addEventListener('click', close);
    $$('[data-vq-cat]', root).forEach(b => b.addEventListener('click', () => openCat(b.dataset.vqCat)));
    const report = root.querySelector('#vq-report');
    report.addEventListener('click', () => openHistory('all'));
    report.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openHistory('all'); } });
    document.scrollingElement.scrollTop = 0;
  }

  /* ---------------- 记录页 ---------------- */
  function openHistory(filter) {
    clearTimeout(nextTimer);
    nextTimer = null;
    run = null;
    histFilter = filter || 'all';
    histShown = LOG_PAGE;
    renderHistory();
  }

  function renderHistory() {
    const root = $('#view-vocab');
    if (!root) return;
    mode = 'history';
    const runs = runsAll();
    const a = aggOf(runs);
    const FILTERS = [
      { key: 'all', label: '全部' },
      { key: 'cet4', label: CAT_TAG.cet4 },
      { key: 'cet6', label: CAT_TAG.cet6 },
      { key: 'mix', label: CAT_TAG.mix },
      { key: 'wrong', label: CAT_TAG.wrong }
    ];
    const shown = runs.filter(r => histFilter === 'all' || catOf(r) === histFilter);
    let body;
    if (!runs.length) {
      body = `<div class="empty"><span class="empty__mark">✎</span>
        <p>还没有答题记录。做完一轮，这里就有时间和正确率了。</p>
        <div style="margin-top:var(--sp-4)"><button class="btn btn--primary" id="vq-hist-go">去做一轮</button></div>
      </div>`;
    } else if (!shown.length) {
      body = `<div class="empty"><span class="empty__mark">✎</span>
        <p>这一类还没有记录。</p>
        <div style="margin-top:var(--sp-4)"><button class="btn btn--primary" id="vq-hist-all">看全部 →</button></div>
      </div>`;
    } else {
      const rows = shown.slice(0, histShown).map(r => {
        const total = Number(r.total) || 0;
        const correct = Number(r.correct) || 0;
        const pct = total ? Math.round(correct / total * 100) : 0;
        const cls = pct >= 90 ? 'is-good' : (pct < 60 ? 'is-low' : '');
        return `<div class="vq-log__row">
          <span class="vq-log__time">${esc(fmtWhen(r.ts))}</span>
          <span class="tag">${esc(CAT_TAG[catOf(r)] || '综合')}</span>
          <span class="vq-log__score">${correct} / ${total}</span>
          <span class="vq-log__pct ${cls}">${pct}%</span>
          <span class="vq-log__dur">${esc(mmss(r.seconds))}</span>
        </div>`;
      }).join('');
      const more = shown.length > histShown
        ? `<div class="vq-log__more"><button class="btn btn--sm" id="vq-hist-more">显示更多</button></div>` : '';
      body = `<div class="vq-log">${rows}</div>${more}`;
    }
    const chips = FILTERS.map(f => {
      const n = f.key === 'all' ? runs.length : runs.filter(r => catOf(r) === f.key).length;
      return `<button class="filter-chip ${histFilter === f.key ? 'is-active' : ''}" data-vq-filter="${f.key}">${esc(f.label)} ${n}</button>`;
    }).join('');
    root.innerHTML = `
      <div class="vq-head">
        <button class="btn btn--sm btn--outline" id="vq-log-back">← 返回选择</button>
        <span class="vq-step">我的记录</span>
      </div>
      <div class="vq-hist">
        <div class="stat-strip">
          <div class="stat-cell"><div class="stat-cell__num">${a.n}</div><div class="stat-cell__label">总轮次</div></div>
          <div class="stat-cell"><div class="stat-cell__num">${a.total}</div><div class="stat-cell__label">总题数</div></div>
          <div class="stat-cell"><div class="stat-cell__num">${a.avg}%</div><div class="stat-cell__label">平均正确率</div></div>
          <div class="stat-cell"><div class="stat-cell__num">${a.best}%</div><div class="stat-cell__label">最好</div></div>
        </div>
        <div class="filter-bar">${chips}</div>
        ${body}
        ${runs.length ? '<div class="vq-log__foot"><button class="vq-link vq-link--danger" id="vq-hist-clear">清空记录</button></div>' : ''}
      </div>`;
    root.querySelector('#vq-log-back').addEventListener('click', openHub);
    $$('[data-vq-filter]', root).forEach(b => b.addEventListener('click', () => {
      histFilter = b.dataset.vqFilter;
      histShown = LOG_PAGE;
      renderHistory();
    }));
    const go = root.querySelector('#vq-hist-go');
    if (go) go.addEventListener('click', openHub);
    const all = root.querySelector('#vq-hist-all');
    if (all) all.addEventListener('click', () => { histFilter = 'all'; histShown = LOG_PAGE; renderHistory(); });
    const more = root.querySelector('#vq-hist-more');
    if (more) more.addEventListener('click', () => { histShown += LOG_PAGE; renderHistory(); });
    const clear = root.querySelector('#vq-hist-clear');
    if (clear) clear.addEventListener('click', () => {
      if (!confirm('确定清空全部 ' + runs.length + ' 条记录？清空后无法恢复。')) return;
      const S = getS();
      S.vocabQuizRuns = [];
      save();
      histFilter = 'all';
      histShown = LOG_PAGE;
      renderHistory();
      toast('记录已清空');
    });
    document.scrollingElement.scrollTop = 0;
  }

  function openCat(cat, list) {
    const items = buildRound(cat, list);
    if (!items.length) { toast('词库还没加载好，刷新一下再试'); return; }
    clearTimeout(nextTimer);
    nextTimer = null;
    run = { items: items, idx: 0, locked: false, chosen: -1, correct: 0, startedAt: Date.now(), wrong: [], cat: cat || 'mix' };
    render();
  }

  /* 兼容旧签名：open(list) 仍是「综合小测 + 指定词」；新代码统一用 openCat */
  function open(list) {
    openCat('mix', list);
  }

  function close() {
    clearTimeout(nextTimer);
    nextTimer = null;
    run = null;
    mode = 'list';
    if (RENDERERS && RENDERERS.vocab) RENDERERS.vocab();
  }

  function renderMistakeTab(root, tabsHtml, bindTabs) {
    const S = getS();
    const list = (S.vocabWrong || []);
    if (!list.length) {
      root.innerHTML = tabsHtml + `<div class="empty"><span class="empty__mark">✎</span>
        <p>词汇错题还是空的。去「词汇 → ◎ 随机小测」做一轮，答错的词会自动收进来。</p>
        <div style="margin-top:var(--sp-4)"><button class="btn btn--primary" id="vq-go-quiz">去随机小测</button></div>
      </div>`;
      bindTabs();
      $('#vq-go-quiz', root).addEventListener('click', () => { navigate('vocab'); openHub(); });
      return;
    }
    root.innerHTML = tabsHtml + `
      <div class="vq-mist-head">
        <span>词汇错题共 <b>${list.length}</b> 个词。重练答对后可来这里移除。</span>
        <span class="vq-mist-ops">
          <button class="btn btn--sm btn--outline" id="vq-mist-retest">测这些错词</button>
          <button class="btn btn--sm" id="vq-mist-clear">清空词汇错题</button>
        </span>
      </div>
      <div class="grid grid--2">${list.map(w => wrongCardHtml(w, true)).join('')}</div>`;
    bindTabs();
    $$('.remove-vq-wrong', root).forEach(b => b.addEventListener('click', () => {
      const w = b.dataset.vword;
      const S2 = getS();
      S2.vocabWrong = (S2.vocabWrong || []).filter(x => x.word !== w);
      save();
      RENDERERS.mistakes();
      toast('已移除');
    }));
    $('#vq-mist-clear', root).addEventListener('click', () => {
      if (!confirm('确定清空全部词汇错题？')) return;
      const S2 = getS();
      S2.vocabWrong = [];
      save();
      RENDERERS.mistakes();
      toast('词汇错题已清空');
    });
    $('#vq-mist-retest', root).addEventListener('click', () => {
      const words = (getS().vocabWrong || []).map(x => x.word).slice(0, ROUND_SIZE);
      navigate('vocab');
      openCat('wrong', words);
    });
    bindSay(root);
  }

  /* 入口用 document 级委托：#vocab-quiz-entry 每次 R.vocab 重绘都会重建 */
  document.addEventListener('click', e => {
    const btn = e.target.closest && e.target.closest('#vocab-quiz-entry');
    if (!btn) return;
    e.preventDefault();
    openHub();
  }, true);

  document.addEventListener('keydown', e => {
    if (mode !== 'quiz' || !run) return;
    if (Y.currentView && Y.currentView() !== 'vocab') return;
    const root = $('#view-vocab');
    if (!root || !root.querySelector('.vq-card')) return;
    const map = { '1': 0, '2': 1, '3': 2, '4': 3, 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
    const k = String(e.key || '').toLowerCase();
    if (Object.prototype.hasOwnProperty.call(map, k)) {
      e.preventDefault();
      choose(map[k]);
      return;
    }
    if (e.key === 'Enter') {
      const nextBtn = root.querySelector('#vq-next');
      const item = run.items[run.idx];
      if (nextBtn && !nextBtn.hidden) { e.preventDefault(); next(); }
      else if (item && run.locked && run.chosen === item.answer) { e.preventDefault(); next(); }
    }
  });

  window.YANBIAN_VOCAB_QUIZ = {
    open: open, openCat: openCat, openHub: openHub, openHistory: openHistory,
    render: render, close: close, isOpen: function () { return mode !== 'list'; },
    renderMistakeTab: renderMistakeTab
  };
})();
