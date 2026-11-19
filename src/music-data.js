(() => {
  'use strict';

  const colors = ['#efabc2', '#d9ef68', '#f2d468', '#b9dcae', '#91cfe8', '#c7b4e6', '#e9b6d3', '#f2a88f'];
  const scales = {
    4: [
      ['C4', '低音 Do', 60], ['E4', 'Mi', 64], ['G4', 'Sol · 原调', 67], ['C5', '高音 Do', 72]
    ],
    5: [
      ['C4', '低音 Do', 60], ['D4', 'Re', 62], ['E4', 'Mi', 64], ['G4', 'Sol · 原调', 67], ['A4', 'La', 69]
    ],
    8: [
      ['C4', '低音 Do', 60], ['D4', 'Re', 62], ['E4', 'Mi', 64], ['F4', 'Fa', 65],
      ['G4', 'Sol · 原调', 67], ['A4', 'La', 69], ['B4', 'Si', 71], ['C5', '高音 Do', 72]
    ]
  };
  const extendedRanges = { 12: [60, 71], 24: [48, 71], 49: [36, 84], 61: [36, 96], 88: [21, 108] };
  const pitchClassNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const solfege = ['Do', '升 Do', 'Re', '升 Re', 'Mi', 'Fa', '升 Fa', 'Sol', '升 Sol', 'La', '升 La', 'Si'];
  const midiName = (midi) => `${pitchClassNames[midi % 12]}${Math.floor(midi / 12) - 1}`;

  function getPitches(count = 8) {
    if (scales[count]) {
      return scales[count].map(([name, cn, midi], index) => ({
        name, cn, midi, offset: midi - 67, color: colors[index + (8 - count)]
      })).reverse();
    }
    const range = extendedRanges[count] || extendedRanges[49];
    const result = [];
    for (let midi = range[0]; midi <= range[1]; midi++) {
      result.push({
        name: midiName(midi), cn: solfege[midi % 12], midi, offset: midi - 67,
        color: colors[(midi % 12 + 12) % 12 % colors.length]
      });
    }
    return result.reverse();
  }

  const instruments = [
    { id: 'piano', title: '钢琴', symbol: '♩', color: '#d9ef68', description: '清晰击弦与短促延音' },
    { id: 'guitar', title: '吉他', symbol: '♪', color: '#f2d468', description: '明亮拨弦与自然衰减' },
    { id: 'violin', title: '小提琴', symbol: '𝄞', color: '#efabc2', description: '连续弓弦与轻微揉弦' },
    { id: 'bass', title: '贝斯', symbol: '♭', color: '#e9a56f', description: '低频拨弦与结实延音' },
    { id: 'marimba', title: '马林巴', symbol: '≡', color: '#b9dcae', description: '木质敲击与清脆泛音' },
    { id: 'harp', title: '竖琴', symbol: '⋔', color: '#e9b6d3', description: '透明拨弦与空灵尾音' },
    { id: 'organ', title: '风琴', symbol: 'Ω', color: '#a9c7b2', description: '多层音栓与持续和声' },
    { id: 'flute', title: '长笛', symbol: '♫', color: '#91cfe8', description: '柔和气声与圆润长音' },
    { id: 'trumpet', title: '小号', symbol: '♯', color: '#f2c365', description: '明亮铜管与有力起音' },
    { id: 'sax', title: '萨克斯', symbol: '∿', color: '#e6a987', description: '温暖簧片与轻微气息' },
    { id: 'synth', title: '合成器', symbol: '⌁', color: '#c7b4e6', description: '复古方波与滤波延音' },
    { id: '8bit', title: '8-bit', symbol: '▦', color: '#8fd6c2', description: '芯片方波与像素质感' },
    { id: 'pad', title: '氛围 Pad', symbol: '≈', color: '#a9b9df', description: '缓慢起伏的柔和音垫' },
    // 参照 ACE Studio 的音源分类补齐流行编曲常用声部（弦乐组/铜管/木管/键盘/拨弦/鼓组）
    { id: 'stringsHigh', title: '弦乐组·高', symbol: '𝄞', color: '#efabc2', description: 'ACE 风格弦乐组高音区' },
    { id: 'stringsMid', title: '弦乐组·中', symbol: '𝄡', color: '#e9b6d3', description: '厚实的中音区弦乐' },
    { id: 'stringsLow', title: '弦乐组·低', symbol: '𝄢', color: '#c7b4e6', description: '低音区弦乐铺底' },
    { id: 'cello', title: '大提琴', symbol: '◒', color: '#e6a987', description: '温暖弓弦与揉弦' },
    { id: 'contrabass', title: '低音提琴', symbol: '⊂', color: '#a9b9df', description: '深沉拨弦与低音' },
    { id: 'trombone', title: '长号', symbol: '≣', color: '#f2c365', description: '宽厚铜管与滑音感' },
    { id: 'horn', title: '圆号', symbol: '◠', color: '#e9a56f', description: '柔和圆润的铜管' },
    { id: 'clarinet', title: '单簧管', symbol: '❧', color: '#b9dcae', description: '木质簧片与圆润中音' },
    { id: 'dizi', title: '笛子', symbol: '〽', color: '#91cfe8', description: '竹笛亮音与气声' },
    { id: 'electricPiano', title: '电钢琴', symbol: '☰', color: '#a9b9df', description: 'FM 电钢与钟形泛音' },
    { id: 'synthLead', title: '合成 Lead', symbol: '⇞', color: '#c7b4e6', description: '流行合成主音' },
    { id: 'ukulele', title: '尤克里里', symbol: '⚲', color: '#f2d468', description: '轻快拨弦' },
    { id: 'drumkit', title: '鼓组', symbol: '▣', color: '#efabc2', description: '按音高触发底鼓/军鼓/踩镲' },
    { id: 'subBass', title: 'Sub 贝斯', symbol: '⊏', color: '#e9a56f', description: '超低频正弦贝斯' },
    // 预设化重构后新增的合成器声部（见 src/synth-engine.js）
    { id: 'grandPiano', title: '三角钢琴', symbol: '♪', color: '#d9ef68', description: '明亮泛音与长延音' },
    { id: 'uprightPiano', title: '立式钢琴', symbol: '♩', color: '#e9b6d3', description: '温暖木味与短促衰减' },
    { id: 'clavinet', title: 'Clavinet', symbol: '⌗', color: '#f2d468', description: '放克电钢与短促击弦' },
    { id: 'stringsPizz', title: '弦乐拨奏', symbol: '≋', color: '#c7b4e6', description: '短促拨弦与木头质感' },
    { id: 'brassSection', title: '铜管组', symbol: '♬', color: '#f2c365', description: '多把铜管齐奏' },
    { id: 'saxTenor', title: '次中音萨克斯', symbol: '∿', color: '#e6a987', description: '低沉簧片与气息' },
    { id: 'synthPluck', title: '合成 Pluck', symbol: '⋔', color: '#91cfe8', description: '短促滤波拨弦' },
    { id: 'synthBell', title: '合成 Bell', symbol: '◈', color: '#a9b9df', description: 'FM 钟形与长尾音' },
    { id: 'guitarElectric', title: '电吉他', symbol: '⚡', color: '#f2a88f', description: '清音电吉他与拨片起音' }
  ];

  function makeEvents(notation) {
    let col = 0;
    const events = [];
    notation.trim().split(/\s+/).forEach((token) => {
      const [midiText, lengthText] = token.split(':');
      const midi = Number(midiText);
      const length = Number(lengthText);
      if (midi > 0) {
        const degree = scales[8].reduce((best, pitch, index) => Math.abs(pitch[2] - midi) < Math.abs(scales[8][best][2] - midi) ? index : best, 0);
        events.push([degree, col, length, midi]);
      }
      col += length;
    });
    return events;
  }

  function rowForMidi(midi, count = 49) {
    const pitches = getPitches(count);
    const exact = pitches.findIndex((pitch) => pitch.midi === midi);
    if (exact >= 0) return exact;
    return pitches.reduce((best, pitch, index) => Math.abs(pitch.midi - midi) < Math.abs(pitches[best].midi - midi) ? index : best, 0);
  }

  // Song notation is written in beats. The editor uses half-beat steps.
  function makeTrack(meme, notation, count = 49) {
    let col = 0;
    const events = [];
    notation.trim().split(/\s+/).forEach((token) => {
      const [midiText, beatText] = token.split(':');
      const midi = Number(midiText);
      const beats = Number(beatText);
      const length = Math.round(beats * 2000) / 1000;
      if (midi > 0 && length > 0) events.push({ meme: `instrument:${meme}`, row: rowForMidi(midi, count), col, length, midi });
      col += length;
    });
    return events;
  }

  function makeBass(meme, bars, startBeat = 0) {
    const events = [];
    let beat = startBeat;
    bars.forEach((bar) => {
      const beats = bar.beats || 4;
      events.push({ meme: `instrument:${meme}`, row: rowForMidi(bar.bass), col: beat * 2, length: beats * 2 - .15, midi: bar.bass });
      beat += beats;
    });
    return events;
  }

  function makeArpeggio(meme, bars, startBeat = 0, pattern = [0, 1, 2, 1, 2, 1, 0, 1]) {
    const events = [];
    let beat = startBeat;
    bars.forEach((bar) => {
      const beats = bar.beats || 4;
      for (let index = 0; index < beats * 2; index++) {
        const midi = bar.notes[pattern[index % pattern.length] % bar.notes.length];
        events.push({ meme: `instrument:${meme}`, row: rowForMidi(midi), col: (beat + index * .5) * 2, length: .85, midi });
      }
      beat += beats;
    });
    return events;
  }

  function makeBlockChords(meme, bars, startBeat = 0) {
    const events = [];
    let beat = startBeat;
    bars.forEach((bar) => {
      const beats = bar.beats || 4;
      bar.notes.forEach((midi) => events.push({ meme: `instrument:${meme}`, row: rowForMidi(midi), col: beat * 2, length: beats * 2 - .2, midi }));
      beat += beats;
    });
    return events;
  }

  const bar = (bass, notes, beats = 4) => ({ bass, notes, beats });
  const fireflyVerse = [
    '69:1 69:1 69:1 70:.5 72:.5 69:2 67:2',
    '65:1 65:1 65:1 67:.5 69:.5 69:1.5 67:.5 67:2',
    '65:1 65:1 65:1 67:.5 69:.5 76:2 76:2',
    '74:1 74:1 74:1 76:.5 77:.5 72:2 72:2',
    '74:1 69:1 67:2 74:1 69:1 67:2',
    '74:1 69:1 67:1.5 65:.5 65:4'
  ].join(' ');
  const fireflyChorus = [
    '0:2 69:1 67:1 72:2 70:1 69:1',
    '69:.5 67:.5 67:1 72:1 70:1',
    '69:.5 70:.5 72:1 72:1 69:1',
    '67:2 0:1 65:1',
    '74:1 69:1 67:2 72:1 67:1 65:2',
    '70:.5 69:.5 70:1 69:1 65:1',
    '70:.5 69:.5 70:1 69:1 65:.5 67:.5',
    '67:1 65:1 65:6'
  ].join(' ');
  const fireflyBars = [
    bar(41, [53, 57, 60]), bar(38, [50, 53, 57]), bar(46, [50, 53, 58]), bar(36, [48, 52, 55]),
    bar(41, [53, 57, 60]), bar(36, [48, 52, 55]), bar(38, [50, 53, 57]), bar(36, [48, 52, 55]),
    bar(46, [50, 53, 58]), bar(41, [53, 57, 60]), bar(36, [48, 52, 55]), bar(41, [53, 57, 60]),
    bar(38, [50, 53, 57]), bar(46, [50, 53, 58]), bar(41, [53, 57, 60]), bar(36, [48, 52, 55]),
    bar(38, [50, 53, 57]), bar(46, [50, 53, 58]), bar(36, [48, 52, 55]), bar(41, [53, 57, 60]),
    bar(36, [48, 52, 55]), bar(41, [53, 57, 60]), bar(41, [53, 57, 60])
  ];

  const twinklePhrase = [
    '62:1 62:1 69:1 69:1 71:1 71:1 69:2',
    '67:1 67:1 66:1 66:1 64:1 64:1 62:2',
    '69:1 69:1 67:1 67:1 66:1 66:1 62:2',
    '69:1 69:1 67:1 67:1 66:1 66:1 62:2',
    '62:1 62:1 69:1 69:1 71:1 71:1 69:2',
    '67:1 67:1 66:1 66:1 64:1 64:1 62:2'
  ].join(' ');
  const D = bar(38, [50, 54, 57]);
  const G = bar(43, [50, 55, 59]);
  const A = bar(45, [52, 57, 61]);
  const twinkleBars = [D, D, G, D, A, D, D, G, D, A, D, D];

  const birthdayPhrase = [
    '67:.75 67:.25 69:1 67:1 72:1 71:2',
    '67:.75 67:.25 69:1 67:1 74:1 72:2',
    '67:.75 67:.25 79:1 76:1 72:1 71:1 69:2',
    '77:.75 77:.25 76:1 72:1 74:1 72:2'
  ].join(' ');
  const birthdayBars = [
    bar(36, [48, 52, 55], 3), bar(43, [47, 53, 55], 3),
    bar(36, [48, 52, 55], 3), bar(36, [48, 52, 55], 3),
    bar(36, [48, 52, 55], 3), bar(41, [48, 53, 57], 3),
    bar(41, [48, 53, 57], 3), bar(36, [48, 52, 55], 3)
  ];

  const songs = [
    {
      id: 'birthday', title: '生日快乐', cover: './assets/doro.webp', subtitle: '中英两段 · 附点弱起 · 旋律／和弦／低音', instrument: 'instrument:piano', bpm: 112, pitchCount: 49,
      source: 'https://www.bilibili.com/video/BV1sps5zcE6p/',
      events: [
        ...makeTrack('flute', `${birthdayPhrase} ${birthdayPhrase}`),
        ...makeBlockChords('piano', birthdayBars, 1), ...makeBlockChords('piano', birthdayBars, 26),
        ...makeBass('bass', birthdayBars, 1), ...makeBass('bass', birthdayBars, 26)
      ]
    },
    {
      id: 'twinkle', title: '一闪一闪亮晶晶', cover: './assets/maodie.webp', subtitle: 'D 调完整六段 · 长笛／竖琴／低音', instrument: 'instrument:flute', bpm: 144, pitchCount: 49,
      source: 'https://www.bilibili.com/video/BV1wVmtBNEEh/',
      events: [...makeTrack('flute', twinklePhrase), ...makeArpeggio('harp', twinkleBars), ...makeBass('bass', twinkleBars)]
    },
    {
      id: 'firefly', title: '虫儿飞', cover: './assets/oiia.webp', subtitle: 'F 调主歌与副歌 · 长笛／竖琴／低音', instrument: 'instrument:flute', bpm: 104, pitchCount: 49,
      source: 'https://www.bilibili.com/video/BV1L8411v7v5/',
      events: [...makeTrack('flute', `${fireflyVerse} ${fireflyChorus}`), ...makeArpeggio('harp', fireflyBars), ...makeBass('bass', fireflyBars)]
    },
  ];

  const libraryTracks = [];

  const synthProjects = [
    {
      id: 'friendwine-rebuild',
      title: '朋友的酒 DJ · 全乐器拆分还原',
      shortTitle: '朋友的酒',
      cover: './assets/dog.png',
      subtitle: 'ACE advanced 全乐器拆分 → 逐件转录（副歌 16 小节）',
      url: './assets/ace/friendwine_synth_project.json'
    }
  ];

  const loopPresets = [
    { id: 'four', name: '四拍律动', steps: ['1000100010001000', '0000100000001000', '1010101010101010', '0000000000000000'].map((row) => [...row].map(Number)) },
    { id: 'disco', name: '复古迪斯科', steps: ['1000100010001000', '0000100000001000', '0010101000101010', '0000100000001000'].map((row) => [...row].map(Number)) },
    { id: 'hiphop', name: '嘻哈弹跳', steps: ['1000001000100100', '0000100000001000', '1010101010101011', '0000000000000000'].map((row) => [...row].map(Number)) },
    { id: 'rock', name: '摇滚直拍', steps: ['1000100110001000', '0000100000001000', '1010101010101010', '0000100000001000'].map((row) => [...row].map(Number)) },
    { id: 'dance', name: '舞曲碎拍', steps: ['1000001001000100', '0000100100001000', '1010101010101010', '0000100000001000'].map((row) => [...row].map(Number)) }
  ];

  function getPianoLayout(pitches, className = 'pitch-key') {
    let whiteIndex = 0;
    let blackCount = 0;
    const markup = pitches.slice().reverse().map((pitch) => {
      const row = pitches.findIndex((item) => item.midi === pitch.midi);
      const black = pitch.name.includes('#');
      const left = black ? whiteIndex * 44 - 14 : whiteIndex * 44;
      if (black) blackCount++; else whiteIndex++;
      const label = !black && pitch.name.startsWith('C') ? `<strong>${pitch.name}</strong>` : '';
      return `<button type="button" class="${className} piano-key ${black ? 'black-key' : 'white-key'}" data-row="${row}" data-midi="${pitch.midi}" style="left:${left}px;--key-color:${pitch.color};--lane-color:${pitch.color}" aria-label="演奏 ${pitch.name}" title="${pitch.name} · ${pitch.cn}">${label}</button>`;
    }).join('');
    return { markup, width: whiteIndex * 44, whiteCount: whiteIndex, blackCount };
  }

  window.MemeMusicData = {
    instruments,
    songs,
    libraryTracks,
    synthProjects,
    loopPresets,
    getPitches,
    getPianoLayout,
    getInstrument(id) {
      return instruments.find((instrument) => instrument.id === String(id).replace('instrument:', ''));
    },
    getSong(id) { return songs.find((song) => song.id === id); }
  };
})();
