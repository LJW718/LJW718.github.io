/*!
 * Stick TOC + content under transparent-rain; keep both panels equal
 */
(function () {
  'use strict';

  var cachedRailH = 0;

  function clearInlineColumnSizes() {
    var cols = document.querySelectorAll(
      '.docs-container > .row > .col-md-3, .docs-container > .row > .col-md-9'
    );
    for (var i = 0; i < cols.length; i++) {
      cols[i].style.height = '';
      cols[i].style.maxHeight = '';
      cols[i].style.minHeight = '';
    }
  }

  function measureRailHeight() {
    var content = document.querySelector('.docs-container .docs-content');
    if (!content) {
      cachedRailH = 0;
      return 0;
    }
    content.classList.add('is-measuring');
    var h = Math.ceil(content.scrollHeight || content.getBoundingClientRect().height || 0);
    content.classList.remove('is-measuring');
    cachedRailH = h;
    return h;
  }

  function syncPanels(top, panelH) {
    var panels = document.querySelectorAll(
      '.docs-container .sidebar, .docs-container .docs-content'
    );
    for (var i = 0; i < panels.length; i++) {
      var el = panels[i];
      el.style.top = top + 'px';
      el.style.height = panelH + 'px';
      el.style.maxHeight = panelH + 'px';
      el.style.minHeight = panelH + 'px';
      el.style.marginTop = '0';
      el.style.transform = 'none';
    }
  }

  function measure(options) {
    var forceRail = options && options.forceRail;
    var nav = document.querySelector('.docs-nav');
    if (!nav) return;

    var banner = document.querySelector('.docs-motto-strip');
    var clear = document.querySelector('.docs-header-clear');
    var footer = document.querySelector('.footer');
    var root = document.documentElement;
    var navH = Math.round(nav.getBoundingClientRect().height);
    var viewH = Math.round((window.visualViewport && window.visualViewport.height) || window.innerHeight);

    // Banner and transparent rain share one height
    var rainH = 36;
    if (banner) {
      var bh = banner.offsetHeight || Math.round(banner.getBoundingClientRect().height);
      if (bh > 0) rainH = bh;
    }
    root.style.setProperty('--docs-banner-h', rainH + 'px');
    if (clear) {
      clear.style.height = rainH + 'px';
      clear.style.minHeight = rainH + 'px';
      clear.style.maxHeight = rainH + 'px';
    }

    // Dock flush under sticky rain (no extra gap)
    var top = navH + rainH;
    if (clear) {
      var cr = clear.getBoundingClientRect();
      var scrollY = window.scrollY || window.pageYOffset || 0;
      if (scrollY > 8 && Math.abs(cr.top - navH) <= 2) {
        top = Math.round(cr.bottom);
      }
    }

    var bottomGap = 24;
    if (footer) {
      var fr = footer.getBoundingClientRect();
      var overlap = Math.ceil(viewH - fr.top);
      if (overlap > 0) {
        bottomGap = Math.max(24, overlap + 16);
      }
    }

    var panelH = Math.max(160, viewH - top - bottomGap);

    if (forceRail || cachedRailH < 1) {
      measureRailHeight();
    }
    var railH = Math.max(cachedRailH, panelH);

    root.style.setProperty('--sticky-nav-h', navH + 'px');
    root.style.setProperty('--sticky-content-gap', '0px');
    root.style.setProperty('--sticky-top', top + 'px');
    root.style.setProperty('--sticky-bottom-gap', bottomGap + 'px');
    root.style.setProperty('--sticky-panel-h', panelH + 'px');
    root.style.setProperty('--sticky-rail-h', railH + 'px');

    var cols = document.querySelectorAll(
      '.docs-container > .row > .col-md-3, .docs-container > .row > .col-md-9'
    );
    for (var i = 0; i < cols.length; i++) {
      cols[i].style.minHeight = railH + 'px';
    }

    // Hard-sync TOC and content: same top + same height
    syncPanels(top, panelH);

    if (typeof window.jQuery !== 'undefined') {
      var $body = window.jQuery(document.body);
      if ($body.data('bs.scrollspy')) {
        $body.data('bs.scrollspy').options.offset = top + 8;
        $body.scrollspy('refresh');
      }
    }
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      measure({ forceRail: false });
    });
  }

  function onResize() {
    measure({ forceRail: true });
  }

  function bind() {
    clearInlineColumnSizes();
    measure({ forceRail: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onResize);
    }
    document.addEventListener('page:load', function () {
      cachedRailH = 0;
      clearInlineColumnSizes();
      measure({ forceRail: true });
    });
    setTimeout(function () { measure({ forceRail: true }); }, 50);
    setTimeout(function () { measure({ forceRail: true }); }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  window.syncStickyOffsets = function () {
    measure({ forceRail: true });
  };
})();
