/* ============================================================
   阅读页 · 选篇器
   ------------------------------------------------------------
   把 #readingSelect 换成自定义下拉，但不改 app.js 一行：
   - 原生 select 留在 DOM 里（只是视觉上隐藏），选中后写回 value
     并派发 change 事件，app.js 原有的监听照常工作；
   - 视图重渲染（切类别、答题）时用 MutationObserver 重新接管；
   - 支持搜索、↑↓ 选择、↵ 确认、Esc 关闭、点外部关闭。
   删掉这个 <script> 与 picker.css，阅读页立刻退回原生下拉。
   ============================================================ */
(function () {
  'use strict';

  var NS = 'picker';

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  var ICON_DOC = '<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M10 12h6M10 16h6"/></svg>';
  var ICON_CHEV = '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
  var ICON_SEARCH = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/></svg>';

  /* 选项文本形如 "The Quiet Power of Deep Work · 六级" */
  function splitOption(text) {
    var i = text.lastIndexOf(' · ');
    if (i < 0) return { title: text, level: '' };
    return { title: text.slice(0, i), level: text.slice(i + 3) };
  }

  function enhance(select) {
    if (!select || select.dataset[NS]) return null;
    select.dataset[NS] = '1';

    var root = el('div', 'picker');
    var btn = el('button', 'picker__btn');
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML =
      '<span class="picker__ico">' + ICON_DOC + '</span>' +
      '<span class="picker__label"></span>' +
      '<span class="picker__lv" hidden></span>' +
      '<span class="picker__chev">' + ICON_CHEV + '</span>';

    var labelEl = btn.querySelector('.picker__label');
    var lvEl = btn.querySelector('.picker__lv');

    root.appendChild(btn);
    select.parentNode.insertBefore(root, select.nextSibling);
    document.documentElement.classList.add('picker-ready');

    var panel = null, listEl = null, inputEl = null, rows = [], active = -1, isOpen = false;

    function currentOption() {
      return select.options[select.selectedIndex] || select.options[0];
    }

    function syncLabel() {
      var o = currentOption();
      if (!o) { labelEl.textContent = '暂无文章'; lvEl.hidden = true; return; }
      var p = splitOption(o.textContent.trim());
      labelEl.textContent = p.title;
      btn.title = o.textContent.trim();
      if (p.level) { lvEl.textContent = p.level; lvEl.hidden = false; }
      else lvEl.hidden = true;
    }

    function items() {
      return Array.prototype.map.call(select.options, function (o, i) {
        var p = splitOption(o.textContent.trim());
        return { i: i, value: o.value, title: p.title, level: p.level, full: o.textContent.trim() };
      });
    }

    function renderList(filter) {
      var q = (filter || '').trim().toLowerCase();
      var data = items().filter(function (it) {
        return !q || it.full.toLowerCase().indexOf(q) >= 0;
      });
      listEl.innerHTML = '';
      rows = [];
      if (!data.length) {
        listEl.appendChild(el('div', 'picker__none', '没有匹配的篇目，换个关键词试试。'));
        active = -1;
        return;
      }
      var pad = String(items().length).length;
      data.forEach(function (it, k) {
        var row = el('div', 'picker__row');
        row.setAttribute('role', 'option');
        row.dataset.value = it.value;
        row.innerHTML =
          '<span class="picker__no">' + String(it.i + 1).padStart(pad, '0') + '</span>' +
          '<span class="picker__t"></span>' +
          (it.level ? '<span class="picker__lv">' + it.level + '</span>' : '<span></span>');
        row.querySelector('.picker__t').textContent = it.title;
        if (it.value === select.value) row.classList.add('is-active');
        row.addEventListener('mouseenter', function () { setActive(k, false); });
        row.addEventListener('click', function () { choose(it.value); });
        listEl.appendChild(row);
        rows.push(row);
      });
      active = rows.findIndex(function (r) { return r.classList.contains('is-active'); });
      if (active < 0) { active = 0; if (rows[0]) rows[0].classList.add('is-active'); }
      scrollActiveIntoView(false);
    }

    function setActive(k, scroll) {
      if (!rows.length) return;
      if (k < 0) k = rows.length - 1;
      if (k >= rows.length) k = 0;
      rows.forEach(function (r, i) { r.classList.toggle('is-active', i === k); });
      active = k;
      if (scroll !== false) scrollActiveIntoView(true);
    }

    function scrollActiveIntoView(smooth) {
      var row = rows[active];
      if (!row) return;
      var top = row.offsetTop, bottom = top + row.offsetHeight;
      var viewTop = listEl.scrollTop, viewBottom = viewTop + listEl.clientHeight;
      if (top < viewTop + 4) listEl.scrollTo({ top: top - 6, behavior: smooth ? 'smooth' : 'auto' });
      else if (bottom > viewBottom - 4) listEl.scrollTo({ top: bottom - listEl.clientHeight + 6, behavior: smooth ? 'smooth' : 'auto' });
    }

    function buildPanel() {
      panel = el('div', 'picker__panel');
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', '选择文章');

      var search = el('div', 'picker__search');
      search.innerHTML = ICON_SEARCH;
      inputEl = el('input');
      inputEl.type = 'search';
      inputEl.placeholder = '搜标题 / 级别…';
      inputEl.setAttribute('autocomplete', 'off');
      inputEl.setAttribute('autocorrect', 'off');
      inputEl.setAttribute('spellcheck', 'false');
      inputEl.setAttribute('enterkeyhint', 'search');
      search.appendChild(inputEl);

      listEl = el('div', 'picker__list');
      listEl.setAttribute('role', 'listbox');

      var foot = el('div', 'picker__foot');
      foot.innerHTML = '<span class="picker__hint"><kbd>↑</kbd><kbd>↓</kbd> 选择 · <kbd>↵</kbd> 打开 · <kbd>esc</kbd> 关闭</span><span class="picker__total"></span>';

      panel.appendChild(search);
      panel.appendChild(listEl);
      panel.appendChild(foot);
      root.appendChild(panel);

      inputEl.addEventListener('input', function () { renderList(inputEl.value); });
      panel.addEventListener('keydown', onPanelKey);
      panel.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    }

    /* 面板放在哪：下方放不下就翻到上面，高度按可见区域截。
       手机上还要算上系统键盘压缩后的 visualViewport，否则面板会被键盘顶出屏幕。 */
    function positionPanel() {
      if (!panel) return;
      var vp = window.visualViewport;
      var viewH = vp ? vp.height : window.innerHeight;
      var r = btn.getBoundingClientRect();
      var top = Math.max(r.top, 0);
      var bottom = Math.min(r.bottom, viewH);
      var gap = 8, edge = 10;
      var spaceBelow = viewH - bottom - gap - edge;
      var spaceAbove = top - gap - edge;
      var wanted = Math.min(viewH * 0.62, 520);

      var flip = spaceBelow < Math.min(wanted, 300) && spaceAbove > spaceBelow;
      panel.classList.toggle('is-flip', flip);
      var avail = Math.max(180, flip ? spaceAbove : spaceBelow);
      panel.style.maxHeight = Math.min(wanted, avail) + 'px';

      /* 面板比触发条宽时，别让它冲出右边界 */
      var overflowRight = r.left + Math.max(r.width, 320) - (window.innerWidth - edge);
      panel.style.left = overflowRight > 0 ? -overflowRight + 'px' : '0px';
      panel.style.right = 'auto';
      panel.style.minWidth = Math.min(r.width, window.innerWidth - edge * 2) + 'px';
    }

    function onPanelKey(e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        var row = rows[active];
        if (row) choose(row.dataset.value);
      } else if (e.key === 'Escape') { e.preventDefault(); close(true); }
      else if (e.key === 'Tab') { close(true); }
    }

    function open() {
      if (isOpen || select.disabled) return;
      if (!panel) buildPanel();
      panel.style.display = '';
      root.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      isOpen = true;
      inputEl.value = '';
      renderList('');
      var total = panel.querySelector('.picker__total');
      if (total) total.textContent = '共 ' + select.options.length + ' 篇';
      listEl.scrollTop = 0;
      positionPanel();
      setTimeout(function () { if (window.innerWidth > 720) inputEl.focus(); }, 30);
      document.addEventListener('pointerdown', onDocDown, true);
      window.addEventListener('resize', positionPanel);
      window.addEventListener('scroll', positionPanel, { passive: true });
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', positionPanel);
        window.visualViewport.addEventListener('scroll', positionPanel);
      }
    }

    function close(focusBack) {
      if (!isOpen) return;
      isOpen = false;
      root.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      if (panel) { panel.style.display = 'none'; panel.classList.remove('is-flip'); }
      document.removeEventListener('pointerdown', onDocDown, true);
      window.removeEventListener('resize', positionPanel);
      window.removeEventListener('scroll', positionPanel);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', positionPanel);
        window.visualViewport.removeEventListener('scroll', positionPanel);
      }
      if (focusBack) btn.focus();
    }

    function onDocDown(e) {
      if (!root.contains(e.target)) close(false);
    }

    function choose(value) {
      if (select.value !== value) {
        select.value = value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      syncLabel();
      close(true);
    }

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (isOpen) close(true); else open();
    });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });

    select.addEventListener('change', syncLabel);

    /* 选项被外部重写（切类别时 app.js 会重写 innerHTML）→ 同步文案 */
    new MutationObserver(function () { syncLabel(); if (isOpen) renderList(inputEl ? inputEl.value : ''); })
      .observe(select, { childList: true });

    syncLabel();
    return root;
  }

  function scan() {
    var sels = document.querySelectorAll('select#readingSelect');
    for (var i = 0; i < sels.length; i++) enhance(sels[i]);
  }

  function boot() {
    scan();
    var view = document.getElementById('view-reading');
    if (!view) return;
    new MutationObserver(function () {
      if (boot._t) return;
      boot._t = requestAnimationFrame(function () { boot._t = null; scan(); });
    }).observe(view, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('hashchange', scan);
})();
