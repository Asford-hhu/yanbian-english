// 功课卡装饰叠层：给四张功课卡挂上右下角的线稿插图（不改 index.html 的卡片结构）
// 页眉大字旁：按当前模块显示侧栏里对应的那个线性图标（切换模块自动更换）
// 用法：<link rel="stylesheet" href="overlay.css">  +  <script src="overlay.js" defer></script>
(() => {
  const ART = {
      "reading": "<svg class=\"orn\" viewBox=\"0 0 100 100\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.9\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">\n  <path d=\"M50 34c-7-5-18-7-29-6v34c11-1 22 1 29 6\"/>\n  <path d=\"M50 34c7-5 18-7 29-6v34c-11-1-22 1-29 6\"/>\n  <path d=\"M50 34v34\"/>\n  <path d=\"M29 41h12M29 49h12M29 57h9\"/>\n  <path d=\"M60 41h13M60 49h13\"/>\n  <g transform=\"rotate(-6 64 82)\">\n    <rect x=\"44\" y=\"78\" width=\"24\" height=\"8.5\" rx=\"4.2\"/>\n    <path d=\"M68 78l6.6-2.4v13.4L68 86.5\"/>\n  </g>\n</svg>",
      "writing": "<svg class=\"orn\" viewBox=\"0 0 100 100\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.9\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">\n  <path d=\"M22 18h34a5 5 0 0 1 5 5v40a5 5 0 0 1-5 5H22a5 5 0 0 1-5-5V23a5 5 0 0 1 5-5z\"/>\n  <path d=\"M25 31h24M25 40h28M25 49h18\"/>\n  <g transform=\"rotate(-42 70 77)\">\n    <rect x=\"56\" y=\"72\" width=\"26\" height=\"10\" rx=\"3\"/>\n    <path d=\"M82 72l8 5-8 5\"/>\n    <path d=\"M76 72v10\"/>\n  </g>\n</svg>",
      "vocab": "<svg class=\"orn\" viewBox=\"0 0 100 100\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.9\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">\n  <path d=\"M30 24h46a5 5 0 0 1 5 5v34a5 5 0 0 1-5 5H30a5 5 0 0 1-5-5V29a5 5 0 0 1 5-5z\"/>\n  <path d=\"M60 24v11l6-4 6 4V24\"/>\n  <path d=\"M36 38h28M36 47h20\"/>\n  <path d=\"M16 38h46a5 5 0 0 1 5 5v32a5 5 0 0 1-5 5H16a5 5 0 0 1-5-5V43a5 5 0 0 1 5-5z\"/>\n  <path d=\"M22 52h30M22 61h20M22 70h12\"/>\n</svg>",
      "listening": "<svg class=\"orn\" viewBox=\"0 0 100 100\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.9\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">\n  <path d=\"M26 58V46a24 24 0 0 1 48 0v12\"/>\n  <path d=\"M32 46a18 18 0 0 1 36 0\"/>\n  <rect x=\"19\" y=\"52\" width=\"13\" height=\"24\" rx=\"6.5\"/>\n  <rect x=\"68\" y=\"52\" width=\"13\" height=\"24\" rx=\"6.5\"/>\n</svg>"
  };

  // 侧栏各模块的线性图标（与 index.html 的 .nav-item svg 完全一致），供大字旁插画使用
  const NAV_ART = {
    dashboard: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
    study:     '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z"/><path d="M4 5.5V21"/><path d="M9 8h7M9 12h5"/>',
    reading:   '<path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1z"/><path d="M12 6v14"/>',
    writing:   '<path d="m4 20 4.5-1 10-10-3.5-3.5-10 10z"/><path d="m14.5 6.5 3.5 3.5"/><path d="M4 20h16"/>',
    vocab:     '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/><path d="M9 8h6"/>',
    listening: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="7" rx="1"/><rect x="17" y="13" width="4" height="7" rx="1"/><path d="M19 20a3 3 0 0 1-3 2h-2"/>',
    mistakes:  '<path d="M5 4h14v16l-7-3-7 3z"/><path d="M9 9h6M9 13h4"/>',
    mock:      '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 2h6"/>',
    stats:     '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    resources: '<path d="M5 4h4l2 2h8v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M9 12h6M9 15h4"/>',
    music:     '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    news:      '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>'
  };
  const navSvg = (key) => `<svg class="orn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${NAV_ART[key] || ''}</svg>`;

  const paint = () => {
    document.querySelectorAll('.quick-card').forEach((card) => {
      const key = card.dataset.goto;
      if (!ART[key] || card.querySelector('.card-orn')) return;
      const span = document.createElement('span');
      span.className = 'card-orn';
      span.setAttribute('aria-hidden', 'true');
      span.innerHTML = ART[key];
      card.appendChild(span);
    });
  };

  // 大字旁插画：跟随当前模块的侧栏图标，切换模块时自动更新
  let headViewKey = null;
  const currentView = () => {
    if (window.__YANBIAN__ && typeof window.__YANBIAN__.currentView === 'function') return window.__YANBIAN__.currentView();
    const av = document.querySelector('.view.is-active');
    return av ? av.dataset.view : 'dashboard';
  };
  const paintHead = () => {
    const host = document.querySelector('.page-head__title');
    if (!host) return;
    const view = currentView() || 'dashboard';
    if (headViewKey === view && host.querySelector('.head-ornts')) return;
    headViewKey = view;
    let wrap = host.querySelector('.head-ornts');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'head-ornts';
      wrap.setAttribute('aria-hidden', 'true');
      host.appendChild(wrap);
    }
    wrap.innerHTML = NAV_ART[view] ? `<span class="head-ornt" data-view="${view}">${navSvg(view)}</span>` : '';
  };

  const decorate = () => { paint(); paintHead(); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', decorate);
  else decorate();

  // 视图重渲染 / 切换（#viewTitle 文本变化、class 切换）都会触发，补挂或更新插画
  new MutationObserver(decorate).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
})();
