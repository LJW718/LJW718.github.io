var bszCaller, bszTag;
!function () {
  var c, d, e, a = !1, b = [];
  ready = function (c) {
    return a || "interactive" === document.readyState || "complete" === document.readyState
      ? c.call(document)
      : b.push(function () { return c.call(this) }), this
  },
  d = function () {
    for (var a = 0, c = b.length; c > a; a++) b[a].apply(document);
    b = []
  },
  e = function () {
    a || (a = !0, d.call(window),
      document.removeEventListener
        ? document.removeEventListener("DOMContentLoaded", e, !1)
        : document.attachEvent && (document.detachEvent("onreadystatechange", e),
          window == window.top && (clearInterval(c), c = null)))
  },
  document.addEventListener
    ? document.addEventListener("DOMContentLoaded", e, !1)
    : document.attachEvent && (document.attachEvent("onreadystatechange", function () {
      /loaded|complete/.test(document.readyState) && e()
    }), window == window.top && (c = setInterval(function () {
      try { a || document.documentElement.doScroll("left") } catch (b) { return }
      e()
    }, 5)))
}(),
bszCaller = {
  fetch: function (a, b) {
    var c = "BusuanziCallback_" + Math.floor(1099511627776 * Math.random());
    window[c] = this.evalCall(b),
      a = a.replace("=BusuanziCallback", "=" + c),
      scriptTag = document.createElement("SCRIPT"),
      scriptTag.type = "text/javascript",
      scriptTag.defer = !0,
      scriptTag.src = a,
      scriptTag.referrerPolicy = "no-referrer-when-downgrade",
      document.getElementsByTagName("HEAD")[0].appendChild(scriptTag)
  },
  evalCall: function (a) {
    return function (b) {
      ready(function () {
        try {
          a(b),
          scriptTag.parentElement.removeChild(scriptTag)
        } catch (c) {
          bszTag.hides()
        }
      })
    }
  }
},
/* Force HTTPS so the counter works on both http://localhost and https:// pages */
bszCaller.fetch("https://busuanzi.ibruce.info/busuanzi?jsonpCallback=BusuanziCallback", function (a) {
  bszTag.texts(a),
  bszTag.shows()
}),
bszTag = {
  bszs: ["site_pv", "page_pv", "site_uv"],
  texts: function (a) {
    var start = Number(window.BUSUANZI_PV_START || 1000);
    var i, key, el, val, baseline, storageKey, stored;
    for (i = 0; i < this.bszs.length; i++) {
      key = this.bszs[i];
      el = document.getElementById("busuanzi_value_" + key);
      if (!el) continue;
      val = Number(a[key] || 0);
      if (key === "site_pv") {
        /*
         * Display = start + max(0, real_pv - baseline)
         * so the visible counter starts from 1000 and then grows.
         * Production uses configured baseline; localhost calibrates once per session.
         */
        if (/ljw718\.github\.io$/i.test(location.hostname)) {
          baseline = Number(window.BUSUANZI_PV_BASELINE || 0);
        } else {
          storageKey = "bsz_pv_baseline_" + location.hostname;
          stored = sessionStorage.getItem(storageKey);
          if (stored === null) {
            sessionStorage.setItem(storageKey, String(val));
            stored = String(val);
          }
          baseline = Number(stored);
        }
        val = start + Math.max(0, val - baseline);
      }
      el.innerHTML = val;
    }
  },
  hides: function () {
    var i, el;
    for (i = 0; i < this.bszs.length; i++) {
      el = document.getElementById("busuanzi_container_" + this.bszs[i]);
      if (el) el.style.display = "none";
    }
  },
  shows: function () {
    var i, el;
    for (i = 0; i < this.bszs.length; i++) {
      el = document.getElementById("busuanzi_container_" + this.bszs[i]);
      if (el) el.style.display = "inline";
    }
  }
};
