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
