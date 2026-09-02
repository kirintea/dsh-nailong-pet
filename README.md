# DSH 奶龙桌宠插件 🐉

为 DSH (DeepSeek Harness) Web 界面制作的奶龙桌面宠物插件，灵感来自 [nailong-codex-pet](https://github.com/.../nailong-codex-pet)。

## 功能

| 功能 | 说明 |
|------|------|
| 🐉 9 组动画状态 | idle / walk-right / walk-left / laugh / laugh2 / failed / thinking / coding / review |
| 🎞️ 精灵图帧动画 | 1536×2288 WebP 精灵图，CSS background-position 逐帧渲染 |
| 🎮 自动状态映射 | DSH 会话事件自动触发对应动画（思考→托腮、工具→敲代码、失败→沮丧） |
| 👆 点击互动 | 点击奶龙 → 大笑动画 + 音效 |
| 🔊 爆笑音效 | 点击/进入笑态时播放 laugh.mp3 |
| 🖱️ 拖拽移动 | 拖拽移动 + 4 角吸附 + 边界约束 |
| 🚶 空闲漫游 | 10s 无交互 → 奶龙在页面内缓慢随机走动（30~80px/段，龟速）；交互 → 闪现回原位 |
| 💬 状态文字 | 头顶气泡显示当前状态（思考中... / 敲代码中... / 哈哈哈！） |
| 🎬 开机动画 | 页面加载时奶龙从左侧走进来，打招呼后进入 idle |
| 🤝 插件共存 | 自动检测鲸鱼挂件位置，选择对角位置避免重叠 |
| ⚙️ 设置菜单 | 缩放、音量、音效开关、状态文字开关、漫游开关 |

## 安装

```powershell
cd E:\DSH\workspace\dsh-nailong-pet
dsh plugin --profile desktop add link:.
```

重启 DSH Desktop 即可看到奶龙。

## 卸载

```powershell
dsh plugin --profile desktop remove dsh-nailong-pet
```

## 文件结构

```
dsh-nailong-pet/
├── lib/
│   ├── index.js          # 主机侧插件入口（路由、资源服务）
│   ├── widget.js         # 前端 WIDGET_JS 模板字符串
│   └── constants.js      # 常量、路径、工具函数
├── assets/
│   ├── spritesheet.webp  # 精灵图 (1.1MB, 1536×2288, 8×9格)
│   └── laugh.mp3         # 爆笑音效 (28KB)
├── test/
│   └── test.mjs          # 单元测试 (31 tests)
├── package.json
├── cordis.patch.yml
├── DESIGN.md             # 详细设计方案
└── README.md
```

## 路由

| 路由 | 说明 |
|------|------|
| `/dsh-nailong-pet/widget.js` | 前端脚本 |
| `/dsh-nailong-pet/spritesheet.webp` | 精灵图 |
| `/dsh-nailong-pet/laugh.mp3` | 音效 |
| `/dsh-nailong-pet/config.json` | 配置读写 |

## 配置

存储在 `~/.dsh/.dsh-nailong-pet.json`：

```json
{
  "scale": 1.0,
  "sound": true,
  "volume": 0.9,
  "showStatus": true,
  "roamEnabled": true
}
```

位置记忆存储在浏览器 `localStorage` (key: `nlpg-pos`)。

## 动作映射

| 行 | 状态 | 动画 | 触发 |
|---:|------|------|------|
| 0 | idle | 待机呼吸 | 默认 |
| 1 | walk-right | 向右走 | 漫游/开机动画 |
| 2 | walk-left | 向左走 | 漫游 |
| 3 | laugh | 捂肚爆笑 | 点击/会话开始 |
| 4 | laugh2 | 完成爆笑 | 任务完成 |
| 5 | failed | 失败沮丧 | 任务失败 |
| 6 | thinking | 托腮思考 | AI 推理中 |
| 7 | coding | 西装敲代码 | AI 使用工具 |
| 8 | review | 西装检查 | AI 审查中 |

## 空闲漫游

- 10 秒无交互后自动开始
- 每次走 30~80px，速度 10~40px/s（龟速）
- 走完一段停 3~6 秒
- 用户有任何交互 → 闪现回原位

## 与鲸鱼插件共存

自动检测 `.dshwv-root` 鲸鱼挂件位置：
- 鲸鱼在右下角 → 奶龙默认左下角
- 鲸鱼在左下角 → 奶龙默认右下角
- 未检测到 → 奶龙默认右下角

## 权利说明

本项目是非官方个人插件项目，与"奶龙"相关权利方及 OpenAI 均无隶属、合作、赞助或授权关系。角色形象、名称及相关知识产权归各自权利人所有。
