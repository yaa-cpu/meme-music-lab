(() => {
  'use strict';

  const STORAGE_KEY = 'meme-pad-stage-v1';
  const SCALE = [60, 62, 64, 67, 69, 72, 74, 76, 79];
  const BUILT_INS = [
    {
      id: 'meme-party', name: '梗图派对', builtIn: true, layout: 9, backing: 'friendwine',
      slots: ['doro', 'maodie', 'chicken', 'oiia', 'dog', 'nailong', 'dog-1', 'dog-2', 'bingbingbing']
        .map((source, index) => ({ kind: 'sample', source, midi: SCALE[index] }))
    },
    {
      id: 'dog-groove', name: '大狗节奏站', builtIn: true, layout: 4, backing: 'friendwine',
      slots: [
        { kind: 'drum', source: 'drum:kick' }, { kind: 'drum', source: 'drum:snare' },
        { kind: 'sample', source: 'dog-1', midi: 60 }, { kind: 'sample', source: 'dog-3', midi: 67 },
        { kind: 'drum', source: 'drum:hat' }, { kind: 'drum', source: 'drum:clap' },
        { kind: 'sample', source: 'dog-2', midi: 64 }, { kind: 'sample', source: 'dog-4', midi: 69 },
        { kind: 'note', source: 'instrument:8bit', midi: 76 }
      ]
    },
    {
      id: 'hachimi-melody', name: '哈基米旋律', builtIn: true, layout: 9, backing: 'friendwine',
      slots: ['hachimi-ha', 'hachimi-ji', 'hachimi-mi', 'hachimi-nan', 'hachimi-bei', 'hachimi-lv', 'hachimi-dou', 'hachimi-8', 'hachimi-9']
        .map((source, index) => ({ kind: 'sample', source, midi: SCALE[index] }))
    },
    {
      id: 'instrument-toy', name: '乐器玩具箱', builtIn: true, layout: 9, backing: 'friendwine',
      slots: ['piano', 'marimba', 'harp', 'guitar', 'flute', '8bit', 'bass', 'synth', 'pad']
        .map((id, index) => ({ kind: 'note', source: `instrument:${id}`, midi: SCALE[index] }))
    }
  ];

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  let options = null;
  let state = null;
  let editingSlot = 0;
  let editingKind = 'sample';
  let backingOn = true;

  function currentPreset() {
    return state.presets.find((preset) => preset.id === state.presetId) || state.presets[0];
  }

  function normalizePreset(preset) {
    const fallback = BUILT_INS[0];
    const slots = Array.isArray(preset.slots) ? preset.slots.slice(0, 36) : [];
    while (slots.length < 9) slots.push(clone(fallback.slots[slots.length]));
    return {
      id: String(preset.id || `custom-${Date.now()}`),
      name: String(preset.name || '我的打击垫').slice(0, 24),
      builtIn: Boolean(preset.builtIn),
      layout: Number(preset.layout) === 4 ? 4 : 9,
      backing: ['sunny', 'bounce', 'chill', 'friendwine', 'off'].includes(preset.backing) ? preset.backing : 'friendwine',
      slots: slots.map((slot, index) => ({
        kind: ['sample', 'note', 'drum'].includes(slot.kind) ? slot.kind : 'sample',
        source: String(slot.source || fallback.slots[index].source),
        midi: Number.isFinite(Number(slot.midi)) ? Math.max(36, Math.min(96, Number(slot.midi))) : SCALE[index]
      }))
    };
  }

  function loadState() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (_) { /* local storage is optional */ }
    const custom = Array.isArray(saved?.presets) ? saved.presets.map(normalizePreset).filter((preset) => !preset.builtIn) : [];
    state = {
      presets: [...clone(BUILT_INS), ...custom],
      presetId: saved?.presetId || 'meme-party',
      backingOn: saved?.backingOn !== false
    };
    backingOn = state.backingOn;
    if (!state.presets.some((preset) => preset.id === state.presetId)) state.presetId = 'meme-party';
  }

  function saveState() {
    state.backingOn = backingOn;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        presetId: state.presetId,
        backingOn,
        presets: state.presets.filter((preset) => !preset.builtIn)
      }));
    } catch (_) { /* private mode */ }
  }

  function sourceInfo(slot) {
    return options.sourceInfo(slot.kind, slot.source);
  }

  function ensureSlotsForLayout(preset) {
    while (preset.slots.length < preset.layout) {
      const base = preset.slots.slice(0, 9);
      const template = base[preset.slots.length % base.length] || BUILT_INS[0].slots[preset.slots.length % 9];
      preset.slots.push({ kind: template.kind, source: template.source, midi: 36 + (preset.slots.length % 48) });
    }
    if (preset.slots.length > 36) preset.slots.length = 36;
  }

  function visibleSlots() {
    ensureSlotsForLayout(currentPreset());
    return currentPreset().slots.slice(0, currentPreset().layout);
  }

  function renderPresets() {
    const select = $('#pad-preset-select');
    if (select) select.innerHTML = state.presets.map((preset) => `<option value="${escapeHTML(preset.id)}"${preset.id === state.presetId ? ' selected' : ''}>${escapeHTML(preset.name)}${preset.builtIn ? '' : ' · 我的'}</option>`).join('');
    const name = $('#pad-preset-name');
    if (name) name.textContent = currentPreset().name;
    const del = $('#pad-preset-delete');
    if (del) del.disabled = Boolean(currentPreset().builtIn);
  }

  function renderPads() {
    const preset = currentPreset();
    const grid = $('#drum-pad-grid');
    ensureSlotsForLayout(preset);
    grid.style.setProperty('--pad-columns', preset.layout === 4 ? 2 : 3);
    grid.style.setProperty('--pad-rows', preset.layout === 4 ? 2 : 3);
    grid.classList.toggle('four-pads', preset.layout === 4);
    grid.innerHTML = visibleSlots().map((slot, index) => {
      const source = sourceInfo(slot);
      const padImage = source.padImage || source.image;
      const visual = padImage
        ? `<img src="${padImage}" alt="" draggable="false">`
        : `<span class="pad-source-symbol" aria-hidden="true">${source.symbol || source.short || 'NOTE'}</span>`;
      const kindName = { sample: '梗采样', note: '乐器音符', drum: '鼓点' }[slot.kind];
      return `<button class="meme-pad pad-${slot.kind}" type="button" data-pad-index="${index}" data-source="${escapeHTML(slot.source)}" style="--pad-color:${source.color};--pad-order:${index};--dance-tilt:${index % 2 ? '-2.5deg' : '2.5deg'}" aria-label="敲击 ${source.title}，${kindName}，快捷键 ${index + 1}">
        <span class="pad-number">${index + 1}</span>
        <span class="pad-kind">${kindName}</span>
        <span class="pad-image">${visual}</span>
        <span class="pad-label"><strong>${source.title}</strong><small>${slot.kind === 'sample' || slot.kind === 'note' ? `音阶 ${index + 1} · ${slot.midi}` : source.sub || kindName}</small></span>
        <span class="pad-hit-ring" aria-hidden="true"></span>
      </button>`;
    }).join('');
    $$('.meme-pad', grid).forEach((button) => {
      button.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        hitPad(Number(button.dataset.padIndex), button);
      });
      const release = () => releasePad(Number(button.dataset.padIndex));
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('click', (event) => {
        if (event.detail === 0) hitPad(Number(button.dataset.padIndex), button);
      });
    });
    $$('#pad-layout button').forEach((button) => {
      const active = Number(button.dataset.layout) === preset.layout;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    renderPresets();
    renderSlotPicker();
    ensureDanceState(visibleSlots().length);
    if (window.PadLeds) window.PadLeds.layout();
  }

  function renderSlotPicker() {
    const preset = currentPreset();
    const picker = $('#pad-slot-picker');
    const columns = preset.layout === 4 ? 2 : 3;
    const rows = preset.layout === 4 ? 2 : 3;
    picker.className = 'pad-playground dialog-pad-surface';
    picker.innerHTML = `<div class="drum-pad-grid" style="--pad-columns:${columns};--pad-rows:${rows}">${visibleSlots().map((slot, index) => {
      const source = sourceInfo(slot);
      const padImage = source.padImage || source.image;
      const visual = padImage
        ? `<img src="${padImage}" alt="" draggable="false">`
        : `<span class="pad-source-symbol" aria-hidden="true">${source.symbol || source.short || 'NOTE'}</span>`;
      const kindName = { sample: '梗采样', note: '乐器音符', drum: '鼓点' }[slot.kind];
      return `<button type="button" class="meme-pad pad-slot-button${index === editingSlot ? ' active' : ''}" data-slot="${index}" style="--pad-color:${source.color};--pad-order:${index};--dance-tilt:${index % 2 ? '-2.5deg' : '2.5deg'}" aria-pressed="${index === editingSlot}" aria-label="第 ${index + 1} 键：${source.title}，拖声音到这里替换">
        <span class="pad-number">${index + 1}</span>
        <span class="pad-kind">${kindName}</span>
        <span class="pad-image">${visual}</span>
        <span class="pad-label"><strong>${source.title}</strong><small>${slot.kind === 'sample' || slot.kind === 'note' ? `音阶 ${index + 1} · ${slot.midi}` : source.sub || kindName}</small></span>
        <span class="pad-hit-ring" aria-hidden="true"></span>
      </button>`;
    }).join('')}</div>`;
    $$('.pad-slot-button').forEach((button) => {
      button.addEventListener('click', () => {
        editingSlot = Number(button.dataset.slot);
        editingKind = currentPreset().slots[editingSlot].kind;
        renderSlotPicker(); renderLibrary(); renderEditingSummary();
      });
      button.addEventListener('dragover', (event) => {
        event.preventDefault();
        button.classList.add('drag-over');
        event.dataTransfer.dropEffect = 'copy';
      });
      button.addEventListener('dragleave', () => button.classList.remove('drag-over'));
      button.addEventListener('drop', (event) => {
        event.preventDefault();
        button.classList.remove('drag-over');
        let payload = null;
        try { payload = JSON.parse(event.dataTransfer.getData('application/x-pad-sound') || 'null'); } catch (_) { /* ignore */ }
        if (!payload || !payload.source) return;
        const index = Number(button.dataset.slot);
        const preset = currentPreset();
        const previous = preset.slots[index];
        preset.slots[index] = { kind: payload.kind, source: payload.source, midi: previous?.midi || 36 + index };
        editingSlot = index;
        editingKind = payload.kind;
        saveState(); renderPads(); renderSlotPicker(); renderLibrary(); renderEditingSummary();
        options.toast(`${payload.title || '声音'} 已拖到 ${index + 1} 号按键`);
      });
    });
    renderEditingSummary();
  }

  function renderEditingSummary() {
    const slot = currentPreset().slots[editingSlot] || currentPreset().slots[0];
    if (!slot) return;
    const source = sourceInfo(slot);
    $('#pad-editing-title').textContent = `拖到 ${editingSlot + 1} 号按键`;
    $('#pad-editing-current').textContent = `${source.title} · 把下面的声音拖到鼓面上即可替换`;
    $$('#pad-kind-tabs button').forEach((button) => {
      const active = button.dataset.kind === editingKind;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function renderLibrary() {
    const items = options.library[editingKind] || [];
    $('#pad-library').innerHTML = items.map((item) => {
      const unlocked = options.isUnlocked(item.kind, item.source);
      const visual = item.image ? `<img src="${item.image}" alt="">` : `<span>${item.symbol || item.short || 'NOTE'}</span>`;
      return `<button class="pad-library-item" type="button" draggable="${unlocked ? 'true' : 'false'}" data-kind="${item.kind}" data-source="${item.source}" style="--library-color:${item.color}" ${unlocked ? '' : 'disabled'} title="${unlocked ? '拖到任意按键' : '请先在卡带图鉴解锁'}">
        <span class="pad-library-visual">${visual}</span><strong>${item.title}</strong><small>${unlocked ? item.sub : '未解锁'}</small>
      </button>`;
    }).join('');
    $$('.pad-library-item').forEach((button) => {
      const item = items.find((entry) => entry.source === button.dataset.source);
      if (!item) return;
      button.addEventListener('dragstart', (event) => {
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('application/x-pad-sound', JSON.stringify({ kind: item.kind, source: item.source, title: item.title }));
        button.classList.add('dragging');
      });
      button.addEventListener('dragend', () => button.classList.remove('dragging'));
    });
  }

  let hitLightTimer = null;
  let buttonHitTimer = null;
  let shakeTimer = null;
  let lastHit = null;
  let holdFxTimer = null;

  // 长按时的持续视觉反馈：少量但持续的火花/光圈/灯带，避免把按键糊成一片。
  function startHoldFx(index, button) {
    stopHoldFx();
    let tickCount = 0;
    const tick = () => {
      const slot = currentPreset().slots[index];
      if (!slot || !button || !button.isConnected) return;
      const color = resolveColor(sourceInfo(slot).color);
      const stage = $('#pad-playground');
      if (stage) stage.style.setProperty('--hit-color', slot.color || color);
      tickCount += 1;
      const home = $('#pad-home');
      if (home) {
        const homeRect = home.getBoundingClientRect();
        const rect = button.getBoundingClientRect();
        const centerX = rect.left - homeRect.left + rect.width / 2;
        const centerY = rect.top - homeRect.top + rect.height / 2;
        for (let i = 0; i < 3; i++) {
          spawnIconAt(
            centerX + (Math.random() * 2 - 1) * rect.width * .34,
            centerY + (Math.random() * 2 - 1) * rect.height * .24,
            color,
            12 + Math.random() * 18
          );
        }
      }
      if (window.PadLeds) window.PadLeds.hit(index, color);
      if (tickCount % 2 === 0 && window.PadFX) {
        const hit = hitGeometry(button);
        window.PadFX.burst({ x: hit.x, y: hit.y, w: hit.w, h: hit.h, color, kind: 'hold', neighbors: [] });
      }
      if (tickCount % 2 === 0 && window.PadBG) {
        const homeRect = $('#pad-home').getBoundingClientRect();
        const rect = button.getBoundingClientRect();
        window.PadBG.hit({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, color });
      }
      applyDanceHit(index);
    };
    tick();
    holdFxTimer = setInterval(tick, 200);
  }

  function stopHoldFx() {
    if (holdFxTimer) clearInterval(holdFxTimer);
    holdFxTimer = null;
    const stage = $('#pad-playground');
    if (stage) stage.classList.remove('is-holding');
  }

  const HIT_WORDS = {
    kick: ['咚!', 'BANG!'],
    snare: ['啪!', 'POW!'],
    hat: ['嚓!', 'TSS!'],
    openhat: ['嚓——!', 'TSSS!'],
    clap: ['啪!', 'CLAP!'],
    sample: ['哈!', 'WA!', '嘿嘿!', '哇!'],
    note: ['叮!', 'DING!', '嘀!']
  };

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 卡片颜色在数据里是 CSS 变量（var(--p-yellow)），canvas 不认，先解析成真实颜色并缓存。
  const colorCache = new Map();
  let colorProbe = null;
  const FALLBACK_COLOR = '#d7ed62';

  function resolveColor(value) {
    if (!value) return FALLBACK_COLOR;
    if (!String(value).includes('var(')) return value;
    if (colorCache.has(value)) return colorCache.get(value);
    const probe = document.createElement('span');
    probe.style.display = 'none';
    probe.style.color = value;
    document.body.append(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();
    let resolved = FALLBACK_COLOR;
    if (computed) {
      colorProbe = colorProbe || document.createElement('canvas').getContext('2d');
      colorProbe.fillStyle = '#000000';
      colorProbe.fillStyle = computed;
      resolved = colorProbe.fillStyle || FALLBACK_COLOR;
    }
    colorCache.set(value, resolved);
    return resolved;
  }

  let studioPaused = false;

  function resetBeatVisuals() {
    const stage = $('#pad-playground');
    stage.classList.remove('beat-kick', 'beat-snare');
    document.body.classList.remove('fx-kick', 'fx-snare');
    $('#pad-home')?.classList.remove('fx-kick', 'fx-snare');
    if (window.PadLeds) window.PadLeds.setActive(false);
  }

  // 页面背景也跟着底奏呼吸：kick 铺一层暖色光，snare 换一层粉色扫光。
  function pulsePage(kick, snare) {
    if (reducedMotion()) return;
    const body = document.body;
    const home = $('#pad-home');
    body.classList.remove('fx-kick', 'fx-snare');
    home?.classList.remove('fx-kick', 'fx-snare');
    void body.offsetWidth;
    if (kick) { body.classList.add('fx-kick'); home?.classList.add('fx-kick'); }
    if (snare) { body.classList.add('fx-snare'); home?.classList.add('fx-snare'); }
  }

  function syncBeatLights(event) {
    const detail = event.detail;
    const { id, kick, snare } = detail;
    if (!backingOn || currentPreset().backing !== id) return;
    const stage = $('#pad-playground');
    stage.classList.toggle('beat-kick', kick);
    stage.classList.toggle('beat-snare', snare);
    if (window.PadLeds) window.PadLeds.beat(detail);
    if (window.PadBG) window.PadBG.beat(detail);
    pulsePage(kick, snare);
    spawnBeatIcons(kick, snare);
    applyDanceBeat(detail);
  }

  function renderBackingSelect() {
    const preset = currentPreset();
    const backingSelect = $('#pad-backing-select');
    if (backingSelect) backingSelect.value = preset.backing;
    $('#pad-backing-name').textContent = options.loopName(preset.backing);
    const active = backingOn && !studioPaused && preset.backing !== 'off';
    // 图案的律动周期 = 两拍，跟着当前底奏的速度走（BPM 由 pad-grooves 引擎提供）。
    const grooveBpm = (window.PadGrooves && window.PadGrooves.padGrooveBpm)
      ? window.PadGrooves.padGrooveBpm(preset.backing)
      : ({ sunny: 124, bounce: 134, chill: 86, friendwine: 130 }[preset.backing] || 124);
    $('#pad-playground').style.setProperty('--dance-dur', `${((60 / grooveBpm) * 2).toFixed(3)}s`);
    const toggle = $('#pad-loop-toggle');
    toggle.classList.toggle('active', active);
    toggle.setAttribute('aria-pressed', String(active));
    $('span', toggle).textContent = active ? '底奏开' : '底奏关';
    if (window.PadLeds) window.PadLeds.setActive(active);
    if (window.PadBG) window.PadBG.setActive(active);
    dance.active = active;
    if (active) ensureDanceLoop();
    if (!active) resetBeatVisuals();
  }

  function hitGeometry(button) {
    const stage = $('#pad-playground');
    const origin = ($('#pad-fx') || stage).getBoundingClientRect();
    const rect = button.getBoundingClientRect();
    return {
      x: rect.left - origin.left + rect.width / 2,
      y: rect.top - origin.top + rect.height / 2,
      w: rect.width,
      h: rect.height,
      neighborRects: [...button.parentElement.children].filter((pad) => pad !== button).map((pad) => {
        const box = pad.getBoundingClientRect();
        return { x: box.left - origin.left, y: box.top - origin.top, w: box.width, h: box.height };
      })
    };
  }

  function neighborPulses(button, hit) {
    const selfX = hit.x;
    const selfY = hit.y;
    const distances = hit.neighborRects.map((rect) => Math.hypot(rect.x + rect.w / 2 - selfX, rect.y + rect.h / 2 - selfY));
    const farthest = Math.max(...distances, 1);
    return hit.neighborRects.map((rect, index) => ({
      x: rect.x, y: rect.y, w: rect.w, h: rect.h,
      delay: 26 + (distances[index] / farthest) * 130
    }));
  }

  function spawnWord(button, slot) {
    if (reducedMotion()) return;
    const stage = $('#pad-playground');
    const hit = hitGeometry(button);
    const list = slot.kind === 'drum'
      ? HIT_WORDS[slot.source.replace('drum:', '')] || HIT_WORDS.snare
      : HIT_WORDS[slot.kind] || HIT_WORDS.sample;
    const text = list[Math.floor(Math.random() * list.length)];
    const word = document.createElement('b');
    word.className = 'pad-word';
    word.setAttribute('aria-hidden', 'true');
    word.textContent = text;
    if (/[\u3400-\u9fff]/.test(text)) word.classList.add('is-cjk');
    word.style.left = `${hit.x}px`;
    word.style.top = `${hit.y}px`;
    word.style.setProperty('--word-rotate', `${(Math.random() * 20 - 10).toFixed(1)}deg`);
    stage.append(word);
    setTimeout(() => word.remove(), 700);
  }

  function shakeStage(strength) {
    if (reducedMotion()) return;
    const stage = $('#pad-playground');
    stage.classList.remove('shake-soft', 'shake-hard');
    void stage.offsetWidth;
    stage.classList.add(strength === 'hard' ? 'shake-hard' : 'shake-soft');
    clearTimeout(shakeTimer);
    shakeTimer = setTimeout(() => stage.classList.remove('shake-soft', 'shake-hard'), 340);
  }

  const PAD_ICONS = [
    'i-note', 'i-eighth', 'i-spark', 'i-sparkle', 'i-play', 'i-loop', 'i-record', 'i-keyboard',
    'i-star', 'i-bolt', 'i-heart', 'i-flame', 'i-paw', 'i-diamond', 'i-crown', 'i-cat',
    'i-sun', 'i-bubble', 'i-dice', 'i-eye', 'i-moon', 'i-cloud'
  ];
  const BEAT_ICON_COLORS = ['#d9ef68', '#efabc2', '#91cfe8', '#f2a25a'];

  // ---- 图案律动引擎：底鼓跳、军鼓甩、踩镲颠、贝斯压、和弦扭，敲击给一记大力 ----
  const dance = { rafId: 0, last: 0, time: 0, active: false, states: [] };

  function ensureDanceState(count) {
    if (dance.states.length === count) return;
    dance.states = Array.from({ length: count }, () => ({ y: 0, vy: 0, rot: 0, vr: 0, sc: 0, vs: 0 }));
  }

  function clampDance(state) {
    state.y = Math.max(-80, Math.min(30, state.y));
    state.rot = Math.max(-30, Math.min(30, state.rot));
    state.sc = Math.max(-.2, Math.min(.22, state.sc));
  }

  function ensureDanceLoop() {
    if (reducedMotion()) return;
    if (dance.rafId) return;
    dance.last = 0;
    dance.rafId = requestAnimationFrame(danceTick);
  }

  function danceTick(now) {
    dance.rafId = 0;
    const dt = dance.last ? Math.min(.05, (now - dance.last) / 1000) : .016;
    dance.last = now;
    dance.time += dt;
    const images = $$('.pad-image');
    let moving = false;
    for (let index = 0; index < images.length; index++) {
      const state = dance.states[index];
      if (!state) continue;
      state.vy += (-150 * state.y - 13 * state.vy) * dt;
      state.vr += (-150 * state.rot - 12 * state.vr) * dt;
      state.vs += (-170 * state.sc - 13 * state.vs) * dt;
      state.y += state.vy * dt;
      state.rot += state.vr * dt;
      state.sc += state.vs * dt;
      clampDance(state);
      const idleY = dance.active ? Math.sin(dance.time * 2 + index * .85) * 2.2 : 0;
      const idleRot = dance.active ? Math.sin(dance.time * 1.25 + index * 1.1) * 2.6 : 0;
      const y = state.y + idleY;
      const rot = state.rot + idleRot;
      images[index].style.transform = `translate(-50%,-50%) translateY(${y.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${(1 + state.sc).toFixed(3)})`;
      if (Math.abs(state.y) > .25 || Math.abs(state.vy) > 5 || Math.abs(state.rot) > .3 || Math.abs(state.vr) > 6 || Math.abs(state.sc) > .004) moving = true;
    }
    if (moving || dance.active) {
      dance.rafId = requestAnimationFrame(danceTick);
    } else {
      images.forEach((image) => { image.style.transform = ''; });
      dance.states.forEach((state) => { state.y = 0; state.vy = 0; state.rot = 0; state.vr = 0; state.sc = 0; state.vs = 0; });
      dance.last = 0;
    }
  }

  // 每个键的舞步不一样：跳、甩头、压扁、扭身四种动作轮着来，幅度也跟着乐器走。
  function applyDanceBeat(detail) {
    if (reducedMotion()) return;
    ensureDanceLoop();
    const step = Number(detail.step) || 0;
    dance.states.forEach((state, index) => {
      const row = Math.floor(index / 3);
      const move = (index + row) % 4;
      if (detail.kick) {
        if (move === 0) state.vy -= 300 + row * 40;
        else if (move === 1) state.vr += (index % 2 ? 1 : -1) * 170;
        else if (move === 2) state.vs += 1.15;
        else { state.vy -= 150; state.vs -= .5; }
      }
      if (detail.snare) {
        state.vr += (index % 2 ? 1 : -1) * (300 + Math.random() * 90);
        state.vs += .35;
      }
      if (detail.hat) state.vy -= 90 + Math.random() * 60;
      if (detail.bass) state.vs -= 1.1;
      if (detail.chord && step % 8 === 0) {
        state.vr += Math.sin(index * .9 + step) * 210;
        state.vy -= 110;
      }
    });
  }

  function applyDanceHit(index) {
    if (reducedMotion()) return;
    ensureDanceLoop();
    const state = dance.states[index];
    if (!state) return;
    state.vy -= 520;
    state.vs += 2.2;
    state.vr += (Math.random() * 2 - 1) * 380;
  }

  function spawnIconAt(x, y, color, size) {
    const home = $('#pad-home');
    if (!home) return;
    const icon = document.createElement('span');
    icon.className = 'pad-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.style.left = `${x}px`;
    icon.style.top = `${y}px`;
    icon.style.color = color;
    icon.style.setProperty('--icon-size', `${size}px`);
    icon.style.setProperty('--icon-rot', `${(Math.random() * 90 - 45).toFixed(0)}deg`);
    icon.style.setProperty('--icon-drift-x', `${(Math.random() * 150 - 75).toFixed(0)}px`);
    icon.innerHTML = `<svg><use href="#${PAD_ICONS[Math.floor(Math.random() * PAD_ICONS.length)]}"/></svg>`;
    home.append(icon);
    setTimeout(() => icon.remove(), 1200);
  }

  function spawnIcons(button, color) {
    if (reducedMotion()) return;
    const home = $('#pad-home');
    if (!home) return;
    const homeRect = home.getBoundingClientRect();
    const rect = button.getBoundingClientRect();
    const centerX = rect.left - homeRect.left + rect.width / 2;
    const centerY = rect.top - homeRect.top + rect.height / 2;
    for (let index = 0; index < 9; index++) {
      spawnIconAt(
        centerX + (Math.random() * 2 - 1) * rect.width * .38,
        centerY + (Math.random() * 2 - 1) * rect.height * .26,
        color,
        14 + Math.random() * 26
      );
    }
  }

  function spawnBeatIcons(kick, snare) {
    if (reducedMotion()) return;
    const home = $('#pad-home');
    if (!home) return;
    const count = kick ? 3 : snare ? 2 : 0;
    for (let index = 0; index < count; index++) {
      spawnIconAt(
        Math.random() * home.clientWidth,
        80 + Math.random() * 240,
        BEAT_ICON_COLORS[Math.floor(Math.random() * BEAT_ICON_COLORS.length)],
        14 + Math.random() * 20
      );
    }
  }

  // 卡拍奖励：卡到底奏拍子上时在按下的键上方冒“完美 / 不错”气泡，并累计连击。
  function showRating(detail) {
    if (!detail || (detail.rating !== 'perfect' && detail.rating !== 'good')) return;
    if (!lastHit || !lastHit.button || !lastHit.button.isConnected) return;
    const home = $('#pad-home');
    if (!home) return;
    const homeRect = home.getBoundingClientRect();
    const rect = lastHit.button.getBoundingClientRect();
    const milestone = detail.rating === 'perfect' && detail.combo >= 5 && detail.combo % 5 === 0;
    const bubble = document.createElement('div');
    bubble.className = `pad-rating ${detail.rating}${milestone ? ' milestone' : ''}`;
    bubble.innerHTML = `<strong>${detail.rating === 'perfect' ? '完美！' : '不错！'}</strong><small>×${detail.combo}</small>`;
    bubble.style.left = `${rect.left - homeRect.left + rect.width / 2}px`;
    bubble.style.top = `${rect.top - homeRect.top + rect.height * .18}px`;
    home.appendChild(bubble);
    setTimeout(() => bubble.remove(), 980);
    if (milestone) {
      spawnIcons(lastHit.button, resolveColor(sourceInfo(lastHit.slot).color));
      spawnBeatIcons(true, false);
    }
  }

  function burst(button, slot) {
    const stage = $('#pad-playground');
    const source = sourceInfo(slot);
    const hit = hitGeometry(button);
    const heavy = slot.kind === 'drum' || slot.kind === 'sample';
    const color = resolveColor(source.color);

    stage.style.setProperty('--hit-color', source.color);
    stage.classList.remove('hit');
    void stage.offsetWidth;
    stage.classList.add('hit');
    clearTimeout(hitLightTimer);
    hitLightTimer = setTimeout(() => stage.classList.remove('hit'), 540);

    button.classList.remove('hit');
    void button.offsetWidth;
    button.classList.add('hit');
    clearTimeout(buttonHitTimer);
    buttonHitTimer = setTimeout(() => button.classList.remove('hit'), 350);

    if (window.PadFX) {
      window.PadFX.burst({ x: hit.x, y: hit.y, w: hit.w, h: hit.h, color, kind: slot.kind, neighbors: neighborPulses(button, hit) });
    }
    if (window.PadLeds) window.PadLeds.hit(Number(button.dataset.padIndex), color);
    if (window.PadBG) {
      const rect = button.getBoundingClientRect();
      window.PadBG.hit({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        color
      });
    }
    spawnIcons(button, color);
    applyDanceHit(Number(button.dataset.padIndex));
    spawnWord(button, slot);
    shakeStage(heavy ? 'hard' : 'soft');
  }

  function releasePad(index) {
    const slot = currentPreset().slots[index];
    const button = $(`.meme-pad[data-pad-index="${index}"]`);
    if (button) button.classList.remove('holding');
    stopHoldFx();
    if (!slot) return;
    options.release?.(slot, index);
  }

  async function hitPad(index, button) {
    const preset = currentPreset();
    const slot = preset.slots[index];
    if (!slot) return;
    if (!options.isUnlocked(slot.kind, slot.source)) {
      options.toast('这张卡带还未解锁，请到背包图鉴完成任务');
      return;
    }
    // 从线谱区回来继续敲：自动把底奏接上（用户手动关掉的情况不会自动开）。
    if (studioPaused) {
      studioPaused = false;
      renderBackingSelect();
    }
    lastHit = { index, button, slot };
    if (button) {
      button.classList.add('holding');
      startHoldFx(index, button);
      const stage = $('#pad-playground');
      if (stage) stage.classList.add('is-holding');
    }
    options.hit(slot, index);
    if (backingOn && currentPreset().backing !== 'off') options.setBacking(true, currentPreset().backing);
    if (button) burst(button, slot);
    $('#pad-live-status').innerHTML = `<strong>${sourceInfo(slot).title}</strong><span id="pad-backing-name">${options.loopName(preset.backing)}</span>`;
  }

  function selectPreset(id) {
    if (!state.presets.some((preset) => preset.id === id)) return;
    state.presetId = id;
    editingSlot = 0;
    const preset = currentPreset();
    editingKind = preset.slots[0].kind;
    renderPads(); renderLibrary(); renderBackingSelect(); saveState();
    options.setBacking(backingOn, preset.backing);
  }

  function openBackpack() {
    editingSlot = Math.max(0, Math.min(editingSlot, currentPreset().layout - 1));
    renderPresets(); renderSlotPicker(); renderLibrary(); renderBackingSelect();
    $('#pad-backpack-dialog').showModal();
  }

  function bindControls() {
    $('#pad-backpack-open').addEventListener('click', openBackpack);
    $('#backpack-pad-button')?.addEventListener('click', openBackpack);
    $('#pad-preset-select')?.addEventListener('change', (event) => selectPreset(event.target.value));
    $('#pad-surprise').addEventListener('click', () => {
      const builtIns = state.presets.filter((preset) => preset.builtIn);
      const current = builtIns.findIndex((preset) => preset.id === state.presetId);
      selectPreset(builtIns[(current + 1) % builtIns.length].id);
      options.toast(`已换上「${currentPreset().name}」`);
    });
    $$('#pad-layout button').forEach((button) => button.addEventListener('click', () => {
      currentPreset().layout = Number(button.dataset.layout);
      editingSlot = 0;
      saveState(); renderPads(); renderLibrary();
    }));
    $('#pad-loop-toggle').addEventListener('click', () => {
      const grooves = ['friendwine', 'sunny', 'bounce', 'chill'];
      const current = currentPreset().backing;
      const pool = grooves.filter((id) => id !== current);
      const next = pool[Math.floor(Math.random() * pool.length)] || 'friendwine';
      currentPreset().backing = next;
      studioPaused = false;
      backingOn = true;
      options.setBacking(true, next);
      renderBackingSelect(); saveState();
      options.toast(`底奏：${options.loopName(next)}`);
    });
    $('#pad-backing-select')?.addEventListener('change', (event) => {
      currentPreset().backing = event.target.value;
      backingOn = event.target.value !== 'off';
      studioPaused = false;
      options.setBacking(backingOn, currentPreset().backing);
      renderBackingSelect(); saveState();
      options.toast(event.target.value === 'off' ? '底奏已关闭' : `底奏：${options.loopName(event.target.value)}`);
    });
    // 用户一走到线谱/演奏区，底奏自动让位，避免和正在编辑的东西打架。
    const studio = $('.studio-layout');
    if (studio) {
      ['pointerdown', 'keydown', 'focusin'].forEach((type) => {
        studio.addEventListener(type, () => {
          if (studioPaused || !backingOn) return;
          studioPaused = true;
          options.setBacking(false, currentPreset().backing);
          renderBackingSelect();
          options.toast('底奏已暂停 · 回到打击垫敲一下自动续上');
        }, true);
      });
    }
    $$('#pad-kind-tabs button').forEach((button) => button.addEventListener('click', () => {
      editingKind = button.dataset.kind;
      renderEditingSummary(); renderLibrary();
    }));
    const dialog = $('#pad-backpack-dialog');
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || $('dialog[open]') || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      if (!/^[1-9]$/.test(event.key)) return;
      const rect = $('#pad-home').getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight * .55 || document.querySelector('.record-stage')) return;
      const index = Number(event.key) - 1;
      const button = $(`.meme-pad[data-pad-index="${index}"]`);
      if (!button) return;
      event.preventDefault(); event.stopPropagation();
      hitPad(index, button);
    }, true);
    document.addEventListener('keyup', (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      if (!/^[1-9]$/.test(event.key)) return;
      releasePad(Number(event.key) - 1);
    }, true);
    window.addEventListener('pointerup', () => { if (lastHit) releasePad(lastHit.index); });
    window.addEventListener('pointercancel', () => { if (lastHit) releasePad(lastHit.index); });
  }

  function init(initOptions) {
    options = initOptions;
    loadState();
    if (window.PadFX) window.PadFX.init({ canvas: $('#pad-fx'), stage: $('#pad-playground') });
    if (window.PadLeds) window.PadLeds.init({ canvas: $('#pad-leds'), stage: $('#pad-playground') });
    if (window.PadBG) window.PadBG.init({ canvas: $('#pad-bg'), stage: $('#pad-home') });
    bindControls();
    window.addEventListener('meme-pad-beat', syncBeatLights);
    window.addEventListener('meme-pad-rating', (event) => showRating(event.detail));
    renderPads(); renderLibrary(); renderBackingSelect();
  }

  window.MemePadStage = { init };
})();
