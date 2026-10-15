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
  fetch: function (url, callback, attempt) {
    var self = this;
    var tries = typeof attempt === "number" ? attempt : 0;
    var cbName = "BusuanziCallback_" + Math.floor(1099511627776 * Math.random());
    var settled = !1;
    var timer;
    var script;
    var requestUrl = url.replace("=BusuanziCallback", "=" + cbName) + "&t=" + Date.now();

    window[cbName] = function (data) {
      if (settled) return;
      settled = !0;
      clearTimeout(timer);
      try { delete window[cbName] } catch (err) {}
      try {
        if (script && script.parentElement) script.parentElement.removeChild(script);
      } catch (err) {}
      ready(function () {
        try {
          callback(data);
        } catch (err) {
          bszTag.shows();
        }
      });
    };

    script = document.createElement("SCRIPT");
    script.type = "text/javascript";
    script.async = !0;
    script.src = requestUrl;
    script.referrerPolicy = "no-referrer-when-downgrade";
    script.onerror = function () {
      fail();
    };
    document.getElementsByTagName("HEAD")[0].appendChild(script);

    timer = setTimeout(fail, 8000);

    function fail() {
      if (settled) return;
      clearTimeout(timer);
      try {
        if (script && script.parentElement) script.parentElement.removeChild(script);
      } catch (err) {}
      try { delete window[cbName] } catch (err) {}
      if (tries < 3) {
        setTimeout(function () { self.fetch(url, callback, tries + 1) }, 500 * (tries + 1));
      } else {
        /* Keep current / floor value visible when remote counter is unreachable */
        settled = !0;
        bszTag.shows();
      }
    }
  }
},
bszTag = {
  bszs: ["site_pv", "page_pv", "site_uv"],
  texts: function (a) {
    var floor = Number(window.BUSUANZI_PV_START || 0);
    var i, key, el, val;
    for (i = 0; i < this.bszs.length; i++) {
      key = this.bszs[i];
      el = document.getElementById("busuanzi_value_" + key);
      if (!el) continue;
      val = Number(a[key] || 0);
      /* site_pv: show live Busuanzi count, never below configured floor */
      if (key === "site_pv" && floor > 0) {
        val = Math.max(floor, val);
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
},
window.refreshBusuanzi = function () {
  bszCaller.fetch("https://busuanzi.ibruce.info/busuanzi?jsonpCallback=BusuanziCallback", function (a) {
    bszTag.texts(a);
    bszTag.shows();
  });
};

/* Force HTTPS so the counter works on both http://localhost and https:// pages */
window.refreshBusuanzi();
