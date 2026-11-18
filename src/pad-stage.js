(() => {
  'use strict';

  const STORAGE_KEY = 'meme-pad-stage-v1';
  const SCALE = [60, 62, 64, 67, 69, 72, 74, 76, 79];
  const BUILT_INS = [
    {
      id: 'meme-party', name: '梗图派对', builtIn: true, layout: 9, backing: 'sunny',
      slots: ['doro', 'maodie', 'chicken', 'oiia', 'dog', 'nailong', 'dog-1', 'dog-2', 'maodie-2']
        .map((source, index) => ({ kind: 'sample', source, midi: SCALE[index] }))
    },
    {
      id: 'dog-groove', name: '大狗节奏站', builtIn: true, layout: 4, backing: 'bounce',
      slots: [
        { kind: 'drum', source: 'drum:kick' }, { kind: 'drum', source: 'drum:snare' },
        { kind: 'sample', source: 'dog-1', midi: 60 }, { kind: 'sample', source: 'dog-3', midi: 67 },
        { kind: 'drum', source: 'drum:hat' }, { kind: 'drum', source: 'drum:clap' },
        { kind: 'sample', source: 'dog-2', midi: 64 }, { kind: 'sample', source: 'dog-4', midi: 69 },
        { kind: 'note', source: 'instrument:8bit', midi: 76 }
      ]
    },
    {
      id: 'hachimi-melody', name: '哈基米旋律', builtIn: true, layout: 9, backing: 'chill',
      slots: ['hachimi-ha', 'hachimi-ji', 'hachimi-mi', 'hachimi-nan', 'hachimi-bei', 'hachimi-lv', 'hachimi-dou', 'hachimi-8', 'hachimi-9']
        .map((source, index) => ({ kind: 'sample', source, midi: SCALE[index] }))
    },
    {
      id: 'instrument-toy', name: '乐器玩具箱', builtIn: true, layout: 9, backing: 'sunny',
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
    const slots = Array.isArray(preset.slots) ? preset.slots.slice(0, 9) : [];
    while (slots.length < 9) slots.push(clone(fallback.slots[slots.length]));
    return {
      id: String(preset.id || `custom-${Date.now()}`),
      name: String(preset.name || '我的打击垫').slice(0, 24),
      builtIn: Boolean(preset.builtIn),
      layout: Number(preset.layout) === 4 ? 4 : 9,
      backing: ['sunny', 'bounce', 'chill', 'off'].includes(preset.backing) ? preset.backing : 'sunny',
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

  function visibleSlots() {
    return currentPreset().slots.slice(0, currentPreset().layout);
  }

  function renderPresets() {
    const select = $('#pad-preset-select');
    select.innerHTML = state.presets.map((preset) => `<option value="${escapeHTML(preset.id)}"${preset.id === state.presetId ? ' selected' : ''}>${escapeHTML(preset.name)}${preset.builtIn ? '' : ' · 我的'}</option>`).join('');
    $('#pad-preset-name').textContent = currentPreset().name;
    $('#pad-preset-delete').disabled = Boolean(currentPreset().builtIn);
  }

  function renderPads() {
    const preset = currentPreset();
    const grid = $('#drum-pad-grid');
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
    if (window.PadLeds) window.PadLeds.layout();
  }

  function renderSlotPicker() {
    $('#pad-slot-picker').innerHTML = visibleSlots().map((slot, index) => {
      const source = sourceInfo(slot);
      return `<button type="button" class="pad-slot-button${index === editingSlot ? ' active' : ''}" data-slot="${index}" aria-pressed="${index === editingSlot}"><span>${index + 1}</span><strong>${source.title}</strong></button>`;
    }).join('');
    $$('.pad-slot-button').forEach((button) => button.addEventListener('click', () => {
      editingSlot = Number(button.dataset.slot);
      editingKind = currentPreset().slots[editingSlot].kind;
      renderSlotPicker(); renderLibrary(); renderEditingSummary();
    }));
    renderEditingSummary();
  }

  function renderEditingSummary() {
    const slot = currentPreset().slots[editingSlot] || currentPreset().slots[0];
    if (!slot) return;
    const source = sourceInfo(slot);
    $('#pad-editing-title').textContent = `正在替换 ${editingSlot + 1} 号按键`;
    $('#pad-editing-current').textContent = `${source.title} · 点击下面任意声音即可完成替换`;
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
      return `<button class="pad-library-item" type="button" data-source="${item.source}" style="--library-color:${item.color}" ${unlocked ? '' : 'disabled'} title="${unlocked ? `装到 ${editingSlot + 1} 号按键` : '请先在卡带图鉴解锁'}">
        <span class="pad-library-visual">${visual}</span><strong>${item.title}</strong><small>${unlocked ? item.sub : '未解锁'}</small>
      </button>`;
    }).join('');
    $$('.pad-library-item').forEach((button) => button.addEventListener('click', () => {
      const item = items.find((entry) => entry.source === button.dataset.source);
      if (!item) return;
      const preset = currentPreset();
      const previous = preset.slots[editingSlot];
      preset.slots[editingSlot] = {
        kind: item.kind,
        source: item.source,
        midi: previous.midi || SCALE[editingSlot]
      };
      saveState(); renderPads(); renderLibrary();
      options.toast(`${item.title} 已装到 ${editingSlot + 1} 号按键`);
    }));
  }

  let hitLightTimer = null;
  let buttonHitTimer = null;
  let shakeTimer = null;

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
  }

  function renderBackingSelect() {
    const preset = currentPreset();
    $('#pad-backing-select').value = preset.backing;
    $('#pad-backing-name').textContent = options.loopName(preset.backing);
    const active = backingOn && !studioPaused && preset.backing !== 'off';
    // 图案的律动周期 = 两拍，跟着当前底奏的速度走。
    const grooveBpm = { sunny: 116, bounce: 138, chill: 84 }[preset.backing] || 116;
    $('#pad-playground').style.setProperty('--dance-dur', `${((60 / grooveBpm) * 2).toFixed(3)}s`);
    const toggle = $('#pad-loop-toggle');
    toggle.classList.toggle('active', active);
    toggle.setAttribute('aria-pressed', String(active));
    $('span', toggle).textContent = active ? '底奏开' : '底奏关';
    if (window.PadLeds) window.PadLeds.setActive(active);
    if (window.PadBG) window.PadBG.setActive(active);
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

  const PAD_ICONS = ['i-note', 'i-spark', 'i-play', 'i-loop', 'i-record', 'i-keyboard'];
  const BEAT_ICON_COLORS = ['#d9ef68', '#efabc2', '#91cfe8', '#f2a25a'];

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
    for (let index = 0; index < 5; index++) {
      spawnIconAt(
        centerX + (Math.random() * 2 - 1) * rect.width * .3,
        centerY + (Math.random() * 2 - 1) * rect.height * .22,
        color,
        18 + Math.random() * 20
      );
    }
  }

  function spawnBeatIcons(kick, snare) {
    if (reducedMotion()) return;
    const home = $('#pad-home');
    if (!home) return;
    const count = kick ? 2 : snare ? 1 : 0;
    for (let index = 0; index < count; index++) {
      spawnIconAt(
        Math.random() * home.clientWidth,
        90 + Math.random() * 230,
        BEAT_ICON_COLORS[Math.floor(Math.random() * BEAT_ICON_COLORS.length)],
        14 + Math.random() * 16
      );
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
      const homeRect = $('#pad-home').getBoundingClientRect();
      const rect = button.getBoundingClientRect();
      window.PadBG.hit({
        x: rect.left - homeRect.left + rect.width / 2,
        y: rect.top - homeRect.top + rect.height / 2,
        color
      });
    }
    spawnIcons(button, color);
    spawnWord(button, slot);
    shakeStage(heavy ? 'hard' : 'soft');
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
    editingSlot = Math.min(editingSlot, currentPreset().layout - 1);
    renderPresets(); renderSlotPicker(); renderLibrary(); renderBackingSelect();
    $('#pad-backpack-dialog').showModal();
  }

  function bindControls() {
    $('#pad-backpack-open').addEventListener('click', openBackpack);
    $('#backpack-pad-button')?.addEventListener('click', openBackpack);
    $('#pad-preset-select').addEventListener('change', (event) => selectPreset(event.target.value));
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
      if (currentPreset().backing === 'off') currentPreset().backing = 'sunny';
      if (studioPaused) {
        studioPaused = false;
        backingOn = true;
      } else {
        backingOn = !backingOn;
      }
      options.setBacking(backingOn, currentPreset().backing);
      renderBackingSelect(); saveState();
    });
    $('#pad-backing-select').addEventListener('change', (event) => {
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
    $('#pad-preset-save').addEventListener('click', () => {
      const input = $('#pad-custom-name');
      const name = input.value.trim();
      if (!name) {
        input.focus();
        options.toast('先给你的预设起个名字');
        return;
      }
      const preset = { ...clone(currentPreset()), id: `custom-${Date.now().toString(36)}`, name, builtIn: false };
      state.presets.push(preset);
      state.presetId = preset.id;
      input.value = '';
      saveState(); renderPresets();
      options.toast(`已保存我的预设「${name}」`);
    });
    $('#pad-custom-name').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); $('#pad-preset-save').click(); }
    });
    $('#pad-preset-delete').addEventListener('click', () => {
      const preset = currentPreset();
      if (preset.builtIn) return;
      state.presets = state.presets.filter((item) => item.id !== preset.id);
      state.presetId = 'meme-party';
      saveState(); selectPreset(state.presetId);
      options.toast('自定义预设已删除');
    });
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
  }

  function init(initOptions) {
    options = initOptions;
    loadState();
    if (window.PadFX) window.PadFX.init({ canvas: $('#pad-fx'), stage: $('#pad-playground') });
    if (window.PadLeds) window.PadLeds.init({ canvas: $('#pad-leds'), stage: $('#pad-playground') });
    if (window.PadBG) window.PadBG.init({ canvas: $('#pad-bg'), stage: $('#pad-home') });
    bindControls();
    window.addEventListener('meme-pad-beat', syncBeatLights);
    renderPads(); renderLibrary(); renderBackingSelect();
  }

  window.MemePadStage = { init };
})();
