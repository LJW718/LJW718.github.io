/*!
 * Tools private gate — show nav / pages only after local unlock.
 * Unlock: ?tools=<key>   Lock: ?tools=0
 */
(function () {
  'use strict';

  var cfg = window.__TOOLS_GATE__;
  if (!cfg || !cfg.private) return;

  var STORAGE_KEY = 'tools_unlocked_v1';
  var params = new URLSearchParams(location.search);
  var q = params.get('tools');

  if (q === '0' || q === 'off' || q === 'lock') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    stripQuery();
  } else if (q != null && q !== '' && q === String(cfg.key || '')) {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {}
    stripQuery();
  }

  function stripQuery() {
    params.delete('tools');
    var next = location.pathname + (params.toString() ? '?' + params.toString() : '') + location.hash;
    if (history && history.replaceState) {
      history.replaceState(null, '', next);
    }
  }

  function unlocked() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function isToolsPath(pathname) {
    return /^\/tools(\/|$)/i.test(pathname || location.pathname);
  }

  function showNav(on) {
    document.querySelectorAll('.js-tools-nav').forEach(function (el) {
      el.hidden = !on;
    });
  }

  function ensureLockUI() {
    var existing = document.getElementById('tools-lock');
    if (existing) return existing;
    var el = document.createElement('div');
    el.id = 'tools-lock';
    el.className = 'tools-lock';
    el.hidden = true;
    el.innerHTML =
      '<div class="tools-lock-panel">' +
      '<h1>Tools</h1>' +
      '<p>该区域仅本人可见。请在本机用解锁链接打开一次。</p>' +
      '</div>';
    var host = document.querySelector('.docs-container') || document.body;
    host.parentNode.insertBefore(el, host);
    return el;
  }

  function apply() {
    var on = unlocked();
    showNav(on);
    if (!isToolsPath()) {
      var lock = document.getElementById('tools-lock');
      if (lock) lock.hidden = true;
      var docs = document.querySelector('.docs-container');
      if (docs) docs.hidden = false;
      document.body.classList.remove('tools-locked');
      return;
    }
    var lockEl = ensureLockUI();
    var docsEl = document.querySelector('.docs-container');
    if (on) {
      lockEl.hidden = true;
      if (docsEl) docsEl.hidden = false;
      document.body.classList.remove('tools-locked');
    } else {
      lockEl.hidden = false;
      if (docsEl) docsEl.hidden = true;
      document.body.classList.add('tools-locked');
    }
  }

  apply();
  document.addEventListener('page:load', apply);
  window.__toolsGateApply = apply;
})();
