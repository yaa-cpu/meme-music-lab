/* 椤甸潰鑳屾櫙灞傦細鏁村潡棣栧睆鍗＄墖鍦ㄥ簳濂忚妭鎷嶄笅鍒囨崲涓嶅悓鐨勫叏灞忓浘褰㈡牱寮忋€?   鐢诲湪鍐呭涓嬪眰锛屽彧鍦ㄥ簳濂忓紑鍚紙鎴栧垰琚暡鍑伙級鏃惰窇 rAF銆?*/
(() => {
  'use strict';

  const ACID = '#d9ef68';
  const PINK = '#efabc2';
  const ACCENT = '#f2a25a';
  const BLUE = '#91cfe8';
  const INK = '#232620';
  const STYLES = ['rings', 'waves', 'rays', 'dots', 'confetti'];
  const SWITCH_EVERY_BARS = 4;

  let canvas = null;
  let ctx = null;
  let stage = null;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId = 0;
  let lastTime = 0;
  let active = false;
  let reduced = false;
  let styleIndex = 0;
  let kick = 0;
  let snare = 0;
  let hitFlash = 0;
  let hitColor = ACID;
  let startTime = 0;
  let deckBox = null;
  const confetti = [];
  const rand = (min, max) => min + Math.random() * (max - min);

  function init(options) {
    canvas = options.canvas;
    stage = options.stage;
    if (!canvas || !stage) return;
    ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced = query.matches;
    if (query.addEventListener) query.addEventListener('change', (event) => { reduced = event.matches; drawOnce(); });
    resize();
    if (window.ResizeObserver) new ResizeObserver(() => { resize(); drawOnce(); }).observe(stage);
    window.addEventListener('resize', () => { resize(); drawOnce(); });
  }

  function resize() {
    if (!canvas || !stage) return;
    const rect = stage.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const deck = stage.querySelector('#pad-playground');
    if (deck) {
      const box = deck.getBoundingClientRect();
      const origin = stage.getBoundingClientRect();
      deckBox = {
        x: box.left - origin.left + box.width / 2,
        y: box.top - origin.top + box.height / 2,
        r: Math.max(box.width, box.height) * 0.8
      };
    }
  }

  function ensureLoop() {
    if (rafId || reduced) { drawOnce(); return; }
    lastTime = 0;
    rafId = requestAnimationFrame(tick);
  }

  function beat(detail) {
    if (!detail) return;
    const now = performance.now();
    if (!startTime) startTime = now;
    if (detail.kick) kick = 1;
    if (detail.snare) snare = 1;
    if (detail.step % 16 === 0) {
      const bar = Math.floor(detail.step / 16);
      if (bar % SWITCH_EVERY_BARS === 0 && bar !== 0) styleIndex = (styleIndex + 1) % STYLES.length;
    }
    if (detail.kick) spawnConfetti(5);
    ensureLoop();
  }

  function hit(color) {
    hitFlash = 1;
    hitColor = color || ACID;
    spawnConfetti(4);
    ensureLoop();
  }

  function setActive(flag) {
    active = Boolean(flag);
    if (active) ensureLoop();
    else if (!reduced) ensureLoop();
  }

  function spawnConfetti(count) {
    if (reduced) return;
    for (let index = 0; index < count && confetti.length < 60; index++) {
      confetti.push({
        x: rand(0, width),
        y: height + rand(0, 120),
        vx: rand(-14, 14),
        vy: rand(-90, -34),
        size: rand(8, 24),
        rot: rand(0, Math.PI * 2),
        vr: rand(-1.2, 1.2),
        color: [ACID, PINK, ACCENT, BLUE][Math.floor(rand(0, 4))],
        opacity: rand(0.3, 0.72)
      });
    }
  }

  function decay(dt) {
    kick = Math.max(0, kick - dt * 3.4);
    snare = Math.max(0, snare - dt * 3.8);
    hitFlash = Math.max(0, hitFlash - dt * 2.6);
  }

  function drawRings(t) {
    const maxR = Math.hypot(width, height) * 0.6;
    for (let index = 0; index < 6; index++) {
      const phase = ((t * 0.16 + index * 0.17) % 1);
      const radius = phase * maxR;
      ctx.globalAlpha = (1 - phase) * (0.22 + kick * 0.5);
      ctx.strokeStyle = index % 2 ? PINK : ACID;
      ctx.lineWidth = 2 + (1 - phase) * (2 + kick * 5);
      ctx.beginPath();
      ctx.arc(width / 2, height * 0.58, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.16 + kick * 0.28;
    ctx.fillStyle = ACID;
    ctx.beginPath();
    ctx.arc(width / 2, height * 0.58, 60 + kick * 26, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWaves(t) {
    for (let band = 0; band < 3; band++) {
      const amp = 14 + band * 6 + snare * 30;
      const yBase = height * (0.34 + band * 0.2);
      ctx.globalAlpha = 0.2 + (band === 1 ? 0.08 : 0) + kick * 0.18;
      ctx.strokeStyle = [ACID, PINK, BLUE][band];
      ctx.lineWidth = 26 + snare * 10;
      ctx.beginPath();
      for (let x = -20; x <= width + 20; x += 14) {
        const y = yBase + Math.sin(x * 0.006 + t * 0.9 + band * 1.3) * amp + Math.sin(x * 0.017 - t * 1.4) * amp * 0.35;
        if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function drawRays(t) {
    const centerX = width * 0.5;
    const centerY = height * 0.45;
    const length = Math.hypot(width, height);
    for (let index = 0; index < 14; index++) {
      const angle = (Math.PI * 2 * index) / 14 + t * 0.045;
      const spread = 0.055 + kick * 0.02;
      ctx.globalAlpha = 0.12 + kick * 0.34 + hitFlash * 0.16;
      ctx.fillStyle = index % 3 === 0 ? PINK : index % 3 === 1 ? ACID : ACCENT;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(angle - spread) * length, centerY + Math.sin(angle - spread) * length);
      ctx.lineTo(centerX + Math.cos(angle + spread) * length, centerY + Math.sin(angle + spread) * length);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawDots(t) {
    const spacing = Math.max(22, Math.round(width / 34));
    const pulse = Math.max(0, Math.sin(t * 2.2)) * (0.5 + kick);
    ctx.fillStyle = INK;
    for (let y = spacing; y < height; y += spacing) {
      for (let x = spacing; x < width; x += spacing) {
        const distance = Math.hypot(x - width / 2, y - height * 0.55) / width;
        const size = 1.4 + Math.max(0, Math.sin(distance * 9 - t * 3)) * 2.2 + pulse * (1 - Math.min(1, distance)) * 3.4;
        ctx.globalAlpha = 0.12 + (1 - Math.min(1, distance)) * (0.1 + kick * 0.34);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawConfetti(dt) {
    for (let index = confetti.length - 1; index >= 0; index--) {
      const piece = confetti[index];
      piece.vy += 60 * dt;
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      piece.rot += piece.vr * dt;
      if (piece.y < -40) { confetti.splice(index, 1); continue; }
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rot);
      ctx.globalAlpha = piece.opacity * (0.6 + kick * 0.6);
      ctx.fillStyle = piece.color;
      const s = piece.size * 0.4;
      if (index % 3 === 0) {
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.lineTo(s, s * 0.7); ctx.lineTo(-s, s * 0.7); ctx.closePath(); ctx.fill();
      } else if (index % 3 === 1) {
        ctx.fillRect(-s * 0.5, -s * 0.5, s, s);
      } else {
        ctx.beginPath(); ctx.arc(0, 0, s * 0.65, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawStyle(index, t, dt) {
    const name = STYLES[index];
    if (name === 'rings') drawRings(t);
    else if (name === 'waves') drawWaves(t);
    else if (name === 'rays') drawRays(t);
    else if (name === 'dots') drawDots(t);
    else drawConfetti(dt);
  }

  function drawFrame(dt, t) {
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    drawStyle(styleIndex, t, dt);
    ctx.restore();
    // 鼓面背后的一圈光晕：底鼓一响就往外推一层颜色。
    if (deckBox && kick > 0.01) {
      const radius = deckBox.r * (1.05 + (1 - kick) * 0.5);
      const gradient = ctx.createRadialGradient(deckBox.x, deckBox.y, deckBox.r * 0.5, deckBox.x, deckBox.y, radius);
      gradient.addColorStop(0, ACID);
      gradient.addColorStop(0.55, PINK);
      gradient.addColorStop(1, 'transparent');
      ctx.save();
      ctx.globalAlpha = kick * 0.26;
      ctx.fillStyle = gradient;
      ctx.fillRect(deckBox.x - radius, deckBox.y - radius, radius * 2, radius * 2);
      ctx.restore();
    }
    if (hitFlash > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = hitFlash * 0.1;
      ctx.fillStyle = hitColor;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  function drawOnce() {
    if (!ctx) return;
    drawFrame(0, (performance.now() - (startTime || performance.now())) / 1000);
  }

  function tick(now) {
    rafId = 0;
    const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0.016;
    lastTime = now;
    const t = (now - (startTime || now)) / 1000;
    decay(dt);
    drawFrame(dt, t);
    const busy = active || kick > 0.01 || snare > 0.01 || hitFlash > 0.01 || confetti.length > 0;
    if (busy) rafId = requestAnimationFrame(tick);
    else {
      ctx.clearRect(0, 0, width, height);
      lastTime = 0;
    }
  }

  window.PadBG = { init, beat, hit, setActive };
})();

