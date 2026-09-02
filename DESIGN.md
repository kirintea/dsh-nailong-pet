# DSH 奶龙桌宠插件 · 设计方案 v1

> **项目名**: `dsh-nailong-pet`  
> **灵感来源**: [nailong-codex-pet](https://github.com/.../nailong-codex-pet)（Codex 原生 v2 桌宠资源包）  
> **目标**: 把奶龙的 9 组动画状态移植到 DSH Web 界面，作为可交互的桌面宠物挂件

---

## 1. 功能总览

| 功能 | 说明 |
|------|------|
| 🐉 9 组动画状态 | idle / walk-right / walk-left / laugh / laugh2 / failed / thinking / coding / review |
| 🎞️ 帧动画渲染 | 精灵图 `spritesheet.webp`（1536×2288, 8×11格, 每格192×208），CSS background-position 动画 |
| 🎮 自动状态映射 | DSH 会话事件 → 奶龙状态（见下方映射表） |
| 👆 点击互动 | 点击奶龙 → 大笑动画 + 音效 |
| 🔊 爆笑音效 | 奶龙笑声音效，点击/进入笑态时播放 |
| 🖱️ 拖拽移动 | 参考鲸鱼挂件：拖拽移动 + 4 个吸附角 + 边界约束 |
| 🚶 空闲漫游 | 10s 无交互 → 奶龙在页面内随机走动；有交互 → 闪现回原位 |
| ⚙️ 设置菜单 | 缩放、音量、音效开关、状态指示器开关 |
| 📐 记忆位置 | localStorage 保存位置、缩放等配置 |
| 📡 同源代理 | 所有资源走 `/dsh-nailong-pet/` 路由前缀 |

---

## 2. 动作状态映射

### 2.1 精灵图布局

```
spritesheet.webp: 1536 × 2288 px
每格: 192 × 208 px
8 列 × 11 行
```

行号 → 状态映射：

| 行 | 状态 ID | 动画名称 | 每帧行为 |
|---:|---------|---------|---------|
| 0 | `idle` | 待机呼吸 | 循环 8 帧 |
| 1 | `walk-right` | 向右走 | 循环 8 帧 |
| 2 | `walk-left` | 向左走 | 循环 8 帧 |
| 3 | `laugh` | 捂肚爆笑 | 单次 8 帧后回 idle |
| 4 | `laugh2` | 完成爆笑 | 单次 8 帧后回 idle |
| 5 | `failed` | 失败沮丧 | 单次 8 帧后回 idle |
| 6 | `thinking` | 托腮思考 | 循环 8 帧 |
| 7 | `coding` | 西装敲代码 | 循环 8 帧 |
| 8 | `review` | 西装检查 | 循环 8 帧 |

> 注：行 9-10 是视线素材（16 向 gaze），本次暂不使用。

### 2.2 DSH 事件 → 状态

| DSH 事件/条件 | 奶龙状态 | 播放模式 | 优先级 |
|-------------|---------|---------|-------|
| 无事件/默认 | `idle` | 循环 | 0 |
| 鼠标悬浮（mouseenter） | `laugh` 或 `laugh2`（随机） | 单次→idle | 最高 |
| 用户点击 | `laugh` | 单次→idle + 音效 | 最高 |
| 会话开始（session/created） | `laugh` | 单次→idle | 高 |
| AI 推理中（thinking） | `thinking` | 循环 | 中 |
| AI 使用工具（tool_use） | `coding` | 循环 | 中 |
| AI 检查/审查（review） | `review` | 循环 | 中 |
| 等待用户输入 | `thinking` | 循环 | 中 |
| 任务失败（error） | `failed` | 单次→idle | 中 |
| 任务完成（turn/end + 成功） | `laugh2` | 单次→idle | 中 |
| 拖拽移动中 | `walk-left` 或 `walk-right` | 循环 | 低 |

### 2.3 状态优先级

```
交互（点击/悬浮） > 会话事件 > 拖拽 > 空闲
```

高优先级状态结束后自动回到 idle。

---

## 3. 技术架构

### 3.1 文件结构

```
dsh-nailong-pet/
├── lib/
│   ├── index.js          # 主机侧插件入口（路由、资源服务）
│   ├── widget.js         # 前端 WIDGET_JS 模板字符串
│   └── constants.js      # 常量、路径、工具函数
├── assets/
│   ├── spritesheet.webp  # 主精灵图（从 nailong-codex-pet 复制）
│   ├── laugh.wav         # 爆笑音效（从 nailong-codex-pet 复制）
│   └── laugh.mp3         # 转换后的 mp3 版本
├── test/
│   └── test.mjs          # 单元测试
├── tools/
│   └── zzz-position.html # （可选）调试工具
├── package.json
├── cordis.patch.yml
├── DESIGN.md             # 本文件
└── README.md
```

### 3.2 主机侧 (lib/index.js)

参考鲸鱼插件的模式：

```javascript
const name = 'nailong-pet'
const inject = ['webServer']

function apply(ctx) {
  // 1. 路由注册
  //    GET /dsh-nailong-pet/spritesheet.webp  → 精灵图
  //    GET /dsh-nailong-pet/laugh.mp3          → 音效
  //    GET /dsh-nailong-pet/widget.js           → 前端 JS
  //    GET/PUT /dsh-nailong-pet/config.json     → 配置读写
  
  // 2. 注入 <script> 到 DSH Web 页面
  //    ctx.webServer.tapIndex() → 在 </body> 前插入 widget.js 引用
}
```

### 3.3 前端侧 (lib/widget.js)

渲染引擎核心逻辑：

```
┌─────────────────────────────────────────┐
│  .nailong-root (fixed, 可拖拽)            │
│  ┌─────────────────────────────────┐    │
│  │  .nailong-pet                   │    │
│  │  ┌─────────────────────────┐    │    │
│  │  │  spritesheet 切片显示     │    │    │
│  │  │  CSS animation:          │    │    │
│  │  │  background-position-x   │    │    │
│  │  │  逐帧步进                  │    │    │
│  │  └─────────────────────────┘    │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  .nailong-status                │    │
│  │  (可选状态文字提示)              │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### 3.4 CSS 帧动画方案

```css
.nailong-pet {
  width: 192px;  /* 每格宽度 */
  height: 208px; /* 每格高度 */
  background-image: url('/dsh-nailong-pet/spritesheet.webp');
  background-size: 1536px 2288px; /* 原始尺寸 */
  animation: nailong-idle 0.8s steps(8) infinite;
}

/* idle: 第0行, y=0 */
@keyframes nailong-idle {
  from { background-position: 0 0; }
  to   { background-position: -1536px 0; }
}

/* walk-right: 第1行, y=-208px */
@keyframes nailong-walk-right {
  from { background-position: 0 -208px; }
  to   { background-position: -1536px -208px; }
}

/* laugh: 第3行, y=-624px, 单次 */
@keyframes nailong-laugh {
  from { background-position: 0 -624px; }
  to   { background-position: -1536px -624px; }
}
```

通过 JavaScript 动态切换 `animation-name` 实现状态切换。

---

## 4. 交互设计

### 4.1 拖拽与吸附

完全参考鲸鱼挂件的实现：

- **拖拽**: mousedown → mousemove → mouseup
- **4 角吸附**: 释放时自动吸附到最近的角落（左上/右上/左下/右下）
- **边界约束**: 不超出视口
- **镜像翻转**: 靠左时面向右（scaleX(-1)），靠右时面向左

### 4.2 点击行为

```
点击 → 如果当前不是笑态 → 播放 laugh 动画 + 播放音效
        → 如果当前是笑态 → 忽略（防重复）
        → 动画结束（8帧后）→ 自动回到 idle
```

### 4.3 悬浮行为

```
mouseenter → 如果当前是 idle → 随机选 laugh 或 laugh2
           → 状态锁定为交互态
mouseleave → 交互态结束后自动回 idle
```

---

## 5. 配置持久化

通过 `/dsh-nailong-pet/config.json` 端点读写：

```json
{
  "scale": 1.0,
  "sound": true,
  "volume": 0.9,
  "showStatus": true,
  "autoState": true,
  "position": "auto",
  "updatedAt": "2026-08-26T..."
}
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `scale` | number | 1.0 | 缩放倍数 0.5~3.0 |
| `sound` | boolean | true | 音效开关 |
| `volume` | number | 0.9 | 音量 0~1 |
| `showStatus` | boolean | true | 显示状态文字 |
| `autoState` | boolean | true | 自动映射 DSH 事件 |
| `position` | string | "auto" | 位置偏好（auto=右下/用户拖拽记忆） |

配置文件位置：与鲸鱼相同，存放在 `~/.dsh/.dsh-nailong-pet.json`

---

## 6. 资源处理

### 6.1 从 nailong-codex-pet 复制的资源

| 源文件 | 目标 | 处理 |
|-------|------|------|
| `output/nailong/spritesheet.webp` | `assets/spritesheet.webp` | **直接复制**，1536×2288, 1.1MB |
| `output/nailong/sound/laugh.wav` | `assets/laugh.mp3` | **WAV→MP3 转换**（节约体积） |

### 6.2 精灵图规格

```
格式: WebP
尺寸: 1536 × 2288 px
网格: 8 列 × 11 行
每格: 192 × 208 px
有效行: 0~8 (9个状态)，9~10为视线素材（暂不用）
大小: 1.1MB（直接使用，不二次压缩）
```

### 6.3 音效规格

```
源格式: WAV (230KB)
目标格式: MP3 (~50KB)
转换工具: ffmpeg -i laugh.wav -codec:a libmp3lame -qscale:a 2 laugh.mp3
```

---

## 7. 路由设计

| 路由 | 方法 | 说明 |
|------|------|------|
| `/dsh-nailong-pet/widget.js` | GET | 前端脚本 |
| `/dsh-nailong-pet/spritesheet.webp` | GET | 精灵图 |
| `/dsh-nailong-pet/laugh.mp3` | GET | 爆笑音效 |
| `/dsh-nailong-pet/config.json` | GET/PUT | 配置读写 |

---

## 8. 与鲸鱼插件的关系

- ✅ **独立项目**: 完全独立，不修改鲸鱼代码
- ✅ **可共存**: 不同路由前缀、不同 DOM 根节点
- ✅ **位置协调**: 检测鲸鱼挂件位置，自动避开
  - 启动时扫描 DOM：`document.querySelector('.dshwv-root')`
  - 如果鲸鱼在右下角 → 奶龙默认左下角
  - 如果鲸鱼在左下角 → 奶龙默认右下角
  - 如果没检测到鲸鱼 → 奶龙默认右下角
  - 用户拖拽后以用户位置为准

---

## 9. 开发计划

### Phase 1: 基础骨架
- [ ] 新建项目结构、package.json、cordis.patch.yml
- [ ] 复制精灵图资源，WAV→MP3 转换
- [ ] 实现主机侧路由（spritesheet、sound、widget.js、config）
- [ ] 实现前端基础渲染（精灵图帧动画）

### Phase 2: 交互与状态
- [ ] 实现拖拽 + 吸附
- [ ] 实现点击 → laugh + 音效
- [ ] 实现 DSH 事件监听 → 自动状态切换
- [ ] 实现悬浮交互
- [ ] **实现空闲漫游**（10s无交互→随机走动，交互→闪现回原位）
- [ ] **实现状态文字**（头顶气泡显示当前状态）

### Phase 3: 开机动画与打磨
- [ ] **实现开机动画**（walk-right 入场 + laugh 打招呼）
- [ ] 设置菜单（缩放、音量、开关、漫游开关）
- [ ] 配置持久化
- [ ] 与鲸鱼插件的位置协调（自动检测对角）

### Phase 4: 测试与发布
- [ ] 单元测试
- [ ] DSH Desktop 实际测试
- [ ] README 文档

---

## 10. 空闲漫游行为

> **需求**: 长时间无交互时，奶龙在页面内随机走动；有交互操作时闪现回到原位。

### 10.1 触发条件

```
无交互时间 ≥ IDLE_ROAM_MS (10000ms = 10秒)
→ 进入漫游模式
```

### 10.2 漫游行为

```
┌────────────────────────────────────────────────────┐
│  浏览器视口                                          │
│                                                     │
│   ┌──┐        漫游路径示例                          │
│   │🐉│ ──walk-right──→                             │
│   │  │                  ┌──┐                       │
│   │  │                  │🐉│                       │
│   │  │                  │  │                       │
│   │  │                  └──┘                       │
│   │  │                     │                       │
│   │  │                  walk-down                  │
│   │  │                     ↓                       │
│   │  │                  ┌──┐                       │
│   │  │                  │🐉│                       │
│   └──┘                  └──┘                       │
│                                                     │
│  边界约束: 不超出视口边界                            │
└────────────────────────────────────────────────────┘
```

**漫游策略**:

1. **随机方向**: 在 8 个方向中随机选一个（上/下/左/右/4个对角）
2. **随机距离**: 每次走 **30~80px**（短距离、慢悠悠）
3. **移动速度**: **极慢**，每步耗时 2~4 秒（即 10~40px/s 的龟速）
4. **动画匹配**: 
   - 向左走 → `walk-left` 动画
   - 向右走 → `walk-right` 动画
   - 上/下 → 随机选一个 walk 动画
5. **边界检测**: 到达视口边缘时停下，等待 2~5 秒后随机选新方向
6. **暂停间隔**: 每走一段暂停 **3~6 秒**（走走停停，悠哉悠哉）

> **整体节奏**: 走 2~4 秒 → 停 3~6 秒 → 走 2~4 秒 → 停 3~6 秒 ...  
> 像一只在桌上闲逛的小宠物，缓慢、放松、不急不躁。

### 10.3 漫游动画实现

```javascript
// 漫游参数
var ROAM_DISTANCE_MIN = 30   // 每次最短移动距离 (px)
var ROAM_DISTANCE_MAX = 80   // 每次最长移动距离 (px)
var ROAM_SPEED_MIN = 10      // 最慢速度 (px/s)
var ROAM_SPEED_MAX = 40      // 最快速度 (px/s)
var ROAM_PAUSE_MIN = 3000    // 停顿最短时间 (ms)
var ROAM_PAUSE_MAX = 6000    // 停顿最长时间 (ms)
var IDLE_ROAM_MS = 10000     // 空闲多久后开始漫游 (ms)

// 漫游循环
function startRoaming() {
  if (roaming) return;
  roaming = true;
  roamingLoop();
}

function roamingLoop() {
  if (!roaming || interacting) return;
  
  // 1. 随机选方向和距离（短距离）
  var angle = Math.random() * Math.PI * 2;
  var distance = ROAM_DISTANCE_MIN + Math.random() * (ROAM_DISTANCE_MAX - ROAM_DISTANCE_MIN);
  var dx = Math.cos(angle) * distance;
  var dy = Math.sin(angle) * distance;
  
  // 2. 计算目标位置（带边界约束）
  var vp = viewport();
  var targetX = clamp(state.left + dx, 0, vp.w - root.offsetWidth);
  var targetY = clamp(state.top + dy, 0, vp.h - root.offsetHeight);
  
  // 实际移动距离可能因边界裁剪而变短
  var actualDx = targetX - state.left;
  var actualDy = targetY - state.top;
  var actualDist = Math.sqrt(actualDx * actualDx + actualDy * actualDy);
  
  // 3. 设置走路动画
  if (actualDx > 0) setAnimation('walk-right');
  else if (actualDx < 0) setAnimation('walk-left');
  else setAnimation(Math.random() > 0.5 ? 'walk-left' : 'walk-right');
  
  // 4. 慢速移动（龟速！）
  // 速度: 10~40px/s → 移动 50px 需要 1.25~5 秒
  var speed = ROAM_SPEED_MIN + Math.random() * (ROAM_SPEED_MAX - ROAM_SPEED_MIN);
  var duration = Math.max(1500, (actualDist / speed) * 1000); // 至少 1.5 秒
  
  animateToPosition(targetX, targetY, duration, function() {
    // 5. 停下，长暂停后继续下一段
    setAnimation('idle');
    var pause = ROAM_PAUSE_MIN + Math.random() * (ROAM_PAUSE_MAX - ROAM_PAUSE_MIN);
    roamTimer = setTimeout(roamingLoop, pause);
  });
}
```

### 10.4 交互中断机制

**触发条件（任意一个即中断）**:
- 用户点击页面任意位置
- 用户滚动页面
- 用户按下键盘
- DSH 会话事件到达（AI 回复、工具调用等）
- 用户鼠标进入奶龙区域

**中断行为**:
```javascript
function stopRoaming() {
  if (!roaming) return;
  roaming = false;
  if (roamTimer) clearTimeout(roamTimer);
  roamTimer = null;
  
  // 闪现回原位（瞬移，无动画）
  restorePosition();
  
  // 切回 idle 动画
  setAnimation('idle');
  
  // 重置空闲计时器
  resetIdleTimer();
}

function restorePosition() {
  // 从 localStorage 读取用户上次拖拽/吸附的位置
  var saved = loadSavedPosition();
  state.left = saved.left;
  state.top = saved.top;
  state.h = saved.hAnchor;
  state.v = saved.vAnchor;
  express(); // 立即应用位置
}
```

### 10.5 位置记忆与恢复

```
漫游前:
  保存当前位置到 roamingAnchor = { left, top, h, v }

漫游中:
  实时更新 state.left, state.top（用于渲染）

交互中断:
  瞬移回 roamingAnchor（用户原始位置）
  或瞬移回 localStorage 保存的位置（如果用户拖拽过）
```

### 10.6 状态机

```
         ┌─────────────────────────────────────┐
         │                                      │
         ▼                                      │
    ┌─────────┐    10s无交互    ┌─────────────┐ │
    │  IDLE   │ ──────────────→ │  ROAMING    │ │
    └─────────┘                 └─────────────┘ │
         ▲                          │           │
         │                          │           │
         │    交互事件               │           │
         └──────────────────────────┘           │
              (闪现回原位)                       │
                                                │
         ┌──────────────────────────────────────┘
         │
         ▼
    ┌─────────────────────────────────┐
    │  INTERACTING (click/hover/event) │
    └─────────────────────────────────┘
         │
         │  动画结束 / 2秒后
         ▼
    ┌─────────┐
    │  IDLE   │ → 重置 10s 计时器
    └─────────┘
```

---

## 11. 待确认事项

> **全部已确认 ✅**

1. ✅ **精灵图**: 直接使用 `spritesheet.webp`（1.1MB），不二次压缩
2. ✅ **音效格式**: WAV → MP3 转换（节约体积，230KB → ~50KB）
3. ✅ **状态文字**: 显示在奶龙旁边（见下方设计）
4. ✅ **与鲸鱼共存**: 自动检测鲸鱼位置，奶龙选对角位置
5. ✅ **开机动画**: 播放（笑+走路入场）（见下方设计）
6. ✅ **漫游参数**（慢速、短距离）:
   - 空闲触发时间: 10 秒
   - 每次走动距离: 30~80px
   - 移动速度: 10~40px/s（走 2~4 秒）
   - 走动后暂停: 3~6 秒

---

## 12. 状态文字设计

### 12.1 显示规则

| 状态 | 显示文字 | 持续时间 |
|------|---------|---------|
| `idle` | （不显示） | - |
| `walk-left` / `walk-right` | 闲逛中... | 漫游期间持续显示 |
| `laugh` / `laugh2` | 哈哈哈！ | 单次动画期间 |
| `failed` | 呜呜... | 单次动画期间 |
| `thinking` | 思考中... | 循环期间持续显示 |
| `coding` | 敲代码中... | 循环期间持续显示 |
| `review` | 检查中... | 循环期间持续显示 |

### 12.2 样式

```css
.nailong-status {
  position: absolute;
  bottom: 100%;           /* 在奶龙头顶上方 */
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 12px;
  color: #666;
  background: rgba(255,255,255,0.9);
  padding: 2px 8px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.nailong-status.nailong-status-visible {
  opacity: 1;
}
```

### 12.3 淡入淡出

```
状态切换 → 立即更新文字 + 显示 (opacity: 1)
状态结束 → 淡出 0.3s (opacity: 0) → 清空文字
```

---

## 13. 开机动画设计

### 13.1 触发条件

- DSH Web 页面加载完成时
- 插件首次初始化时

### 13.2 动画流程

```
┌──────────────────────────────────────────────────────────────────┐
│  开机动画时序 (约 3 秒)                                           │
│                                                                   │
│  0.0s    从屏幕左侧外 (left: -200px) 开始                        │
│          动画: walk-right                                        │
│          状态文字: "你好呀~"                                      │
│                                                                   │
│  0~2s    向右走到默认位置 (right: 20px)                           │
│          速度: 约 100px/s                                        │
│                                                                   │
│  2.0s    到达目标位置，停下                                       │
│          动画切换: laugh                                          │
│          状态文字: "我是奶龙~"                                    │
│          音效: 播放 laugh.mp3                                    │
│                                                                   │
│  3.0s    laugh 动画结束                                           │
│          动画切换: idle                                           │
│          状态文字: 淡出消失                                       │
│          → 进入正常 idle 状态，开始 10s 倒计时                    │
└──────────────────────────────────────────────────────────────────┘
```

### 13.3 实现

```javascript
function playIntroAnimation() {
  // 1. 初始位置：屏幕左侧外
  state.left = -root.offsetWidth - 50;
  state.top = viewport().h - root.offsetHeight - 20;
  express();
  
  // 2. 设置走路动画 + 状态文字
  setAnimation('walk-right');
  showStatus('你好呀~');
  
  // 3. 平滑走到目标位置 (2 秒)
  var targetLeft = getDefaultLeft(); // 根据鲸鱼位置决定左下或右下
  animateToPosition(targetLeft, state.top, 2000, function() {
    // 4. 到达后切换 laugh
    setAnimation('laugh');
    showStatus('我是奶龙~');
    playLaughSound();
    
    // 5. laugh 结束后进入正常状态
    onAnimationEnd('laugh', function() {
      setAnimation('idle');
      hideStatus();
      // 开机动画完成，开始正常空闲倒计时
      resetIdleTimer();
    });
  });
}

// 页面加载后触发
if (document.readyState === 'complete') {
  playIntroAnimation();
} else {
  window.addEventListener('load', playIntroAnimation);
}
```

---

*方案版本 v1.4 · 2026-08-26 · 全部确认：状态文字 + 开机动画 + 资源处理 + 插件共存*
