(() => {
  'use strict';

  let root = null;
  let config = null;
  let previousFocus = null;
  let previousOverflow = '';
  let lastFrame = 0;
  const presses = new Map();
  const particles = [];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sourceTitle = (id) => config?.memes.find((meme) => meme.id === id)?.title || window.MemeMusicData.getInstrument(id)?.title || '乐器';
  const canvasColor = (value, fallback) => {
    const color = value || fallback;
    if (!color?.startsWith('var(')) return color;
    const variable = color.slice(4, -1).trim();
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || fallback;
  };

  function keyMarkup() {
    if (config.pitches.length > 8) {
      const layout = window.MemeMusicData.getPianoLayout(config.pitches, 'fall-key');
      return `<div class="record-piano-scroll" tabindex="0" aria-label="${config.pitches.length} 键录制钢琴，横向滑动查看全部音域"><div class="record-piano-keyboard" style="width:${layout.width}px">${layout.markup}</div></div>`;
    }
    return config.pitches.map((pitch, row) => ({ pitch, row })).reverse().map(({ pitch, row }, index) => `
      <button class="fall-key" type="button" data-row="${row}" style="--lane-color:${pitch.color}" aria-label="按住弹奏 ${pitch.name}，松开结束">
        <kbd>${index + 1}</kbd><strong>${pitch.name}</strong><small>${pitch.cn}</small>
      </button>`).join('');
  }

  function updateSelection() {
    if (!root || !config) return;
    root.querySelectorAll('[data-record-meme]').forEach((button) => {
      const selected = button.dataset.recordMeme === config.getSelected();
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    root.querySelector('#record-active-source').textContent = `当前：${sourceTitle(config.getSelected())}`;
  }

  function setMicState(recording, hasVocal) {
    if (!root) return;
    const button = root.querySelector('#record-mic');
    button.classList.toggle('recording', recording);
    button.setAttribute('aria-pressed', String(recording));
    button.querySelector('span').textContent = recording ? '停止人声' : hasVocal ? '重录人声' : '录人声';
    root.classList.toggle('mic-live', recording);
  }

  function spawnParticles(lane, amount = 12) {
    if (!root || reducedMotion.matches) return;
    const canvas = root.querySelector('#falling-canvas');
    const rect = canvas.getBoundingClientRect();
    const laneWidth = rect.width / config.pitches.length;
    const x = (lane + .5) * laneWidth;
    const y = rect.height * .82;
    const color = canvasColor(config.pitches[config.pitches.length - 1 - lane].color, '#d9ef68');
    for (let i = 0; i < amount && particles.length < 240; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 28 + Math.random() * 75;
      particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 28,
        life: .65 + Math.random() * .45, size: 1.5 + Math.random() * 3.5, color
      });
    }
  }

  function startPress(token, row) {
    if (!root || !config || presses.has(token)) return;
    const lane = config.pitches.length - 1 - row;
    presses.set(token, { row, lane });
    root.querySelector(`.fall-key[data-row="${row}"]`)?.classList.add('playing');
    spawnParticles(lane, 18);
    config.onPerformStart(config.getSelected(), row, token);
  }

  function endPress(token) {
    const press = presses.get(token);
    if (!press) return;
    presses.delete(token);
    if (![...presses.values()].some((item) => item.row === press.row)) {
      root?.querySelector(`.fall-key[data-row="${press.row}"]`)?.classList.remove('playing');
    }
    config?.onPerformEnd(token);
  }

  function releaseAll() {
    [...presses.keys()].forEach(endPress);
    particles.length = 0;
  }

  function onKeydown(event) {
    if (!root) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); config.onStop(); return;
    }
    const number = Number(event.key);
    if (config.pitches.length <= 8 && Number.isInteger(number) && number >= 1 && number <= config.pitches.length) {
      event.preventDefault(); event.stopPropagation();
      if (!event.repeat) startPress(`key:${event.code}`, config.pitches.length - number);
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...root.querySelectorAll('button:not(:disabled)')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function onKeyup(event) {
    const number = Number(event.key);
    if (!root || config.pitches.length > 8 || !Number.isInteger(number) || number < 1 || number > config.pitches.length) return;
    event.preventDefault(); event.stopPropagation(); endPress(`key:${event.code}`);
  }

  function bindPressTarget(element, getRow) {
    element.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      element.setPointerCapture(event.pointerId);
      startPress(`pointer:${event.pointerId}`, getRow(event));
    });
    const finish = (event) => {
      endPress(`pointer:${event.pointerId}`);
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };
    element.addEventListener('pointerup', finish);
    element.addEventListener('pointercancel', finish);
  }

  function open(options) {
    close();
    config = options;
    previousFocus = document.activeElement;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    root = document.createElement('div');
    root.id = 'record-stage';
    root.className = 'record-stage';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', '全屏边弹边录');
    root.innerHTML = `
      <div class="record-stage-top">
        <div class="record-live"><i></i><span>LIVE INPUT</span><strong id="record-clock">00:00.0</strong></div>
        <div class="record-stage-title"><strong>边弹边录</strong><span id="record-active-source"></span><small>按一下前进一步 · 连续弹奏匀速滚动 · 手动收好</small></div>
        <div class="record-actions">
          <button id="record-mic" class="record-tool" type="button" aria-pressed="false" aria-label="录制或停止人声"><i aria-hidden="true"></i><span class="record-tool-label">录人声</span></button>
          <button id="record-rewind" class="record-tool" type="button" aria-label="回到录制时间轴开头"><span class="record-rollback-icon" aria-hidden="true">↶</span><span class="record-tool-label">回到开头</span></button>
          <button id="record-finish" class="record-finish" type="button"><span aria-hidden="true">■</span><span class="record-finish-label">收好这首</span><kbd>Esc</kbd></button>
        </div>
      </div>
      <div class="record-timeline">
        <div class="record-timeline-copy"><span>拖动时间轴回滚重录</span><output id="record-seek-value" for="record-seek">0.00 步</output></div>
        <input id="record-seek" type="range" min="0" max="16" step="0.01" value="0" aria-label="录制时间轴，拖动到想重新演奏的位置">
      </div>
      <div class="falling-field">
        <canvas id="falling-canvas" aria-label="纵向落键线谱，按住对应音轨控制音符长度"></canvas>
        <div class="falling-guide" aria-hidden="true"><span>按一下前进一步</span><i></i><span>不按则等待 · 手动收好</span></div>
      </div>
      <div class="record-sample-dock" aria-label="快速切换采样">
        ${config.memes.map((meme) => `<button class="record-sample" data-record-meme="${meme.id}" type="button" aria-pressed="false" style="--sample-color:${meme.color}"><img src="${meme.image}" alt="" draggable="false"><span><strong>${meme.title}</strong><small>${meme.sub}</small></span><kbd>${meme.key}</kbd></button>`).join('')}
      </div>
      <div class="record-keybed${config.pitches.length > 8 ? ' piano-record-keybed' : ''}" style="--record-pitches:${config.pitches.length}" aria-label="长按演奏音阶">${keyMarkup()}</div>`;
    document.body.append(root);
    root.querySelector('#record-finish').addEventListener('click', config.onStop);
    const seek = root.querySelector('#record-seek');
    root.querySelector('#record-rewind').addEventListener('click', () => {
      releaseAll(); seek.value = '0'; config.onSeek(0);
    });
    seek.addEventListener('pointerdown', releaseAll);
    seek.addEventListener('input', () => config.onSeek(Number(seek.value)));
    root.querySelector('#record-mic').addEventListener('click', async () => {
      const button = root.querySelector('#record-mic');
      button.disabled = true;
      try { await config.onToggleMic(); } finally { if (root) button.disabled = false; }
    });
    root.querySelectorAll('[data-record-meme]').forEach((button) => button.addEventListener('click', () => {
      config.onSelect(button.dataset.recordMeme); updateSelection();
    }));
    root.querySelectorAll('.fall-key').forEach((button) => bindPressTarget(button, () => Number(button.dataset.row)));
    if (config.pitches.length > 8) {
      const pianoScroll = root.querySelector('.record-piano-scroll');
      const middle = root.querySelector('.fall-key[data-midi="60"]');
      if (pianoScroll && middle) pianoScroll.scrollLeft = Math.max(0, middle.offsetLeft - pianoScroll.clientWidth * .42);
    }
    const canvas = root.querySelector('#falling-canvas');
    bindPressTarget(canvas, (event) => {
      const rect = canvas.getBoundingClientRect();
      const lane = Math.max(0, Math.min(config.pitches.length - 1, Math.floor((event.clientX - rect.left) / rect.width * config.pitches.length)));
      return config.pitches.length - 1 - lane;
    });
    document.addEventListener('keydown', onKeydown, true);
    document.addEventListener('keyup', onKeyup, true);
    updateSelection();
    setMicState(Boolean(config.getMicState?.().recording), Boolean(config.getMicState?.().hasVocal));
    root.querySelector('#record-finish').focus({ preventScroll: true });
  }

  function draw(position) {
    if (!root || !config) return;
    const canvas = root.querySelector('#falling-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const w = rect.width;
    const h = rect.height;
    const count = config.pitches.length;
    const laneWidth = w / count;
    const hitY = h * .82;
    const pixelsPerStep = Math.max(35, Math.min(68, h / 10));
    const now = performance.now();
    const dt = Math.min(.04, Math.max(.001, (now - (lastFrame || now - 16)) / 1000));
    lastFrame = now;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#191d19'; ctx.fillRect(0, 0, w, h);

    const activeLanes = new Set([...presses.values()].map((press) => press.lane));
    for (let lane = 0; lane < count; lane++) {
      const row = count - 1 - lane;
      const pitch = config.pitches[row];
      ctx.globalAlpha = activeLanes.has(lane) ? .28 : .065;
      ctx.fillStyle = canvasColor(pitch.color, '#d9ef68');
      ctx.fillRect(lane * laneWidth + 1, 0, laneWidth - 2, h);
      ctx.globalAlpha = .22;
      ctx.strokeStyle = '#dce3d5'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(lane * laneWidth + .5, 0); ctx.lineTo(lane * laneWidth + .5, h); ctx.stroke();
      if (activeLanes.has(lane) && Math.random() < .72) spawnParticles(lane, 2);
    }
    ctx.globalAlpha = .12;
    ctx.strokeStyle = '#eff6e8';
    const firstLine = Math.floor(position - (h - hitY) / pixelsPerStep);
    const lastLine = Math.ceil(position + hitY / pixelsPerStep);
    for (let step = firstLine; step <= lastLine; step++) {
      if (step < 0) continue;
      const y = hitY - (step - position) * pixelsPerStep;
      ctx.lineWidth = step % 4 === 0 ? 1.5 : .6;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    config.getNotes().forEach((note) => {
      if (note.row < 0 || note.row >= count) return;
      const y = hitY - (note.col - position) * pixelsPerStep;
      const length = Math.max(10, note.length * pixelsPerStep - 5);
      if (y < -30 || y - length > h + 40) return;
      const lane = count - 1 - note.row;
      const pitch = config.pitches[note.row];
      const meme = config.memes.find((item) => item.id === note.meme);
      const instrument = window.MemeMusicData.getInstrument(note.meme);
      const x = lane * laneWidth + 7;
      const boxWidth = laneWidth - 14;
      ctx.globalAlpha = note.col + note.length < position - .5 ? .24 : 1;
      ctx.fillStyle = canvasColor(meme?.color || instrument?.color, pitch.color);
      ctx.strokeStyle = '#080b08'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(x, y - length, boxWidth, length, Math.min(12, boxWidth / 5)); ctx.fill(); ctx.stroke();
      ctx.globalAlpha *= .9;
      ctx.fillStyle = '#20241f';
      ctx.font = `800 ${Math.max(10, Math.min(17, laneWidth / 7))}px "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const label = meme?.title || instrument?.title || '音符';
      ctx.fillText(label, x + boxWidth / 2, y - length / 2, Math.max(10, boxWidth - 10));
    });

    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      particle.x += particle.vx * dt; particle.y += particle.vy * dt;
      particle.vy += 48 * dt; particle.life -= dt * 1.25;
      if (particle.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, particle.life);
      ctx.fillStyle = particle.color;
      ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2); ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#d9ef68'; ctx.fillRect(0, hitY - 2, w, 4);
    ctx.fillStyle = '#191d19';
    for (let lane = 0; lane < count; lane++) {
      ctx.beginPath(); ctx.moveTo(lane * laneWidth + laneWidth / 2 - 7, hitY + 7);
      ctx.lineTo(lane * laneWidth + laneWidth / 2 + 7, hitY + 7);
      ctx.lineTo(lane * laneWidth + laneWidth / 2, hitY + 16); ctx.fill();
    }
    const seconds = Math.max(0, position * config.stepDuration());
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const rest = (seconds % 60).toFixed(1).padStart(4, '0');
    root.querySelector('#record-clock').textContent = `${minutes}:${rest}`;
    const seek = root.querySelector('#record-seek');
    const notesEnd = config.getNotes().reduce((end, note) => Math.max(end, note.col + note.length), 0);
    const seekMax = Math.max(16, Math.ceil(Math.max(notesEnd, position + 8)));
    if (Number(seek.max) !== seekMax) seek.max = String(seekMax);
    seek.value = position.toFixed(2);
    seek.setAttribute('aria-valuetext', `${position.toFixed(2)} 步`);
    root.querySelector('#record-seek-value').textContent = `${position.toFixed(2)} 步`;
  }

  function close() {
    if (!root) return;
    releaseAll();
    document.removeEventListener('keydown', onKeydown, true);
    document.removeEventListener('keyup', onKeyup, true);
    root.remove(); root = null; config = null;
    document.body.style.overflow = previousOverflow;
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
    lastFrame = 0;
  }

  window.MemeRecordStage = { open, close, draw, updateSelection, setMicState, isOpen: () => Boolean(root) };
})();
