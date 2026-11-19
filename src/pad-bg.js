/* 页面背景层：整块首屏卡片在底奏节拍下切换不同的全屏图形样式，
   并在每次敲击时给出放射线条、纸屑和整卡脉冲。画在内容下层。 */
(() => {
  'use strict';

  const ACID = '#d9ef68';
  const PINK = '#efabc2';
  const ACCENT = '#f2a25a';
  const BLUE = '#91cfe8';
  const HOT = '#fffdf2';
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
  let sweep = 0;
  let pulse = 0;
  let tint = 0;
  let tintColor = ACID;
  let startTime = 0;
  let deckBox = null;
  const confetti = [];
  const lines = [];
  const beatRings = [];
  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

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
    const origin = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(origin.width));
    height = Math.max(1, Math.round(origin.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const deck = stage.querySelector('#pad-playground');
    if (deck) {
      const box = deck.getBoundingClientRect();
      deckBox = {
        x: box.left - origin.left + box.width / 2,
        y: box.top - origin.top + box.height / 2,
        w: box.width,
        h: box.height,
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
    pulse = 1;
    if (detail.kick) {
      kick = 1;
      sweep = 1;
      tint = 1;
      tintColor = ACID;
      spawnConfetti(4);
      spawnBeatLines(3);
      if (deckBox) beatRings.push({ born: now, life: 700, color: ACID, width: 6, from: deckBox.r * .55, to: Math.hypot(width, height) * .8 });
    }
    if (detail.snare) {
      snare = 1;
      tint = Math.max(tint, .8);
      tintColor = PINK;
      spawnBeatLines(2);
      if (deckBox) beatRings.push({ born: now, life: 520, color: PINK, width: 3, from: deckBox.r * .4, to: Math.hypot(width, height) * .55 });
    }
    if (detail.step % 16 === 0) {
      const bar = Math.floor(detail.step / 16);
      if (bar % SWITCH_EVERY_BARS === 0 && bar !== 0) styleIndex = (styleIndex + 1) % STYLES.length;
    }
    ensureLoop();
  }

  // 敲击：从被按下的位置向四周甩出反馈线条。
  function hit(meta) {
    const color = typeof meta === 'string' ? meta : (meta && meta.color) || ACID;
    const x = meta && Number.isFinite(meta.x) ? meta.x : width / 2;
    const y = meta && Number.isFinite(meta.y) ? meta.y : height * 0.5;
    const now = performance.now();
    hitFlash = 1;
    hitColor = color;
    const count = 11;
    for (let index = 0; index < count; index++) {
      const angle = (Math.PI * 2 * index) / count + rand(-.22, .22);
      lines.push({
        x, y,
        angle,
        len: rand(width * .34, width * .86),
        width: rand(2.5, 8),
        color: pick([color, color, ACID, HOT]),
        born: now + index * 6,
        life: rand(360, 680)
      });
    }
    spawnConfetti(5);
    ensureLoop();
  }

  function spawnBeatLines(count) {
    for (let index = 0; index < count; index++) {
      const x = rand(0, width);
      lines.push({
        x,
        y: rand(height * .18, height * .82),
        angle: rand(-.35, .35),
        len: rand(width * .2, width * .5),
        width: rand(1.5, 3.5),
        color: pick([ACID, PINK, HOT]),
        born: performance.now(),
        life: rand(240, 420)
      });
    }
  }

  function setActive(flag) {
    active = Boolean(flag);
    if (active) ensureLoop();
    else if (!reduced) ensureLoop();
  }

  function spawnConfetti(count) {
    if (reduced) return;
    for (let index = 0; index < count && confetti.length < 70; index++) {
      confetti.push({
        x: rand(0, width),
        y: height + rand(0, 120),
        vx: rand(-16, 16),
        vy: rand(-96, -38),
        size: rand(8, 24),
        rot: rand(0, Math.PI * 2),
        vr: rand(-1.2, 1.2),
        color: pick([ACID, PINK, ACCENT, BLUE]),
        opacity: rand(.3, .72)
      });
    }
  }

  function decay(dt) {
    kick = Math.max(0, kick - dt * 2.6);
    snare = Math.max(0, snare - dt * 3);
    hitFlash = Math.max(0, hitFlash - dt * 2.6);
    sweep = Math.max(0, sweep - dt * 2);
    pulse = Math.max(0, pulse - dt * 6.5);
    tint = Math.max(0, tint - dt * 3.4);
  }

  // 频谱条贴着鼓面的上下两条边，鼓面外圈随每个十六分音符亮一下。
  function drawBars(t) {
    const count = Math.max(20, Math.floor(width / 20));
    const barWidth = width / count;
    const topY = deckBox ? deckBox.y - deckBox.h / 2 - 10 : height * .3;
    const bottomY = deckBox ? deckBox.y + deckBox.h / 2 + 9 : height * .8;
    for (let index = 0; index < count; index++) {
      const wave = Math.abs(Math.sin(index * .58 + t * 3.1));
      const lift = kick * (index % 2 ? .9 : 1.25) + snare * (index % 4 === 0 ? .7 : 0) + pulse * .3;
      const bar = 8 + wave * 22 + lift * 30;
      ctx.globalAlpha = .22 + wave * .16 + kick * .24 + pulse * .16;
      ctx.fillStyle = index % 3 === 0 ? PINK : ACID;
      const x = index * barWidth + barWidth * .2;
      const w = barWidth * .6;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, topY - bar * .82, w, bar * .82, w / 2);
      else ctx.rect(x, topY - bar * .82, w, bar * .82);
      ctx.fill();
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, bottomY, w, bar * .82, w / 2);
      else ctx.rect(x, bottomY, w, bar * .82);
      ctx.fill();
    }
  }

  function drawBeatRings(now) {
    for (let index = beatRings.length - 1; index >= 0; index--) {
      const ring = beatRings[index];
      const progress = (now - ring.born) / ring.life;
      if (progress < 0) continue;
      if (progress >= 1) { beatRings.splice(index, 1); continue; }
      const radius = ring.from + (ring.to - ring.from) * (1 - Math.pow(1 - progress, 2.4));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.pow(1 - progress, 1.4) * .55;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = ring.width * (1 - progress * .6);
      ctx.beginPath();
      ctx.arc(deckBox.x, deckBox.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawDeckPulse() {
    if (!deckBox || pulse <= .01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = pulse * .5;
    ctx.strokeStyle = ACID;
    ctx.lineWidth = 2 + pulse * 3;
    const x = deckBox.x - deckBox.w / 2 - 5;
    const y = deckBox.y - deckBox.h / 2 - 5;
    const w = deckBox.w + 10;
    const h = deckBox.h + 10;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 20);
    else ctx.rect(x, y, w, h);
    ctx.stroke();
    ctx.restore();
  }

  function drawRings(t) {
    const maxR = Math.hypot(width, height) * .6;
    for (let index = 0; index < 6; index++) {
      const phase = (((t * .16 + index * .17) % 1) + 1) % 1;
      const radius = Math.max(0, phase * maxR);
      ctx.globalAlpha = (1 - phase) * (.22 + kick * .5);
      ctx.strokeStyle = index % 2 ? PINK : ACID;
      ctx.lineWidth = 2 + (1 - phase) * (2 + kick * 5);
      ctx.beginPath();
      ctx.arc(width / 2, height * .58, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = .16 + kick * .28;
    ctx.fillStyle = ACID;
    ctx.beginPath();
    ctx.arc(width / 2, height * .58, 60 + kick * 30, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWaves(t) {
    for (let band = 0; band < 3; band++) {
      const amp = 14 + band * 6 + snare * 34;
      const yBase = height * (.34 + band * .2);
      ctx.globalAlpha = .2 + (band === 1 ? .08 : 0) + kick * .18;
      ctx.strokeStyle = [ACID, PINK, BLUE][band];
      ctx.lineWidth = 26 + snare * 12;
      ctx.beginPath();
      for (let x = -20; x <= width + 20; x += 14) {
        const y = yBase + Math.sin(x * .006 + t * .9 + band * 1.3) * amp + Math.sin(x * .017 - t * 1.4) * amp * .35;
        if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function drawRays(t) {
    const centerX = width * .5;
    const centerY = height * .45;
    const length = Math.hypot(width, height);
    for (let index = 0; index < 16; index++) {
      const angle = (Math.PI * 2 * index) / 16 + t * .045;
      const spread = .05 + kick * .022;
      ctx.globalAlpha = .12 + kick * .34 + hitFlash * .16;
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
    const pulse = Math.max(0, Math.sin(t * 2.2)) * (.5 + kick);
    ctx.fillStyle = INK;
    for (let y = spacing; y < height; y += spacing) {
      for (let x = spacing; x < width; x += spacing) {
        const distance = Math.hypot(x - width / 2, y - height * .55) / width;
        const size = 1.4 + Math.max(0, Math.sin(distance * 9 - t * 3)) * 2.2 + pulse * (1 - Math.min(1, distance)) * 3.6;
        ctx.globalAlpha = .12 + (1 - Math.min(1, distance)) * (.1 + kick * .34);
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
      ctx.globalAlpha = piece.opacity * (.6 + kick * .6);
      ctx.fillStyle = piece.color;
      const size = piece.size * .4;
      if (index % 3 === 0) {
        ctx.beginPath();
        ctx.moveTo(0, -size); ctx.lineTo(size, size * .7); ctx.lineTo(-size, size * .7); ctx.closePath(); ctx.fill();
      } else if (index % 3 === 1) {
        ctx.fillRect(-size * .5, -size * .5, size, size);
      } else {
        ctx.beginPath(); ctx.arc(0, 0, size * .65, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawLines(now) {
    for (let index = lines.length - 1; index >= 0; index--) {
      const line = lines[index];
      const progress = (now - line.born) / line.life;
      if (progress < 0) continue;
      if (progress >= 1) { lines.splice(index, 1); continue; }
      const fade = 1 - progress;
      const length = line.len * (0.35 + progress * 0.9);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * .75;
      ctx.strokeStyle = line.color;
      ctx.lineCap = 'round';
      ctx.lineWidth = line.width * fade;
      ctx.beginPath();
      ctx.moveTo(line.x, line.y);
      ctx.lineTo(line.x + Math.cos(line.angle) * length, line.y + Math.sin(line.angle) * length);
      ctx.stroke();
      ctx.globalAlpha = fade * .5;
      ctx.lineWidth = Math.max(1, line.width * fade * .4);
      ctx.strokeStyle = HOT;
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawSweep() {
    if (sweep <= .01) return;
    const y = deckBox ? deckBox.y - deckBox.h * .5 - 6 : height * .3;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = sweep * .8;
    ctx.strokeStyle = ACID;
    ctx.lineWidth = 2 + sweep * 4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.globalAlpha = sweep * .35;
    ctx.lineWidth = 14 + sweep * 20;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.restore();
  }

  function drawTint() {
    if (tint <= .01) return;
    ctx.save();
    ctx.globalAlpha = tint * .12;
    ctx.fillStyle = tintColor;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
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
    drawBars(t);
    ctx.restore();
    ctx.save();
    drawStyle(styleIndex, t, dt);
    ctx.restore();
    drawDeckPulse();
    if (deckBox && kick > .01) {
      const radius = deckBox.r * (1.05 + (1 - kick) * .5);
      const gradient = ctx.createRadialGradient(deckBox.x, deckBox.y, deckBox.r * .5, deckBox.x, deckBox.y, radius);
      gradient.addColorStop(0, ACID);
      gradient.addColorStop(.55, PINK);
      gradient.addColorStop(1, 'transparent');
      ctx.save();
      ctx.globalAlpha = kick * .26;
      ctx.fillStyle = gradient;
      ctx.fillRect(deckBox.x - radius, deckBox.y - radius, radius * 2, radius * 2);
      ctx.restore();
    }
    drawSweep();
    drawBeatRings(performance.now());
    drawLines(performance.now());
    drawTint();
    if (hitFlash > .01) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = hitFlash * .1;
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
    const dt = lastTime ? Math.min(.05, (now - lastTime) / 1000) : .016;
    lastTime = now;
    const t = (now - (startTime || now)) / 1000;
    decay(dt);
    drawFrame(dt, t);
    const busy = active || kick > .01 || snare > .01 || hitFlash > .01 || sweep > .01 || pulse > .01 || tint > .01 || lines.length > 0 || confetti.length > 0 || beatRings.length > 0;
    if (busy) rafId = requestAnimationFrame(tick);
    else {
      ctx.clearRect(0, 0, width, height);
      lastTime = 0;
    }
  }

  window.PadBG = { init, beat, hit, setActive };
})();
