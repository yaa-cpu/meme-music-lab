(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const musicData = window.MemeMusicData;
  let pitchCount = 8;
  let pitches = musicData.getPitches(pitchCount);
  const reverbPresets = {
    none: { seconds: .02, decay: 1, wet: 0 },
    room: { seconds: .85, decay: 2.8, wet: .18 },
    hall: { seconds: 2.7, decay: 2.1, wet: .3 },
    church: { seconds: 4.2, decay: 1.65, wet: .4 },
    plate: { seconds: 1.9, decay: 3.4, wet: .27 }
  };
  let reverbPreset = 'none';
  let reverbWet = 0;
  let loopEnabled = false;
  let loopClip = null;
  let loopVolume = 70;
  let loopReverbPreset = 'none';
  let loopReverbWet = .2;
  let loopClockStep = 0;
  let followedAuthor = false;
  let rewardClaims = { share: '', repost: '' };
  const localDay = () => new Date().toLocaleDateString('en-CA');

  const memes = [
    {
      id: 'doro', title: 'Doro', sub: '粉色不明生物', key: 'A', type: 'original', image: './assets/doro.webp', audio: './assets/doro.mp3', color: 'var(--p-pink)',
      origin: '《胜利女神：妮姬》Dorothy 的同人形象，使用 Tuna 社区上传的 Doro 原声片段。',
      sourceLabel: '原声 · Voicemod Tuna', soundSource: 'https://tuna.voicemod.net/sound/67ab378f-5e72-41cc-8f96-546828989fd4',
      imageSource: 'https://tuna.voicemod.net/sound/67ab378f-5e72-41cc-8f96-546828989fd4', originSource: 'https://www.blogunderalog.com/blog-collection/doro-journey-from-meme-to-official-mascot'
    },
    {
      id: 'maodie', title: '哈！', sub: '耄耋哈气 1', key: 'S', type: 'original', image: './assets/maodie.webp', audio: './assets/maodie-audio.mp3', color: 'var(--p-accent)',
      origin: '使用你提供的“耄耋哈气1.mp3”裁剪采样。',
      sourceLabel: '我的裁剪 · B站原视频', soundSource: 'https://www.bilibili.com/video/BV1DMduY9E5K/',
      imageSource: 'https://chanshi123.com/cat/110654', originSource: 'https://www.bilibili.com/video/BV1DMduY9E5K/'
    },
    {
      id: 'chicken', title: '鸡', sub: '鸡你太美 1', key: 'D', type: 'original', image: './assets/chicken.svg', audio: './assets/chicken-audio.mp3', color: 'var(--p-blue)',
      origin: '使用你提供的“鸡你太美.mp3”裁剪采样；图像为本地原创卡通鸡，不使用真人照片。',
      sourceLabel: '我的裁剪 · B站原视频', soundSource: 'https://www.bilibili.com/video/BV1J4411v7g6/?t=24',
      imageSource: './assets/chicken.svg', originSource: 'https://www.bilibili.com/video/BV1J4411v7g6/?t=24'
    },
    {
      id: 'oiia', title: 'oeeao', sub: '旋转小猫', key: 'J', type: 'original', image: './assets/oiia.webp', audio: './assets/oiia.mp3', color: 'var(--p-acid)',
      origin: '使用你提供的“旋转小猫.mp3”裁剪采样；原始素材来自 Tuna 社区。',
      sourceLabel: '我的裁剪 · Tuna 原声', soundSource: 'https://tuna.voicemod.net/sound/44fcfd11-d25e-4c7d-920b-a2a5e920b219',
      imageSource: 'https://tuna.voicemod.net/sound/44fcfd11-d25e-4c7d-920b-a2a5e920b219', originSource: 'https://filmora.wondershare.com/trending-topic/oiia-cat-meme-video.html'
    },
    {
      id: 'dog', title: '叫', sub: '大狗叫 · 完整', key: 'K', type: 'original', image: './assets/dog.png', audio: './assets/dog-audio.mp3', color: 'var(--p-yellow)',
      origin: '使用你提供的“05-大狗叫.mp3”裁剪采样。',
      sourceLabel: '我的裁剪 · B站原视频', soundSource: 'https://www.bilibili.com/video/BV1ougx6tEQt/',
      imageSource: 'https://m.ali213.net/news/gl2607/1790643.html', originSource: 'https://www.bilibili.com/video/BV1ougx6tEQt/'
    },
    {
      id: 'nailong', title: '哈哈哈哈哈', sub: '奶龙捧腹笑', key: 'L', type: 'original', image: './assets/nailong.gif', audio: './assets/nailong-audio.mp3', color: 'oklch(0.85 0.15 82)',
      origin: '使用你提供的“06-奶龙捧腹笑.mp3”裁剪采样。',
      sourceLabel: '我的裁剪 · B站原视频', soundSource: 'https://www.bilibili.com/video/BV1ZMf2BzEQL/',
      imageSource: 'https://pdan.com.cn/12761.html', originSource: 'https://www.bilibili.com/video/BV1ZMf2BzEQL/'
    },
    ...[
      ['ha', '哈', 'Z', 3.000, 3.380, 'var(--p-acid)'],
      ['ji', '基', 'X', 3.480, 3.860, 'var(--p-pink)'],
      ['mi', '米', 'C', 3.980, 4.380, 'var(--p-blue)'],
      ['nan', '南', 'V', 4.475, 4.660, 'var(--p-yellow)'],
      ['bei', '北', 'B', 4.718, 4.895, 'var(--p-green)'],
      ['lv', '绿', 'N', 4.955, 5.330, 'var(--p-accent)'],
      ['dou', '豆', 'M', 5.452, 5.800, 'oklch(0.85 0.15 82)']
    ].map(([slug, title, key, start, end, color], index) => ({
      id: `hachimi-${slug}`, title, sub: `哈基米逐音 ${String(index + 1).padStart(2, '0')}`, key, type: 'original', image: './assets/hachimi.svg', audio: `./assets/hachimi-${slug}.mp3`, color,
      origin: `《哈基米之歌》“哈基米南北绿豆”；使用你提供的第 ${index + 1} 段裁剪采样。`,
      sourceLabel: `我的裁剪 · 原视频约 ${start.toFixed(2)} 秒`, soundSource: `https://www.bilibili.com/video/BV1WfFJzyEjv/?t=${Math.floor(start)}`,
      imageSource: './assets/hachimi.svg', originSource: 'https://www.bilibili.com/video/BV1WfFJzyEjv/?t=3'
    })),
    ...[
      ['maodie-2', '哈！2', '耄耋哈气 2', 'Q', 'maodie-2.mp3', 'var(--p-accent)', './assets/maodie.webp', '耄耋哈气2.mp3', 'https://www.bilibili.com/video/BV1DMduY9E5K/'],
      ['chicken-2', '鸡 2', '鸡你太美 2', 'W', 'chicken-2.mp3', 'var(--p-blue)', './assets/chicken.svg', '鸡你太美1.mp3', 'https://www.bilibili.com/video/BV1J4411v7g6/?t=24'],
      ['dog-1', '叫 1', '大狗叫逐音 1', 'E', 'dog-1.mp3', 'var(--p-yellow)', './assets/dog.png', '大狗1.mp3', 'https://www.bilibili.com/video/BV1ougx6tEQt/'],
      ['dog-2', '叫 2', '大狗叫逐音 2', 'R', 'dog-2.mp3', 'var(--p-yellow)', './assets/dog.png', '大狗2.mp3', 'https://www.bilibili.com/video/BV1ougx6tEQt/'],
      ['dog-3', '叫 3', '大狗叫逐音 3', 'T', 'dog-3.mp3', 'var(--p-yellow)', './assets/dog.png', '大狗3.mp3', 'https://www.bilibili.com/video/BV1ougx6tEQt/'],
      ['dog-4', '叫 4', '大狗叫逐音 4', 'U', 'dog-4.mp3', 'var(--p-yellow)', './assets/dog.png', '大狗4.mp3', 'https://www.bilibili.com/video/BV1ougx6tEQt/'],
      ...[8, 9, 10, 11, 12].map((number, index) => [
        `hachimi-${number}`, `片段 ${String(number).padStart(2, '0')}`, `哈基米逐音 ${String(number).padStart(2, '0')}`,
        ['F', 'G', 'H', 'O', 'P'][index], `hachimi-${number}.mp3`,
        ['var(--p-acid)', 'var(--p-pink)', 'var(--p-blue)', 'var(--p-yellow)', 'var(--p-green)'][index],
        './assets/hachimi.svg', `哈基米南北绿豆${number}.mp3`, 'https://www.bilibili.com/video/BV1WfFJzyEjv/?t=3'
      ])
    ].map(([id, title, sub, key, file, color, image, fileName, source]) => ({
      id, title, sub, key, type: 'original', image, audio: `./assets/${file}`, color,
      origin: `使用你提供的“${fileName}”裁剪采样。`, sourceLabel: '我的裁剪 · 原始来源',
      soundSource: source, imageSource: image, originSource: source
    }))
  ];
  const instrumentItems = (ids) => ids.map((id) => ({
    ...musicData.getInstrument(id), id: `instrument:${id}`, sub: '合成乐器', type: 'instrument'
  }));
  const memeItems = (ids) => ids.map((id) => memes.find((meme) => meme.id === id));
  const cartridges = [
    { name: '抽象梗采样', items: memeItems(['doro', 'maodie', 'maodie-2', 'chicken', 'chicken-2', 'oiia', 'nailong', 'dog']) },
    { name: '大狗叫逐音', items: memeItems(['dog-1', 'dog-2', 'dog-3', 'dog-4']) },
    { name: '哈基米逐音 01', items: memeItems(['hachimi-ha', 'hachimi-ji', 'hachimi-mi', 'hachimi-nan', 'hachimi-bei', 'hachimi-lv', 'hachimi-dou', 'hachimi-8']) },
    { name: '哈基米逐音 02', items: memeItems(['hachimi-9', 'hachimi-10', 'hachimi-11', 'hachimi-12']) },
    { name: '键盘与弦乐', items: instrumentItems(['piano', 'guitar', 'violin', 'bass', 'marimba', 'harp', 'organ']) },
    { name: '管乐与电子', items: instrumentItems(['flute', 'trumpet', 'sax', 'synth', '8bit', 'pad']) }
  ];
  let cartridgeIndex = 0;
  let cartridgeGesture = null;
  let wheelAccumulator = 0;
  let wheelResetTimer = null;

  const demoPattern = [
    ['oiia', 2, 0], ['doro', 7, 0], ['dog', 5, 1], ['maodie', 4, 2], ['doro', 6, 3],
    ['chicken', 3, 4], ['oiia', 2, 4], ['doro', 7, 4], ['doro', 1, 6], ['maodie', 5, 7],
    ['nailong', 0, 8], ['dog', 5, 8], ['doro', 7, 8], ['oiia', 3, 10], ['maodie', 4, 11],
    ['chicken', 2, 12], ['oiia', 1, 12], ['doro', 7, 12], ['dog', 6, 14], ['nailong', 3, 15], ['doro', 6, 15]
  ];

  const storageKey = 'meme-music-lab-v1';
  let notes = [];
  let selectedId = 'doro';
  let selectedNoteId = null;
  let bpm = 112;
  let outputVolume = 70;
  let loop = true;
  let isPlaying = false;
  let recording = false;
  let currentStep = 0;
  let currentStepStartedAt = 0;
  let nextStep = 0;
  let nextNoteTime = 0;
  let schedulerTimer = null;
  let endTimer = null;
  let playheadFrame = null;
  let scheduleGeneration = 0;
  let dragData = null;
  let gesture = null;
  let toastTimer = null;
  let audioCtx = null;
  let master = null;
  let mixInput = null;
  let soundOutput = null;
  let noiseBuffer = null;
  let audioFailed = false;
  let dryGain = null;
  let reverbGain = null;
  let convolver = null;
  let padMixInput = null;
  let padBackingInput = null;
  const sampleLeads = new Map();
  const padSampleVoices = new Map();
  let padPreloadStarted = false;
  const impulseBuffers = new Map();
  const noteConvolvers = new Map();
  const buffers = {};
  const activeSources = new Set();
  const visualTimers = new Set();
  let libraryAudio = null;
  let librarySource = null;
  let libraryTrackId = null;
  let libraryLoading = false;
  const activePerformances = new Map();
  let pendingLiveSounds = 0;
  let hasRecordedInput = false;
  let lastSoundEndAt = Number.POSITIVE_INFINITY;
  let recordingPosition = 0;
  let recordingTargetStep = 0;
  let recordingFrameAt = 0;
  const recordingTriggeredIds = new Set();
  let recordingFinishing = false;
  let micRecorder = null;
  let micStream = null;
  let micChunks = [];
  let micRecording = false;
  let micBlob = null;
  let micBuffer = null;
  let micStartStep = 0;
  let vocalDbPromise = null;

  const memeById = (id) => memes.find((meme) => meme.id === id) || memes[0];
  const validSource = (id) => memes.some((meme) => meme.id === id) || Boolean(musicData.getInstrument(id));
  const sourceInfo = (id) => {
    const meme = memes.find((item) => item.id === id);
    if (meme) return meme;
    const instrument = musicData.getInstrument(id);
    if (instrument) return { ...instrument, id: `instrument:${instrument.id}`, sub: '普通音阶', type: 'instrument' };
    return memes[0];
  };
  const uid = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const precise = (value) => Math.round(value * 1000) / 1000;
  const defaultRow = () => Math.max(0, pitches.findIndex((pitch) => pitch.name === 'G4'));
  const noteEnd = () => notes.reduce((end, note) => Math.max(end, note.col + note.length), 0);
  const timelineLength = () => Math.max(16, Math.ceil(Math.max(noteEnd(), recording ? currentStep + 1 : 0) / 4) * 4);
  const playbackLength = () => Math.max(16, Math.ceil(Math.max(noteEnd(), micBuffer ? micStartStep + micBuffer.duration / stepDuration() : 0) * 1000) / 1000);

  function loadState() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch (_) { /* storage is optional */ }
    if (saved && Array.isArray(saved.notes)) {
      notes = saved.notes.filter((n) => validSource(n.meme) && Number.isFinite(Number(n.row)) && n.row >= 0 && n.row < 88 && Number.isFinite(Number(n.col)) && n.col >= 0 && Number.isFinite(Number(n.length)) && n.length > 0).map((n) => {
        const preset = reverbPresets[n.reverbPreset] ? n.reverbPreset : null;
        return {
          ...n,
          id: n.id || uid(),
          row: Number(n.row),
          col: Number(n.col),
          length: Math.max(.05, Number(n.length)),
          reverbPreset: preset,
          reverbWet: preset && Number.isFinite(Number(n.reverbWet)) ? clamp(Number(n.reverbWet), 0, .7) : null
        };
      });
      bpm = Math.round(Math.min(180, Math.max(60, Number(saved.bpm) || 112)));
      outputVolume = Number.isFinite(Number(saved.volume)) ? clamp(Number(saved.volume), 0, 100) : 70;
      loop = saved.loop !== false;
      selectedId = validSource(saved.selectedId) ? saved.selectedId : 'doro';
      pitchCount = [4, 5, 8, 12, 24, 49, 61, 88].includes(Number(saved.pitchCount)) ? Number(saved.pitchCount) : 8;
      pitches = musicData.getPitches(pitchCount);
      notes.forEach((note) => {
        const midi = Number.isFinite(Number(note.midi)) ? Number(note.midi) : pitches[note.row]?.midi;
        if (Number.isFinite(midi)) note.midi = midi;
      });
      reverbPreset = reverbPresets[saved.reverbPreset] ? saved.reverbPreset : 'none';
      reverbWet = Math.round(clamp(Number(saved.reverbWet) || 0, 0, .7) * 10) / 10;
      if (saved.loopClip && Number(saved.loopClip.duration) > 0 && Array.isArray(saved.loopClip.notes)) {
        const duration = clamp(Number(saved.loopClip.duration), .05, 4096);
        loopClip = {
          duration,
          sourceStart: Math.max(0, Number(saved.loopClip.sourceStart) || 0),
          sourceEnd: Math.max(0, Number(saved.loopClip.sourceEnd) || duration),
          notes: saved.loopClip.notes.filter((note) => validSource(note.meme) && Number(note.row) >= 0 && Number(note.row) < 88 && Number(note.col) >= 0 && Number(note.col) < duration && Number(note.length) > 0).map((note) => ({
            meme: note.meme, row: Number(note.row), col: Number(note.col), length: clamp(Number(note.length), .05, duration - Number(note.col)), offset: Math.max(0, Number(note.offset) || 0), ...(Number.isFinite(Number(note.midi)) ? { midi: Number(note.midi) } : { midi: pitches[Number(note.row)]?.midi })
          }))
        };
      }
      loopEnabled = saved.loopEnabled === true && Boolean(loopClip?.notes.length);
      loopVolume = Number.isFinite(Number(saved.loopVolume)) ? clamp(Number(saved.loopVolume), 0, 100) : 70;
      loopReverbPreset = reverbPresets[saved.loopReverbPreset] ? saved.loopReverbPreset : 'none';
      loopReverbWet = Math.round(clamp(Number(saved.loopReverbWet) || 0, 0, .7) * 10) / 10;
      followedAuthor = saved.followedAuthor === true;
      rewardClaims = { share: saved.rewardClaims?.share || '', repost: saved.rewardClaims?.repost || '' };
    } else {
      notes = demoPattern.map(([meme, row, col]) => ({ id: uid(), meme, row, col, length: 1 }));
    }
  }

  function saveState() {
    try { localStorage.setItem(storageKey, JSON.stringify({ notes, bpm, volume: outputVolume, loop, selectedId, pitchCount, reverbPreset, reverbWet, loopEnabled, loopClip, loopVolume, loopReverbPreset, loopReverbWet, followedAuthor, rewardClaims })); } catch (_) { /* private mode */ }
  }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function renderMemeCards() {
    const cartridge = cartridges[cartridgeIndex];
    const cards = cartridge.items.map((source) => {
      const instrument = source.type === 'instrument';
      const avatar = instrument
        ? `<span class="sample-instrument-symbol" aria-hidden="true">${source.symbol}</span>`
        : `<img src="${source.image}" alt="" draggable="false">`;
      return `
      <button class="card-button sample-note${instrument ? ' instrument-sample' : ''}${source.id === selectedId ? ' selected' : ''}" type="button" draggable="true" data-meme="${source.id}" data-id="${source.id}" style="--card-color:${source.color}" aria-pressed="${source.id === selectedId}" aria-label="试听并选中 ${source.title}，${source.sub}" title="${source.title} · ${instrument ? source.description : '原声出处见素材出处'}">
        <span class="keycap">${instrument ? source.symbol : source.key}</span>
        <span class="sample-note-avatar">${avatar}</span>
        <span class="sample-note-copy"><strong>${source.title}</strong><small>${source.sub}</small></span>
        <span class="note-chip">${icon('note')}</span>
      </button>`;
    }).join('');
    $('#meme-grid').innerHTML = cards;

    $$('#meme-grid .card-button').forEach((button) => {
      button.addEventListener('click', () => {
        selectMeme(button.dataset.meme);
        previewMeme(button.dataset.meme, defaultRow());
      });
      button.addEventListener('dragstart', (event) => {
        dragData = { type: 'new', meme: button.dataset.meme };
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('text/plain', `meme:${button.dataset.meme}`);
        selectMeme(button.dataset.meme);
      });
      button.addEventListener('dragend', clearDropTargets);
    });
    updateCartridgeWheel();
  }

  function updateCartridgeWheel(offset = 0) {
    const wheel = $('#cartridge-wheel');
    const track = $('#cartridge-wheel-track');
    if (!wheel || !track) return;
    const cartridge = cartridges[cartridgeIndex];
    const centerOffset = Math.max(0, (wheel.clientHeight - 44) / 2);
    track.style.transform = `translateY(${centerOffset - cartridgeIndex * 44 + offset}px)`;
    wheel.classList.toggle('dragging', offset !== 0);
    wheel.setAttribute('aria-valuenow', String(cartridgeIndex + 1));
    wheel.setAttribute('aria-valuemax', String(cartridges.length));
    wheel.setAttribute('aria-valuetext', cartridge.name);
    $('#cartridge-name').textContent = cartridge.name;
    const unit = cartridge.items[0]?.type === 'instrument' ? '种乐器' : '张采样';
    $('#cartridge-status').textContent = `${String(cartridgeIndex + 1).padStart(2, '0')} / ${String(cartridges.length).padStart(2, '0')} · ${cartridge.items.length} ${unit}`;
    $$('.cartridge-wheel-number', track).forEach((number) => number.classList.toggle('active', Number(number.dataset.cartridgeNumber) === cartridgeIndex));
  }

  function setCartridge(index) {
    const next = clamp(index, 0, cartridges.length - 1);
    if (!isCartridgeUnlocked(next)) {
      updateCartridgeWheel();
      showToast(`「${cartridges[next].name}」需要${cartridgeRequirement(next)}`);
      return false;
    }
    if (next === cartridgeIndex) { updateCartridgeWheel(); return true; }
    cartridgeIndex = next;
    const cartridge = cartridges[cartridgeIndex];
    if (!cartridge.items.some((meme) => meme.id === selectedId)) selectedId = cartridge.items[0].id;
    renderMemeCards();
    selectMeme(selectedId);
    return true;
  }

  function bindCartridgeWheel() {
    const wheel = $('#cartridge-wheel');
    const track = $('#cartridge-wheel-track');
    track.innerHTML = cartridges.map((cartridge, index) => `<span class="cartridge-wheel-number" data-cartridge-number="${index}">${String(index + 1).padStart(2, '0')}<small>${cartridge.name}</small></span>`).join('');
    updateCartridgeWheel();
    wheel.addEventListener('wheel', (event) => {
      event.preventDefault();
      wheelAccumulator += event.deltaY * (event.deltaMode === 1 ? 16 : 1);
      clearTimeout(wheelResetTimer);
      wheelResetTimer = setTimeout(() => { wheelAccumulator = 0; }, 120);
      if (Math.abs(wheelAccumulator) >= 24) {
        setCartridge(cartridgeIndex + Math.sign(wheelAccumulator));
        wheelAccumulator = 0;
      }
    }, { passive: false });
    wheel.addEventListener('pointerdown', (event) => {
      if (cartridgeGesture || event.button !== 0) return;
      event.preventDefault();
      wheel.focus({ preventScroll: true });
      wheel.setPointerCapture(event.pointerId);
      cartridgeGesture = { pointerId: event.pointerId, startY: event.clientY, offset: 0 };
    });
    wheel.addEventListener('pointermove', (event) => {
      if (!cartridgeGesture || event.pointerId !== cartridgeGesture.pointerId) return;
      const raw = event.clientY - cartridgeGesture.startY;
      const atEdge = (cartridgeIndex === 0 && raw > 0) || (cartridgeIndex === cartridges.length - 1 && raw < 0);
      cartridgeGesture.offset = clamp(raw, -88, 88) * (atEdge ? .32 : 1);
      updateCartridgeWheel(cartridgeGesture.offset);
    });
    const finishWheel = (event, cancelled = false) => {
      if (!cartridgeGesture || event.pointerId !== cartridgeGesture.pointerId) return;
      const offset = cancelled ? 0 : cartridgeGesture.offset;
      if (wheel.hasPointerCapture(event.pointerId)) wheel.releasePointerCapture(event.pointerId);
      cartridgeGesture = null;
      const steps = Math.abs(offset) > 10 ? Math.max(1, Math.round(Math.abs(offset) / 44)) * Math.sign(offset) : 0;
      setCartridge(cartridgeIndex - steps);
      updateCartridgeWheel();
    };
    wheel.addEventListener('pointerup', (event) => finishWheel(event));
    wheel.addEventListener('pointercancel', (event) => finishWheel(event, true));
    wheel.addEventListener('keydown', (event) => {
      let next = cartridgeIndex;
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next -= 1;
      else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next += 1;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = cartridges.length - 1;
      else return;
      event.preventDefault(); setCartridge(next);
    });
  }

  function renderCredits() {
    $('#credits-list').innerHTML = memes.map((meme) => `
      <div class="credit-item"><strong>${meme.title} · ${meme.sub}</strong><p>${meme.origin}</p>
      <p><a href="${meme.originSource}" target="_blank" rel="noopener noreferrer">梗来源</a>　<a href="${meme.imageSource}" target="_blank" rel="noopener noreferrer">图像来源</a>　<a href="${meme.soundSource}" target="_blank" rel="noopener noreferrer">${meme.type === 'original' ? '音频来源' : '原声出处说明'}</a></p></div>`).join('');
  }

  function syncTimelineDimensions() {
    const length = timelineLength();
    $('#staff-canvas').style.minWidth = `${Math.max(790, 78 + length * 44)}px`;
    $('#ruler').style.gridTemplateColumns = `58px repeat(${length},minmax(40px,1fr))`;
    $$('.rail-track').forEach((track) => {
      track.style.backgroundSize = `${400 / length}% 100%,${100 / length}% 100%`;
    });
    return length;
  }

  function renderRuler() {
    const length = syncTimelineDimensions();
    $('#ruler').innerHTML = '<span></span>' + Array.from({ length }, (_, col) => `<span class="ruler-label${col % 4 === 0 ? ' bar-start' : ''}" data-ruler="${col}">${col % 4 === 0 ? col / 4 + 1 : '·'}</span>`).join('');
    $('.sequencer-heading .tiny-label').textContent = `${Math.ceil(length / 4)} BARS · FREE TIMING`;
  }

  const cartridgeRewards = [
    { type: 'free', cover: './assets/oiia.webp', symbol: '', colors: ['#d9ef68', '#91cfe8'] },
    { type: 'free', cover: './assets/dog.png', symbol: '', colors: ['#f2d468', '#efabc2'] },
    { type: 'follow', cover: './assets/hachimi.svg', symbol: '', colors: ['#c7b4e6', '#91cfe8'] },
    { type: 'share', cover: './assets/hachimi.svg', symbol: '', colors: ['#efabc2', '#f2d468'] },
    { type: 'free', cover: '', symbol: '♩', colors: ['#b9dcae', '#d9ef68'] },
    { type: 'repost', cover: '', symbol: '⌁', colors: ['#91cfe8', '#c7b4e6'] }
  ];
  const rewardNames = { follow: '关注作者', share: '今日分享', repost: '今日转发' };
  let loopPreviewing = false;
  let loopPreviewGeneration = 0;
  let loopPreviewNextStep = 0;
  let loopPreviewNextTime = 0;
  const loopPreviewTimers = new Set();
  let recordingLoopStep = null;

  function isCartridgeUnlocked(index) {
    const reward = cartridgeRewards[index]?.type || 'free';
    if (reward === 'free') return true;
    if (!followedAuthor) return false;
    return reward === 'follow' || rewardClaims[reward] === localDay();
  }

  function cartridgeRequirement(index) {
    return `${rewardNames[cartridgeRewards[index]?.type] || '任务'}后解锁`;
  }

  function loopRange() {
    const start = clamp(Number($('#loop-range-start').value) || 0, 0, 4096);
    const end = clamp(Number($('#loop-range-end').value) || 16, start + .05, 4096);
    return { start: precise(start), end: precise(end) };
  }

  function notesForLoopRange(start, end) {
    return notes.filter((note) => note.col < end && note.col + note.length > start).map((note) => {
      const clippedStart = Math.max(note.col, start);
      const clippedEnd = Math.min(note.col + note.length, end);
      return {
        meme: note.meme, row: note.row, col: precise(clippedStart - start), length: precise(clippedEnd - clippedStart),
        offset: precise(Math.max(0, start - note.col)),
        ...(Number.isFinite(Number(note.midi)) ? { midi: Number(note.midi) } : {})
      };
    }).filter((note) => note.length > 0);
  }

  function updateLoopRangeSummary() {
    const summary = $('#loop-range-summary');
    if (!summary) return;
    const { start, end } = loopRange();
    const count = notesForLoopRange(start, end).length;
    summary.textContent = count
      ? `选段 ${formatLength(start)}–${formatLength(end)} 步，包含 ${count} 个音符；跨边界的声音会裁到选段边缘。`
      : '这个范围暂时没有音符，请调整起止位置或先在线谱里放入声音。';
  }

  function updateLoopUI() {
    const hasClip = Boolean(loopClip?.notes.length);
    const toggle = $('#loop-toggle');
    toggle.classList.toggle('active', loopEnabled && hasClip);
    toggle.setAttribute('aria-pressed', String(loopEnabled && hasClip));
    toggle.disabled = !hasClip;
    $('span', toggle).textContent = loopEnabled && hasClip ? '底奏开' : '底奏关';
    const preview = $('#loop-preview');
    preview.disabled = !hasClip;
    preview.innerHTML = `${icon(loopPreviewing ? 'stop' : 'play')}${loopPreviewing ? '停止试听' : '试听循环'}`;
    preview.setAttribute('aria-pressed', String(loopPreviewing));
    $('#loop-clip-status').textContent = hasClip ? `${formatLength(loopClip.duration)} 步 · ${loopClip.notes.length} 个音符` : '尚未合并';
    $('#loop-clip-meta').textContent = hasClip
      ? `来自线谱 ${formatLength(loopClip.sourceStart)}–${formatLength(loopClip.sourceEnd)} 步 · 独立循环，不改动原线谱`
      : '合并后不会改动原线谱，循环片段在线谱之外独立播放。';
    const bars = Array.from({ length: 48 }, (_, index) => {
      const position = hasClip ? (index + .5) / 48 * loopClip.duration : 0;
      const voices = hasClip ? loopClip.notes.filter((note) => position >= note.col && position <= note.col + note.length) : [];
      const height = voices.length ? Math.min(94, 25 + voices.length * 18 + (voices[0].row || 0) * 4) : 8;
      return `<i style="height:${height}%"></i>`;
    }).join('');
    $('#loop-waveform').innerHTML = bars;
    $('#loop-waveform').classList.toggle('has-clip', hasClip);
    syncChoiceWheel('#loop-volume-wheel', loopVolume);
    syncChoiceWheel('#loop-reverb-wheel', loopReverbPreset);
    syncChoiceWheel('#loop-wet-wheel', loopReverbWet);
    $('#loop-wet-wheel').setAttribute('aria-disabled', String(loopReverbPreset === 'none'));
    updateLoopRangeSummary();
  }

  function renderLoopLab() {
    if (loopClip) {
      $('#loop-range-start').value = loopClip.sourceStart;
      $('#loop-range-end').value = loopClip.sourceEnd;
    } else {
      $('#loop-range-end').value = Math.max(1, precise(noteEnd() || 16));
    }
    updateLoopUI();
  }

  function mergeLoopClip() {
    const { start, end } = loopRange();
    if (end <= start) { showToast('结束步必须晚于开始步'); return; }
    const clipNotes = notesForLoopRange(start, end);
    if (!clipNotes.length) { showToast('选段里没有音符，请先调整范围'); return; }
    stopLoopPreview();
    loopClip = { duration: precise(end - start), sourceStart: start, sourceEnd: end, notes: clipNotes };
    loopEnabled = true;
    saveState(); updateLoopUI();
    showToast(`已合并 ${clipNotes.length} 个音符为 ${formatLength(loopClip.duration)} 步循环`);
  }

  function triggerLoopStep(step, when, force = false) {
    if ((!loopEnabled && !force) || !audioCtx || !loopClip?.notes.length) return;
    const duration = loopClip.duration;
    const position = ((step % duration) + duration) % duration;
    loopClip.notes.filter((note) => note.col >= position && note.col < position + 1).forEach((clipNote) => {
      const noteWhen = when + (clipNote.col - position) * stepDuration();
      const loopNote = { ...clipNote, reverbPreset: loopReverbPreset, reverbWet: loopReverbWet, loopVolume: loopVolume / 100 };
      triggerSound(loopNote.meme, loopNote.row, noteWhen, false, loopNote, false);
    });
    if (loopPreviewing) {
      const timer = setTimeout(() => {
        $('#loop-waveform').style.setProperty('--loop-position', `${position / duration * 100}%`);
        loopPreviewTimers.delete(timer);
      }, Math.max(0, (when - audioCtx.currentTime) * 1000));
      loopPreviewTimers.add(timer);
    }
  }

  function stopLoopPreview() {
    loopPreviewGeneration += 1;
    loopPreviewing = false;
    loopPreviewTimers.forEach((timer) => { clearTimeout(timer); clearInterval(timer); });
    loopPreviewTimers.clear();
    if ($('#loop-waveform')) $('#loop-waveform').style.setProperty('--loop-position', '0%');
    if ($('#loop-toggle')) updateLoopUI();
  }

  function runLoopPreview(generation) {
    if (!loopPreviewing || generation !== loopPreviewGeneration || !audioCtx) return;
    while (loopPreviewNextTime < audioCtx.currentTime + .12) {
      triggerLoopStep(loopPreviewNextStep, loopPreviewNextTime, true);
      loopPreviewNextStep += 1;
      loopPreviewNextTime += stepDuration();
    }
  }

  async function previewLoop() {
    if (loopPreviewing) { stopLoopPreview(); return; }
    if (!loopClip?.notes.length) { showToast('先把一段线谱合并为循环'); return; }
    if (isPlaying) { showToast(loopEnabled ? '循环底奏正随线谱播放' : '先打开底奏，再播放线谱'); return; }
    try {
      await ensureAudio();
      await Promise.all([...new Set(loopClip.notes.filter((note) => !note.meme.startsWith('instrument:')).map((note) => note.meme))].map((id) => loadBuffer(id).catch(() => null)));
      loopPreviewing = true;
      const generation = ++loopPreviewGeneration;
      loopPreviewNextStep = 0;
      loopPreviewNextTime = audioCtx.currentTime + .06;
      updateLoopUI();
      runLoopPreview(generation);
      const timer = setInterval(() => runLoopPreview(generation), 25);
      loopPreviewTimers.add(timer);
    } catch (_) { showToast('声音引擎未启动，请再点击一次'); }
  }

  function renderBackpack() {
    const today = localDay();
    const follow = $('#follow-task');
    follow.classList.toggle('done', followedAuthor);
    follow.setAttribute('aria-pressed', String(followedAuthor));
    $('strong', follow).textContent = followedAuthor ? '已关注作者' : '关注作者';
    $('small', follow).textContent = followedAuthor ? '再次点击可在 Demo 中取消' : '关注后解锁哈基米 01';
    ['share', 'repost'].forEach((type) => {
      const button = $(`#${type}-task`);
      const claimed = rewardClaims[type] === today;
      button.classList.toggle('done', claimed);
      button.disabled = claimed;
      $('strong', button).textContent = `${type === 'share' ? '分享作品' : '转发动态'}${claimed ? ' · 今日已完成' : ''}`;
      $('small', button).textContent = claimed ? '明天再来 · 仍需保持关注' : followedAuthor ? '每天一次 · 今日可完成' : '先关注作者，再完成任务';
    });
    $('#backpack-grid').innerHTML = cartridges.map((cartridge, index) => {
      const unlocked = isCartridgeUnlocked(index);
      const reward = cartridgeRewards[index];
      const art = reward.cover ? `<img src="${reward.cover}" alt="" draggable="false">` : `<span class="backpack-instrument" aria-hidden="true">${reward.symbol}</span>`;
      return `<button class="backpack-card${unlocked ? ' unlocked' : ' locked'}" type="button" data-backpack="${index}" style="--cover-a:${reward.colors[0]};--cover-b:${reward.colors[1]}" aria-label="${cartridge.name}，${unlocked ? '已解锁，点击使用' : cartridgeRequirement(index)}">
        <span class="backpack-cover">${art}<i class="cover-orbit" aria-hidden="true"></i><span class="cover-note" aria-hidden="true">♪</span><small>CASSETTE ${String(index + 1).padStart(2, '0')}</small><strong>${cartridge.name}</strong></span>
        <span class="backpack-card-meta"><span>${cartridge.items.length} ${cartridge.items[0]?.type === 'instrument' ? '种乐器' : '张采样'}</span><strong>${unlocked ? '已解锁 · 点击装盒' : cartridgeRequirement(index)}</strong></span>
      </button>`;
    }).join('');
    $$('#backpack-grid [data-backpack]').forEach((button) => button.addEventListener('click', () => {
      const index = Number(button.dataset.backpack);
      if (!isCartridgeUnlocked(index)) { showToast(`请先完成${cartridgeRequirement(index)}`); return; }
      setCartridge(index);
      $('.performance').scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast(`已装上「${cartridges[index].name}」`);
    }));
  }

  async function completeShareTask(type) {
    if (!followedAuthor) { showToast('请先关注作者，再完成分享或转发'); return; }
    if (rewardClaims[type] === localDay()) { showToast('今天的奖励已经领取，明天再来'); return; }
    const label = type === 'share' ? '分享' : '转发';
    try {
      if (navigator.share) {
        await navigator.share({ title: '梗图音乐坊', text: '我把梗图弹成了一首曲子，来试试！', url: location.href });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(location.href);
        showToast(`链接已复制，Demo 记为今日${label}完成`);
      } else {
        showToast('当前浏览器不支持分享，请复制地址栏链接'); return;
      }
      rewardClaims[type] = localDay();
      saveState(); renderBackpack();
      showToast(`Demo 今日${label}奖励已领取，卡带已解锁`);
    } catch (error) {
      if (error?.name !== 'AbortError') showToast(`${label}未完成，请检查浏览器分享权限`);
    }
  }

  function renderSongs() {
    const demos = musicData.songs.map((song, index) => `<div class="library-song-wrap"><button class="song-card" type="button" data-song="${song.id}"><span class="song-number">0${index + 1}</span><span><strong>${song.title}</strong><small>${song.subtitle}</small></span><span class="song-play">${icon('play')} 播放演示</span></button>${song.source ? `<a class="track-source" href="${song.source}" target="_blank" rel="noopener noreferrer">参考视频 ${icon('arrow')}</a>` : ''}</div>`).join('');
    const tracks = musicData.libraryTracks.map((track, index) => `<div class="library-song-wrap"><button class="song-card library-track-card" type="button" data-track="${track.id}" aria-pressed="false"><span class="song-number">0${musicData.songs.length + index + 1}</span><span><strong>${track.title}</strong><small>${track.subtitle}</small></span><span class="song-play">${icon('play')} 播放整曲</span></button><a class="track-source" href="${track.source}" target="_blank" rel="noopener noreferrer">视频来源 ${icon('arrow')}</a></div>`).join('');
    $('#song-grid').innerHTML = demos + tracks;
    $$('[data-song]').forEach((button) => button.addEventListener('click', () => loadSong(button.dataset.song)));
    $$('[data-track]').forEach((button) => button.addEventListener('click', () => toggleLibraryTrack(button.dataset.track)));
  }

  function formatTrackTime(seconds) {
    if (!Number.isFinite(seconds)) return '00:00';
    return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
  }

  function updateLibraryUI() {
    $$('.library-track-card').forEach((button) => {
      const active = button.dataset.track === libraryTrackId && libraryAudio && !libraryAudio.paused;
      button.classList.toggle('playing', active);
      button.setAttribute('aria-pressed', String(Boolean(active)));
      const track = musicData.libraryTracks.find((item) => item.id === button.dataset.track);
      $('.song-play', button).innerHTML = libraryLoading && button.dataset.track === libraryTrackId
        ? `${icon('loop')} 载入中`
        : active ? `${icon('stop')} ${formatTrackTime(libraryAudio.currentTime)} / ${formatTrackTime(libraryAudio.duration)}` : `${icon('play')} 播放整曲`;
      $('small', button).textContent = track.subtitle;
    });
  }

  function stopLibraryTrack() {
    if (!libraryAudio) return;
    libraryAudio.pause();
    libraryAudio.currentTime = 0;
    libraryLoading = false;
    updateLibraryUI();
  }

  async function toggleLibraryTrack(id) {
    const track = musicData.libraryTracks.find((item) => item.id === id);
    if (!track || libraryLoading) return;
    if (libraryTrackId === id && libraryAudio && !libraryAudio.paused) {
      stopPlayback();
      $('#play-status').textContent = `已停止《${track.title}》`;
      return;
    }
    stopPlayback();
    libraryLoading = true;
    libraryTrackId = id;
    updateLibraryUI();
    try {
      await ensureAudio();
      if (!libraryAudio) {
        libraryAudio = new Audio();
        libraryAudio.preload = 'metadata';
        librarySource = audioCtx.createMediaElementSource(libraryAudio);
        librarySource.connect(mixInput);
        libraryAudio.addEventListener('timeupdate', updateLibraryUI);
        libraryAudio.addEventListener('loadedmetadata', updateLibraryUI);
        libraryAudio.addEventListener('play', () => { updateLibraryUI(); updateTransport(); });
        libraryAudio.addEventListener('pause', updateTransport);
        libraryAudio.addEventListener('ended', () => {
          libraryAudio.currentTime = 0;
          $('#play-status').textContent = `《${track.title}》播放完成`;
          updateLibraryUI(); updateTransport();
        });
        libraryAudio.addEventListener('error', () => {
          libraryLoading = false;
          $('#play-status').textContent = '整曲音频读取失败，请稍后重试';
          showToast('整曲音频读取失败'); updateLibraryUI(); updateTransport();
        });
      }
      if (libraryAudio.dataset.track !== id) {
        libraryAudio.src = track.audio;
        libraryAudio.dataset.track = id;
        libraryAudio.load();
      }
      await libraryAudio.play();
      $('#play-status').textContent = `正在播放《${track.title}》· 再次点击卡片可停止`;
    } catch (_) {
      $('#play-status').textContent = '浏览器未能播放整曲，请再点击一次';
      showToast('整曲播放未启动，请再点击一次');
    } finally {
      libraryLoading = false;
      updateLibraryUI(); updateTransport();
    }
  }

  function syncChoiceWheel(id, value) {
    const wheel = $(id);
    if (!wheel) return;
    const items = $$('.mini-wheel-track > span', wheel);
    if (!items.length) return;
    const index = Math.max(0, items.findIndex((item) => item.dataset.value === String(value)));
    $('.mini-wheel-track', wheel).style.transform = `translateY(${10 - index * 24}px)`;
    items.forEach((item, itemIndex) => item.classList.toggle('active', itemIndex === index));
    wheel.setAttribute('aria-valuenow', String(index + 1));
    wheel.setAttribute('aria-valuetext', items[index]?.textContent.trim() || String(value));
  }

  function bindChoiceWheel(id, getValue, onChange) {
    const wheel = $(id);
    const track = $('.mini-wheel-track', wheel);
    if (!track.children.length && track.dataset.min !== undefined) {
      const min = Number(track.dataset.min);
      const max = Number(track.dataset.max);
      const step = Number(track.dataset.step) || 1;
      const unit = track.dataset.unit || '';
      for (let value = min; value <= max; value += step) {
        const item = document.createElement('span');
        item.dataset.value = String(value);
        const label = document.createElement('strong');
        label.textContent = `${value}${unit}`;
        item.append(label); track.append(item);
      }
    }
    const values = $$(':scope > span', track).map((item) => item.dataset.value);
    const disabled = () => wheel.getAttribute('aria-disabled') === 'true';
    let gestureState = null;
    let accumulated = 0;
    let resetTimer = null;
    const index = () => Math.max(0, values.indexOf(String(getValue())));
    wheel.addEventListener('wheel', (event) => {
      if (disabled()) return;
      event.preventDefault();
      accumulated += event.deltaY * (event.deltaMode === 1 ? 16 : 1);
      clearTimeout(resetTimer); resetTimer = setTimeout(() => { accumulated = 0; }, 120);
      if (Math.abs(accumulated) >= 18) {
        onChange(values[clamp(index() + Math.sign(accumulated), 0, values.length - 1)]);
        accumulated = 0; syncChoiceWheel(id, getValue());
      }
    }, { passive: false });
    wheel.addEventListener('pointerdown', (event) => {
      if (disabled() || gestureState || event.button !== 0) return;
      event.preventDefault(); wheel.focus({ preventScroll: true }); wheel.setPointerCapture(event.pointerId);
      gestureState = { pointerId: event.pointerId, startY: event.clientY, startIndex: index(), offset: 0 };
      wheel.classList.add('dragging');
    });
    wheel.addEventListener('pointermove', (event) => {
      if (!gestureState || event.pointerId !== gestureState.pointerId) return;
      const raw = event.clientY - gestureState.startY;
      const atEdge = (gestureState.startIndex === 0 && raw > 0) || (gestureState.startIndex === values.length - 1 && raw < 0);
      gestureState.offset = raw * (atEdge ? .25 : 1);
      track.style.transform = `translateY(${10 - gestureState.startIndex * 24 + gestureState.offset}px)`;
    });
    const finish = (event, cancelled = false) => {
      if (!gestureState || event.pointerId !== gestureState.pointerId) return;
      const state = gestureState; gestureState = null; wheel.classList.remove('dragging');
      if (wheel.hasPointerCapture(event.pointerId)) wheel.releasePointerCapture(event.pointerId);
      const steps = cancelled ? 0 : Math.max(0, Math.round(Math.abs(state.offset) / 24)) * Math.sign(state.offset);
      if (steps) onChange(values[clamp(state.startIndex - steps, 0, values.length - 1)]);
      syncChoiceWheel(id, getValue());
    };
    wheel.addEventListener('pointerup', (event) => finish(event));
    wheel.addEventListener('pointercancel', (event) => finish(event, true));
    wheel.addEventListener('keydown', (event) => {
      if (disabled()) return;
      let next = index();
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next -= 1;
      else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next += 1;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = values.length - 1;
      else return;
      event.preventDefault(); onChange(values[clamp(next, 0, values.length - 1)]); syncChoiceWheel(id, getValue());
    });
    syncChoiceWheel(id, getValue());
  }

  function remapNoteRows(items, oldPitches, nextPitches) {
    items.forEach((note) => {
      const midi = Number.isFinite(Number(note.midi)) ? Number(note.midi) : oldPitches[note.row]?.midi;
      if (!Number.isFinite(midi)) return;
      const exact = nextPitches.findIndex((pitch) => pitch.midi === midi);
      note.row = exact >= 0 ? exact : nextPitches.reduce((best, pitch, index) =>
        Math.abs(pitch.midi - midi) < Math.abs(nextPitches[best].midi - midi) ? index : best, 0);
      note.midi = midi;
    });
  }

  function refreshScale(count, notify = true) {
    const nextCount = Number(count);
    if (![4, 5, 8, 12, 24, 49, 61, 88].includes(nextCount)) return;
    const nextPitches = musicData.getPitches(nextCount);
    if (nextCount !== pitchCount) {
      remapNoteRows(notes, pitches, nextPitches);
      if (loopClip) remapNoteRows(loopClip.notes, pitches, nextPitches);
    }
    pitchCount = nextCount;
    pitches = nextPitches;
    syncChoiceWheel('#scale-wheel', pitchCount);
    $('#pitch-shortcut-label').textContent = pitchCount <= 8 ? `1–${pitchCount}` : '钢琴键';
    $('#sequencer-title').textContent = `${pitchCount}线谱音序器`;
    $('#staff-grid').setAttribute('aria-label', `${pitchCount}线谱滑轨编辑区`);
    $('#staff-scroll').classList.toggle('extended-scale', pitchCount > 8);
    renderRuler(); renderStaff(); renderPitchPad(); selectMeme(selectedId); saveState();
    if (pitchCount > 8) {
      requestAnimationFrame(() => {
        const row = pitches.findIndex((pitch) => pitch.midi === 67);
        $('#staff-scroll').scrollTop = Math.max(0, row * 50 - 180);
      });
    } else $('#staff-scroll').scrollTop = 0;
    if (notify) showToast(pitchCount > 8 ? `已切换为 ${pitchCount} 键钢琴操作台，音符保持原音高` : `已切换为 ${pitchCount} 音阶，数字键 1 始终是最低音`);
  }

  function overlaps(row, col, length, other) {
    return other.row === row && col < other.col + other.length && col + length > other.col;
  }

  function maxNoteLength(note) {
    const next = notes
      .filter((item) => item.id !== note.id && item.row === note.row && item.col > note.col + .001)
      .sort((a, b) => a.col - b.col)[0];
    return next ? Math.max(.05, next.col - note.col) : Number.POSITIVE_INFINITY;
  }

  function formatLength(length) { return Number(length.toFixed(2)).toString(); }

  let noteFxTimer = null;

  function wakeNoteFx() {
    const panel = $('#note-fx');
    if (panel.hidden || !selectedNoteId) return;
    clearTimeout(noteFxTimer);
    panel.classList.remove('auto-hidden');
    positionNoteFx();
    noteFxTimer = setTimeout(() => panel.classList.add('auto-hidden'), 2800);
  }

  function closeNoteFx() {
    selectedNoteId = null;
    clearTimeout(noteFxTimer);
    $('#note-fx').hidden = true;
    $('#note-fx').classList.remove('auto-hidden');
    $$('.placed-note.selected').forEach((noteEl) => {
      noteEl.classList.remove('selected');
      noteEl.setAttribute('aria-pressed', 'false');
    });
  }

  function updateNoteFxBadge(note) {
    const noteEl = $(`.placed-note[data-note-id="${note.id}"]`);
    if (!noteEl) return;
    noteEl.classList.toggle('fx-override', Boolean(note.reverbPreset));
    const badge = $('.note-fx-badge', noteEl);
    badge.hidden = !note.reverbPreset;
    badge.textContent = note.reverbPreset === 'none' ? 'DRY' : 'FX';
  }

  function positionNoteFx() {
    const panel = $('#note-fx');
    if (panel.hidden || !selectedNoteId) return;
    const noteEl = $$('.placed-note').find((item) => item.dataset.noteId === selectedNoteId);
    if (!noteEl) { panel.style.visibility = 'hidden'; return; }
    const noteRect = noteEl.getBoundingClientRect();
    const staffRect = $('#staff-scroll').getBoundingClientRect();
    const visible = noteRect.right > staffRect.left && noteRect.left < staffRect.right && noteRect.bottom > staffRect.top && noteRect.top < staffRect.bottom;
    panel.style.visibility = visible ? 'visible' : 'hidden';
    if (!visible) return;
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const left = clamp(noteRect.left + noteRect.width / 2 - width / 2, 8, Math.max(8, window.innerWidth - width - 8));
    let top = noteRect.top - height - 10;
    if (top < 8) top = noteRect.bottom + 10;
    top = clamp(top, 8, Math.max(8, window.innerHeight - height - 8));
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
  }

  function syncNoteFx() {
    const note = notes.find((item) => item.id === selectedNoteId);
    if (!note) { closeNoteFx(); return; }
    const source = sourceInfo(note.meme);
    const preset = note.reverbPreset;
    const wet = Math.round((preset ? (note.reverbWet ?? reverbPresets[preset].wet) : reverbWet) * 10) / 10;
    const panel = $('#note-fx');
    panel.hidden = false;
    panel.setAttribute('aria-label', `${source.title} · ${pitches[note.row]?.name || '音高'}的独立混响设置`);
    syncChoiceWheel('#note-fx-preset-wheel', preset || 'inherit');
    syncChoiceWheel('#note-fx-wet-wheel', wet);
    $('#note-fx-wet-wheel').setAttribute('aria-disabled', String(!preset || preset === 'none'));
    $('#note-fx-percent').textContent = `${Math.round(wet * 100)}%`;
    $('#note-fx-preset-wheel').title = `混响预设：${$('#note-fx-preset-wheel').getAttribute('aria-valuetext')} · 上下拖动`;
    $$('.placed-note').forEach((noteEl) => {
      const selected = noteEl.dataset.noteId === note.id;
      noteEl.classList.toggle('selected', selected);
      noteEl.setAttribute('aria-pressed', String(selected));
    });
    updateNoteFxBadge(note);
    positionNoteFx();
  }

  function selectNoteById(id) {
    if (!notes.some((note) => note.id === id)) { closeNoteFx(); return; }
    selectedNoteId = id;
    syncNoteFx();
    wakeNoteFx();
    const note = notes.find((item) => item.id === id);
    $('#play-status').textContent = `${sourceInfo(note.meme).title} · ${pitches[note.row]?.name || ''} · 可单独设置混响`;
  }

  function noteMarkup(note) {
    const source = sourceInfo(note.meme);
    const compact = note.length < .7 ? ' compact' : '';
    const selected = note.id === selectedNoteId ? ' selected' : '';
    const override = note.reverbPreset ? ' fx-override' : '';
    const length = timelineLength();
    const image = source.image ? `<img src="${source.image}" alt="" draggable="false">` : `<span class="note-instrument-symbol" aria-hidden="true">${source.symbol}</span>`;
    return `<span class="placed-note${compact}${selected}${override}" data-note-id="${note.id}" style="--note-color:${source.color};left:${note.col / length * 100}%;width:${note.length / length * 100}%" tabindex="0" role="button" aria-pressed="${note.id === selectedNoteId}" aria-label="${source.title}，位置 ${note.col.toFixed(2)} 步，长度 ${note.length.toFixed(2)} 步。拖动移动，右缘调整长度，点击设置独立混响" title="${source.title} · ${note.col.toFixed(2)} 步 · 长度 ${formatLength(note.length)} · 点击设置混响">${image}<span class="note-name">${source.title}</span>${icon('note')}<small class="note-fx-badge" ${note.reverbPreset ? '' : 'hidden'}>${note.reverbPreset === 'none' ? 'DRY' : 'FX'}</small><small class="note-length" ${Math.abs(note.length - 1) < .04 || note.length < .7 ? 'hidden' : ''}>×${formatLength(note.length)}</small><span class="note-resize" data-resize-id="${note.id}" aria-hidden="true"></span></span>`;
  }

  function createNoteElement(note) {
    const template = document.createElement('template');
    template.innerHTML = noteMarkup(note).trim();
    return template.content.firstElementChild;
  }

  function updateNoteVisual(noteEl, note) {
    const length = timelineLength();
    noteEl.style.left = `${note.col / length * 100}%`;
    noteEl.style.width = `${note.length / length * 100}%`;
    noteEl.classList.toggle('compact', note.length < .7);
    const badge = $('.note-length', noteEl);
    badge.textContent = `×${formatLength(note.length)}`;
    badge.hidden = Math.abs(note.length - 1) < .04 || note.length < .7;
  }

  function renderStaff() {
    syncTimelineDimensions();
    $('#staff-grid').innerHTML = pitches.map((pitch, row) => `
      <div class="staff-row"><div class="pitch-label">${pitch.name}<span>${pitch.name === 'G4' ? '原调' : ''}</span></div>
      <div class="rail-track" data-row="${row}" tabindex="0" aria-label="${pitch.name} 滑轨，在空白处按下并向右拖动，放入并延长 ${sourceInfo(selectedId).title}">${notes.filter((note) => note.row === row).map(noteMarkup).join('')}</div></div>`).join('');
    $('#note-count').textContent = `${notes.length} 个音符 · ${Math.ceil(timelineLength() / 4)} 小节`;

    $$('.placed-note').forEach((noteEl) => {
      noteEl.addEventListener('dragstart', (event) => event.preventDefault());
      noteEl.addEventListener('pointerdown', (event) => beginMoveGesture(event, noteEl));
      $('.note-resize', noteEl).addEventListener('pointerdown', (event) => beginResizeGesture(event, noteEl));
    });
    syncNoteFx();
    updatePlayhead();
    updateLoopRangeSummary();
  }

  function renderPitchPad() {
    const pad = $('#pitch-pad');
    pad.style.setProperty('--pitch-count', pitchCount);
    pad.classList.toggle('piano-pad', pitchCount > 8);
    if (pitchCount > 8) {
      const layout = musicData.getPianoLayout(pitches);
      pad.innerHTML = `<div class="piano-scroll" tabindex="0" aria-label="${pitchCount} 键钢琴，横向滑动查看全部音域"><div class="piano-keyboard" style="width:${layout.width}px">${layout.markup}</div></div>`;
    } else {
      pad.innerHTML = pitches.map((pitch, row) => ({ pitch, row })).reverse().map(({ pitch, row }, index) => `<button type="button" class="pitch-key" data-row="${row}" style="--key-color:${pitch.color}" aria-label="用 ${sourceInfo(selectedId).title} 演奏 ${pitch.name}"><kbd>${index + 1}</kbd><strong>${pitch.name}</strong><small>${pitch.cn}</small></button>`).join('');
    }
    $$('.pitch-key').forEach((key) => key.addEventListener('click', () => performMeme(selectedId, Number(key.dataset.row), true)));
    if (pitchCount > 8) {
      const scroller = $('.piano-scroll', pad);
      const middle = $('.piano-key[data-midi="60"]', pad);
      if (scroller && middle) scroller.scrollLeft = Math.max(0, middle.offsetLeft - scroller.clientWidth * .42);
    }
  }

  function selectMeme(id) {
    const nextId = validSource(id) ? id : 'doro';
    const nextCartridge = cartridges.findIndex((cartridge) => cartridge.items.some((meme) => meme.id === nextId));
    if (nextCartridge >= 0 && !isCartridgeUnlocked(nextCartridge)) {
      showToast(`「${cartridges[nextCartridge].name}」需要${cartridgeRequirement(nextCartridge)}`);
      return false;
    }
    selectedId = nextId;
    const source = sourceInfo(selectedId);
    const sourceCartridge = nextCartridge;
    if (sourceCartridge >= 0 && sourceCartridge !== cartridgeIndex) {
      cartridgeIndex = sourceCartridge;
      renderMemeCards();
    }
    updateCartridgeWheel();
    $$('.card-button').forEach((button) => {
      const selected = button.dataset.meme === selectedId;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    $$('.instrument-card').forEach((button) => {
      const selected = button.dataset.instrument === selectedId;
      button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
    });
    $('#selected-name').textContent = source.title;
    $('#selection-swatch').style.background = source.color;
    $('#now-name').textContent = source.title;
    $('#now-sound').textContent = `${source.type === 'original' ? '原声采样' : source.type === 'instrument' ? '本地合成乐器' : 'Demo 合成仿音'} · 点击下面的音阶`;
    $('#now-image').style.setProperty('--now-color', source.color);
    $('#now-image').innerHTML = source.image ? `<img src="${source.image}" alt="当前选中的 ${source.title}">` : `<span class="instrument-glyph" aria-label="${source.title}">${source.symbol}</span>`;
    $$('.pitch-key').forEach((key) => key.setAttribute('aria-label', `用 ${source.title} 演奏 ${pitches[Number(key.dataset.row)].name}`));
    window.MemeRecordStage.updateSelection(); saveState();
  }

  function placeNote(memeId, row, col, quiet = false, length = 1) {
    row = clamp(Number(row), 0, pitchCount - 1);
    col = precise(Math.max(0, Number(col) || 0));
    length = precise(Math.max(.05, Number(length) || 1));
    notes = notes.filter((note) => !overlaps(row, col, length, note));
    const note = { id: uid(), meme: memeId, row, col, length, reverbPreset: null, reverbWet: null };
    notes.push(note);
    renderRuler(); renderStaff(); saveState();
    if (!quiet) {
      selectNoteById(note.id);
      $('#play-status').textContent = `${sourceInfo(memeId).title} → ${pitches[row].name} · ${col.toFixed(2)} 步 · 长度 ${formatLength(length)}`;
      previewMeme(memeId, row, false);
    }
    return note;
  }

  function removeNoteById(id) {
    const existing = notes.find((note) => note.id === id);
    if (!existing) return false;
    if (selectedNoteId === id) closeNoteFx();
    notes = notes.filter((note) => note.id !== id);
    renderRuler(); renderStaff(); saveState();
    $('#play-status').textContent = `已移除 ${sourceInfo(existing.meme).title}`;
    return true;
  }

  function focusNote(id) { $(`.placed-note[data-note-id="${id}"]`)?.focus(); }

  function resizeNoteBy(id, delta) {
    const note = notes.find((item) => item.id === id);
    if (!note) return;
    const max = maxNoteLength(note);
    const length = precise(clamp(note.length + delta, Math.min(.25, max), max));
    if (Math.abs(length - note.length) < .001) { showToast(delta > 0 ? '已经贴到下一颗音符' : '已达到较短长度'); return; }
    note.length = length;
    renderRuler(); renderStaff(); saveState(); focusNote(id);
    $('#play-status').textContent = `${sourceInfo(note.meme).title} · 长度 ${formatLength(length)} 步`;
  }

  function moveNoteBy(id, rowDelta, colDelta) {
    const note = notes.find((item) => item.id === id);
    if (!note) return;
    const row = clamp(note.row + rowDelta, 0, pitchCount - 1);
    const col = precise(Math.max(0, note.col + colDelta));
    notes = notes.filter((item) => item.id === id || !overlaps(row, col, note.length, item));
    note.row = row; note.col = col; delete note.midi;
    renderRuler(); renderStaff(); saveState(); focusNote(id);
    $('#play-status').textContent = `${sourceInfo(note.meme).title} · 位置 ${col.toFixed(2)} 步`;
  }

  function startGesture(event, state) {
    gesture = { ...state, pointerId: event.pointerId, moved: false };
    state.capture.setPointerCapture(event.pointerId);
    state.capture.addEventListener('pointermove', updateGesture);
    state.capture.addEventListener('pointerup', finishGesture);
    state.capture.addEventListener('pointercancel', finishGesture);
  }

  function beginCreateGesture(event, track) {
    if (gesture || event.button !== 0) return;
    event.preventDefault();
    const row = Number(track.dataset.row);
    const rect = track.getBoundingClientRect();
    const length = timelineLength();
    const col = Math.max(0, (event.clientX - rect.left) / rect.width * length);
    const note = { id: uid(), meme: selectedId, row, col, length: 1, reverbPreset: null, reverbWet: null };
    notes.push(note);
    note.length = Math.min(1, maxNoteLength(note));
    const noteEl = createNoteElement(note);
    track.append(noteEl); noteEl.classList.add('creating');
    startGesture(event, {
      type: 'create', capture: track, note, noteEl, startX: event.clientX, startY: event.clientY,
      stepWidth: rect.width / length, maxLength: maxNoteLength(note), length: note.length
    });
  }

  function beginMoveGesture(event, noteEl) {
    if (gesture || event.button !== 0) return;
    const note = notes.find((item) => item.id === noteEl.dataset.noteId);
    if (!note) return;
    event.preventDefault(); event.stopPropagation();
    noteEl.classList.add('dragging');
    startGesture(event, {
      type: 'move', capture: noteEl, note, noteEl, startX: event.clientX, startY: event.clientY,
      startCol: note.col, startRow: note.row, col: note.col, row: note.row,
      stepWidth: noteEl.closest('.rail-track').getBoundingClientRect().width / timelineLength()
    });
  }

  function beginResizeGesture(event, noteEl) {
    if (gesture || event.button !== 0) return;
    const note = notes.find((item) => item.id === noteEl.dataset.noteId);
    if (!note) return;
    event.preventDefault(); event.stopPropagation();
    const handle = event.target.closest('.note-resize');
    noteEl.classList.add('resizing');
    startGesture(event, {
      type: 'resize', capture: handle, note, noteEl, startX: event.clientX, startY: event.clientY,
      startLength: note.length, length: note.length, maxLength: maxNoteLength(note),
      stepWidth: noteEl.closest('.rail-track').getBoundingClientRect().width / timelineLength()
    });
  }

  function updateGesture(event) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const state = gesture;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    if (Math.hypot(dx, dy) > 3) state.moved = true;
    if (state.type === 'create') {
      if (!state.moved) return;
      state.length = clamp(dx / state.stepWidth, Math.min(.25, state.maxLength), state.maxLength);
      state.note.length = state.length;
      updateNoteVisual(state.noteEl, state.note);
    } else if (state.type === 'resize') {
      state.length = clamp(state.startLength + dx / state.stepWidth, Math.min(.25, state.maxLength), state.maxLength);
      updateNoteVisual(state.noteEl, { ...state.note, length: state.length });
    } else if (state.type === 'move' && state.moved) {
      state.col = Math.max(0, state.startCol + dx / state.stepWidth);
      state.row = clamp(state.startRow + Math.round(dy / 50), 0, pitchCount - 1);
      state.noteEl.style.transform = `translate(${(state.col - state.startCol) * state.stepWidth}px, ${(state.row - state.startRow) * 50}px)`;
    }
  }

  function finishGesture(event) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const state = gesture;
    state.capture.removeEventListener('pointermove', updateGesture);
    state.capture.removeEventListener('pointerup', finishGesture);
    state.capture.removeEventListener('pointercancel', finishGesture);
    if (state.capture.hasPointerCapture(event.pointerId)) state.capture.releasePointerCapture(event.pointerId);
    gesture = null;
    const note = state.note;
    if (state.type === 'move' && !state.moved) { selectNoteById(note.id); focusNote(note.id); return; }
    if (state.type === 'create') {
      note.col = precise(note.col); note.length = precise(state.length);
      renderRuler(); renderStaff(); saveState(); selectNoteById(note.id); focusNote(note.id);
      $('#play-status').textContent = `${sourceInfo(note.meme).title} · ${note.col.toFixed(2)} 步 · 长度 ${formatLength(note.length)}`;
      previewMeme(note.meme, note.row, false);
      return;
    }
    if (state.type === 'resize') {
      note.length = precise(state.length);
    } else {
      note.row = state.row; note.col = precise(state.col); delete note.midi;
      notes = notes.filter((item) => item.id === note.id || !overlaps(note.row, note.col, note.length, item));
    }
    renderRuler(); renderStaff(); saveState(); selectNoteById(note.id); focusNote(note.id);
    $('#play-status').textContent = state.type === 'resize'
      ? `${sourceInfo(note.meme).title} · 长度 ${formatLength(note.length)} 步`
      : `${sourceInfo(note.meme).title} · 位置 ${note.col.toFixed(2)} 步`;
  }

  function clearDropTargets() { $$('.drop-target').forEach((track) => track.classList.remove('drop-target')); }

  function bindStaff() {
    const grid = $('#staff-grid');
    grid.addEventListener('pointerdown', (event) => {
      const track = event.target.closest('.rail-track');
      if (track && !event.target.closest('.placed-note')) beginCreateGesture(event, track);
    });
    grid.addEventListener('keydown', (event) => {
      const noteEl = event.target.closest('.placed-note');
      if (noteEl) {
        const id = noteEl.dataset.noteId;
        const amount = event.shiftKey ? 1 : .25;
        if (event.key === '[' || event.key === ']') {
          event.preventDefault(); resizeNoteBy(id, event.key === ']' ? amount : -amount);
        } else if (event.key.startsWith('Arrow')) {
          event.preventDefault();
          moveNoteBy(id, event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0,
            event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0);
        } else if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault(); removeNoteById(id);
        } else if (event.key === 'Enter') {
          event.preventDefault(); selectNoteById(id); $('#note-fx-preset-wheel').focus({ preventScroll: true });
        }
        return;
      }
      const track = event.target.closest('.rail-track');
      if (track && event.key === 'Enter') {
        event.preventDefault(); placeNote(selectedId, Number(track.dataset.row), 0);
      }
    });
    grid.addEventListener('dragover', (event) => {
      const track = event.target.closest('.rail-track');
      if (!track) return;
      event.preventDefault(); clearDropTargets(); track.classList.add('drop-target');
      event.dataTransfer.dropEffect = 'copy';
    });
    grid.addEventListener('drop', (event) => {
      const track = event.target.closest('.rail-track');
      if (!track) return;
      event.preventDefault();
      const raw = event.dataTransfer.getData('text/plain');
      if (!dragData && raw.startsWith('meme:')) dragData = { type: 'new', meme: raw.slice(5) };
      if (dragData?.type === 'new') {
        const rect = track.getBoundingClientRect();
        const col = Math.max(0, (event.clientX - rect.left) / rect.width * timelineLength());
        placeNote(dragData.meme, Number(track.dataset.row), col);
      }
      dragData = null; clearDropTargets();
    });
    grid.addEventListener('dragleave', (event) => {
      if (!grid.contains(event.relatedTarget)) clearDropTargets();
    });
  }

  function buildImpulse(preset) {
    if (impulseBuffers.has(preset)) return impulseBuffers.get(preset);
    const settings = reverbPresets[preset];
    const length = Math.max(2, Math.floor(audioCtx.sampleRate * settings.seconds));
    const impulse = audioCtx.createBuffer(2, length, audioCtx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      let previous = 0;
      for (let i = 0; i < length; i++) {
        const envelope = (1 - i / length) ** settings.decay;
        const white = Math.random() * 2 - 1;
        previous = preset === 'plate' ? white * .72 + previous * .28 : white;
        const early = i < audioCtx.sampleRate * .025 && preset !== 'none' ? .35 : 1;
        data[i] = previous * envelope * early;
      }
    }
    impulseBuffers.set(preset, impulse);
    return impulse;
  }

  function applyReverb() {
    syncChoiceWheel('#reverb-wheel', reverbPreset);
    syncChoiceWheel('#reverb-wet-wheel', reverbWet);
    syncNoteFx();
    if (!audioCtx || !convolver) return;
    convolver.buffer = buildImpulse(reverbPreset);
    reverbGain.gain.setTargetAtTime(reverbWet, audioCtx.currentTime, .025);
    dryGain.gain.setTargetAtTime(1 - reverbWet * .35, audioCtx.currentTime, .025);
  }

  function createSoundBus(note, when, duration) {
    const output = audioCtx.createGain();
    output.gain.value = Number.isFinite(Number(note?.loopVolume)) ? clamp(Number(note.loopVolume), 0, 1) : 1;
    const preset = note?.reverbPreset || null;
    const busInput = note?.backing && padBackingInput ? padBackingInput : note?.padBus && padMixInput ? padMixInput : null;
    const destination = busInput || master;
    const temporaryNodes = [output];
    if (!preset) {
      output.connect(busInput || mixInput);
    } else {
      const wet = preset === 'none' ? 0 : clamp(note.reverbWet ?? reverbPresets[preset].wet, 0, .7);
      const dry = audioCtx.createGain();
      dry.gain.value = 1 - wet * .35;
      output.connect(dry).connect(destination);
      temporaryNodes.push(dry);
      if (wet > 0) {
        if (!noteConvolvers.has(preset)) {
          const noteConvolver = audioCtx.createConvolver();
          noteConvolver.buffer = buildImpulse(preset);
          noteConvolver.connect(master);
          noteConvolvers.set(preset, noteConvolver);
        }
        const send = audioCtx.createGain();
        send.gain.value = wet;
        output.connect(send).connect(noteConvolvers.get(preset));
        temporaryNodes.push(send);
      }
    }
    const tail = preset && preset !== 'none' ? reverbPresets[preset].seconds : 0;
    const cleanupAfter = Math.max(100, (when - audioCtx.currentTime + duration + tail + .3) * 1000);
    setTimeout(() => temporaryNodes.forEach((node) => { try { node.disconnect(); } catch (_) { /* already disconnected */ } }), cleanupAfter);
    return output;
  }

  function withSoundBus(note, when, duration, build) {
    const previousOutput = soundOutput;
    soundOutput = createSoundBus(note, when, duration);
    try { build(); } finally { soundOutput = previousOutput; }
  }

  async function ensureAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error('Web Audio unavailable');
      audioCtx = new AudioContextClass();
      mixInput = audioCtx.createGain();
      master = audioCtx.createGain();
      dryGain = audioCtx.createGain();
      convolver = audioCtx.createConvolver();
      reverbGain = audioCtx.createGain();
      padMixInput = audioCtx.createGain();
      padBackingInput = audioCtx.createGain();
      const padCompressor = audioCtx.createDynamicsCompressor();
      const padOutput = audioCtx.createGain();
      padCompressor.threshold.value = -16;
      padCompressor.knee.value = 10;
      padCompressor.ratio.value = 3.5;
      padCompressor.attack.value = .004;
      padCompressor.release.value = .16;
      padOutput.gain.value = .82;
      padBackingInput.gain.value = 1.5;
      padMixInput.connect(padCompressor).connect(padOutput).connect(master);
      padBackingInput.connect(padCompressor);
      master.gain.value = outputVolume / 100;
      mixInput.connect(dryGain).connect(master);
      mixInput.connect(convolver).connect(reverbGain).connect(master);
      master.connect(audioCtx.destination);
      applyReverb();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => { /* 需要用户手势，点击后会自动恢复 */ });
    return audioCtx;
  }

  async function loadBuffer(id) {
    if (buffers[id]) return buffers[id];
    const meme = memeById(id);
    if (!meme.audio) return null;
    if (!buffers[id]) {
      buffers[id] = (async () => {
        const response = await fetch(meme.audio);
        if (!response.ok) throw new Error(`Audio ${response.status}`);
        return audioCtx.decodeAudioData(await response.arrayBuffer());
      })();
    }
    try {
      const decoded = await buffers[id];
      buffers[id] = decoded;
      if (!sampleLeads.has(id)) sampleLeads.set(id, detectSampleLead(decoded));
      return decoded;
    } catch (error) {
      delete buffers[id];
      throw error;
    }
  }

  // 采样开头常有几十毫秒静音，直接从头播会让人误以为"点了没反应"，这里算出第一个可听位置。
  function detectSampleLead(buffer) {
    try {
      const data = buffer.getChannelData(0);
      const limit = Math.min(data.length, Math.floor(buffer.sampleRate * 0.45));
      const threshold = 0.012;
      for (let index = 0; index < limit; index++) {
        if (Math.abs(data[index]) > threshold) return Math.max(0, index / buffer.sampleRate - 0.003);
      }
    } catch (_) { /* 解码内容异常时按 0 处理 */ }
    return 0;
  }

  function preloadPadSamples() {
    if (padPreloadStarted) return;
    padPreloadStarted = true;
    const ids = [...new Set(memes.filter((meme) => meme.audio).map((meme) => meme.id))];
    ensureAudio()
      .then(() => Promise.all(ids.map((id) => loadBuffer(id).catch(() => {}))))
      .catch(() => { /* 预加载失败时仍按需加载 */ });
  }

  function trackSource(source) {
    activeSources.add(source);
    source.addEventListener('ended', () => activeSources.delete(source), { once: true });
    return source;
  }

  function tone(type, frequency, when, duration, volume = 0.15, endFrequency = null) {
    const oscillator = trackSource(audioCtx.createOscillator());
    const gain = audioCtx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(30, frequency), when);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), when + duration);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + Math.min(.018, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(gain).connect(soundOutput || mixInput);
    oscillator.start(when);
    oscillator.stop(when + duration + .02);
    return oscillator;
  }

  function getNoise() {
    if (noiseBuffer) return noiseBuffer;
    noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  }

  function noise(when, duration, frequency, volume = .12) {
    const source = trackSource(audioCtx.createBufferSource());
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    source.buffer = getNoise();
    filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = .7;
    gain.gain.setValueAtTime(.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    source.connect(filter).connect(gain).connect(soundOutput || mixInput);
    source.start(when); source.stop(when + duration + .02);
  }

  function synthSound(id, row, when, preview, note = null, hasAdjacentNext = false) {
    const ratio = 2 ** (((note?.midi ?? pitches[row].midi) - 67) / 12);
    const base = 392 * ratio;
    const d = preview ? .9 : (note?.length || 1) * stepDuration() * (hasAdjacentNext ? 1 : 1.35);
    switch (id) {
      case 'maodie':
        noise(when, d * .72, 1900 * ratio, .19);
        tone('sawtooth', base * 1.25, when, d * .55, .055, base * .45);
        noise(when + d * .45, d * .35, 2500 * ratio, .1);
        break;
      case 'chicken':
        tone('square', base * 1.55, when, d * .22, .11, base * 1.9);
        tone('triangle', base * 2, when + d * .23, d * .3, .17, base * 1.35);
        tone('sine', base * .25, when, d * .25, .17, base * .12);
        tone('square', base * 1.8, when + d * .58, d * .22, .09, base * 1.35);
        break;
      case 'dog':
        [0, .27, .57].forEach((part, index) => {
          const start = when + d * part;
          tone('sawtooth', base * (index === 2 ? .75 : .55), start, d * .23, .18, base * .3);
          tone('square', base * (index === 2 ? 1.5 : 1.1), start, d * .17, .055, base * .7);
        });
        noise(when, d * .18, 500 * ratio, .06);
        break;
      case 'nailong':
        [0, .2, .4, .6, .8].forEach((part, index) => {
          const start = when + d * part;
          tone('sawtooth', base * (index % 2 ? .62 : .72), start, d * .16, .11, base * .42);
          tone('triangle', base * 1.35, start, d * .13, .08, base * .8);
        });
        break;
      case 'oiia':
        [1, 1.5, 1.25, 1.75].forEach((mul, index) => tone('square', base * mul, when + index * d * .2, d * .18, .09, base * mul * .8));
        break;
      default:
        tone('triangle', base, when, d * .35, .18, base * 1.25);
        tone('sine', base * 1.5, when + d * .3, d * .45, .2, base * 1.1);
        tone('triangle', base * 2, when + d * .58, d * .25, .09);
    }
  }

  function instrumentSound(id, row, when, preview, note) {
    const kind = id.replace('instrument:', '');
    const midi = note?.midi ?? pitches[row].midi;
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    const duration = preview ? 1.2 : Math.max(.12, (note?.length || 1) * (note?.stepLength || stepDuration()));
    const end = when + duration;
    const voice = (type, multiplier, volume, attack = .012, sustain = .4, detune = 0, cutoff = 5000) => {
      const oscillator = trackSource(audioCtx.createOscillator());
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency * multiplier, when);
      oscillator.detune.value = detune;
      filter.type = 'lowpass'; filter.frequency.value = cutoff; filter.Q.value = .45;
      const rise = Math.min(attack, duration * .3);
      const releaseStart = Math.max(when + rise, end - Math.min(.45, duration * .45));
      gain.gain.setValueAtTime(.0001, when);
      gain.gain.linearRampToValueAtTime(volume, when + rise);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0001, volume * sustain), releaseStart);
      gain.gain.exponentialRampToValueAtTime(.0001, end);
      oscillator.connect(filter).connect(gain).connect(soundOutput || mixInput);
      oscillator.start(when); oscillator.stop(end + .04);
      if (kind === 'violin' || kind === 'sax') {
        const vibrato = trackSource(audioCtx.createOscillator());
        const vibratoDepth = audioCtx.createGain();
        vibrato.frequency.value = 5.4; vibratoDepth.gain.value = frequency * .009;
        vibrato.connect(vibratoDepth).connect(oscillator.frequency);
        vibrato.start(when + Math.min(.15, duration * .2)); vibrato.stop(end + .04);
      }
    };
    if (kind === 'piano') {
      voice('triangle', 1, .32, .004, .24); voice('sine', 2, .12, .003, .1); voice('sine', 3, .045, .002, .05);
    } else if (kind === 'guitar') {
      voice('triangle', 1, .28, .003, .16, 0, 2600); voice('sawtooth', 2, .065, .002, .08, 3, 2200); voice('sine', .5, .08, .004, .22);
    } else if (kind === 'violin') {
      voice('sawtooth', 1, .12, .14, .72, -4, 2800); voice('triangle', 1, .19, .12, .76, 4, 3400); voice('sine', 2, .04, .16, .65);
    } else if (kind === 'bass') {
      voice('sine', 1, .3, .006, .5); voice('sawtooth', 1, .12, .004, .28, 0, 850); voice('sine', .5, .13, .008, .4);
    } else if (kind === 'marimba') {
      voice('sine', 1, .32, .002, .045); voice('sine', 4, .065, .001, .02); voice('sine', 10, .014, .001, .01);
    } else if (kind === 'harp') {
      voice('triangle', 1, .25, .003, .12); voice('sine', 2, .11, .002, .07); voice('sine', 3, .045, .002, .04);
    } else if (kind === 'organ') {
      voice('sine', 1, .19, .04, .86); voice('sine', 2, .1, .035, .82); voice('sine', 3, .055, .03, .8); voice('sine', .5, .08, .04, .82);
    } else if (kind === 'flute') {
      voice('sine', 1, .31, .075, .7); voice('triangle', 2, .045, .09, .62, 2);
      noise(when, Math.min(duration, .28), frequency * 2, .025);
    } else if (kind === 'trumpet') {
      voice('sawtooth', 1, .14, .055, .68, -3, 1900); voice('square', 1, .055, .045, .6, 3, 1700); voice('sine', 2, .035, .06, .6);
    } else if (kind === 'sax') {
      voice('sawtooth', 1, .1, .07, .64, -4, 1500); voice('triangle', 1, .16, .06, .7, 4, 1900); voice('sine', 2, .035, .08, .58);
      noise(when, Math.min(duration, .3), frequency * 1.5, .014);
    } else if (kind === '8bit') {
      voice('square', 1, .16, .002, .32, 0, 6500); voice('square', 2, .045, .002, .2); voice('sine', .5, .045, .003, .3);
    } else if (kind === 'pad') {
      voice('sawtooth', 1, .055, .28, .82, -7, 1200); voice('sawtooth', 1, .055, .3, .8, 7, 1200); voice('sine', 1, .13, .25, .85);
    } else {
      voice('square', 1, .13, .018, .48, -5, 2100); voice('sawtooth', 1, .12, .025, .42, 5, 1800); voice('sine', .5, .08, .02, .5);
    }
  }

  function triggerSound(id, row, when, preview = false, note = null, hasAdjacentNext = false) {
    if (id.startsWith('instrument:')) {
      const duration = preview ? 1.2 : Math.max(.12, (note?.length || 1) * stepDuration());
      withSoundBus(note, when, duration, () => instrumentSound(id, row, when, preview, note));
      return;
    }
    const meme = memeById(id);
    if (meme.type === 'original' && buffers[id] && typeof buffers[id].duration === 'number') {
      const source = trackSource(audioCtx.createBufferSource());
      const gain = audioCtx.createGain();
      const buffer = buffers[id];
      const volume = id === 'oiia' ? .7 : .82;
      const playbackRate = 2 ** (((note?.midi ?? pitches[row].midi) - 67) / 12);
      const sampleOffset = Math.max(0, Number(note?.offset) || 0) * stepDuration() * playbackRate;
      const lead = sampleLeads.get(id) || 0;
      const startOffset = Math.min(sampleOffset + lead, buffer.duration);
      const sampleDuration = buffer.duration / playbackRate;
      const availableDuration = Math.max(.01, sampleDuration - startOffset / playbackRate);
      const padHit = Boolean(note?.padHit);
      const duration = padHit
        ? Math.min(.26, availableDuration)
        : preview
          ? Math.min(2.7, availableDuration)
          : (note?.length || 1) * stepDuration() * (hasAdjacentNext ? 1 : 1.6);
      const stopAt = when + duration;
      const attack = padHit ? Math.min(.006, duration * .12) : Math.min(.025, duration * .08);
      const fade = padHit
        ? Math.min(.07, duration * .4)
        : Math.min(hasAdjacentNext ? .42 : .11, duration * (hasAdjacentNext ? .72 : .32));
      const fadeStart = Math.max(when + attack, stopAt - fade);
      const fadeCurve = new Float32Array(97);
      for (let i = 0; i < fadeCurve.length; i++) {
        fadeCurve[i] = volume * (Math.cos(i / (fadeCurve.length - 1) * Math.PI / 2) ** 1.35);
      }
      source.buffer = buffer;
      source.playbackRate.value = playbackRate;
      source.loop = !preview && !padHit && duration > availableDuration;
      if (source.loop && startOffset > 0) { source.loopStart = startOffset; source.loopEnd = buffer.duration; }
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(volume, when + attack);
      gain.gain.setValueAtTime(volume, fadeStart);
      gain.gain.setValueCurveAtTime(fadeCurve, fadeStart, stopAt - fadeStart);
      source.connect(gain).connect(createSoundBus(note, when, duration));
      source.start(when, startOffset);
      source.stop(stopAt + .08);
      // 打击垫连击：同一采样被再次敲击时，上一声快速收掉，避免声音叠成一团。
      if (padHit) {
        const previous = padSampleVoices.get(id);
        if (previous) {
          try {
            previous.gain.gain.cancelScheduledValues(when);
            previous.gain.gain.setTargetAtTime(0, when, .004);
            previous.source.stop(when + .045);
          } catch (_) { /* 上一声已结束 */ }
        }
        padSampleVoices.set(id, { source, gain });
        source.addEventListener('ended', () => {
          if (padSampleVoices.get(id)?.source === source) padSampleVoices.delete(id);
        }, { once: true });
      }
    } else {
      const duration = preview ? .9 : (note?.length || 1) * stepDuration() * (hasAdjacentNext ? 1 : 1.35);
      withSoundBus(note, when, duration, () => synthSound(id, row, when, preview, note, hasAdjacentNext));
    }
  }

  async function startLiveSound(id, row, note) {
    await ensureAudio();
    if (sourceInfo(id).type === 'original') {
      try { await loadBuffer(id); } catch (_) { /* use the synthesized fallback */ }
    }
    const when = audioCtx.currentTime + .005;
    const control = audioCtx.createGain();
    const bus = createSoundBus(note, when, 3600);
    control.gain.value = 1;
    control.connect(bus);
    const previousSources = new Set(activeSources);
    const longNote = { ...note, length: 3600 / stepDuration() };
    if (id.startsWith('instrument:')) {
      const previousOutput = soundOutput;
      soundOutput = control;
      try { instrumentSound(id, row, when, false, longNote); } finally { soundOutput = previousOutput; }
    } else if (buffers[id] && typeof buffers[id].duration === 'number') {
      const source = trackSource(audioCtx.createBufferSource());
      const gain = audioCtx.createGain();
      const volume = id === 'oiia' ? .7 : .82;
      source.buffer = buffers[id];
      source.playbackRate.value = 2 ** (((note?.midi ?? pitches[row].midi) - 67) / 12);
      source.loop = true;
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(volume, when + .018);
      source.connect(gain).connect(control);
      source.start(when);
    } else {
      const previousOutput = soundOutput;
      soundOutput = control;
      try { synthSound(id, row, when, false, longNote, false); } finally { soundOutput = previousOutput; }
    }
    const ownedSources = [...activeSources].filter((source) => !previousSources.has(source));
    let stopped = false;
    return {
      stop() {
        if (stopped) return;
        stopped = true;
        const now = audioCtx.currentTime;
        control.gain.cancelScheduledValues(now);
        control.gain.setValueAtTime(Math.max(.0001, control.gain.value), now);
        control.gain.exponentialRampToValueAtTime(.0001, now + .14);
        setTimeout(() => {
          ownedSources.forEach((source) => { try { source.stop(); } catch (_) { /* already stopped */ } });
          try { control.disconnect(); } catch (_) { /* already disconnected */ }
        }, 170);
        const preset = note.reverbPreset || reverbPreset;
        const tail = preset === 'none' ? 0 : reverbPresets[preset].seconds;
        setTimeout(() => { try { bus.disconnect(); } catch (_) { /* already disconnected */ } }, (tail + .4) * 1000);
      }
    };
  }

  function flashMeme(id, row) {
    const card = $(`.card-button[data-meme="${id}"]`);
    const instrument = $(`.instrument-card[data-instrument="${id}"]`);
    const key = $(`.pitch-key[data-row="${row}"]`);
    const nowImage = $('#now-image');
    [card, instrument, key, nowImage].filter(Boolean).forEach((el) => el.classList.add(el === nowImage ? 'pulse' : 'playing'));
    $('#equalizer').classList.add('active');
    const timer = setTimeout(() => {
      card?.classList.remove('playing'); instrument?.classList.remove('playing'); key?.classList.remove('playing'); nowImage.classList.remove('pulse');
      $('#equalizer').classList.remove('active');
      visualTimers.delete(timer);
    }, 230);
    visualTimers.add(timer);
  }

  async function previewMeme(id, row = defaultRow(), visual = true) {
    try {
      row = clamp(row, 0, pitchCount - 1);
      await ensureAudio();
      const source = sourceInfo(id);
      if (source.type === 'original') {
        try { await loadBuffer(id); } catch (_) { if (!audioFailed) showToast('原声读取失败，已切换合成仿音'); audioFailed = true; }
      }
      triggerSound(id, row, audioCtx.currentTime + .015, true);
      if (visual) flashMeme(id, row);
      $('#play-status').textContent = `正在试听 ${source.title} · ${pitches[row].name}`;
    } catch (_) {
      showToast('浏览器未能启动声音，请再点击一次');
    }
  }

  function performMeme(id, row, allowRecord) {
    previewMeme(id, row);
    if (allowRecord && recording && isPlaying) {
      const col = precise(currentStep + Math.max(0, audioCtx.currentTime - currentStepStartedAt) / stepDuration());
      placeNote(id, row, col, true);
      $('#play-status').textContent = `已录下 ${sourceInfo(id).title} · ${col.toFixed(2)} 步`;
    }
  }

  function stepDuration() { return 60 / bpm / 2; }

  function advanceRecordingPosition() {
    if (!audioCtx) return recordingPosition;
    const now = audioCtx.currentTime;
    const elapsed = clamp(now - recordingFrameAt, 0, .1);
    recordingFrameAt = now;
    if (activePerformances.size) {
      const sustainedEnd = Math.max(...[...activePerformances.values()].map((performance) =>
        performance.note.col + Math.max(.05, (now - performance.startTime) / stepDuration())
      ));
      recordingTargetStep = Math.max(recordingTargetStep, sustainedEnd);
    }
    const previous = recordingPosition;
    const remaining = Math.max(0, recordingTargetStep - recordingPosition);
    if (remaining > 0) {
      const edgeEase = clamp(remaining / .12, .2, 1);
      recordingPosition = Math.min(recordingTargetStep, recordingPosition + elapsed / stepDuration() * edgeEase);
      currentStep = Math.floor(recordingPosition + .0001);
      if (currentStep !== recordingLoopStep) {
        recordingLoopStep = currentStep;
        triggerLoopStep(currentStep, now + .005);
      }
      notes.filter((note) => !recordingTriggeredIds.has(note.id) && note.row < pitchCount && note.col >= previous - .0001 && note.col <= recordingPosition + .0001).forEach((note) => {
        recordingTriggeredIds.add(note.id);
        const hasAdjacentNext = notes.some((item) => item.id !== note.id && item.row === note.row && Math.abs(item.col - (note.col + note.length)) < .002);
        triggerSound(note.meme, note.row, audioCtx.currentTime + .005, false, note, hasAdjacentNext);
        flashMeme(note.meme, note.row);
      });
    }
    return recordingPosition;
  }

  function playPosition() {
    if (recording) return advanceRecordingPosition();
    const elapsed = isPlaying && audioCtx ? Math.max(0, audioCtx.currentTime - currentStepStartedAt) : 0;
    return currentStep + elapsed / stepDuration();
  }

  function drawPlayhead() {
    const canvas = $('#staff-canvas');
    const stepWidth = (canvas.scrollWidth - 20 - 58) / timelineLength();
    const position = playPosition();
    activePerformances.forEach((performance) => {
      performance.note.length = precise(clamp((audioCtx.currentTime - performance.startTime) / stepDuration(), .05, 3600));
    });
    $('#playhead').style.transform = `translateX(${position * stepWidth}px)`;
    window.MemeRecordStage.draw(position);
    if (recording) {
      $$('.ruler-label').forEach((label) => label.classList.toggle('current', Number(label.dataset.ruler) === currentStep));
      const scroller = $('#staff-scroll');
      scroller.scrollLeft = Math.max(0, 68 + position * stepWidth - scroller.clientWidth * .42);
    }
  }

  function updatePlayhead() {
    drawPlayhead();
    $$('.ruler-label').forEach((label) => label.classList.toggle('current', isPlaying && Number(label.dataset.ruler) === currentStep));
  }

  function animatePlayhead() {
    if (!isPlaying) { playheadFrame = null; return; }
    drawPlayhead();
    playheadFrame = requestAnimationFrame(animatePlayhead);
  }

  function setCurrentStep(step, generation, when) {
    if (generation !== scheduleGeneration || !isPlaying) return;
    currentStep = step;
    currentStepStartedAt = when;
    updatePlayhead();
  }

  function scheduleStep(step, when, generation, absoluteStep) {
    triggerLoopStep(absoluteStep, when);
    const delay = Math.max(0, (when - audioCtx.currentTime) * 1000);
    const timer = setTimeout(() => {
      setCurrentStep(step, generation, when);
      visualTimers.delete(timer);
    }, delay);
    visualTimers.add(timer);
    notes.filter((note) => note.row < pitchCount && note.col >= step && note.col < step + 1).forEach((note) => {
      const noteWhen = when + (note.col - step) * stepDuration();
      const hasAdjacentNext = notes.some((item) => item.id !== note.id && item.row === note.row && Math.abs(item.col - (note.col + note.length)) < .002);
      triggerSound(note.meme, note.row, noteWhen, false, note, hasAdjacentNext);
      const noteTimer = setTimeout(() => {
        if (generation === scheduleGeneration && isPlaying) flashMeme(note.meme, note.row);
        visualTimers.delete(noteTimer);
      }, Math.max(0, (noteWhen - audioCtx.currentTime) * 1000));
      visualTimers.add(noteTimer);
    });
  }

  function scheduler(generation) {
    if (!isPlaying || generation !== scheduleGeneration) return;
    while (nextNoteTime < audioCtx.currentTime + .12) {
      scheduleStep(nextStep, nextNoteTime, generation, loopClockStep);
      loopClockStep += 1;
      nextNoteTime += stepDuration();
      nextStep += 1;
      if (nextStep >= playbackLength()) {
        if (loop) {
          nextStep = 0;
          scheduleVocal(nextNoteTime);
        } else {
          const remaining = Math.max(0, (nextNoteTime - audioCtx.currentTime) * 1000);
          endTimer = setTimeout(() => {
            stopPlayback();
            $('#play-status').textContent = '播放完成';
          }, remaining);
          return;
        }
      }
    }
  }

  async function startPlayback() {
    if (isPlaying) return;
    stopLibraryTrack();
    stopLoopPreview();
    try {
      await ensureAudio();
      if (micBlob && !micBuffer) {
        try { await prepareVocal(); } catch (_) { micBlob = null; showToast('人声音频读取失败，其余曲目仍可播放'); }
      }
      await Promise.all(memes.filter((meme) => meme.type === 'original').map((meme) => loadBuffer(meme.id).catch(() => null)));
      isPlaying = true;
      scheduleGeneration += 1;
      const generation = scheduleGeneration;
      currentStep = 0; nextStep = 0; loopClockStep = 0;
      nextNoteTime = audioCtx.currentTime + .07;
      currentStepStartedAt = nextNoteTime;
      if (recording) {
        recordingPosition = 0;
        recordingTargetStep = 0;
        recordingFrameAt = audioCtx.currentTime;
        recordingTriggeredIds.clear();
        recordingLoopStep = null;
      } else {
        scheduleVocal(nextNoteTime);
      }
      $('#playhead').classList.add('visible');
      updateTransport(); updatePlayhead();
      $('#play-status').textContent = recording ? `录制中：每按一次前进 1 步，不按则等待；Esc 收好` : '播放中，让抽象有序发生';
      if (!recording) {
        scheduler(generation);
        schedulerTimer = setInterval(() => scheduler(generation), 25);
      }
      cancelAnimationFrame(playheadFrame);
      playheadFrame = requestAnimationFrame(animatePlayhead);
      return true;
    } catch (_) {
      recording = false;
      window.MemeRecordStage.close();
      showToast('声音引擎启动失败，请检查浏览器音频权限');
      updateTransport();
      return false;
    }
  }

  function stopPlayback() {
    const wasRecording = recording || window.MemeRecordStage.isOpen();
    activePerformances.forEach((performance) => performance.live?.stop());
    activePerformances.clear();
    if (micRecording) stopMicrophone(true);
    stopLibraryTrack();
    stopLoopPreview();
    isPlaying = false; recording = false;
    scheduleGeneration += 1;
    clearInterval(schedulerTimer); clearTimeout(endTimer);
    cancelAnimationFrame(playheadFrame);
    schedulerTimer = null; endTimer = null; playheadFrame = null;
    activeSources.forEach((source) => { try { source.stop(); } catch (_) { /* already stopped */ } });
    activeSources.clear();
    visualTimers.forEach((timer) => clearTimeout(timer)); visualTimers.clear();
    $$('.playing,.pulse').forEach((el) => el.classList.remove('playing', 'pulse'));
    $('#equalizer').classList.remove('active');
    $('#playhead').classList.remove('visible');
    if (wasRecording) { window.MemeRecordStage.close(); saveState(); }
    updateTransport();
  }

  function updateMicState() {
    window.MemeRecordStage.setMicState(micRecording, Boolean(micBlob || micBuffer));
  }

  function openVocalDb() {
    if (vocalDbPromise) return vocalDbPromise;
    vocalDbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('meme-music-lab-audio', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('takes');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return vocalDbPromise;
  }

  async function saveVocalTake() {
    if (!micBlob) return;
    const db = await openVocalDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('takes', 'readwrite');
      transaction.objectStore('takes').put({ blob: micBlob, startStep: micStartStep }, 'vocal');
      transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error);
    });
  }

  async function restoreVocalTake() {
    try {
      const db = await openVocalDb();
      const saved = await new Promise((resolve, reject) => {
        const request = db.transaction('takes').objectStore('takes').get('vocal');
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      if (saved?.blob) { micBlob = saved.blob; micStartStep = Number(saved.startStep) || 0; }
    } catch (_) { /* recording still works without persistent storage */ }
  }

  async function clearVocalTake() {
    micBlob = null; micBuffer = null; micStartStep = 0;
    updateMicState();
    try {
      const db = await openVocalDb();
      await new Promise((resolve, reject) => {
        const transaction = db.transaction('takes', 'readwrite');
        transaction.objectStore('takes').delete('vocal');
        transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error);
      });
    } catch (_) { /* in-memory track is already cleared */ }
  }

  async function prepareVocal() {
    if (!micBlob || micBuffer) return;
    await ensureAudio();
    micBuffer = await audioCtx.decodeAudioData(await micBlob.arrayBuffer());
  }

  function scheduleVocal(when) {
    if (recording || !micBuffer) return;
    const source = trackSource(audioCtx.createBufferSource());
    source.buffer = micBuffer;
    source.connect(mixInput);
    const startAt = when + micStartStep * stepDuration();
    source.start(startAt);
    source.stop(startAt + micBuffer.duration + .05);
  }

  function noteTail(note) {
    const preset = note.reverbPreset || reverbPreset;
    return preset === 'none' ? 0 : reverbPresets[preset].seconds;
  }

  function beginRecordedPerformance(id, row, token) {
    if (!recording || !isPlaying || recordingFinishing || activePerformances.has(token)) return;
    const now = audioCtx.currentTime;
    const col = precise(playPosition());
    const note = { id: uid(), meme: id, row, col, length: .05, reverbPreset: null, reverbWet: null };
    notes = notes.filter((item) => !overlaps(row, col, .05, item));
    notes.push(note);
    const performance = { note, startTime: now, live: null };
    activePerformances.set(token, performance);
    recordingTriggeredIds.add(note.id);
    recordingTargetStep = Math.max(recordingTargetStep, col) + 1;
    hasRecordedInput = true;
    lastSoundEndAt = Number.isFinite(lastSoundEndAt) ? lastSoundEndAt : now;
    pendingLiveSounds += 1;
    startLiveSound(id, row, note).then((live) => {
      if (activePerformances.get(token) === performance) performance.live = live;
      else live.stop();
    }).catch(() => showToast('这个声音未能启动，请再试一次')).finally(() => { pendingLiveSounds -= 1; });
    flashMeme(id, row);
    renderRuler(); renderStaff();
  }

  function endRecordedPerformance(token) {
    const performance = activePerformances.get(token);
    if (!performance || !audioCtx) return;
    activePerformances.delete(token);
    const now = audioCtx.currentTime;
    performance.live?.stop();
    performance.note.length = precise(clamp((now - performance.startTime) / stepDuration(), .05, 3600));
    lastSoundEndAt = Math.max(Number.isFinite(lastSoundEndAt) ? lastSoundEndAt : 0, now + .17 + noteTail(performance.note));
    renderRuler(); renderStaff(); saveState();
  }

  async function toggleMicrophone() {
    if (micRecording) { await stopMicrophone(true); return; }
    try {
      await ensureAudio();
      micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      micChunks = [];
      micRecorder = new MediaRecorder(micStream);
      micRecorder.startStep = playPosition();
      micRecorder.addEventListener('dataavailable', (event) => { if (event.data.size) micChunks.push(event.data); });
      micRecorder.start(100);
      micRecording = true;
      hasRecordedInput = true;
      lastSoundEndAt = Number.POSITIVE_INFINITY;
      updateMicState();
      showToast('人声录制中，再次点击“停止人声”完成');
    } catch (_) {
      micStream?.getTracks().forEach((track) => track.stop());
      micStream = null; micRecorder = null; micRecording = false;
      updateMicState();
      showToast('无法使用麦克风，请检查浏览器权限');
    }
  }

  function stopMicrophone(save) {
    const recorder = micRecorder;
    if (!recorder || recorder.state === 'inactive') {
      micStream?.getTracks().forEach((track) => track.stop());
      micStream = null; micRecorder = null; micRecording = false; updateMicState();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      recorder.addEventListener('stop', async () => {
        const blob = new Blob(micChunks, { type: recorder.mimeType || 'audio/webm' });
        const startStep = recorder.startStep;
        micStream?.getTracks().forEach((track) => track.stop());
        micStream = null; micRecorder = null; micChunks = []; micRecording = false;
        if (save && blob.size) {
          micBlob = blob; micBuffer = null; micStartStep = startStep;
          try { await prepareVocal(); await saveVocalTake(); showToast('人声轨已保存，可随谱面播放'); }
          catch (_) { showToast('人声已录下，但浏览器未能保存音频'); }
        }
        lastSoundEndAt = (audioCtx?.currentTime || 0) + .35;
        updateMicState();
        resolve();
      }, { once: true });
      recorder.stop();
    });
  }

  async function finishRecording() {
    if ((!recording && !window.MemeRecordStage.isOpen()) || recordingFinishing) return;
    recordingFinishing = true;
    [...activePerformances.keys()].forEach(endRecordedPerformance);
    if (micRecording) await stopMicrophone(true);
    const finish = () => {
      stopPlayback();
      recordingFinishing = false;
      $('#play-status').textContent = '录制已停止，音符与人声已保存，可继续编辑';
      showToast('录制完成，随时可以继续寻找灵感');
    };
    if (audioCtx && master) {
      const now = audioCtx.currentTime;
      const volume = outputVolume / 100;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + .12);
      setTimeout(() => {
        finish();
        master.gain.setValueAtTime(volume, audioCtx.currentTime);
      }, 135);
    } else finish();
  }

  async function seekRecording(position) {
    if (!recording || recordingFinishing || !audioCtx) return;
    recordingFinishing = true;
    [...activePerformances.keys()].forEach(endRecordedPerformance);
    if (micRecording) await stopMicrophone(true);
    recordingPosition = Math.max(0, Number(position) || 0);
    recordingTargetStep = recordingPosition;
    currentStep = Math.floor(recordingPosition + .0001);
    recordingFrameAt = audioCtx.currentTime;
    recordingTriggeredIds.clear();
    recordingLoopStep = null;
    notes.forEach((note) => { if (note.col < recordingPosition - .0001) recordingTriggeredIds.add(note.id); });
    lastSoundEndAt = audioCtx.currentTime;
    recordingFinishing = false;
    updatePlayhead();
    $('#play-status').textContent = `已回到 ${recordingPosition.toFixed(2)} 步，从这里继续弹奏`;
  }

  async function startRecording() {
    stopPlayback();
    closeNoteFx();
    activePerformances.clear();
    hasRecordedInput = false;
    lastSoundEndAt = Number.POSITIVE_INFINITY;
    recordingFinishing = false;
    recording = true;
    $('#play-status').textContent = '正在准备采样，马上进入录制';
    const started = await startPlayback();
    if (!started || !recording) return;
    window.MemeRecordStage.open({
      memes: cartridges.flatMap((cartridge) => cartridge.items).filter((item) => item.type === 'original'), pitches,
      getNotes: () => notes,
      getSelected: () => selectedId,
      getMicState: () => ({ recording: micRecording, hasVocal: Boolean(micBlob || micBuffer) }),
      stepDuration,
      onSelect: selectMeme,
      onPerformStart: beginRecordedPerformance,
      onPerformEnd: endRecordedPerformance,
      onToggleMic: toggleMicrophone,
      onSeek: seekRecording,
      onStop: () => finishRecording()
    });
    updateMicState();
  }

  function updateTransport() {
    const libraryPlaying = Boolean(libraryAudio && !libraryAudio.paused);
    const play = $('#play-button');
    play.classList.toggle('playing', isPlaying || libraryPlaying);
    play.innerHTML = `${icon(isPlaying || libraryPlaying ? 'stop' : 'play')}<span>${libraryPlaying ? '停止整曲' : isPlaying ? '停止' : '播放'}</span>`;
    const record = $('#record-button');
    record.classList.toggle('recording', recording);
    record.innerHTML = `${icon('record')}<span>${recording ? '停止录制' : '边弹边录'}</span>`;
    record.setAttribute('aria-pressed', String(recording));
    const loopButton = $('#loop-button');
    loopButton.classList.toggle('active', loop);
    loopButton.setAttribute('aria-pressed', String(loop));
    loopButton.disabled = recording || libraryPlaying;
  }

  function togglePlay() {
    if (libraryAudio && !libraryAudio.paused) {
      stopPlayback();
      $('#play-status').textContent = '整曲已停止';
    } else if (isPlaying) {
      if (recording) { finishRecording(false); return; }
      stopPlayback();
      $('#play-status').textContent = '已暂停，再按播放从头开始';
    } else startPlayback();
  }

  function loadDemo() {
    stopPlayback();
    clearVocalTake();
    refreshScale(8, false);
    notes = demoPattern.map(([meme, row, col]) => ({ id: uid(), meme, row, col, length: 1 }));
    renderRuler(); renderStaff(); saveState();
    $('#play-status').textContent = '示例已就位，点播放听听看';
    showToast('已装入一首不太正经的示例');
  }

  function loadSong(id) {
    const song = musicData.getSong(id);
    if (!song) return;
    stopPlayback();
    clearVocalTake();
    refreshScale(song.pitchCount || 8, false);
    bpm = song.bpm || bpm;
    syncChoiceWheel('#bpm-wheel', bpm);
    notes = song.events.map((event) => {
      if (!Array.isArray(event)) return { ...event, id: uid() };
      const [degree, col, length, midi] = event;
      return { id: uid(), meme: song.instrument, row: 7 - degree, col, length, midi };
    });
    loopEnabled = false;
    updateLoopUI();
    selectMeme(song.instrument);
    renderRuler(); renderStaff(); saveState();
    $('#play-status').textContent = `正在播放《${song.title}》· ${notes.length} 个多轨合成音符`;
    showToast(`《${song.title}》已载入旋律与伴奏，停止后仍可自由编辑`);
    startPlayback();
  }

  const padDrums = [
    { kind: 'drum', source: 'drum:kick', title: '底鼓', sub: 'KICK · 低频', symbol: 'KICK', color: '#efabc2' },
    { kind: 'drum', source: 'drum:snare', title: '军鼓', sub: 'SNARE · 脆响', symbol: 'SNARE', color: '#91cfe8' },
    { kind: 'drum', source: 'drum:hat', title: '踩镲', sub: 'HAT · 颗粒', symbol: 'HAT', color: '#d9ef68' },
    { kind: 'drum', source: 'drum:clap', title: '拍手', sub: 'CLAP · 节拍', symbol: 'CLAP', color: '#f2d468' }
  ];
  const padLoopNames = { sunny: '柑橘跳跳糖', bounce: '像素弹跳', chill: '夜空气泡', off: '无底奏' };
  let padBackingTimer = null;
  let padBackingId = null;
  let padBackingStep = 0;
  let padBackingNextTime = 0;
  let padBackingGeneration = 0;

  function padSourceInfo(kind, source) {
    if (kind === 'drum') return padDrums.find((item) => item.source === source) || padDrums[0];
    const item = sourceInfo(source);
    return { ...item, kind, source, title: item.title, sub: item.sub, color: item.color || '#d9ef68' };
  }

  function padSourceUnlocked(kind, source) {
    if (kind === 'drum') return true;
    const index = cartridges.findIndex((cartridge) => cartridge.items.some((item) => item.id === source));
    return index < 0 || isCartridgeUnlocked(index);
  }

  function nearestPitchRow(midi) {
    return pitches.reduce((best, pitch, index) => Math.abs(pitch.midi - midi) < Math.abs(pitches[best].midi - midi) ? index : best, 0);
  }

  function padStepDuration() { return 60 / 116 / 4; }

  function padDrumSound(kind, when, volume = 1, backing = false) {
    const type = kind.replace('drum:', '');
    withSoundBus({ loopVolume: volume, reverbPreset: 'none', padBus: true, backing }, when, .45, () => {
      if (type === 'kick') {
        tone('sine', 168, when, .34, .95, 42);
        tone('triangle', 78, when, .16, .3, 44);
        tone('square', 320, when, .02, .07, 140);
        noise(when, .03, 3000, .06);
      } else if (type === 'snare') {
        noise(when, .19, 1900, .5);
        tone('triangle', 195, when, .12, .24, 108);
        noise(when + .012, .06, 4200, .12);
      } else if (type === 'hat' || type === 'openhat') {
        noise(when, type === 'openhat' ? .2 : .07, 7900, .22);
        noise(when, type === 'openhat' ? .14 : .03, 10800, .1);
      } else {
        [0, .018, .038].forEach((offset, index) => noise(when + offset, .11 - index * .014, 1450 + index * 420, .24));
      }
    });
  }

  function padInstrumentTone(instrument, midi, when, length, volume, backing = false) {
    const row = nearestPitchRow(midi);
    const stepLength = padStepDuration();
    withSoundBus({ loopVolume: volume, reverbPreset: 'none', padBus: true, backing }, when, length * stepLength, () => {
      instrumentSound(`instrument:${instrument}`, row, when, false, { midi, length, stepLength });
    });
  }

  function emitPadBeat(step, when, id, flags) {
    const delay = Math.max(0, (when - audioCtx.currentTime) * 1000);
    setTimeout(() => {
      if (padBackingId !== id) return;
      window.dispatchEvent(new CustomEvent('meme-pad-beat', {
        detail: { step, position: step % 16, id, duration: padStepDuration(), ...flags }
      }));
    }, delay);
  }

  function schedulePadBackingStep(step, when, id) {
    const position = step % 16;
    const bar = Math.floor(step / 16) % 4;
    const chords = [[60, 64, 67], [57, 60, 64], [57, 60, 65], [59, 62, 67]];
    const roots = [36, 33, 29, 31];
    // 116 BPM 十六分网格：四踩底鼓 + 反拍军鼓 + 切分贝斯，四小节一循环，第 4 小节带过门。
    const fill = bar === 3 && position >= 13;
    const kickPositions = id === 'chill' ? [0, 8, 11] : id === 'bounce' ? [0, 4, 6, 8, 12, 14] : [0, 4, 8, 10, 12];
    const snarePositions = id === 'chill' ? [8, 15] : [4, 12];
    const bassPositions = id === 'sunny' ? [0, 3, 6, 8, 10, 14] : id === 'bounce' ? [0, 3, 6, 8, 11, 14] : [0, 8, 14];
    const chordPositions = id === 'sunny' ? [2, 7, 10, 15] : id === 'bounce' ? [2, 6, 10, 14] : [0];
    const hatEvery = id === 'chill' ? 4 : 2;
    const kick = kickPositions.includes(position);
    const snare = snarePositions.includes(position) || fill;
    const hat = position % hatEvery === 0;
    const bass = bassPositions.includes(position);
    const chord = chordPositions.includes(position);
    emitPadBeat(step, when, id, { kick, snare, hat, bass, chord, bar });

    const vel = id === 'chill' ? .72 : 1;
    if (kick) {
      padDrumSound('drum:kick', when, (position === 0 ? .95 : .85) * vel, true);
      if (id === 'bounce' && position % 8 === 6) padDrumSound('drum:kick', when + .012, .5, true);
    }
    if (snare) padDrumSound('drum:snare', when, (fill ? .6 : .82) * vel, true);
    if (position % 4 === 0 && id !== 'chill') padDrumSound('drum:clap', when + .006, .5 * vel, true);
    if (hat) {
      const open = position === 14 && id !== 'chill';
      const hatVolume = (position % 4 === 2 ? .42 : .3) * (id === 'chill' ? .72 : 1);
      padDrumSound(open ? 'drum:openhat' : 'drum:hat', when, hatVolume, true);
    }
    if (bass) {
      const octave = [6, 14].includes(position) && id !== 'chill' ? 12 : 0;
      padInstrumentTone('bass', roots[bar] + octave, when, position === 0 ? 2.4 : 1.2, .55 * vel, true);
    }
    if (chord) {
      const instrument = id === 'chill' ? 'pad' : id === 'bounce' ? 'synth' : 'piano';
      const length = id === 'chill' ? 13.5 : position === 7 ? 1.5 : .9;
      chords[bar].forEach((midi) => padInstrumentTone(instrument, midi, when, length, (id === 'chill' ? .2 : .3) * vel, true));
    }
    if (id === 'sunny' && bar % 2 === 1 && [6, 14].includes(position)) padInstrumentTone('marimba', chords[bar][2] + 12, when, 1.4, .16, true);
    if (id === 'chill' && position === 10) padInstrumentTone('harp', chords[bar][1] + 12, when, 2.2, .12, true);
    if (fill) padDrumSound('drum:hat', when + .03, .3, true);
  }

  function runPadBackingScheduler() {
    if (!audioCtx || !padBackingId) return;
    while (padBackingNextTime < audioCtx.currentTime + .12) {
      schedulePadBackingStep(padBackingStep, padBackingNextTime, padBackingId);
      padBackingStep = (padBackingStep + 1) % 64;
      padBackingNextTime += padStepDuration();
    }
  }

  function clearPadBacking() {
    clearInterval(padBackingTimer);
    padBackingTimer = null;
    padBackingId = null;
  }

  async function setPadBacking(enabled, id) {
    const generation = ++padBackingGeneration;
    if (!enabled || id === 'off') { clearPadBacking(); return; }
    try {
      await ensureAudio();
      if (generation !== padBackingGeneration) return;
      if (padBackingId === id && padBackingTimer) return;
      clearPadBacking();
      padBackingId = id;
      padBackingStep = 0;
      padBackingNextTime = audioCtx.currentTime + .06;
      runPadBackingScheduler();
      padBackingTimer = setInterval(runPadBackingScheduler, 25);
    } catch (_) {
      showToast('底奏暂时无法启动，请再敲一下');
    }
  }

  async function hitPadSource(slot) {
    try {
      await ensureAudio();
      const now = audioCtx.currentTime;
      if (slot.kind === 'drum') {
        const volumes = { 'drum:kick': .62, 'drum:snare': .55, 'drum:hat': .3, 'drum:clap': .45 };
        padDrumSound(slot.source, now + .005, volumes[slot.source] || .45);
        return;
      }
      // 采样还没解码好时，先给一声即时的合成打击，保证"敲下去就有反应"。
      if (slot.kind === 'sample' && !buffers[slot.source]) {
        padDrumSound('drum:hat', now + .005, .55);
        loadBuffer(slot.source).catch(() => { /* 仍会退回合成音色 */ });
        return;
      }
      const note = { midi: slot.midi, length: 2, reverbPreset: 'none', padBus: true, padHit: true };
      triggerSound(slot.source, nearestPitchRow(slot.midi), now + .005, false, note);
      flashMeme(slot.source, nearestPitchRow(slot.midi));
    } catch (_) {
      showToast('声音还没有准备好，请再敲一下');
    }
  }

  function initPadStage() {
    if (!window.MemePadStage) return;
    const samples = memes.map((meme) => ({ kind: 'sample', source: meme.id, title: meme.title, sub: meme.sub, image: meme.image, color: meme.color }));
    const instrumentNotes = musicData.instruments.map((instrument) => ({ kind: 'note', source: `instrument:${instrument.id}`, title: instrument.title, sub: instrument.description, symbol: instrument.symbol, color: instrument.color }));
    window.MemePadStage.init({
      library: { sample: samples, note: instrumentNotes, drum: padDrums },
      sourceInfo: padSourceInfo,
      isUnlocked: padSourceUnlocked,
      hit: hitPadSource,
      setBacking: setPadBacking,
      currentBacking: () => padBackingId,
      loopName: (id) => padLoopNames[id] || padLoopNames.sunny,
      toast: showToast
    });
  }

  function bindControls() {
    $('#play-button').addEventListener('click', togglePlay);
    $('#record-button').addEventListener('click', () => recording ? finishRecording() : startRecording());
    $('#loop-button').addEventListener('click', () => { loop = !loop; saveState(); updateTransport(); showToast(loop ? '循环播放已开启' : '循环播放已关闭'); });
    bindChoiceWheel('#bpm-wheel', () => bpm, (value) => {
      const next = Number(value);
      if (next === bpm) return;
      bpm = next; saveState();
      $('#play-status').textContent = `速度已调整为 ${bpm} BPM`;
    });
    bindChoiceWheel('#volume-wheel', () => outputVolume, (value) => {
      const next = Number(value);
      if (next === outputVolume) return;
      outputVolume = next;
      if (audioCtx && master) master.gain.setTargetAtTime(outputVolume / 100, audioCtx.currentTime, .015);
      saveState(); $('#play-status').textContent = `音量 ${outputVolume}%`;
    });
    bindChoiceWheel('#scale-wheel', () => pitchCount, (value) => {
      if (Number(value) !== pitchCount) refreshScale(Number(value));
    });
    bindChoiceWheel('#reverb-wheel', () => reverbPreset, async (value) => {
      if (value === reverbPreset) return;
      reverbPreset = value;
      reverbWet = Math.round(reverbPresets[reverbPreset].wet * 10) / 10;
      await ensureAudio(); applyReverb(); saveState();
      const names = { none: '无混响', room: '小房间', hall: '大厅', church: '教堂', plate: '金属板' };
      showToast(`混响预设：${names[reverbPreset]}`);
    });
    bindChoiceWheel('#reverb-wet-wheel', () => reverbWet, async (value) => {
      const wet = Number(value);
      if (wet === reverbWet) return;
      reverbWet = clamp(wet, 0, .7);
      await ensureAudio(); applyReverb(); saveState();
      $('#play-status').textContent = `全局湿声 ${Math.round(reverbWet * 100)}%`;
    });
    bindChoiceWheel('#note-fx-preset-wheel', () => notes.find((item) => item.id === selectedNoteId)?.reverbPreset || 'inherit', (value) => {
      const note = notes.find((item) => item.id === selectedNoteId);
      if (!note || value === (note.reverbPreset || 'inherit')) return;
      note.reverbPreset = value === 'inherit' ? null : value;
      note.reverbWet = value === 'inherit' ? null : value === 'none' ? 0 : Math.round(reverbPresets[value].wet * 10) / 10;
      saveState(); syncNoteFx();
      const names = { inherit: '跟随全局', none: '无混响', room: '小房间', hall: '大厅', church: '教堂', plate: '金属板' };
      showToast(`音符混响：${names[value]}`);
    });
    bindChoiceWheel('#note-fx-wet-wheel', () => {
      const note = notes.find((item) => item.id === selectedNoteId);
      const wet = note?.reverbPreset ? (note.reverbWet ?? reverbPresets[note.reverbPreset].wet) : reverbWet;
      return Math.round(wet * 10) / 10;
    }, (value) => {
      const note = notes.find((item) => item.id === selectedNoteId);
      if (!note?.reverbPreset || note.reverbPreset === 'none') return;
      note.reverbWet = clamp(Number(value), 0, .7);
      saveState(); syncNoteFx();
    });
    $('#note-fx-delete').addEventListener('click', () => { if (selectedNoteId) removeNoteById(selectedNoteId); });
    ['pointerdown', 'wheel', 'keydown'].forEach((type) => $('#note-fx').addEventListener(type, wakeNoteFx, { passive: true }));
    $('#clear-button').addEventListener('click', () => {
      if (!notes.length && !micBlob && !micBuffer) { showToast('谱面已经是空的'); return; }
      stopPlayback(); clearVocalTake(); notes = []; renderRuler(); renderStaff(); saveState();
      $('#play-status').textContent = '谱面与人声已清空，放一颗音符开始吧';
      showToast('已清空线谱与人声');
    });
    $('#demo-button').addEventListener('click', loadDemo);
    $('#loop-range-all').addEventListener('click', () => {
      $('#loop-range-start').value = 0;
      $('#loop-range-end').value = Math.max(1, precise(noteEnd() || 16));
      updateLoopRangeSummary();
    });
    ['#loop-range-start', '#loop-range-end'].forEach((id) => $(id).addEventListener('input', updateLoopRangeSummary));
    $('#loop-merge').addEventListener('click', mergeLoopClip);
    bindChoiceWheel('#loop-volume-wheel', () => loopVolume, (value) => {
      loopVolume = Number(value);
      saveState(); syncChoiceWheel('#loop-volume-wheel', loopVolume);
      $('#loop-clip-status').textContent = `音量 ${loopVolume}%${loopClip ? ` · ${formatLength(loopClip.duration)} 步` : ''}`;
    });
    bindChoiceWheel('#loop-reverb-wheel', () => loopReverbPreset, (value) => {
      if (value === loopReverbPreset) return;
      loopReverbPreset = value;
      saveState(); updateLoopUI();
      const names = { none: '无混响', room: '小房间', hall: '大厅', church: '教堂', plate: '金属板' };
      showToast(`底奏混响：${names[value]}`);
    });
    bindChoiceWheel('#loop-wet-wheel', () => loopReverbWet, (value) => {
      if (loopReverbPreset === 'none') return;
      loopReverbWet = clamp(Number(value), 0, .7);
      saveState(); syncChoiceWheel('#loop-wet-wheel', loopReverbWet);
      $('#loop-clip-status').textContent = `底奏湿声 ${Math.round(loopReverbWet * 100)}%`;
    });
    $('#loop-preview').addEventListener('click', previewLoop);
    $('#loop-toggle').addEventListener('click', () => {
      loopEnabled = !loopEnabled;
      saveState(); updateLoopUI();
      showToast(loopEnabled ? '循环底奏已开启，将随线谱独立循环' : '循环底奏已关闭');
    });
    $('#follow-task').addEventListener('click', () => {
      followedAuthor = !followedAuthor;
      if (!followedAuthor && !isCartridgeUnlocked(cartridgeIndex)) setCartridge(0);
      saveState(); renderBackpack();
      showToast(followedAuthor ? 'Demo 已标记关注，哈基米 01 已解锁' : 'Demo 已取消关注，任务奖励卡带暂时锁定');
    });
    $('#share-task').addEventListener('click', () => completeShareTask('share'));
    $('#repost-task').addEventListener('click', () => completeShareTask('repost'));
    window.addEventListener('focus', renderBackpack);

    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || $('dialog[open]')) return;
      if (event.key === 'Escape' && recording) { event.preventDefault(); finishRecording(); return; }
      if (event.key === 'Escape' && selectedNoteId) { event.preventDefault(); closeNoteFx(); return; }
      if (/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      if (event.code === 'Space') { event.preventDefault(); togglePlay(); return; }
      const meme = memes.find((item) => item.key.toLowerCase() === event.key.toLowerCase());
      if (meme) {
        event.preventDefault();
        if (selectMeme(meme.id) === false) return;
        if (!recording) previewMeme(meme.id, defaultRow());
        return;
      }
      if (pitchCount <= 8 && /^[1-8]$/.test(event.key) && Number(event.key) <= pitchCount) {
        event.preventDefault(); performMeme(selectedId, pitchCount - Number(event.key), true);
      }
    });
    window.addEventListener('resize', () => { updatePlayhead(); positionNoteFx(); });
    window.addEventListener('scroll', positionNoteFx, { passive: true });
    $('#staff-scroll').addEventListener('scroll', positionNoteFx, { passive: true });
  }

  function bindDialogs() {
    const help = $('#help-dialog');
    const credits = $('#credits-dialog');
    $('#help-button').addEventListener('click', () => help.showModal());
    $('#credits-button').addEventListener('click', () => credits.showModal());
    $$('.dialog-close').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
    [help, credits].forEach((dialog) => dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }));
  }

  loadState();
  renderMemeCards();
  bindCartridgeWheel();
  renderCredits();
  renderSongs();
  renderLoopLab();
  renderBackpack();
  refreshScale(pitchCount, false);
  applyReverb();
  bindStaff();
  bindControls();
  bindDialogs();
  initPadStage();
  preloadPadSamples();
  updateTransport();
  restoreVocalTake();
})();
