/*!
 * Soft in-site navigation — keep binary rain / cursor FX running across pages
 */
(function () {
  'use strict';

  if (window.__pageNavBound) return;
  window.__pageNavBound = true;

  var PERSIST_SEL = '.binary-rain, .cursor-fx';
  var SKIP_SCRIPT = /\/(jquery|bootstrap|holder|lessismore|application|sticky-offsets|toc-spy|binary-rain|cursor-fx|page-nav|busuanzi)[^"'?]*/i;
  var busy = false;

  function sameOrigin(url) {
    try {
      return new URL(url, location.href).origin === location.origin;
    } catch (e) {
      return false;
    }
  }

  function shouldIntercept(a) {
    if (!a || a.tagName !== 'A') return false;
    if (a.target && a.target !== '' && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || href.indexOf('mailto:') === 0 || href.indexOf('javascript:') === 0) {
      return false;
    }
    if (!sameOrigin(a.href)) return false;
    var url = new URL(a.href, location.href);
    if (url.pathname === location.pathname && url.search === location.search && url.hash) {
      return false;
    }
    // Tool apps bring private CSS/JS — full reload in and out
    if (isToolAppPath(url.pathname) || isToolAppPath(location.pathname)) {
      return false;
    }
    return true;
  }

  function isToolAppPath(pathname) {
    return /^\/tools\/.+/i.test(pathname || '');
  }

  function persistNodes() {
    return Array.prototype.slice.call(document.querySelectorAll(PERSIST_SEL));
  }

  function runScripts(scriptNodes) {
    scriptNodes.forEach(function (oldScript) {
      var src = oldScript.getAttribute('src') || '';
      if (src && SKIP_SCRIPT.test(src)) return;

      var s = document.createElement('script');
      Array.prototype.forEach.call(oldScript.attributes || [], function (attr) {
        s.setAttribute(attr.name, attr.value);
      });
      if (!src) {
        s.text = oldScript.textContent;
      }
      document.body.appendChild(s);
      if (!src) {
        s.parentNode && s.parentNode.removeChild(s);
      }
    });
  }

  function afterSwap(url) {
    if (typeof window.initLessismore === 'function') {
      try { window.initLessismore(); } catch (e) {}
    }
    if (typeof window.initApplication === 'function') {
      try { window.initApplication(); } catch (e) {}
    }
    if (typeof window.syncStickyOffsets === 'function') {
      try { window.syncStickyOffsets(); } catch (e) {}
    }
    if (typeof window.refreshTocSpy === 'function') {
      try { window.refreshTocSpy(); } catch (e) {}
    }
    if (typeof window.refreshBusuanzi === 'function') {
      try { window.refreshBusuanzi(); } catch (e) {}
    }

    var hash = new URL(url, location.href).hash;
    if (hash && document.querySelector(hash)) {
      var target = document.querySelector(hash);
      if (target && target.scrollIntoView) {
        target.scrollIntoView();
      }
    } else {
      window.scrollTo(0, 0);
    }

    document.dispatchEvent(new CustomEvent('page:load', { detail: { url: url } }));
  }

  function swap(html, url, push) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    if (!doc.body) {
      location.href = url;
      return;
    }

    document.title = doc.title || document.title;

    var keep = persistNodes();
    keep.forEach(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });

    var scripts = [];
    var frag = document.createDocumentFragment();
    Array.prototype.slice.call(doc.body.childNodes).forEach(function (node) {
      if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
        scripts.push(node.cloneNode(true));
        return;
      }
      frag.appendChild(document.importNode(node, true));
    });

    document.body.innerHTML = '';
    document.body.appendChild(frag);
    keep.forEach(function (el) {
      document.body.appendChild(el);
    });

    // Sync <body> class from new page
    document.body.className = doc.body.className || 'index';

    if (push) {
      history.pushState({ soft: true }, '', url);
    }

    runScripts(scripts);
    afterSwap(url);
  }

  function navigate(url, push) {
    if (busy) return;
    busy = true;
    fetch(url, {
      credentials: 'same-origin',
      headers: { Accept: 'text/html' }
    })
      .then(function (res) {
        if (!res.ok) throw new Error('nav failed');
        return res.text();
      })
      .then(function (html) {
        swap(html, url, push);
      })
      .catch(function () {
        location.href = url;
      })
      .then(function () {
        busy = false;
      });
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!shouldIntercept(a)) return;
    e.preventDefault();
    navigate(a.href, true);
  }, true);

  window.addEventListener('popstate', function () {
    navigate(location.href, false);
  });
})();
