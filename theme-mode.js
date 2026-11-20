/* ============================================================
   theme-mode.js — 砚边 · 双主题切换（浅色 / 深色 / 跟随系统）
   ------------------------------------------------------------
   ★ 独立、零侵入：不修改 app.js 的任何函数，不重复绑定切换按钮，
     不改任何朗读 / 搜索 / 筛选 / 文章单选逻辑，不改 HTML 文字。
   ★ 与现有机制协作：app.js 的 applyTheme()/toggleTheme() 继续负责
     data-theme 的 light|dark；本脚本只做「系统自动跟随」与三态记忆。
   ★ 三种模式：'light' 手动浅 / 'dark' 手动深 / 'auto' 跟随系统。
   ★ 对外 API：window.YBTheme.set/get/resolved/toggle/followSystem。

   接入（唯一需要的一行，放在所有已有 script 之后）：
     <script src="theme-mode.js"></script>
   不接入也不影响页面：手动切换仍由 app.js 正常工作，纯 CSS 浅/深主题照常生效。
   ============================================================ */
(function () {
  'use strict';

  var ROOT = document.documentElement;
  var KEY  = 'yb_theme_mode_v1';                  // 独立偏好键，不碰 yansbian_study_v1
  var APP_KEY = 'yansbian_study_v1';             // app.js 的状态键（只读）
  var MODES = ['light', 'dark', 'auto'];

  /* ---------- 系统深色探测（老内核 / 微信 X5 兜底） ---------- */
  function mq() {
    try { return window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null; }
    catch (e) { return null; }
  }
  function systemDark() { var m = mq(); return !!(m && m.matches); }

  /* ---------- 偏好读写（localStorage 被禁用时优雅降级） ---------- */
  function readMode() {
    try {
      var v = localStorage.getItem(KEY);
      if (MODES.indexOf(v) !== -1) return v;
      /* 首次访问：若用户在旧版手动切过深色，尊重它；否则默认跟随系统 */
      var raw = localStorage.getItem(APP_KEY);
      if (raw) {
        try { if (JSON.parse(raw).theme === 'dark') return 'dark'; } catch (e) {}
      }
      return 'auto';
    } catch (e) { return 'auto'; }
  }
  function writeMode(m) { try { localStorage.setItem(KEY, m); } catch (e) {} }

  /* ---------- 解析：模式 → 实际主题 ---------- */
  function resolve(mode) {
    return mode === 'auto' ? (systemDark() ? 'dark' : 'light') : mode;
  }

  /* ---------- 同步 app.js 内部状态，保证现有切换按钮取反正确 ---------- */
  function syncAppState(theme) {
    try {
      var api = window.__YANBIAN__;
      if (api && typeof api.getS === 'function') api.getS().theme = theme;
    } catch (e) {}
  }

  /* ---------- 手机状态栏颜色随主题变化 ---------- */
  function syncMeta(theme) {
    try {
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', theme === 'dark' ? '#121028' : '#f7f4ff');
    } catch (e) {}
  }

  /* ---------- 应用主题（幂等，可重复调用） ---------- */
  function apply() {
    var mode  = readMode();
    var theme = resolve(mode);
    ROOT.setAttribute('data-theme', theme);        // 图标 / :root[data-theme=...] 命中
    ROOT.setAttribute('data-theme-mode', mode);    // 供 CSS 扩展判断（不影响现有规则）
    syncMeta(theme);
    syncAppState(theme);
    return theme;
  }

  /* ---------- 系统主题变化：仅「跟随系统」模式自动刷新 ---------- */
  var m = mq();
  if (m) {
    var onChange = function () { if (readMode() === 'auto') apply(); };
    try {
      if (typeof m.addEventListener === 'function') m.addEventListener('change', onChange);
      else if (typeof m.addListener === 'function') m.addListener(onChange);
    } catch (e) {}
  }

  /* ---------- 与现有两个切换按钮协作（捕获阶段旁观，绝不阻止原逻辑） ----------
     app.js 在按钮的冒泡/目标阶段绑定了 toggleTheme()；本监听器在捕获阶段
     先注册，用 setTimeout(0) 等 app.js 处理完，再读取它写入的新 data-theme，
     记为「手动偏好」并退出自动跟随。不影响任何既有行为与提示文案。        */
  function watchToggle(e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (!t.closest('#themeToggle, #themeToggleTop')) return;
    setTimeout(function () {
      var v = ROOT.getAttribute('data-theme');
      writeMode(v === 'dark' ? 'dark' : 'light');
      ROOT.setAttribute('data-theme-mode', 'manual');
    }, 0);
  }
  document.addEventListener('click', watchToggle, true);

  /* ---------- 对外 API ---------- */
  window.YBTheme = {
    /** 设置模式：'light' | 'dark' | 'auto' */
    set: function (mode) {
      if (MODES.indexOf(mode) === -1) return;
      writeMode(mode);
      apply();
    },
    /** 当前模式 */
    get: function () { return readMode(); },
    /** 当前实际生效的主题 */
    resolved: function () { return resolve(readMode()); },
    /** 在浅/深之间手动切换一次 */
    toggle: function () {
      writeMode(resolve(readMode()) === 'dark' ? 'light' : 'dark');
      return apply();
    },
    /** 恢复跟随系统 */
    followSystem: function () { writeMode('auto'); return apply(); }
  };

  /* ---------- 启动：立即 + DOMContentLoaded 之后 + load 之后各兜一次 ----------
     立即执行让首屏尽早是正确颜色；DCL/load 兜底确保在 app.js 的 init()
     执行 applyTheme() 之后仍能拿到最终控制权，避免被回写成 light。        */
  apply();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(apply, 0); });
  } else {
    setTimeout(apply, 0);
  }
  window.addEventListener('load', function () { setTimeout(apply, 0); });
})();
