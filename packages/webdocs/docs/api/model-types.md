# 模型类型

## WidgetModel

小组件的完整数据模型。

```typescript
type WidgetModel<TProps extends WidgetFlatProps = WidgetFlatProps> = {
    id: WidgetId;
    kind: WidgetKind;
    label: string;
    style: WidgetStyle;
    layout: WidgetLayout;
    props: TProps;
    locked?: boolean;
    autoHide?: boolean;
    animation?: WidgetAnimation;
};
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `WidgetId` | 是 | 唯一标识（base62 编码） |
| `kind` | `WidgetKind` | 是 | 小组件类型 |
| `label` | `string` | 是 | 显示名称 |
| `style` | `WidgetStyle` | 是 | 视觉样式 |
| `layout` | `WidgetLayout` | 是 | 百分比布局 |
| `props` | `TProps` | 是 | 类型特定属性 |
| `locked` | `boolean` | 否 | 是否锁定（禁止拖拽/缩放） |
| `autoHide` | `boolean` | 否 | 空闲时自动隐藏 |
| `animation` | `WidgetAnimation` | 否 | 动画配置 |

## WidgetKind

小组件类型枚举。

```typescript
type WidgetKind = 'text' | 'image' | 'video' | 'clock' | 'canvas' | 'html' | 'iframe' | 'live2d';
```

| 值 | 说明 |
|----|------|
| `text` | 文本组件（支持跑马灯、描边、阴影） |
| `image` | 图片展示 |
| `video` | 视频播放 |
| `clock` | 数字翻页时钟（支持中英文/数字格式） |
| `canvas` | Canvas 画布 |
| `html` | 原始 HTML 渲染 |
| `iframe` | URL 嵌入 |
| `live2d` | Live2D 模型渲染 |

## WidgetId

小组件唯一标识，base62 编码的字符串。

```typescript
type WidgetId = string;
```

生成方式：`generateWidgetId()` 使用 `Date.now()` + 随机数生成。

## WidgetStyle

小组件视觉样式。

```typescript
type WidgetStyle = {
    outline?: string;              // 边框（CSS shorthand）
    borderRadius?: string;         // 圆角
    outlineOffset?: string;        // 边框偏移
    opacity?: number;              // 透明度（0-1）
    backgroundColor?: string;      // 背景色
    backgroundEffect?: 'blur' | 'image' | 'none';  // 背景效果
    backgroundImageUrl?: string;   // 背景图片 URL
    shadowRadius?: number;         // 阴影半径
    shadowColor?: string;          // 阴影颜色
};
```

## WidgetLayout

百分比布局配置。

```typescript
type WidgetLayout = {
    anchorX: WidgetHorizontalAnchor;  // 水平锚点
    anchorY: WidgetVerticalAnchor;    // 垂直锚点
    x: number;    // X 偏移（百分比）
    y: number;    // Y 偏移（百分比）
    w: number;    // 宽度（百分比）
    h: number;    // 高度（百分比）
    rotation: number;  // 旋转角度（度）
    adapt: 'stretch' | 'fixed' | 'stretch-ratio' | 'stick';  // 自适应模式
    order: number;     // 层级顺序（渲染为 z-index）
};
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `anchorX` | `WidgetHorizontalAnchor` | 水平锚点 |
| `anchorY` | `WidgetVerticalAnchor` | 垂直锚点 |
| `x` | `number` | X 偏移（百分比） |
| `y` | `number` | Y 偏移（百分比） |
| `w` | `number` | 宽度（百分比） |
| `h` | `number` | 高度（百分比） |
| `rotation` | `number` | 旋转角度（度） |
| `adapt` | `string` | 自适应模式 |
| `order` | `number` | 层级顺序，范围 `1` ~ `N`（小组件总数），连续无间断 |

### 锚点类型

```typescript
type WidgetHorizontalAnchor = 'left' | 'center' | 'right';
type WidgetVerticalAnchor = 'top' | 'center' | 'bottom';
```

### 自适应模式

| 值 | 说明 |
|----|------|
| `stretch` | 小组件随容器大小缩放 |
| `fixed` | 小组件保持固定尺寸 |
| `stretch-ratio` | 按原始比例缩放 |
| `stick` | 固定像素尺寸，不随容器变化 |

### 层级顺序 order

`order` 控制小组件的视觉层叠顺序，渲染为 CSS `z-index`。

**设计考量**：使用 `z-index` 而非 DOM 顺序控制层级，避免 iframe 等嵌入内容在 DOM 位置变化时重新加载。

**操作规则**：
- 上移一层：与 `order + 1` 的小组件交换 order 值
- 下移一层：与 `order - 1` 的小组件交换 order 值
- 置顶：target 变为 max order，所有 order > target.order 的小组件各 -1
- 置底：target 变为 1，所有 order < target.order 的小组件各 +1
- 删除小组件后，剩余小组件的 order 重编号为连续的 `1~N`

## WidgetFlatProps

小组件属性的基础类型。

```typescript
type WidgetPropPrimitive = string | number | boolean | Record<string, unknown>;
type WidgetFlatProps = Record<string, WidgetPropPrimitive>;
```

## WidgetRenderer

小组件渲染器组件类型。

```typescript
type WidgetRendererProps<TProps extends WidgetFlatProps = WidgetFlatProps> = {
    widget: WidgetModel<TProps>;
};

type WidgetRenderer<TProps extends WidgetFlatProps = WidgetFlatProps> =
    ComponentType<WidgetRendererProps<TProps>>;

type WidgetRendererMap = Partial<Record<WidgetKind, WidgetRenderer<any>>>;
```

## 工厂函数

### createWidget

```typescript
function createWidget(kind: WidgetKind, overrides?: Partial<WidgetModel>): WidgetModel;
```

创建小组件实例。`overrides` 可覆盖默认值。

### generateWidgetId

```typescript
function generateWidgetId(): WidgetId;
```

生成唯一的小组件 ID（base62 编码）。

### createOverlayRendererMap

```typescript
function createOverlayRendererMap(
    renderers: Partial<Record<WidgetKind, ComponentType<WidgetRendererProps>>>
): WidgetRendererMap;
```

创建小组件渲染器映射。

### resolveWidgetRenderer

```typescript
function resolveWidgetRenderer(
    renderers: WidgetRendererMap,
    kind: WidgetKind
): ComponentType<WidgetRendererProps> | null;
```

根据小组件类型解析对应的渲染器组件。
