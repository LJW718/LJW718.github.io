/*!
 * Busuanzi site PV — resilient JSONP fetch with local cache.
 * Display: max(floor, cached, live). Soft-nav calls window.refreshBusuanzi().
 */
(function () {
  'use strict';

  var API = 'https://busuanzi.ibruce.info/busuanzi?jsonpCallback=BusuanziCallback';
  var CACHE_KEY = 'busuanzi_site_pv_cache';
  var KEYS = ['site_pv', 'page_pv', 'site_uv'];
  var fetching = false;

  function floor() {
    var n = Number(window.BUSUANZI_PV_START || 0);
    return isFinite(n) && n > 0 ? n : 0;
  }

  function readCache() {
    try {
      var n = Number(localStorage.getItem(CACHE_KEY) || 0);
      return isFinite(n) && n > 0 ? n : 0;
    } catch (e) {
      return 0;
    }
  }

  function writeCache(n) {
    if (!(n > 0)) return;
    try {
      localStorage.setItem(CACHE_KEY, String(n));
    } catch (e) {}
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  function showContainers() {
    var i, el;
    for (i = 0; i < KEYS.length; i++) {
      el = document.getElementById('busuanzi_container_' + KEYS[i]);
      if (el) el.style.display = 'inline';
    }
  }

  /** Paint current best-known site_pv immediately (floor / cache). */
  function paintFallback() {
    var shown = Math.max(floor(), readCache());
    if (shown > 0) setText('busuanzi_value_site_pv', shown);
    showContainers();
  }

  function applyData(data) {
    if (!data || typeof data !== 'object') {
      paintFallback();
      return;
    }

    var i, key, el, val;
    var fl = floor();
    var cached = readCache();

    for (i = 0; i < KEYS.length; i++) {
      key = KEYS[i];
      el = document.getElementById('busuanzi_value_' + key);
      if (!el) continue;
      val = Number(data[key] || 0);
      if (!isFinite(val) || val < 0) val = 0;

      if (key === 'site_pv') {
        if (val > 0) writeCache(val);
        val = Math.max(fl, cached, val);
      }
      el.textContent = String(val);
    }
    showContainers();
  }

  function jsonp(url, attempt) {
    return new Promise(function (resolve, reject) {
      var tries = typeof attempt === 'number' ? attempt : 0;
      var cbName = 'BusuanziCallback_' + Math.floor(Math.random() * 1e12);
      var settled = false;
      var script = document.createElement('script');
      var timer;

      function cleanup() {
        clearTimeout(timer);
        try {
          delete window[cbName];
        } catch (e) {
          window[cbName] = undefined;
        }
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      function fail(reason) {
        if (settled) return;
        settled = true;
        cleanup();
        if (tries < 4) {
          setTimeout(function () {
            jsonp(url, tries + 1).then(resolve, reject);
          }, 400 * (tries + 1));
        } else {
          reject(reason || 'busuanzi_failed');
        }
      }

      window[cbName] = function (data) {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(data);
      };

      timer = setTimeout(function () {
        fail('timeout');
      }, 10000);

      script.async = true;
      script.referrerPolicy = 'no-referrer-when-downgrade';
      script.src = url.replace('=BusuanziCallback', '=' + cbName) + '&t=' + Date.now();
      script.onerror = function () {
        fail('script_error');
      };

      (document.head || document.documentElement).appendChild(script);
    });
  }

  function refresh() {
    paintFallback();
    if (fetching) return;
    fetching = true;
    jsonp(API)
      .then(function (data) {
        fetching = false;
        applyData(data);
      })
      .catch(function () {
        fetching = false;
        paintFallback();
      });
  }

  window.refreshBusuanzi = refresh;

  // First paint: show floor/cache, then fetch. Also retry once after window load.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh);
  } else {
    refresh();
  }
  window.addEventListener('load', function () {
    var el = document.getElementById('busuanzi_value_site_pv');
    var shown = el ? Number(el.textContent || 0) : 0;
    var fl = floor();
    // Still stuck on placeholder → fetch again
    if (!shown || shown === fl) refresh();
  });
})();
