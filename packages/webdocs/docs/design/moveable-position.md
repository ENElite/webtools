# Moveable Able Position 定位系统设计

## 概述

本文档详细描述 Moveable Able 扩展中的 Overlay 元素定位系统。该系统负责在旋转的小组件边界框（Bounding Box）上精确定位 UI 覆盖层（如操作按钮栏、尺寸标签、排序标签），并确保这些覆盖层随目标小组件同步旋转。

核心实现在 [`positionUtils.ts`](https://github.com/enelite/webtools/blob/main/packages/webwidget/src/runtime/ables/positionUtils.ts) 中，被三个 Able 使用：

| Able | 默认位置 | 功能 |
|------|----------|------|
| `widgetable` | `bottom-left` | 操作按钮栏（上移、删除等） |
| `dimensionable` | `top-right` | 尺寸标签（W × H） |
| `orderable` | `top-left` | 层级序号标签 |

---

## 交互式演示

<MoveablePositionDemo />

---

## 坐标系与参考点

### 页面坐标系

页面使用标准笛卡尔坐标系，原点在容器左上角，X 轴向右，Y 轴向下：

```
(0,0) ──────────── X →
  │
  │
  │  ┌─────────┐
  │  │ Widget  │
  │  └─────────┘
  │
  Y ↓
```

### 旋转后的角点坐标

`react-moveable` 在 `state` 中提供旋转后的四角坐标：

```
state.pos1 ──────────── state.pos2
  (top-left)             (top-right)
     ┌──────────────────────┐
     │                      │
     │       Widget         │  θ = rotation
     │                      │
     └──────────────────────┘
  state.pos3 ──────────── state.pos4
  (bottom-left)           (bottom-right)
```

每个 `pos` 是一个 `[x, y]` 数组，表示该角在页面坐标系中的位置。当小组件未旋转时：

```
pos1 = [left,       top       ]
pos2 = [left + w,   top       ]
pos3 = [left,       top + h   ]
pos4 = [left + w,   top + h   ]
```

旋转角度为 θ 时，各角点由旋转矩阵计算：

```
pos_center = [(pos1[0] + pos4[0]) / 2, (pos1[1] + pos4[1]) / 2]

对于任意角点相对于中心的偏移 (dx, dy)，旋转后：
  dx' = dx · cos(θ) - dy · sin(θ)
  dy' = dx · sin(θ) + dy · cos(θ)

旋转后角点 = (pos_center[0] + dx', pos_center[1] + dy')
```

---

## Position 语法

### 命名格式

`Position` 类型是 8 种组合的联合类型：

```
Horizontal × Vertical = 2 × 2 = 4 个角
```

每种角有两种写法（水平优先 or 垂直优先），共 8 种：

```
水平优先（horizontal-first）：
  left-top      left-bottom
  right-top     right-bottom

垂直优先（vertical-first）：
  top-left      top-right
  bottom-left   bottom-right
```

### 为什么需要两种写法

两种写法语义不同，控制的是**主方向**（primary axis）：

- **水平优先**：Overlay 沿水平方向移动到目标边缘，然后在该边缘上对齐。
  - `left-top`：向左移动到左侧边缘，对齐顶部
  - `right-bottom`：向右移动到右侧边缘，对齐底部

- **垂直优先**：Overlay 沿垂直方向移动到目标边缘，然后在该边缘上对齐。
  - `top-left`：向上移动到顶部边缘，左对齐
  - `bottom-right`：向下移动到底部边缘，右对齐

这个区别影响 offset 和 translate 的计算方式（见下文）。

---

## 核心算法：`getPositionStyles`

### 输入

```typescript
function getPositionStyles<T>(
    position: Position,           // 位置标识，如 'top-right'
    moveable: MoveableManagerInterface<T>,  // moveable 实例
    options?: { padding?: number; inside?: boolean }
): CSSProperties
```

### 算法步骤

#### 第一步：解析 Position 字符串

```typescript
const [D1, D2] = position.split('-');  // 例如 'top-right' → ['top', 'right']
```

判断 D1 是水平还是垂直，确定 `horizontalFirst`：

```typescript
horizontalFirst = HorizontalKeys.includes(D1);
// 'left-top'  → D1='left'  → horizontalFirst = true
// 'top-left'  → D1='top'   → horizontalFirst = false
```

#### 第二步：获取目标角点坐标

根据 `isLeft` 和 `isTop` 选择对应的角：

```typescript
isLeft  = (horizontal === 'left');
isTop   = (vertical === 'top');

cornerPos = getCornerPos(state, isLeft, isTop);
```

映射关系：

| isTop | isLeft | 角点 | state 属性 |
|-------|--------|------|-----------|
| true  | true   | 左上 | `pos1` |
| true  | false  | 右上 | `pos2` |
| false | true   | 左下 | `pos3` |
| false | false  | 右下 | `pos4` |

#### 第三步：计算 offset（像素偏移）

`offset` 是在旋转坐标系中的像素偏移，沿**主方向**将 Overlay 推离/推入目标边缘。

```
inside = false（默认）：Overlay 在目标外部
inside = true：Overlay 在目标内部
```

**水平优先情况**（主方向为水平）：

| 位置 | inside=false offset | inside=true offset |
|------|--------------------|--------------------|
| left-* | `(-padding, 0)` | `(padding, 0)` |
| right-* | `(padding, 0)` | `(-padding, 0)` |
| *-top (vertical) | `(0, 0)` | `(0, 0)` |
| *-bottom (vertical) | `(0, 0)` | `(0, 0)` |

**垂直优先情况**（主方向为垂直）：

| 位置 | inside=false offset | inside=true offset |
|------|--------------------|--------------------|
| *-left (horizontal) | `(0, 0)` | `(0, 0)` |
| *-right (horizontal) | `(0, 0)` | `(0, 0)` |
| top-* | `(0, -padding)` | `(0, padding)` |
| bottom-* | `(0, padding)` | `(0, -padding)` |

**规律**：offset 只在主方向上有值，辅方向为 0。

#### 第四步：计算 translate 百分比对齐

`translate` 是 CSS 百分比偏移，控制 Overlay 元素自身的对齐方式。由于 Overlay 的 `transformOrigin` 是 `0px 0px`（左上角），百分比偏移决定了元素如何相对于锚点对齐。

**水平优先情况**（translateX 由 inside 控制，translateY 由 top/bottom 决定）：

| 边缘 | inside=false | inside=true |
|------|-------------|-------------|
| left | `translateX = '-100%'` | `translateX = '0%'` |
| right | `translateX = '0%'` | `translateX = '-100%'` |
| top | `translateY = '0%'` | `translateY = '0%'` |
| bottom | `translateY = '-100%'` | `translateY = '-100%'` |

**垂直优先情况**（translateY 由 inside 控制，translateX 由 left/right 决定）：

| 边缘 | inside=false | inside=true |
|------|-------------|-------------|
| left | `translateX = '-100%'` | `translateX = '0%'` |
| right | `translateX = '0%'` | `translateX = '-100%'` |
| top | `translateY = '-100%'` | `translateY = '0%'` |
| bottom | `translateY = '0%'` | `translateY = '-100%'` |

#### 第五步：组装 CSS Transform

```typescript
transform: `
    translate(${cornerPos[0]}px, ${cornerPos[1]}px)
    rotate(${rect.rotation}deg)
    translate(${offsetX}px, ${offsetY}px)
    translate(${translateX}, ${translateY})
`
```

Transform 链从右到左应用（CSS transform 的标准行为）：

```
最终位置 = cornerPos → rotate → offset → translate
```

---

## 数学推导

### 坐标变换链

对于一个 Overlay 元素，其最终在页面上的位置由以下变换链决定：

```
P_final = T_corner · R_rotation · T_offset · T_percent · P_local
```

其中：
- `P_local`：Overlay 元素本地坐标（默认 `[0, 0]`，即左上角）
- `T_percent`：百分比对齐偏移
- `T_offset`：像素间距偏移
- `R_rotation`：目标小组件的旋转变换
- `T_corner`：目标角点的页面坐标

#### 展开计算

设目标角点坐标为 `(cx, cy)`，旋转角度为 `θ`（度），offset 为 `(ox, oy)`，translate 百分比对应的像素偏移为 `(px, py)`：

```
1. 先应用百分比对齐：
   local = (0 + px, 0 + py)
         = (px, py)

2. 应用 offset（在旋转坐标系中）：
   offset_pos = (px + ox, py + oy)

3. 应用旋转（绕原点旋转 θ）：
   θ_rad = θ × π / 180
   rotated_x = (px + ox) × cos(θ_rad) - (py + oy) × sin(θ_rad)
   rotated_y = (px + ox) × sin(θ_rad) + (py + oy) × cos(θ_rad)

4. 应用角点平移：
   final_x = cx + rotated_x
   final_y = cy + rotated_y
```

### 具体示例

#### 示例 1：`position = 'bottom-left'`，`inside = false`，`padding = 10`

参数解析：
- `horizontalFirst = false`（垂直优先，bottom 在前）
- `horizontal = 'left'`，`vertical = 'bottom'`
- `isLeft = true`，`isTop = false`
- 角点 = `pos3`（左下角）

假设目标小组件：
- 未旋转（θ = 0°）
- 左下角 pos3 = `(100, 300)`

计算：
- `offsetX = 0`，`offsetY = padding = 10`（垂直优先，bottom 方向）
- `translateX = '0%'` → `px = 0`（isLeft=true, vertical-first）
- `translateY = '0%'` → `py = 0`（isBottom, inside=false）

变换链：
```
P_final = (100, 300) + rotate(0°) · (0, 10) + (0, 0)
        = (100, 300) + (0, 10)
        = (100, 310)
```

结果：Overlay 元素的左上角位于 `(100, 310)`，即目标左下角下方 10px 处。这正确地将按钮栏放在了目标下方。

#### 示例 2：`position = 'top-right'`，`inside = false`，`padding = 10`

参数解析：
- `horizontalFirst = false`（垂直优先，top 在前）
- `horizontal = 'right'`，`vertical = 'top'`
- `isLeft = false`，`isTop = true`
- 角点 = `pos2`（右上角）

假设：
- θ = 0°
- pos2 = `(300, 100)`

计算：
- `offsetX = 0`，`offsetY = -padding = -10`（top 方向向上）
- `translateX = '-100%'` → `px = -elementWidth`（isRight, vertical-first, inside=false）
- `translateY = '-100%'` → `py = -elementHeight`（isTop, vertical-first, inside=false）

变换链：
```
P_final = (300, 100) + rotate(0°) · (0, -10) + (-W, -H)
        = (300, 100) + (0, -10) + (-W, -H)
        = (300 - W, 90 - H)
```

结果：尺寸标签的右下角对齐到目标右上角上方 10px 处。`-100%` 的 translate 确保标签向左上方展开，不会覆盖目标内容。

#### 示例 3：`position = 'bottom-left'`，`inside = true`，旋转 θ = 45°

参数解析：
- 角点 = `pos3`
- `offsetX = 0`，`offsetY = -padding = -10`（inside=true，方向反转）
- `translateX = '0%'` → `px = 0`（inside=true, isLeft → '0%'）
- `translateY = '-100%'` → `py = -H`（inside=true, isBottom → '-100%'）

假设 pos3 = `(200, 300)`，θ = 45°：

```
θ_rad = 45° × π / 180 = π/4
cos(θ) = sin(θ) = √2/2 ≈ 0.707

offset_pos = (0 + 0, -H + (-10)) = (0, -H - 10)

rotated_x = (0) × 0.707 - (-H - 10) × 0.707
           = 0.707 × (H + 10)

rotated_y = (0) × 0.707 + (-H - 10) × 0.707
           = 0.707 × (-H - 10)

final_x = 200 + 0.707 × (H + 10)
final_y = 300 + 0.707 × (-H - 10)
```

由于旋转了 45°，Overlay 被放置在目标内部、沿旋转后的左下方向偏移 10px。`rotate()` 确保 Overlay 的文字方向与目标边缘平行。

---

## 验证代码正确性

### 关键不变量

1. **旋转同步**：`rotate(${rect.rotation}deg)` 保证 Overlay 与目标同步旋转，文字始终平行于目标边缘。

2. **角点选择正确性**：
   ```
   isTop ∧ isLeft  → pos1 (左上)  ✓
   isTop ∧ ¬isLeft → pos2 (右上)  ✓
   ¬isTop ∧ isLeft → pos3 (左下)  ✓
   ¬isTop ∧ ¬isLeft→ pos4 (右下)  ✓
   ```

3. **inside 语义正确性**：
   - `inside=false`：offset 沿主方向**远离**目标（正方向 = 向外），translate 使 Overlay **远离**目标展开
   - `inside=true`：offset 沿主方向**朝向**目标（正方向 = 向内），translate 使 Overlay **朝向**目标展开

4. **百分比对齐的对称性**：

   水平优先模式下，translateX 由 inside 控制对齐方向，translateY 由 top/bottom 决定展开方向：

   | 条件 | translateX | translateY |
   |------|-----------|-----------|
   | 水平优先, left, outside | `-100%` | `0%` / `-100%`（top/bottom） |
   | 水平优先, right, outside | `0%` | `0%` / `-100%`（top/bottom） |

   垂直优先模式下，translateY 由 inside 控制对齐方向，translateX 由 left/right 决定展开方向：

   | 条件 | translateX | translateY |
   |------|-----------|-----------|
   | 垂直优先, top, outside | `0%` / `-100%`（left/right） | `-100%` |
   | 垂直优先, bottom, outside | `0%` / `-100%`（left/right） | `0%` |

   这保证了无论使用哪种命名风格，Overlay 都会正确地向远离目标的方向展开。

### 边界情况分析

| 场景 | 行为 | 正确性 |
|------|------|--------|
| θ = 0° | rotate 为单位变换，退化为简单平移 | ✓ |
| θ = 90° | 角点旋转 90°，offset 在旋转坐标系中正确 | ✓ |
| θ = 180° | 角点位置交换，但 pos 仍正确映射 | ✓ |
| padding = 0 | Overlay 紧贴目标边缘 | ✓ |
| inside 从 false 切换到 true | offset 方向反转，translate 方向也反转 | ✓ |
| Position 从水平优先切换为垂直优先 | 角点不变（同 isLeft/isTop），但 offset/translate 分配变化 | ✓ |

---

## 与 Widget Layout Position 系统的区别

本文描述的是 **Able Overlay 定位系统**，用于将 UI 覆盖层放置在小组件边界框上。

另一个相关系统是 **Widget Layout Position**（在 `transform_utils.ts` 中），用于将小组件放置在画布上。两者的核心区别：

| 特性 | Able Position | Widget Layout Position |
|------|--------------|----------------------|
| 目标 | UI 覆盖层（按钮、标签） | 小组件本身 |
| 坐标基础 | `moveable.state.pos1~4`（旋转后角点） | 百分比 + 锚点（anchorX/Y） |
| 旋转处理 | `rotate()` 同步旋转 | `WidgetLayout.rotation` 字段 |
| 主要用途 | 编辑态交互 UI | 画布布局存储 |

---

## 参考

- 源码：[`positionUtils.ts`](https://github.com/enelite/webtools/blob/main/packages/webwidget/src/runtime/ables/positionUtils.ts)
- 使用方：[`widgetable.tsx`](https://github.com/enelite/webtools/blob/main/packages/webwidget/src/runtime/ables/widgetable.tsx)、[`dimensionable.tsx`](https://github.com/enelite/webtools/blob/main/packages/webwidget/src/runtime/ables/dimensionable.tsx)、[`orderable.tsx`](https://github.com/enelite/webtools/blob/main/packages/webwidget/src/runtime/ables/orderable.tsx)
- 集成：[`Moveable.tsx`](https://github.com/enelite/webtools/blob/main/packages/webwidget/src/runtime/Moveable.tsx)
- Widget Layout 系统：[widget-engine.md](./widget-engine.md)
