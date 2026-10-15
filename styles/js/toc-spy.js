/*!
 * TOC spy — highlight sidenav item for the heading under the navbar.
 * Scroll root: window only (no docked panel scroll).
 */
(function () {
  'use strict';

  var ticking = false;
  var bound = false;
  var lockedLink = null;
  var SCROLL_PAD = 16;

  function escapeId(id) {
    if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(id);
    return String(id).replace(/([^a-zA-Z0-9_-])/g, '\\$1');
  }

  function getPanel() {
    return document.querySelector('.docs-content');
  }

  function stickyTopPx() {
    var top = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--sticky-top')
    );
    return isFinite(top) && top > 0 ? top : 50;
  }

  function resolveMarker(el) {
    if (!el) return null;
    if (el.classList) {
      if (el.classList.contains('anchor-target') || el.classList.contains('anchor')) {
        return el.parentElement || el;
      }
    }
    if (el.tagName && !/^H[1-6]$/i.test(el.tagName)) {
      var h = el.closest && el.closest('h1, h2, h3, h4, h5, h6');
      if (h) return h;
    }
    return el;
  }

  function findTarget(id) {
    if (!id) return null;
    var panel = getPanel() || document;
    var safe = escapeId(id);
    var raw = null;
    try {
      raw =
        panel.querySelector('h1#' + safe + ', h2#' + safe + ', h3#' + safe + ', h4#' + safe) ||
        panel.querySelector('.anchor-target#' + safe) ||
        document.getElementById(id) ||
        panel.querySelector('a.anchor[name="' + id.replace(/"/g, '\\"') + '"]') ||
        panel.querySelector('[id="' + id.replace(/"/g, '\\"') + '"]');
    } catch (err) {
      raw = document.getElementById(id);
    }
    return resolveMarker(raw);
  }

  function decodeHash(href) {
    var raw = String(href || '').replace(/^#/, '');
    if (!raw) return '';
    try {
      return decodeURIComponent(raw);
    } catch (err) {
      return raw;
    }
  }

  function collectItems() {
    var links = document.querySelectorAll('.sidebar .sidenav a[href^="#"]');
    var items = [];
    var seen = {};
    for (var i = 0; i < links.length; i++) {
      var id = decodeHash(links[i].getAttribute('href'));
      if (!id || seen[id]) continue;
      var el = findTarget(id);
      if (!el) continue;
      seen[id] = true;
      items.push({ id: id, el: el, link: links[i] });
    }
    return items;
  }

  function probeY() {
    return stickyTopPx() + SCROLL_PAD;
  }

  function clearActive() {
    var actives = document.querySelectorAll('.sidebar .sidenav li.active');
    for (var i = 0; i < actives.length; i++) {
      actives[i].classList.remove('active');
    }
  }

  function getTocScroller() {
    var ul = document.querySelector('.sidebar .nav.sidenav');
    var shell = document.querySelector('.sidebar .sidenav-shell');
    if (ul && ul.scrollHeight > ul.clientHeight + 1) return ul;
    if (shell && shell.scrollHeight > shell.clientHeight + 1) return shell;
    return ul || shell;
  }

  function scrollTocToLink(link) {
    if (!link) return;
    var scroller = getTocScroller();
    if (!scroller) return;
    var max = scroller.scrollHeight - scroller.clientHeight;
    if (max <= 1) return;

    var box = scroller.getBoundingClientRect();
    var linkRect = link.getBoundingClientRect();
    var pad = 12;

    if (linkRect.top < box.top + pad) {
      scroller.scrollTop += linkRect.top - box.top - pad;
    } else if (linkRect.bottom > box.bottom - pad) {
      scroller.scrollTop += linkRect.bottom - box.bottom + pad;
    }
  }

  function setActive(link) {
    clearActive();
    if (!link) return;
    var node = link.parentElement;
    while (node) {
      if (node.tagName === 'LI') node.classList.add('active');
      if (
        node.id === 'navigation' ||
        (node.classList && node.classList.contains('sidenav-shell'))
      ) {
        break;
      }
      node = node.parentElement;
    }
    scrollTocToLink(link);
  }

  function update() {
    if (lockedLink) {
      setActive(lockedLink);
      return;
    }

    var items = collectItems();
    if (!items.length) return;

    var y = probeY();
    var current = items[0];
    for (var i = 0; i < items.length; i++) {
      if (items[i].el.getBoundingClientRect().top <= y + 1) {
        current = items[i];
      } else break;
    }

    var docEl = document.documentElement;
    var maxScroll =
      Math.max(docEl.scrollHeight, document.body.scrollHeight) -
      window.innerHeight;
    var scrollY = window.scrollY || window.pageYOffset || 0;
    if (maxScroll > 1 && scrollY >= maxScroll - 2) {
      current = items[items.length - 1];
    }

    setActive(current.link);
  }

  function onScroll() {
    if (lockedLink) return;
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      if (lockedLink) return;
      update();
    });
  }

  function lockClick(link) {
    lockedLink = link;
    setActive(link);
  }

  window.releaseTocClickLock = function () {
    if (!lockedLink) return;
    lockedLink = null;
  };

  function scrollToId(id) {
    var target = findTarget(id);
    if (!target) return false;
    if (typeof window.scrollDocsToElement === 'function') {
      return window.scrollDocsToElement(target, SCROLL_PAD);
    }
    target.scrollIntoView({ behavior: 'auto', block: 'start' });
    return true;
  }

  function bind() {
    if (bound) return;
    bound = true;

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener(
      'wheel',
      function () {
        if (typeof window.releaseTocClickLock === 'function') {
          window.releaseTocClickLock();
        }
      },
      { passive: true }
    );
    window.addEventListener(
      'touchmove',
      function () {
        if (typeof window.releaseTocClickLock === 'function') {
          window.releaseTocClickLock();
        }
      },
      { passive: true }
    );

    document.addEventListener('click', function (e) {
      var a = e.target.closest
        ? e.target.closest('.sidebar .sidenav a[href^="#"]')
        : null;
      if (!a) return;
      var id = decodeHash(a.getAttribute('href'));
      if (!id) return;

      e.preventDefault();
      e.stopPropagation();

      var focused = document.querySelectorAll('.sidebar .sidenav a');
      for (var i = 0; i < focused.length; i++) {
        if (focused[i].blur) focused[i].blur();
      }

      lockClick(a);
      scrollToId(id);
      if (a.blur) a.blur();
    });

    document.addEventListener('page:load', function () {
      if (typeof window.releaseTocClickLock === 'function') {
        window.releaseTocClickLock();
      }
      setTimeout(update, 60);
      setTimeout(update, 320);
    });

    setTimeout(update, 60);
    setTimeout(update, 320);
  }

  window.disableBootstrapScrollspy = function () {
    if (typeof window.jQuery === 'undefined') return;
    var $ = window.jQuery;
    try {
      $(document.body).removeData('bs.scrollspy').off('.bs.scrollspy');
      $('.docs-content').removeData('bs.scrollspy').off('.bs.scrollspy');
    } catch (err) {}
  };

  window.refreshTocSpy = update;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
