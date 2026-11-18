# DJ / 电子舞曲底奏（backing groove）重写指南

> 适用项目：`meme-music-lab`（纯原生 JS + Web Audio，无第三方库、无外部采样，全部靠振荡器/噪声合成）
> 目标读者：直接改 `src/main.js` 的人
> 本文所有代码示例都对应现有实现：`PAD_GROOVES`（约 2225 行）、`schedulePadBackingStep`（约 2252 行）、`padDrumSound`（约 2185 行）、`padInstrumentTone`（约 2206 行）、`emitPadBeat`（约 2214 行）、`padStepDuration`（2183 行）、`createSoundBus`（1271 行）、`withSoundBus`（1305 行）、`ensureAudio`（1311 行）、`hitPadSource`（2335 行）。行号基于当前 `src/main.js`（2384 行）版本。

---

## 0. 先读这一页：路径、约束、现状

### 0.1 一句话结论

现在三套底奏的问题**不是音色不够好，而是节奏信息不够多、时间不够「歪」、结构不变化、低频没有让位**。按性价比排序应该是：先加 16 分音符细节层与 off-beat 开镲（Tier A，只改数组），再让 swing 对所有 groove 生效（1 行代码），再做 sidechain 泵动（1 条新总线），最后才是 16 小节编排、滤波扫频、饱和、tape wow。

### 0.2 必须先知道的 10 个事实（全部来自现有代码）

| # | 位置 | 事实 | 对重写的影响 |
|---|------|------|--------------|
| 1 | 2181–2182 | `PAD_GROOVE_BPM = { sunny: 116, bounce: 138, chill: 84 }` | 三套速度对应三种完全不同的律动语汇，不要试图用同一套 16 分模式套三种速度 |
| 2 | 2306 | 调度器 `padBackingStep = (padBackingStep + 1) % 64` | 循环只有 **4 小节**；8/16 小节结构变化必须先把循环扩到 256 步 |
| 3 | 2255 | `bar = Math.floor(step / 16) % 4` | bar 只用来选和弦/图案，4 小节后必然回到和弦 0 |
| 4 | 2257 | `const swing = id === 'chill' && position % 2 === 1 ? ... : 0` | **swing 写死只对 chill 生效**；`groove.swing` 对 sunny/bounce 是死字段 |
| 5 | 2259–2260 | `human()` = ±3ms 白噪声，`vary()` = 音量 ±8% | humanize 太均匀；不同乐器需要不同的前后偏移 |
| 6 | 2262 | `fill = bar === 3 && position >= 13` | 每 4 小节必定 13/14/15 三连 snare，听多了就是「数码味过门」 |
| 7 | 2269 | `emitPadBeat(step, when, ...)` 传的是 **swing 之前** 的 `when` | 灯带/背景/图案看到的时间与真正的发声时间会差一个 swing 位移 |
| 8 | 2183 | `padStepDuration()` 读全局 `padBackingId`，无形参 | 切歌/交叉淡入时若 `id` 与全局不一致，步长会算错；建议改成 `padStepDuration(id)` |
| 9 | 1322–1333 | `padBackingInput → padCompressor(threshold -16, ratio 3.5, attack .004, release .16) → padOutput(.82) → master` | 底奏以 1.5 增益直怼压缩器，几乎全程被压 3–4dB；且**没有任何侧链/延迟/滤波/饱和** |
| 10 | 2335 | `hitPadSource` 是用户敲击垫子的入口，走 `padMixInput`（增益 1.0） | 用户敲击比底奏（1.5）小；且敲击时**不会让底奏让位** |

补充两条同样重要的：

- `padInstrumentTone`（2209）和 `padDrumSound`（2187）都把 `reverbPreset` 写死成 `'none'`，但 `createSoundBus`（1278–1298）本身支持 per-note 混响（`room/hall/church/plate`）——给 clap/stab 挂 10% 的小混响是**零新增节点**的现成收益。
- `padDrumSound` 的 clap 分支是「3 声带通噪声」（2201），`snare` 是「噪声 + triangle」（2194–2196），`hat/openhat` 是两层带通噪声（2197–2199），kick 是「sine 168→42Hz + triangle 78 + square click + 噪声」（2188–2192）。所有音色调整都应在这套原语（`tone(type, freq, when, dur, vol, endFreq)` / `noise(when, dur, freq, vol)`）上做叠加，不要引入采样。

### 0.3 16 步网格约定（全文通用）

一格 = 一个 16 分音符，`position` 取值 0–15，`bar` = `Math.floor(step/16)`。

| 拍 | 1 |  |  |  | 2 |  |  |  | 3 |  |  |  | 4 |  |  |  |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| position | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
| 计数 | 1 | e | & | a | 2 | e | & | a | 3 | e | & | a | 4 | e | & | a |
| 强弱 | 强 | 弱 | 次强 | 弱 | 强 | 弱 | 次强 | 弱 | 强 | 弱 | 次强 | 弱 | 强 | 弱 | 次强 | 弱 |

- 本文的 `0` 对应 Ableton Learning Music 界面上的 **1**（他们用 1-indexed：clap 在 5 & 13 = 本文的 4 & 12）。
- 「四拍底鼓」= kick 在 `[0, 4, 8, 12]`；「backbeat」= snare/clap 在 `[4, 12]`。
- 不要写 0–15 以外的位置，也不要写小数；`bassOctave`、`openHat`、`hatAccent` 这些辅助数组必须是主数组的子集（代码里只对已触发的层查表）。

### 0.4 三套底奏的目标分工（先定人设，再谈音符）

| groove | BPM | 目标风格 | 标志性特征 | 对应章节 |
|---|---|---|---|---|
| `sunny` | 116 | Disco / Funk House（C 大调 C–Am–F–G） | 四拍底鼓 + off-beat 开镲 + 钢琴 off-beat stab + 八度跳进贝斯 | 3.3 |
| `bounce` | 138 | 2-step / Speed Garage（A 小调 Am–F–G–Em） | 避开 backbeat 的切分底鼓 + 重 swing 的 16 分 hat + 反拍 sub bass + 风琴 stab | 3.4 |
| `chill` | 84 | Lo-fi Half-time（C 大调 Dm7–Gm7–Cmaj7–Am7） | 半速 backbeat（snare 在第 3 拍）+ 懒惰的 ghost kick + 20% swing + 七和弦长 pad | 3.5 |

分工人设很重要：三套如果都做成「四拍 + 反拍开镲」，用户切换时会觉得「只是变快变慢」。而 Disco / 2-step / Half-time 三者的**底鼓语义完全不同**（每拍都踩 / 避开 2、4 / 只踩 1、3），一听就能分辨。

### 0.5 改动分层：Tier A / B / C

| 层级 | 改动范围 | 风险 | 收益 |
|---|---|---|---|
| **A** | 只改 `PAD_GROOVES` 里的数组（`kick/ghostKick/snare/clap/hat/hatAccent/openHat/bass/bassOctave/stab/chords/roots/lead`） | 极低，改错只是难听 | 立刻摆脱「8 分音符练习曲」质感 |
| **B** | 改 `schedulePadBackingStep` + 调度循环 + `padStepDuration`（约 40 行） | 中，需回归测试命中集合 | swing 全风格生效、16 小节编排、per-bar 图案覆盖、fill 可控 |
| **C** | 新增总线与效果：侧链 duck、tonal 分线、delay send、低通扫频、waveshaper、tape wow、hat choke | 中高，需听感+峰值验证 | 专业感的主体：pump、空间、张力 |

建议的落地顺序见 **附录 A**。

---

## 1. 核心概念速查

每个概念只回答一个问题：**它到底解决什么毛病**。写代码时对号入座。

### 1.1 十三条概念

| 概念 | 它解决的问题（一句话） | 在本项目里怎么落地 |
|---|---|---|
| **Groove（律动）** | 让「音符位置正确」变成「身体想动」——同样的音符，靠时值微差、重音分布、音色长短制造推力。 | 不是加音符，是加**重音差、时值差、音色长短差**；见 1.2 的量化表 |
| **Swing（摇摆）** | 把成对的 16 分音符从「1:1」推到「6:4 / 2:1」，解决机械感与「平」。 | 位移全部奇数位：`t = when + stepDur * swing`；见 1.2 换算表 |
| **Syncopation（切分）** | 让重音落在弱拍/弱位，制造「被推着走」的不稳定感，解决四拍过于方正。 | `bounce` 的 kick 避开 4/12、`stab` 落在 3/7/11/15 就是切分 |
| **Four-on-the-floor** | 用每拍一次的底鼓建立「不可动摇的舞池地基」，解决「不知道第几拍」的焦虑。 | `sunny` 用 `[0,4,8,12]`；这是 house/disco/techno 的公共地基 |
| **Backbeat（反拍重音）** | 在第 2、4 拍给 snare/clap，和底鼓形成「咚—哒」问答，解决四拍底鼓没有「答复」的问题。 | snare/clap 在 `[4,12]`；没有 backbeat 的 4/4 会像节拍器 |
| **Ghost note（鬼音）** | 在主音之间塞入 20%–40% 音量的「影子音」，解决 loop 只有骨架没有肉的问题。 | `ghostKick` 音量 .42（2273 行现成）；hat 也要有 ghost 层（见 4.6） |
| **Call & response（呼应）** | 一句话问、一句话答，解决「所有乐器同时说话」的糊与平。 | kick/snare 一问一答；lead 在 `bounce` 的 3/11 回应 stab 的 7/15 |
| **Tension & release（张与弛）** | 先积累不稳定（切分、上行、滤波关闭、留白），再一次性释放，解决「一直很满=没有高潮」。 | 8 小节留白 + 12 小节 build + 13 小节 drop；见 3.x 的 arrange |
| **Build-up / Drop / Breakdown** | 把时间切成「期待—兑现—喘息」三段，解决长 loop 的疲劳。 | breakdown 掉 kick/bass；build 用 snare roll + 开滤波；drop 全层回归 |
| **Sidechain pump（侧链泵动）** | 底鼓一响就把 bass/pad 压下去再弹回，解决低频打架、并制造「呼吸感」。 | Web Audio 没有真侧链输入，用 GainNode + `setTargetAtTime` 模拟；见 4.2 |
| **Humanization（人性化）** | 用 ±ms 的时序抖动与 ±% 的力度抖动，解决「100% 量化」的塑料感。 | 现有 ±3ms/±8% 太均匀；按乐器分档：hat ±4ms、snare +5ms、stab −3ms；见 1.2 |
| **Layering（叠层）** | 单一振荡器做不出「真实乐器」的频宽，用 2–4 个不同频段/包络的层叠加解决单薄。 | kick = sub 正弦 + click 噪声 + 中频 triangle；snare = 噪声 + triangle；见 4.7 |
| **Energy curve（能量曲线，8/16 小节尺度）** | 用逐小节的「密度/亮度/低频量」画一条曲线，解决「loop 循环 100 遍没有起伏」。 | 见 3.3–3.5 的 16 小节 arrange 表；BPM 越高，能量变化周期越短 |

### 1.2 必须记住的量化公式

**(a) swing 百分比 ↔ 代码里的 `swing` 系数**

电子音乐界（Roger Linn / MPC / Ableton 的约定）：**50% = 直拍，66% = 三连音摇摆**。代码现在的写法是「奇数 16 分位往后推 `stepDur * swing`」，换算关系：

```text
百分比 P = 50 + 50 * swing      swing 系数 = (P - 50) / 50
```

| `groove.swing` | 百分比 | 感觉 | 116 BPM 位移 | 138 BPM | 84 BPM |
|---|---|---|---|---|---|
| 0 | 50% | 直拍 | 0 ms | 0 | 0 |
| 0.10 | 55% | 微摇（disco house 常用） | 12.9 ms | 10.9 ms | 17.9 ms |
| 0.16 | 58% | 轻 shuffle | 20.7 ms | 17.4 ms | 28.6 ms |
| 0.20 | 60% | 明显摇（lo-fi / garage） | 25.9 ms | 21.7 ms | 35.7 ms |
| 0.24 | 62% | 重摇（2-step garage） | 31.0 ms | 26.1 ms | 42.9 ms |
| 0.32 | 66% | 三连音 | 41.4 ms | 34.8 ms | 57.1 ms |

> 16 分音符长度：116 BPM = 129.3 ms；138 BPM = 108.7 ms；84 BPM = 178.6 ms。
> 一次 4 小节循环：116 BPM = 8.28 s；138 BPM = 6.96 s；84 BPM = 11.43 s。16 小节分别为 33.1 s / 27.8 s / 45.7 s。

**(b) 侧链泵动的时间常数**

`setTargetAtTime` 是指数逼近，**3 × timeConstant ≈ 95% 到位**。

| 参数 | 建议值（按 16 分长度比例） | 116 BPM 实例 | 138 BPM | 84 BPM |
|---|---|---|---|---|
| 下潜 attack 时间常数 | 1/32 个 16 分 | 4 ms | 3 ms | 6 ms |
| hold（保持最低点） | 1/6 个 16 分 | 21 ms | 18 ms | 30 ms |
| release 时间常数 | 1/4 个 16 分 | 32 ms | 27 ms | 45 ms |
| 深度（线性增益） | −3 ~ −6 dB | 0.71 | 0.60 | 0.50 |

`dB → 线性`：`gain = 10 ** (dB / 20)`；`−3dB = 0.708`、`−4.5dB = 0.596`、`−6dB = 0.501`。

**(c) humanize 分档（不要全场一个 ±3ms）**

| 层 | 时序偏移 | 力度抖动 | 理由 |
|---|---|---|---|
| kick | −2 ~ +2 ms | ±5% | 低频对齐感要强，歪多了会「拖」 |
| snare/clap | +2 ~ +8 ms（偏晚） | ±10% | 人打鼓时后手拍子天然偏晚 |
| close hat | ±3 ~ ±6 ms | ±12% | 16 分越密，抖动越要克制 |
| open hat | ±2 ms | ±8% | 长音抖多了会糊 |
| bass | ±2 ms | ±6% | 和 kick 对齐 |
| stab/pad | −5 ~ +6 ms | ±12% | 和弦起音可以有「下一拍提前进」的抢拍感 |

**(d) 能量曲线刻度（0–10）**

给 16 小节每小节打分，作为 arrange 表的目标值（第 8 小节 breakdown 要明显掉一格，第 13 小节 drop 要到峰值）。三套的具体表在 3.3–3.5。

### 1.3 参考链接（第 1 章）

- Ableton Learning Music · Backbeats（四拍底鼓 + 2/4 拍 clap 的组合定义）：https://learningmusic.ableton.com/make-beats/backbeats.html
- Ableton Learning Music · Tempo and genre（各风格 BPM 区间）：https://learningmusic.ableton.com/make-beats/tempo-and-genre.html
- Ableton Learning Music · Song structure（4/8/16 小节成块）：https://learningmusic.ableton.com/song-structure/song-structure.html
- Attack Magazine · Going Off Grid: What Is Swing And How To Add It（50% = 直拍，52%/64% 听感对比）：https://www.attackmagazine.com/technique/tutorials/going-off-grid-what-is-swing-and-how-to-add-it/
- Attack Magazine · Grinding Analogue Techno（明确写出「50% swing 即直拍」的业界约定）：https://www.attackmagazine.com/technique/beat-dissected/grinding-analogue-techno/
- Wikipedia · Ghost note：https://en.wikipedia.org/wiki/Ghost_note
- Wikipedia · Swing time（groove 的另一种叫法）：https://en.wikipedia.org/wiki/Swing_time
- Wikipedia · Ducking（侧链压低的定义）：https://en.wikipedia.org/wiki/Ducking
- Splice Blog · How to Humanize MIDI Drums（humanize 与 swing 是两件事）：https://splice.com/blog/humanize-your-drums/
- Sound on Sound · Drum Beat Construction Part 1（syncopation / swing / dynamism）：https://www.soundonsound.com/techniques/drum-beat-construction-part-1-sos-podcast
- DJ TechTools · Phrasing The Perfect Mix（8-16-32 小节乐句）：https://djtechtools.com/2009/01/26/phrasing-the-perfect-mix/
- iZotope · What is sidechain compression：https://www.izotope.com/community/blog/what-is-sidechain-compression

---

## 2. 各风格配方（8 种，可直接照抄的数组）

### 2.0 使用说明

1. 所有位置都是 0–15 的整数，`chords`/`roots` 各 4 条（4 小节循环），所以每个代码块都能直接替换 `PAD_GROOVES` 里的对应对象。
2. 本仓库可用的合成音色（`instrumentSound` 的 `kind`，1471–1530 行）：`piano`、`guitar`、`violin`、`bass`、`marimba`、`harp`、`organ`、`flute`、`trumpet`、`sax`、`8bit`、`pad`，以及兜底的 `default`（给 `'synth'` 等未知值用）。`stabInst`/`lead.inst` 只能填这些。
3. 鼓只有 4 种合成器：`drum:kick` / `drum:snare` / `drum:hat` / `drum:openhat` / `drum:clap`（5 种，clap 是 3 声带通噪声）。
4. `hat` 字段是**除数**（`position % hat === 0`），只能取 1/2/4：1 = 16 分，2 = 8 分，4 = 4 分。想写 16 分细节就写 `hat: 1`，再用 `hatAccent`/`openHat` 做重音。
5. `bassOctave`、`openHat`、`hatAccent` 必须是 `bass`、hat 网格的子集，否则永远不触发。
6. `swing` 系数按 1.2 的表换算；打完第 3 章的补丁后才会对所有 groove 生效，未打补丁时只有 `chill` 生效。
7. 下面的 `tempo` 字段仅作备忘——真实 BPM 在 `PAD_GROOVE_BPM`（2181 行），要改速度请改那里。

**C 大调 / A 小调 MIDI 速查**

| 音 | C1 | F1 | G1 | A1 | E1 | C2 | D2 | E2 | F2 | G2 | A2 | B2 | C3 | D3 | E3 | F3 | G3 | A3 | B3 | C4 | E4 | G4 | C5 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| MIDI | 24 | 29 | 31 | 33 | 28 | 36 | 38 | 40 | 41 | 43 | 45 | 47 | 48 | 50 | 52 | 53 | 55 | 57 | 59 | 60 | 64 | 67 | 72 |

常用和弦（本项目实际用到/推荐的 voicing）：

| 和弦 | MIDI | 说明 |
|---|---|---|
| C | `[60,64,67]` / 第一转位 `[64,67,72]` | 钢琴 stab 用转位更亮 |
| Am | `[57,60,64]` / 转位 `[60,64,69]` | |
| F | `[53,57,60]` / `[57,60,65]` / `[65,69,72]` | |
| G | `[55,59,62]` / `[59,62,67]` / 第二转位 `[62,67,71]` | |
| Dm7 | `[50,53,57,60]` | 现有 chill 用 |
| Gm7 | `[55,58,62,65]` | 现有 chill 用 |
| Cmaj7 | `[48,52,55,59]` | 现有 chill 用 |
| Am7 | `[45,48,52,55]` / `[57,60,64,67]` | 低音区 vs 中音区 |
| Fmaj7 | `[53,57,60,64]` | |
| Em7 | `[52,55,59,62]` | |

---

### 2.1 Disco / Funk House（110–124 BPM，C 大调）

```js
// 四拍地板 + off-beat 开镲 + 钢琴反拍 stab + 八度跳进贝斯
{
  tempo: 116,
  kick:      [0, 4, 8, 12],
  ghostKick: [3, 7, 11, 15],              // 每个正拍前的 16 分「推」，disco 的推进力来源
  snare:     [4, 12],
  clap:      [4, 12],
  hat: 1, hatAccent: [2, 6, 10, 14], openHat: [2, 6, 10, 14],
  bass: [0, 3, 6, 10, 12, 14], bassOctave: [3, 10],
  roots: [36, 33, 29, 31],                // C2 A1 F1 G1
  stab: [2, 6, 10, 14], stabInst: 'piano',
  chords: [[64, 67, 72], [60, 64, 69], [65, 69, 72], [62, 67, 71]],  // C / Am / F / G
  swing: 0.10,                            // 55%
  level: 0.95
}
```

- **为什么这么摆**：底鼓每拍一次给地基；ghost kick 永远落在「下一个正拍前 1 格」，形成 `推→踩` 的循环；钢琴 stab 在 8 分反拍（2/6/10/14）与开镲同点，制造「唰」的上扬感；贝斯 3/10 高八度是 disco 经典的「八度蹦跳」。
- **swing**：55%（0.10）就够；disco 的摇来自 16 分 hi-hat 与贝斯，不是来自把拍子大幅往后甩。
- **humanize**：ghost kick −2ms（往前抢）、开镲 +2ms、stab −3ms（提前进拍更像真人弹的）。
- **音色处理**：kick 用现有 `sine 168→42Hz`，但把 `endFrequency` 调到 46–50Hz 会更「舞曲」；snare 噪声层 1900Hz 稍压低（`.42`），让 clap 承担 backbeat 主体；贝斯已有 `voice('sine',1,.3) + sawtooth LP850`，够用；钢琴 stab 想更 disco 可以把 `stabInst` 换 `'organ'` 做 horn-section 感。
- **常见坑**：`hat:1` 后 16 个位置全有帽子，若 `hatAccent` 不设，听起来会像洒水车——重音必须有 `.44 vs .28` 的落差（现有代码已内置）。

---

### 2.2 Four-on-the-floor House（120–128 BPM，A 小调）

```js
// 最经典的「咚-哒-咚-哒」，靠 off-beat sub bass 和开镲做呼吸
{
  tempo: 124,
  kick:      [0, 4, 8, 12],
  ghostKick: [7, 15],                     // 只在 2 与 4 拍前轻轻推一下
  snare:     [12],                        // 只留第 4 拍，避免和 clap 完全重叠
  clap:      [4, 12],
  hat: 1, hatAccent: [2, 6, 10, 14], openHat: [2, 6, 10, 14],
  bass: [2, 6, 10, 14], bassOctave: [6, 14],   // 反拍 sub，一拍一答
  roots: [33, 29, 31, 28],                     // A1 F1 G1 E1
  stab: [2, 6, 10, 14], stabInst: 'piano',     // 与 bass 同点，压成「和弦+根音」的重拍
  chords: [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 64], [52, 55, 59, 62]],
  //        Am7                Fmaj7               G6                 Em7
  swing: 0.10,                            // 55–58%
  level: 1
}
```

- **为什么这么摆**：house 的灵魂是「kick 踩正拍、bass 踩反拍」的错位互补；两者永不在同一格抢低频（除了 4/12 处 clap 的短暂重叠）。
- **进阶**：想做 tech-house 的「rolling bass」，把 bass 改成 `[2,3,6,7,10,11,14,15]`（每拍后半两连音），并把 `bassOctave` 清空，靠 16 分滚动制造「隆隆」的推进。
- **swing**：55–58%，house 宁可直一点也不要甩过头。
- **humanize**：kick ±1ms，clap +3ms，开镲 +2ms。
- **音色处理**：clap 用 `drum:clap` 就够；给 clap 挂 `reverbPreset:'plate', reverbWet:.12`（走 `createSoundBus` 现成路径）立刻有 club 空间；bass 低频若在手机外放消失，说明 60Hz 以下太多，把 `roots` 整体 +12 或换成 `bassOctave` 多一处。

---

### 2.3 Techno（125–140 BPM，A 小调或调性模糊）

```js
// 催眠型：四拍底鼓不摇，靠 16 分 hat 的力度渐变、反拍开镲和 rumble 贝斯
{
  tempo: 132,
  kick:      [0, 4, 8, 12],
  ghostKick: [],                          // techno 不玩 ghost kick，留干净
  snare:     [4, 12],
  clap:      [],                          // 用 snare 或 rim 即可，避免双 backbeat 抢
  hat: 1, hatAccent: [2, 6, 10, 14], openHat: [2, 6, 10, 14],
  bass: [0, 3, 6, 8, 11, 14], bassOctave: [3, 11],   // 16 分滚动，但避开每拍正点
  roots: [33, 29, 31, 28],
  stab: [2, 6, 10, 14], stabInst: 'synth',           // 冷、短、低通
  chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]],
  swing: 0,                               // techno 基本直拍（最多 52%）
  level: 1
}
```

- **为什么这么摆**：techno 的张力来自「极少的元素 + 极小的变化」；底鼓和开镲构成坐标，剩余信息全部交给滤波、延迟、力度渐变（第 4 章）。
- **bass 的关键**：位置 0 与 8 可以删掉，只留 3/6/11/14，让底鼓独占低频正拍；这就是「rumble bass」的留白逻辑。
- **swing**：0–0.04（50–52%）；techno 一旦甩过头就变 tech-house。
- **humanize**：±1–2ms，几乎可以忽略；重音差（accent）比时间差更重要。
- **音色处理**：kick 要「长尾巴 + 饱和」（见 4.5 waveshaper），频率 45–55Hz；hat 要金属感，用两层带通噪声 + 一点 square click；stab 用 `synth` 后接低通 1200Hz、衰减 0.9 步。

---

### 2.4 Breakbeat / Drum & Bass（160–176 BPM；half-time 85–88 BPM）

```js
// DnB 2-step：底鼓只踩 1 与 3 拍后的最后一格，snare 死守 2、4，ghost snare 填充
{
  tempo: 172,
  kick:      [0, 10],
  ghostKick: [14],
  snare:     [4, 12],
  clap:      [],
  hat: 1, hatAccent: [2, 6, 10, 14], openHat: [6],
  bass: [0, 6, 10], bassOctave: [10],       // sub 长音 + 尾部八度
  roots: [33, 29, 31, 28],
  stab: [2, 10], stabInst: 'pad',           // 稀疏、长音，给反拍呼吸
  chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]],
  swing: 0.04,                              // 52%，DnB 基本直拍
  level: 1
}
```

**funk breakbeat 变体**（适合 160–175 的 breaks，或降半速做成 80–87 的 hip-hop）：

```js
{
  tempo: 168,
  kick:      [0, 3, 10, 14],
  ghostKick: [7, 11],
  snare:     [4, 12, 15],
  clap:      [],
  hat: 1, hatAccent: [2, 6, 9, 13], openHat: [],
  bass: [0, 7, 10], bassOctave: [],
  roots: [33, 29, 31, 28],
  stab: [], stabInst: 'pad',
  chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]],
  swing: 0.04,
  level: 1
}
```

- **为什么这么摆**：breakbeat 的本质是「底鼓避开 snare」；一旦 kick 和 snare 同格，低频和瞬态互相掩蔽，听起来就「塌」。
- **DnB 的半速听感**：172 BPM 的实际感知是 86 BPM（半速），所以 16 分 hat 不要写太密，重音要每 2 格一次。
- **swing**：52%（0.04），jungle/breaks 的摇摆来自 break 本身的时间差，不是量化 swing。
- **humanize**：snare +4~6ms、ghost snare ±6ms、hat ±3ms。
- **音色处理**：snare 要「三层」（低频 bulk triangle 180Hz + 中频噪声 1.9k + 高频噪声 5k），DnB 的 snare 是整首曲子的锚点；bass 用 sub 正弦 + 少量 saw 做「有质感的低频」。

---

### 2.5 UK Garage 2-step（128–136 BPM，A 小调）

```js
// 2-step：底鼓不踩 2、4 拍；重 swing 的 16 分 hat；反拍 sub + 风琴 stab
{
  tempo: 132,
  kick:      [0, 7, 10],                  // 1 拍、2 拍后的 &、3 拍后的 &
  ghostKick: [14],
  snare:     [4, 12],
  clap:      [4, 12],
  hat: 1, hatAccent: [2, 6, 10, 14], openHat: [7, 15],
  bass: [2, 6, 10, 14], bassOctave: [6, 14],
  roots: [33, 29, 31, 28],
  stab: [3, 7, 11, 15], stabInst: 'organ',   // 16 分抢拍的风琴 skank
  chords: [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 64], [52, 55, 59, 62]],
  swing: 0.24,                             // 62%
  level: 1
}
```

- **为什么这么摆**：2-step 的「跳」来自「kick 不在 2、4 拍」造成的落空感，snare 守住 2、4 后，底鼓在 7/10 这些「非正点」补位，形成一步一顿的 2-step 步态；重 swing（60–66%）让 16 分 hat 变成「哒-哒啦」的摇摆。
- **swing**：60–66% 是 UKG 的命门；低于 58% 就不像 garage。
- **humanize**：hat 奇数位再额外 +3~8ms（模拟 MPC 的 swing 双重叠加）；snare +2ms。
- **音色处理**：snare 要「短、紧、音高偏高」（`tone('triangle', 195, ..., 108)` 的 `endFrequency` 可再抬高）；bass 用纯 sub（把 `instrumentSound` 的 bass 里 saw 层音量降低）；organ stab 直接 `stabInst:'organ'`，衰减压到 0.8 步。

---

### 2.6 Lo-fi Half-time（70–90 BPM，C 大调）

```js
// 半速 backbeat：snare 在第 3 拍；懒惰 ghost kick；60% swing 的 16 分 hat；七和弦长 pad
{
  tempo: 84,
  kick:      [0, 7, 10],
  ghostKick: [14],
  snare:     [8],                          // 半速的「2、4」= 3 拍与下一小节 1 拍
  clap:      [],                           // chill 里 clap 由代码在 15 位固定触发（2277 行）
  hat: 1, hatAccent: [2, 6, 10, 14], openHat: [6, 14],
  bass: [0, 6, 10, 14], bassOctave: [10],
  roots: [38, 43, 36, 33],                 // D2 G2 C2 A1
  stab: [], stabInst: 'pad',               // 和弦由代码在 0/8 位自动铺（2292 行）
  chords: [[50, 53, 57, 60], [55, 58, 62, 65], [48, 52, 55, 59], [45, 48, 52, 55]],
  //        Dm7                 Gm7                 Cmaj7               Am7
  swing: 0.20,                             // 60%
  level: 0.74
}
```

- **为什么这么摆**：half-time 的「半」体现在 snare 从 2、4 拍挪到第 3 拍——身体的点头频率直接减半；kick 在 7（snare 前 1 格）制造「抢在 snare 前」的慵懒感。
- **swing**：58–64%；lo-fi 是全风格里最敢把 16 分往后甩的，35ms 的偏移正是「磁带感」的来源之一。
- **humanize**：hat ±8ms、snare +10ms、力度 ±15%；再叠加第 4 章的 tape wow。
- **音色处理**：全链低通 5–8kHz（第 4 章滤波），pad 用 `'pad'` 的 saw 层 + 7 和弦；加一层极轻的噪声（vinyl hiss）会有奇效，但要注意总峰值。

---

### 2.7 Hip-hop Boom Bap（85–95 BPM，A 小调）

```js
// boom-bap：kick 沉重、snare 硬、hat 8 分带重音、留大量空白
{
  tempo: 90,
  kick:      [0, 3, 10],
  ghostKick: [7],
  snare:     [4, 12],
  clap:      [],
  hat: 2, hatAccent: [2, 6, 10, 14], openHat: [],
  bass: [0, 7, 10], bassOctave: [10],
  roots: [33, 29, 36, 31],                 // A1 F1 C2 G1
  stab: [0, 6, 10], stabInst: 'piano',     // 采样感的短和弦，落在 kick 之间
  chords: [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 64]],
  //        Am7                Fmaj7               Cmaj7              G6
  swing: 0.16,                             // 58%
  level: 0.9
}
```

- **为什么这么摆**：boom-bap 的「boom」是 kick 的低频，「bap」是 snare 的脆响；两者之间必须留空（hat 密度低、8 分即可），空才是 boom-bap 的味道。
- **swing**：54–62%；比 lo-fi 轻，但比 house 重。
- **humanize**：kick −4ms（提前）、snare +8ms（拖后），这种「kick 抢、snare 拖」是 boom-bap 的招牌。
- **音色处理**：kick 低频 55–60Hz，加一点低通噪声；snare 三层（见 4.7）；整体做「低通 + 轻微饱和」模拟采样与黑胶；stab 音量压到 `.24`，让它像采样碎片而不是演奏。

---

### 2.8（补充）Melbourne Bounce / Donk（126–140 BPM，A 小调）

```js
// 四拍底鼓 + 反拍「donk」贝斯 + 反拍开镲，澳洲 bounce 的公式
{
  tempo: 136,
  kick:      [0, 4, 8, 12],
  ghostKick: [3, 11],
  snare:     [12],
  clap:      [4, 12],
  hat: 1, hatAccent: [2, 6, 10, 14], openHat: [2, 6, 10, 14],
  bass: [2, 6, 10, 14], bassOctave: [],     // 反拍 saw 贝斯，音高要有「下滑」
  roots: [33, 29, 31, 28],
  stab: [2, 6, 10, 14], stabInst: 'synth',
  chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]],
  swing: 0,
  level: 1
}
```

- **为什么这么摆**：bounce 的所有信息都在「反拍」——kick 踩 1/2/3/4，bass 与 stab 踩 2/4 的反拍，形成一踩一弹的弹簧感。
- **音色处理**：bass 需要 `endFrequency` 向下滑（给 `instrumentSound` 的 bass 再加一层 `tone('sawtooth', f, when, .12, .18, f * .5)`），这是 donk 的「啵」。它和 3.4 里的 `bounce` 共用同一套「四拍 + 反拍」思路，但本项目把 `bounce` 定位成 2-step / speed garage（kick 避开 2、4 拍），两者是**互斥的两条路线**，不要混用。

### 2.9 参考链接（第 2 章）

- Attack Magazine · Rolling 2-Step（122–128 BPM、swing 60–65%、snare 在 2/4、off-beat hat、第 2 小节第 1 拍故意不踩 kick）：https://www.attackmagazine.com/technique/beat-dissected/rolling-2-step-garage/
- Attack Magazine · Interplanetary Criminal-Style Garage（现代 UKG 的鼓组与贝斯处理）：https://www.attackmagazine.com/technique/beat-dissected/interplanetary-criminal-style-garage/
- Attack Magazine · Raw Drum & Bass（168–178 BPM、swing 50–60%、kick 高通 85Hz 给贝斯让路）：https://www.attackmagazine.com/technique/beat-dissected/raw-drum-bass/
- Attack Magazine · 90s Boom Bap Hip Hop（swing 设置与 head-nod 的关系）：https://www.attackmagazine.com/technique/beat-dissected/90s-boom-bap-hip-hop/
- Attack Magazine · Deep House（120–125 BPM、swing 50–60、off-beat 开镲 + 808 低音叠层）：https://www.attackmagazine.com/technique/beat-dissected/deep-house-stripped-workout-beat-dissected/
- Attack Magazine · Big House（123–128 BPM、swing 55–65）：https://www.attackmagazine.com/technique/beat-dissected/big-house/
- Attack Magazine · Thumping Techno（130–135 BPM、swing 50–60、模拟鼓 + 饱和）：https://www.attackmagazine.com/technique/beat-dissected/thumping-techno/
- Attack Magazine · Grinding Analogue Techno（125–132 BPM、50% swing = 直拍）：https://www.attackmagazine.com/technique/beat-dissected/grinding-analogue-techno/
- Wikipedia · UK garage（约 130 BPM、2-step 与 4/4 两种底鼓、切分 hi-hat）：https://en.wikipedia.org/wiki/UK_garage
- Wikipedia · Four on the floor：https://en.wikipedia.org/wiki/Four_on_the_floor_(music)
- Wikipedia · Techno（120–150 BPM、四拍底鼓、TR-808/909）：https://en.wikipedia.org/wiki/Techno
- Wikipedia · Drum and bass（快速 breakbeat + 重低音）：https://en.wikipedia.org/wiki/Drum_and_bass
- Wikipedia · Breakbeat（源自 funk/jazz/R&B 的鼓 break）：https://en.wikipedia.org/wiki/Breakbeat
- Wikipedia · Boom bap（East Coast 黄金年代）：https://en.wikipedia.org/wiki/Boom_bap
- Wikipedia · Lofi hip-hop：https://en.wikipedia.org/wiki/Lofi_hip-hop
- Ableton Learning Music · Tempo and genre（Hip-hop 60–100、House 115–130、Techno 120–140、DnB 160–180）：https://learningmusic.ableton.com/make-beats/tempo-and-genre.html

---

## 3. 三套现有底奏的具体升级处方

### 3.1 现状诊断（逐行对照）

| 症状 | 代码位置 | 具体问题 | 处方 |
|---|---|---|---|
| sunny 太「平」 | 2226–2233 | hat 只有 `hat:2`（8 分），16 分位空着；openHat 只有 14 位一个 | 加 `hat:1` + 全反拍开镲 + ghost kick 补齐到 4 个 |
| bounce 太「碎」 | 2235–2240 | kick `[0,3,6,10,12]` 与 snare 的 12 位打架；hat 已经 `hat:1` 但 swing 不生效 | 去掉 12 位 kick，让 snare 独立；swing 补到 62%；改 2-step 语义 |
| chill 太「散」 | 2242–2249 | swing 只作用在 chill 但 `swing:.2` 没配合 16 分 hat（`hat:2` 只有 8 分，奇数位没东西可摇）；15 位 clap 每小节固定 | hat 改 16 分让 swing 真正有对象；15 位 clap 改为每 4 小节一次 |
| 三套都「没有过门变化」 | 2262、2299 | `bar===3 && position>=13` 每 4 小节机械补 snare+hat | Tier B 的 `arrange` 接管 fill |
| 三套都「没有呼吸」 | 2245–2270 | 无侧链、无滤波、无 delay、无饱和 | 第 4 章 |
| 结构永远 4 小节 | 2306 | `% 64` | Tier B 扩到 256 步 + arrange 表 |
| 视觉与声音错位 | 2269 | `emitPadBeat` 用 swing 前的 `when` | Tier B 传 swing 后的 `t` |
| 低频互相掩蔽 | 1322–1333 | 1.5 增益直怼压缩器；kick 与 bass 同总线无 duck | Tier C 拆 tonal 分线 + 侧链 |

### 3.2 Tier B：三处小补丁（先打这个，后面的编排才有地方放）

**补丁 1：`padStepDuration` 接受 id（2183 行）**

```js
function padStepDuration(id = padBackingId) { return 60 / padGrooveBpm(id) / 4; }
```

**补丁 2：调度循环从 64 步扩到 256 步（2306 行）**

```js
// 常量放在模块顶部（2181 行 PAD_GROOVE_BPM 附近）
const PAD_LOOP_STEPS = 256;   // 16 小节

// runPadBackingScheduler 内，把 2306 行改成：
padBackingStep = (padBackingStep + 1) % PAD_LOOP_STEPS;
```

**补丁 3：重写 `schedulePadBackingStep`（替换 2252–2300 行）**

要点：swing 对所有 groove 生效且只位移奇数 16 分位；读入 `bars[bar]` 的每小节覆盖；读入 `arrange[barOfLoop]` 的静音/增益/fill/滤波；`emitPadBeat` 改传 swing 后的时间。

```js
const PAD_SWING_POSITIONS = [1, 3, 5, 7, 9, 11, 13, 15];

// bars[] 里的字段只覆盖自己，不写的沿用顶层
function padBarPattern(groove, bar) {
  const override = groove.bars && groove.bars[bar];
  return override ? Object.assign({}, groove, override) : groove;
}

function schedulePadBackingStep(step, when, id) {
  const groove = PAD_GROOVES[id] || PAD_GROOVES.sunny;
  const position = step % 16;
  const barOfLoop = Math.floor(step / 16) % 16;   // 0..15，16 小节结构
  const bar = barOfLoop % 4;                       // 0..3，和声/图案循环
  const stepDur = padStepDuration(id);
  const swingPositions = groove.swingPositions || PAD_SWING_POSITIONS;
  const swingMs = (groove.swing || 0) * stepDur * (swingPositions.indexOf(position) >= 0 ? 1 : 0);
  const t = when + swingMs;                        // 真正发声时间（带 swing）
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
  emitPadBeat(step, t, id, { kick, snare, hat, bass, chord, bar, barOfLoop, swingMs });

  if (kick) {
    const ghost = pattern.ghostKick.indexOf(position) >= 0 && pattern.kick.indexOf(position) < 0;
    padDrumSound('drum:kick', t + human(4), vary((ghost ? .42 : position === 0 ? .98 : .86) * level), true);
    if (!ghost) padPump(t, groove.sidechain);           // 只在主 kick 泵动，见 4.2；未打 Tier C 时是空函数
  }
  if (snare) {
    const isFill = fill.indexOf(position) >= 0;
    padDrumSound('drum:snare', t + human(8) + .004, vary((isFill ? .58 : .84) * level), true);
  }
  if (on('clap') && pattern.clap.indexOf(position) >= 0 && id !== 'chill') {
    padDrumSound('drum:clap', t + .006, vary(.5 * level), true);
  }
  if (id === 'chill' && position === 15) padDrumSound('drum:clap', t, .3, true);
  if (hat) {
    const open = pattern.openHat.indexOf(position) >= 0;
    const accent = pattern.hatAccent.indexOf(position) >= 0;
    padDrumSound(open ? 'drum:openhat' : 'drum:hat', t + human(open ? 4 : 6), vary((accent ? .44 : .28) * level), true);
  }
  if (bass) {
    const octave = pattern.bassOctave.indexOf(position) >= 0 ? 12 : 0;
    const long = id === 'chill' ? (position === 0 ? 3.6 : 2.2) : position === 0 ? 2.4 : 1.2;
    padInstrumentTone('bass', pattern.roots[bar] + octave, t + human(4), long, vary(.58 * level), true);
  }
  if (on('stab') && pattern.stab.indexOf(position) >= 0) {
    const length = id === 'chill' ? 13.5 : position === 7 ? 1.5 : .9;
    pattern.chords[bar].forEach((midi) => padInstrumentTone(pattern.stabInst, midi, t + human(8) - .003, length, vary(.3 * level), true));
  }
  if (id === 'chill' && position % 8 === 0) {
    pattern.chords[bar].forEach((midi) => padInstrumentTone('pad', midi, t, position === 0 ? 7.5 : 7.2, .22 * level, true));
  }
  if (on('lead') && pattern.lead && pattern.lead.positions.indexOf(position) >= 0) {
    const midi = pattern.chords[bar][1] + 12 + (position % 4 === 0 ? 12 : 0);
    padInstrumentTone(pattern.lead.inst, midi, t + human(8), id === 'chill' ? 2.4 : 1.2, vary(.16 * level), true);
  }
  if (arr.fillHat && position >= 14) padDrumSound('drum:hat', t + .03, .3 * level, true);

  // Tier C：小节级低通（lp → lpEnd 在 build 小节内做指数扫频）
  if (arr.lp && padBackingFilter) {
    const hz = arr.lpEnd ? arr.lp * Math.pow(arr.lpEnd / arr.lp, position / 16) : arr.lp;
    padBackingFilter.frequency.setTargetAtTime(hz, when, stepDur * .5);
  }
}
```

> Tier B 单独落地时，`padPump` 还不存在：在文件里先放一个空实现 `function padPump() {}`（或删掉那行），`arr.lp` 那段因 `padBackingFilter` 为 null 自动跳过。这样做完后，`PAD_GROOVES` 里多出来的字段对老代码是**安静忽略**的，不会报错。

### 3.3 sunny（116 BPM，Disco / Funk House）逐小节处方

**目标**：从「8 分音符 disco 练习曲」变成「有开镲推力 + 钢琴反拍 + 八度贝斯的 funk house 底奏」。

#### bar 1–4：每小节各乐器的落点

> 下面三张「逐小节落点」表描述的是**裸图案**（`PAD_GROOVES` 里的数组）；实际发声 = 裸图案 × `arrange` 的静音/增益。例如 sunny 第 1 小节听不到 bass，是因为 `arrange[0].mute` 里写了 `bass`。两表对照看才是完整编排。

| 乐器 | bar 1 | bar 2 | bar 3 | bar 4（fill） |
|---|---|---|---|---|
| kick | `0,4,8,12` | `0,4,8,12` | `0,4,8,12` | `0,4,8,12` |
| ghostKick | `3,7,11,15` | `3,7,11,15` | `3,7,11,15` | `3,7,11,15` |
| snare | `4,12` | `4,12` | `4,12` | `4,12` + fill `14,15` |
| clap | `4,12` | `4,12` | `4,12` | `4,12` |
| hat（16 分全格） | 全 16 格 | 全 16 格 | 全 16 格 | 全 16 格 |
| openHat（替换该格闭镲） | `2,6,10,14` | `2,6,10,14` | `2,6,10,14` | `2,6,10,14` |
| bass（根音 C2/A1/F1/G1） | `0,3,6,10,12,14`，3/10 升八度 | 同上 + `8` 补一个中音 | 同 bar 1 | 同 bar 1 |
| stab（钢琴 C/Am/F/G） | `2,6,10,14` | `2,6,10,14` | `2,6,10,14` | `2,6,10,14,15` |
| lead（marimba） | — | — | — | — |

bar 4 的 fill：**14、15 两个 16 分 snare**（音量 .58）+ 15 位补一个 piano stab，形成「咚-哒哒-嗒」的 4 小节小过门。不要再用默认的 13/14/15 三连——那个太像节拍器。

#### 16 小节结构（`arrange`）

| 小节 | 动作 | 目标 energy(0–10) |
|---|---|---|
| 1–2 | intro：`hat` 降到 8 分（`pat.hat=2`），低频切到 2.4–3kHz，静音 bass/stab | 4 |
| 3–4 | 加回 16 分 hat，低频开到 5–6kHz，静音 stab；bar 4 小过门 | 5 |
| 5–7 | 全层进入（bass+stab+lead 由 5 起） | 7–8 |
| 8 | **breakdown**：静音 kick/bass/clap，只留 hat+stab+lead，低通 700Hz（「留白」） | 3 |
| 9–11 | 回归全层，low-pass 开到 12k | 8 |
| 12 | **build**：静音 bass/stab，snare 8/10/12/14 四分滚，低通 1.8k→14k 扫频 | 6 |
| 13–15 | **drop**：全层 + 低通 18k（最亮），gain 1.0 | 9–10 |
| 16 | 大过门：snare 12/13/14/15 + gain .92，接回第 1 小节 | 8 |

#### 可直接抄进 `PAD_GROOVES` 的对象

```js
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
  chords: [[64, 67, 72], [60, 64, 69], [65, 69, 72], [62, 67, 71]],  // C / Am / F / G
  roots: [36, 33, 29, 31],
  lead: { inst: 'marimba', positions: [7, 15] },
  swing: 0.10,                                   // 55%
  swingPositions: [1, 3, 5, 7, 9, 11, 13, 15],
  sidechain: { depth: 0.62, hold: 0.021, release: 0.032 },
  level: 0.95,
  bars: [
    {},
    { bass: [0, 3, 6, 8, 10, 12, 14] },          // bar2 多一个 8 位贝斯，避免 4 小节完全一样
    {},
    { stab: [2, 6, 10, 14, 15] }                 // bar4 尾部加一个 15 位 stab 当小过门
  ],
  arrange: [
    { gain: 0.78, lp: 2400, mute: ['bass', 'stab'], pat: { hat: 2 } },                 // 1
    { gain: 0.80, lp: 3000, mute: ['bass', 'stab'], pat: { hat: 2 } },                 // 2
    { gain: 0.88, lp: 5000, mute: ['stab'], snareFill: [14, 15] },                     // 3
    { gain: 0.90, lp: 6000, mute: ['stab'], snareFill: [14, 15] },                     // 4
    { gain: 1 },                                                                       // 5
    { gain: 1 },                                                                       // 6
    { gain: 1 },                                                                       // 7
    { gain: 0.70, lp: 700, mute: ['kick', 'bass', 'clap'], snareFill: [] },            // 8 breakdown
    { gain: 0.95, lp: 12000 },                                                         // 9
    { gain: 1 },                                                                       // 10
    { gain: 1 },                                                                       // 11
    { gain: 0.88, lp: 1800, lpEnd: 14000, mute: ['bass', 'stab'], snareFill: [8, 10, 12, 14] }, // 12 build
    { gain: 1, lp: 18000 },                                                            // 13 drop
    { gain: 1 },                                                                       // 14
    { gain: 1 },                                                                       // 15
    { gain: 0.92, lp: 16000, snareFill: [12, 13, 14, 15] }                             // 16
  ]
}
```

> 不想打 Tier B 补丁时：只保留到 `level` 这一段（`bars`/`arrange`/`swingPositions`/`sidechain` 会被老代码忽略），立刻就能听到 hat 16 分 + 全反拍开镲 + ghost kick 的差别。swing 要等补丁 3 才生效。

### 3.4 bounce（138 BPM，2-step / Speed Garage）逐小节处方

**目标**：从「四拍 + 碎 hat」改成「kick 避开 2、4 拍的 2-step + 62% swing 的 16 分 hat + 反拍 sub + 风琴 skank」。

#### bar 1–4：每小节各乐器的落点

| 乐器 | bar 1 | bar 2 | bar 3 | bar 4（fill） |
|---|---|---|---|---|
| kick | `0,3,6,10` | `0,3,6,10` | `0,3,6,10` | `0,3,6,10` |
| ghostKick | `14` | `14,15` | `14` | `14,15` |
| snare | `4,12` | `4,12` | `4,12` | `4,12` + fill `14,15` |
| clap | `4,12` | `4,12` | `4,12` | `4,12` |
| hat（16 分全格 + 62% swing） | 全 16 格 | 全 16 格 | 全 16 格 | 全 16 格 |
| openHat | `6,14` | `6,14` | `6,14` | `6,14` |
| bass（A1/F1/G1/E1） | `2,6,10,14`，6/14 升八度 | 同 bar 1 | 同 bar 1 | 同 bar 1 |
| stab（风琴 Am/F/G/Em） | `3,7,11,15` | `3,7,11,15` | `3,7,11,15` | `3,7,11,15` + `14` |
| lead（8bit） | — | — | — | — |

关键点：**kick 不踩 12（第 4 拍），把 backbeat 完全让给 snare/clap**——这是 2-step 的「落空」；`14` 的 ghost kick 是下一小节 1 拍的「预推」。

#### 16 小节结构（`arrange`）

| 小节 | 动作 | energy |
|---|---|---|
| 1–2 | intro：hat 先 8 分（避免一上来太花），静音 bass/stab，低通 3k | 4 |
| 3–4 | 切回 16 分 hat（swing 立刻出现），静音 stab；bar 4 小过门 | 6 |
| 5–7 | 全层（bass+stab），swing 最明显 | 8 |
| 8 | **breakdown**：静音 kick/clap，只留 swung hat + stab + bass，低通 900Hz | 3 |
| 9–11 | 回归 + 8bit lead | 8 |
| 12 | **build**：静音 stab，snare 8–15 八连滚，低通 2.5k→16k | 6 |
| 13–15 | **drop**：全层，低通 18k | 10 |
| 16 | 大过门：snare 13/14/15 + gain .95 | 8 |

#### 可直接抄进 `PAD_GROOVES` 的对象

```js
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
  chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]],  // Am / F / G / Em
  roots: [33, 29, 31, 28],                                          // A1 F1 G1 E1
  lead: { inst: '8bit', positions: [7, 15] },
  swing: 0.24,                                   // 62%
  swingPositions: [1, 3, 5, 7, 9, 11, 13, 15],
  sidechain: { depth: 0.55, hold: 0.018, release: 0.027 },
  level: 1,
  bars: [
    {},
    { ghostKick: [14, 15] },
    {},
    { stab: [3, 7, 11, 15, 14] }
  ],
  arrange: [
    { gain: 0.80, lp: 3000, mute: ['bass', 'stab'], pat: { hat: 2 } },                  // 1
    { gain: 0.82, lp: 3600, mute: ['bass', 'stab'], pat: { hat: 2 } },                  // 2
    { gain: 0.88, lp: 6000, mute: ['stab'], snareFill: [14, 15] },                      // 3
    { gain: 0.90, lp: 7000, mute: ['stab'], snareFill: [14, 15] },                      // 4
    { gain: 1 },                                                                        // 5
    { gain: 1 },                                                                        // 6
    { gain: 1 },                                                                        // 7
    { gain: 0.75, lp: 900, mute: ['kick', 'clap'], snareFill: [] },                     // 8 breakdown
    { gain: 0.95, lp: 12000 },                                                          // 9
    { gain: 1 },                                                                        // 10
    { gain: 1 },                                                                        // 11
    { gain: 0.90, lp: 2500, lpEnd: 16000, mute: ['stab'], snareFill: [8, 9, 10, 11, 12, 13, 14, 15] }, // 12 build
    { gain: 1, lp: 18000 },                                                             // 13 drop
    { gain: 1 },                                                                        // 14
    { gain: 1 },                                                                        // 15
    { gain: 0.95, lp: 16000, snareFill: [13, 14, 15] }                                  // 16
  ]
}
```

### 3.5 chill（84 BPM，Lo-fi Half-time）逐小节处方

**目标**：从「散掉的半速」改成「明确 half-time（snare 只落第 3 拍）+ 60% swing 的 16 分 hat + 懒惰 ghost kick + 7 和弦 pad + 磁带抖动」。

#### bar 1–4：每小节各乐器的落点

| 乐器 | bar 1 | bar 2 | bar 3 | bar 4（fill） |
|---|---|---|---|---|
| kick | `0,7,10` | `0,7,10` | `0,7,10` | `0,7,10` |
| ghostKick | `14` | `14` | `14` | `14` |
| snare | `8`（第 3 拍 = 半速 backbeat） | `8` | `8` | `8` + fill `14`（很轻） |
| clap | 代码固定 15 位（2277 行） | 同 | 同 | 同 |
| hat（16 分 + 60% swing） | 全 16 格 | 全 16 格 | 全 16 格 | 全 16 格 |
| openHat | `6,14` | `6,14` | `6,14` | `6,14` |
| bass（D2/G2/C2/A1） | `0,6,10,14`，10 升八度 | 同 bar 1 | 同 bar 1 | 同 bar 1 |
| pad（7 和弦，长音） | `0,8`（代码固定） | `0,8` | `0,8` | `0,8` |
| lead（harp） | — | — | — | — |

bar 4 的 fill 要「轻」：只补一个 14 位 ghost snare（音量 .35 左右），不要 16 分滚——lo-fi 的过门是「漏掉一拍」而不是「加一串」。

#### 16 小节结构（`arrange`）

| 小节 | 动作 | energy |
|---|---|---|
| 1–2 | intro：只有 kick + pad（静音 hat/snare/bass），低通 3.5k | 3 |
| 3–4 | 加 snare + 16 分 hat（swing 出现），仍静音 bass | 4 |
| 5–7 | 全层，含 bass | 6 |
| 8 | **breakdown**：只留 pad + 低通 900Hz（磁带喘息） | 2 |
| 9–11 | 回归，加 harp lead | 6–7 |
| 12 | **build（轻）**：静音 lead，低通 1.8k→9k，snare 10/12 两点 | 5 |
| 13–15 | **drop**：全层 + 低通 10k | 7 |
| 16 | 收尾过门：snare 14/15 | 6 |

#### 可直接抄进 `PAD_GROOVES` 的对象

```js
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
  chords: [[50, 53, 57, 60], [55, 58, 62, 65], [48, 52, 55, 59], [45, 48, 52, 55]], // Dm7 / Gm7 / Cmaj7 / Am7
  roots: [38, 43, 36, 33],                                                          // D2 G2 C2 A1
  lead: { inst: 'harp', positions: [5, 13] },
  swing: 0.20,                                   // 60%
  swingPositions: [1, 3, 5, 7, 9, 11, 13, 15],
  sidechain: { depth: 0.70, hold: 0.030, release: 0.045 },
  level: 0.74,
  bars: [
    {},
    {},
    {},
    { ghostKick: [14], snare: [8] }
  ],
  arrange: [
    { gain: 0.78, lp: 3500, mute: ['hat', 'snare', 'bass'] },                          // 1
    { gain: 0.80, lp: 4000, mute: ['hat', 'snare', 'bass'] },                          // 2
    { gain: 0.85, lp: 5000, mute: ['bass'] },                                          // 3
    { gain: 0.85, lp: 5200, mute: ['bass'], snareFill: [14] },                         // 4
    { gain: 0.92, lp: 6000 },                                                          // 5
    { gain: 0.92, lp: 6000 },                                                          // 6
    { gain: 0.92, lp: 6000 },                                                          // 7
    { gain: 0.72, lp: 900, mute: ['kick', 'snare', 'hat'], snareFill: [] },            // 8 breakdown
    { gain: 0.90, lp: 7000 },                                                          // 9
    { gain: 0.95, lp: 7000 },                                                          // 10
    { gain: 0.95, lp: 7000 },                                                          // 11
    { gain: 0.88, lp: 1800, lpEnd: 9000, mute: ['lead'], snareFill: [10, 12] },        // 12 build
    { gain: 1, lp: 10000 },                                                            // 13 drop
    { gain: 1, lp: 10000 },                                                            // 14
    { gain: 1, lp: 10000 },                                                            // 15
    { gain: 0.90, lp: 9500, snareFill: [14, 15] }                                      // 16
  ]
}
```

> chill 的两个「代码写死」要注意：clap 在 15 位每小节固定响（`.3`），以及 `stab` 数组为 `[]` 时和弦靠 2292 行的 `position % 8 === 0` 长 pad 铺——这既是特点也是限制，Tier C 之后可以改成由 `arrange` 控制。

### 3.6 过门（fill）与 choke 的统一规则

1. **过门只出现在乐句末尾**：4 小节末尾用「1–2 个音符」的小过门；8 小节末尾用「切掉 kick 一拍 + 4 连 snare」；16 小节末尾才允许整小节 snare roll。三套的 `arrange` 已按这个梯度写。
2. **不要在 4 小节尺度反复用同一招**：现有 `bar===3 && position>=13` 每 4 小节固定三连 snare，是「机械感」的主要来源；Tier B 后由 `snareFill` 显式控制，三套分别是 2 点 / 2 点 / 1 点 / 4 点 的梯度。
3. **drop 前留白**：`arrange[11]`（第 12 小节）静音 bass/stab、低通关闭，让第 13 小节的全层回归产生「开闸」感。此技巧也出现在 2-step garage 的经典处理里：第 2 小节第 1 拍故意不踩 kick，靠周围音符「暗示」出这个 1（Attack 的 Rolling 2-Step 教程明确提到）。
4. **choke 规则**：open hat 必须被下一个 hat 收短（见 4.7）；snare 与 clap 在 chill 里不要同时响（现有代码已保证）；`bass` 和 `kick` 同格时靠侧链 duck 分出层次（4.2）。

### 3.7 参考链接（第 3 章）

- Attack Magazine · Rolling 2-Step（第 2 小节第 1 拍不踩 kick 的留白手法、swing 60–65%）：https://www.attackmagazine.com/technique/beat-dissected/rolling-2-step-garage/
- Attack Magazine · Going Off Grid: What Is Swing And How To Add It：https://www.attackmagazine.com/technique/tutorials/going-off-grid-what-is-swing-and-how-to-add-it/
- Ableton Learning Music · Song structure（4/8/16 小节成块与 arranging）：https://learningmusic.ableton.com/song-structure/song-structure.html
- DJ TechTools · Phrasing The Perfect Mix（8-16-32 乐句与能量期待）：https://djtechtools.com/2009/01/26/phrasing-the-perfect-mix/
- Sound on Sound · Drum Beat Construction Part 1（syncopation / swing / dynamism 的具体做法）：https://www.soundonsound.com/techniques/drum-beat-construction-part-1-sos-podcast

---

## 4. Web Audio 可实现的效果（接线 + 参数 + 坑）

### 4.1 目标信号图

现在的链路只有一条（1322–1333）：

```text
padMixInput ────────┐
                    ├─► padCompressor(-16, 3.5:1) ─► padOutput(.82) ─► master ─► destination
padBackingInput(1.5)┘
```

重写后的目标链路（**新增 1 条底奏分线 + 5 个效果点**）。为免 ASCII 图太绕，按「干声 / 延迟 / 不动」三条路径读：

```text
【干声路径（新增）】
padBackingInput(鼓, 增益 1.5→1.2) ──────────────┐
                                                ├─► padBackingFilter ─► padDuckUser ─► padCompressor(-12, 3:1)
padBackingTonalInput ─► padDuckSC ─► padWow ────┘        ▲                 ▲
                         ▲                              │                 │
                    kick 触发（setTargetAtTime）    padDrive→padDriveWet  用户敲击时 -2dB
                                                  （并联饱和支路）

【延迟支路（新增）】
note.delaySend ─► padDelaySend ─► padDelay ─► padDelayTone(LP 2600) ─┬─► padDelayFb(0.3) ─↩ padDelay
                                                                     └─► padDelayWet(0.5) ─► padBackingFilter

【原有路径（不动）】
padCompressor ─► padOutput(.82) ─► master ─► padLimiter（新增）─► destination
padMixInput(1.0) ─► padCompressor
```

设计要点：

1. **必须把 kick 和 tonal 分开**，否则侧链会把 kick 自己也压掉（详见 4.2 的坑）。
2. 滤波器放在「鼓 + tonal 的汇合点之后」，这样 breakdown/build 的扫频会同时作用在鼓和和声上，效果才像 DJ 在推滤波旋钮。
3. 用户敲击的 duck 放在压缩器之前，保证「用户敲击一出现，整条底奏让位」。
4. `padMixInput` 路径不要动（旋律/采样音不能被底奏的滤波和 wow 污染）。

### 4.2 Sidechain pump（GainNode + setTargetAtTime 模拟）

**为什么不能直接用 `DynamicsCompressorNode` 的侧链**：Web Audio 规范里 `DynamicsCompressorNode` **只有一个 input**（没有 key/sidechain 输入，MDN 的输入输出表明确写 1 in / 1 out），所以只能「用包络自动化模拟」。

**正确做法**（新增 tonal 分线 + 一个 duck GainNode）。先在 175 行 `let padBackingInput = null;` 旁补齐变量声明，否则严格模式下直接赋值会抛错：

```js
// 175 行附近
let padBackingTonalInput = null, padDuckSC = null, padDuckUser = null;
let padBackingFilter = null, padWow = null, padWowLfo = null, padWowDepth = null;
let padDelay = null, padDelaySend = null, padDelayTone = null, padDelayFb = null, padDelayWet = null;
let padDrive = null, padDriveWet = null;

// —— ensureAudio() 内新增 ——
padBackingTonalInput = audioCtx.createGain();
padBackingTonalInput.gain.value = 1.2;
padDuckSC = audioCtx.createGain();
padDuckSC.gain.value = 1;
padWow = audioCtx.createDelay(0.05);       // 见 4.6
padWow.delayTime.value = 0.012;
padBackingTonalInput.connect(padDuckSC).connect(padWow);

padBackingFilter = audioCtx.createBiquadFilter();
padBackingFilter.type = 'lowpass';
padBackingFilter.frequency.value = 18000;
padBackingFilter.Q.value = 0.7;

padWow.connect(padBackingFilter);
padBackingInput.connect(padBackingFilter);
padBackingFilter.connect(padDuckUser).connect(padCompressor);

// —— createSoundBus 的路由选择（1275 行）改成三路 ——
const busInput =
  note?.backingTonal && padBackingTonalInput ? padBackingTonalInput
  : note?.backing && padBackingInput ? padBackingInput
  : note?.padBus && padMixInput ? padMixInput
  : null;

// —— 侧链触发 ——
function padPump(when, opts) {
  if (!padDuckSC) return;
  const depth = (opts && opts.depth) || 0.62;
  const hold = (opts && opts.hold) || 0.021;
  const release = (opts && opts.release) || 0.032;
  const g = padDuckSC.gain;
  g.setTargetAtTime(depth, when, 0.004);       // 3–5ms 下潜，软起不咔哒
  g.setTargetAtTime(1, when + hold, release);  // 指数回升：3*release ≈ 95% 恢复
}
```

在 `schedulePadBackingStep` 的 kick 分支里调用 `padPump(t, groove.sidechain)`（3.2 的补丁已经写好）。

**参数表（按 groove）**

| groove | depth（线性 / dB） | hold | release | 效果 |
|---|---|---|---|---|
| sunny 116 | 0.62 / −4.2 dB | 21 ms | 32 ms | 有呼吸但不夸张 |
| bounce 138 | 0.55 / −5.2 dB | 18 ms | 27 ms | 快而弹，2-step 的「抽」 |
| chill 84 | 0.70 / −3.1 dB | 30 ms | 45 ms | 慢而深，lo-fi 的慵懒 pumping |

**四个必须知道的坑**

1. **不要把 duck 放在 `padBackingInput` 上**：kick 也在那条线上，侧链会把 kick 的瞬态一起压掉，听感是「kick 变闷、变软」。一定要拆 tonal 分线。
2. **不要调 `cancelScheduledValues`**：调度器提前 120ms 排程（2304 行），cancel 会误删已经排好的后续泵动；`setTargetAtTime` 的新事件会自然接管旧 ramp。
3. **不要在同一个 step 里既 setValueAtTime 又 setTargetAtTime**：只有 `setValueAtTime` 是硬跳变，会咔哒。全程用两次 `setTargetAtTime`。
4. **恢复时间要小于 16 分长度**：116 BPM 的 16 分是 129ms，`hold + 3*release = 117ms`，刚好在下一格之前回来；如果 release 设成 100ms，会拖到下一拍，听起来像「低频永远回不来」。

**用户敲击也让底奏让位**（这是「底奏和用户敲击不打架」的第二道保险）：

```js
// ensureAudio() 内（padBackingFilter → padDuckUser → padCompressor 已在上面连好，这里只补 duck 节点本身）
padDuckUser = audioCtx.createGain();
padDuckUser.gain.value = 1;

function padDuckForUser(when) {
  const g = padDuckUser.gain;
  g.setTargetAtTime(0.78, when, 0.004);      // ≈ −2.1 dB
  g.setTargetAtTime(1, when + 0.028, 0.06);  // ~180ms 完全回来
}

// hitPadSource（2335 行）里，const now = audioCtx.currentTime; 之后加：
padDuckForUser(now + 0.005);
```

### 4.3 Delay send（DelayNode + feedback + 只发 tonal）

```js
// —— ensureAudio() 内新增 ——
padDelaySend = audioCtx.createGain();       padDelaySend.gain.value = 0.22;
padDelay = audioCtx.createDelay(1.0);       // maxDelayTime 1s 够用（3 个 16 分 ≈ 0.39s）
padDelayTone = audioCtx.createBiquadFilter();
padDelayTone.type = 'lowpass'; padDelayTone.frequency.value = 2600;  // 反馈回路里越来越暗
padDelayFb = audioCtx.createGain();         padDelayFb.gain.value = 0.30;
padDelayWet = audioCtx.createGain();        padDelayWet.gain.value = 0.50;

padDelaySend.connect(padDelay);
padDelay.connect(padDelayTone);
padDelayTone.connect(padDelayFb).connect(padDelay);  // 反馈环：环里必须有 DelayNode
padDelayTone.connect(padDelayWet).connect(padBackingFilter);
```

```js
// —— createSoundBus（1271 行）内，const temporaryNodes = [output]; 之后插入 ——
if (note && note.delaySend && padDelaySend) {
  const send = audioCtx.createGain();
  send.gain.value = clamp(note.delaySend, 0, 0.6);
  output.connect(send).connect(padDelaySend);
  temporaryNodes.push(send);   // 现有 cleanup 会顺带断开，不会泄漏
}
```

```js
// —— 切换底奏时设置时值 = 3 个 16 分（附点八分）——
padDelay.delayTime.setTargetAtTime(padStepDuration(id) * 3, audioCtx.currentTime, 0.08);
```

**规则**：`delaySend` 只给 `stab` / `lead` / `pad` 传（0.15–0.25），**绝不给 bass 和 kick**——低频进延迟会让 mix 瞬间变浑。反馈增益必须 < 0.5，否则会自激啸叫；`padDelayTone` 的低通是「让回声越来越暗」的关键，比单纯调小 wet 更自然。

### 4.4 低通滤波扫频（build / breakdown 的核心）

```js
// ensureAudio() 内
padBackingFilter = audioCtx.createBiquadFilter();
padBackingFilter.type = 'lowpass';
padBackingFilter.frequency.value = 18000;
padBackingFilter.Q.value = 0.7;

// 可选：再串一个高通清掉 DC / 超低频
const padHighpass = audioCtx.createBiquadFilter();
padHighpass.type = 'highpass';
padHighpass.frequency.value = 35;
```

调度里已经写成：`arr.lp` 是本小节起点，`arr.lpEnd` 存在时按 `position/16` 做指数插值（3.2 补丁最后 4 行）。参数建议：

| 场景 | lp → lpEnd | 时间常数 | 听感 |
|---|---|---|---|
| intro | 2400–3000 固定 | — | 像隔壁房间传来的 |
| breakdown | 700–900 固定 | — | 只留中频，制造「抽空」 |
| build | 1800 → 14000/16000 | `stepDur * 0.5` | 4 小节内「开闸」 |
| drop | 18000 固定 | — | 全频段 |

> 想让 build 更猛：把 `Q` 临时推到 3–5（会有 resonance 哨音），drop 时再回 0.7。但 resonance 容易在手机上产生刺耳感，建议 Q ≤ 2。

### 4.5 Waveshaper 饱和（给 kick / bass 加「脏」）

```js
function padDriveCurve(amount) {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1;
    curve[i] = Math.tanh(amount * x) / Math.tanh(amount);
  }
  return curve;
}

// ensureAudio() 内（并联，保留干声）
padDrive = audioCtx.createWaveShaper();
padDrive.curve = padDriveCurve(2.5);
padDrive.oversample = '4x';                 // 减少高频混叠
padDriveWet = audioCtx.createGain(); padDriveWet.gain.value = 0.28;
padBackingFilter.connect(padDrive).connect(padDriveWet).connect(padDuckUser);
// 干声：padBackingFilter.connect(padDuckUser);（原本那条保持不变）
```

- 并联 25–35% 的湿声就能「加厚」而不糊；串联 100% 会把 kick 变成失真墙。
- `amount` 2–3 是「磁带饱和」，6 以上是「失真」。三套底奏建议：sunny 2.0、bounce 3.0、chill 1.6。
- **注意输入电平**：`padBackingInput` 现在是 1.5，遇 `tanh` 会立刻削平；做饱和前先把 1.5 降到 1.2（或加 trim gain 0.8）。

### 4.6 Tape wow / flutter（lo-fi 的灵魂，且不用改音色函数）

`DelayNode.delayTime` 是 **a-rate AudioParam**，可以用 LFO 调制——这是最便宜的全总线「磁带抖动」实现，不需要去改 `instrumentSound` 里每个 oscillator 的 `detune`。

```js
// —— ensureAudio() 内 ——
padWow = audioCtx.createDelay(0.05);        // max 50ms
padWow.delayTime.value = 0.012;             // 基础延迟 12ms
padWowLfo = audioCtx.createOscillator();
padWowLfo.frequency.value = 0.45;           // 0.3–0.8Hz 是「wow」
padWowDepth = audioCtx.createGain();
padWowDepth.gain.value = 0.0035;            // ±3.5ms，必须 < 12ms 基础值
padWowLfo.connect(padWowDepth).connect(padWow.delayTime);
padWowLfo.start();

// 可选 flutter（更快更浅）：6.1Hz，±0.25ms
```

- 只给 `chill` 用：切换底奏时 `padWowDepth.gain.setTargetAtTime(id === 'chill' ? 0.0035 : 0.0002, now, 0.05)`。
- 深度不要超过基础延迟的一半，否则 delayTime 会冲到 0 附近产生「数字爆音」。
- 想更狠的 lo-fi：在 `padBackingFilter` 后再挂一个 12-bit 量化型 WaveShaper（阶跃曲线），但本项目的目标是「meme 音乐实验室」，建议先做 wow + 低通即可。

### 4.7 鼓组 layering 与 choke

**分层原则**：每一层负责不同的频段与包络段（transient 0–8ms / body 10–80ms / tail 80–300ms），层数 3–4 层就够，再多只会糊。

```js
// —— padDrumSound（2185 行）分支参数重写 ——
if (type === 'kick') {
  tone('sine', 170, when, .32, .95, 46);      // sub 主体：170→46Hz
  tone('triangle', 88, when, .12, .30, 44);   // 中低频「体感」
  tone('square', 340, when, .012, .08, 150);  // click（给手机小喇叭听）
  noise(when, .010, 3000, .10);               // 噪声瞬态，增加「点」
} else if (type === 'snare') {
  noise(when, .20, 1900, .52);                // 主体噪声
  noise(when + .012, .05, 5200, .16);         // 高频「脆」
  tone('triangle', 195, when, .10, .22, 120); // 低频 body
} else if (type === 'clap') {
  [0, .020, .045].forEach((offset, index) => noise(when + offset, .11 - index * .012, 1450 + index * 420, .24));
} else if (type === 'hat' || type === 'openhat') {
  noise(when, type === 'openhat' ? .20 : .07, 7900, .22);
  noise(when, type === 'openhat' ? .14 : .03, 10800, .10);
  tone('square', 8200, when, type === 'openhat' ? .16 : .04, .035);  // 金属「叮」
}
```

**Open hat choke**（开镲被下一个闭镲收掉，是 house/garage 干净的关键）：现有 `padSampleVoices`（1578–1591 行）已经示范了「同一音色再触发时快速收掉上一声」的做法，照抄到 hat 上：

```js
let padOpenHatVoice = null;

// padDrumSound 的 hat 分支里包一层独立 gate
if (type === 'hat' || type === 'openhat') {
  const gate = audioCtx.createGain();
  gate.gain.value = 1;
  gate.connect(soundOutput);
  const previous = soundOutput;
  soundOutput = gate;
  try {
    /* 上面那几行合成 */
  } finally {
    soundOutput = previous;
  }
  if (type === 'openhat') {
    padOpenHatVoice = gate;
    setTimeout(() => { try { gate.disconnect(); } catch (_) {} }, 700);   // 兜底释放
  } else if (padOpenHatVoice) {
    try {
      padOpenHatVoice.gain.cancelScheduledValues(when);
      padOpenHatVoice.gain.setTargetAtTime(0, when, 0.003);                // 3ms 收掉
    } catch (_) { /* 上一声已结束 */ }
    padOpenHatVoice = null;
  }
}
```

**顺手可捡的便宜**：`createSoundBus` 本身支持 per-note 混响（1278–1298 行），`padInstrumentTone` 只是把 `reverbPreset` 写死成 `'none'`。给 clap / stab 传 `reverbPreset: 'plate', reverbWet: 0.12` 就能白得一点 clap 空间感，**不需要新增任何节点**。

### 4.8 压缩 / 限幅参数

| 节点 | 参数 | 建议值 | 说明 |
|---|---|---|---|
| `padCompressor`（现有） | threshold / knee / ratio | **−12 dB / 8 / 3:1** | 现在 −16 dB / 3.5:1 再配 1.5 倍输入，长期处在压缩区（估计 2–4dB reduction） |
| | attack / release | 8 ms / 140 ms | attack 太短会削掉 kick 瞬态 |
| `padOutput`（现有） | gain | 0.85 | 1.5→1.2 之后可以略升 |
| `padLimiter`（新增） | threshold / knee | −6 dB / 0 | 放在 master 之后、destination 之前 |
| | ratio / attack / release | 20:1 / 2 ms / 60 ms | 防削顶，不是母带级 |
| 测量目标 | peak | ≤ −1 dBFS | 见 6.4 |
| | 底奏 RMS | −20 ~ −14 dBFS | 随 energy 变化 |

> Web Audio 的 `DynamicsCompressorNode` **没有 lookahead**，所以「限幅」只能做到「软削」；把 `master.gain = outputVolume/100`（1334 行）和 limiter 之间的余量留够，别指望它救爆音。

### 4.9 接线总表（改哪里 / 加什么 / 风险）

所有音色仍然由 `withSoundBus` / `createSoundBus` 生成，**不会绕过现有音量、混响与清理逻辑**；真正必须改的只有 `createSoundBus` 里 `busInput` 的三路选择（1275 行），其余都是总线级节点。`padDrumSound` / `padInstrumentTone` 的调用点只改参数、不改结构。

| 目标 | 改哪个函数/位置 | 新增节点 | 需要新总线 | Tier |
|---|---|---|---|---|
| swing 全风格生效 | `schedulePadBackingStep`（2257） | 无 | 无 | B |
| 每小节图案覆盖 + fill | 2255 + `padBarPattern` | 无 | 无 | B |
| 16 小节结构 | 2306 + `arrange` | 无 | 无 | B |
| 侧链 pump | kick 分支 + `ensureAudio` | `padDuckSC` | **是**（tonal 分线） | C |
| 用户敲击 duck | `hitPadSource`（2338） | `padDuckUser` | 否 | C |
| delay send | `createSoundBus`（1277）+ `padInstrumentTone` | Delay + 3 Gain + Biquad | 否 | C |
| 低通扫频 | `ensureAudio` + 调度 | 2 Biquad | 否 | C |
| 饱和 | `ensureAudio` | WaveShaper + Gain | 否 | C |
| tape wow | `ensureAudio` | Delay + Osc + Gain | 否 | C |
| 鼓 layering | `padDrumSound`（2185） | 无 | 无 | A/C |
| open hat choke | `padDrumSound` | 每声一个 Gain | 否 | C |
| clap/stab 混响 | `createSoundBus` 现成路径 | 无 | 否 | A |

**`padInstrumentTone` 的 Tier C 版本**（保持向后兼容，旧调用传 `true` 仍然可用）：

```js
function padInstrumentTone(instrument, midi, when, length, volume, opts = {}) {
  const options = typeof opts === 'boolean' ? { bus: opts } : opts;
  const tonal = options.bus === 'tonal';
  const row = nearestPitchRow(midi);
  const stepLength = padStepDuration();
  withSoundBus({
    loopVolume: volume,
    reverbPreset: options.reverbPreset || 'none',
    reverbWet: options.reverbWet,
    padBus: true,
    backing: !!options.bus && !tonal,
    backingTonal: tonal,
    delaySend: options.delaySend || 0
  }, when, length * stepLength, () => {
    instrumentSound(`instrument:${instrument}`, row, when, false, { midi, length, stepLength });
  });
}
```

Tier C 之后把 3.2 补丁里的调用替换成：

| 层 | 调用 |
|---|---|
| bass | `padInstrumentTone('bass', midi, t, long, vol, { bus: 'tonal' })`（bass 必须被侧链压） |
| stab | `padInstrumentTone(stabInst, midi, t, len, vol, { bus: 'tonal', delaySend: .18, reverbPreset: 'plate', reverbWet: .12 })` |
| chill pad | `padInstrumentTone('pad', midi, t, len, vol, { bus: 'tonal', reverbPreset: 'room', reverbWet: .1 })` |
| lead | `padInstrumentTone(inst, midi, t, len, vol, { bus: 'tonal', delaySend: .22 })` |
| 鼓 | 保持 `true`（走 `padBackingInput`，不被侧链压） |

### 4.10 参考链接（第 4 章）

- MDN · `AudioParam.setTargetAtTime()`（时间常数、3×TC≈95%、为何指数逼近）：https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime
- MDN · `DelayNode`（`delayTime` 为 a-rate、反馈环必须含 DelayNode）：https://developer.mozilla.org/en-US/docs/Web/API/DelayNode
- MDN · `DynamicsCompressorNode`（输入输出仅 1 in / 1 out，**无侧链输入**）：https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode
- MDN · `WaveShaperNode`（curve / oversample）：https://developer.mozilla.org/en-US/docs/Web/API/WaveShaperNode
- MDN · `BiquadFilterNode`（lowpass/highpass/Q）：https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode
- Web Audio API 规范 · DynamicsCompressorNode：https://webaudio.github.io/web-audio-api/#DynamicsCompressorNode
- Wikipedia · Ducking：https://en.wikipedia.org/wiki/Ducking
- iZotope · What is sidechain compression：https://www.izotope.com/community/blog/what-is-sidechain-compression
- Native Instruments · Sidechain compression demystified：https://www.native-instruments.com/blogs/blog/sidechain-compression

---

## 5. DJ 结构意识：让 loop 音乐不重复

### 5.1 乐句语法：4 / 8 / 16 / 32

- **4 小节** = 一个「微循环」，是听众身体记忆的最小单位，也是用户敲击垫子时的安全区。
- **8 小节** = 一个「小段落」，通常是 2 个微循环（A 段 + A' 段）。
- **16 小节** = 一条完整的「说一句话」，包含铺垫 → 转折 → 兑现。
- **32 小节** = DJ 混音的对齐单位；本项目一个 backing loop 用 16 小节已经足够，32 小节会让等待太久（116 BPM 下 16 小节已经 33 秒）。

DJ 术语里这叫 phrasing：大多数西方音乐以 8/16/32 拍为乐句，观众会「预期」在乐句边界听到变化。**在预期的位置给变化 = 爽；在意外的位置给变化 = 乱。**（DJ TechTools 与 Ableton Learning Music 都强调 4/8/16 的成块结构。）

### 5.2 loop 音乐制造变化的 10 条规则（按优先级）

1. **减法优先**：想让第 9 小节「不一样」，最有效的是第 8 小节**拿掉** kick 与 bass，而不是第 9 小节再加一个音色。
2. **每次只改一层**：一个 8 小节窗口只动 1 个元素（比如 5–8 小节只加了 lead），听众才能分辨出「变化」。
3. **用滤波代替加音符**：能量变化 60% 可以由一个低通旋钮完成，音符密度变化 40% 就够；两者同时做会「过载」。
4. **4 小节保持骨架不变**：kick/snare/hat 骨架是 DJ 与用户敲击的对齐基准，骨架一变，用户的 4 拍手感就断。
5. **过门密度递增**：4 小节 → 1–2 个音符；8 小节 → 4 连 snare；16 小节 → 整小节 roll 或整拍留白。
6. **不要每 4 小节用同样的过门**：现有代码的 `bar===3 && position>=13` 就犯了这条。
7. **留白是最便宜的 hook**：第 8 小节只留 pad + 滤波，比任何 riser 都有戏剧性。
8. **交替 A/B 图案**：同一个 4 小节循环里，bar 2 的 bass 与 bar 4 的 stab 各改一个音，循环 16 次也不会腻。
9. **能量曲线先画后写**：先定 16 个 0–10 的目标值，再让 `arrange` 逼近它；不要边听边加层。
10. **结尾要留「回头」**：第 16 小节末尾的 fill 必须能自然接回第 1 小节（同调、同拍、同音色），否则循环听起来像「断了」。

### 5.3 留白与过门：爽感从哪里来

- **Drop 前 1–2 拍留白**：第 12 小节最后 2 个 16 分全部静音，第 13 小节的 kick 会「像被人推了一把」。这是最便宜也最有效的爽点。
- **「不踩第一拍」**：2-step garage 的经典手法——第 2 小节第 1 拍故意不踩 kick，靠周围的 hat/snare 暗示出这个 1，听众会自动「补」上，产生一种被拉扯的快感（Attack 的 Rolling 2-Step 教程明确示范）。本项目可以在 `arrange[barOfLoop].pat.kick` 里删掉 `0`。
- **Snare roll 的密度是「预告」**：4 连（每拍）→ 8 连（每 8 分）→ 16 连（每 16 分），密度越高＝drop 越近；不要一开始就 16 连。
- **过门后必须「给答案」**：有 fill 的第 4/8/12/16 小节之后，下一小节必须立刻回到完整骨架，否则 fill 只是噪音。
- **留白不是「关掉所有东西」**：breakdown 里保留 pad + 一点 hat 的尾巴，静音的只是低频与鼓的骨架。

### 5.4 底奏 vs 用户敲击：频率分工 / 音量层级 / choke

**频率分工表**

| 元素 | 主要能量 | 与谁抢 | 处理 |
|---|---|---|---|
| backing kick | 45–90 Hz 基频 + 2–5 kHz click | bass、用户敲击的低频 | 独占正拍；侧链压 tonal |
| backing bass | 60–130 Hz | kick | 已在 `instrumentSound` 里 LP 850；被侧链压 |
| stab / pad | 200 Hz–2 kHz | 用户敲击的中频 | 高通过 180 Hz；用户敲击时整体 −2 dB |
| hat / openhat | 6–12 kHz | 几乎不抢 | 控制音量（`.28/.44` 已分档） |
| 用户敲击（采样/合成） | 300 Hz–5 kHz 宽频 | stab/pad/lead | 短衰减（`padHit` 上限 .26s）+ 触发时 duck 底奏 |

**音量层级（相对 master 的建议）**

| 层 | 目标 | 说明 |
|---|---|---|
| 用户敲击 | 峰值 −6 ~ −3 dBFS | 必须是全场最「前」的东西 |
| backing kick | 峰值 −8 dBFS 左右 | 让路给用户敲击 |
| backing snare/clap | −12 dBFS | |
| backing bass | −14 dBFS | 靠侧链与 kick 分时占低频 |
| stab/pad/lead | −18 ~ −22 dBFS | 背景层 |
| `padBackingInput` 总线增益 | **1.2**（现在是 1.5） | 1.5 会一直顶压缩器，动态被吃掉 |
| `padCompressor` 之后（`padOutput`） | 峰值 ≤ −1 dBFS | 见 4.8 limiter |

**choke / duck 策略清单**

1. **kick → bass/stab/pad**：侧链 duck（4.2），深度按 BPM 分档。
2. **用户敲击 → 整条底奏**：−2 dB / 180ms 的 duck（4.2 末尾），保证敲击不会被底奏淹没。
3. **open hat → 下一个 hat**：3ms choke（4.7），避免 16 分 hat 叠成「沙拉声」。
4. **snare 与 clap 不要同点满音量**：现在 sunny/bounce 都是 `.84` + `.5`，同点会「厚但钝」；建议 snare 降到 `.7`、clap 留 `.5`，或者像 chill 一样只保留一个。
5. **bass 与 kick 同格时**：如果某套 groove 的 bass 落在 0/4/8/12，靠侧链也救不回「低频糊」；正确做法是把 bass 挪到反拍（见 2.2 的 house 配方）。

### 5.5 16 小节能量曲线模板（三套通用参考）

| 小节 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sunny | 4 | 4 | 5 | 5 | 7 | 8 | 8 | **3** | 7 | 8 | 8 | **6** | 9 | 9 | 9 | 8 |
| bounce | 4 | 4 | 6 | 6 | 8 | 8 | 8 | **3** | 8 | 8 | 8 | **6** | 10 | 10 | 10 | 8 |
| chill | 3 | 3 | 4 | 4 | 6 | 6 | 6 | **2** | 6 | 7 | 7 | **5** | 7 | 7 | 7 | 6 |

读法：第 8 小节是全体 breakdown（掉到 2–3），第 12 小节是 build（回落到 5–6 制造「憋住」），第 13 小节 drop 到峰值（9–10），第 16 小节回到 8 给下一轮留余地。

### 5.6 参考链接（第 5 章）

- DJ TechTools · How to DJ: Phrasing The Perfect Mix（8-16-32 乐句与「观众预期」）：https://djtechtools.com/2009/01/26/phrasing-the-perfect-mix/
- DJ TechTools · Phrase Mixing（乐句对齐）：https://djtechtools.com/2015/10/22/phrase-mixing-throwback-thursday-dj-technique/
- Ableton Learning Music · Song structure（「multiples of four, eight, or 16 bars」）：https://learningmusic.ableton.com/song-structure/song-structure.html
- Attack Magazine · Rolling 2-Step（第 2 小节第 1 拍不踩 kick 的留白）：https://www.attackmagazine.com/technique/beat-dissected/rolling-2-step-garage/
- Wikipedia · Ducking：https://en.wikipedia.org/wiki/Ducking
- Wikipedia · Ghost note：https://en.wikipedia.org/wiki/Ghost_note

---

## 6. 验证方法：怎么证明 groove 真的按设计跑

### 6.1 验证目标清单

| # | 要证明的事 | 工具 | 通过标准 |
|---|---|---|---|
| 1 | 每个 16 分位的命中集合与设计一致 | `meme-pad-beat` 事件日志 | 零 mismatch |
| 2 | swing 真的位移了奇数位、且幅度正确 | 调试 trace / 包络 onset | 偏差 ≤ 1ms |
| 3 | 16 小节结构与 arrange 一致（第 8 小节 breakdown） | `barOfLoop` 统计 | 第 8 小节 kick 命中 = 0 |
| 4 | 能量曲线符合设计（breakdown 掉、drop 起） | AnalyserNode RMS 按小节聚合 | breakdown 低 ≥ 4dB、drop 高 ≥ 1dB |
| 5 | 不削顶、不爆音 | 峰值采样 | 峰值绝对值 < 0.98，削顶样本 < 3 |
| 6 | 调度健康（不丢步、不超前/滞后） | `padBackingStep` 增量 | 步速率误差 < 2% |
| 7 | 灯带/图案事件与声音同步 | 事件 wall-clock 间隔 | 前台抖动 < 15ms |

### 6.2 先装一个只读调试口

`PAD_GROOVES`、`padBackingStep` 都在模块闭包里，外部拿不到。加一行**只读**调试口（不改任何逻辑），验证完可删：

```js
// 加在 setPadBacking 附近（或文件底部 IIFE 内）
window.__padState = () => ({
  id: padBackingId,
  step: padBackingStep,
  next: padBackingNextTime,
  ctx: audioCtx ? audioCtx.currentTime : 0,
  stepDur: padBackingId ? padStepDuration(padBackingId) : 0
});
window.__padGroove = (id) => JSON.parse(JSON.stringify(PAD_GROOVES[id] || {}));
```

### 6.3 验证 1：命中集合

事件由 `emitPadBeat`（2214 行）在 `when` 时刻通过 `setTimeout` 派发 `meme-pad-beat`，`detail` 里有 `{ step, position, id, duration, kick, snare, hat, bass, chord, bar }`；Tier B 之后还会多出 `barOfLoop` 与 `swingMs`。

```js
// 控制台：采集 30 秒
window.__beatLog = [];
window.addEventListener('meme-pad-beat', (e) => {
  const d = e.detail;
  window.__beatLog.push({
    step: d.step, position: d.position, bar: d.bar, barOfLoop: d.barOfLoop,
    id: d.id, kick: !!d.kick, snare: !!d.snare, hat: !!d.hat, bass: !!d.bass, chord: !!d.chord,
    swingMs: d.swingMs || 0, wall: performance.now()
  });
});
```

```js
// 只取「全层、无 bars 覆盖、无 fill」的小节做集合校验：
// sunny/bounce 的 bars[1] 覆盖落在 barOfLoop 1/5/9/13，bars[3] 落在 3/7/11/15
// 所以取 barOfLoop 4 与 6（第 5、7 小节）
function auditHits(id, expectLayers) {
  const log = window.__beatLog.filter((e) => e.id === id && (e.barOfLoop === 4 || e.barOfLoop === 6));
  const seen = Object.create(null);
  log.forEach((e) => {
    for (const layer of Object.keys(expectLayers)) {
      if (e[layer]) seen[layer + ':' + e.position] = (seen[layer + ':' + e.position] || 0) + 1;
    }
  });
  const problems = [];
  for (const layer of Object.keys(expectLayers)) {
    for (let p = 0; p < 16; p++) {
      const should = expectLayers[layer].indexOf(p) >= 0;
      const got = !!seen[layer + ':' + p];
      if (should !== got) problems.push(`${layer}@${p} 期望=${should} 实际=${got}`);
    }
  }
  console.table(log.reduce((acc, e) => { acc[e.position] = acc[e.position] || 0; acc[e.position]++; return acc; }, {}));
  return problems.length ? problems : 'PASS';
}

// 三个调色板（对齐 3.3–3.5 的对象；hat 是 16 分全格）
// 注意：事件里的 kick 布尔 = kick ∪ ghostKick，所以 ghost 位置也要算进去
auditHits('sunny',  { kick: [0,3,4,7,8,11,12,15], snare: [4,12], hat: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], bass: [0,3,6,10,12,14], chord: [2,6,10,14] });
auditHits('bounce', { kick: [0,3,6,10,14], snare: [4,12], hat: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], bass: [2,6,10,14], chord: [3,7,11,15] });
auditHits('chill',  { kick: [0,7,10,14], snare: [8], hat: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], bass: [0,6,10,14], chord: [0,8] });
```

> 注意：sunny/bounce 的 `bars[]` 覆盖与 `arrange`（第 1–4、8、12、16 小节）会改变命中，所以校验窗口选第 5 与第 7 小节（`barOfLoop` 4 和 6）。chill 的 `chord` 在 0/8 位是代码里的长 pad，不是 `stab`。另外每次切换 groove 前先清空 `__beatLog`，否则旧事件会混进来。

### 6.4 验证 2：swing 位移

**设计层验证**（最可靠，不依赖浏览器定时器精度）：Tier B 的 `emitPadBeat` 已经把 `swingMs` 带出来，直接对照 1.2 的表。

```js
// 采 16 小节（step 0..255）后：
const log = window.__beatLog;
const bad = log.filter((e) => {
  const odd = e.position % 2 === 1;
  const state = window.__padState();
  const expected = odd ? (window.__padGroove(e.id).swing || 0) * state.stepDur : 0;
  return Math.abs(e.swingMs - expected) > 0.001;
});
bad.length === 0 ? 'swing PASS' : bad.slice(0, 5);
```

**声音层验证**（可选，用来确认改动真的进了音频）：`emitPadBeat` 的 `setTimeout` 精度只有毫秒级，不能直接量声波；正确做法是用 `AnalyserNode` 抓包络、检测「上升沿」：

```js
// 高频带（hat）在控制台执行：只留 6kHz 以上，测 hat 的 onset 间隔
async function onsetProbe({ highpass = 6000, ms = 8000 } = {}) {
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  const hp = audioCtx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = highpass;
  padBackingInput.connect(hp).connect(analyser);      // 或 padBackingFilter（Tier C）
  const data = new Float32Array(analyser.fftSize);
  const onsets = [];
  let prev = 0;
  const timer = setInterval(() => {
    analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    const rms = Math.sqrt(sum / data.length);
    if (rms > 0.03 && prev <= 0.03) onsets.push(audioCtx.currentTime);
    prev = rms;
  }, 8);
  await new Promise((resolve) => setTimeout(resolve, ms));
  clearInterval(timer);
  hp.disconnect();
  return onsets.slice(1).map((t, i) => +(t - onsets[i]).toFixed(4));
}
// const gaps = await onsetProbe({ highpass: 6000, ms: 8000 });
// 判定：相邻 onset 间隔应交替出现 (1 + swing) 与 (1 - swing) 个 16 分
// sunny 期望 ≈ [0.90, 1.10] × stepDur 交替；bounce 期望 ≈ [0.76, 1.24] × stepDur
```

> 阈值法只对「开镲/重音 hat」这种明显起音可靠，音量只有 `.28` 的 ghost 16 分可能低于阈值；所以这个探针用来验证 swing 的**是否存在**，精确幅度仍以 6.4 的设计层验证为准。

> 84 BPM、60% swing 时，奇数位晚 35.7ms、偶数位早 0——这是 lo-fi 的「瘸腿感」，别以为是 bug。

### 6.5 验证 3：16 小节结构

```js
// 第 8 小节（barOfLoop === 7）breakdown：kick 命中应为 0
const bar8 = window.__beatLog.filter((e) => e.barOfLoop === 7);
if (!Number.isInteger(bar8[0] && bar8[0].barOfLoop)) throw new Error('先打 Tier B 补丁：emitPadBeat 需要带 barOfLoop');
const kicksInBar8 = bar8.filter((e) => e.kick).length;
// 通过标准：sunny/bounce 的 kicksInBar8 === 0；chill 同样 0
kicksInBar8;
```

再确认循环边界：`step` 从 63 跳到 64 时 `barOfLoop` 从 3 跳到 4（而不是回到 0），说明 256 步循环生效；到 `step 255 → 0` 时才是真正的一轮结束。

### 6.6 验证 4：能量曲线 / RMS

```js
function probeRmsByBar(ms = 45000) {
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  padBackingInput.connect(analyser);                  // Tier C 后改成 padBackingFilter.connect(analyser)
  const data = new Float32Array(analyser.fftSize);
  const buckets = Array.from({ length: 16 }, () => []);
  const timer = setInterval(() => {
    analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    const rms = Math.sqrt(sum / data.length);
    const state = window.__padState();
    if (!state.id) return;
    buckets[Math.floor(state.step / 16) % 16].push(rms);
  }, 10);
  setTimeout(() => clearInterval(timer), ms);
  return buckets.map((list) => {
    const mean = list.length ? Math.sqrt(list.reduce((a, v) => a + v * v, 0) / list.length) : 0;
    return +(20 * Math.log10(mean + 1e-9)).toFixed(1);   // dBFS
  });
}
// 返回数组下标 0–15 对应第 1–16 小节。判定（以 sunny 为例，括号内是下标）：
//   avg(第5–7小节 = 下标4-6) - 第8小节(下标7) >= 4 dB  → breakdown 成立
//   第13小节(下标12) >= avg(下标4-6) + 1 dB             → drop 成立
//   第16小节(下标15) 与第13小节(下标12) 差 < 2 dB       → 过门没有把能量打断
// 采样时长至少 2 轮 16 小节，否则某些小节样本太少：sunny 66s / bounce 56s / chill 92s
```

### 6.7 验证 5：峰值 / 削顶 / 爆音

```js
function probePeak(ms = 8000) {
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  master.connect(analyser);
  const data = new Float32Array(analyser.fftSize);
  let max = 0, clipped = 0;
  const timer = setInterval(() => {
    analyser.getFloatTimeDomainData(data);
    for (let i = 0; i < data.length; i++) {
      const a = Math.abs(data[i]);
      if (a > max) max = a;
      if (a > 0.99) clipped++;
    }
  }, 8);
  setTimeout(() => clearInterval(timer), ms);
  return { peak: +max.toFixed(3), clipped };
}
// 通过标准：peak < 0.98、clipped < 3
```

爆音的三个常见来源：① wow 深度 > 基础延迟（`padWowDepth` 必须 < `padWow.delayTime`）；② delay 反馈 ≥ 0.5 自激；③ 滤波器扫频用 `setValueAtTime` 逐格硬跳（必须用 `setTargetAtTime`）。

### 6.8 验证 6：调度健康度

```js
// 10 秒内 padBackingStep 的增量应 ≈ bpm*4/60*10
// sunny 116 → 77.3 步；bounce 138 → 92 步；chill 84 → 56 步
const s0 = window.__padState();
setTimeout(() => {
  const s1 = window.__padState();
  const elapsed = s1.ctx - s0.ctx;
  const rate = (s1.step - s0.step) / elapsed;      // 步/秒
  console.log('步速率', rate, '期望', 116 * 4 / 60);  // 7.73
  console.log('lookahead 剩余', s1.next - s1.ctx);    // 应稳定在 0 ~ 0.12s
}, 10000);
```

通过标准：步速率误差 < 2%；`next - ctx` 始终在 0–0.12s（超出说明主线程卡顿或标签页被节流）；`step` 在 255 之后回到 0。若统计窗口里发生了一次循环回绕（`s1.step < s0.step`），要把增量加上 `PAD_LOOP_STEPS` 再算。

### 6.9 验证 7：视觉事件与声音的同步

`emitPadBeat` 的派发延迟 = `when - audioCtx.currentTime`，所以事件 wall-clock 间隔应 ≈ 16 分音符长度。用 6.3 采集的 `wall` 字段：

```js
const gaps = [];
const log = window.__beatLog;
for (let i = 1; i < log.length; i++) gaps.push(log[i].wall - log[i - 1].wall);
const stepMs = window.__padState().stepDur * 1000;
const jitter = gaps.map((g) => +(g - stepMs).toFixed(1));
// 前台标签页：|jitter| 中位数 < 5ms、最大值 < 15ms 为通过
// 后台标签页：setTimeout 被节流到 ≥1000ms，此时应改为「只按 step 序号验证顺序」
```

> 这也是为什么「灯带/背景/图案」的动画必须容忍 30–60ms 的抖动，不要把视觉逻辑写成「必须严格等于音频时间」。Tier B 把 `emitPadBeat` 的时间从 `when` 改成 `t`（带 swing）后，视觉会晚 13–36ms，对 LED 完全没问题。

### 6.10 听感验收（自动化之外）

- **脚拍测试**：关掉画面只听 90 秒，脚是否自动跟着踩 4 拍（house/techno）或点头频率减半（chill 的 half-time）。
- **「别扭点」定位**：如果觉得某处「卡」，先怀疑三处——kick 与 bass 同格、fill 与下一小节骨架不同调、swing 作用到了不该作用的层（比如把 snare 也甩了）。snare 在偶数位不会受 swing 影响，这是当前实现的正确行为。
- **切换测试**：三套底奏互相切换，确认 BPM 改变时 `padStepDuration(id)`（补丁 1）没有用错全局 id，延迟/侧链/滤波参数都跟着重置。

### 6.11 参考链接（第 6 章）

- MDN · `AnalyserNode`（`getFloatTimeDomainData` 做 RMS/峰值）：https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode
- MDN · `AnalyserNode.getFloatTimeDomainData()`：https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getFloatTimeDomainData
- MDN · `performance.now()`：https://developer.mozilla.org/en-US/docs/Web/API/Performance/now
- MDN · `DynamicsCompressorNode.reduction`（读取实时压缩量，可用于盯压缩器是否一直顶着）：https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode/reduction
- Web Audio API 规范（AudioParam 自动化时间线语义）：https://webaudio.github.io/web-audio-api/
- Splice Blog · How to Humanize MIDI Drums（humanize 的听感目标）：https://splice.com/blog/humanize-your-drums/

---

## 7. 参考链接总清单

**A. 教材 / 概念**
1. Ableton Learning Music · Get started / chapters：https://learningmusic.ableton.com/
2. Ableton Learning Music · Beats（beat/tempo）：https://learningmusic.ableton.com/make-beats/make-beats.html
3. Ableton Learning Music · Tempo and genre：https://learningmusic.ableton.com/make-beats/tempo-and-genre.html
4. Ableton Learning Music · Backbeats：https://learningmusic.ableton.com/make-beats/backbeats.html
5. Ableton Learning Music · Bars：https://learningmusic.ableton.com/make-beats/bars.html
6. Ableton Learning Music · Song structure：https://learningmusic.ableton.com/song-structure/song-structure.html
7. Wikipedia · Swing time：https://en.wikipedia.org/wiki/Swing_time
8. Wikipedia · Ghost note：https://en.wikipedia.org/wiki/Ghost_note
9. Wikipedia · Ducking：https://en.wikipedia.org/wiki/Ducking

**B. 风格配方 / Beat Dissected**
10. Attack · Rolling 2-Step（UKG 2-step）：https://www.attackmagazine.com/technique/beat-dissected/rolling-2-step-garage/
11. Attack · Interplanetary Criminal-Style Garage：https://www.attackmagazine.com/technique/beat-dissected/interplanetary-criminal-style-garage/
12. Attack · Deep House：https://www.attackmagazine.com/technique/beat-dissected/deep-house-stripped-workout-beat-dissected/
13. Attack · Big House：https://www.attackmagazine.com/technique/beat-dissected/big-house/
14. Attack · Polished House：https://www.attackmagazine.com/technique/beat-dissected/polished-house/
15. Attack · Thumping Techno：https://www.attackmagazine.com/technique/beat-dissected/thumping-techno/
16. Attack · Grinding Analogue Techno：https://www.attackmagazine.com/technique/beat-dissected/grinding-analogue-techno/
17. Attack · Raw Drum & Bass：https://www.attackmagazine.com/technique/beat-dissected/raw-drum-bass/
18. Attack · Incessant Drum & Bass：https://www.attackmagazine.com/technique/beat-dissected/incessant-drum-bass-beat/
19. Attack · 90s Boom Bap Hip Hop：https://www.attackmagazine.com/technique/beat-dissected/90s-boom-bap-hip-hop/
20. Wikipedia · UK garage：https://en.wikipedia.org/wiki/UK_garage
21. Wikipedia · Four on the floor：https://en.wikipedia.org/wiki/Four_on_the_floor_(music)
22. Wikipedia · Techno：https://en.wikipedia.org/wiki/Techno
23. Wikipedia · Drum and bass：https://en.wikipedia.org/wiki/Drum_and_bass
24. Wikipedia · Breakbeat：https://en.wikipedia.org/wiki/Breakbeat
25. Wikipedia · Boom bap：https://en.wikipedia.org/wiki/Boom_bap
26. Wikipedia · Lofi hip-hop：https://en.wikipedia.org/wiki/Lofi_hip-hop

**C. 律动 / 混音技术**
27. Attack · Going Off Grid: What Is Swing And How To Add It：https://www.attackmagazine.com/technique/tutorials/going-off-grid-what-is-swing-and-how-to-add-it/
28. Splice · How to Humanize MIDI Drums：https://splice.com/blog/humanize-your-drums/
29. Sound on Sound · Drum Beat Construction Part 1：https://www.soundonsound.com/techniques/drum-beat-construction-part-1-sos-podcast
30. iZotope · What is sidechain compression：https://www.izotope.com/community/blog/what-is-sidechain-compression
31. Native Instruments · Sidechain compression demystified：https://www.native-instruments.com/blogs/blog/sidechain-compression
32. DJ TechTools · Phrasing The Perfect Mix：https://djtechtools.com/2009/01/26/phrasing-the-perfect-mix/
33. DJ TechTools · Phrase Mixing：https://djtechtools.com/2015/10/22/phrase-mixing-throwback-thursday-dj-technique/

**D. Web Audio API**
34. MDN · AudioParam.setTargetAtTime：https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime
35. MDN · DelayNode：https://developer.mozilla.org/en-US/docs/Web/API/DelayNode
36. MDN · DynamicsCompressorNode：https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode
37. MDN · WaveShaperNode：https://developer.mozilla.org/en-US/docs/Web/API/WaveShaperNode
38. MDN · BiquadFilterNode：https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode
39. MDN · AnalyserNode：https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode
40. MDN · AnalyserNode.getFloatTimeDomainData：https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getFloatTimeDomainData
41. MDN · performance.now()：https://developer.mozilla.org/en-US/docs/Web/API/Performance/now
42. Web Audio API 规范：https://webaudio.github.io/web-audio-api/

---

## 附录 A：建议的落地顺序（5 个可独立验收的改动）

| 顺序 | 改动 | 涉及 | 预期听感 | 风险 |
|---|---|---|---|---|
| **1** | 抄 3.3–3.5 的 `PAD_GROOVES`（只抄数组，不抄 `bars/arrange`） | 2252–2300 的配置 | hat 变成 16 分、全反拍开镲、ghost kick 补齐；三套风格立刻分开 | 高频变吵 → 把 `level` 降 5–10% |
| **2** | Tier B 补丁：swing 全风格 + `bars/arrange` + 256 步 | 2183、2252–2300、2306 | 三套各有正确的摇摆；第 8 小节 breakdown、第 12 小节 build、第 13 小节 drop | 改了调度，必须跑 6.3 命中集合与 6.8 步速率 |
| **3** | 拆 tonal 分线 + 侧链 `padPump` | 1275、1322–1333、kick 分支 | 底奏开始「呼吸」，kick 不再被 bass 掩蔽 | 只压 tonal，别压到 kick；depth > 0.5 会太抽 |
| **4** | 用户敲击 duck + open hat choke | `hitPadSource`、`padDrumSound` | 敲垫子时底奏自动让位；hat 不再糊成一片 | choke 节点要能释放，防止泄漏 |
| **5** | 低通扫频 + delay send + waveshaper + tape wow | `ensureAudio`、`createSoundBus` | build 有「开闸」、stab 有回声、lo-fi 有磁带味 | 峰值与自激；按 6.7 检查 |

顺序理由：1 是纯收益零风险；2 是所有结构效果的容器；3 解决低频根本矛盾；4 解决「底奏与用户打架」；5 才是润色。反过来做（先上效果再改音符）最容易做出「糊在一起」的结果。

## 附录 B：术语中英对照

| 中文 | English | 一句话 |
|---|---|---|
| 律动 | groove | 音符之外的推力 |
| 摇摆 | swing | 把弱拍往后推 |
| 切分 | syncopation | 重音落在弱位 |
| 四拍地板 | four-on-the-floor | 每拍都踩 kick |
| 反拍重音 | backbeat | 2、4 拍的 snare/clap |
| 鬼音 | ghost note | 低音量的影子音符 |
| 呼应 | call & response | 一问一答 |
| 张与弛 | tension & release | 积累不稳定再释放 |
| 过门 | fill | 乐句末尾的碎音 |
| 留白 | break / drop-out | 故意空出来 |
| 侧链泵动 | sidechain pump | kick 触发 bass 压低 |
| 人性化 | humanization | 时序/力度微抖动 |
| 叠层 | layering | 多层合成一个音色 |
| 能量曲线 | energy curve | 逐小节的强弱规划 |
| 乐句 | phrase | 4/8/16/32 小节成块 |

## 附录 C：不要做的事（血泪清单）

1. **不要给 bass/kick 发 delay send**——低频进延迟会让整条底奏变浑。
2. **不要在 `padBackingInput` 上做侧链**——会把 kick 自己压闷；必须拆 tonal 分线。
3. **不要用 `cancelScheduledValues` 清泵动**——调度器提前 120ms 排程，会误删后续事件。
4. **不要让 swing 作用到 snare 的 4/12 位**——偶数位天生不位移；一旦你手动位移 snare，2、4 拍会「跛」。
5. **不要在 84 BPM 用 16 分 hat 满音量**——16 分间隔 178ms，满音量会像洒水车；`hatAccent` 落差与 `level .74` 必须保留。
6. **不要给 `padBackingInput` 保持 1.5 增益**——它一直顶着压缩器，动态全没了；降 1.2 后再用 limiter 兜底。
7. **不要在 build 里同时做「加音符 + 开滤波 + 加 snare roll」**——三种张力同时上会提前泄掉 drop。
8. **不要改 `chill` 的 15 位 clap 与 0/8 位 pad 行为而不看 2277/2292 行**——它们写死在调度里，不是配置项。
