/* synth-engine.js —— 预设驱动、参数化的网页合成器
 * 目标：把原来 if-else 写死的音色重构为“预设表 + 通用渲染器”，
 * 每个预设由「振荡器层 / 噪声层 / 滤波包络 / 音量 ADSR / 力度响应 / 颤音」描述，
 * 新增音色 == 新增一条数据，不再改代码。
 *
 * 对外 API：
 *   window.MemeSynth.presets          // { id: preset }
 *   window.MemeSynth.has(id)
 *   window.MemeSynth.play({ ctx, destination, id, midi, when, duration, volume, velocity, legato, noiseBuffer, trackSource })
 *   window.MemeSynth.drumKinds
 */
(function (root) {
  'use strict';

  const midiToHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

  // 层默认值
  const L = (wave, ratio, gain, opts) => Object.assign({
    wave, ratio, gain,
    detune: 0, pan: 0,
    attack: .006, decay: .08, sustain: .72, release: .12,
    cutoff: 6000, q: .7
  }, opts || {});

  // 预设表。id 与 music-data.js / 卡带系统保持一致。
  const presets = {
    // ── 键盘 ──
    piano: {
      gain: .9, velGain: .55, velCut: .5,
      layers: [
        L('triangle', 1, .32, { attack: .003, decay: .22, sustain: .18, release: .18, cutoff: 5200 }),
        L('sine', 2, .1, { attack: .002, decay: .16, sustain: .05, release: .14, cutoff: 6000 }),
        L('sine', 3, .035, { attack: .001, decay: .1, sustain: .02, release: .1, cutoff: 7000 })
      ]
    },
    grandPiano: {
      gain: .95, velGain: .62, velCut: .55,
      layers: [
        L('triangle', 1, .3, { attack: .002, decay: .3, sustain: .12, release: .22, cutoff: 4200 }),
        L('sine', 2.01, .09, { attack: .002, decay: .2, sustain: .03, release: .16, cutoff: 5200 }),
        L('sine', 3.99, .04, { attack: .001, decay: .12, sustain: .01, release: .1, cutoff: 6200 }),
        L('triangle', 1, .07, { detune: 5, attack: .002, decay: .25, sustain: .08, release: .18, cutoff: 3000 })
      ]
    },
    uprightPiano: {
      gain: .85, velGain: .5, velCut: .45,
      layers: [
        L('triangle', 1, .3, { attack: .004, decay: .18, sustain: .2, release: .14, cutoff: 3000 }),
        L('sawtooth', 2, .04, { attack: .003, decay: .1, sustain: .04, release: .1, cutoff: 2400 }),
        L('sine', .5, .09, { attack: .004, decay: .2, sustain: .12, release: .14, cutoff: 1800 })
      ]
    },
    electricPiano: {
      gain: .9, velGain: .65, velCut: .5,
      layers: [
        L('sine', 1, .3, { attack: .003, decay: .35, sustain: .25, release: .18, cutoff: 5000 }),
        L('sine', 2, .11, { attack: .002, decay: .2, sustain: .08, release: .14, cutoff: 6000 }),
        L('sine', 3, .045, { attack: .001, decay: .12, sustain: .02, release: .1, cutoff: 7000 }),
        L('sine', .5, .07, { attack: .005, decay: .3, sustain: .2, release: .2, cutoff: 2500 })
      ]
    },
    clavinet: {
      gain: 1.5, velGain: .7, velCut: .6,
      layers: [
        L('square', 1, .12, { attack: .002, decay: .1, sustain: .2, release: .08, cutoff: 3000, q: 2 }),
        L('triangle', 2, .1, { attack: .002, decay: .08, sustain: .1, release: .07, cutoff: 3800 }),
        L('sine', .5, .1, { attack: .003, decay: .12, sustain: .18, release: .1, cutoff: 1600 })
      ]
    },
    organ: {
      gain: .8, velGain: .2, velCut: .2,
      layers: [
        L('sine', 1, .18, { attack: .03, decay: .02, sustain: .9, release: .12 }),
        L('sine', 2, .1, { attack: .03, decay: .02, sustain: .85, release: .12 }),
        L('sine', 3, .055, { attack: .03, decay: .02, sustain: .8, release: .12 }),
        L('sine', .5, .07, { attack: .04, decay: .02, sustain: .85, release: .14 })
      ]
    },
    pad: {
      gain: 0.9, velGain: .25, velCut: .3,
      layers: [
        L('sawtooth', 1, .06, { detune: -8, attack: .35, decay: .2, sustain: .85, release: .35, cutoff: 1400 }),
        L('sawtooth', 1, .06, { detune: 8, attack: .38, decay: .2, sustain: .85, release: .35, cutoff: 1400 }),
        L('sine', 1, .12, { attack: .3, decay: .2, sustain: .9, release: .4, cutoff: 2200 }),
        L('triangle', 2, .04, { detune: 4, attack: .4, sustain: .8, release: .4, cutoff: 1800 })
      ],
      vibrato: { rate: .28, depth: .004, delay: .2 }
    },

    // ── 弦乐 ──
    violin: {
      gain: .85, velGain: .35, velCut: .35,
      layers: [
        L('sawtooth', 1, .12, { detune: -4, attack: .14, decay: .1, sustain: .78, release: .22, cutoff: 2800 }),
        L('triangle', 1, .18, { detune: 4, attack: .12, decay: .1, sustain: .8, release: .22, cutoff: 3400 }),
        L('sine', 2, .04, { attack: .16, sustain: .7, release: .25 })
      ],
      vibrato: { rate: 5.4, depth: .009, delay: .12 }
    },
    cello: {
      gain: .9, velGain: .4, velCut: .4,
      layers: [
        L('sawtooth', .5, .12, { detune: -4, attack: .1, decay: .1, sustain: .75, release: .2, cutoff: 2200 }),
        L('triangle', .5, .1, { detune: 4, attack: .09, sustain: .78, release: .22, cutoff: 2600 }),
        L('sine', 1, .04, { attack: .12, sustain: .7, release: .24 })
      ],
      vibrato: { rate: 5, depth: .007, delay: .16 }
    },
    contrabass: {
      gain: .95, velGain: .4, velCut: .3,
      layers: [
        L('sine', .25, .26, { attack: .02, decay: .1, sustain: .6, release: .2, cutoff: 1200 }),
        L('sawtooth', .25, .07, { attack: .03, decay: .08, sustain: .4, release: .18, cutoff: 900 }),
        L('triangle', .5, .05, { attack: .02, sustain: .5, release: .2 })
      ]
    },
    stringsHigh: {
      gain: 1.5, velGain: .3, velCut: .4,
      layers: [
        L('sawtooth', 1, .06, { detune: -6, attack: .18, sustain: .8, release: .3, cutoff: 4000 }),
        L('sawtooth', 1, .055, { detune: 6, attack: .2, sustain: .8, release: .3, cutoff: 3000 }),
        L('triangle', 1, .05, { attack: .16, sustain: .82, release: .3, cutoff: 2400 }),
        L('sawtooth', 2, .025, { attack: .22, sustain: .7, release: .3, cutoff: 2600 })
      ],
      vibrato: { rate: 4.6, depth: .006, delay: .2 }
    },
    stringsMid: {
      gain: 1.2, velGain: .3, velCut: .35,
      layers: [
        L('sawtooth', .5, .065, { detune: -6, attack: .18, sustain: .8, release: .3, cutoff: 2600 }),
        L('sawtooth', .5, .06, { detune: 6, attack: .2, sustain: .8, release: .3, cutoff: 2200 }),
        L('triangle', .5, .055, { attack: .16, sustain: .82, release: .3, cutoff: 2000 }),
        L('sawtooth', 1, .025, { attack: .22, sustain: .7, release: .3, cutoff: 2200 })
      ],
      vibrato: { rate: 4.8, depth: .006, delay: .2 }
    },
    stringsLow: {
      gain: .9, velGain: .3, velCut: .3,
      layers: [
        L('sawtooth', .25, .07, { detune: -5, attack: .2, sustain: .8, release: .32, cutoff: 1600 }),
        L('sawtooth', .25, .065, { detune: 5, attack: .22, sustain: .8, release: .32, cutoff: 1400 }),
        L('triangle', .25, .06, { attack: .18, sustain: .82, release: .32, cutoff: 1500 }),
        L('sine', .5, .05, { attack: .24, sustain: .75, release: .34, cutoff: 1000 })
      ],
      vibrato: { rate: 4.4, depth: .005, delay: .24 }
    },
    stringsPizz: {
      gain: 1.6, velGain: .6, velCut: .5,
      layers: [
        L('triangle', 1, .22, { attack: .004, decay: .14, sustain: .02, release: .12, cutoff: 3200 }),
        L('sawtooth', 2, .05, { attack: .003, decay: .08, sustain: .01, release: .08, cutoff: 2600 }),
        L('sine', .5, .06, { attack: .003, decay: .12, sustain: .02, release: .1, cutoff: 1200 })
      ]
    },

    // ── 铜管 ──
    trumpet: {
      gain: .95, velGain: .55, velCut: .5,
      layers: [
        L('sawtooth', 1, .13, { detune: -3, attack: .05, decay: .1, sustain: .7, release: .12, cutoff: 2000 }),
        L('square', 1, .05, { detune: 3, attack: .045, sustain: .62, release: .12, cutoff: 1700 }),
        L('sine', 2, .035, { attack: .055, sustain: .62, release: .12 })
      ],
      vibrato: { rate: 5.6, depth: .004, delay: .2 }
    },
    trombone: {
      gain: .95, velGain: .5, velCut: .45,
      layers: [
        L('sawtooth', 1, .12, { detune: -3, attack: .06, sustain: .7, release: .14, cutoff: 1500 }),
        L('square', 1, .05, { detune: 3, attack: .055, sustain: .62, release: .14, cutoff: 1400 }),
        L('sine', .5, .06, { attack: .07, sustain: .65, release: .16 })
      ],
      vibrato: { rate: 4.8, depth: .004, delay: .24 }
    },
    horn: {
      gain: .9, velGain: .4, velCut: .35,
      layers: [
        L('sine', 1, .2, { attack: .12, sustain: .75, release: .2, cutoff: 2200 }),
        L('triangle', 1, .09, { detune: 3, attack: .1, sustain: .72, release: .2, cutoff: 1800 }),
        L('sine', 2, .045, { attack: .14, sustain: .6, release: .22 })
      ],
      vibrato: { rate: 4.6, depth: .0035, delay: .28 }
    },
    brassSection: {
      gain: .9, velGain: .5, velCut: .45,
      layers: [
        L('sawtooth', 1, .08, { detune: -7, attack: .06, sustain: .72, release: .16, cutoff: 2000 }),
        L('sawtooth', 1, .08, { detune: 7, attack: .07, sustain: .72, release: .16, cutoff: 2000 }),
        L('square', 1, .04, { detune: -3, attack: .055, sustain: .6, release: .14, cutoff: 1800 }),
        L('triangle', 1, .07, { attack: .06, sustain: .7, release: .16, cutoff: 2400 })
      ]
    },

    // ── 木管 ──
    flute: {
      gain: .85, velGain: .35, velCut: .35,
      layers: [
        L('sine', 1, .28, { attack: .07, decay: .1, sustain: .72, release: .16, cutoff: 5000 }),
        L('triangle', 2, .04, { attack: .09, sustain: .6, release: .16, cutoff: 4000 })
      ],
      noise: [{ gain: .02, freq: 2600, q: .8, attack: .05, decay: .15 }],
      vibrato: { rate: 5.2, depth: .006, delay: .18 }
    },
    clarinet: {
      gain: .9, velGain: .4, velCut: .4,
      layers: [
        L('square', 1, .09, { attack: .06, sustain: .72, release: .14, cutoff: 2400 }),
        L('triangle', 1, .15, { detune: 3, attack: .065, sustain: .74, release: .14, cutoff: 2000 }),
        L('sine', 2, .04, { attack: .08, sustain: .6, release: .16 })
      ],
      vibrato: { rate: 5.4, depth: .004, delay: .24 }
    },
    sax: {
      gain: .9, velGain: .5, velCut: .45,
      layers: [
        L('sawtooth', 1, .1, { detune: -4, attack: .07, sustain: .64, release: .14, cutoff: 1500 }),
        L('triangle', 1, .15, { detune: 4, attack: .06, sustain: .7, release: .14, cutoff: 1900 }),
        L('sine', 2, .035, { attack: .08, sustain: .58, release: .16 })
      ],
      noise: [{ gain: .012, freq: 1800, q: .9, attack: .04, decay: .1 }],
      vibrato: { rate: 5.6, depth: .007, delay: .16 }
    },
    saxTenor: {
      gain: .92, velGain: .5, velCut: .45,
      layers: [
        L('sawtooth', .5, .11, { detune: -4, attack: .075, sustain: .66, release: .15, cutoff: 1300 }),
        L('triangle', .5, .14, { detune: 4, attack: .065, sustain: .7, release: .15, cutoff: 1600 }),
        L('sine', 1, .04, { attack: .09, sustain: .58, release: .17 })
      ],
      noise: [{ gain: .012, freq: 1500, q: .9, attack: .04, decay: .1 }],
      vibrato: { rate: 5.2, depth: .007, delay: .18 }
    },
    dizi: {
      gain: .85, velGain: .45, velCut: .4,
      layers: [
        L('sine', 1, .25, { attack: .035, decay: .1, sustain: .72, release: .12, cutoff: 5200 }),
        L('triangle', 2, .045, { attack: .045, sustain: .6, release: .12, cutoff: 4200 }),
        L('sine', 3, .02, { attack: .05, sustain: .5, release: .12, cutoff: 5000 })
      ],
      noise: [{ gain: .018, freq: 3200, q: 1, attack: .02, decay: .08 }],
      vibrato: { rate: 6.2, depth: .007, delay: .1 }
    },

    // ── 吉他与拨弦 ──
    guitar: {
      gain: .85, velGain: .55, velCut: .45,
      layers: [
        L('triangle', 1, .26, { attack: .003, decay: .2, sustain: .08, release: .16, cutoff: 2600 }),
        L('sawtooth', 2, .05, { detune: 3, attack: .002, decay: .1, sustain: .03, release: .1, cutoff: 2200 }),
        L('sine', .5, .07, { attack: .004, decay: .22, sustain: .06, release: .18, cutoff: 1200 })
      ]
    },
    guitarElectric: {
      gain: 1.2, velGain: .55, velCut: .5,
      layers: [
        L('sawtooth', 1, .1, { attack: .004, decay: .18, sustain: .2, release: .12, cutoff: 2200, q: 1.6 }),
        L('triangle', 1, .14, { detune: 4, attack: .003, decay: .16, sustain: .14, release: .12, cutoff: 2400 }),
        L('square', 2, .035, { attack: .002, decay: .1, sustain: .05, release: .1, cutoff: 2600 })
      ]
    },
    ukulele: {
      gain: 1.6, velGain: .6, velCut: .5,
      layers: [
        L('triangle', 1, .24, { attack: .002, decay: .12, sustain: .02, release: .1, cutoff: 3200 }),
        L('sawtooth', 2, .04, { attack: .002, decay: .07, sustain: .01, release: .08, cutoff: 2600 }),
        L('sine', .5, .05, { attack: .003, decay: .1, sustain: .02, release: .1, cutoff: 1400 })
      ]
    },
    harp: {
      gain: .8, velGain: .5, velCut: .45,
      layers: [
        L('triangle', 1, .22, { attack: .003, decay: .3, sustain: .06, release: .24, cutoff: 4000 }),
        L('sine', 2, .09, { attack: .002, decay: .2, sustain: .02, release: .18, cutoff: 4600 }),
        L('sine', 3, .035, { attack: .002, decay: .12, sustain: .01, release: .14, cutoff: 5200 })
      ]
    },
    marimba: {
      gain: 1.3, velGain: .55, velCut: .45,
      layers: [
        L('sine', 1, .3, { attack: .002, decay: .1, sustain: .01, release: .07, cutoff: 3000 }),
        L('sine', 4, .06, { attack: .001, decay: .05, sustain: .005, release: .05, cutoff: 6000 }),
        L('sine', 10, .012, { attack: .001, decay: .03, sustain: .002, release: .04, cutoff: 8000 })
      ]
    },

    // ── 贝斯 ──
    bass: {
      gain: .95, velGain: .5, velCut: .4,
      layers: [
        L('sine', 1, .28, { attack: .005, decay: .08, sustain: .55, release: .1, cutoff: 1400 }),
        L('sawtooth', 1, .11, { attack: .004, decay: .06, sustain: .3, release: .09, cutoff: 800, q: 1.2 }),
        L('sine', .5, .12, { attack: .006, sustain: .45, release: .1, cutoff: 600 })
      ]
    },
    subBass: {
      gain: 1, velGain: .25, velCut: .2,
      layers: [
        L('sine', .5, .32, { attack: .01, decay: .1, sustain: .7, release: .16, cutoff: 500 }),
        L('sine', 1, .11, { attack: .012, sustain: .6, release: .16, cutoff: 600 }),
        L('triangle', .5, .04, { attack: .02, sustain: .45, release: .16, cutoff: 400 })
      ]
    },

    // ── 合成器 ──
    synth: {
      gain: .85, velGain: .4, velCut: .5,
      layers: [
        L('square', 1, .12, { detune: -5, attack: .015, decay: .1, sustain: .48, release: .16, cutoff: 2100 }),
        L('sawtooth', 1, .11, { detune: 5, attack: .02, sustain: .42, release: .16, cutoff: 1800 }),
        L('sine', .5, .07, { attack: .02, sustain: .5, release: .16 })
      ]
    },
    synthLead: {
      gain: 1.3, velGain: .5, velCut: .6,
      layers: [
        L('sawtooth', 1, .12, { detune: -4, attack: .02, decay: .08, sustain: .7, release: .14, cutoff: 3200 }),
        L('square', 1, .045, { detune: 4, attack: .015, sustain: .6, release: .12, cutoff: 2800 }),
        L('sine', .5, .05, { attack: .02, sustain: .62, release: .14 })
      ],
      vibrato: { rate: 5.8, depth: .004, delay: .2 }
    },
    synthPluck: {
      gain: 2, velGain: .6, velCut: .55,
      layers: [
        L('sawtooth', 1, .14, { attack: .002, decay: .12, sustain: .02, release: .1, cutoff: 3600 }),
        L('square', 2, .04, { attack: .002, decay: .07, sustain: .01, release: .08, cutoff: 3000 }),
        L('sine', .5, .06, { attack: .003, decay: .1, sustain: .02, release: .1, cutoff: 1200 })
      ]
    },
    synthBell: {
      gain: .8, velGain: .5, velCut: .4,
      layers: [
        L('sine', 1, .22, { attack: .002, decay: .5, sustain: .02, release: .4, cutoff: 6000 }),
        L('sine', 2.76, .06, { attack: .002, decay: .3, sustain: .01, release: .3, cutoff: 7000 }),
        L('sine', 5.04, .03, { attack: .001, decay: .2, sustain: .005, release: .24, cutoff: 8000 })
      ]
    },
    '8bit': {
      gain: 1.2, velGain: .35, velCut: .5,
      layers: [
        L('square', 1, .15, { attack: .002, decay: .08, sustain: .3, release: .06, cutoff: 6500 }),
        L('square', 2, .04, { attack: .002, sustain: .2, release: .06, cutoff: 6000 }),
        L('sine', .5, .04, { attack: .003, sustain: .28, release: .06 })
      ]
    },

    // ── 鼓组（按音高触发，音高取 midi%12）──
    drumkit: { drumkit: true, gain: 1.15 }
  };

  const drumKinds = ['kick', 'snare', 'hat', 'clap', 'openhat', 'rim'];
  const DRUM_MAP = ['kick', 'kick', 'snare', 'snare', 'hat', 'hat', 'clap', 'clap', 'openhat', 'rim', 'kick', 'snare'];

  // 每个乐器族的默认效果器（reverb 走总线、delaySend 走附点延迟），解决"听起来干巴"。
  const FAMILY_FX = {
    keys: { reverb: 'plate', wet: .12 },
    strings: { reverb: 'hall', wet: .16 },
    brass: { reverb: 'hall', wet: .15 },
    woodwind: { reverb: 'room', wet: .14 },
    pluck: { reverb: 'plate', wet: .11 },
    bass: { reverb: 'none', wet: 0 },
    synth: { reverb: 'plate', wet: .15, delay: .14 },
    drums: { reverb: 'room', wet: .08 }
  };
  const families = {
    keys: ['piano', 'grandPiano', 'uprightPiano', 'electricPiano', 'clavinet', 'organ', 'pad'],
    strings: ['violin', 'cello', 'contrabass', 'stringsHigh', 'stringsMid', 'stringsLow', 'stringsPizz'],
    brass: ['trumpet', 'trombone', 'horn', 'brassSection'],
    woodwind: ['flute', 'clarinet', 'sax', 'saxTenor', 'dizi'],
    pluck: ['guitar', 'guitarElectric', 'ukulele', 'harp', 'marimba'],
    bass: ['bass', 'subBass'],
    synth: ['synth', 'synthLead', 'synthPluck', 'synthBell', '8bit'],
    drums: ['drumkit']
  };
  function familyOf(id) {
    for (const key of Object.keys(families)) if (families[key].includes(id)) return key;
    return 'keys';
  }
  function fxFor(id) {
    const preset = presets[String(id)];
    if (!preset) return null;
    return preset.fx || FAMILY_FX[familyOf(String(id))] || null;
  }

  function ensureNoise(ctx, provided) {
    if (provided && provided.length) return provided;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.5), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // 每个鼓点做轻微饱和与压缩，让鼓皮/响弦更"实"，不靠共享总线也能避免沙子感。
  function drumShape(ctx, out, destination) {
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * 1.7) / Math.tanh(1.7);
    }
    shaper.curve = curve;
    shaper.oversample = '2x';
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -22;
    comp.knee.value = 6;
    comp.ratio.value = 3;
    comp.attack.value = .002;
    comp.release.value = .12;
    out.connect(shaper).connect(comp).connect(destination);
  }

  function playDrum(ctx, destination, kind, when, volume, noiseBuffer, trackSource) {
    const out = ctx.createGain();
    out.gain.value = volume;
    drumShape(ctx, out, destination);
    const register = (node) => (trackSource ? trackSource(node) : node);
    const variation = 0.97 + Math.random() * 0.06;   // 轻微轮换，避免机关枪感
    const osc = (type, freq, dur, gain, endFreq, filterType, filterFreq) => {
      const o = register(ctx.createOscillator());
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(Math.max(18, freq), when);
      if (endFreq) o.frequency.exponentialRampToValueAtTime(Math.max(18, endFreq), when + Math.min(dur * .6, .12));
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(Math.max(.0002, gain), when + .0025);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur * variation);
      let node = o;
      if (filterType) {
        const f = ctx.createBiquadFilter();
        f.type = filterType; f.frequency.value = filterFreq || 2000; f.Q.value = .7;
        o.connect(f); node = f;
      }
      node.connect(g).connect(out);
      o.start(when); o.stop(when + dur * variation + .05);
    };
    const noise = (dur, type, freq, q, gain, attack = .002) => {
      const src = register(ctx.createBufferSource());
      src.buffer = noiseBuffer;
      const f = ctx.createBiquadFilter();
      f.type = type || 'bandpass';
      f.frequency.value = freq || 2000;
      f.Q.value = q == null ? .8 : q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(Math.max(.0002, gain), when + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur * variation);
      src.connect(f).connect(g).connect(out);
      src.start(when); src.stop(when + dur * variation + .03);
    };
    if (kind === 'kick') {
      osc('sine', 112, .4, 1.0, 45, 'lowpass', 300);         // 音高下坠的鼓皮
      osc('sine', 55, .55, .45, 38);                            // 低频鼓腔
      osc('triangle', 125, .07, .12, 80);                      // 少量 boxy 层（太多会变成"啪"）
      osc('square', 700, .025, .10, 380);                      // 鼓槌点击的中频
      noise(.012, 'highpass', 2400, .7, .14);                  // 鼓槌点击
      noise(.02, 'bandpass', 1900, .9, .14);                   // 1–2kHz 打击感
    } else if (kind === 'snare') {
      osc('triangle', 195, .14, .42, 150);                     // 鼓皮音高
      osc('triangle', 330, .1, .26, 280);
      osc('triangle', 520, .07, .34, 400);
      osc('triangle', 720, .05, .16, 560);                     // 300–800Hz 鼓腔
      noise(.14, 'bandpass', 1900, .55, .5);                   // 响弦主体
      noise(.14, 'bandpass', 900, .7, .36);
      noise(.1, 'bandpass', 1400, .8, .2);                    // 中频鼓身
      noise(.05, 'highpass', 5200, .7, .28);                   // 瞬态
    } else if (kind === 'hat') {
      osc('square', 5300, .05, .09, null, 'highpass', 6500);
      osc('square', 7100, .045, .065, null, 'highpass', 6500);
      osc('square', 9400, .04, .05, null, 'highpass', 7000);
      noise(.03, 'highpass', 9000, .7, .05);
    } else if (kind === 'openhat') {
      osc('square', 5300, .18, .06, null, 'highpass', 6500);
      osc('square', 7100, .16, .045, null, 'highpass', 6500);
      osc('square', 9400, .14, .035, null, 'highpass', 7000);
      noise(.12, 'highpass', 9000, .7, .05);
    } else if (kind === 'clap') {
      [0, .012, .026].forEach((offset, index) => {
        const src = register(ctx.createBufferSource());
        src.buffer = noiseBuffer;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.value = 1350 + index * 260; f.Q.value = .9;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, when + offset);
        g.gain.exponentialRampToValueAtTime(.3 - index * .05, when + offset + .004);
        g.gain.exponentialRampToValueAtTime(0.0001, when + offset + .1 - index * .012);
        src.connect(f).connect(g).connect(out);
        src.start(when + offset); src.stop(when + offset + .13);
      });
    } else if (kind === 'rim') {
      osc('triangle', 820, .02, .3, 620);
      noise(.02, 'bandpass', 3200, 1.2, .14);
    }
  }

  // 核心：按预设渲染一个音符
  function play(opts) {
    const ctx = opts.ctx;
    const destination = opts.destination;
    const id = String(opts.id || 'piano');
    const preset = presets[id] || presets.piano;
    const when = num(opts.when, ctx.currentTime);
    const duration = Math.max(0.05, num(opts.duration, .5));
    const volume = clamp01(num(opts.volume, 1));
    const velocity = opts.velocity == null ? .85 : clamp01(opts.velocity);
    const register = opts.trackSource || ((node) => node);
    const noiseBuffer = ensureNoise(ctx, opts.noiseBuffer);
    const velocityGain = 1 - (1 - velocity) * num(preset.velGain, .4);
    const velocityCut = .45 + .55 * velocity;
    const gain = num(preset.gain, .9) * volume * velocityGain;

    if (preset.drumkit) {
      const kind = DRUM_MAP[((Math.round(opts.midi) % 12) + 12) % 12];
      playDrum(ctx, destination, kind, when, gain, noiseBuffer, register);
      return;
    }

    const pan = num(opts.pan, 0);
    const node = ctx.createGain();
    node.gain.value = 1;
    node.connect(destination);
    const master = node;

    // 颤音
    let vibrato = null;
    if (preset.vibrato) {
      const lfo = register(ctx.createOscillator());
      const depth = ctx.createGain();
      lfo.frequency.value = preset.vibrato.rate;
      depth.gain.value = 0;
      depth.gain.setValueAtTime(0, when);
      depth.gain.linearRampToValueAtTime(midiToHz(opts.midi) * preset.vibrato.depth, when + (preset.vibrato.delay || .2));
      lfo.connect(depth);
      lfo.start(when); lfo.stop(when + duration + .1);
      vibrato = depth;
    }

    const end = when + duration;
    (preset.layers || []).forEach((layer) => {
      const layerGain = gain * layer.gain;
      const attack = Math.min(layer.attack, duration * .6);
      const release = Math.min(layer.release, Math.max(.02, duration * .8));
      const decayEnd = Math.min(when + attack + layer.decay, Math.max(when + attack + .01, end - release * .2));
      const osc = register(ctx.createOscillator());
      const filter = ctx.createBiquadFilter();
      const amp = ctx.createGain();
      const panner = ctx.createStereoPanner();
      osc.type = layer.wave;
      osc.frequency.setValueAtTime(midiToHz(opts.midi) * layer.ratio, when);
      osc.detune.value = layer.detune || 0;
      if (vibrato) vibrato.connect(osc.frequency);
      const baseCut = layer.cutoff * velocityCut;
      filter.type = 'lowpass';
      filter.Q.value = layer.q || .7;
      filter.frequency.setValueAtTime(Math.max(120, baseCut), when);
      filter.frequency.exponentialRampToValueAtTime(Math.max(120, baseCut * .55), when + Math.min(.25, duration * .5));
      amp.gain.setValueAtTime(0.0001, when);
      amp.gain.linearRampToValueAtTime(layerGain, when + attack);
      amp.gain.exponentialRampToValueAtTime(Math.max(.0001, layerGain * (layer.sustain ?? .6)), decayEnd);
      amp.gain.exponentialRampToValueAtTime(0.0001, end + release * .2);
      panner.pan.value = Math.max(-1, Math.min(1, (layer.pan || 0) + pan));
      osc.connect(filter).connect(amp).connect(panner).connect(master);
      osc.start(when);
      osc.stop(end + release * .2 + .03);
    });

    (preset.noise || []).forEach((layer) => {
      const src = register(ctx.createBufferSource());
      const filter = ctx.createBiquadFilter();
      const amp = ctx.createGain();
      src.buffer = noiseBuffer;
      filter.type = 'bandpass';
      filter.frequency.value = layer.freq || 2000;
      filter.Q.value = layer.q || .8;
      const a = Math.min(layer.attack || .01, duration * .3);
      const d = Math.min(layer.decay || .1, duration);
      amp.gain.setValueAtTime(0.0001, when);
      amp.gain.exponentialRampToValueAtTime(gain * (layer.gain || .02), when + a);
      amp.gain.exponentialRampToValueAtTime(0.0001, when + a + d);
      src.connect(filter).connect(amp).connect(master);
      src.start(when);
      src.stop(when + a + d + .02);
    });
  }

  root.MemeSynth = {
    presets,
    drumKinds,
    has: (id) => Boolean(presets[String(id)]),
    play,
    fxFor,
    FAMILY_FX,
    familyOf,
    families
  };
})(typeof window !== 'undefined' ? window : globalThis);
