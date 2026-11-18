/* pad-grooves.js — meme-music-lab 的 DJ 底奏编曲引擎（第二轮）
 * ---------------------------------------------------------------------------
 * 纯数据 + 纯调度：本文件不碰 Web Audio / DOM / 定时器，只把「第 step 步该发什么声」
 * 翻译成 api.* 调用，因此可以在 node 里用 stub api 离线验证（见 _shots/ 测试脚本）。
 *
 * 对外契约（不要改形状）：
 *   window.PadGrooves = {
 *     PAD_LOOP_STEPS,                  // 256 = 16 小节
 *     padGrooveBpm(id),                // 'sunny' | 'bounce' | 'chill' -> BPM
 *     scheduleStep(step, when, id, api) // 见下方 api 说明
 *   }
 *
 * api = {
 *   drum(kind, when, volume)         // kind: kick | kick:ghost | snare | clap | hat |
 *                                    //       openhat | rim | impact | riser
 *   tonal(inst, midi, when, lengthSteps, volume, opts)
 *                                    // opts: { bus:'tonal', delaySend, reverbPreset, reverbWet }
 *   pump(when, opts)                 // 侧链：opts { depth, hold, release }
 *   lowpass(hz, when, timeConstant)  // 底奏总线低通
 *   emit(detail)                     // 视觉事件：{kick,snare,hat,bass,chord,bar,barOfLoop,swingMs,gain}
 * }
 *
 * 参考曲实测（assets/friend-wine-dj.mp3，130 BPM 连续混音型 DJ 版）：
 *   - 4-on-the-floor，kick 3.88 次/小节；hat 18.8 次/小节（16 分细分 + 8 分反拍）
 *   - 低频 56%+ 能量在 150Hz 以下（sub 14.4% / 60-150Hz 41.8%），中频 20.5%，空气感只 1.8%
 *   - RMS -15.4 dBFS / peak -1.2 dBFS / crest 14.2 dB；短时 RMS 在 -22~-12 dBFS 之间
 *   - 侧链泵动约 -2.9 dB；side/mid -10.9 dB（有宽度但不是宽立体声）
 *   - 每 8 小节一次「过渡」：kick 少 1~2 下 + 低频短暂 -2~-8dB，groove 从不断
 * 本文件的编排按这些数字对齐：低频厚、过渡轻、每层音量都留出用户敲击的头部空间。
 * ------------------------------------------------------------------------- */

(function (root) {
  'use strict';

  var PAD_LOOP_STEPS = 256; // 16 小节

  // 参考曲 130 BPM。三套各取一个「DJ 会用」的速度区间中点：
  //   sunny 124（disco/funk house 的黄金区，比参考曲慢一档，方便接 130 的曲子）
  //   bounce 134（2-step / speed garage 的常用区）
  //   chill 86（lo-fi half-time，听感约为 172 BPM 的半速）
  // friendwine 是「真实音频底奏」（main.js 直接播放），这里只提供 BPM 给步长/舞蹈周期/灯带用。
  var BPM = { friendwine: 129.89, sunny: 124, bounce: 134, chill: 86 };

  // ---- 每层建议音量（会被 section 的层级系数与 gain 再乘一次）----
  var VOL = {
    kick: 0.95, ghostKick: 0.32,
    snare: 0.80, clap: 0.50, rim: 0.42,
    hat: 0.24, hatAccent: 0.46, openhat: 0.40, perc: 0.16,
    bass: 0.95, stab: 0.85, pad: 1.00, lead: 1.00,
    riser: 0.50, impact: 0.85
  };

  // ---- 侧链参数（对齐参考曲 -2.9dB 的泵动；深度按 BPM 微调）----
  var PUMP = {
    sunny: { depth: 0.70, hold: 0.020, release: 0.030 },
    bounce: { depth: 0.68, hold: 0.016, release: 0.026 },
    chill: { depth: 0.74, hold: 0.028, release: 0.042 }
  };

  // ---- 过门（fill）定义：返回 { sn: 军鼓力度, ht: hat 力度, kk: 额外 kick } ----
  var FILLS = {
    none: function () { return { sn: 0, ht: 0, kk: 0 }; },
    snare4: function (p) { return p >= 12 ? { sn: 0.42 + (p - 12) * 0.12, ht: 0, kk: 0 } : { sn: 0, ht: 0, kk: 0 }; },
    snare8: function (p) { return p >= 8 ? { sn: 0.34 + (p - 8) * 0.06, ht: p % 2 === 0 ? 0.20 : 0, kk: 0 } : { sn: 0, ht: 0, kk: 0 }; },
    snare16: function (p) { return p >= 4 ? { sn: 0.30 + (p - 4) * 0.05, ht: p % 2 === 0 ? 0.18 : 0, kk: 0 } : { sn: 0, ht: 0, kk: 0 }; },
    hatRoll: function (p) { return p >= 12 ? { sn: 0, ht: 0.30 + (p - 12) * 0.06, kk: 0 } : { sn: 0, ht: 0, kk: 0 }; },
    kickRoll: function (p) { return p >= 13 ? { sn: 0.28, ht: 0.18, kk: 0.55 } : { sn: 0, ht: 0, kk: 0 }; }
  };

  // ===========================================================================
  // 风格 1：sunny — Disco / Funk House，124 BPM，C 大调
  // 标志：四拍底鼓 + 反拍开镲 + 钢琴 7 和弦 off-beat stab + 八度跳进 funk bass
  // ===========================================================================
  var SUNNY = {
    swing: 0.10,                                 // 55%，16 分音符轻微摇摆
    swingPositions: [1, 3, 5, 7, 9, 11, 13, 15],
    kick: [0, 4, 8, 12],
    ghostKick: [3, 7, 11, 15],
    snare: [4, 12],
    clap: [4, 12],
    rim: [],
    hatSteps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    hatAccent: [2, 6, 10, 14],                   // 8 分反拍更亮
    openHat: [2, 6, 10, 14],                     // 反拍开镲，house 的「唰」
    percSteps: [1, 5, 9, 13],                    // 低音量 shaker 层
    // bass：[position, 相对根音的半音, 长度(step), 力度]，含八度(12)与五度(7)跳进
    bass: [
      [0, 0, 2.2, 0.62], [3, 12, 0.8, 0.50], [6, 7, 0.8, 0.50],
      [10, 12, 0.9, 0.55], [12, 0, 1.8, 0.60], [14, 7, 0.8, 0.46]
    ],
    bassFill: [[13, 12, 0.5, 0.40], [15, 7, 0.5, 0.40]],
    chords: [
      { name: 'Cmaj7', voicing: [60, 64, 67, 71], root: 36 },
      { name: 'Am7', voicing: [57, 60, 64, 67], root: 33 },
      { name: 'Fmaj7', voicing: [53, 57, 60, 64], root: 29 },
      { name: 'G6', voicing: [55, 59, 62, 64], root: 31 },
      { name: 'Cmaj7', voicing: [60, 64, 67, 71], root: 36 },
      { name: 'Am7', voicing: [57, 60, 64, 67], root: 33 },
      { name: 'Dm7', voicing: [62, 65, 69, 72], root: 38 },
      { name: 'G7', voicing: [55, 59, 62, 65], root: 31 }
    ],
    stab: { positions: [2, 6, 10, 14], inst: 'piano', length: 0.9, vel: 0.42, octave: 0 },
    pad: { positions: [0, 8], inst: 'pad', length: 7.6, vel: 0.20, octave: 0 },
    // lead：相对最高和弦音的半音偏移
    lead: { positions: [6, 14], inst: 'marimba', offset: 0, length: 1.2, vel: 0.16 },
    // 4 小节内的细节变化（每 4 小节轮转一次，避免 4 小节机械复制）
    variation: [
      {},
      { ghostExtra: [15] },
      {},
      { kickExtra: [13], bassExtra: [[15, 12, 0.5, 0.40]] }
    ],
    sections: [
  /* 01 */ { name: 'intro', gain: 0.72, kick: 1, ghost: 0, snare: 0, clap: 0, rim: 0, hat: 0.55, open: 0, perc: 0, bass: 0, stab: 0.5, pad: 0, lead: 0, filter: [900, 1400], fill: 'none' },
  /* 02 */ { name: 'intro', gain: 0.76, kick: 1, ghost: 0, snare: 0, clap: 0, rim: 0, hat: 0.62, open: 0, perc: 0, bass: 0, stab: 0.5, pad: 0, lead: 0, filter: [1400, 2200], fill: 'none' },
  /* 03 */ { name: 'add', gain: 0.84, kick: 1, ghost: 0, snare: 1, clap: 0, rim: 0, hat: 0.7, open: 0.5, perc: 0, bass: 0.85, stab: 0.6, pad: 0, lead: 0, filter: [2400, 3600], fill: 'none' },
  /* 04 */ { name: 'add', gain: 0.88, kick: 1, ghost: 0, snare: 1, clap: 0.49, rim: 0, hat: 0.8, open: 0.7, perc: 0, bass: 1, stab: 0.8, pad: 0, lead: 0, filter: [4200, 6000], fill: 'snare4' },
  /* 05 */ { name: 'groove', gain: 0.94, kick: 1, ghost: 0.6, snare: 1, clap: 0.62, rim: 0, hat: 0.95, open: 1, perc: 0.8, bass: 1, stab: 1, pad: 0, lead: 0, filter: [9000], fill: 'none' },
  /* 06 */ { name: 'groove', gain: 0.97, kick: 1, ghost: 0.7, snare: 1, clap: 0.62, rim: 0, hat: 1, open: 1, perc: 0.8, bass: 1, stab: 1, pad: 0, lead: 0, filter: [10000], fill: 'none' },
  /* 07 */ { name: 'build', gain: 0.92, kick: 0.9, ghost: 0, snare: 1, clap: 0.5, rim: 0, hat: 1, open: 0.4, perc: 0.6, bass: 0.75, stab: 0.55, pad: 1, lead: 0, filter: [3000, 7000], riser: 0.7, fill: 'snare8' },
  /* 08 */ { name: 'build', gain: 0.9, kick: 0.55, ghost: 0, snare: 1, clap: 0.35, rim: 0, hat: 1, open: 0, perc: 0.5, bass: 0.35, stab: 0.3, pad: 1, lead: 0, filter: [7000, 14000], riser: 0.4, fill: 'snare16' },
  /* 09 */ { name: 'drop', gain: 1.0, kick: 1, ghost: 1, snare: 1, clap: 1, rim: 0, hat: 1, open: 1, perc: 1, bass: 1, stab: 1, pad: 0.5, lead: 0.6, filter: [16000], impact: 1, fill: 'none' },
  /* 10 */ { name: 'drop', gain: 1.0, kick: 1, ghost: 1, snare: 1, clap: 1, rim: 0, hat: 1, open: 1, perc: 1, bass: 1, stab: 1, pad: 0.4, lead: 0.8, filter: [16000], fill: 'none' },
  /* 11 */ { name: 'drop', gain: 0.98, kick: 1, ghost: 1, snare: 1, clap: 1, rim: 0, hat: 1, open: 1, perc: 1, bass: 1, stab: 1, pad: 0.35, lead: 1, filter: [16000], fill: 'none' },
  /* 12 */ { name: 'drop2', gain: 1.0, kick: 1, ghost: 1, snare: 1, clap: 1, rim: 0, hat: 1, open: 1, perc: 1, bass: 1, stab: 1, pad: 0.35, lead: 0.9, filter: [16000], fill: 'snare4' },
  /* 13 */ { name: 'breakdown', gain: 0.78, kick: 0, ghost: 0, snare: 0, clap: 0, rim: 0, hat: 0.7, open: 0, perc: 0, bass: 0, stab: 0.35, pad: 1, lead: 0, filter: [12000, 5000], riser: 0.25, fill: 'none' },
  /* 14 */ { name: 'breakdown', gain: 0.74, kick: 0, ghost: 0, snare: 0, clap: 0, rim: 0, hat: 0.55, open: 0, perc: 0, bass: 0, stab: 0.3, pad: 1, lead: 0, filter: [5000, 1800], riser: 0.3, fill: 'hatRoll' },
  /* 15 */ { name: 'build2', gain: 0.82, kick: 0.8, ghost: 0, snare: 0, clap: 0, rim: 0, hat: 0.9, open: 0, perc: 0, bass: 0.5, stab: 0.25, pad: 1, lead: 0, filter: [1800, 6000], riser: 0.5, fill: 'snare8' },
  /* 16 */ { name: 'build2', gain: 0.86, kick: 0.9, ghost: 0, snare: 0.8, clap: 0, rim: 0, hat: 1, open: 0, perc: 0, bass: 0.7, stab: 0.3, pad: 0.6, lead: 0, filter: [6000, 12000], riser: 0.2, fill: 'snare16' }
    ]
  };

  // ===========================================================================
  // 风格 2：bounce — 2-step / Speed Garage，134 BPM，A 小调
  // 标志：底鼓避开 2、4 拍；snare 死守 2、4；重 swing 的 16 分 hat；
  //       反拍 sub bass；短促风琴 skank；drop 段 8bit lead
  // ===========================================================================
  var BOUNCE = {
    swing: 0.20,                                 // 60%
    swingPositions: [1, 3, 5, 7, 9, 11, 13, 15],
    kick: [0, 6, 10],                            // 1、2 拍后的 &、3 拍后的 &
    ghostKick: [14],
    snare: [4, 12],
    clap: [],
    rim: [3, 11],                                // 低音量 rim 补 16 分细节
    hatSteps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    hatAccent: [2, 6, 10, 14],
    openHat: [2, 6, 10, 14],
    percSteps: [],
    bass: [
      [2, 0, 1.2, 0.62], [6, 12, 1.0, 0.56], [10, 0, 1.2, 0.62], [14, 12, 1.0, 0.50]
    ],
    bassFill: [[15, 0, 0.5, 0.45]],
    chords: [
      { name: 'Am7', voicing: [57, 60, 64, 67], root: 33 },
      { name: 'Fmaj7', voicing: [53, 57, 60, 64], root: 29 },
      { name: 'G6', voicing: [55, 59, 62, 64], root: 31 },
      { name: 'Em7', voicing: [52, 55, 59, 62], root: 28 },
      { name: 'Am7', voicing: [57, 60, 64, 67], root: 33 },
      { name: 'Fmaj7', voicing: [53, 57, 60, 64], root: 29 },
      { name: 'Dm7', voicing: [62, 65, 69, 72], root: 38 },
      { name: 'G7', voicing: [55, 59, 62, 65], root: 31 }
    ],
    stab: { positions: [3, 7, 11, 15], inst: 'organ', length: 0.8, vel: 0.42, octave: 0 },
    pad: { positions: [0], inst: 'pad', length: 15.5, vel: 0.18, octave: -12 },
    lead: { positions: [7, 15], inst: '8bit', offset: 0, length: 1.0, vel: 0.16 },
    variation: [
      { kickExtra: [14] },
      {},
      { ghostExtra: [7] },
      { kickExtra: [3], bassExtra: [[15, 7, 0.5, 0.45]] }
    ],
    sections: [
  /* 01 */ { name: 'intro', gain: 0.74, kick: 1, ghost: 0, snare: 1, clap: 0, rim: 0.3, hat: 0.6, open: 0, perc: 0, bass: 0, stab: 0, pad: 0.8, lead: 0, filter: [800, 1400], fill: 'none' },
  /* 02 */ { name: 'intro', gain: 0.78, kick: 1, ghost: 0, snare: 1, clap: 0, rim: 0.3, hat: 0.7, open: 0, perc: 0, bass: 0, stab: 0, pad: 0.8, lead: 0, filter: [1400, 2400], fill: 'none' },
  /* 03 */ { name: 'add', gain: 0.85, kick: 1, ghost: 0, snare: 1, clap: 0, rim: 0.4, hat: 0.8, open: 0.4, perc: 0, bass: 0.9, stab: 0.6, pad: 0.6, lead: 0, filter: [2600, 4200], fill: 'none' },
  /* 04 */ { name: 'add', gain: 0.9, kick: 1, ghost: 0.4, snare: 1, clap: 0, rim: 0.5, hat: 0.9, open: 0.7, perc: 0, bass: 1, stab: 0.8, pad: 0.5, lead: 0, filter: [4600, 7000], fill: 'snare4' },
  /* 05 */ { name: 'groove', gain: 0.95, kick: 1, ghost: 0.7, snare: 1, clap: 0, rim: 0.6, hat: 1, open: 1, perc: 0, bass: 1, stab: 1, pad: 0.4, lead: 0, filter: [9000], fill: 'none' },
  /* 06 */ { name: 'groove', gain: 0.98, kick: 1, ghost: 0.8, snare: 1, clap: 0, rim: 0.6, hat: 1, open: 1, perc: 0, bass: 1, stab: 1, pad: 0.35, lead: 0, filter: [10000], fill: 'none' },
  /* 07 */ { name: 'build', gain: 0.94, kick: 0.85, ghost: 0, snare: 1, clap: 0, rim: 0.5, hat: 1, open: 0.5, perc: 0, bass: 0.7, stab: 0.5, pad: 0.8, lead: 0, filter: [3000, 7000], riser: 0.7, fill: 'snare8' },
  /* 08 */ { name: 'build', gain: 0.9, kick: 0.5, ghost: 0, snare: 1, clap: 0, rim: 0.4, hat: 1, open: 0, perc: 0, bass: 0.3, stab: 0.25, pad: 1, lead: 0, filter: [7000, 15000], riser: 0.4, fill: 'snare16' },
  /* 09 */ { name: 'drop', gain: 1.0, kick: 1, ghost: 1, snare: 1, clap: 0, rim: 0.6, hat: 1, open: 1, perc: 0, bass: 1, stab: 1, pad: 0.3, lead: 0.7, filter: [16000], impact: 1, fill: 'none' },
  /* 10 */ { name: 'drop', gain: 1.0, kick: 1, ghost: 1, snare: 1, clap: 0, rim: 0.6, hat: 1, open: 1, perc: 0, bass: 1, stab: 1, pad: 0.25, lead: 0.9, filter: [16000], fill: 'none' },
  /* 11 */ { name: 'drop', gain: 0.98, kick: 1, ghost: 1, snare: 1, clap: 0, rim: 0.6, hat: 1, open: 0.8, perc: 0, bass: 1, stab: 1, pad: 0.2, lead: 1, filter: [16000], fill: 'none' },
  /* 12 */ { name: 'drop2', gain: 1.0, kick: 1, ghost: 1, snare: 1, clap: 0, rim: 0.6, hat: 1, open: 1, perc: 0, bass: 1, stab: 1, pad: 0.2, lead: 0.9, filter: [16000], fill: 'snare4' },
  /* 13 */ { name: 'breakdown', gain: 0.76, kick: 0, ghost: 0, snare: 0, clap: 0, rim: 0, hat: 0.75, open: 0, perc: 0, bass: 0, stab: 0.3, pad: 1, lead: 0, filter: [12000, 5000], riser: 0.25, fill: 'none' },
  /* 14 */ { name: 'breakdown', gain: 0.72, kick: 0, ghost: 0, snare: 0, clap: 0, rim: 0, hat: 0.55, open: 0, perc: 0, bass: 0, stab: 0.25, pad: 1, lead: 0, filter: [5000, 1600], riser: 0.3, fill: 'hatRoll' },
  /* 15 */ { name: 'build2', gain: 0.82, kick: 0.8, ghost: 0, snare: 0, clap: 0, rim: 0.4, hat: 0.9, open: 0, perc: 0, bass: 0.5, stab: 0.2, pad: 1, lead: 0, filter: [1600, 6000], riser: 0.5, fill: 'snare8' },
  /* 16 */ { name: 'build2', gain: 0.86, kick: 0.9, ghost: 0.4, snare: 0.8, clap: 0, rim: 0.5, hat: 1, open: 0, perc: 0, bass: 0.7, stab: 0.25, pad: 0.6, lead: 0, filter: [6000, 12000], riser: 0.2, fill: 'snare16' }
    ]
  };

  // ===========================================================================
  // 风格 3：chill — Lo-fi Half-time，86 BPM，C 大调（Dm7-Gm7-Cmaj7-Am7）
  // 标志：snare 只落第 3 拍（half-time）；懒惰 ghost kick；60% swing 的 8/16 分 hat；
  //       七和弦长 pad；harp/marimba 点缀；drop 段才出现 16 分 hat
  // ===========================================================================
  var CHILL = {
    swing: 0.20,                                 // 60%
    swingPositions: [1, 3, 5, 7, 9, 11, 13, 15],
    kick: [0, 7, 10],
    ghostKick: [14],
    snare: [8],
    clap: [],
    rim: [15],
    hatSteps: [0, 2, 4, 6, 8, 10, 12, 14],       // 默认 8 分
    hatAccent: [2, 6, 10, 14],
    openHat: [2, 6, 14],
    percSteps: [],
    bass: [
      [0, 0, 3.4, 0.56], [6, 0, 2.0, 0.44], [10, 12, 1.6, 0.46], [14, 0, 1.6, 0.38]
    ],
    bassFill: [[13, 12, 0.8, 0.36]],
    chords: [
      { name: 'Dm7', voicing: [50, 53, 57, 60], root: 38 },
      { name: 'Gm7', voicing: [55, 58, 62, 65], root: 43 },
      { name: 'Cmaj7', voicing: [48, 52, 55, 59], root: 36 },
      { name: 'Am7', voicing: [45, 48, 52, 55], root: 33 },
      { name: 'Dm7', voicing: [50, 53, 57, 60], root: 38 },
      { name: 'Gm7', voicing: [55, 58, 62, 65], root: 43 },
      { name: 'Cmaj9', voicing: [48, 52, 55, 62], root: 36 },
      { name: 'Am7', voicing: [45, 48, 52, 55], root: 33 }
    ],
    stab: { positions: [], inst: 'pad', length: 0.8, vel: 0.0, octave: 0 },
    pad: { positions: [0, 8], inst: 'pad', length: 7.4, vel: 0.22, octave: 0 },
    lead: { positions: [5, 13], inst: 'harp', offset: 0, length: 2.2, vel: 0.16 },
    variation: [
      {},
      { ghostExtra: [6] },
      {},
      { kickExtra: [11], bassExtra: [[15, 12, 0.6, 0.34]] }
    ],
    sections: [
  /* 01 */ { name: 'intro', gain: 0.78, kick: 1, ghost: 0, snare: 0, clap: 0, rim: 0, hat: 0, open: 0, perc: 0, bass: 0, stab: 0, pad: 1, lead: 0, filter: [2400, 3000], fill: 'none' },
  /* 02 */ { name: 'intro', gain: 0.8, kick: 1, ghost: 0, snare: 0, clap: 0, rim: 0, hat: 0, open: 0, perc: 0, bass: 0, stab: 0, pad: 1, lead: 0, filter: [3000, 3800], fill: 'none' },
  /* 03 */ { name: 'add', gain: 0.82, kick: 1, ghost: 0, snare: 0, clap: 0, rim: 0, hat: 0.5, open: 0, perc: 0, bass: 0, stab: 0, pad: 1, lead: 0, filter: [3800, 4600], fill: 'none' },
  /* 04 */ { name: 'add', gain: 0.84, kick: 1, ghost: 0, snare: 1, clap: 0, rim: 0, hat: 0.6, open: 0.4, perc: 0, bass: 0.7, stab: 0, pad: 1, lead: 0, filter: [4600, 5200], fill: 'none' },
  /* 05 */ { name: 'groove', gain: 0.9, kick: 1, ghost: 0.6, snare: 1, clap: 0, rim: 0.5, hat: 0.8, open: 0.8, perc: 0, bass: 1, stab: 0, pad: 0.8, lead: 0, filter: [6000], fill: 'none' },
  /* 06 */ { name: 'groove', gain: 0.92, kick: 1, ghost: 0.6, snare: 1, clap: 0, rim: 0.5, hat: 0.85, open: 0.8, perc: 0, bass: 1, stab: 0, pad: 0.8, lead: 0, filter: [6500], fill: 'none' },
  /* 07 */ { name: 'groove', gain: 0.92, kick: 1, ghost: 0.6, snare: 1, clap: 0, rim: 0.5, hat: 0.9, open: 0.8, perc: 0, bass: 1, stab: 0, pad: 0.7, lead: 0, filter: [7000], fill: 'none' },
  /* 08 */ { name: 'groove', gain: 0.92, kick: 1, ghost: 0.6, snare: 1, clap: 0, rim: 0.5, hat: 0.9, open: 0.8, perc: 0, bass: 1, stab: 0, pad: 0.7, lead: 0, filter: [7000], fill: 'snare4' },
  /* 09 */ { name: 'build', gain: 0.86, kick: 1, ghost: 0.5, snare: 1, clap: 0, rim: 0.4, hat: 1, open: 0.4, perc: 0, bass: 0.8, stab: 0, pad: 0.9, lead: 0, filter: [3000, 7000], riser: 0.6, fill: 'snare8' },
  /* 10 */ { name: 'build', gain: 0.84, kick: 0.8, ghost: 0, snare: 0.9, clap: 0, rim: 0.3, hat: 1, open: 0.2, perc: 0, bass: 0.5, stab: 0, pad: 1, lead: 0, filter: [7000, 11000], riser: 0.4, fill: 'snare16' },
  /* 11 */ { name: 'drop', gain: 1.0, kick: 1, ghost: 1, snare: 1, clap: 0, rim: 0.6, hat: 1, open: 1, perc: 0, bass: 1, stab: 0, pad: 0.5, lead: 0.7, filter: [12000], impact: 1, fill: 'none' },
  /* 12 */ { name: 'drop', gain: 1.0, kick: 1, ghost: 1, snare: 1, clap: 0, rim: 0.6, hat: 1, open: 1, perc: 0, bass: 1, stab: 0, pad: 0.5, lead: 0.9, filter: [12000], fill: 'none' },
  /* 13 */ { name: 'drop2', gain: 1.0, kick: 1, ghost: 1, snare: 1, clap: 0, rim: 0.6, hat: 1, open: 1, perc: 0, bass: 1, stab: 0, pad: 0.45, lead: 1, filter: [12000], fill: 'none' },
  /* 14 */ { name: 'drop2', gain: 0.98, kick: 1, ghost: 1, snare: 1, clap: 0, rim: 0.6, hat: 1, open: 1, perc: 0, bass: 1, stab: 0, pad: 0.45, lead: 0.9, filter: [12000], fill: 'snare4' },
  /* 15 */ { name: 'breakdown', gain: 0.78, kick: 0, ghost: 0, snare: 0, clap: 0, rim: 0, hat: 0.7, open: 0, perc: 0, bass: 0, stab: 0, pad: 1, lead: 0, filter: [8000, 3000], riser: 0.2, fill: 'none' },
  /* 16 */ { name: 'breakdown', gain: 0.74, kick: 0, ghost: 0, snare: 0, clap: 0, rim: 0, hat: 0.55, open: 0, perc: 0, bass: 0, stab: 0, pad: 1, lead: 0, filter: [3000, 1200], riser: 0.25, fill: 'hatRoll' }
    ]
  };

  var GROOVES = { sunny: SUNNY, bounce: BOUNCE, chill: CHILL };

  // ===========================================================================
  // 调度实现
  // ===========================================================================
  function padGrooveBpm(id) { return BPM[id] || BPM.sunny; }
  function stepDuration(id) { return 60 / padGrooveBpm(id) / 4; }
  function has(arr, p) { return arr.indexOf(p) >= 0; }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function round(v, d) { var m = Math.pow(10, d || 6); return Math.round(v * m) / m; }

  function hatVelocity(g, position) {
    if (!has(g.hatSteps, position)) return 0;
    if (position % 4 === 2) return VOL.hatAccent;   // 反拍 8 分更亮
    return VOL.hat;
  }

  function sectionOf(g, barOfLoop) {
    return g.sections[barOfLoop % g.sections.length];
  }

  function variationOf(g, barOfLoop) {
    return (g.variation && g.variation[barOfLoop % g.variation.length]) || {};
  }

  function fillAt(name, position) {
    var fn = FILLS[name] || FILLS.none;
    return fn(position);
  }

  // 和弦横向声部（每 8 小节一轮；第二遍在 build/drop 里加高八度色彩）
  function chordOf(g, barOfLoop) {
    return g.chords[barOfLoop % g.chords.length];
  }

  function scheduleStep(step, when, id, api) {
    var g = GROOVES[id] || GROOVES.sunny;
    if (!api) return;
    var position = step % 16;
    var barOfLoop = Math.floor(step / 16) % 16;
    var stepDur = stepDuration(id);
    var swingMs = has(g.swingPositions, position) ? stepDur * g.swing : 0;
    var t = when + swingMs;
    var sec = sectionOf(g, barOfLoop);
    var vr = variationOf(g, barOfLoop);
    var chord = chordOf(g, barOfLoop);
    var gain = sec.gain;
    var fill = fillAt(sec.fill, position);

    // ---- 事件判定（先算，供 emit 一次派发）----
    var kickPositions = g.kick
      .concat(vr.kickExtra || [])
      .filter(function (v, i, a) { return a.indexOf(v) === i; });
    var ghostPositions = g.ghostKick
      .concat(vr.ghostExtra || [])
      .filter(function (v, i, a) { return a.indexOf(v) === i; });

    var kickOn = sec.kick > 0 && has(kickPositions, position);
    var ghostOn = sec.ghost > 0 && has(ghostPositions, position) && !has(kickPositions, position);
    var snareOn = sec.snare > 0 && has(g.snare, position);
    var clapOn = sec.clap > 0 && has(g.clap, position);
    var rimOn = sec.rim > 0 && has(g.rim, position);
    var hatVel = sec.hat > 0 ? hatVelocity(g, position) * sec.hat : 0;
    var openOn = sec.open > 0 && has(g.openHat, position);
    var percOn = sec.perc > 0 && has(g.percSteps, position);
    var fillSn = fill.sn * (sec.snare > 0 ? 1 : 0.4);
    var fillHat = fill.ht * Math.max(sec.hat, 0.4);
    var fillKick = fill.kk * sec.kick;

    var bassEvents = [];
    if (sec.bass > 0) {
      g.bass.forEach(function (e) { if (e[0] === position) bassEvents.push(e); });
      (vr.bassExtra || []).forEach(function (e) { if (e[0] === position) bassEvents.push(e); });
      if (fillSn > 0 && (barOfLoop % 4 === 3)) {
        (g.bassFill || []).forEach(function (e) { if (e[0] === position) bassEvents.push(e); });
      }
    }
    var stabOn = sec.stab > 0 && has(g.stab.positions, position);
    var padOn = !!(g.pad && sec.pad > 0 && has(g.pad.positions, position));
    var leadOn = !!(g.lead && sec.lead > 0 && has(g.lead.positions, position));

    // ---- 视觉事件：每步一次，字段严格按契约 ----
    api.emit({
      kick: kickOn || ghostOn || fillKick > 0,
      snare: snareOn || clapOn || rimOn || fillSn > 0,
      hat: hatVel > 0 || openOn || percOn || fillHat > 0,
      bass: bassEvents.length > 0,
      chord: stabOn || padOn,
      bar: barOfLoop % 4,
      barOfLoop: barOfLoop,
      swingMs: round(swingMs, 6),
      gain: round(gain, 3)
    });

    // ---- 鼓：分层调用（kick / kick:ghost / hat / openhat / rim / clap）----
    if (kickOn) {
      api.drum('kick', t, round(clamp(VOL.kick * sec.kick * gain, 0, 1), 4));
      api.pump(t, PUMP[id] || PUMP.sunny);         // 只压主 kick，ghost 不触发泵动
    }
    if (ghostOn) {
      api.drum('kick:ghost', t, round(clamp(VOL.ghostKick * sec.ghost * gain, 0, 1), 4));
    }
    if (fillKick > 0) {
      api.drum('kick', t, round(clamp(VOL.kick * fillKick * gain, 0, 1), 4));
      api.pump(t, PUMP[id] || PUMP.sunny);
    }
    if (snareOn) api.drum('snare', t + 0.004, round(clamp(VOL.snare * sec.snare * gain, 0, 1), 4));
    if (fillSn > 0) api.drum('snare', t + 0.003, round(clamp(VOL.snare * fillSn * gain, 0, 1), 4));
    if (clapOn) api.drum('clap', t + 0.008, round(clamp(VOL.clap * sec.clap * gain, 0, 1), 4));
    if (rimOn) api.drum('rim', t + 0.003, round(clamp(VOL.rim * sec.rim * gain, 0, 1), 4));
    if (hatVel > 0) {
      var kind = openOn ? 'openhat' : 'hat';
      api.drum(kind, t + (openOn ? 0.002 : 0.001), round(clamp(hatVel * gain, 0, 1), 4));
    }
    if (fillHat > 0) api.drum('hat', t + 0.002, round(clamp(fillHat * gain * 0.8, 0, 1), 4));
    if (percOn) api.drum('hat', t + 0.006, round(clamp(VOL.perc * gain, 0, 1), 4));

    // ---- 段落量级动作：impact / riser ----
    if (sec.impact && position === 0) {
      api.drum('impact', t, round(clamp(VOL.impact * sec.impact * gain, 0, 1), 4));
    }
    if (sec.riser && position === 0 && !(sectionOf(g, (barOfLoop + 15) % 16).riser)) {
      api.drum('riser', t, round(clamp(VOL.riser * sec.riser * gain, 0, 1), 4));
    }

    // ---- 低通：每小节起点设置一次；扫频小节每 2 步更新 ----
    if (sec.filter && sec.filter.length) {
      var lo = sec.filter[0];
      var hi = sec.filter.length > 1 ? sec.filter[1] : lo;
      var sweep = sec.filter.length > 1 && hi !== lo;
      if (position === 0 && !sweep) {
        api.lowpass(clamp(lo, 200, 18000), when, 0.05);
      } else if (sweep && position % 2 === 0) {
        var k = position / 16;
        var hz = lo * Math.pow(hi / lo, k);
        api.lowpass(clamp(hz, 200, 18000), when, stepDur * 0.8);
      }
    }

    // ---- bass：根音 + 半音偏移（含八度/五度跳进）----
    bassEvents.forEach(function (e) {
      var midi = chord.root + e[1];
      var len = e[2];
      var vol = clamp(VOL.bass * e[3] * sec.bass * gain, 0, 1);
      api.tonal('bass', midi, t + 0.002, len, round(vol, 4), { bus: 'tonal' });
    });

    // ---- 和弦 stab：voicing 逐个音发 tonal ----
    if (stabOn) {
      chord.voicing.forEach(function (midi) {
        var vol = clamp(VOL.stab * (g.stab.vel || 0.3) * sec.stab * gain, 0, 1);
        api.tonal(g.stab.inst, midi, t + 0.006, g.stab.length, round(vol, 4), {
          bus: 'tonal', delaySend: 0.16, reverbPreset: 'plate', reverbWet: 0.12
        });
      });
    }

    // ---- pad：长音七和弦 ----
    if (padOn) {
      chord.voicing.forEach(function (midi) {
        api.tonal(g.pad.inst, midi + (g.pad.octave || 0), t, g.pad.length, round(clamp(VOL.pad * g.pad.vel * sec.pad * gain, 0, 1), 4), {
          bus: 'tonal', reverbPreset: 'room', reverbWet: 0.10
        });
      });
    }

    // ---- lead：和弦色彩音 + 高八度 ----
    if (leadOn) {
      var top = chord.voicing[chord.voicing.length - 1] + 12;
      var midiLead = top + g.lead.offset;
      api.tonal(g.lead.inst, midiLead, t + 0.004, g.lead.length, round(clamp(VOL.lead * g.lead.vel * sec.lead * gain, 0, 1), 4), {
        bus: 'tonal', delaySend: 0.20
      });
    }
  }

  var PadGrooves = {
    PAD_LOOP_STEPS: PAD_LOOP_STEPS,
    padGrooveBpm: padGrooveBpm,
    scheduleStep: scheduleStep,
    // 以下为只读辅助，方便 main.js 适配层与离线测试；不属于必须契约。
    _debug: {
      bpm: BPM,
      grooves: GROOVES,
      volume: VOL,
      pump: PUMP,
      stepDuration: stepDuration,
      sectionOf: sectionOf
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PadGrooves;
  root.PadGrooves = PadGrooves;
})(typeof window !== 'undefined' ? window : globalThis);
