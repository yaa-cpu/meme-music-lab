/* 鼓面灯带：铺在按键之间的所有空隙里，随底奏节拍和敲击做出不同的跑马灯反馈。
   画布位于按键下层（z-index:1），只在底奏开启或有残余能量时跑 rAF。 */
(() => {
  'use strict';

  const ACID = '#d9ef68';
  const PINK = '#efabc2';
  const BLUE = '#91cfe8';
  const ORANGE = '#f2a25a';
  const DIM = '#333d2d';
  const MAX_ENERGY = 1.5;
  const H_SEGMENTS = 16;
  const V_SEGMENTS = 12;

  let canvas = null;
  let ctx = null;
  let stage = null;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let bands = [];
  let cells = [];
  let active = false;
  let rafId = 0;
  let lastTime = 0;
  let reduced = false;

  function init(options) {
    canvas = options.canvas;
    stage = options.stage;
    if (!canvas || !stage) return;
    ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced = query.matches;
    if (query.addEventListener) query.addEventListener('change', (event) => { reduced = event.matches; draw(); });
    resize();
    if (window.ResizeObserver) new ResizeObserver(() => { layout(); }).observe(stage);
    window.addEventListener('resize', () => layout());
  }

  function resize() {
    if (!canvas || !stage) return;
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function roundRect(x, y, w, h, radius) {
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

  function layout() {
    if (!canvas || !stage) return;
    resize();
    const origin = canvas.getBoundingClientRect();
    const pads = [...stage.querySelectorAll('.meme-pad')].map((pad) => {
      const rect = pad.getBoundingClientRect();
      return { x: rect.left - origin.left, y: rect.top - origin.top, w: rect.width, h: rect.height };
    });
    if (!pads.length) { bands = []; cells = []; return; }

    const minX = Math.min(...pads.map((pad) => pad.x));
    const maxX = Math.max(...pads.map((pad) => pad.x + pad.w));
    const minY = Math.min(...pads.map((pad) => pad.y));
    const maxY = Math.max(...pads.map((pad) => pad.y + pad.h));
    const xs = [...new Set(pads.map((pad) => Math.round(pad.x)))].sort((a, b) => a - b);
    const ys = [...new Set(pads.map((pad) => Math.round(pad.y)))].sort((a, b) => a - b);
    const thickness = 4;
    const nextBands = [];
    const nextCells = [];

    const hYs = [minY / 2];
    for (let index = 0; index < ys.length - 1; index++) {
      const rowBottom = ys[index] + pads[0].h;
      hYs.push((rowBottom + ys[index + 1]) / 2);
    }
    hYs.push(height - (height - maxY) / 2);

    const vXs = [minX / 2];
    for (let index = 0; index < xs.length - 1; index++) {
      const colRight = xs[index] + pads[0].w;
      vXs.push((colRight + xs[index + 1]) / 2);
    }
    vXs.push(width - (width - maxX) / 2);

    hYs.forEach((y) => {
      const span = maxX - minX;
      const cellW = span / H_SEGMENTS;
      const band = { axis: 'h', y, cells: [] };
      for (let index = 0; index < H_SEGMENTS; index++) {
        const cell = {
          axis: 'h', i: index,
          x: minX + index * cellW + 1,
          y: y - thickness / 2,
          w: Math.max(2, cellW - 2),
          h: thickness,
          e: 0, color: ACID
        };
        band.cells.push(cell);
        nextCells.push(cell);
      }
      nextBands.push(band);
    });

    vXs.forEach((x) => {
      const span = maxY - minY;
      const cellH = span / V_SEGMENTS;
      const band = { axis: 'v', x, cells: [] };
      for (let index = 0; index < V_SEGMENTS; index++) {
        const cell = {
          axis: 'v', i: index,
          x: x - thickness / 2,
          y: minY + index * cellH + 1,
          w: thickness,
          h: Math.max(2, cellH - 2),
          e: 0, color: ACID
        };
        band.cells.push(cell);
        nextCells.push(cell);
      }
      nextBands.push(band);
    });

    bands = nextBands;
    cells = nextCells;
    draw();
  }

  function ensureLoop() {
    if (reduced || rafId) return;
    lastTime = 0;
    rafId = requestAnimationFrame(tick);
  }

  function addEnergy(cell, amount, color) {
    cell.e = Math.min(MAX_ENERGY, cell.e + amount);
    cell.color = color;
  }

  function hit(index, color) {
    if (!cells.length) return;
    const pad = stage.querySelector(`.meme-pad[data-pad-index="${index}"]`);
    if (!pad) return;
    const origin = canvas.getBoundingClientRect();
    const rect = pad.getBoundingClientRect();
    const padBox = { x: rect.left - origin.left, y: rect.top - origin.top, w: rect.width, h: rect.height };
    const reach = Math.max(20, rect.width * 0.28);
    for (const cell of cells) {
      if (cell.axis === 'h') {
        const nearRow = Math.abs(cell.y - padBox.y) < reach || Math.abs(cell.y - (padBox.y + padBox.h)) < reach;
        const nearColumn = cell.x + cell.w > padBox.x - 6 && cell.x < padBox.x + padBox.w + 6;
        if (nearRow && nearColumn) addEnergy(cell, 1.15, color);
      } else {
        const nearColumn = Math.abs(cell.x - padBox.x) < reach || Math.abs(cell.x - (padBox.x + padBox.w)) < reach;
        const nearRow = cell.y + cell.h > padBox.y - 6 && cell.y < padBox.y + padBox.h + 6;
        if (nearColumn && nearRow) addEnergy(cell, 1.15, color);
      }
    }
    ensureLoop();
  }

  function beat(detail) {
    if (!cells.length) return;
    const position = Number(detail?.position) || 0;
    const hPos = Math.round((position / 16) * (H_SEGMENTS - 1));
    const vPos = Math.round((position / 16) * (V_SEGMENTS - 1));

    if (detail.kick) {
      for (const band of bands) {
        if (band.axis !== 'h') continue;
        band.cells.forEach((cell) => {
          const distance = Math.abs(cell.i - hPos);
          if (distance <= 3) addEnergy(cell, 1.25 - distance * 0.22, ACID);
          else addEnergy(cell, 0.42, ACID);
        });
      }
    }
    if (detail.snare) {
      for (const band of bands) {
        if (band.axis !== 'v') continue;
        band.cells.forEach((cell) => {
          const distance = Math.abs(cell.i - vPos);
          if (distance <= 3) addEnergy(cell, 1.05 - distance * 0.18, PINK);
          else addEnergy(cell, 0.3, PINK);
        });
      }
    }
    if (detail.hat) {
      for (const band of bands) {
        if (band.axis !== 'v') continue;
        const offset = Math.floor(Math.random() * 3) - 1;
        const cell = band.cells[Math.max(0, Math.min(V_SEGMENTS - 1, vPos + offset))];
        if (cell) addEnergy(cell, 0.4, BLUE);
      }
    }
    if (detail.bass) {
      for (const band of bands) {
        if (band.axis !== 'h') continue;
        band.cells.forEach((cell) => {
          if (Math.abs(cell.i - hPos) <= 2) addEnergy(cell, 0.7, ORANGE);
        });
      }
    }
    if (detail.chord) {
      for (const cell of cells) addEnergy(cell, 0.14, BLUE);
    }
    if (detail.kick || detail.snare) ensureLoop();
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    for (const cell of cells) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = DIM;
      roundRect(cell.x, cell.y, cell.w, cell.h, cell.w > cell.h ? cell.h / 2 : cell.w / 2);
      ctx.fill();
      if (cell.e > 0.02) {
        const alpha = Math.min(1, cell.e);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = cell.color;
        roundRect(cell.x, cell.y, cell.w, cell.h, cell.w > cell.h ? cell.h / 2 : cell.w / 2);
        ctx.fill();
        ctx.globalAlpha = alpha * 0.28;
        roundRect(cell.x - 1.5, cell.y - 1.5, cell.w + 3, cell.h + 3, 3);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function tick(now) {
    rafId = 0;
    const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0.016;
    lastTime = now;
    let any = false;
    for (const cell of cells) {
      if (cell.e <= 0.002) { cell.e = 0; continue; }
      cell.e = Math.max(0, cell.e - dt * 2.3);
      any = true;
    }
    draw();
    if (active || any) {
      rafId = requestAnimationFrame(tick);
    } else {
      lastTime = 0;
    }
  }

  function setActive(flag) {
    active = Boolean(flag);
    if (active) ensureLoop();
    else if (!reduced) ensureLoop();
  }

  window.PadLeds = { init, layout, hit, beat, setActive };
})();
