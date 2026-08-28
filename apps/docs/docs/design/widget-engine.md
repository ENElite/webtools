# 小组件引擎设计

## 概述

小组件引擎是 webwidget 的核心，提供一个可复用的 Overlay 系统，允许用户在画布上创建、管理和交互各种小组件。

## 核心类型

### WidgetModel

小组件的完整数据模型：

```typescript
type WidgetModel<TProps extends WidgetFlatProps = WidgetFlatProps> = {
    id: WidgetId;           // 唯一标识（base62 编码）
    kind: WidgetKind;       // 小组件类型
    label: string;          // 显示名称
    style: WidgetStyle;     // 视觉样式
    layout: WidgetLayout;   // 百分比布局
    props: TProps;          // 类型特定属性
    locked?: boolean;       // 是否锁定
    autoHide?: boolean;     // 空闲时自动隐藏
    animation?: WidgetAnimation;  // 动画配置
};
```

### WidgetKind — 小组件类型

| 类型 | 说明 |
|------|------|
| `text` | 文本组件（支持跑马灯、描边） |
| `image` | 图片展示 |
| `video` | 视频播放 |
| `clock` | 数字翻页时钟 |
| `canvas` | Canvas 画布 |
| `html` | 原始 HTML 渲染 |
| `iframe` | URL 嵌入 |
| `live2d` | Live2D 模型 |

### WidgetStyle — 视觉样式

```typescript
type WidgetStyle = {
    outline?: string;           // 边框
    borderRadius?: string;      // 圆角
    outlineOffset?: string;     // 边框偏移
    opacity?: number;           // 透明度
    backgroundColor?: string;   // 背景色
    backgroundEffect?: 'blur' | 'image' | 'none';  // 背景效果
    backgroundImageUrl?: string; // 背景图片
    shadowRadius?: number;      // 阴影半径
    shadowColor?: string;       // 阴影颜色
};
```

### WidgetLayout — 百分比布局

```typescript
type WidgetLayout = {
    anchorX: 'left' | 'center' | 'right';   // 水平锚点
    anchorY: 'top' | 'center' | 'bottom';   // 垂直锚点
    x: number;    // X 偏移（百分比）
    y: number;    // Y 偏移（百分比）
    w: number;    // 宽度（百分比）
    h: number;    // 高度（百分比）
    rotation: number;  // 旋转角度
    adapt: 'stretch' | 'fixed' | 'stretch-ratio' | 'stick';  // 自适应模式
    order: number;     // 层级顺序（z-index）
};
```

**锚点系统**：
- `anchorX` 决定小组件相对于容器的水平定位基准
- `anchorY` 决定垂直定位基准
- `x/y` 是相对于锚点的偏移百分比

**自适应模式**：
- `stretch`：小组件随容器大小缩放
- `fixed`：小组件保持固定尺寸
- `stretch-ratio`：按比例缩放
- `stick`：固定像素尺寸

**层级顺序 `order`**：
- 值为 `1` 到 `N`（`N` 为小组件总数），连续无间断
- 渲染为 CSS `z-index`，控制小组件的视觉层叠顺序
- 上移一层：与 `order + 1` 的小组件交换 order
- 下移一层：与 `order - 1` 的小组件交换 order
- 置顶：target 变为 max order，所有更高 order 的小组件各 -1
- 置底：target 变为 1，所有更低 order 的小组件各 +1
- 删除小组件后，剩余小组件的 order 重编号为连续的 `1~N`

## 工厂函数

```typescript
// 创建小组件
function createWidget(kind: WidgetKind, overrides?: Partial<WidgetModel>): WidgetModel;

// 生成唯一 ID（base62 编码）
function generateWidgetId(): WidgetId;
```

## 渲染器注册

小组件通过 `WidgetRendererMap` 注册渲染器：

```typescript
type WidgetRendererMap = Partial<Record<WidgetKind, WidgetRenderer<any>>>;

function createOverlayRendererMap(
    renderers: Partial<Record<WidgetKind, ComponentType<WidgetRendererProps>>>
): WidgetRendererMap;
```

在 `OverlayRoot` 中通过 `resolveWidgetRenderer(renderers, widget.kind)` 解析对应的渲染器组件。

## 设计决策

1. **百分比布局**：使用百分比而非像素，确保小组件在不同容器尺寸下保持相对位置
2. **base62 ID**：短且 URL 安全的唯一标识
3. **类型特化 Props**：每个 `WidgetKind` 有独立的 props 类型，通过泛型约束
4. **不可变模型**：所有修改通过命令模式产生新模型实例
5. **z-index 层级控制**：使用 `order` 属性（渲染为 CSS `z-index`）而非 DOM 顺序控制层叠，避免 iframe 等嵌入内容在层级变化时刷新
6. **应用层初始化**：webwidget 引擎不内置默认小组件，由消费者（如 webpaper）通过 `initWidgets()` 初始化，支持从持久化存储恢复

## 渲染策略：为什么不用 Canvas 容器渲染所有组件

在设计组件引擎时，一个常见的思路是使用单个 Canvas 元素作为渲染容器，将所有组件统一绘制在 Canvas 上，以获得更高的性能和渲染一致性。然而经过评估，当前引擎选择以 **DOM 元素 + CSS z-index** 作为默认渲染策略，以下是关键的取舍分析。

### 1. 技术限制：部分组件无法渲染到 Canvas 中

并非所有类型的组件都能被绘制到 Canvas 上：

- **iframe**：受限于浏览器安全模型，iframe 的内容运行在独立的浏览上下文中，无法通过 `drawImage()` 或其他 Canvas API 捕获并绘制到 Canvas 上。Canvas 的 `drawImage` 只能获取同源（same-origin）且未被 CORS 策略阻止的图片资源，而 iframe 内容本质上是一个独立的文档视口，不存在可提取的像素快照接口（`HTMLIFrameElement` 没有暴露绘制上下文）。
- **Live2D**：Live2D SDK（如 pixi-live2d-display 或 Cubism SDK）自行创建并管理 WebGL/Canvas 上下文进行模型渲染。若要将其绘制到统一的 Canvas 中，需要额外实现离屏渲染 → 合成的管线，且 Live2D 模型的交互（鼠标跟踪、拖拽、物理模拟）依赖于独立的事件系统和渲染循环，强行整合会引入大量的适配工作和稳定性风险。

这意味着即使采用 Canvas 容器方案，iframe 和 Live2D 等组件仍需以 DOM 方式存在，Canvas 容器无法实现真正意义上的"统一渲染"。

### 2. 多层方案无法满足任意层级需求

一种折中方案是将组件拆分为多个渲染层（Canvas 层 + DOM 层），但这种分层架构在面对**任意 order 需求**时存在根本性缺陷：

以一个实际场景为例：用户需要 **text A → iframe B → text C** 的层叠顺序（即 A 在最上，B 在中间，C 在最下）。若将 text 类组件渲染到 Canvas 层、iframe 渲染到 DOM 层，则：

- Canvas 层整体只有一层，其中的 text A 和 text C 无法分别位于 iframe B 的上方和下方
- 无论 Canvas 层的 z-index 设为多少，它作为一个整体要么全部在 iframe 之上，要么全部在 iframe 之下
- 无法实现 text A 遮挡 iframe B 同时被 iframe B 遮挡 text C 这样的**交错层级**

要解决此问题，需要进一步拆分 Canvas 层（如 Canvas-A 层和 Canvas-C 层），但这会导致：
- 层数随组件组合动态膨胀，管理复杂度指数级增长
- 每增加一种新的组件类型（如 video、html），都可能需要新的层级拆分策略
- 与纯 DOM 方案相比，并未带来实质性的性能收益

### 3. 当前规模下纯 DOM 方案性能充足

当前组件引擎的设计目标为支持 **约 30 个**小组件同时存在于画面上。在这个量级下：

- **性能**：现代浏览器对 DOM 元素的合成、光栅化和布局计算已经过高度优化。30 个左右的 DOM 元素在大多数设备上可以轻松维持 60fps 的渲染性能
- **浏览器原生能力复用**：
  - **碰撞检测**：直接利用 CSS `pointer-events`、`element.getBoundingClientRect()` 等浏览器内置 API
  - **事件监听**：每个 DOM 元素天然支持完整的事件冒泡/捕获机制，无需自行实现事件分发
  - **布局计算**：利用 CSS Flexbox/Grid 以及 `position: absolute` + `z-index` 实现灵活布局，无需手写布局引擎
- **开发效率**：直接操作 DOM 可以使用成熟的前端生态（React/Vue 组件模型、CSS 样式、Web API），大幅降低开发和维护成本

### 4. 大规模组件的演进方向：动态分层与合并

若未来需要支持**大量组件**（数百甚至更多），当前的纯 DOM 方案可通过**动态分层与动态合并层级**策略进行扩展，而无需推翻现有架构：

**基本思路**：将同类或相邻的组件合并到同一 Canvas 层中，减少 DOM 节点数量。

以具体场景说明：假设当前有 **text A、text B、text C、iframe D、text E、text F**：

1. **初始合并**：将 text 组件按连续性合并
   - Canvas-1：text A、text B、text C
   - DOM 层：iframe D
   - Canvas-2：text E、text F

2. **层级调整**：若需要将 iframe D 插入 text B 和 text C 之间
   - 将 text C 从 Canvas-1 移动到 Canvas-2
   - Canvas-1：text A、text B（Canvas 层内部自行管理 A、B 的层级关系）
   - DOM 层：iframe D
   - Canvas-2：text C、text E、text F（Canvas 层内部自行管理 C、E、F 的层级关系）

3. **每个合并后的 Canvas 层内部**自行管理其包含组件的绘制顺序，对外部而言每一层仍是一个独立的渲染单元

这种方案的优势在于：
- 是渐进式优化，不需要重写引擎架构
- 仅在性能瓶颈出现时引入，避免过早优化
- 层级合并策略可以按需动态调整，适应不同的组件组合场景

### 5. 其他限制因素

- **调试与可访问性**：DOM 元素可以被浏览器开发者工具直接检查（Elements 面板），支持 Accessibility Tree 自动暴露；Canvas 内容对屏幕阅读器和开发者工具是不透明的
- **文本渲染质量**：Canvas 绘制的文本无法享受浏览器的亚像素渲染、字体 hinting 等优化，尤其在高 DPI 屏幕上表现不如 DOM 文本
- **样式灵活性**：DOM 元素天然支持 CSS 的全部能力（渐变、阴影、滤镜、过渡动画），而 Canvas 需要全部手动实现
- **热更新与持久化**：基于 DOM 的组件可以直接利用虚拟 DOM diff 算法进行高效更新，无需手动管理 Canvas 重绘区域

综上，纯 DOM 渲染方案在当前的组件规模和类型需求下是最务实的选择，同时保留了未来向 Canvas 混合渲染演进的可能性。
