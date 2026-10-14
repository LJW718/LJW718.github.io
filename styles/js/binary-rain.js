/*!
 * Binary rain background — cyan tech theme
 */
(function () {
  'use strict';

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  var canvas = document.createElement('canvas');
  canvas.className = 'binary-rain';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(canvas, document.body.firstChild);

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var fontSize = 14;
  var columns = 0;
  var drops = [];
  var running = true;
  var last = 0;
  var frameMs = 48;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    columns = Math.max(1, Math.floor(w / fontSize));
    var next = new Array(columns);
    for (var i = 0; i < columns; i++) {
      next[i] = drops[i] != null ? drops[i] : Math.random() * -40;
    }
    drops = next;
  }

  function draw() {
    ctx.fillStyle = 'rgba(7, 11, 18, 0.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = fontSize + 'px "JetBrains Mono", Consolas, monospace';
    ctx.textAlign = 'center';

    for (var i = 0; i < columns; i++) {
      var bit = Math.random() > 0.5 ? '1' : '0';
      var x = i * fontSize + fontSize / 2;
      var y = drops[i] * fontSize;

      ctx.fillStyle = 'rgba(122, 240, 200, 0.95)';
      ctx.shadowColor = 'rgba(46, 230, 166, 0.55)';
      ctx.shadowBlur = 8;
      ctx.fillText(bit, x, y);

      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(46, 230, 166, 0.28)';
      if (y > fontSize) {
        ctx.fillText(Math.random() > 0.5 ? '1' : '0', x, y - fontSize);
      }
      if (y > fontSize * 2) {
        ctx.fillStyle = 'rgba(46, 230, 166, 0.12)';
        ctx.fillText(Math.random() > 0.5 ? '1' : '0', x, y - fontSize * 2);
      }

      if (y > window.innerHeight && Math.random() > 0.975) {
        drops[i] = Math.random() * -20;
      } else {
        drops[i] += 1;
      }
    }
  }

  function tick(ts) {
    if (!running) return;
    requestAnimationFrame(tick);
    if (ts - last < frameMs) return;
    last = ts;
    draw();
  }

  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) {
      last = 0;
      requestAnimationFrame(tick);
    }
  });

  requestAnimationFrame(tick);
})();
