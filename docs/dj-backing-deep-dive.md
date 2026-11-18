# 第二轮：真曲基准分析 + `pad-grooves.js` 编曲引擎

> 交付物：`src/pad-grooves.js`（编曲引擎）+ 本文件（分析、设计、音色处方、接线点）。
> 本轮**没有改** `src/main.js` / `index.html` / `assets/`；接线点见第 5 节，由 lead 落地。
> 自检脚本为临时文件，已从 `_shots/` 删除，不在仓库里。

---

## 1. 基准：`assets/friend-wine-dj.mp3` 到底是怎么「像 DJ」的

### 1.1 分析方法（离线、可复现）

| 步骤 | 工具/参数 |
|---|---|
| 解码 | ffmpeg → 22050 Hz / 16bit / 单声道 + 立体声两份 WAV（MP3 原生采样率即 22050，避免重采样伪影） |
| 节拍 | 低频（<180 Hz）包络峰值 → kick 间隔中位数 = 拍长；再用最小二乘拟合网格相位 |
| 鼓组声学 | 以网格对齐后做**平均包络**（同相位叠加，其它乐器互相抵消）+ 起音前 50ms 背景扣除的平均频谱 |
| 频段/响度 | 平均周期图（2048 点 Hann），dBFS 按 16bit 满刻度 |
| 立体声 | mid/side 能量比 + L/R 相关系数，按频段拆分 |
| 对照 | 用 numpy 按 `padDrumSound` 的参数离线重建我们的 kick/snare/hat/bass（同 Web Audio 包络语义），用同一套指标量 |

### 1.2 全局数据

| 指标 | 数值 |
|---|---|
| 时长 / 格式 | 183.80 s，22050 Hz，立体声，160 kbps MP3（3.68 MB） |
| BPM | **129.9 ≈ 130**（kick 间隔中位 461.5 ms；16 分 = 115.6 ms） |
| 小节 | 1.847 s / 小节，共 **99 小节**（≈ 398 拍 = 12.4 个 8 小节乐句） |
| 响度 | RMS **−15.45 dBFS**，peak −1.24 dBFS，crest 14.2 dB |
| 短时 RMS（100 ms） | p5 −22.2 / p25 −18.3 / **p50 −16.0** / p75 −13.8 / p95 −12.3 dBFS |
| 频谱重心 | 865 Hz（整曲） |
| 低频 | **150 Hz 以下占 56.2%**：sub(20–60) 14.4% / bass(60–150) 41.8% |
| 中频 | lowmid(150–500) 9.5% / mid(500–2k) 20.5% / highmid(2–6k) 12.0% |
| 空气感 | 6–11k 只 **1.8%**（已是 22.05k 采样率的极限频段，且被 MP3 压缩） |
| 立体声 | side/mid **−10.9 dB**，L/R 相关 **0.851**；按频段：low −13.3 / mid −8.8 / high −10.0 / air −7.3 dB |

> 读法：这是一条**典型俱乐部母带**——低频厚（56%）、中频克制（20%）、高频只做点缀（1.8%＋2–6k 的 12%），不是「亮」而是「厚」。side/mid −11 dB 说明有宽度但鼓与 bass 仍是居中的，宽度主要来自中高频。

### 1.3 鼓组声学参数（参考曲 vs 我们的合成器）

| 指标 | 参考 kick | 我们 kick | 参考 snare | 我们 snare | 参考 hat | 我们 hat |
|---|---|---|---|---|---|---|
| 频谱重心 | 1364 Hz（含残响，bg 扣除） | **129 Hz** | 3601 Hz（1.2–6k 带内） | **2028 Hz** | 7141 Hz（6–10.5k 带内） | **8743 Hz** |
| 2–6 kHz 能量占比 | 17.4% | **0%** | 10.1%（受残留 bass 污染，带内重心更准） | 41.0% | 22.5% | 22.5% |
| 起音时间 | 2.8 ms | 约 1.5 ms | 3.3 ms | 1.9 ms | 3.6 ms | 3.2 ms |
| −6 dB 衰减 | 3.8 ms | 1.5 ms | 11.7 ms | 1.9 ms | 1.9 ms | 3.2 ms |
| −12 dB 衰减 | 29.2 ms | 21.7 ms | 79.4 ms | 20.3 ms | 51.1 ms | **8.3 ms** |
| −20 dB 衰减 | 46.2 ms | 47.9 ms | 132.0 ms | **40.8 ms** | 195.6 ms（含开镲/尾音） | **15.3 ms** |
| 峰值频率 | 93 Hz | 60–150 Hz 内为主 | — | — | — | — |
| 局部 <80 Hz 能量 | 45%（kick 250 ms 窗） | 2% | — | — | — | — |

参考曲 kick 统计：384 次（**3.88 次/小节**，4-on-floor；网格中位误差 25 ms，说明是真人/DJ 混音而非硬量化）；snare/clap 类瞬态 783 次（7.9/小节，含 clap、perc、人声瞬态）；hat 1858 次（**18.8 次/小节**，16 分细分 + 8 分反拍，8 分反拍相对网格中位偏差 **−3.8 ms**，即基本直拍）。

> 注意：`我们`一列是用 numpy 按 `padDrumSound` 参数离线重建的单声部指标（未过压缩器/总线），与参考曲在混音里的实测不完全同条件，但量级差异足够说明问题。

### 1.4 侧链泵动

参考曲 tonal 频段（500–2k）在 kick 后 +20 ms 与 +300 ms 的能量比中位 **0.72（−2.9 dB）**，p10 = 0.09 → 有明确但不过分的 ducking。我们上一版 `depth 0.62` 是 −4.2 dB，泵动偏深；本轮 `pad-grooves` 的 `pump` 参数已按 −3 dB 对齐（sunny 0.70 / bounce 0.68 / chill 0.74）。

### 1.5 段落结构：99 小节的「DJ 式连续混音」

按 kick 数 + 低频能量 + 特征 novelty 检测，得到：

| 段落 | 小节 | 时间 | 特征 |
|---|---|---|---|
| A 段 | 1–40 | 0–74 s | 4-on-floor 稳定；每 8 小节一次**轻过渡**（bar 8/16/24/32：kick 3.9→2–3 下、低频短暂 −2~−4 dB） |
| 过渡 1 | 40–44 | 74–81 s | bar 40 低频 **−26.3 dB、kick 只剩 1 下**；bar 43 再 −21.8 dB；novelty 峰值在 bar 44–46 → 换曲/换段 |
| B 段 | 45–84 | 83–155 s | 恢复 4-on-floor；bar 51/59/67/75/83 每 8 小节一次轻过渡（低频 −2~−4 dB） |
| 过渡 2 | 84–88 | 155–162 s | novelty 峰值 bar 84–85，低频/中频比例切换 |
| C 段 | 89–99 | 164–183 s | 最后一个 8 小节乐句 + 结尾 bar 99 低频 −24.3 dB（收尾） |

结论：**「DJ 感」不是靠大起大落，而是靠「groove 从不断 + 每 8 小节一次小动作」**。全曲没有一个小节是全静音的，最低谷（bar 40）kick 仍剩 1 下、hat 仍有 20 次。这正是我们上一版 arrange 最大的问题——breakdown 整小节静音，听感是「断了」而不是「留白」。

### 1.6 分析局限（写清楚，避免过读）

- 22050 Hz 采样率的上限是 11 kHz，6–11k「空气感 1.8%」含 MP3 低通的影响；真实高频可能略多。
- 参考曲是**混音成品**，单件乐器频谱只能靠「同相位对齐 + 背景扣除」估计；kick/snare 的频段占比会在 breakdown 处被 bass 残留污染（表中已标注）。
- 我们自己一列是离线重建，**不含**总线压缩、限幅、延迟、混响；实际 app 里会更「粘」一点。
- BPM 有 ±0.2 的估计误差（130 ± 0.2）。

---

## 2. 「为什么听起来不像 DJ」：5 条可量化的差异

| # | 差异 | 实测证据 | 后果（听感） |
|---|---|---|---|
| 1 | **kick 没有 click/中高频** | 我们 kick 500 Hz 以上能量 **0%**；参考 kick 2–6k 占 17.4%、mid(500–2k) 占 32.8% | 在手机、笔记本、夜店远端都听不到「点」，只剩闷的轰；DJ 的 kick 是「点+体+尾」三层，我们只有「体」 |
| 2 | **snare 短了 3 倍且偏暗** | −20 dB 衰减 40.8 ms vs 132.0 ms；带内重心 2028 Hz vs 3601 Hz | 没有「脆响 + 短尾巴」，backbeat 变成「噗」；参考曲的 snare 是整首歌的锚点 |
| 3 | **hat 干、短、偏亮** | −12 dB 衰减 8.3 ms vs 51.1 ms；重心 8743 Hz vs 7141 Hz | 帽子是「tic」不是「ts」，16 分连打时变成一串塑料声，没有金属余韵 |
| 4 | **整条底奏 100% 单声道** | 参考 side/mid −10.9 dB、corr 0.851；`tone()`/`noise()` 全部单节点单声道 | 声场窄、贴脸、和用户敲击抢同一点；DJ 混音里 pad/stab 是有宽度的 |
| 5 | **律动与结构是「量化 loop」而不是「混音」** | 参考：130 BPM、kick 3.88/小节、hat 18.8/小节、每 8 小节轻过渡、短时 RMS −22~−12、pump −2.9 dB；上一版：116/138/84 BPM、breakdown 整小节静音、无 riser/impact、hat 只有 0.28/0.44 两档力度、pump −4.2 dB | 段落对比是「断」而不是「推」，律动是「平」而不是「滚」；BPM 与参考曲差 8–14 BPM，接歌/对拍时更明显 |

> 第 1–4 条是**音色/混音**问题（第 4 节处方），第 5 条是**编曲/律动**问题（第 3 节 + `pad-grooves.js`）。两者必须同时修，否则只换编排听起来还是「合成器 demo」。

---

## 3. `src/pad-grooves.js`：编曲引擎设计

### 3.1 对外契约（严格按 lead 给的形状）

```js
window.PadGrooves = {
  PAD_LOOP_STEPS,                    // 256
  padGrooveBpm(id),                  // sunny 124 / bounce 134 / chill 86
  scheduleStep(step, when, id, api)  // 纯调度：不碰 audioCtx，只调 api.*
}
```

`api` 语义（`pad-grooves.js` 内部只认这 5 个方法）：

| 方法 | 调用时机 | 参数 |
|---|---|---|
| `drum(kind, when, volume)` | 每个鼓事件 | kind 见下；when 已经在 `when+swing` 之后的绝对时间；volume 0–1 |
| `tonal(inst, midi, when, lengthSteps, volume, opts)` | bass/stab/pad/lead | `lengthSteps` 是 16 分步数；`opts={bus:'tonal', delaySend?, reverbPreset?, reverbWet?}` |
| `pump(when, opts)` | 每次主 kick | `{depth, hold, release}`（按 BPM 预置） |
| `lowpass(hz, when, timeConstant)` | 段落过滤/扫频 | 只在该小节起点或扫频小节每 2 步调用，避免刷爆自动化 |
| `emit(detail)` | **每一步** | `{kick,snare,hat,bass,chord,bar,barOfLoop,swingMs,gain}`，字段严格按契约 |

`kind` 取值：`kick` / `kick:ghost` / `snare` / `clap` / `hat` / `openhat` / `rim` / `impact` / `riser`。

### 3.2 时间线规则

1. **swing**：只位移奇数 16 分（1,3,5,…,15），`swingMs = stepDur × swing`；百分比换算 `P = 50 + 50×swing` → sunny 55%、bounce 60%、chill 60%。`emit.swingMs` 让灯带/图案能知道这次晚了多少。
2. **和弦**：`chords[barOfLoop % 8]`，8 小节一轮（前 8 / 后 8 用同一和声骨架，靠段落变化区分）。每小节取一个四声部 voicing，**不是三和弦根位堆叠**（自检断言「voicing 每个音 ≥ root+12，且相邻声部 ≥2 个半音」）。
3. **bass**：`[position, 相对根音半音, 长度, 力度]`，半音含 `12`（八度）与 `7`（五度），并带切分位置（sunny 0/3/6/10/12/14，bounce 全反拍，chill 0/6/10/14）。
4. **每 4 小节变化**：`variation[barOfLoop % 4]` 追加 ghost kick / 额外 kick / bass pick-up，避免 4 小节完全复制。
5. **fill**：`snare4`（第 4 小节）/ `snare8`（第 8 小节）/ `snare16`（build 末）/ `hatRoll` / `kickRoll`，力度随位置递增。
6. **段落动作**：`riser` 只在「上一段落没有 riser」的 bar 起点触发一次（main.js 可安全按 2 小节长度合成，不会被重复触发打断）；`impact` 只在 drop 第一拍。
7. **过滤**：`filter:[from,to]`，非扫频段只在 bar 起点设一次；扫频段每 2 步指数插值（build/breakdown 的「开闸/关闸」）。
8. **无状态**：`scheduleStep` 不记忆任何跨调用状态（除纯函数查表），所以可以乱序重放/离线跑测试；切歌时 main.js 只需把滤波器复位（现有 `setPadBacking` 已有）。

### 3.3 三套 groove 的人设与 BPM 调整

| groove | BPM（旧→新） | 目标风格 | 为什么改 |
|---|---|---|---|
| sunny | 116 → **124** | Disco / Funk House（C 大调） | 参考曲 130；disco/funk house 的黄金区 120–126。116 太慢，4 分底鼓之间的空隙会让 16 分 hat 听起来「拖」。124 既保留 disco 的松弛，又接近参考曲的接歌区间 |
| bounce | 138 → **134** | 2-step / Speed Garage（A 小调） | 2-step 的摆幅在 130–136 最自然；138 会让 swung 16 分变成「赶」 |
| chill | 84 → **86** | Lo-fi Half-time（C 大调） | half-time 的感知速度是 BPM÷2；86 BPM 听感约 172 BPM，落在 lo-fi/hip-hop 的常用区，同时比 84 多一点前进感 |

三套的**底鼓语义**刻意做成三种：sunny 每拍都踩（4-on-floor）、bounce 避开 2/4 拍（2-step）、chill snare 落在第 3 拍（half-time）。用户切换时是「换风格」而不是「换速度」。

### 3.4 16 小节结构（每套都含 intro/加层/breakdown/build/drop/过门）

**sunny（124 BPM，16 分 = 121 ms）**

| 小节 | 段落 | 动作 | gain |
|---|---|---|---|
| 1–2 | intro | kick 4OTF + 16 分 hat；低通 900→2200；无 bass/snare/stab | 0.72–0.76 |
| 3–4 | add | bass 与钢琴 stab 进入、反拍开镲、snare 2/4；低通 2400→6000；第 4 小节 `snare4` 过门 | 0.84–0.88 |
| 5–6 | groove | ghost kick、clap、shaker 全开；低通 9–10 kHz | 0.94–0.97 |
| 7–8 | build | riser 起、snare 8→16 roll、低通 3k→14k、kick 逐层减薄 | 0.92–0.90 |
| 9–12 | drop | 第 9 小节 impact + lead 进入 + 全层；第 12 小节 `snare4` 过门 | 1.0 |
| 13–14 | breakdown | kick/bass 全撤，pad 进入、hat 保留、低通 12k→1.8k、riser 起 | 0.78–0.74 |
| 15–16 | build2 | kick 回来（0.8→0.9）、snare roll、低通 1.8k→12k | 0.82–0.86 |

**bounce（134 BPM，16 分 = 112 ms）**：结构与 sunny 同骨架，但 1–2 小节就有 snare 2/4 与 rim、bass 从 3 小节进、drop 段加 8bit lead；breakdown 保留 swung hat + pad + organ stab。kick 数每小节 3–4（不是 4），这是 2-step 的「落空感」。

**chill（86 BPM，16 分 = 174 ms）**：

| 小节 | 段落 | 动作 | gain |
|---|---|---|---|
| 1–2 | intro | 只有 kick + 七和弦 pad（无 hat/bass） | 0.78–0.80 |
| 3–4 | add | 8 分 hat 进入、bass 进入、snare 第 3 拍 | 0.82–0.84 |
| 5–8 | groove | 16 分 hat（drop 段才用）、ghost kick、open hat | 0.90–0.92 |
| 9–10 | build | soft riser + snare roll + 低通 3k→11k | 0.86–0.84 |
| 11–14 | drop | impact + harp lead + 全层 | 1.0 |
| 15–16 | breakdown | kick/snare 撤、pad + hat、低通 8k→1.2k | 0.78–0.74 |

> 「不能只是把 kick 静音」在本轮的具体做法：breakdown 有 pad 层进入 + 低通扫频 + riser + hat 保留；build 有 snare roll（三级密度）+ 滤波开闸；drop 有 impact + lead 新增；每 4 小节还有 variation 的 ghost/bass 小变化。

### 3.5 音量层级（`VOL` 常量 × 段落系数 × gain，节选实测范围）

| 层 | 基础音量 · 实测范围（中位） | 说明 |
|---|---|---|
| kick | 0.95 · 0.47–0.95（0.84） | intro/breakdown 按段落系数降到 0.47 |
| kick:ghost | 0.32 · 0.18–0.32（0.32） | 不触发 pump，避免连续 duck |
| snare | 0.80 · 0.09–0.80（0.48） | fill 命中更低（0.3–0.7） |
| clap | 0.50 · 0.16–0.50（0.30） | 只 sunny 用 |
| rim | 0.42 · 0.09–0.25（0.20） | bounce/chill 的细节层 |
| hat | 0.24 / accent 0.46 · 0.10–0.41（0.18） | 反拍 8 分用 accent 力度 |
| openhat | 0.40 · 0.27–0.46（0.45） | 只在小节系数允许时开 |
| bass | 0.95（trim）× 音符力度 · 0.12–0.59（0.41） | 参考曲 bass 是全曲最重的层 |
| stab | 0.85（trim）× 音符力度 · 0.07–0.36（0.18） | 钢琴/风琴短和弦 |
| pad | 1.00（trim）× 音符力度 · 0.07–0.18（0.15） | 长音铺底 |
| lead | 1.00（trim）× 音符力度 · 0.10–0.16（0.14） | drop 段才出现 |
| impact / riser | 0.85 / 0.50 · 0.10–0.33 | 段落量级动作 |

### 3.6 事件统计（256 步全量，stub api 实测）

| groove | drum 事件 | tonal 事件 | pump | lowpass | 每小节 kick 次数 |
|---|---|---|---|---|---|
| sunny | 487 | 428 | 60 | 86 | 4–5 |
| bounce | 441 | 352 | 49 | 86 | 3–4 |
| chill | 234 | 184 | 45 | 72 | 3–4（breakdown 0） |

---

## 4. 音色与混音处方（给 main.js 的新合成参数）

### 4.1 kick：4 层 + 饱和（当前只有 2.5 层）

```js
// drum:kick —— 目标：−20dB 尾巴 45–60ms、500Hz 以上能量 15–25%、<80Hz 35–45%
tone('sine', 150, when, .30, .92, 52);       // 主体：150→52Hz，0.30s（当前 170→46，尾巴偏闷）
tone('sine', 62, when, .26, .55);            // 稳态 sub 层（参考曲 kick 峰值 93Hz，需要「体」）
tone('triangle', 110, when, .045, .22, 70);  // 中低频瞬态
noise(when, .012, 3200, .18);                // click：补 2–6k（当前完全没有）
noise(when + .002, .006, 7600, .10);         // tick：小喇叭可闻的「点」
```
再给 kick 总线挂 `WaveShaper(tanh, amount≈1.8)` + 30 Hz 高通，量出「参考 − 我们」的差距就补回来了。

### 4.2 snare：3 层 + 短 plate（当前 2 层、尾巴 41ms）

```js
noise(when, .24, 1800, .50);            // 主体：从 .20 拉长到 .24，−20dB 约 120–140ms
noise(when + .010, .10, 5200, .22);     // 脆响：加长、加量（当前 .05/.16）
tone('triangle', 190, when, .12, .26, 120);
noise(when + .004, .04, 9200, .10);     // 空气
// + reverbPreset 'plate', reverbWet .15（走 createSoundBus 现成路径）
```

### 4.3 hat / openhat / rim（当前 hat 太短太亮）

```js
// drum:hat —— 目标 −12dB ≈ 45–55ms，重心 ~7kHz
noise(when, .16, 7200, .18);
noise(when + .002, .09, 9800, .12);
[6300, 8300, 10700].forEach((f, i) => tone('square', f, when + i * .001, .028, .035 - i * .008)); // 金属感
// drum:openhat：同样 3 层但时值 .35/.22/.05，并保留现有 choke（闭镲出现时 3ms 收掉）
// drum:rim：triangle 780Hz .012s + noise 3.2kHz .02s
```

### 4.4 impact / riser（段落量级动作，当前完全没有）

```js
// drum:impact —— drop 第一拍，0.8s
tone('sine', 90, when, .8, .8, 38);
noise(when, .5, 4000, .3);                    // 建议再挂一个 8k→300Hz 的低通扫频
noise(when + .02, .25, 9000, .15);

// drum:riser —— 一次调用 = 2 小节（8 拍）；调用点已在 pad-grooves 里去重
// noise 通过带通 400→8000Hz（Q≈1.5）+ sawtooth 110→880Hz，音量 0→.5 线性上扫
```

### 4.5 bass / stab / pad / lead

- bass：现有 `sine + saw(LP 850)` 骨架可以保留，但要**加一层纯 sub**（`tone('sine', midi 的频率, when, length×stepDur, .18)`）并把 bus 音量按第 3.5 节走；bass 必须始终单声道。
- stab：`piano`/`organ` 现有音色可用，加 `plate 12%`；`delaySend .16`（3/16 附点）。
- pad：`pad` 音色 + `room 10%`，长音 7.4 步；chill 用七和弦 voicing。
- lead：marimba/8bit/harp，`delaySend .20`；只在 drop 段出现（与参考曲一致：lead 是「奖励」不是「背景」）。

### 4.6 总线与压缩（把「没胶水」补上）

| 节点 | 建议参数 | 理由 |
|---|---|---|
| padBackingInput / padBackingTonalInput | 1.2 → **1.1 / 1.1** | 现在 1.2 顶着压缩器，动态被吃掉 |
| padCompressor | threshold **−14**、knee 6、ratio **2.5**、attack **10 ms**、release **120 ms** | 给 kick 瞬态留 10ms，别削点 |
| padLimiter | threshold −6、ratio 20、attack 2ms、release 60ms | 防削顶，不做母带 |
| 目标 | 底奏短时 RMS −20~−16 dBFS，峰值 ≤ −6 dBFS；用户敲击峰值 −6~−3 dBFS | 用户敲击必须在最前 |

### 4.7 立体声与 FX（补齐与参考曲最大的听感差）

- `instrumentSound.voice()` 里给 `pad`/`stab` 的 two-saw 层加 `StereoPannerNode`：`pan = ±0.35`，两 oscillator `detune = ∓7 cents` → side/mid 约 −10~−12 dB，对齐参考曲。
- hat 的两层 noise 分别 pan ±0.3（闭镲），openhat 居中；bass/kick 保持 mono。
- delay：3/16 附点、反馈 0.3、反馈环内 LP 2600（现有实现已对）；send 只给 stab/lead。
- wow：只给 chill（DelayNode 12ms + 0.45Hz ±3.5ms），别给 sunny/bounce。
- 用户敲击 duck：保持 −2.1 dB / 180 ms；pump 深度已对齐参考曲 −3 dB。

---

## 5. 我建议 `src/main.js` 新增/修改的接线点（不亲自改）

> 共 5 个点，按落地顺序排列。旧 `schedulePadBackingStep` 可保留作 fallback。

**① `index.html`：在 main.js 之前加载引擎（1 行）**

```html
<script defer src="./src/pad-grooves.js"></script>
<script defer src="./src/main.js"></script>
```

**② `main.js`：加适配层，`runPadBackingScheduler` 改调用它**

```js
function padScheduleViaGrooves(step, when, id) {
  if (!window.PadGrooves) { schedulePadBackingStep(step, when, id); return; } // fallback
  var api = {
    drum: function (kind, at, volume) {
      var key = { kick: 'drum:kick', 'kick:ghost': 'drum:kick:ghost', snare: 'drum:snare',
                  clap: 'drum:clap', hat: 'drum:hat', openhat: 'drum:openhat',
                  rim: 'drum:rim', impact: 'drum:impact', riser: 'drum:riser' }[kind] || 'drum:hat';
      padDrumSound(key, at, volume, true);
    },
    tonal: function (inst, midi, at, lengthSteps, volume, opts) { padInstrumentTone(inst, midi, at, lengthSteps, volume, opts); },
    pump: function (at, opts) { padPump(at, opts); },
    lowpass: function (hz, at, tc) { if (padBackingFilter) padBackingFilter.frequency.setTargetAtTime(hz, at, tc); },
    emit: function (detail) { emitPadBeat(step, when, id, detail); }
  };
  window.PadGrooves.scheduleStep(step, when, id, api);
}
// runPadBackingScheduler 内：
//   padScheduleViaGrooves(padBackingStep, padBackingNextTime, padBackingId);
//   padBackingStep = (padBackingStep + 1) % (window.PadGrooves ? PadGrooves.PAD_LOOP_STEPS : PAD_LOOP_STEPS);
```

**③ `padDrumSound`：新增 `drum:rim` / `drum:impact` / `drum:riser` / `drum:kick:ghost` 四个分支**
（参数见 4.1/4.3/4.4；`drum:kick:ghost` 用短而暗的 kick：`tone('sine',140,when,.12,.6,50)` + 少量 noise，不要再叠完整 click 层。）

**④ BPM 委派（三处）**

```js
const PAD_GROOVE_BPM = { sunny: 124, bounce: 134, chill: 86 };  // 旧 116/138/84 作 fallback
function padGrooveBpm(id) { return window.PadGrooves ? window.PadGrooves.padGrooveBpm(id) : (PAD_GROOVE_BPM[id] || 116); }
// padStepDuration / setPadBacking 不用改（已经按 padGrooveBpm 算）
```

**⑤ 立体声（4.7）**：在 `instrumentSound` 的 `voice()` 里加 `createStereoPanner()`（`pad`/`stab` 用 ±0.35 detune ±7 cents），在 `padDrumSound` 的 hat 分支给两层 noise 加 ±0.3 pan。目标 side/mid ≈ −10 dB。若暂不做，其余 4 点也能独立生效。

**另外**：`PAD_GROOVES` 与旧的 `schedulePadBackingStep` 可以保留（fallback + 视觉不变），不必删；但建议在 `setPadBacking` 切换时把 `padBackingFilter` 复位（现有代码已做）并让 `padGrooveBpm` 走委派，否则新旧 BPM 会打架（旧 116 会让 124 的编排慢 7%）。

---

## 6. 自检记录（离线，未启动 server / 浏览器）

命令：

```
node --check src/pad-grooves.js                    → exit 0
node _shots/test-pad-grooves.cjs                   → exit 0（临时脚本，已删除）
```

`_shots/test-pad-grooves.cjs` 用 stub api 把三套各跑满 256 步，断言并打印：

| 检查项 | 结果 |
|---|---|
| `node --check` | ✅ 通过 |
| 数据自检：位置 0–15 整数、sections=16、voicing ≥ root+12 且声部不密集、MIDI 0–127 | ✅ PASSED |
| 三套各 256 步：drum / tonal / pump / lowpass 事件数 | sunny 487/428/60/86；bounce 441/352/49/86；chill 234/184/45/72 |
| 空小节 | 0 / 0 / 0（每小节至少 8 个事件） |
| 全静音步 | sunny 0；bounce 0；chill 92（lo-fi 半速的留白，但 emit 每步都有，灯带不断） |
| swing 违规（偶数位位移 / 奇数位没位移） | 0 / 0 / 0 |
| `emit` 字段类型（kick/snare/hat/bass/chord/bar/barOfLoop/swingMs/gain） | 全部通过 |
| 第 8/12/13/16 小节层级 | 见下 |

第 8/12/13/16 小节（自检实测）：

| groove | bar8 | bar12 | bar13 | bar16 |
|---|---|---|---|---|
| sunny | build：snare 14、hat 26、riser 1 | drop2：kick 5、ghost 4、snare 6（含 fill） | breakdown：kick 0、bass 0、hat 16、低通 8 次 | build2：snare 14、hat 22、riser 1 |
| bounce | build：snare 14、hat 22 | drop2：kick 4、ghost 1、snare 6 | breakdown：kick 0、hat 16 | build2：snare 14、hat 22 |
| chill | groove：kick 4、snare 5（fill） | drop：kick 4、ghost 1 | drop2：kick 3、ghost 1 | breakdown：kick 0、hat 12 |

> 说明：`_shots/` 目录是临时的，已删除；仓库里只新增 `src/pad-grooves.js` 与本文件。

---

## 7. 参考链接（本轮与分析/处方直接相关）

**Ableton Learning Music（概念与节奏坐标）**
1. https://learningmusic.ableton.com/
2. https://learningmusic.ableton.com/make-beats/backbeats.html
3. https://learningmusic.ableton.com/make-beats/tempo-and-genre.html
4. https://learningmusic.ableton.com/make-beats/bars.html
5. https://learningmusic.ableton.com/song-structure/song-structure.html

**Attack Magazine（Beat Dissected：各风格具体摆位与 BPM/swing）**
6. https://www.attackmagazine.com/technique/beat-dissected/rolling-2-step-garage/
7. https://www.attackmagazine.com/technique/beat-dissected/interplanetary-criminal-style-garage/
8. https://www.attackmagazine.com/technique/beat-dissected/deep-house-stripped-workout-beat-dissected/
9. https://www.attackmagazine.com/technique/beat-dissected/big-house/
10. https://www.attackmagazine.com/technique/beat-dissected/thumping-techno/
11. https://www.attackmagazine.com/technique/beat-dissected/grinding-analogue-techno/
12. https://www.attackmagazine.com/technique/beat-dissected/raw-drum-bass/
13. https://www.attackmagazine.com/technique/beat-dissected/90s-boom-bap-hip-hop/
14. https://www.attackmagazine.com/technique/tutorials/going-off-grid-what-is-swing-and-how-to-add-it/

**律动/混音技术**
15. https://splice.com/blog/humanize-your-drums/
16. https://www.izotope.com/community/blog/what-is-sidechain-compression
17. https://www.native-instruments.com/blogs/blog/sidechain-compression
18. https://www.soundonsound.com/techniques/drum-beat-construction-part-1-sos-podcast
19. https://djtechtools.com/2009/01/26/phrasing-the-perfect-mix/
20. https://djtechtools.com/2015/10/22/phrase-mixing-throwback-thursday-dj-technique/
21. https://en.wikipedia.org/wiki/Ducking
22. https://en.wikipedia.org/wiki/Ghost_note
23. https://en.wikipedia.org/wiki/UK_garage
24. https://en.wikipedia.org/wiki/Four_on_the_floor_(music)
25. https://en.wikipedia.org/wiki/Techno
26. https://en.wikipedia.org/wiki/Drum_and_bass
27. https://en.wikipedia.org/wiki/Boom_bap
28. https://en.wikipedia.org/wiki/Lofi_hip-hop

**Web Audio（音色/接线处方）**
29. https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime
30. https://developer.mozilla.org/en-US/docs/Web/API/DelayNode
31. https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode
32. https://developer.mozilla.org/en-US/docs/Web/API/WaveShaperNode
33. https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode
34. https://developer.mozilla.org/en-US/docs/Web/API/StereoPannerNode
35. https://webaudio.github.io/web-audio-api/
