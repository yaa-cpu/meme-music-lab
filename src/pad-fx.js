/* Canvas 命中特效层：冲击波、火花、闪电、八角星、牌面泛光。
   只依赖 Canvas 2D，和 CSS 分工：CSS 管按键本身的压感/轮廓，这里管"砸下来"的那一下。 */
(() => {
  'use strict';

  const MAX_PARTICLES = 420;
  const MAX_RINGS = 72;
  const MAX_BOLTS = 28;
  const HOT = '#fffdf2';
  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  let canvas = null;
  let ctx = null;
  let stageEl = null;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId = 0;
  let lastTime = 0;
  let reduced = false;

  const particles = [];
  const rings = [];
  const bolts = [];
  const flashes = [];
  const streaks = [];

  function init(options) {
    canvas = options.canvas;
    stageEl = options.stage;
    if (!canvas || !stageEl) return;
    ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced = query.matches;
    if (query.addEventListener) query.addEventListener('change', (event) => { reduced = event.matches; });
    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(stageEl);
    window.addEventListener('resize', resize);
  }

  function resize() {
    if (!canvas || !stageEl) return;
    const rect = stageEl.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function alive() {
    return particles.length > 0 || rings.length > 0 || bolts.length > 0 || flashes.length > 0 || streaks.length > 0;
  }

  // canvas 的渐变不接受 var() 之类的 CSS 变量，这里兜底一次，避免一个坏颜色打断整个动画循环。
  function safeColor(value) {
    if (!value) return '#d7ed62';
    try {
      const probe = ctx.createLinearGradient(0, 0, 1, 1);
      probe.addColorStop(0, value);
      return value;
    } catch (_) {
      return '#d7ed62';
    }
  }

  function schedule() {
    if (rafId) return;
    lastTime = 0;
    rafId = requestAnimationFrame(tick);
  }

  function burst(hit) {
    if (!ctx) return;
    const { x, y, w, h, kind = 'sample' } = hit;
    const color = safeColor(hit.color);
    const now = performance.now();
    const radius = Math.max(w, h) / 2;
    const heavy = kind === 'drum' || kind === 'sample';

    if (reduced) {
      flashes.push({ kind: 'pad', x, y, w, h, born: now, life: 150 });
      rings.push({ x, y, from: radius * 0.75, to: radius * 1.45, born: now, life: 200, color, width: 3 });
      schedule();
      return;
    }

    flashes.push({ kind: 'deck', x, y, color, born: now, life: 300 });
    flashes.push({ kind: 'pad', x, y, w, h, born: now, life: 130 });
    flashes.push({ kind: 'glow', x, y, w, h, color, born: now, life: 360 });
    flashes.push({ kind: 'star', x, y, color, size: radius * (heavy ? 2.6 : 2), born: now, life: 190 });

    rings.push({ x, y, from: radius * 0.45, to: radius * 2.6, born: now, life: 500, color, width: 7 });
    rings.push({ x, y, from: radius * 0.24, to: radius * 2.05, born: now + 26, life: 430, color: HOT, width: 3.5 });
    rings.push({ x, y, from: radius * 0.1, to: radius * 1.5, born: now + 52, life: 330, color, width: 2 });
    rings.push({ x, y, from: radius, to: Math.hypot(width, height) * 0.98, born: now + 18, life: 620, color, width: 2.5 });

    // 放射状反馈线条：从按键中心往外甩，越靠外越细。
    const streakCount = 14;
    for (let index = 0; index < streakCount; index++) {
      streaks.push({
        x, y,
        angle: (Math.PI * 2 * index) / streakCount + rand(-0.12, 0.12),
        len: rand(radius * 1.1, radius * 2.4),
        width: rand(3, 10),
        color: pick([color, color, HOT, '#d7ed62']),
        born: now + index * 5,
        life: rand(220, 380)
      });
    }

    const count = heavy ? 52 : 32;
    for (let index = 0; index < count && particles.length < MAX_PARTICLES; index++) {
      const angle = (Math.PI * 2 * index) / count + rand(-0.34, 0.34);
      const speed = rand(220, heavy ? 1180 : 780);
      particles.push({
        x: x + Math.cos(angle) * rand(0, w * 0.18),
        y: y + Math.sin(angle) * rand(0, h * 0.18),
        prevX: x,
        prevY: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - rand(50, 260),
        gravity: rand(720, 1250),
        size: rand(3, heavy ? 11 : 8),
        rot: rand(0, Math.PI * 2),
        vr: rand(-11, 11),
        color: pick([color, color, HOT, '#d7ed62', '#ff8a3d', '#ff4d6d']),
        shape: pick(['square', 'square', 'triangle', 'circle', 'star', 'diamond']),
        born: now,
        life: rand(380, 760)
      });
    }

    // 从按键图案里往上飘的粒子：贴着画面升起，像图案本身在掉渣。
    const riseCount = 26;
    for (let index = 0; index < riseCount && particles.length < MAX_PARTICLES; index++) {
      const startX = x + rand(-w * .36, w * .36);
      const startY = y + rand(-h * .26, h * .22);
      particles.push({
        x: startX,
        y: startY,
        prevX: startX,
        prevY: startY,
        vx: rand(-38, 38),
        vy: rand(-230, -90),
        gravity: -52,
        size: rand(2.4, 8),
        rot: rand(0, Math.PI * 2),
        vr: rand(-9, 9),
        color: pick([color, HOT, '#d7ed62', '#efabc2']),
        shape: pick(['circle', 'square', 'triangle', 'star', 'sparkle']),
        born: now,
        life: rand(520, 980)
      });
    }

    if (heavy) {
      const boltCount = kind === 'drum' ? 4 : 2;
      for (let index = 0; index < boltCount && bolts.length < MAX_BOLTS; index++) {
        const angle = rand(0, Math.PI * 2);
        const length = rand(w * 0.5, Math.max(w, h) * 0.95);
        const points = [{ x, y }];
        const segments = 7;
        for (let step = 1; step <= segments; step++) {
          const progress = step / segments;
          const drift = angle + rand(-0.55, 0.55);
          points.push({
            x: x + Math.cos(drift) * length * progress + rand(-9, 9) * progress,
            y: y + Math.sin(drift) * length * progress + rand(-9, 9) * progress
          });
        }
        bolts.push({ points, born: now + index * 22, life: rand(100, 170), color });
      }
    }

    (hit.neighbors || []).forEach((neighbor) => {
      if (rings.length >= MAX_RINGS) return;
      rings.push({ rect: neighbor, born: now + neighbor.delay, life: 470, color, width: 3 });
    });

    schedule();
  }

  function roundRectPath(x, y, w, h, radius) {
    const r = Math.max(0, Math.min(radius, w / 2, h / 2));
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawStar(x, y, outer, inner, points, rotation) {
    ctx.beginPath();
    for (let index = 0; index < points * 2; index++) {
      const radius = index % 2 === 0 ? outer : inner;
      const angle = rotation + (Math.PI * index) / points;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function drawFlash(entry, now) {
    const progress = (now - entry.born) / entry.life;
    if (progress < 0 || progress >= 1) return;
    const fade = 1 - progress;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (entry.kind === 'pad') {
      ctx.globalAlpha = Math.pow(fade, 1.35) * 0.95;
      roundRectPath(entry.x - entry.w / 2, entry.y - entry.h / 2, entry.w, entry.h, 12);
      ctx.fillStyle = HOT;
      ctx.fill();
    } else if (entry.kind === 'deck') {
      const radius = Math.hypot(width, height) * 0.85;
      const gradient = ctx.createRadialGradient(entry.x, entry.y, 0, entry.x, entry.y, radius);
      gradient.addColorStop(0, entry.color);
      gradient.addColorStop(1, 'transparent');
      ctx.globalAlpha = Math.pow(fade, 1.8) * 0.5;
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    } else if (entry.kind === 'star') {
      const rotation = (entry.x * 0.013 + entry.y * 0.017) % (Math.PI * 2);
      const grow = 0.55 + progress * 0.9;
      ctx.globalAlpha = Math.pow(fade, 1.2) * 0.9;
      drawStar(entry.x, entry.y, entry.size * grow, entry.size * grow * 0.22, 8, rotation);
      ctx.fillStyle = HOT;
      ctx.fill();
      ctx.globalAlpha = Math.pow(fade, 1.6) * 0.7;
      drawStar(entry.x, entry.y, entry.size * grow * 0.62, entry.size * grow * 0.1, 8, rotation + 0.39);
      ctx.fillStyle = entry.color;
      ctx.fill();
    } else {
      const radius = Math.max(entry.w, entry.h) * (0.8 + progress * 0.7);
      const gradient = ctx.createRadialGradient(entry.x, entry.y, 0, entry.x, entry.y, radius);
      gradient.addColorStop(0, entry.color);
      gradient.addColorStop(1, 'transparent');
      ctx.globalAlpha = Math.pow(fade, 2.1) * 0.95;
      ctx.fillStyle = gradient;
      ctx.fillRect(entry.x - radius, entry.y - radius, radius * 2, radius * 2);
    }
    ctx.restore();
  }

  function drawRing(entry, now) {
    const progress = (now - entry.born) / entry.life;
    if (progress < 0 || progress >= 1) return;
    const fade = Math.pow(1 - progress, 1.35);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (entry.rect) {
      const { x, y, w, h } = entry.rect;
      const pad = 2 + progress * 20;
      ctx.lineWidth = entry.width * (1 - progress * 0.6);
      ctx.strokeStyle = entry.color;
      roundRectPath(x - pad, y - pad, w + pad * 2, h + pad * 2, 14);
      ctx.globalAlpha = fade * 0.85;
      ctx.stroke();
      ctx.globalAlpha = fade * 0.18;
      ctx.fillStyle = entry.color;
      ctx.fill();
    } else {
      const radius = entry.from + (entry.to - entry.from) * (1 - Math.pow(1 - progress, 2.6));
      ctx.lineWidth = entry.width * 2.4 * (1 - progress * 0.5);
      ctx.strokeStyle = entry.color;
      ctx.globalAlpha = fade * 0.4;
      ctx.beginPath();
      ctx.arc(entry.x, entry.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = Math.max(0.8, entry.width * (1 - progress * 0.75));
      ctx.strokeStyle = entry.color === HOT ? HOT : HOT;
      ctx.globalAlpha = fade;
      ctx.beginPath();
      ctx.arc(entry.x, entry.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBolt(entry, now) {
    const progress = (now - entry.born) / entry.life;
    if (progress < 0 || progress >= 1) return;
    const fade = Math.pow(1 - progress, 1.15);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.globalAlpha = fade * 0.8;
    ctx.strokeStyle = entry.color;
    ctx.lineWidth = 9;
    ctx.beginPath();
    entry.points.forEach((point, index) => { if (index) ctx.lineTo(point.x, point.y); else ctx.moveTo(point.x, point.y); });
    ctx.stroke();
    ctx.globalAlpha = fade;
    ctx.strokeStyle = HOT;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.restore();
  }

  function drawStreak(entry, now) {
    const progress = (now - entry.born) / entry.life;
    if (progress < 0 || progress >= 1) return;
    const fade = 1 - progress;
    const length = entry.len * (0.4 + progress * 0.85);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.strokeStyle = entry.color;
    ctx.beginPath();
    ctx.moveTo(entry.x, entry.y);
    ctx.lineTo(entry.x + Math.cos(entry.angle) * length, entry.y + Math.sin(entry.angle) * length);
    ctx.globalAlpha = fade * 0.42;
    ctx.lineWidth = Math.max(2, entry.width * 2.6 * fade);
    ctx.stroke();
    ctx.globalAlpha = fade * 0.75;
    ctx.lineWidth = Math.max(1, entry.width * fade);
    ctx.stroke();
    ctx.restore();
  }

  function tick(now) {
    rafId = 0;
    const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0.016;
    lastTime = now;
    ctx.clearRect(0, 0, width, height);

    for (let index = flashes.length - 1; index >= 0; index--) {
      drawFlash(flashes[index], now);
      if ((now - flashes[index].born) / flashes[index].life >= 1) flashes.splice(index, 1);
    }
    for (let index = rings.length - 1; index >= 0; index--) {
      drawRing(rings[index], now);
      if ((now - rings[index].born) / rings[index].life >= 1) rings.splice(index, 1);
    }
    for (let index = bolts.length - 1; index >= 0; index--) {
      drawBolt(bolts[index], now);
      if ((now - bolts[index].born) / bolts[index].life >= 1) bolts.splice(index, 1);
    }
    for (let index = streaks.length - 1; index >= 0; index--) {
      drawStreak(streaks[index], now);
      if ((now - streaks[index].born) / streaks[index].life >= 1) streaks.splice(index, 1);
    }

    for (let index = particles.length - 1; index >= 0; index--) {
      const particle = particles[index];
      const progress = (now - particle.born) / particle.life;
      if (progress >= 1) { particles.splice(index, 1); continue; }
      const prevX = particle.x;
      const prevY = particle.y;
      particle.vy += particle.gravity * dt;
      particle.vx *= 0.982;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.rot += particle.vr * dt;
      const alpha = Math.pow(1 - progress, 1.2);
      const size = particle.size * (1 - progress * 0.5);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.55;
      ctx.strokeStyle = particle.color;
      ctx.lineWidth = Math.max(1, size * 0.62);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(particle.x, particle.y);
      ctx.stroke();

      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rot);
      if (particle.shape === 'square') ctx.fillRect(-size / 2, -size / 2, size, size);
      else if (particle.shape === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.7);
        ctx.lineTo(size * 0.62, size * 0.5);
        ctx.lineTo(-size * 0.62, size * 0.5);
        ctx.closePath();
        ctx.fill();
      } else if (particle.shape === 'star') {
        ctx.beginPath();
        for (let step = 0; step < 10; step++) {
          const r = step % 2 === 0 ? size * 0.9 : size * 0.36;
          const a = (Math.PI * step) / 5;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (step === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      } else if (particle.shape === 'diamond') {
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.85);
        ctx.lineTo(size * 0.52, 0);
        ctx.lineTo(0, size * 0.85);
        ctx.lineTo(-size * 0.52, 0);
        ctx.closePath();
        ctx.fill();
      } else if (particle.shape === 'sparkle') {
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.26, -size * 0.26);
        ctx.lineTo(size, 0);
        ctx.lineTo(size * 0.26, size * 0.26);
        ctx.lineTo(0, size);
        ctx.lineTo(-size * 0.26, size * 0.26);
        ctx.lineTo(-size, 0);
        ctx.lineTo(-size * 0.26, -size * 0.26);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (alive()) {
      rafId = requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, width, height);
      lastTime = 0;
    }
  }

  window.PadFX = { init, burst };
})();
