/*!
 * Sync sticky CSS vars from navbar height.
 * Page uses native window scroll; sidebar + content use CSS position:sticky.
 */
(function () {
  'use strict';

  var listenersBound = false;

  function stickyTopPx() {
    var top = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--sticky-top')
    );
    return isFinite(top) && top > 0 ? top : 50;
  }

  function measure() {
    var nav = document.querySelector('.docs-nav');
    if (!nav) return;

    var root = document.documentElement;
    var navH = Math.round(nav.getBoundingClientRect().height) || 50;

    root.style.setProperty('--sticky-nav-h', navH + 'px');
    root.style.setProperty('--sticky-top', navH + 'px');
    root.style.setProperty(
      '--sticky-panel-h',
      Math.max(200, Math.round(window.innerHeight - navH - 24)) + 'px'
    );
  }

  function scrollWindowInstant(y) {
    var top = Math.max(0, y);
    if (typeof window.scrollTo === 'function') {
      window.scrollTo(0, top);
    } else {
      window.scrollY = top;
      document.documentElement.scrollTop = top;
      document.body.scrollTop = top;
    }
  }

  function bind() {
    if (listenersBound) {
      measure();
      return;
    }
    listenersBound = true;

    measure();
    window.addEventListener('resize', measure, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', measure);
    }
    document.addEventListener('page:load', function () {
      measure();
      if (typeof window.disableBootstrapScrollspy === 'function') {
        window.disableBootstrapScrollspy();
      }
      if (typeof window.refreshTocSpy === 'function') {
        window.refreshTocSpy();
      }
    });
    if (typeof window.disableBootstrapScrollspy === 'function') {
      window.disableBootstrapScrollspy();
    }
    setTimeout(measure, 50);
    setTimeout(measure, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  window.syncStickyOffsets = measure;

  window.ensureStickyDock = measure;

  window.isStickyDocked = function () {
    return false;
  };

  /** Scroll so `el` sits just under the navbar. */
  window.scrollDocsToElement = function (el, pad) {
    if (!el) return false;
    pad = typeof pad === 'number' ? pad : 16;
    var top = stickyTopPx();
    var y =
      el.getBoundingClientRect().top +
      (window.scrollY || window.pageYOffset || 0) -
      top -
      pad;
    scrollWindowInstant(Math.max(0, y));
    return true;
  };
})();
