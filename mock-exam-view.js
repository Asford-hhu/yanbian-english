/* ============================================================
   砚边 · 真题模考模块（mock-exam-view.js）
   ------------------------------------------------------------
   · 2026年6月 四级/六级真题（听力 + 长篇阅读匹配 + 仔细阅读），作文翻译已剔除
   · 分区：四级真题 / 六级真题 / 我的收藏 / 已完成
   · 自主选卷 → 计时答题 → 各部分自由切换/改答案 → 交卷或倒计时自动提交
   · 听力：二次确认后播放一次，不可暂停/拖拽/倍速
   · 交卷：判分（满分=题目总数）+ 正确率 + 答案解析 + 错题自动入错题本(带原文)
   · 中途切换功能 = 退出试卷（确认提醒 + 重置该卷进度）
   · 收藏、已做（可删除）独立持久化，不污染原状态结构
   ★ 不改动朗读/搜索/筛选/单选逻辑；只注册 R.mock 并加导航离开拦截
   ============================================================ */
(function () {
  'use strict';
  const API = window.__YANBIAN__ || {};
  const $ = API.$, $$ = API.$$, esc = API.esc, toast = API.toast || function(){};
  const R = API.RENDERERS || {};
  const getS = () => API.getS(), save = () => API.save();
  const EXAMS = window.YANBIAN_MOCK_EXAMS || [];

  const LS_KEY = 'yansbian_mock_exam_v1';
  function readState() {
    try {
      const d = JSON.parse(localStorage.getItem(LS_KEY));
      if (d && typeof d === 'object') return { fav: d.fav || [], done: d.done || [], active: d.active || null };
    } catch (e) {}
    return { fav: [], done: [], active: null };
  }
  function writeState(s) { try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (e) {} }
  let ST = readState();
  // 页面脚本执行即视为一次全新进入：不恢复任何进行中的试卷
  if (ST.active) { ST.active = null; writeState(ST); }

  function examById(id) { return EXAMS.find(e => e.id === id); }
  function findQ(exam, qid) { return exam.questions.find(q => q.id === qid); }
  function mmss(sec) { sec = Math.max(0, Math.floor(sec)); return String(Math.floor(sec/60)).padStart(2,'0') + ':' + String(sec%60).padStart(2,'0'); }

  // 运行时答题状态（不持久化：中途退出即重置）
  let run = null; // { examId, answers:{qid:oi}, remain, total, tick, startedAt, section, played:bool, playing:bool, submitted:bool }
  let viewTab = 'cet4'; // cet4 | cet6 | fav | done

  function stopTimer() { if (run && run.tick) { clearInterval(run.tick); run.tick = null; } }

  // 听力播放器常驻在 body 上的独立容器，切题/切部分/答题卡跳转都不会重建它
  let audioEl = null, audioDock = null;
  function getAudio() {
    if (!audioDock) {
      audioDock = document.createElement('div');
      audioDock.id = 'mockAudioDock';
      audioDock.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;pointer-events:none;';
      document.body.appendChild(audioDock);
    }
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.id = 'mockAudioEl';
      audioEl.preload = 'none';
      audioEl.playsInline = true;
      audioEl.setAttribute('playsinline', '');
      audioDock.appendChild(audioEl);
      audioEl.playbackRate = 1;
      audioEl.addEventListener('seeking', () => {
        if (run && run.playing && typeof run.__playStart === 'number' && Math.abs(audioEl.currentTime - run.__playStart) > 2) {
          audioEl.currentTime = run.__playStart;
        }
      });
      audioEl.addEventListener('ended', () => {
        if (!run) return;
        run.playing = false;
        syncAudioUI();
        toast('听力播放结束');
      });
    }
    return audioEl;
  }
  function stopAudio() {
    if (!audioEl) return;
    try { audioEl.pause(); } catch (e) {}
    try { audioEl.currentTime = 0; } catch (e) {}
    audioEl.removeAttribute('src');
    try { audioEl.load(); } catch (e) {}
    if (run) { run.playing = false; run.played = false; run.__playStart = 0; }
  }
  function syncAudioUI() {
    if (!run) return;
    const btn = document.querySelector('#view-mock #mockPlay');
    if (!btn) return;
    btn.disabled = !!run.played;
    btn.textContent = run.played
      ? (run.playing ? '▶ 正在播放…（仅此一次）' : '✓ 本科目听力已播放完毕')
      : '▶ 播放听力（仅一次）';
  }

  // 彻底退出：停计时、停音频、清空答题进度与持久化 active
  // 只清持久化的 active，不整份回写 ST：避免卸载时用旧内存态覆盖其它标签页/外部清理过的收藏与已完成
  function clearPersistedActive() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (!d || typeof d !== 'object') return;
      d.active = null;
      localStorage.setItem(LS_KEY, JSON.stringify(d));
    } catch (e) {}
  }
  function hardReset() {
    finishConfirm(false); // 关闭任何待确认弹窗，防止 bfcache 恢复后残留
    stopTimer(); stopAudio(); run = null; ST.active = null; clearPersistedActive();
  }
  function resetRun() { hardReset(); }
  function isRunning() { return !!(run && !run.submitted && run.startedAt); }

  // ---------------- 站点风格二次确认弹窗（永远只有一个：确定 + 取消） ----------------
  let confirmEl = null, confirmResolve = null;
  function finishConfirm(ok) {
    if (!confirmEl || confirmEl.hidden || !confirmResolve) return; // 重复点击只结算一次
    confirmEl.hidden = true;
    const resolve = confirmResolve; confirmResolve = null;
    resolve(!!ok);
  }
  function ensureConfirm() {
    if (confirmEl) return confirmEl;
    confirmEl = document.createElement('div');
    confirmEl.className = 'modal mock-confirm';
    confirmEl.hidden = true;
    confirmEl.setAttribute('role', 'dialog');
    confirmEl.setAttribute('aria-modal', 'true');
    confirmEl.setAttribute('aria-label', '确认操作');
    confirmEl.innerHTML = `<div class="modal__card mock-confirm__card">
      <p class="mock-confirm__msg" id="mockConfirmMsg"></p>
      <div class="mock-confirm__actions">
        <button type="button" class="btn" data-mconfirm="cancel">取消</button>
        <button type="button" class="btn btn--primary" data-mconfirm="ok">确定</button>
      </div>
    </div>`;
    document.body.appendChild(confirmEl);
    confirmEl.addEventListener('click', e => {
      if (e.target === confirmEl) { finishConfirm(false); return; }
      const b = e.target && e.target.closest && e.target.closest('[data-mconfirm]');
      if (b) finishConfirm(b.dataset.mconfirm === 'ok');
    });
    document.addEventListener('keydown', e => {
      if (!confirmEl || confirmEl.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); finishConfirm(false); }
    });
    return confirmEl;
  }
  function confirmAction(msg) {
    // 已有弹窗未关闭时不再弹第二个，直接视为取消，杜绝误触叠加
    if (confirmResolve) return Promise.resolve(false);
    const el = ensureConfirm();
    const msgEl = $('#mockConfirmMsg', el);
    if (msgEl) msgEl.textContent = msg;
    el.hidden = false;
    return new Promise(resolve => {
      confirmResolve = resolve;
      requestAnimationFrame(() => {
        const cancel = el.querySelector('[data-mconfirm="cancel"]');
        if (cancel) cancel.focus({ preventScroll: true });
      });
    });
  }

  // ---------------- 试卷列表页 ----------------
  function listHtml() {
    const tabs = [
      ['cet4','四级真题'], ['cet6','六级真题'], ['fav','我的收藏'], ['done','已完成']
    ].map(([k,n]) => `<button class="filter-chip ${viewTab===k?'is-active':''}" data-mtab="${k}">${n}</button>`).join('');

    let list = [];
    if (viewTab === 'cet4' || viewTab === 'cet6') {
      list = EXAMS.filter(e => e.level === (viewTab==='cet4'?'CET4':'CET6'));
    } else if (viewTab === 'fav') {
      list = ST.fav.map(id=>examById(id)).filter(Boolean);
    } else {
      list = ST.done.slice().reverse().map(x => ({ ...examById(x.id), __done: x })).filter(e=>e.id);
    }

    const cards = list.map(e => {
      const fav = ST.fav.indexOf(e.id) >= 0;
      const done = ST.done.find(x => x.id === e.id);
      const hasAudio = !!e.audio;
      return `<article class="card exam-card" style="border-left:3px solid var(--accent)">
        <div class="exam-card__head" style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <div>
            <div class="card__label">${e.level==='CET4'?'CET-4':'CET-6'} · ${e.year}年${e.month}月 · 第${e.set}套</div>
            <h3 style="margin:6px 0;font-family:var(--font-display)">${esc(e.title)}</h3>
            <div style="font-size:.82rem;color:var(--text-secondary)">
              共 ${e.questions.length} 题 · ${e.questions.filter(q=>q.type==='listening').length} 听力 + ${e.questions.filter(q=>q.type==='matching').length} 长篇阅读 + ${e.questions.filter(q=>q.type==='reading').length} 仔细阅读 · ${e.minutes} 分钟
              ${hasAudio?' · <span style="color:var(--accent)">含听力原声</span>':' · 无听力'}
            </div>
            ${done?`<div style="margin-top:6px;font-size:.82rem;color:var(--accent-ink)">✓ 已完成 · 得分 ${done.score}/${done.total} · 正确率 ${done.rate}%</div>`:''}
          </div>
          <button class="mock-fav ${fav?'is-fav':''}" data-mfav="${e.id}" title="收藏" aria-label="收藏">${fav?'★':'☆'}</button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
          ${done?`<button class="btn btn--sm" data-mreview="${e.id}">查看解析</button><button class="btn btn--sm" data-mdel="${e.id}">移出已完成</button>`:''}
          <button class="btn btn--sm btn--primary" data-mstart="${e.id}">${done?'重新模考':'开始模考'}</button>
        </div>
      </article>`;
    }).join('');

    return `<div class="mock-exam">
      <div class="card" style="border-left:3px solid var(--accent);margin-bottom:var(--sp-5)">
        <div class="card__label">Real Exam · 真题模考</div>
        <p style="font-family:var(--font-body);margin:0;color:var(--text-secondary);line-height:1.85">
          2026年6月 <b>四级 / 六级</b> 官方真题，含听力原声、长篇阅读匹配与仔细阅读，<b>已剔除作文与翻译</b>。
          时长按<b>教育部教育考试院官方规定</b>设置：听力四级 25 分钟／六级 30 分钟；官方阅读理解 40 分钟含选词填空、长篇阅读、仔细阅读三类，
          本站模考<b>全部为客观题</b>（无选词填空、写作、翻译），故阅读按长篇阅读 15 + 仔细阅读 20 = <b>35 分钟</b>计。
          含听力卷为两者之和（四级 60／六级 65 分钟），无听力卷为 35 分钟。
          选卷开考后，听力<b>仅可播放一次</b>（播放前二次确认，播放中不可暂停或拖动）；各部分可自由切换、随时改答案；
          交卷或倒计时结束自动判分，答错自动进错题本并附原题解析。中途切换到其它功能将<b>重置本卷进度</b>。
        </p>
      </div>
      <div class="filter-bar" style="flex-wrap:wrap;gap:8px;margin-bottom:var(--sp-4)">${tabs}</div>
      <div class="exam-grid">${cards || '<div class="empty"><div class="empty__mark">◌</div><p>这里还没有试卷</p></div>'}</div>
    </div>`;
  }

  // ---------------- 答题页 ----------------
  function sectionsOf(exam) {
    const secs = [];
    const lis = exam.questions.filter(q=>q.type==='listening');
    const mat = exam.questions.filter(q=>q.type==='matching');
    const rea = exam.questions.filter(q=>q.type==='reading');
    if (lis.length) secs.push({ key:'listening', name:'听力理解', qs:lis });
    if (mat.length) secs.push({ key:'matching', name:'长篇阅读匹配', qs:mat });
    if (rea.length) secs.push({ key:'reading', name:'仔细阅读', qs:rea });
    return secs;
  }

  function answerSheetHtml(exam) {
    const secs = sectionsOf(exam);
    return secs.map(sec => `<div class="as-sec">
      <div class="as-sec__t">${sec.name}</div>
      <div class="as-grid">${sec.qs.map(q=>`<button class="as-num ${run.answers[q.id]!==undefined?'is-done':''} ${run.section===sec.key&&run.curQid===q.id?'is-cur':''}" data-jump="${q.id}">${q.no}</button>`).join('')}</div>
    </div>`).join('');
  }

  function currentQuestion() {
    const exam = examById(run.examId);
    const sec = sectionsOf(exam).find(s=>s.key===run.section) || sectionsOf(exam)[0];
    const q = sec.qs.find(x=>x.id===run.curQid) || sec.qs[0];
    return { exam, sec, q };
  }

  function questionHtml() {
    const { exam, sec, q } = currentQuestion();
    const chosen = run.answers[q.id];
    const isListen = q.type === 'listening';
    let media = '';
    if (isListen && exam.audio) {
      const label = run.played
        ? (run.playing ? '▶ 正在播放…（仅此一次）' : '✓ 本科目听力已播放完毕')
        : '▶ 播放听力（仅一次）';
      media = `<div class="mock-audio">
        <button class="mock-play" id="mockPlay" ${run.played?'disabled':''}>${label}</button>
        <div class="mock-audio__tip">${run.played?'听力已播放/正在播放，不可再次播放。':'点击后需二次确认；播放开始后不可暂停、不可拖动、固定正常语速，且仅能播放一次。切题不会中断播放。'}</div>
      </div>`;
    }
    const passage = (!isListen && q.passage) ? `<details class="mock-passage"><summary>查看本文原文</summary><div>${esc(q.passage)}</div></details>` : '';
    const opts = q.opts.map((o,i)=> o ? `<button class="opt ${chosen===i?'is-selected':''}" data-mopt="${i}"><span class="opt__key">${String.fromCharCode(65+i)}</span><span>${esc(o)}</span></button>` : '').join('');
    return `<div class="mock-qhead">
        <span class="card__label">${exam.title} · ${sec.name}</span>
        <span class="mock-qno">第 ${q.no} 题</span>
      </div>
      ${media}${passage}
      <div class="question">
        <div class="question__q">${isListen?'听音频，选择最佳答案。':esc(q.q)}</div>
        <div class="question__opts">${opts}</div>
      </div>
      <div class="mock-qnav">
        <button class="btn btn--sm" data-mprev ${!hasPrev()?'disabled':''}>← 上一题</button>
        <button class="btn btn--sm" data-mnext ${!hasNext()?'disabled':''}>下一题 →</button>
      </div>`;
  }

  function hasPrev() {
    const exam = examById(run.examId); const secs = sectionsOf(exam);
    const si = secs.findIndex(s=>s.key===run.section); const q = currentQuestion().q;
    const qi = secs[si].qs.findIndex(x=>x.id===q.id);
    return qi > 0 || si > 0;
  }
  function hasNext() {
    const exam = examById(run.examId); const secs = sectionsOf(exam);
    const si = secs.findIndex(s=>s.key===run.section); const q = currentQuestion().q;
    const qi = secs[si].qs.findIndex(x=>x.id===q.id);
    return qi < secs[si].qs.length-1 || si < secs.length-1;
  }
  function move(delta) {
    const exam = examById(run.examId); const secs = sectionsOf(exam);
    let si = secs.findIndex(s=>s.key===run.section);
    let qi = secs[si].qs.findIndex(x=>x.id===currentQuestion().q.id);
    qi += delta;
    if (qi < 0) { if (si>0){ si--; qi=secs[si].qs.length-1; } else return; }
    if (qi >= secs[si].qs.length) { if (si<secs.length-1){ si++; qi=0; } else return; }
    run.section = secs[si].key; run.curQid = secs[si].qs[qi].id;
    paintExam();
  }

  function examHtml() {
    const exam = examById(run.examId);
    return `<div class="mock-exam mock-taking">
      <div class="mock-topbar">
        <button class="btn btn--sm" id="mockExit">← 退出模考</button>
        <div class="mock-timer"><span class="mock-timer__time" id="mockClock">${mmss(run.remain)}</span><span class="mock-timer__label">剩余时间</span></div>
        <button class="btn btn--sm btn--primary" id="mockSubmit">交卷</button>
      </div>
      <div class="mock-layout">
        <div class="mock-main card" id="mockQuestion">${questionHtml()}</div>
        <aside class="mock-sheet card">
          <div class="card__label">答题卡</div>
          <div class="mock-sheet__answered">已作答 <b id="mockDoneCount">${Object.keys(run.answers).length}</b> / ${exam.questions.length}</div>
          <div id="mockAnswerSheet">${answerSheetHtml(exam)}</div>
          <div class="mock-sheet__secs">${sectionsOf(exam).map(s=>`<button class="btn btn--sm ${run.section===s.key?'btn--primary':''}" data-msec="${s.key}">${s.name}</button>`).join('')}</div>
        </aside>
      </div>
    </div>`;
  }

  // ---------------- 结果页 ----------------
  function resultHtml(exam, result) {
    const qs = exam.questions;
    const details = qs.map(q => {
      const chosen = result.answers[q.id];
      const ok = chosen === q.answer;
      const passage = (!q.passage ? '' : `<details class="mock-passage"><summary>原题材料</summary><div>${esc(q.passage)}</div></details>`);
      return `<div class="res-q ${ok?'is-right':'is-wrong'}">
        <div class="res-q__h"><b>${q.no}. ${q.type==='listening'?'【听力】':(q.type==='matching'?'【匹配】':'【阅读】')}</b> <span>${ok?'✓ 正确':'✗ 错误'}</span></div>
        ${q.q?`<div class="res-q__stem">${esc(q.q)}</div>`:''}
        ${passage}
        <div class="res-q__opts">${q.opts.map((o,i)=>o?`<div class="${i===q.answer?'is-ans':(i===chosen?'is-chosen':'')}">(${String.fromCharCode(65+i)}) ${esc(o)} ${i===q.answer?'（正确）':''}${i===chosen&&chosen!==q.answer?'（你的选择）':''}</div>`:'').join('')}</div>
        <div class="res-q__why"><b>解析：</b>${esc(q.why)}</div>
      </div>`;
    }).join('');
    return `<div class="mock-exam">
      <div class="card mock-score" style="border-left:3px solid var(--accent)">
        <div class="card__label">考试结果 · ${esc(exam.title)}</div>
        <div class="mock-score__grid">
          <div><div class="mock-score__num">${result.score}<span>/${result.total}</span></div><div class="mock-score__lb">得分（满分=题目总数）</div></div>
          <div><div class="mock-score__num">${result.rate}%</div><div class="mock-score__lb">正确率</div></div>
          <div><div class="mock-score__num">${result.right}/${result.total}</div><div class="mock-score__lb">答对题数</div></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
          <button class="btn btn--sm" id="mockBackList">返回试卷列表</button>
          <button class="btn btn--sm btn--primary" data-mstart="${exam.id}">再考一次</button>
        </div>
      </div>
      <div class="card" style="margin-top:var(--sp-4)"><div class="card__label">逐题解析</div>${details}</div>
    </div>`;
  }

  // ---------------- 渲染入口 ----------------
  function paintList() {
    const root = $('#view-mock'); if (!root) return;
    root.innerHTML = listHtml();
    bindList(root);
  }
  function paintExam() {
    const root = $('#view-mock'); if (!root) return;
    root.innerHTML = examHtml();
    bindExam(root);
    startTimerIfNeeded();
  }
  function paintResult(exam, result) {
    const root = $('#view-mock'); if (!root) return;
    root.innerHTML = resultHtml(exam, result);
    $$('[data-mstart]', root).forEach(b=>b.addEventListener('click',()=>startExam(b.dataset.mstart)));
    $('#mockBackList')?.addEventListener('click', paintList);
  }

  function bindList(root) {
    $$('[data-mtab]', root).forEach(b=>b.addEventListener('click',()=>{ viewTab=b.dataset.mtab; paintList(); }));
    $$('[data-mstart]', root).forEach(b=>b.addEventListener('click',()=>startExam(b.dataset.mstart)));
    $$('[data-mreview]', root).forEach(b=>b.addEventListener('click',()=>{
      const exam=examById(b.dataset.mreview); const done=ST.done.find(x=>x.id===exam.id);
      paintResult(exam, { answers:done.answers, score:done.score, total:done.total, rate:done.rate, right:done.right });
    }));
    $$('[data-mdel]', root).forEach(b=>b.addEventListener('click',()=>{
      ST.done=ST.done.filter(x=>x.id!==b.dataset.mdel); writeState(ST); paintList(); toast('已移出已完成');
    }));
    $$('[data-mfav]', root).forEach(b=>b.addEventListener('click',()=>{
      const id=b.dataset.mfav, k=ST.fav.indexOf(id);
      if(k>=0){ST.fav.splice(k,1);toast('已取消收藏');}else{ST.fav.push(id);toast('已收藏');}
      writeState(ST); paintList();
    }));
  }

  async function startExam(id) {
    const exam=examById(id); if(!exam) return;
    // 切换试卷 / 重开同一试卷：先彻底退出当前试卷（含停止听力），防止旧进度或二次播放
    if (isRunning()) {
      const fromId = run.examId;
      if (fromId !== id && !(await confirmAction('你正在模考中，切换试卷会退出当前试卷并重置答题进度。确定切换吗？'))) return;
      if (!isRunning()) return;
      hardReset();
    }
    const secs=sectionsOf(exam);
    run={ examId:id, answers:{}, remain:exam.minutes*60, total:exam.minutes*60, tick:null,
      startedAt:Date.now(), section:secs[0].key, curQid:secs[0].qs[0].id, played:false, playing:false, submitted:false };
    ST.active={ id, startedAt:run.startedAt }; writeState(ST);
    paintExam();
  }

  function startTimerIfNeeded() {
    if (!run || run.tick || run.submitted) return;
    run.tick=setInterval(()=>{
      if (!run || run.submitted) { stopTimer(); return; }
      run.remain--;
      const clock=$('#mockClock'); if(clock) clock.textContent=mmss(run.remain);
      const dial=$('#mockDial'); if(dial) dial.style.setProperty('--progress',(1-run.remain/run.total)*100+'%');
      if(run.remain<=0){ stopTimer(); toast('时间到，已自动交卷'); submitExam(true); }
    },1000);
  }

  // ---------------- 听力播放（常驻播放器；一次、不可暂停/拖拽/倍速、二次确认） ----------------
  function bindAudio(root) {
    const btn=$('#mockPlay', root);
    if(!btn || !run) return;
    const exam=examById(run.examId);
    if(!exam || !exam.audio) return;
    const audio=getAudio();
    const examId=run.examId;
    if(audio.getAttribute('src')!==exam.audio){ audio.src=exam.audio; audio.load(); }
    audio.playbackRate=1;
    syncAudioUI();
    btn.addEventListener('click', async ()=>{
      if(!run || run.examId!==examId || run.played) return;
      // 二次确认（站点统一弹窗）
      if(!(await confirmAction('听力音频仅可播放一次，播放后不可暂停、不可拖动进度、固定正常语速。确认现在开始播放吗？'))) return;
      if(!run || run.examId!==examId || run.played) return;
      const start=audio.currentTime;
      audio.playbackRate=1;
      const p=audio.play();
      if(p && p.then){
        p.then(()=>{
          if(!run || run.examId!==examId) return;
          run.played=true; run.playing=true; run.__playStart=start;
          syncAudioUI();
        }).catch(()=>{
          if(!run || run.examId!==examId) return;
          run.played=false; run.playing=false;
          syncAudioUI();
          toast('播放失败，请检查网络后重试');
        });
      } else {
        run.played=true; run.playing=true; run.__playStart=start;
        syncAudioUI();
      }
    });
  }

  // ---------------- 交卷判分 ----------------
  function submitExam(auto) {
    if(!run||run.submitted) return;
    stopTimer(); run.submitted=true;
    stopAudio(); // 交卷立即停止听力，避免结果页仍继续播放
    const exam=examById(run.examId);
    let right=0; const wrong=[];
    for(const q of exam.questions){
      const chosen=run.answers[q.id];
      if(chosen===q.answer){ right++; }
      else{
        wrong.push(q);
        // 错题自动入错题本，带原题材料
        try{
          if(API.addMistake) API.addMistake({
            id:q.id, src:'真题模考 · '+exam.title,
            q:q.q || (q.type==='listening'?'【听力题】听音频选择（原题见听力音频）':'阅读理解'),
            opts:q.opts, answer:q.answer, chosen:(chosen===undefined?-1:chosen),
            why:(q.passage?('【原题材料】\n'+q.passage+'\n\n'):'')+('【解析】'+q.why),
            passage:q.passage||'', type:q.type
          });
        }catch(e){}
      }
    }
    const total=exam.questions.length, score=right, rate=Math.round(right/total*100);
    // 纳入已完成（可删除），保留答案供回看
    const rec={ id:exam.id, ts:Date.now(), score, total, right, rate, answers:run.answers, auto:!!auto };
    ST.done=ST.done.filter(x=>x.id!==exam.id); ST.done.push(rec);
    ST.active=null; writeState(ST);
    if(API.save) API.save();
    // 兼容旧统计
    try{ const S=getS(); if(S.mockRuns) S.mockRuns.push({ts:Date.now(),score,total,seconds:run.total-run.remain}); save(); }catch(e){}
    const snapshot={answers:Object.assign({},run.answers)};
    run=null;
    paintResult(exam, { answers:snapshot.answers, score, total, rate, right });
    toast(`交卷完成：${score}/${total} 分 · 正确率 ${rate}%`);
  }

  // ---------------- 退出确认（切换功能=退出+重置） ----------------
  async function confirmExitThen(cb) {
    if(!isRunning()){ cb(); return; }
    const ok = await confirmAction('你正在模考中，切换功能将退出本次模考并重置该试卷的答题进度（听力会立即停止且不可再次播放）。确定退出吗？');
    if(!ok || !isRunning()) return;
    const id=run && run.examId; hardReset();
    cb();
    if(id) toast('已退出模考，进度已重置');
  }

  function bindExam(root) {
    $$('[data-mopt]', root).forEach(b=>b.addEventListener('click',()=>{
      const q=currentQuestion().q; run.answers[q.id]=+b.dataset.mopt;
      $$('[data-mopt]',root).forEach(x=>x.classList.remove('is-selected')); b.classList.add('is-selected');
      const dc=$('#mockDoneCount'); if(dc) dc.textContent=Object.keys(run.answers).length;
      const sheet=$('#mockAnswerSheet'); if(sheet) sheet.innerHTML=answerSheetHtml(examById(run.examId));
      bindSheet(root);
    }));
    $('[data-mprev]',root)?.addEventListener('click',()=>move(-1));
    $('[data-mnext]',root)?.addEventListener('click',()=>move(1));
    $$('[data-msec]',root).forEach(b=>b.addEventListener('click',()=>{
      const sec=sectionsOf(examById(run.examId)).find(s=>s.key===b.dataset.msec);
      run.section=sec.key; run.curQid=sec.qs[0].id; paintExam();
    }));
    bindSheet(root);
    bindAudio(root);
    $('#mockSubmit')?.addEventListener('click',async ()=>{
      if(!(await confirmAction('确定提交答卷吗？提交后将自动判分并计入已完成。'))) return;
      if(!isRunning()) return;
      submitExam(false);
    });
    $('#mockExit')?.addEventListener('click',()=>confirmExitThen(paintList));
  }
  function bindSheet(root){
    $$('[data-jump]',root).forEach(b=>b.addEventListener('click',()=>{
      const id=b.dataset.jump, exam=examById(run.examId);
      const sec=sectionsOf(exam).find(s=>s.qs.some(q=>q.id===id));
      run.section=sec.key; run.curQid=id; paintExam();
    }));
  }

  // ---------------- 注册渲染器 + 导航离开拦截 ----------------
  function renderMock(){
    if(run && !run.submitted) paintExam();
    else paintList();
  }
  R.mock = renderMock;
  // app.js 的 init() 在 DOMContentLoaded 里调用 registerLateRenderers()，
  // 会把 app2.js 的旧 R.mock 再覆盖一次。这里用只读访问器彻底锁死新版渲染器，
  // 旧模块后续再怎么赋值都无效，杜绝"重新进入又是旧排版 / 还能继续答题"。
  function reclaim(){
    try {
      Object.defineProperty(R, 'mock', { get: () => renderMock, set: () => {}, configurable: false });
    } catch (e) { R.mock = renderMock; }
    // 只有在确实看到旧版排版被渲染时才重绘；绝不打断用户已经新开的一局
    const legacy = document.querySelector('#view-mock #dial, #view-mock #startTimer');
    if (legacy) { hardReset(); paintList(); }
  }
  if (document.readyState === 'complete') setTimeout(reclaim, 0);
  else window.addEventListener('load', () => setTimeout(reclaim, 0));
  document.addEventListener('DOMContentLoaded', () => setTimeout(reclaim, 0));

  // 捕获阶段拦截所有会切换模块的点击：做题中切换功能 → 确认 + 彻底退出
  document.addEventListener('click', function(e){
    const el = e.target && e.target.closest && e.target.closest('.nav-item, [data-goto], [data-go], #goMock, #startPathBtn');
    if(!el) return;
    const target = el.dataset.view || el.dataset.goto || el.dataset.go || (el.id==='goMock'?'mock':null);
    if(!target || target==='mock') return;
    if(!isRunning()) return;
    e.preventDefault(); e.stopPropagation();
    confirmExitThen(()=>{ if(API.navigate) API.navigate(target); });
  }, true);

  // 离开网站 / 刷新 / bfcache 恢复：彻底重置，绝不残留可继续答题的试卷或听力
  // 注意：不注册 beforeunload，避免浏览器弹出原生"离开此网站"提示（会出现非本站风格的按钮）
  window.addEventListener('pagehide', hardReset);
  window.addEventListener('pageshow', function(e){
    if(!e.persisted) return;
    hardReset();
    if(API.navigate) API.navigate('dashboard');
  });
  // 后置脚本到达时补绘当前视图（手机弱网下用户可能已先进入概览/其他模块）
  if (API.refresh) API.refresh();
})();
