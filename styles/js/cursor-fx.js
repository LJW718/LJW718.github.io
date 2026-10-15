/*!
 * Cursor follow FX — cyan glow + particle trail
 */
(function () {
  'use strict';

  if (window.__cursorFxStarted || document.querySelector('.cursor-fx')) {
    return;
  }
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  if (window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches) {
    return;
  }
  window.__cursorFxStarted = true;

  var root = document.createElement('div');
  root.className = 'cursor-fx';
  root.setAttribute('aria-hidden', 'true');

  var glow = document.createElement('div');
  glow.className = 'cursor-fx__glow';

  var ring = document.createElement('div');
  ring.className = 'cursor-fx__ring';

  var canvas = document.createElement('canvas');
  canvas.className = 'cursor-fx__trail';

  root.appendChild(canvas);
  root.appendChild(glow);
  root.appendChild(ring);
  document.body.appendChild(root);

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false };
  var glowPos = { x: mouse.x, y: mouse.y };
  var ringPos = { x: mouse.x, y: mouse.y };
  var particles = [];
  var ripples = [];
  var running = true;
  var lastSpawn = 0;
  var dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnParticle(x, y, burst) {
    var count = burst ? 10 : 1;
    for (var i = 0; i < count; i++) {
      var angle = burst ? (Math.PI * 2 * i) / count : Math.random() * Math.PI * 2;
      var speed = burst ? 1.6 + Math.random() * 2.2 : 0.4 + Math.random() * 0.9;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (burst ? 0 : 0.35),
        life: 1,
        decay: burst ? 0.02 + Math.random() * 0.02 : 0.016 + Math.random() * 0.02,
        size: burst ? 2 + Math.random() * 2 : 1.2 + Math.random() * 1.8,
        bit: Math.random() > 0.5 ? '1' : '0',
        useBit: Math.random() > 0.45
      });
    }
  }

  function onMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;

    if (!mouse.active) {
      mouse.active = true;
      root.classList.add('is-active');
      glowPos.x = mouse.x;
      glowPos.y = mouse.y;
      ringPos.x = mouse.x;
      ringPos.y = mouse.y;
    }
    var now = performance.now();
    if (now - lastSpawn > 28) {
      spawnParticle(mouse.x, mouse.y, false);
      lastSpawn = now;
    }
  }

  function onLeave() {
    mouse.active = false;
    root.classList.remove('is-active');
  }

  function onClick(e) {
    ripples.push({ x: e.clientX, y: e.clientY, r: 8, life: 1 });
    spawnParticle(e.clientX, e.clientY, true);
    ring.classList.remove('is-pulse');
    void ring.offsetWidth;
    ring.classList.add('is-pulse');
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function tick() {
    if (!running) return;
    requestAnimationFrame(tick);

    glowPos.x = lerp(glowPos.x, mouse.x, 0.18);
    glowPos.y = lerp(glowPos.y, mouse.y, 0.18);
    ringPos.x = lerp(ringPos.x, mouse.x, 0.32);
    ringPos.y = lerp(ringPos.y, mouse.y, 0.32);

    glow.style.transform = 'translate(' + glowPos.x + 'px,' + glowPos.y + 'px)';
    ring.style.transform = 'translate(' + ringPos.x + 'px,' + ringPos.y + 'px)';

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
      p.life -= p.decay;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      var alpha = Math.max(0, p.life);
      if (p.useBit) {
        ctx.font = '11px "JetBrains Mono", Consolas, monospace';
        ctx.fillStyle = 'rgba(122, 240, 200,' + (alpha * 0.85) + ')';
        ctx.shadowColor = 'rgba(46, 230, 166,' + (alpha * 0.7) + ')';
        ctx.shadowBlur = 8;
        ctx.fillText(p.bit, p.x, p.y);
        ctx.shadowBlur = 0;
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(46, 230, 166,' + (alpha * 0.9) + ')';
        ctx.shadowColor = 'rgba(74, 163, 255,' + (alpha * 0.55) + ')';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    for (var j = ripples.length - 1; j >= 0; j--) {
      var r = ripples[j];
      r.r += 3.2;
      r.life -= 0.035;
      if (r.life <= 0) {
        ripples.splice(j, 1);
        continue;
      }
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(46, 230, 166,' + (r.life * 0.65) + ')';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = 'rgba(46, 230, 166, 0.5)';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('mouseleave', onLeave);
  window.addEventListener('mousedown', onClick);
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) requestAnimationFrame(tick);
  });

  requestAnimationFrame(tick);
})();
