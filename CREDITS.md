# 素材与出处

本项目为梗图音序器交互原型，仅作非商业演示。图像与原声权利归原作者或相关权利人所有。

| 卡片 | 图像 | 原始来源 | 当前音频 |
| --- | --- | --- | --- |
| Doro | [Voicemod Tuna](https://tuna.voicemod.net/sound/67ab378f-5e72-41cc-8f96-546828989fd4) | [Voicemod Tuna / TremoloScaleSend78857](https://tuna.voicemod.net/sound/67ab378f-5e72-41cc-8f96-546828989fd4) | 社区上传的 2 秒片段 |
| 哈！耄耋哈气（2 段） | [铲屎官日记](https://chanshi123.com/cat/110654) | [B站 BV1DMduY9E5K](https://www.bilibili.com/video/BV1DMduY9E5K/) | 用户裁剪的“耄耋哈气1／2.mp3” |
| 鸡（蔡徐坤，2 段） | 本地原创卡通鸡插图（`assets/chicken.svg`），不含真人照片 | [B站 BV1J4411v7g6](https://www.bilibili.com/video/BV1J4411v7g6/?t=24) | 用户裁剪的“鸡你太美.mp3／鸡你太美1.mp3” |
| oeeao 旋转小猫 | [Voicemod Tuna](https://tuna.voicemod.net/sound/44fcfd11-d25e-4c7d-920b-a2a5e920b219) | [Voicemod Tuna / GraphicLowSignal46689](https://tuna.voicemod.net/sound/44fcfd11-d25e-4c7d-920b-a2a5e920b219) | 用户裁剪的“旋转小猫.mp3” |
| 大狗叫（1 段） | [游侠手游](https://m.ali213.net/news/gl2607/1790643.html) | [B站 BV1ougx6tEQt](https://www.bilibili.com/video/BV1ougx6tEQt/) | 用户裁剪的完整片段“05-大狗叫.mp3” |
| 哈哈哈哈哈（奶龙） | [皮蛋表情包](https://pdan.com.cn/12761.html) | [B站 BV1ZMf2BzEQL](https://www.bilibili.com/video/BV1ZMf2BzEQL/) | 用户裁剪的“06-奶龙捧腹笑.mp3” |
| 冰冰冰 | 本项目绘制的原创冰块小人（`assets/bingbingbing.svg`） | 用户提供的本地视频素材“10.7亿个冰冰冰” | 用户裁剪的“冰冰冰.mp3” |

Web Audio 合成仿音为本地代码生成，只在原声加载失败时作为回退，不代表官方或原视频声音。

## 哈基米逐音采样与整曲

十二张逐音卡共用本地原创猫咪音符插图（`assets/hachimi.svg`），不含真人图片。当前使用用户在“采样音频／已裁剪好”中提供的“哈基米南北绿豆1–12.mp3”，原始素材来自 [B站《哈基米之歌》BV1WfFJzyEjv](https://www.bilibili.com/video/BV1WfFJzyEjv/?t=3)。切分点与首尾处理以用户文件为准。


## 乐器、混响与演示谱面

- 钢琴、吉他、小提琴、长笛、合成器均为 Web Audio 本地合成的近似音色，不引用或模仿任何商业音源包。
- 无混响、小房间、大厅、教堂、金属板预设的脉冲响应由本地随机噪声与衰减包络生成，不使用外部 IR 素材。
- 《生日快乐》《一闪一闪亮晶晶》采用 C 调单音简易编排，仅用于基础交互演示。
- 《虫儿飞》作曲陈光荣、作词林夕；页面仅提供“简易片段”的短句编排，不声称为完整原谱，不附带歌词或原曲音频。