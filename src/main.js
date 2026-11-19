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
    {
      id: 'bingbingbing', title: '冰冰冰', sub: '10.7 亿个冰冰冰', key: 'I', type: 'original', image: './assets/bingbingbing.svg', audio: './assets/bingbingbing.mp3', color: 'var(--p-blue)',
      origin: '使用你提供的“10.7 亿个冰冰冰”视频音轨裁剪采样；图像为本项目绘制的本地原创冰块小人。',
      sourceLabel: '我的裁剪 · 用户提供素材', soundSource: '', imageSource: './assets/bingbingbing.svg', originSource: ''
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
  // 打击垫上用的透明抠图（原始素材保留给线谱/图鉴等需要完整画面的地方）。
  const padCutouts = {
    doro: './assets/cut/doro.png',
    maodie: './assets/cut/maodie.png',
    chicken: './assets/cut/chicken.svg',
    oiia: './assets/cut/oiia.png',
    dog: './assets/cut/dog.png',
    nailong: './assets/nailong.gif'
  };
  memes.forEach((meme) => {
    meme.padImage = padCutouts[meme.id]
      || (meme.id.startsWith('hachimi-') ? './assets/cut/hachimi.svg'
        : meme.id.startsWith('dog') ? './assets/cut/dog.png'
          : meme.id.startsWith('maodie') ? './assets/cut/maodie.png'
            : meme.id.startsWith('chicken') ? './assets/cut/chicken.svg'
              : meme.image);
  });
  const instrumentItems = (ids) => ids.map((id) => ({
    ...musicData.getInstrument(id), id: `instrument:${id}`, sub: '合成乐器', type: 'instrument'
  }));
  const memeItems = (ids) => ids.map((id) => memes.find((meme) => meme.id === id));
  const cartridges = [
    { name: '抽象梗采样', items: memeItems(['doro', 'maodie', 'maodie-2', 'chicken', 'chicken-2', 'oiia', 'nailong', 'dog', 'bingbingbing']) },
    { name: '大狗叫逐音', items: memeItems(['dog-1', 'dog-2', 'dog-3', 'dog-4']) },
    { name: '哈基米逐音 01', items: memeItems(['hachimi-ha', 'hachimi-ji', 'hachimi-mi', 'hachimi-nan', 'hachimi-bei', 'hachimi-lv', 'hachimi-dou', 'hachimi-8']) },
    { name: '哈基米逐音 02', items: memeItems(['hachimi-9', 'hachimi-10', 'hachimi-11', 'hachimi-12']) },
    // 参照 ACE Studio 的音源分类重排：弦乐组 / 铜管木管 / 键盘合成 / 吉他与拨弦 / 鼓组贝斯
    { name: '弦乐组 · ACE 标准', items: instrumentItems(['violin', 'cello', 'stringsHigh', 'stringsMid', 'stringsLow', 'stringsPizz', 'contrabass']) },
    { name: '铜管与木管 · ACE 标准', items: instrumentItems(['trumpet', 'trombone', 'horn', 'brassSection', 'sax', 'saxTenor', 'clarinet', 'flute', 'dizi']) },
    { name: '键盘与合成 · 流行', items: instrumentItems(['piano', 'grandPiano', 'uprightPiano', 'electricPiano', 'clavinet', 'organ', 'synth', 'synthLead', 'synthPluck', 'synthBell', 'pad']) },
    { name: '吉他与拨弦', items: instrumentItems(['guitar', 'guitarElectric', 'ukulele', 'harp', 'marimba', '8bit']) },
    { name: '鼓组与贝斯', items: instrumentItems(['drumkit', 'bass', 'subBass']) }
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

  const storageKey = 'meme-music-lab-v2';
try { localStorage.removeItem('meme-music-lab-v1'); } catch (_) { /* clear old demo state */ }
  let notes = [];
  let selectedId = 'doro';
  let selectedNoteId = null;
  let projectMixer = null;
  let lowShelf = null;
  let highShelf = null;
  let masterHPF = null;
  let lowBoost = 0;
  let reverbSendBuses = new Map();
  let noteReverbConvolvers = new Map();
  let reverbDecayScale = 1;
  let reverbPreDelaySec = .02;
  let reverbDamping = 6000;
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
  let padBackingTonalInput = null;
  let padDuckSC = null;
  let padDuckUser = null;
  let padBackingFilter = null;
  let padDelay = null;
  let padDelaySend = null;
  let padDelayTone = null;
  let padDelayFb = null;
  let padDelayWet = null;
  let padLimiter = null;
  let padOpenHatVoice = null;
  let padBeatTiming = null;
  let padCombo = 0;
  const padHeldSamples = new Map();
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
      loopTapes = Array.isArray(saved.loopTapes) ? saved.loopTapes.filter((tape) => tape && Number.isInteger(Number(tape.lane)) && Number(tape.lane) >= 0 && Number(tape.lane) < 3 && Number(tape.length) > 0 && Array.isArray(tape.items) && tape.items.length).map((tape) => ({
        id: String(tape.id || `tape-${uid()}`),
        name: String(tape.name || '卡带'),
        lane: Number(tape.lane),
        col: Math.max(0, Number(tape.col) || 0),
        length: clamp(Number(tape.length), .05, 4096),
        items: tape.items.filter((note) => note && validSource(note.meme) && Number(note.row) >= 0 && Number(note.row) < 88 && Number(note.col) >= 0 && Number(note.length) > 0).map((note) => ({
          meme: note.meme, row: Number(note.row), col: Number(note.col), length: clamp(Number(note.length), .05, 4096),
          ...(Number.isFinite(Number(note.midi)) ? { midi: Number(note.midi) } : {})
        }))
      })) : [];
      followedAuthor = saved.followedAuthor === true;
      rewardClaims = { share: saved.rewardClaims?.share || '', repost: saved.rewardClaims?.repost || '' };
    } else {
      notes = demoPattern.map(([meme, row, col]) => ({ id: uid(), meme, row, col, length: 1 }));
    }
  }

  function saveState() {
    try { localStorage.setItem(storageKey, JSON.stringify({ notes, bpm, volume: outputVolume, loop, selectedId, pitchCount, reverbPreset, reverbWet, loopTapes, followedAuthor, rewardClaims })); } catch (_) { /* private mode */ }
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
    const creditLink = (href, label) => (/^https?:/i.test(String(href || ''))
      ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`
      : `<span class="credit-local">${label} · 本地素材</span>`);
    $('#credits-list').innerHTML = memes.map((meme) => `
      <div class="credit-item"><strong>${meme.title} · ${meme.sub}</strong><p>${meme.origin}</p>
      <p>${creditLink(meme.originSource, '梗来源')}　${creditLink(meme.imageSource, '图像来源')}　${creditLink(meme.soundSource, meme.type === 'original' ? '音频来源' : '原声出处说明')}</p></div>`).join('');
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
    // 线谱一格是 8 分音符：8 格 = 1 小节（之前按 4 格算，所有工程的小节数都显示成两倍）
    $('#ruler').innerHTML = '<span></span>' + Array.from({ length }, (_, col) => `<span class="ruler-label${col % 8 === 0 ? ' bar-start' : ''}" data-ruler="${col}">${col % 8 === 0 ? col / 8 + 1 : '·'}</span>`).join('');
    $('.sequencer-heading .tiny-label').textContent = `${Math.ceil(length / 8)} BARS · FREE TIMING`;
  }

  const cartridgeRewards = [
    { type: 'free', cover: './assets/oiia.webp', symbol: '', colors: ['#d9ef68', '#91cfe8'] },
    { type: 'free', cover: './assets/dog.png', symbol: '', colors: ['#f2d468', '#efabc2'] },
    { type: 'follow', cover: './assets/hachimi.svg', symbol: '', colors: ['#c7b4e6', '#91cfe8'] },
    { type: 'share', cover: './assets/hachimi.svg', symbol: '', colors: ['#efabc2', '#f2d468'] },
    { type: 'free', cover: '', symbol: '𝄞', colors: ['#efabc2', '#c7b4e6'] },
    { type: 'free', cover: '', symbol: '♯', colors: ['#f2c365', '#e6a987'] },
    { type: 'follow', cover: '', symbol: '⌨', colors: ['#91cfe8', '#c7b4e6'] },
    { type: 'repost', cover: '', symbol: '♪', colors: ['#b9dcae', '#d9ef68'] },
    { type: 'free', cover: '', symbol: '▣', colors: ['#e9a56f', '#efabc2'] }
  ];
  const rewardNames = { follow: '关注作者', share: '今日分享', repost: '今日转发' };
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

  // ── loop 底奏卡带：点左侧音阶名选中轨道 → 合成卡带 → 摆到下方 3 条卡带轨 ──
  const TAPE_LANES = 3;
  let loopTapes = [];
  const selectedRows = new Set();
  let tapeDrag = null;
  let tapeSeq = 0;

  function selectedRowsList() { return [...selectedRows]; }

  function toggleRowSelection(row) {
    if (!Number.isInteger(row) || row < 0 || row >= pitchCount) return;
    if (selectedRows.has(row)) selectedRows.delete(row); else selectedRows.add(row);
    $$('#staff-grid .pitch-label').forEach((label) => label.classList.toggle('selected', selectedRows.has(Number(label.dataset.row))));
    const button = $('#make-tape');
    if (button) button.disabled = selectedRows.size === 0;
    updateTapeHint();
  }

  function updateTapeHint() {
    const hint = $('#tape-hint');
    if (!hint) return;
    if (selectedRows.size) hint.textContent = `已选 ${selectedRows.size} 条轨道，点「合成卡带」`;
    else if (loopTapes.length) hint.textContent = `下方 ${loopTapes.length} 条底奏卡带，按住拖动可换位置`;
    else hint.textContent = '点左侧音阶名选中轨道，再合成 loop 底奏卡带';
  }

  function makeTape() {
    const rows = selectedRowsList();
    if (!rows.length) { showToast('先点左侧音阶名，选中要合成的轨道'); return; }
    const sheetNotes = notes.filter((note) => rows.includes(note.row));
    if (!sheetNotes.length) { showToast('选中的轨道上还没有音符'); return; }
    const start = Math.min(...sheetNotes.map((note) => note.col));
    const end = Math.max(...sheetNotes.map((note) => note.col + note.length));
    const length = precise(Math.max(1, end - start));
    const items = sheetNotes.map((note) => ({
      meme: note.meme,
      row: note.row,
      col: precise(note.col - start),
      length: precise(Math.max(.05, note.length)),
      ...(Number.isFinite(Number(note.midi)) ? { midi: Number(note.midi) } : {})
    })).sort((a, b) => a.col - b.col);
    const counts = [0, 1, 2].map((lane) => loopTapes.filter((tape) => tape.lane === lane).length);
    const lane = counts.indexOf(Math.min(...counts));
    tapeSeq += 1;
    const tape = {
      id: `tape-${Date.now()}-${tapeSeq}`,
      name: `卡带 ${loopTapes.length + 1}`,
      lane,
      col: 0,
      length,
      items
    };
    loopTapes.push(tape);
    saveState();
    renderTapeStrip();
    showToast(`已把 ${rows.length} 条轨道合成「${tape.name}」，拖到下方卡带轨摆放`);
  }

  function removeTape(id) {
    loopTapes = loopTapes.filter((tape) => tape.id !== id);
    saveState();
    renderTapeStrip();
  }

  function renderTapeStrip() {
    const inner = $('#tape-inner');
    if (!inner) return;
    const length = Math.max(1, timelineLength());
    inner.innerHTML = Array.from({ length: TAPE_LANES }, (_, lane) => {
      const blocks = loopTapes.filter((tape) => tape.lane === lane).map((tape) => {
        const left = (tape.col / length) * 100;
        const width = Math.max(2, (tape.length / length) * 100);
        return `<div class="tape-block" data-id="${tape.id}" style="left:${left}%;width:${width}%">
          <span class="tape-block-name">${tape.name}</span><span class="tape-block-meta">${tape.items.length} 音</span>
          <button class="tape-remove" type="button" data-id="${tape.id}" aria-label="移除 ${tape.name}">×</button></div>`;
      }).join('');
      return `<div class="tape-lane" data-lane="${lane}"><span class="tape-lane-label">LOOP<br>${lane + 1}</span><div class="tape-track" data-lane="${lane}" data-length="${length}" style="--tape-steps:${length}">${blocks}</div></div>`;
    }).join('');
    $$('#tape-inner .tape-block').forEach((block) => block.addEventListener('pointerdown', (event) => {
      if (event.target.closest('.tape-remove')) return;
      beginTapeDrag(event, block);
    }));
    $$('#tape-inner .tape-remove').forEach((button) => button.addEventListener('click', (event) => {
      event.stopPropagation();
      removeTape(button.dataset.id);
    }));
    syncTapeScroll();
    const button = $('#make-tape');
    if (button) button.disabled = selectedRows.size === 0;
    updateTapeHint();
  }

  function syncTapeScroll() {
    const scroller = $('#staff-scroll');
    const inner = $('#tape-inner');
    const canvas = $('#staff-canvas');
    if (!scroller || !inner || !canvas) return;
    inner.style.width = `${Math.max(canvas.scrollWidth, scroller.clientWidth)}px`;
    inner.style.transform = `translateX(${-scroller.scrollLeft}px)`;
  }

  function beginTapeDrag(event, block) {
    const tape = loopTapes.find((item) => item.id === block.dataset.id);
    const track = block.closest('.tape-track');
    if (!tape || !track) return;
    const rect = track.getBoundingClientRect();
    const perStep = rect.width / Math.max(1, Number(track.dataset.length));
    tapeDrag = { tape, block, startX: event.clientX, startCol: tape.col, perStep, moved: false };
    block.classList.add('dragging');
    const onMove = (moveEvent) => {
      if (!tapeDrag) return;
      const deltaCol = Math.round((moveEvent.clientX - tapeDrag.startX) / tapeDrag.perStep * 4) / 4;
      const maxCol = Math.max(0, Number(track.dataset.length) - tape.length);
      tape.col = clamp(tapeDrag.startCol + deltaCol, 0, maxCol);
      const laneIndex = $$('#tape-inner .tape-lane').findIndex((laneEl) => {
        const box = laneEl.getBoundingClientRect();
        return moveEvent.clientY >= box.top && moveEvent.clientY <= box.bottom;
      });
      if (laneIndex >= 0) tape.lane = laneIndex;
      const length = Math.max(1, timelineLength());
      block.style.left = `${(tape.col / length) * 100}%`;
      tapeDrag.moved = true;
    };
    const onUp = () => {
      if (!tapeDrag) return;
      block.classList.remove('dragging');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (tapeDrag.moved) { saveState(); renderTapeStrip(); }
      tapeDrag = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    event.preventDefault();
  }

  // 卡带和线谱音符一样按“步”播放：播放头进入卡带块时，把块内音符按偏移排出去。
  function triggerTapeStep(step, when) {
    if (!audioCtx || !loopTapes.length) return;
    loopTapes.forEach((tape) => {
      if (!(tape.col >= step && tape.col < step + 1)) return;
      const blockOffset = (tape.col - step) * stepDuration();
      tape.items.forEach((note) => {
        const noteWhen = when + blockOffset + note.col * stepDuration();
        if (noteWhen < audioCtx.currentTime - .06) return;
        triggerSound(note.meme, note.row, noteWhen, false, { ...note, loopVolume: 1, reverbPreset: 'none' }, false);
      });
    });
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
    const card = (dataset, cover, title) => `<button class="work-card" type="button" ${dataset}><span class="work-cover"><img src="${cover}" alt="${title} 封面"></span><strong class="work-name">${title}</strong></button>`;
    const demos = musicData.songs.map((song) => card(`data-song="${song.id}"`, song.cover || './assets/doro.webp', song.shortTitle || song.title)).join('');
    const projects = (musicData.synthProjects || []).map((project) => card(`data-project="${project.id}"`, project.cover || './assets/dog.png', project.shortTitle || project.title)).join('');
    $('#song-grid').innerHTML = demos + projects;
    $$('[data-song]').forEach((button) => button.addEventListener('click', () => {
      loadSong(button.dataset.song);
      location.hash = '#/studio';
    }));
    $$('[data-project]').forEach((button) => button.addEventListener('click', () => {
      const project = (musicData.synthProjects || []).find((item) => item.id === button.dataset.project);
      location.hash = '#/studio';
      if (project) loadSynthProject(project.url);
    }));
  }

  // ACE 分轨工程包 → 网页多轨合成器工程：每条轨的 aceKind 映射到预设，音符平铺进线谱。
  const ACE_KIND_PRESET = {
    鼓组: 'drumkit', drums: 'drumkit',
    贝斯: 'subBass', bass: 'subBass',
    钢琴: 'grandPiano', piano: 'grandPiano',
    吉他: 'guitarElectric', guitar: 'guitarElectric',
    其他: 'pad', others: 'pad',
    旋律: 'synthLead', lead: 'synthLead', vocal: 'synthLead'
  };

  // ACE 工程分轨混音：每轨一个音量滑块 + 静音，直接改音符的总线音量。
  function applyProjectMix() {
    if (!projectMixer) return;
    projectMixer.forEach((track) => {
      const meme = `instrument:${track.preset}`;
      notes.forEach((note) => {
        if (note.meme !== meme) return;
        note.loopVolume = track.mute ? 0 : Math.min(1.4, track.gain);
      });
    });
    saveState();
  }

  function applyLowBoost() {
    if (lowShelf && audioCtx) lowShelf.gain.setTargetAtTime(lowBoost, audioCtx.currentTime, .05);
  }

  function renderProjectMixer() {
    const host = $('#project-mixer');
    if (!host) return;
    if (!projectMixer || !projectMixer.length) { host.hidden = true; host.innerHTML = ''; return; }
    host.hidden = false;
    host.innerHTML = `<div class="mixer-title"><span>工程分轨混音 · 低音轻就拉高贝斯，觉得哪轨怪就静音</span><span style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-weight:700"><button class="mixer-mute" id="mix-low-boost" type="button" aria-pressed="${lowBoost > 0}">${lowBoost > 0 ? `低音增强 +${lowBoost}dB` : '低音增强 +4dB'}</button><small>${projectMixer.length} 轨</small></span></div>` + projectMixer.map((track, index) => `
      <div class="mixer-row${track.mute ? ' muted' : ''}" data-mix-index="${index}">
        <strong>${track.label}</strong>
        <input type="range" min="0" max="150" step="1" value="${Math.round(track.gain / track.base * 100)}" aria-label="${track.label} 音量" title="音量">
        <input type="range" min="0" max="100" step="1" value="${Math.round(track.wet * 100)}" aria-label="${track.label} 混响量" title="混响量 ${Math.round(track.wet * 100)}%">
        <button class="mixer-mute" type="button" aria-pressed="${track.mute}" data-mix-mute="${index}">${track.mute ? '已静音' : '静音'}</button>
      </div>`).join('');
    $$('[data-mix-index] input', host).forEach((input) => input.addEventListener('input', (event) => {
      const index = Number(event.target.closest('[data-mix-index]').dataset.mixIndex);
      const percent = Number(event.target.value);
      projectMixer[index].gain = Math.min(1.4, projectMixer[index].base * percent / 100);
      applyProjectMix();
      $('#play-status').textContent = `${projectMixer[index].label} 音量 ${percent}%`;
    }));
    $('#mix-low-boost')?.addEventListener('click', () => {
      lowBoost = lowBoost ? 0 : 4;
      applyLowBoost();
      renderProjectMixer();
      showToast(lowBoost ? `低音增强 +${lowBoost}dB 已开启` : '低音增强已关闭');
    });
    $$('[data-mix-index] input[aria-label$="混响量"]', host).forEach((input) => input.addEventListener('input', (event) => {
      const index = Number(event.target.closest('[data-mix-index]').dataset.mixIndex);
      const amount = Math.max(0, Math.min(1, Number(event.target.value) / 100));
      projectMixer[index].wet = amount;
      event.target.title = `混响量 ${Math.round(amount * 100)}%`;
      const meme = `instrument:${projectMixer[index].preset}`;
      notes.forEach((note) => {
        if (note.meme === meme && note.reverbPreset && note.reverbPreset !== 'none') note.reverbWet = amount;
      });
      saveState();
      $('#play-status').textContent = `${projectMixer[index].label} 混响量 ${Math.round(amount * 100)}%`;
    }));
    $$('[data-mix-mute]', host).forEach((button) => button.addEventListener('click', () => {
      const index = Number(button.dataset.mixMute);
      projectMixer[index].mute = !projectMixer[index].mute;
      applyProjectMix();
      renderProjectMixer();
      showToast(`${projectMixer[index].label} ${projectMixer[index].mute ? '已静音' : '已恢复'}`);
    }));
  }

  async function loadSynthProject(source) {
    try {
      const project = typeof source === 'string' ? await (await fetch(source)).json() : source;
      if (!project || !Array.isArray(project.tracks)) throw new Error('工程格式不对');
      stopPlayback();
      clearVocalTake();
      const rows = [49, 61, 88].includes(Number(project.rows)) ? Number(project.rows) : 61;
      refreshScale(rows, false);
      bpm = Number(project.bpm) || bpm;
      syncChoiceWheel('#bpm-wheel', bpm);
      const mapped = [];
      notes = [];
      project.tracks.forEach((track) => {
        const preset = window.MemeSynth && window.MemeSynth.has(track.preset)
          ? track.preset
          : (ACE_KIND_PRESET[track.aceKind] || 'piano');
        mapped.push(`${track.label || track.aceKind || preset}→${preset}`);
        const fx = track.fx || null;
        const gain = Number.isFinite(Number(track.gain)) ? Math.max(0, Math.min(1.4, Number(track.gain))) : 1;
        (track.notes || []).forEach(([midiValue, col, length, velocity]) => {
          const midi = Number(midiValue);
          const row = pitches.reduce((best, pitch, index) => Math.abs(pitch.midi - midi) < Math.abs(pitches[best].midi - midi) ? index : best, 0);
          notes.push({
            id: uid(), meme: `instrument:${preset}`, row, col: Number(col), length: Number(length), midi,
            velocity: Number.isFinite(Number(velocity)) ? Math.max(.2, Math.min(1, Number(velocity))) : undefined,
            aceKind: track.aceKind || '',
            trackLabel: track.label || '',
            loopVolume: gain,
            ...(fx ? { reverbPreset: fx.reverb, reverbWet: fx.wet, delaySend: fx.delay } : {})
          });
        });
      });
      renderRuler();
      renderStaff();
      saveState();
      projectMixer = project.tracks.map((track) => ({
        label: track.label || track.aceKind || track.preset,
        preset: window.MemeSynth && window.MemeSynth.has(track.preset) ? track.preset : (ACE_KIND_PRESET[track.aceKind] || 'piano'),
        base: Number.isFinite(Number(track.gain)) ? Math.max(.2, Math.min(1.4, Number(track.gain))) : 1,
        gain: Number.isFinite(Number(track.gain)) ? Math.max(.2, Math.min(1.4, Number(track.gain))) : 1,
        wet: Number.isFinite(Number(track.fx?.wet)) ? Math.max(0, Math.min(1, Number(track.fx.wet))) : 0,
        mute: false
      }));
      lowBoost = 4;
      applyLowBoost();
      if (reverbPreset === 'none' || reverbWet === 0) {
        reverbPreset = 'plate';
        reverbWet = .4;
      }
      syncChoiceWheel('#reverb-wheel', reverbPreset);
      syncChoiceWheel('#reverb-wet-wheel', reverbWet);
      applyReverb();
      renderProjectMixer();
      $('#play-status').textContent = `《${project.name || '合成器工程'}》已载入 · ${project.tracks.length} 轨 / ${notes.length} 个音符`;
      showToast(`ACE 分轨已映射：${mapped.join('，')}`);
      startPlayback();
    } catch (error) {
      showToast(`工程导入失败：${error?.message || '请检查 JSON 格式'}`);
    }
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
        : active ? `${icon('stop')} ${formatTrackTime(libraryAudio.currentTime)} / ${formatTrackTime(libraryAudio.duration)}` : `${icon('play')} ${track.action || '播放整曲'}`;
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

  function wheelCenterOffset(wheel) {
    return Math.max(0, (wheel.clientHeight - 24) / 2);
  }

  function syncChoiceWheel(id, value) {
    const wheel = $(id);
    if (!wheel) return;
    const items = $$('.mini-wheel-track > span', wheel);
    if (!items.length) return;
    let index = items.findIndex((item) => item.dataset.value === String(value));
    if (index === -1 && Number.isFinite(Number(value))) {
      // 工程 BPM 可能是 129.795 这类小数：滚轮只有整数档，选最近的显示，不改真实值
      let best = Infinity;
      items.forEach((item, itemIndex) => {
        const numeric = Number(item.dataset.value);
        if (Number.isFinite(numeric)) {
          const distance = Math.abs(numeric - Number(value));
          if (distance < best) { best = distance; index = itemIndex; }
        }
      });
    }
    index = Math.max(0, index);
    $('.mini-wheel-track', wheel).style.transform = `translateY(${wheelCenterOffset(wheel) - index * 24}px)`;
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
      track.style.transform = `translateY(${wheelCenterOffset(wheel) - gestureState.startIndex * 24 + gestureState.offset}px)`;
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
      loopTapes.forEach((tape) => remapNoteRows(tape.items, pitches, nextPitches));
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

  function selectedNote() { return notes.find((item) => item.id === selectedNoteId) || null; }

  function syncGlobalReverbWheels() {
    syncChoiceWheel('#reverb-wheel', reverbPreset);
    syncChoiceWheel('#reverb-wet-wheel', reverbWet);
    syncChoiceWheel('#reverb-decay-wheel', Math.round(reverbDecayScale * 100));
    syncChoiceWheel('#reverb-predelay-wheel', Math.round(reverbPreDelaySec * 1000));
    syncChoiceWheel('#reverb-damp-wheel', Math.round(reverbDamping));
  }

  function closeNoteFx() {
    selectedNoteId = null;
    const transport = $('.transport');
    if (transport) transport.classList.remove('note-edit');
    $$('.placed-note.selected').forEach((noteEl) => {
      noteEl.classList.remove('selected');
      noteEl.setAttribute('aria-pressed', 'false');
    });
    const deleteButton = $('#delete-note');
    if (deleteButton) deleteButton.disabled = true;
    syncGlobalReverbWheels();
  }

  function updateNoteFxBadge(note) {
    const noteEl = $(`.placed-note[data-note-id="${note.id}"]`);
    if (!noteEl) return;
    noteEl.classList.toggle('fx-override', Boolean(note.reverbPreset));
    const badge = $('.note-fx-badge', noteEl);
    if (!badge) return;
    badge.hidden = !note.reverbPreset;
    badge.textContent = note.reverbPreset === 'none' ? 'DRY' : 'FX';
  }

  function syncNoteFx() {
    const note = selectedNote();
    if (!note) { closeNoteFx(); return; }
    const source = sourceInfo(note.meme);
    const transport = $('.transport');
    if (transport) transport.classList.add('note-edit');
    const preset = note.reverbPreset || reverbPreset;
    const wet = note.reverbPreset
      ? (note.reverbWet ?? (reverbPresets[note.reverbPreset]?.wet ?? 0))
      : reverbWet;
    syncChoiceWheel('#reverb-wheel', preset);
    syncChoiceWheel('#reverb-wet-wheel', Math.round(wet * 10) / 10);
    syncChoiceWheel('#reverb-decay-wheel', Math.round((note.reverbDecayScale ?? reverbDecayScale) * 100));
    syncChoiceWheel('#reverb-predelay-wheel', Math.round((note.reverbPreDelaySec ?? reverbPreDelaySec) * 1000));
    syncChoiceWheel('#reverb-damp-wheel', Math.round(note.reverbDamping ?? reverbDamping));
    const deleteButton = $('#delete-note');
    if (deleteButton) deleteButton.disabled = false;
    $$('.placed-note').forEach((noteEl) => {
      const selected = noteEl.dataset.noteId === note.id;
      noteEl.classList.toggle('selected', selected);
      noteEl.setAttribute('aria-pressed', String(selected));
    });
    updateNoteFxBadge(note);
    $('#play-status').textContent = `${source.title} · ${pitches[note.row]?.name || ''} · 绿色控件用于单独设置这个音的混响`;
  }

  function selectNoteById(id) {
    if (!notes.some((note) => note.id === id)) { closeNoteFx(); return; }
    selectedNoteId = id;
    syncNoteFx();
  }

  function noteMarkup(note) {
    const source = sourceInfo(note.meme);
    const compact = note.length < .7 ? ' compact' : '';
    const selected = note.id === selectedNoteId ? ' selected' : '';
    const override = note.reverbPreset ? ' fx-override' : '';
    const stack = noteStacks.get(note.id) || 0;
    const stackClass = stack > 0 ? ' stacked' : '';
    const stackAttr = stack > 0 ? ` data-stack="${stack}"` : '';
    const length = timelineLength();
    const image = source.image ? `<img src="${source.image}" alt="" draggable="false">` : `<span class="note-instrument-symbol" aria-hidden="true">${source.symbol}</span>`;
    return `<span class="placed-note${compact}${selected}${override}${stackClass}" data-note-id="${note.id}"${stackAttr} style="--note-color:${source.color};left:${note.col / length * 100}%;width:${note.length / length * 100}%" tabindex="0" role="button" aria-pressed="${note.id === selectedNoteId}" aria-label="${source.title}，位置 ${note.col.toFixed(2)} 步，长度 ${note.length.toFixed(2)} 步。拖动移动，右缘调整长度，点击设置独立混响" title="${source.title} · ${note.col.toFixed(2)} 步 · 长度 ${formatLength(note.length)} · 点击设置混响">${image}<span class="note-name">${source.title}</span>${icon('note')}<small class="note-fx-badge" ${note.reverbPreset ? '' : 'hidden'}>${note.reverbPreset === 'none' ? 'DRY' : 'FX'}</small><small class="note-length" ${Math.abs(note.length - 1) < .04 || note.length < .7 ? 'hidden' : ''}>×${formatLength(note.length)}</small><span class="note-resize" data-resize-id="${note.id}" aria-hidden="true"></span></span>`;
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

  // 同一个音高线/时间点允许多个音符叠放（不同乐器常在同一线谱上重合），渲染时给它们分层偏移。
  const noteStacks = new Map();

  function renderStaff() {
    syncTimelineDimensions();
    noteStacks.clear();
    pitches.forEach((pitch, row) => {
      const rowNotes = notes.filter((note) => note.row === row).sort((a, b) => a.col - b.col || a.length - b.length);
      const levels = [];
      rowNotes.forEach((note) => {
        let level = 0;
        while (levels[level] && levels[level].some((other) => note.col < other.col + other.length - .001 && note.col + note.length - .001 > other.col)) level += 1;
        (levels[level] ||= []).push(note);
        noteStacks.set(note.id, level);
      });
    });
    $('#staff-grid').innerHTML = pitches.map((pitch, row) => `
      <div class="staff-row"><div class="pitch-label${selectedRows.has(row) ? ' selected' : ''}" data-row="${row}" role="button" tabindex="0" title="点一下选中这条轨道，用于合成 loop 底奏卡带">${pitch.name}<span>${pitch.name === 'G4' ? '原调' : ''}</span></div>
      <div class="rail-track" data-row="${row}" tabindex="0" aria-label="${pitch.name} 滑轨，在空白处按下并向右拖动，放入并延长 ${sourceInfo(selectedId).title}">${notes.filter((note) => note.row === row).map(noteMarkup).join('')}</div></div>`).join('');
    $('#note-count').textContent = `${notes.length} 个音符 · ${Math.ceil(timelineLength() / 8)} 小节`;

    $$('.placed-note').forEach((noteEl) => {
      noteEl.addEventListener('dragstart', (event) => event.preventDefault());
      noteEl.addEventListener('pointerdown', (event) => beginMoveGesture(event, noteEl));
      $('.note-resize', noteEl).addEventListener('pointerdown', (event) => beginResizeGesture(event, noteEl));
    });
    $$('#staff-grid .pitch-label').forEach((label) => {
      label.addEventListener('click', () => toggleRowSelection(Number(label.dataset.row)));
      label.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        toggleRowSelection(Number(label.dataset.row));
      });
    });
    syncNoteFx();
    updatePlayhead();
    renderTapeStrip();
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
    }
    renderRuler(); renderStaff(); saveState(); selectNoteById(note.id); focusNote(note.id);
    $('#play-status').textContent = state.type === 'resize'
      ? `${sourceInfo(note.meme).title} · 长度 ${formatLength(note.length)} 步`
      : `${sourceInfo(note.meme).title} · 位置 ${note.col.toFixed(2)} 步`;
  }

  function clearDropTargets() { $$('.drop-target').forEach((track) => track.classList.remove('drop-target')); }

  // 线谱触控：双指拖动=平移，双指水平缩放=时间轴缩放，双指垂直缩放=音轨行高缩放
  function bindStaffGestures() {
    const scroll = $('#staff-scroll');
    const canvas = $('#staff-canvas');
    if (!scroll || !canvas) return;
    let pinch = null;
    const dist = (touches) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    const mid = (touches) => ({ x: (touches[0].clientX + touches[1].clientX) / 2, y: (touches[0].clientY + touches[1].clientY) / 2 });
    scroll.addEventListener('touchstart', (event) => {
      if (event.touches.length !== 2) return;
      pinch = {
        dist: dist(event.touches),
        mid: mid(event.touches),
        zoom: Number(scroll.dataset.staffZoom) || 1,
        rowH: Number(scroll.dataset.rowH) || 50,
        left: scroll.scrollLeft,
        top: scroll.scrollTop
      };
      event.preventDefault();
    }, { passive: false });
    scroll.addEventListener('touchmove', (event) => {
      if (!pinch || event.touches.length !== 2) return;
      event.preventDefault();
      const d = dist(event.touches);
      const m = mid(event.touches);
      const ratio = pinch.dist > 1 ? d / pinch.dist : 1;
      const horizontal = Math.abs(event.touches[0].clientX - event.touches[1].clientX) >= Math.abs(event.touches[0].clientY - event.touches[1].clientY);
      if (Math.abs(ratio - 1) > .02) {
        if (horizontal) {
          const zoom = Math.min(3, Math.max(.5, pinch.zoom * ratio));
          scroll.dataset.staffZoom = String(zoom);
          canvas.style.setProperty('--staff-zoom', zoom.toFixed(3));
          $('#play-status').textContent = `线谱缩放 ${Math.round(zoom * 100)}%`;
        } else {
          const rowH = Math.min(80, Math.max(34, pinch.rowH * ratio));
          scroll.dataset.rowH = String(rowH);
          scroll.style.setProperty('--row-h', `${rowH.toFixed(1)}px`);
          $('#play-status').textContent = `音轨行高 ${Math.round(rowH)}px`;
        }
      } else {
        scroll.scrollLeft = pinch.left - (m.x - pinch.mid.x);
        scroll.scrollTop = pinch.top - (m.y - pinch.mid.y);
      }
    }, { passive: false });
    const end = () => { pinch = null; };
    scroll.addEventListener('touchend', end);
    scroll.addEventListener('touchcancel', end);
  }

  // 找到"主旋律"音符：优先按工程轨道语义，其次按音高最高的声部
  function melodyNotes() {
    const tagged = notes.filter((note) => note.aceKind === '旋律' || (note.trackLabel || '').includes('主旋律'));
    if (tagged.length) return tagged;
    const groups = new Map();
    notes.forEach((note) => {
      const midi = Number.isFinite(Number(note.midi)) ? Number(note.midi) : (pitches[note.row]?.midi || 0);
      const list = groups.get(note.meme) || { sum: 0, count: 0, notes: [] };
      list.sum += midi; list.count += 1; list.notes.push(note);
      groups.set(note.meme, list);
    });
    let best = null;
    groups.forEach((group) => {
      const average = group.sum / Math.max(1, group.count);
      if (!best || average > best.average) best = { average, notes: group.notes };
    });
    return best ? best.notes : [];
  }

  // 空线谱：按 4/4 随机铺采样节奏（每拍/反拍/切分）
  function sprinkleSampleRhythm(meme) {
    const bars = 4;
    const rows = Math.max(1, Math.min(3, pitchCount));
    const pickRow = () => Math.max(0, pitchCount - 1 - Math.floor(Math.random() * rows));
    const out = [];
    for (let bar = 0; bar < bars; bar++) {
      const base = bar * 8;
      out.push({ id: uid(), meme, row: pickRow(), col: base, length: 1 });
      out.push({ id: uid(), meme, row: pickRow(), col: base + 4, length: 1 });
      if (Math.random() < .7) out.push({ id: uid(), meme, row: pickRow(), col: base + 2, length: .5 });
      if (Math.random() < .5) out.push({ id: uid(), meme, row: pickRow(), col: base + 6, length: .5 });
      [1, 3, 5, 7].forEach((offset) => {
        if (Math.random() < .28) out.push({ id: uid(), meme, row: pickRow(), col: base + offset, length: .5 });
      });
    }
    return out;
  }

  function replaceMainMelodyWithSelection() {
    const meme = selectedId;
    if (!validSource(meme)) { showToast('先选一个采样或乐器'); return; }
    const title = sourceInfo(meme).title;
    if (!notes.length) {
      const generated = sprinkleSampleRhythm(meme);
      notes.push(...generated);
      renderRuler(); renderStaff(); saveState();
      $('#play-status').textContent = `空线谱已按 4/4 随机铺入 ${generated.length} 个「${title}」采样`;
      showToast(`按 4/4 随机铺入 ${generated.length} 个${title}`);
      return;
    }
    const target = melodyNotes();
    if (!target.length) { showToast('没找到主旋律，先往线谱里放几个音'); return; }
    target.forEach((note) => { note.meme = meme; delete note.midi; });
    renderRuler(); renderStaff(); saveState();
    $('#play-status').textContent = `主旋律 ${target.length} 个音已换成「${title}」`;
    showToast(`主旋律已换成「${title}」`);
  }

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
          event.preventDefault(); selectNoteById(id); $('#reverb-wheel').focus({ preventScroll: true });
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

  function buildImpulse(preset, overrides = null) {
    const settings = reverbPresets[preset] || reverbPresets.plate;
    const decayScale = Number(overrides && overrides.decayScale != null ? overrides.decayScale : reverbDecayScale) || 1;
    const preDelaySec = Number(overrides && overrides.preDelaySec != null ? overrides.preDelaySec : reverbPreDelaySec) || 0;
    const damping = Number(overrides && overrides.damping != null ? overrides.damping : reverbDamping) || 6000;
    const cacheKey = `${preset}|${decayScale}|${preDelaySec.toFixed(4)}|${damping}`;
    if (impulseBuffers.has(cacheKey)) return impulseBuffers.get(cacheKey);
    const sr = audioCtx.sampleRate;
    const pre = Math.floor(sr * Math.max(0, preDelaySec));
    const body = Math.max(2, Math.floor(sr * settings.seconds * decayScale));
    const length = pre + body;
    const impulse = audioCtx.createBuffer(2, length, sr);
    const dampAlpha = 1 - Math.exp(-2 * Math.PI * Math.max(800, damping) / sr);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      let previous = 0;
      let damped = 0;
      for (let i = 0; i < length; i++) {
        if (i < pre) { data[i] = 0; continue; }
        const k = i - pre;
        const envelope = (1 - k / body) ** settings.decay;
        const white = Math.random() * 2 - 1;
        previous = preset === 'plate' ? white * .72 + previous * .28 : white;
        damped += dampAlpha * (previous - damped);
        const early = k < sr * .025 && preset !== 'none' ? .35 : 1;
        data[i] = damped * envelope * early;
      }
    }
    impulseBuffers.set(cacheKey, impulse);
    return impulse;
  }

  // 混响参数变化后重建所有脉冲响应
  function refreshReverbImpulses() {
    if (!audioCtx) return;
    impulseBuffers.clear();
    reverbSendBuses.forEach((entry) => {
      try { entry.conv.buffer = buildImpulse(entry.preset); } catch (_) { /* ignore */ }
    });
    noteReverbConvolvers.forEach((entry) => {
      try { entry.conv.buffer = buildImpulse(entry.preset, entry.overrides); } catch (_) { /* ignore */ }
    });
    if (convolver) {
      try { convolver.buffer = buildImpulse(reverbPreset); } catch (_) { /* ignore */ }
    }
  }

  // 某个音使用独立混响参数时，创建它自己的卷积器（缓存复用）
  function noteReverbInput(preset, overrides) {
    const key = `${preset}|${overrides.decayScale ?? ''}|${overrides.preDelaySec ?? ''}|${overrides.damping ?? ''}`;
    if (!noteReverbConvolvers.has(key)) {
      const conv = audioCtx.createConvolver();
      conv.buffer = buildImpulse(preset, overrides);
      conv.connect(reverbGain);
      noteReverbConvolvers.set(key, { conv, preset, overrides });
    }
    return noteReverbConvolvers.get(key).conv;
  }

  // 每个混响预设一条总线：音符按自己的 wet 值往总线里送，全局混响 wet 再统一缩放。
  function reverbInput(preset) {
    const key = reverbPresets[preset] ? preset : 'plate';
    if (!reverbSendBuses.has(key)) {
      const bus = audioCtx.createGain();
      const conv = audioCtx.createConvolver();
      conv.buffer = buildImpulse(key);
      bus.connect(conv).connect(reverbGain);
      reverbSendBuses.set(key, { bus, conv, preset: key });
    }
    return reverbSendBuses.get(key).bus;
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
    const busInput = note?.backingTonal && padBackingTonalInput ? padBackingTonalInput
      : note?.backing && padBackingInput ? padBackingInput
        : note?.padBus && padMixInput ? padMixInput
          : null;
    const destination = busInput || master;
    const temporaryNodes = [output];
    const panner = audioCtx.createStereoPanner();
    panner.pan.value = clamp(Number(note?.pan) || 0, -1, 1);
    temporaryNodes.push(panner);
    output.connect(panner);
    if (note?.delaySend && padDelaySend) {
      const delayGain = audioCtx.createGain();
      delayGain.gain.value = clamp(Number(note.delaySend), 0, .6);
      output.connect(delayGain).connect(padDelaySend);
      temporaryNodes.push(delayGain);
    }
    const wet = preset === 'none' ? 0 : clamp(note?.reverbWet ?? (preset ? reverbPresets[preset].wet : 1), 0, .8);
    const dry = audioCtx.createGain();
    dry.gain.value = 1 - wet * .35;
    panner.connect(dry).connect(busInput || mixInput);
    temporaryNodes.push(dry);
    if (wet > 0) {
      const send = audioCtx.createGain();
      send.gain.value = wet;
      const overrides = preset && preset !== 'none' && (note?.reverbDecayScale != null || note?.reverbPreDelaySec != null || note?.reverbDamping != null)
        ? { decayScale: note.reverbDecayScale, preDelaySec: note.reverbPreDelaySec, damping: note.reverbDamping }
        : null;
      panner.connect(send).connect(overrides ? noteReverbInput(preset, overrides) : reverbInput(preset || reverbPreset));
      temporaryNodes.push(send);
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
      lowShelf = audioCtx.createBiquadFilter();
      lowShelf.type = 'lowshelf';
      lowShelf.frequency.value = 110;
      lowShelf.gain.value = 0;
      highShelf = audioCtx.createBiquadFilter();
      highShelf.type = 'highshelf';
      highShelf.frequency.value = 10000;
      highShelf.gain.value = -2.5;
      masterHPF = audioCtx.createBiquadFilter();
      masterHPF.type = 'highpass';
      masterHPF.frequency.value = 32;
      masterHPF.Q.value = .7;
      convolver = audioCtx.createConvolver();
      reverbGain = audioCtx.createGain();
      padMixInput = audioCtx.createGain();
      padBackingInput = audioCtx.createGain();
      padBackingTonalInput = audioCtx.createGain();
      padDuckSC = audioCtx.createGain();
      padDuckUser = audioCtx.createGain();
      padBackingFilter = audioCtx.createBiquadFilter();
      padDelaySend = audioCtx.createGain();
      padDelay = audioCtx.createDelay(1);
      padDelayTone = audioCtx.createBiquadFilter();
      padDelayFb = audioCtx.createGain();
      padDelayWet = audioCtx.createGain();
      const padCompressor = audioCtx.createDynamicsCompressor();
      const padOutput = audioCtx.createGain();
      padCompressor.threshold.value = -14;
      padCompressor.knee.value = 6;
      padCompressor.ratio.value = 2.5;
      padCompressor.attack.value = .01;
      padCompressor.release.value = .12;
      padOutput.gain.value = .85;
      padBackingInput.gain.value = 1.1;
      padBackingTonalInput.gain.value = 1.1;
      padDuckSC.gain.value = 1;
      padDuckUser.gain.value = 1;
      padBackingFilter.type = 'lowpass';
      padBackingFilter.frequency.value = 18000;
      padBackingFilter.Q.value = .7;
      padDelaySend.gain.value = .22;
      padDelay.delayTime.value = .25;
      padDelayTone.type = 'lowpass';
      padDelayTone.frequency.value = 2600;
      padDelayFb.gain.value = .3;
      padDelayWet.gain.value = .5;
      // 鼓走 padBackingInput、bass/stab/lead 走 tonal 分线；侧链只压 tonal，否则 kick 会被自己压闷。
      padBackingTonalInput.connect(padDuckSC).connect(padBackingFilter);
      padBackingInput.connect(padBackingFilter);
      padBackingFilter.connect(padDuckUser).connect(padCompressor);
      padDelaySend.connect(padDelay);
      padDelay.connect(padDelayTone);
      padDelayTone.connect(padDelayFb).connect(padDelay);
      padDelayTone.connect(padDelayWet).connect(padBackingFilter);
      padMixInput.connect(padCompressor).connect(padOutput).connect(master);
      master.gain.value = outputVolume / 100;
      mixInput.connect(masterHPF);
      masterHPF.connect(lowShelf);
      lowShelf.connect(highShelf);
      highShelf.connect(dryGain).connect(master);
      reverbGain.connect(master);
      reverbSendBuses = new Map();
      padLimiter = audioCtx.createDynamicsCompressor();
      padLimiter.threshold.value = -6;
      padLimiter.knee.value = 0;
      padLimiter.ratio.value = 20;
      padLimiter.attack.value = .002;
      padLimiter.release.value = .06;
      master.connect(padLimiter).connect(audioCtx.destination);
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

  function tone(type, frequency, when, duration, volume = 0.15, endFrequency = null, pan = 0) {
    const oscillator = trackSource(audioCtx.createOscillator());
    const gain = audioCtx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(30, frequency), when);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), when + duration);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + Math.min(.018, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    const destination = soundOutput || mixInput;
    if (pan) {
      const panner = audioCtx.createStereoPanner();
      panner.pan.value = clamp(pan, -1, 1);
      oscillator.connect(gain).connect(panner).connect(destination);
    } else {
      oscillator.connect(gain).connect(destination);
    }
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

  function noise(when, duration, frequency, volume = .12, pan = 0) {
    const source = trackSource(audioCtx.createBufferSource());
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    source.buffer = getNoise();
    filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = .7;
    gain.gain.setValueAtTime(.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    const destination = soundOutput || mixInput;
    if (pan) {
      const panner = audioCtx.createStereoPanner();
      panner.pan.value = clamp(pan, -1, 1);
      source.connect(filter).connect(gain).connect(panner).connect(destination);
    } else {
      source.connect(filter).connect(gain).connect(destination);
    }
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
    const duration = preview ? 1.2 : Math.max(.12, (note?.length || 1) * (note?.stepLength || stepDuration()));
    if (window.MemeSynth) {
      window.MemeSynth.play({
        ctx: audioCtx,
        destination: soundOutput || mixInput,
        id: kind,
        midi,
        when,
        duration,
        volume: 1,
        velocity: note?.velocity,
        legato: Boolean(note?.legato),
        noiseBuffer: getNoise(),
        trackSource
      });
      return;
    }
    // 兜底：引擎缺失时也给一个三角波，避免整轨静音
    tone('triangle', 440 * 2 ** ((midi - 69) / 12), when, duration, .15);
  }

  function triggerSound(id, row, when, preview = false, note = null, hasAdjacentNext = false) {
    if (id.startsWith('instrument:')) {
      const duration = preview ? 1.2 : Math.max(.12, (note?.length || 1) * stepDuration());
      // 给每个乐器叠加它所属族的默认效果器（总线混响 + 附点延迟），避免干巴。
      const fx = window.MemeSynth?.fxFor ? window.MemeSynth.fxFor(id.replace('instrument:', '')) : null;
      const busNote = note ? { ...note } : {};
      if (fx) {
        if (!busNote.reverbPreset) busNote.reverbPreset = fx.reverb;
        if (busNote.reverbWet == null) busNote.reverbWet = fx.wet;
        if (busNote.delaySend == null && fx.delay) busNote.delaySend = fx.delay;
      }
      withSoundBus(busNote, when, duration, () => instrumentSound(id, row, when, preview, note));
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
      const padHit = Boolean(note?.padHit);
      // 打击垫固定从裁剪起点进（不做随机切段），但要一直放到采样结尾，不再只放开头 0.1s。
      const startOffset = Math.min(sampleOffset + lead, Math.max(0, buffer.duration - .02));
      const sampleDuration = buffer.duration / playbackRate;
      const availableDuration = Math.max(.01, sampleDuration - startOffset / playbackRate);
      // 打击垫：按住就播，播到采样结尾还在按就循环，松开由 releasePadSample 停止。
      const duration = padHit
        ? availableDuration
        : preview
          ? Math.min(2.7, availableDuration)
          : (note?.length || 1) * stepDuration() * (hasAdjacentNext ? 1 : 1.6);
      const stopAt = when + duration;
      const attack = padHit ? .004 : Math.min(.025, duration * .08);
      const fade = Math.min(hasAdjacentNext ? .42 : .11, duration * (hasAdjacentNext ? .72 : .32));
      const fadeStart = Math.max(when + attack, stopAt - fade);
      const fadeCurve = new Float32Array(97);
      for (let i = 0; i < fadeCurve.length; i++) {
        fadeCurve[i] = volume * (Math.cos(i / (fadeCurve.length - 1) * Math.PI / 2) ** 1.35);
      }
      source.buffer = buffer;
      source.playbackRate.value = playbackRate;
      if (padHit) {
        source.loop = true;
        source.loopStart = startOffset;
        source.loopEnd = buffer.duration;
      } else {
        source.loop = !preview && duration > availableDuration;
        if (source.loop && startOffset > 0) { source.loopStart = startOffset; source.loopEnd = buffer.duration; }
      }
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(volume, when + attack);
      if (!padHit) {
        gain.gain.setValueAtTime(volume, fadeStart);
        gain.gain.setValueCurveAtTime(fadeCurve, fadeStart, stopAt - fadeStart);
      }
      // 打击垫循环播放，节点留到松开为止再断开。
      source.connect(gain).connect(createSoundBus(note, when, padHit ? 60 : duration));
      source.start(when, startOffset);
      if (!padHit) source.stop(stopAt + .08);
      // 打击垫重触发：同一个采样再次被敲时，直接掐掉上一声（6ms 消咔哒）再从起点重新发声，
      // 这样连击的节奏反馈靠“重新触发”而不是靠把采样截短。
      if (padHit) {
        const previous = padSampleVoices.get(id);
        if (previous) {
          try {
            const previousGain = previous.gain.gain;
            previousGain.cancelScheduledValues(when);
            previousGain.setValueAtTime(previousGain.value, when);
            previousGain.linearRampToValueAtTime(0, when + .006);
            previous.source.stop(when + .008);
          } catch (_) { /* 上一声已结束 */ }
        }
        padSampleVoices.set(id, { source, gain });
        padHeldSamples.set(id, { source, gain, start: when });
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
        triggerTapeStep(currentStep, now + .005);
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
    triggerTapeStep(absoluteStep, when);
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
    // 循环按钮已移除，播放始终循环
    loop = true;
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
    selectMeme(song.instrument);
    projectMixer = null;
    lowBoost = 0;
    applyLowBoost();
    renderProjectMixer();
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
  const padLoopNames = { sunny: '柑橘跳跳糖', bounce: '像素弹跳', chill: '夜空气泡', friendwine: '朋友的酒', off: '无底奏' };
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

  const PAD_GROOVE_BPM = { sunny: 124, bounce: 134, chill: 86 };
  const PAD_LOOP_STEPS = 256; // 16 小节编排
  function padGrooveBpm(id) {
    if (window.PadGrooves && typeof window.PadGrooves.padGrooveBpm === 'function') return window.PadGrooves.padGrooveBpm(id);
    return PAD_GROOVE_BPM[id] || 116;
  }
  function padStepDuration(id = padBackingId) { return 60 / padGrooveBpm(id) / 4; }

  // 侧链泵动：只用两次 setTargetAtTime，避免硬跳变咔哒；不要 cancel，调度器已提前排好后续。
  function padPump(when, opts) {
    if (!padDuckSC) return;
    const depth = (opts && opts.depth) || .62;
    const hold = (opts && opts.hold) || .021;
    const release = (opts && opts.release) || .032;
    const gain = padDuckSC.gain;
    gain.setTargetAtTime(depth, when, .004);
    gain.setTargetAtTime(1, when + hold, release);
  }

  // 用户敲击时整条底奏让位约 2dB，180ms 回来，避免和敲击抢频段。
  function padDuckForUser(when) {
    if (!padDuckUser) return;
    const gain = padDuckUser.gain;
    gain.setTargetAtTime(.78, when, .004);
    gain.setTargetAtTime(1, when + .028, .06);
  }

  function padDrumSound(kind, when, volume = 1, backing = false) {
    const type = kind.replace('drum:', '');
    const busDuration = type === 'riser' ? 4 : type === 'impact' ? 1 : .45;
    const busNote = { loopVolume: volume, reverbPreset: type === 'snare' ? 'plate' : 'none', padBus: true, backing };
    if (type === 'snare') busNote.reverbWet = .15;
    withSoundBus(busNote, when, busDuration, () => {
      if (type === 'kick') {
        tone('sine', 150, when, .3, .92, 52);
        tone('sine', 62, when, .26, .55);
        tone('triangle', 110, when, .045, .22, 70);
        noise(when, .012, 3200, .18);
        noise(when + .002, .006, 7600, .1);
      } else if (type === 'kick:ghost') {
        tone('sine', 140, when, .12, .6, 50);
        noise(when, .008, 1800, .05);
      } else if (type === 'snare') {
        noise(when, .24, 1800, .5);
        noise(when + .01, .1, 5200, .22);
        tone('triangle', 190, when, .12, .26, 120);
        noise(when + .004, .04, 9200, .1);
      } else if (type === 'clap') {
        [0, .02, .045].forEach((offset, index) => noise(when + offset, .11 - index * .012, 1450 + index * 420, .24));
      } else if (type === 'rim') {
        tone('triangle', 780, when, .012, .3);
        noise(when, .02, 3200, .18);
      } else if (type === 'impact') {
        tone('sine', 90, when, .8, .8, 38);
        noise(when, .5, 4000, .3);
        noise(when + .02, .25, 9000, .15);
      } else if (type === 'riser') {
        const source = trackSource(audioCtx.createBufferSource());
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();
        source.buffer = getNoise();
        source.loop = true;
        filter.type = 'bandpass';
        filter.Q.value = 1.5;
        filter.frequency.setValueAtTime(380, when);
        filter.frequency.exponentialRampToValueAtTime(8200, when + 3.4);
        gain.gain.setValueAtTime(.0001, when);
        gain.gain.exponentialRampToValueAtTime(Math.max(.05, volume), when + 3.2);
        gain.gain.exponentialRampToValueAtTime(.0001, when + 3.7);
        source.connect(filter).connect(gain).connect(soundOutput || mixInput);
        source.start(when);
        source.stop(when + 3.8);
      } else if (type === 'hat' || type === 'openhat') {
        // 开镲被下一个闭镲收掉：一声一个 gate，house/garage 的干净感靠它。
        const open = type === 'openhat';
        const gate = audioCtx.createGain();
        gate.gain.value = 1;
        gate.connect(soundOutput);
        const previous = soundOutput;
        soundOutput = gate;
        try {
          noise(when, open ? .35 : .16, 7200, .18, open ? 0 : -.3);
          noise(when + .002, open ? .22 : .09, 9800, .12, open ? 0 : .3);
          [6300, 8300, 10700].forEach((frequency, index) => tone('square', frequency, when + index * .001, open ? .05 : .028, .035 - index * .008));
        } finally {
          soundOutput = previous;
        }
        if (open) {
          padOpenHatVoice = gate;
          setTimeout(() => { try { gate.disconnect(); } catch (_) { /* 已释放 */ } }, 900);
        } else if (padOpenHatVoice) {
          try {
            padOpenHatVoice.gain.cancelScheduledValues(when);
            padOpenHatVoice.gain.setTargetAtTime(0, when, .003);
          } catch (_) { /* 上一声已结束 */ }
          padOpenHatVoice = null;
        }
      }
    });
  }

  function padInstrumentTone(instrument, midi, when, length, volume, opts = {}) {
    const options = typeof opts === 'boolean' ? { bus: opts ? 'drums' : null } : opts;
    const tonal = options.bus === 'tonal';
    const row = nearestPitchRow(midi);
    const stepLength = padStepDuration();
    if (tonal && options.delaySend && padDelay) {
      padDelay.delayTime.setTargetAtTime(stepLength * 3, when, .01);
    }
    withSoundBus({
      loopVolume: volume,
      reverbPreset: options.reverbPreset || 'none',
      reverbWet: options.reverbWet,
      delaySend: options.delaySend || 0,
      padBus: true,
      backing: Boolean(options.bus) && !tonal,
      backingTonal: tonal,
      // 和弦声部按音高铺开立体声，贝斯/底鼓保持中间。
      pan: options.pan !== undefined ? options.pan : (tonal && instrument !== 'bass' ? (((midi % 12) - 6) / 16) : 0)
    }, when, length * stepLength, () => {
      instrumentSound(`instrument:${instrument}`, row, when, false, { midi, length, stepLength });
    });
  }

  // 朋友的酒：不改编、不重排，直接把现有工程 JSON 的音符按 16 小节循环回放。
  let friendwineBackingData = null;
  let friendwineBackingLoading = null;
  function loadFriendwineBacking() {
    if (friendwineBackingData) return Promise.resolve(friendwineBackingData);
    if (!friendwineBackingLoading) {
      friendwineBackingLoading = fetch('./assets/ace/friendwine_synth_project.json')
        .then((response) => response.ok ? response.json() : null)
        .then((data) => { friendwineBackingData = data; return data; })
        .catch(() => null);
    }
    return friendwineBackingLoading;
  }

  const FRIENDWINE_DRUM_KINDS = ['kick', 'kick', 'snare', 'snare', 'hat', 'tom', 'clap', 'clap', 'openhat', 'rim', 'kick', 'snare'];
  function scheduleFriendwineBackingStep(step, when) {
    const data = friendwineBackingData;
    if (!data || !Array.isArray(data.tracks)) return;
    const loopStep = ((step % 256) + 256) % 256;
    const flags = { kick: false, snare: false, hat: false, bass: false, chord: false };
    data.tracks.forEach((track) => {
      const preset = track.preset;
      const isDrums = preset === 'drumkit';
      const gain = Number.isFinite(Number(track.gain)) ? Number(track.gain) : 1;
      const fx = track.fx || {};
      (track.notes || []).forEach((note) => {
        const start = Math.round(Number(note[1]) * 2);    // 工程的 8 分音符列 → 底奏的 16 分步
        if (start !== loopStep) return;
        const lengthSteps = Math.max(1, Math.round(Number(note[2]) * 2));
        const midi = Number(note[0]);
        const velocity = Number.isFinite(Number(note[3])) ? Number(note[3]) : 1;
        const volume = Math.max(0, Math.min(1.5, gain * velocity));
        const opts = isDrums
          ? { bus: 'drums', reverbPreset: fx.reverb || 'none', reverbWet: fx.wet || 0 }
          : { bus: 'tonal', reverbPreset: fx.reverb || 'none', reverbWet: fx.wet || 0, delaySend: fx.delay || 0 };
        padInstrumentTone(preset, midi, when, lengthSteps, volume, opts);
        if (isDrums) {
          const kind = FRIENDWINE_DRUM_KINDS[((midi % 12) + 12) % 12];
          if (kind === 'kick') flags.kick = true;
          else if (kind === 'snare' || kind === 'clap' || kind === 'rim') flags.snare = true;
          else flags.hat = true;
        } else if (preset === 'bass') flags.bass = true;
        else flags.chord = true;
      });
    });
    emitPadBeat(step, when, 'friendwine', {
      kick: flags.kick, snare: flags.snare, hat: flags.hat, bass: flags.bass, chord: flags.chord,
      bar: Math.floor(step / 64) % 4, barOfLoop: Math.floor(step / 16) % 16, swingMs: 0, gain: 1
    });
  }

  // 底奏编曲引擎适配层：引擎只产出"第几步发什么"，这里翻译成现有合成函数。
  function padScheduleViaGrooves(step, when, id) {
    if (id === 'friendwine') { scheduleFriendwineBackingStep(step, when); return; }
    if (!window.PadGrooves) { schedulePadBackingStep(step, when, id); return; }
    const api = {
      drum(kind, at, volume) {
        const key = {
          kick: 'drum:kick',
          'kick:ghost': 'drum:kick:ghost',
          snare: 'drum:snare',
          clap: 'drum:clap',
          hat: 'drum:hat',
          openhat: 'drum:openhat',
          rim: 'drum:rim',
          impact: 'drum:impact',
          riser: 'drum:riser'
        }[kind] || 'drum:hat';
        padDrumSound(key, at, volume, true);
      },
      tonal(inst, midi, at, lengthSteps, volume, opts) { padInstrumentTone(inst, midi, at, lengthSteps, volume, opts); },
      pump(at, opts) { padPump(at, opts); },
      lowpass(hz, at, tc) { if (padBackingFilter) padBackingFilter.frequency.setTargetAtTime(hz, at, tc); },
      emit(detail) { emitPadBeat(step, when + (Number(detail && detail.swingMs) || 0), id, detail); }
    };
    window.PadGrooves.scheduleStep(step, when, id, api);
  }

  function emitPadBeat(step, when, id, flags) {
    // 记录最近的底奏网格，用于判断打击垫是否卡在拍上
    padBeatTiming = { at: when, stepDur: padStepDuration(id), id };
    const delay = Math.max(0, (when - audioCtx.currentTime) * 1000);
    setTimeout(() => {
      if (padBackingId !== id) return;
      window.dispatchEvent(new CustomEvent('meme-pad-beat', {
        detail: { step, position: step % 16, id, duration: padStepDuration(), ...flags }
      }));
    }, delay);
  }

  // 三套底奏各有自己的速度和性格：Disco/Funk House、2-step/Speed Garage、Lo-fi Half-time。
  // 数组与编排来自 docs/dj-backing-guide.md 第 3 章。
  const PAD_GROOVES = {
    sunny: {
      kick: [0, 4, 8, 12],
      ghostKick: [3, 7, 11, 15],
      snare: [4, 12],
      clap: [4, 12],
      hat: 1,
      hatAccent: [2, 6, 10, 14],
      openHat: [2, 6, 10, 14],
      bass: [0, 3, 6, 10, 12, 14],
      bassOctave: [3, 10],
      stab: [2, 6, 10, 14],
      stabInst: 'piano',
      chords: [[64, 67, 72], [60, 64, 69], [65, 69, 72], [62, 67, 71]],
      roots: [36, 33, 29, 31],
      lead: { inst: 'marimba', positions: [7, 15] },
      swing: .1,
      swingPositions: [1, 3, 5, 7, 9, 11, 13, 15],
      sidechain: { depth: .62, hold: .021, release: .032 },
      level: .95,
      bars: [
        {},
        { bass: [0, 3, 6, 8, 10, 12, 14] },
        {},
        { stab: [2, 6, 10, 14, 15] }
      ],
      arrange: [
        { gain: .78, lp: 2400, mute: ['bass', 'stab'], pat: { hat: 2 } },
        { gain: .8, lp: 3000, mute: ['bass', 'stab'], pat: { hat: 2 } },
        { gain: .88, lp: 5000, mute: ['stab'], snareFill: [14, 15] },
        { gain: .9, lp: 6000, mute: ['stab'], snareFill: [14, 15] },
        { gain: 1 },
        { gain: 1 },
        { gain: 1 },
        { gain: .7, lp: 700, mute: ['kick', 'bass', 'clap'], snareFill: [] },
        { gain: .95, lp: 12000 },
        { gain: 1 },
        { gain: 1 },
        { gain: .88, lp: 1800, lpEnd: 14000, mute: ['bass', 'stab'], snareFill: [8, 10, 12, 14] },
        { gain: 1, lp: 18000 },
        { gain: 1 },
        { gain: 1 },
        { gain: .92, lp: 16000, snareFill: [12, 13, 14, 15] }
      ]
    },
    bounce: {
      kick: [0, 3, 6, 10],
      ghostKick: [14],
      snare: [4, 12],
      clap: [4, 12],
      hat: 1,
      hatAccent: [2, 6, 10, 14],
      openHat: [6, 14],
      bass: [2, 6, 10, 14],
      bassOctave: [6, 14],
      stab: [3, 7, 11, 15],
      stabInst: 'organ',
      chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]],
      roots: [33, 29, 31, 28],
      lead: { inst: '8bit', positions: [7, 15] },
      swing: .24,
      swingPositions: [1, 3, 5, 7, 9, 11, 13, 15],
      sidechain: { depth: .55, hold: .018, release: .027 },
      level: 1,
      bars: [
        {},
        { ghostKick: [14, 15] },
        {},
        { stab: [3, 7, 11, 15, 14] }
      ],
      arrange: [
        { gain: .8, lp: 3000, mute: ['bass', 'stab'], pat: { hat: 2 } },
        { gain: .82, lp: 3600, mute: ['bass', 'stab'], pat: { hat: 2 } },
        { gain: .88, lp: 6000, mute: ['stab'], snareFill: [14, 15] },
        { gain: .9, lp: 7000, mute: ['stab'], snareFill: [14, 15] },
        { gain: 1 },
        { gain: 1 },
        { gain: 1 },
        { gain: .75, lp: 900, mute: ['kick', 'clap'], snareFill: [] },
        { gain: .95, lp: 12000 },
        { gain: 1 },
        { gain: 1 },
        { gain: .9, lp: 2500, lpEnd: 16000, mute: ['stab'], snareFill: [8, 9, 10, 11, 12, 13, 14, 15] },
        { gain: 1, lp: 18000 },
        { gain: 1 },
        { gain: 1 },
        { gain: .95, lp: 16000, snareFill: [13, 14, 15] }
      ]
    },
    chill: {
      kick: [0, 7, 10],
      ghostKick: [14],
      snare: [8],
      clap: [],
      hat: 1,
      hatAccent: [2, 6, 10, 14],
      openHat: [6, 14],
      bass: [0, 6, 10, 14],
      bassOctave: [10],
      stab: [],
      stabInst: 'pad',
      chords: [[50, 53, 57, 60], [55, 58, 62, 65], [48, 52, 55, 59], [45, 48, 52, 55]],
      roots: [38, 43, 36, 33],
      lead: { inst: 'harp', positions: [5, 13] },
      swing: .2,
      swingPositions: [1, 3, 5, 7, 9, 11, 13, 15],
      sidechain: { depth: .7, hold: .03, release: .045 },
      level: .74,
      bars: [
        {},
        {},
        {},
        { ghostKick: [14], snare: [8] }
      ],
      arrange: [
        { gain: .78, lp: 3500, mute: ['hat', 'snare', 'bass'] },
        { gain: .8, lp: 4000, mute: ['hat', 'snare', 'bass'] },
        { gain: .85, lp: 5000, mute: ['bass'] },
        { gain: .85, lp: 5200, mute: ['bass'], snareFill: [14] },
        { gain: .92, lp: 6000 },
        { gain: .92, lp: 6000 },
        { gain: .92, lp: 6000 },
        { gain: .72, lp: 900, mute: ['kick', 'snare', 'hat'], snareFill: [] },
        { gain: .9, lp: 7000 },
        { gain: .95, lp: 7000 },
        { gain: .95, lp: 7000 },
        { gain: .88, lp: 1800, lpEnd: 9000, mute: ['lead'], snareFill: [10, 12] },
        { gain: 1, lp: 10000 },
        { gain: 1, lp: 10000 },
        { gain: 1, lp: 10000 },
        { gain: .9, lp: 9500, snareFill: [14, 15] }
      ]
    }
  };

  const PAD_SWING_POSITIONS = [1, 3, 5, 7, 9, 11, 13, 15];

  function padBarPattern(groove, bar) {
    const override = groove.bars && groove.bars[bar];
    return override ? Object.assign({}, groove, override) : groove;
  }

  function schedulePadBackingStep(step, when, id) {
    const groove = PAD_GROOVES[id] || PAD_GROOVES.sunny;
    const position = step % 16;
    const barOfLoop = Math.floor(step / 16) % 16;
    const bar = barOfLoop % 4;
    const stepDur = padStepDuration(id);
    const swingPositions = groove.swingPositions || PAD_SWING_POSITIONS;
    const swingMs = (groove.swing || 0) * stepDur * (swingPositions.indexOf(position) >= 0 ? 1 : 0);
    const t = when + swingMs;
    const arr = (groove.arrange && groove.arrange[barOfLoop]) || {};
    const base = padBarPattern(groove, bar);
    const pattern = arr.pat ? Object.assign({}, base, arr.pat) : base;
    const muted = arr.mute || [];
    const on = (key) => muted.indexOf(key) < 0;
    const level = (groove.level || 1) * (arr.gain === undefined ? 1 : arr.gain);
    const human = (ms) => (Math.random() - .5) * ((ms || 6) / 1000);
    const vary = (value) => value * (.92 + Math.random() * .16);
    const fill = arr.snareFill || (bar === 3 && position >= 13 ? [position] : []);

    const kick = on('kick') && (pattern.kick.indexOf(position) >= 0 || pattern.ghostKick.indexOf(position) >= 0);
    const snare = on('snare') && (pattern.snare.indexOf(position) >= 0 || fill.indexOf(position) >= 0);
    const hat = on('hat') && position % pattern.hat === 0;
    const bass = on('bass') && pattern.bass.indexOf(position) >= 0;
    const chord = on('stab') && (pattern.stab.indexOf(position) >= 0 || (id === 'chill' && position % 8 === 0));
    emitPadBeat(step, t, id, { kick, snare, hat, bass, chord, bar, barOfLoop, swingMs, gain: level });

    if (kick) {
      const ghost = pattern.ghostKick.indexOf(position) >= 0 && pattern.kick.indexOf(position) < 0;
      padDrumSound('drum:kick', t + human(4), vary((ghost ? .42 : position === 0 ? .98 : .86) * level), true);
      if (!ghost) padPump(t, groove.sidechain);
    }
    if (snare) {
      const isFill = fill.indexOf(position) >= 0;
      padDrumSound('drum:snare', t + human(8) + .004, vary((isFill ? .58 : .84) * level), true);
    }
    if (on('clap') && pattern.clap.indexOf(position) >= 0 && id !== 'chill') {
      padDrumSound('drum:clap', t + .006, vary(.5 * level), true);
    }
    if (id === 'chill' && bar === 3 && position === 15) padDrumSound('drum:clap', t, .3 * level, true);
    if (hat) {
      const open = pattern.openHat.indexOf(position) >= 0;
      const accent = pattern.hatAccent.indexOf(position) >= 0;
      padDrumSound(open ? 'drum:openhat' : 'drum:hat', t + human(open ? 4 : 6), vary((accent ? .44 : .28) * level), true);
    }
    if (bass) {
      const octave = pattern.bassOctave.indexOf(position) >= 0 ? 12 : 0;
      const long = id === 'chill' ? (position === 0 ? 3.6 : 2.2) : position === 0 ? 2.4 : 1.2;
      padInstrumentTone('bass', pattern.roots[bar] + octave, t + human(4), long, vary(.58 * level), { bus: 'tonal' });
    }
    if (on('stab') && pattern.stab.indexOf(position) >= 0) {
      const length = id === 'chill' ? 13.5 : position === 7 ? 1.5 : .9;
      pattern.chords[bar].forEach((midi) => padInstrumentTone(pattern.stabInst, midi, t + human(8) - .003, length, vary(.3 * level), {
        bus: 'tonal', delaySend: .18, reverbPreset: 'plate', reverbWet: .12
      }));
    }
    if (id === 'chill' && position % 8 === 0) {
      pattern.chords[bar].forEach((midi) => padInstrumentTone('pad', midi, t, position === 0 ? 7.5 : 7.2, .22 * level, {
        bus: 'tonal', reverbPreset: 'room', reverbWet: .1
      }));
    }
    if (on('lead') && pattern.lead && pattern.lead.positions.indexOf(position) >= 0) {
      const midi = pattern.chords[bar][1] + 12 + (position % 4 === 0 ? 12 : 0);
      padInstrumentTone(pattern.lead.inst, midi, t + human(8), id === 'chill' ? 2.4 : 1.2, vary(.16 * level), {
        bus: 'tonal', delaySend: .22
      });
    }
    if (arr.fillHat && position >= 14) padDrumSound('drum:hat', t + .03, .3 * level, true);

    // 小节级低通：breakdown 闷住、build 小节从 lp 扫到 lpEnd。
    if (arr.lp && padBackingFilter) {
      const hz = arr.lpEnd ? arr.lp * Math.pow(arr.lpEnd / arr.lp, position / 16) : arr.lp;
      padBackingFilter.frequency.setTargetAtTime(hz, when, stepDur * .5);
    }
  }

  function runPadBackingScheduler() {
    if (!audioCtx || !padBackingId) return;
    const stepDur = padStepDuration(padBackingId);
    const loopSteps = window.PadGrooves ? window.PadGrooves.PAD_LOOP_STEPS : PAD_LOOP_STEPS;
    while (padBackingNextTime < audioCtx.currentTime + .12) {
      padScheduleViaGrooves(padBackingStep, padBackingNextTime, padBackingId);
      padBackingStep = (padBackingStep + 1) % loopSteps;
      padBackingNextTime += stepDur;
    }
  }

  function clearPadBacking() {
    clearInterval(padBackingTimer);
    padBackingTimer = null;
    padBackingId = null;
    padBeatTiming = null;
    padCombo = 0;
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
      if (padBackingFilter) padBackingFilter.frequency.setTargetAtTime(18000, audioCtx.currentTime, .02);
      runPadBackingScheduler();
      padBackingTimer = setInterval(runPadBackingScheduler, 25);
    } catch (_) {
      showToast('底奏暂时无法启动，请再敲一下');
    }
  }

  // 松开手指：短按最多卡到 0.2s 再收；长按松开则立刻停（不拖到采样结尾）。
  function releasePadSample(slot) {
    const id = slot && slot.source;
    const held = id ? padHeldSamples.get(id) : null;
    if (!held || !audioCtx) return;
    padHeldSamples.delete(id);
    const now = audioCtx.currentTime;
    const tapLimit = held.start + .2;
    try {
      if (now < tapLimit) {
        held.gain.gain.setTargetAtTime(0, tapLimit, .008);
        held.source.stop(tapLimit + .03);
      } else {
        held.gain.gain.setTargetAtTime(0, now, .006);
        held.source.stop(now + .025);
      }
    } catch (_) { /* 已经自然结束 */ }
  }

  async function hitPadSource(slot) {
    try {
      await ensureAudio();
      const now = audioCtx.currentTime;
      padDuckForUser(now + .005);

      // 卡拍判定：以底奏最近的 16 分网格为基准，45ms 内算「完美」，90ms 内算「不错」。
      let rating = null;
      let errorMs = null;
      if (padBackingId && padBeatTiming && padBeatTiming.stepDur) {
        const stepDur = padBeatTiming.stepDur;
        const phase = ((now - padBeatTiming.at) % stepDur + stepDur) % stepDur;
        errorMs = Math.min(phase, stepDur - phase) * 1000;
        rating = errorMs <= 45 ? 'perfect' : errorMs <= 90 ? 'good' : 'off';
        padCombo = rating === 'off' ? 0 : padCombo + 1;
        window.dispatchEvent(new CustomEvent('meme-pad-rating', {
          detail: { rating, combo: padCombo, errorMs: Math.round(errorMs), source: slot.source }
        }));
      }
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
      // 采样区间固定不随机：同一个按键永远从裁剪好的起点播到采样结尾。
      // 不同按键靠各自的音符（pad 槽位里的 midi）改变 pitch，从而听出不同的“位置/音色”。
      const note = { midi: slot.midi, length: 2, reverbPreset: 'none', padBus: true, padHit: true };
      triggerSound(slot.source, nearestPitchRow(slot.midi), now + .005, false, note);
      flashMeme(slot.source, nearestPitchRow(slot.midi));
    } catch (_) {
      showToast('声音还没有准备好，请再敲一下');
    }
  }

  function initPadStage() {
    if (!window.MemePadStage) return;
    const samples = memes.map((meme) => ({ kind: 'sample', source: meme.id, title: meme.title, sub: meme.sub, image: meme.image, padImage: meme.padImage, color: meme.color }));
    const instrumentNotes = musicData.instruments.map((instrument) => ({ kind: 'note', source: `instrument:${instrument.id}`, title: instrument.title, sub: instrument.description, symbol: instrument.symbol, color: instrument.color }));
    window.MemePadStage.init({
      library: { sample: samples, note: instrumentNotes, drum: padDrums },
      sourceInfo: padSourceInfo,
      isUnlocked: padSourceUnlocked,
      hit: hitPadSource,
      release: releasePadSample,
      setBacking: setPadBacking,
      currentBacking: () => padBackingId,
      loopName: (id) => padLoopNames[id] || padLoopNames.sunny,
      toast: showToast
    });
  }

  // ── 三个独立页面：#/pad 打击垫、#/backpack 卡带背包、#/studio 线谱+曲库 ──
  const PAGE_ROUTES = {
    pad: ['#pad-home'],
    backpack: ['.backpack'],
    studio: ['.studio-layout'],
    works: ['.songbook']
  };
  const PAGE_SECTIONS = ['#pad-home', '.studio-layout', '.backpack', '.songbook'];
  function currentPage() {
    const raw = (location.hash || '').replace(/^#\/?/, '').split(/[/?]/)[0];
    return PAGE_ROUTES[raw] ? raw : 'pad';
  }
  function applyPage() {
    const route = currentPage();
    document.body.dataset.page = route;
    PAGE_SECTIONS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((section) => {
        section.hidden = PAGE_ROUTES[route].indexOf(selector) < 0;
      });
    });
    document.querySelectorAll('.page-nav a').forEach((link) => {
      const active = link.dataset.route === route;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.title = route === 'backpack' ? '采样卡带背包图鉴 · 梗图音乐坊'
      : route === 'studio' ? '线谱音序器 · 梗图音乐坊'
      : route === 'works' ? '作品背包 · 梗图音乐坊' : '梗图音乐坊';
    if (route !== 'pad') window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', applyPage);

  function bindControls() {
    $('#play-button').addEventListener('click', togglePlay);
    $('#record-button').addEventListener('click', () => recording ? finishRecording() : startRecording());

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
    bindChoiceWheel('#reverb-wheel', () => {
      const note = selectedNote();
      return note ? (note.reverbPreset || reverbPreset) : reverbPreset;
    }, async (value) => {
      const note = selectedNote();
      if (note) {
        note.reverbPreset = value;
        note.reverbWet = value === 'none' ? 0 : Math.round(reverbPresets[value].wet * 10) / 10;
        saveState(); syncNoteFx();
        const names = { none: '无混响', room: '小房间', hall: '大厅', church: '教堂', plate: '金属板' };
        showToast(`这个音：${names[value]}`);
        return;
      }
      if (value === reverbPreset) return;
      reverbPreset = value;
      reverbWet = Math.round(reverbPresets[reverbPreset].wet * 10) / 10;
      await ensureAudio(); applyReverb(); saveState();
      const names = { none: '无混响', room: '小房间', hall: '大厅', church: '教堂', plate: '金属板' };
      showToast(`混响预设：${names[reverbPreset]}`);
    });
    bindChoiceWheel('#reverb-wet-wheel', () => {
      const note = selectedNote();
      if (!note) return reverbWet;
      const preset = note.reverbPreset || reverbPreset;
      return Math.round((note.reverbWet ?? (reverbPresets[preset]?.wet ?? 0)) * 10) / 10;
    }, async (value) => {
      const note = selectedNote();
      if (note) {
        note.reverbWet = clamp(Number(value), 0, .7);
        if (!note.reverbPreset) note.reverbPreset = reverbPreset === 'none' ? 'plate' : reverbPreset;
        saveState(); syncNoteFx();
        $('#play-status').textContent = `这个音的湿声 ${Math.round(note.reverbWet * 100)}%`;
        return;
      }
      const wet = Number(value);
      if (wet === reverbWet) return;
      reverbWet = clamp(wet, 0, .7);
      await ensureAudio(); applyReverb(); saveState();
      $('#play-status').textContent = `全局湿声 ${Math.round(reverbWet * 100)}%`;
    });
    bindChoiceWheel('#reverb-decay-wheel', () => {
      const note = selectedNote();
      return Math.round((note?.reverbDecayScale ?? reverbDecayScale) * 100);
    }, (value) => {
      const note = selectedNote();
      if (note) {
        note.reverbDecayScale = Number(value) / 100;
        saveState(); syncNoteFx();
        $('#play-status').textContent = `这个音的混响衰减 ${value}%`;
        return;
      }
      reverbDecayScale = Number(value) / 100;
      refreshReverbImpulses();
      $('#play-status').textContent = `混响衰减 ${value}%`;
    });
    bindChoiceWheel('#reverb-predelay-wheel', () => {
      const note = selectedNote();
      return Math.round((note?.reverbPreDelaySec ?? reverbPreDelaySec) * 1000);
    }, (value) => {
      const note = selectedNote();
      if (note) {
        note.reverbPreDelaySec = Number(value) / 1000;
        saveState(); syncNoteFx();
        $('#play-status').textContent = `这个音的预延迟 ${value}ms`;
        return;
      }
      reverbPreDelaySec = Number(value) / 1000;
      refreshReverbImpulses();
      $('#play-status').textContent = `混响预延迟 ${value}ms`;
    });
    bindChoiceWheel('#reverb-damp-wheel', () => {
      const note = selectedNote();
      return Math.round(note?.reverbDamping ?? reverbDamping);
    }, (value) => {
      const note = selectedNote();
      if (note) {
        note.reverbDamping = Number(value);
        saveState(); syncNoteFx();
        $('#play-status').textContent = `这个音的混响亮度 ${value}Hz`;
        return;
      }
      reverbDamping = Number(value);
      refreshReverbImpulses();
      $('#play-status').textContent = `混响亮度 ${value}Hz`;
    });
    syncChoiceWheel('#reverb-decay-wheel', Math.round(reverbDecayScale * 100));
    syncChoiceWheel('#reverb-predelay-wheel', Math.round(reverbPreDelaySec * 1000));
    syncChoiceWheel('#reverb-damp-wheel', Math.round(reverbDamping));
    $('#delete-note').addEventListener('click', () => { if (selectedNoteId) removeNoteById(selectedNoteId); });
    $('#clear-button').addEventListener('click', () => {
      if (!notes.length && !micBlob && !micBuffer) { showToast('谱面已经是空的'); return; }
      stopPlayback(); clearVocalTake(); notes = []; renderRuler(); renderStaff(); saveState();
      $('#play-status').textContent = '谱面与人声已清空，放一颗音符开始吧';
      showToast('已清空线谱与人声');
    });
    $('#replace-melody').addEventListener('click', replaceMainMelodyWithSelection);
    $('#demo-button').addEventListener('click', loadDemo);
    $('#import-project').addEventListener('click', () => $('#project-file').click());
    $('#project-file').addEventListener('change', async (event) => {
      const file = event.target.files && event.target.files[0];
      event.target.value = '';
      if (!file) return;
      try {
        const project = JSON.parse(await file.text());
        loadSynthProject(project);
      } catch (_) {
        showToast('读取失败：请选择 ACE 工程包 JSON');
      }
    });
    $('#make-tape').addEventListener('click', makeTape);
    $('#staff-scroll').addEventListener('scroll', syncTapeScroll, { passive: true });
    window.addEventListener('resize', syncTapeScroll, { passive: true });
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
    window.addEventListener('resize', updatePlayhead);
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
  renderTapeStrip();
  renderBackpack();
  refreshScale(pitchCount, false);
  applyReverb();
  // 手机画幅预览：把应用装进 390×844 的 iframe 里，媒体查询会按手机宽度重新排版
  function bindPhonePreview() {
    const overlay = $('#phone-preview');
    const frame = $('#phone-preview-frame');
    if (!overlay || !frame) return;
    const open = () => {
      frame.src = `${location.pathname.replace(/[^/]*$/, '')}?phone=1${location.hash || '#/pad'}`;
      overlay.hidden = false;
      document.body.classList.add('phone-preview-open');
    };
    const close = () => {
      overlay.hidden = true;
      frame.src = 'about:blank';
      document.body.classList.remove('phone-preview-open');
    };
    $('#phone-preview-open')?.addEventListener('click', open);
    $('#phone-preview-close')?.addEventListener('click', close);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !overlay.hidden) close();
    });
  }

  bindPhonePreview();
  bindStaff();
  bindControls();
  bindStaffGestures();
  applyPage();
  loadFriendwineBacking();
  // 运输栏单排：鼠标滚轮在空白处可横向滚动
  const transportRow = $('.transport-row');
  if (transportRow) {
    transportRow.addEventListener('wheel', (event) => {
      if (event.target.closest('.mini-wheel')) return;
      if (transportRow.scrollWidth <= transportRow.clientWidth) return;
      event.preventDefault();
      transportRow.scrollLeft += event.deltaY + event.deltaX;
    }, { passive: false });
  }
  bindDialogs();
  initPadStage();
  preloadPadSamples();
  updateTransport();
  restoreVocalTake();
})();
