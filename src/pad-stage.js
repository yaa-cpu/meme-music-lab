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
        { kind: 'loop', source: 'loop:bounce' }
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
        kind: ['sample', 'note', 'drum', 'loop'].includes(slot.kind) ? slot.kind : 'sample',
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
    grid.classList.toggle('four-pads', preset.layout === 4);
    grid.innerHTML = visibleSlots().map((slot, index) => {
      const source = sourceInfo(slot);
      const visual = source.image
        ? `<img src="${source.image}" alt="" draggable="false">`
        : `<span class="pad-source-symbol" aria-hidden="true">${source.symbol || source.short || 'NOTE'}</span>`;
      const kindName = { sample: '梗采样', note: '乐器音符', drum: '鼓点', loop: 'Loop' }[slot.kind];
      return `<button class="meme-pad pad-${slot.kind}" type="button" data-pad-index="${index}" style="--pad-color:${source.color};--pad-order:${index}" aria-label="敲击 ${source.title}，${kindName}，快捷键 ${index + 1}">
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
      if (item.kind === 'loop') {
        preset.backing = item.source.replace('loop:', '');
        $('#pad-backing-select').value = preset.backing;
        if (backingOn) options.setBacking(true, preset.backing);
      }
      saveState(); renderPads(); renderLibrary();
      options.toast(`${item.title} 已装到 ${editingSlot + 1} 号按键`);
    }));
  }

  let hitLightTimer = null;

  function buildLightStrips() {
    ['#pad-light-strip', '#pad-light-strip-bottom'].forEach((selector) => {
      $(selector).innerHTML = Array.from({ length: 16 }, (_, index) => `<i data-beat="${index}"></i>`).join('');
    });
  }

  function clearBeatLights() {
    const stage = $('#pad-playground');
    stage.classList.remove('beat-kick', 'beat-snare');
    $$('.pad-light-strip i').forEach((light) => light.classList.remove('current', 'trail'));
  }

  function syncBeatLights(event) {
    const { position, id, kick, snare } = event.detail;
    if (!backingOn || currentPreset().backing !== id) return;
    const stage = $('#pad-playground');
    stage.classList.toggle('beat-kick', kick);
    stage.classList.toggle('beat-snare', snare);
    $$('.pad-light-strip').forEach((strip) => {
      [...strip.children].forEach((light, index) => {
        const distance = (position - index + 16) % 16;
        light.classList.toggle('current', index === position);
        light.classList.toggle('trail', distance > 0 && distance < 4);
      });
    });
  }

  function renderBackingSelect() {
    const preset = currentPreset();
    $('#pad-backing-select').value = preset.backing;
    $('#pad-backing-name').textContent = options.loopName(preset.backing);
    const toggle = $('#pad-loop-toggle');
    toggle.classList.toggle('active', backingOn && preset.backing !== 'off');
    toggle.setAttribute('aria-pressed', String(backingOn && preset.backing !== 'off'));
    $('span', toggle).textContent = backingOn && preset.backing !== 'off' ? 'Loop 开' : 'Loop 关';
    if (!backingOn || preset.backing === 'off') clearBeatLights();
  }

  function burst(button, slot) {
    const stage = $('#pad-playground');
    const source = sourceInfo(slot);
    const stageRect = stage.getBoundingClientRect();
    const rect = button.getBoundingClientRect();
    const x = rect.left - stageRect.left + rect.width / 2;
    const y = rect.top - stageRect.top + rect.height / 2;
    stage.style.setProperty('--hit-color', source.color);
    stage.classList.remove('hit');
    void stage.offsetWidth;
    stage.classList.add('hit');
    clearTimeout(hitLightTimer);
    hitLightTimer = setTimeout(() => stage.classList.remove('hit'), 420);
    for (let index = 0; index < 12; index++) {
      const particle = document.createElement('i');
      const angle = Math.PI * 2 * index / 12;
      const distance = 62 + (index % 3) * 22;
      particle.className = 'pad-particle';
      particle.style.cssText = `left:${x}px;top:${y}px;--particle-color:${source.color};--particle-x:${Math.cos(angle) * distance}px;--particle-y:${Math.sin(angle) * distance}px;--particle-rotate:${index * 47}deg`;
      stage.append(particle);
      setTimeout(() => particle.remove(), 650);
    }
    button.classList.remove('hit');
    void button.offsetWidth;
    button.classList.add('hit');
    setTimeout(() => button.classList.remove('hit'), 280);
  }

  async function hitPad(index, button) {
    const preset = currentPreset();
    const slot = preset.slots[index];
    if (!slot) return;
    if (!options.isUnlocked(slot.kind, slot.source)) {
      options.toast('这张卡带还未解锁，请到背包图鉴完成任务');
      return;
    }
    if (slot.kind === 'loop') {
      const loopId = slot.source.replace('loop:', '');
      preset.backing = loopId;
      backingOn = !(backingOn && options.currentBacking() === loopId);
      options.setBacking(backingOn, loopId);
      renderBackingSelect(); saveState();
    } else {
      options.hit(slot, index);
      if (backingOn && preset.backing !== 'off') options.setBacking(true, preset.backing);
    }
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
      backingOn = !backingOn;
      options.setBacking(backingOn, currentPreset().backing);
      renderBackingSelect(); saveState();
    });
    $('#pad-backing-select').addEventListener('change', (event) => {
      currentPreset().backing = event.target.value;
      backingOn = event.target.value !== 'off';
      options.setBacking(backingOn, currentPreset().backing);
      renderBackingSelect(); saveState();
      options.toast(event.target.value === 'off' ? '原创底奏已关闭' : `原创底奏：${options.loopName(event.target.value)}`);
    });
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
    buildLightStrips();
    bindControls();
    window.addEventListener('meme-pad-beat', syncBeatLights);
    renderPads(); renderLibrary(); renderBackingSelect();
  }

  window.MemePadStage = { init };
})();
