// 功课卡装饰叠层：给四张功课卡挂上右下角的线稿插图（不改 index.html 的卡片结构）
// 用法：<link rel="stylesheet" href="overlay.css">  +  <script src="overlay.js" defer></script>
(() => {
  const ART = {
      "reading": "<svg class=\"orn\" viewBox=\"0 0 100 100\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">\n  <path d=\"M50 34c-7-5-18-7-29-6v34c11-1 22 1 29 6\"/>\n  <path d=\"M50 34c7-5 18-7 29-6v34c-11-1-22 1-29 6\"/>\n  <path d=\"M50 34v34\"/>\n  <path d=\"M29 41h12M29 49h12M29 57h9\"/>\n  <path d=\"M60 41h13M60 49h13\"/>\n  <g transform=\"rotate(-6 64 82)\">\n    <rect x=\"44\" y=\"78\" width=\"24\" height=\"8.5\" rx=\"4.2\"/>\n    <path d=\"M68 78l6.6-2.4v13.4L68 86.5\"/>\n  </g>\n</svg>",
      "writing": "<svg class=\"orn\" viewBox=\"0 0 100 100\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">\n  <path d=\"M22 18h34a5 5 0 0 1 5 5v40a5 5 0 0 1-5 5H22a5 5 0 0 1-5-5V23a5 5 0 0 1 5-5z\"/>\n  <path d=\"M25 31h24M25 40h28M25 49h18\"/>\n  <g transform=\"rotate(-42 70 77)\">\n    <rect x=\"56\" y=\"72\" width=\"26\" height=\"10\" rx=\"3\"/>\n    <path d=\"M82 72l8 5-8 5\"/>\n    <path d=\"M76 72v10\"/>\n  </g>\n</svg>",
      "vocab": "<svg class=\"orn\" viewBox=\"0 0 100 100\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">\n  <path d=\"M30 24h46a5 5 0 0 1 5 5v34a5 5 0 0 1-5 5H30a5 5 0 0 1-5-5V29a5 5 0 0 1 5-5z\"/>\n  <path d=\"M60 24v11l6-4 6 4V24\"/>\n  <path d=\"M36 38h28M36 47h20\"/>\n  <path d=\"M16 38h46a5 5 0 0 1 5 5v32a5 5 0 0 1-5 5H16a5 5 0 0 1-5-5V43a5 5 0 0 1 5-5z\"/>\n  <path d=\"M22 52h30M22 61h20M22 70h12\"/>\n</svg>",
      "listening": "<svg class=\"orn\" viewBox=\"0 0 100 100\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">\n  <path d=\"M26 58V46a24 24 0 0 1 48 0v12\"/>\n  <rect x=\"19\" y=\"52\" width=\"13\" height=\"24\" rx=\"6.5\"/>\n  <rect x=\"68\" y=\"52\" width=\"13\" height=\"24\" rx=\"6.5\"/>\n  <path d=\"M86 56a9 9 0 0 1 0 18\"/>\n  <path d=\"M91 50a16 16 0 0 1 0 30\"/>\n</svg>"
};

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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paint);
  else paint();

  // 概览视图重渲染会重建卡片，补挂一次
  new MutationObserver(paint).observe(document.body, { childList: true, subtree: true });
})();
