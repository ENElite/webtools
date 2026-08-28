# WidgetLayout 设计与实现

## 1. 概述

WidgetLayout 是小组件引擎的核心布局系统，采用**百分比 + 锚点**的方案实现分辨率无关的定位。所有位置和尺寸均以容器的百分比存储，渲染时通过数学公式转换为 CSS 像素坐标。

本文档详细描述坐标计算的数学推导过程，论证代码实现的正确性。

## 2. WidgetLayout 类型定义

```typescript
type WidgetLayout = {
    anchorX: 'left' | 'center' | 'right';   // 水平锚点
    anchorY: 'top' | 'center' | 'bottom';   // 垂直锚点
    x: number;        // 水平偏移百分比 [0, 100]
    y: number;        // 垂直偏移百分比 [0, 100]
    w: number;        // 宽度百分比（占容器宽度）
    h: number;        // 高度百分比（占容器高度）
    rotation: number; // 旋转角度（度）
    adapt: 'stretch' | 'fixed' | 'stretch-ratio' | 'stick';
    order: number;    // z-index 层级
};
```

**符号约定**：

| 符号 | 含义 |
|------|------|
| $C_w$ | 容器宽度（像素） |
| $C_h$ | 容器高度（像素） |
| $w_p$ | 小组件宽度（像素） |
| $h_p$ | 小组件高度（像素） |
| $x$ | WidgetLayout 中的水平偏移百分比 |
| $y$ | WidgetLayout 中的垂直偏移百分比 |
| $x_p$ | 小组件左上角的水平像素坐标 |
| $y_p$ | 小组件左上角的垂直像素坐标 |

## 3. 锚点系统

锚点定义了小组件的**定位基准点**——即小组件的哪个点"钉"在容器上。x/y 偏移百分比描述的是小组件相对于该基准点的位移。

### 3.1 锚点基准值（Anchor Base）

锚点基准值 $B$ 定义了容器上基准点的像素坐标：

$$
B_x(a_x, C_w) = \begin{cases} 0 & a_x = \texttt{left} \\ \dfrac{C_w}{2} & a_x = \texttt{center} \\ C_w & a_x = \texttt{right} \end{cases}
$$

$$
B_y(a_y, C_h) = \begin{cases} 0 & a_y = \texttt{top} \\ \dfrac{C_h}{2} & a_y = \texttt{center} \\ C_h & a_y = \texttt{bottom} \end{cases}
$$

**代码对应**（`transform_utils.ts:42-52`）：

```typescript
function getAnchorBaseX(anchorX, containerWidth) {
    if (anchorX === "left") return 0;
    if (anchorX === "center") return containerWidth / 2;
    return containerWidth;
}
```

### 3.2 锚点偏移量（Anchor Offset）

锚点偏移量 $O$ 描述了小组件自身的哪个点与基准点重合：

$$
O_x(a_x, w_p) = \begin{cases} 0 & a_x = \texttt{left} \\ \dfrac{w_p}{2} & a_x = \texttt{center} \\ w_p & a_x = \texttt{right} \end{cases}
$$

$$
O_y(a_y, h_p) = \begin{cases} 0 & a_y = \texttt{top} \\ \dfrac{h_p}{2} & a_y = \texttt{center} \\ h_p & a_y = \texttt{bottom} \end{cases}
$$

**直观含义**：

| 锚点 | 基准点在容器上 | 小组件的哪个点对齐 |
|------|---------------|-------------------|
| left/top | 左上角 (0, 0) | 小组件左上角 |
| center/center | 容器中心 | 小组件中心 |
| right/bottom | 右下角 ($C_w$, $C_h$) | 小组件右下角 |

**代码对应**（`transform_utils.ts:54-76`）：

```typescript
function getAnchorOffsetX(anchorX, width) {
    if (anchorX === 'center') return width / 2;
    if (anchorX === 'right') return width;
    return 0;
}
```

### 3.3 可移动范围（Available Travel Range）

x/y 偏移百分比并不直接映射到容器的 0%~100%，而是映射到小组件可以安全移动而不溢出容器的范围。这个"可移动范围"由容器尺寸减去小组件尺寸得到：

$$
A_w = \max(C_w - w_p, \ 0)
$$

$$
A_h = \max(C_h - h_p, \ 0)
$$

**为什么要 clamp 到 0**：当小组件尺寸大于容器时（$w_p > C_w$），可移动范围为 0，小组件被固定在锚点位置无法移动，避免溢出。

## 4. 核心公式：百分比 → 像素（pxFromLayout）

### 4.1 公式推导

小组件左上角的像素坐标 $(x_p, y_p)$ 由三部分叠加：

$$
x_p = \underbrace{B_x(a_x, C_w)}_{\text{锚点基准}} - \underbrace{O_x(a_x, w_p)}_{\text{锚点偏移}} + \underbrace{\frac{x}{100} \cdot A_w}_{\text{百分比位移}}
$$

$$
y_p = \underbrace{B_y(a_y, C_h)}_{\text{锚点基准}} - \underbrace{O_y(a_y, h_p)}_{\text{锚点偏移}} + \underbrace{\frac{y}{100} \cdot A_h}_{\text{百分比位移}}
$$

其中小组件像素尺寸：

$$
w_p = \frac{w}{100} \cdot C_w
$$

$$
h_p = \frac{h}{100} \cdot C_h
$$

### 4.2 各锚点下的展开形式

将锚点函数代入公式，得到各锚点组合下的具体表达式：

#### 左上锚点（left/top）

$$
x_p = 0 - 0 + \frac{x}{100} \cdot (C_w - w_p) = \frac{x}{100} \cdot \left(C_w - \frac{w}{100} \cdot C_w\right)
$$

$$
x_p = \frac{x}{100} \cdot C_w \cdot \left(1 - \frac{w}{100}\right)
$$

- $x = 0$：小组件左上角在容器左上角 $(0, 0)$
- $x = 100$：小组件右边缘贴在容器右边缘（$x_p = C_w - w_p$）

#### 居中锚点（center/center）

$$
x_p = \frac{C_w}{2} - \frac{w_p}{2} + \frac{x}{100} \cdot A_w
$$

- $x = 0$：小组件水平居中（$x_p = \frac{C_w - w_p}{2}$）
- $x = 100$：小组件右边缘贴在容器右边缘

#### 右下锚点（right/bottom）

$$
x_p = C_w - w_p + \frac{x}{100} \cdot A_w
$$

- $x = 0$：小组件右下角在容器右下角（$x_p = C_w - w_p$）
- $x = 100$：小组件左边缘贴在容器左边缘（$x_p = 0$，但 $A_w$ 可能为 0）

### 4.3 代码验证

对应 `transform_utils.ts:78-91`：

```typescript
export function pxFromLayout(layout, containerWidth, containerHeight): PxRect {
    const w = Math.max(0, (layout.w / 100) * containerWidth);
    const h = Math.max(0, (layout.h / 100) * containerHeight);
    const availableWidth = Math.max(containerWidth - w, 0);
    const availableHeight = Math.max(containerHeight - h, 0);

    const left = getAnchorBaseX(layout.anchorX, containerWidth)
        - getAnchorOffsetX(layout.anchorX, w)
        + ((layout.x / 100) * availableWidth);
    const top = getAnchorBaseY(layout.anchorY, containerHeight)
        - getAnchorOffsetY(layout.anchorY, h)
        + ((layout.y / 100) * availableHeight);

    return { x: left, y: top, w, h, rotation: layout.rotation };
}
```

### 4.4 数值验证

以测试用例 `transform_utils.test.ts` 中的参数验证：

**容器**: $C_w = 1000, \ C_h = 600$

| 测试场景 | 参数 | 公式计算 | 代码结果 | 一致 |
|---------|------|---------|---------|------|
| left/top, x=0,y=0,w=20,h=15 | $w_p=200, h_p=90$ | $x_p = 0 - 0 + 0 = 0$ | $x_p = 0$ | ✓ |
| left/top, x=100,y=100,w=20,h=15 | $A_w=800, A_h=510$ | $x_p = 0 - 0 + 1.0 \times 800 = 800$ | $x_p = 800$ | ✓ |
| center/center, x=0,y=0,w=20,h=15 | $B_x=500, O_x=100$ | $x_p = 500 - 100 + 0 = 400$ | $x_p = 400$ | ✓ |
| right/bottom, x=0,y=0,w=20,h=15 | $B_x=1000, O_x=200$ | $x_p = 1000 - 200 + 0 = 800$ | $x_p = 800$ | ✓ |
| left/top, w=150,h=80 (溢出) | $A_w=0, A_h=0$ | $x_p = 0 - 0 + 0 = 0$ | $x_p = 0$ | ✓ |

## 5. 核心公式：像素 → 百分比（layoutFromPx）

### 5.1 逆推导

从像素坐标 $(x_p, y_p)$ 反推百分比 $(x, y)$，是对公式 4.1 的代数逆运算。

由：

$$
x_p = B_x - O_x + \frac{x}{100} \cdot A_w
$$

解出 $x$：

$$
\frac{x}{100} \cdot A_w = x_p - B_x + O_x
$$

$$
x = \frac{x_p - B_x + O_x}{A_w} \times 100 \quad \text{(当 } A_w > 0 \text{)}
$$

$$
x = \begin{cases} \dfrac{x_p - B_x + O_x}{A_w} \times 100 & A_w > 0 \\ 0 & A_w = 0 \end{cases}
$$

同理：

$$
y = \begin{cases} \dfrac{y_p - B_y + O_y}{A_h} \times 100 & A_h > 0 \\ 0 & A_h = 0 \end{cases}
$$

### 5.2 宽高百分比逆推

$$
w = \frac{w_p}{C_w} \times 100
$$

$$
h = \frac{h_p}{C_h} \times 100
$$

### 5.3 代码验证

对应 `transform_utils.ts:94-127`：

```typescript
export function layoutFromPx(px, containerWidth, containerHeight, anchorX, anchorY, adapt) {
    const w = Math.max(0, px.w);
    const h = Math.max(0, px.h);
    const baseX = getAnchorBaseX(anchorX, containerWidth);
    const baseY = getAnchorBaseY(anchorY, containerHeight);
    const availableWidth = Math.max(containerWidth - w, 0);
    const availableHeight = Math.max(containerHeight - h, 0);

    const xPercent = availableWidth > 0
        ? ((px.x - baseX + getAnchorOffsetX(anchorX, w)) / availableWidth) * 100
        : 0;
    const yPercent = availableHeight > 0
        ? ((px.y - baseY + getAnchorOffsetY(anchorY, h)) / availableHeight) * 100
        : 0;

    return {
        anchorX, anchorY,
        x: Number.isFinite(xPercent) ? xPercent : 0,
        y: Number.isFinite(yPercent) ? yPercent : 0,
        w: Number.isFinite((w / containerWidth) * 100) ? (w / containerWidth) * 100 : 0,
        h: Number.isFinite((h / containerHeight) * 100) ? (h / containerHeight) * 100 : 0,
        rotation: px.rotation,
        adapt,
    };
}
```

### 5.4 互逆性验证（Roundtrip）

`pxFromLayout` 与 `layoutFromPx` 应满足互逆性：$\text{layoutFromPx}(\text{pxFromLayout}(L)) = L$。

**证明**（以 left/top 锚点为例）：

设 $L = (x, y, w, h)$，正向计算得：

$$
w_p = \frac{w}{100} \cdot C_w, \quad h_p = \frac{h}{100} \cdot C_h
$$

$$
A_w = C_w - w_p, \quad x_p = \frac{x}{100} \cdot A_w
$$

逆向计算：

$$
x' = \frac{x_p - 0 + 0}{A_w} \times 100 = \frac{\frac{x}{100} \cdot A_w}{A_w} \times 100 = x
$$

$$
w' = \frac{w_p}{C_w} \times 100 = \frac{\frac{w}{100} \cdot C_w}{C_w} \times 100 = w
$$

对于 center/center 锚点：

$$
x_p = \frac{C_w}{2} - \frac{w_p}{2} + \frac{x}{100} \cdot A_w
$$

$$
x' = \frac{x_p - \frac{C_w}{2} + \frac{w_p}{2}}{A_w} \times 100 = \frac{\frac{x}{100} \cdot A_w}{A_w} \times 100 = x \quad \checkmark
$$

**代码测试验证**（`transform_utils.test.ts:123-189`）：三个锚点组合（left/top、center/center、right/bottom）的 roundtrip 测试均通过，误差 $< 10^{-5}$。

## 6. CSS 渲染：buildWidgetLayoutStyle

### 6.1 渲染策略

`buildWidgetLayoutStyle` 将 `WidgetLayout` 转换为 CSS 样式。它采用**两步法定位**：

1. **CSS 锚点定位**：通过 `left`/`top` 将小组件的锚点对齐到容器的对应位置
2. **CSS transform 偏移**：通过 `translate()` 将小组件从锚点位置移动到最终位置

```
CSS left/top          →  锚点对齐到容器
transform: translate  →  从锚点偏移到最终位置
transform: rotate     →  旋转
```

### 6.2 公式推导

CSS `left`/`top` 的值直接取锚点在容器中的百分比位置：

$$
\text{css\_left} = \begin{cases} \texttt{0\%} & a_x = \texttt{left} \\ \texttt{50\%} & a_x = \texttt{center} \\ \texttt{100\%} & a_x = \texttt{right} \end{cases}
$$

$$
\text{css\_top} = \begin{cases} \texttt{0\%} & a_y = \texttt{top} \\ \texttt{50\%} & a_y = \texttt{center} \\ \texttt{100\%} & a_y = \texttt{bottom} \end{cases}
$$

`translate()` 的偏移量为**小组件左上角相对于锚点的像素距离**：

$$
t_x = \frac{x}{100} \cdot A_w - O_x(a_x, w_p)
$$

$$
t_y = \frac{y}{100} \cdot A_h - O_y(a_y, h_p)
$$

**推导**：CSS `left: 0%` 将小组件左上角放在 $x=0$，此时 `translate(t_x)` 将其移动到 $x_p = t_x$。对于 left 锚点，$t_x = \frac{x}{100} \cdot A_w$，与 `pxFromLayout` 公式一致。对于 center 锚点，CSS `left: 50%` 将小组件左上角放在 $C_w/2$，`translate(t_x)` 中包含 $-w_p/2$ 的修正，最终位置 $C_w/2 - w_p/2 + \frac{x}{100} \cdot A_w$，与 `pxFromLayout` 一致。

### 6.3 代码验证

对应 `Widget.tsx:59-89`：

```typescript
function buildWidgetLayoutStyle(layout, containerBounds, effectiveLayout, fixedPixelSize) {
    const layoutToUse = effectiveLayout || layout;
    const widthPx = fixedPixelSize?.widthPx ?? Math.max(0, (layoutToUse.w / 100) * containerWidth);
    const heightPx = fixedPixelSize?.heightPx ?? Math.max(0, (layoutToUse.h / 100) * containerHeight);
    const availableWidth = Math.max(containerWidth - widthPx, 0);
    const availableHeight = Math.max(containerHeight - heightPx, 0);
    const translateX = ((layoutToUse.x / 100) * availableWidth) -
        (layoutToUse.anchorX === 'center' ? widthPx / 2 : layoutToUse.anchorX === 'right' ? widthPx : 0);
    const translateY = ((layoutToUse.y / 100) * availableHeight) -
        (layoutToUse.anchorY === 'center' ? heightPx / 2 : layoutToUse.anchorY === 'bottom' ? heightPx : 0);

    return {
        position: 'absolute',
        left: anchorLeft,   // '0%' | '50%' | '100%'
        top: anchorTop,     // '0%' | '50%' | '100%'
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        transform: `translate(${translateX}px, ${translateY}px) rotate(${layout.rotation}deg)`,
        zIndex: layout.order,
    };
}
```

代码中的 `translateX` 表达式展开为：

$$
t_x = \frac{x}{100} \cdot A_w - \begin{cases} 0 & a_x = \texttt{left} \\ w_p/2 & a_x = \texttt{center} \\ w_p & a_x = \texttt{right} \end{cases}
$$

这与 6.2 节的推导完全一致。

### 6.4 最终像素位置等价性

CSS 渲染的最终位置：

$$
x_{\text{final}} = \text{css\_left\_px} + t_x
$$

以 left 锚点为例：$\text{css\_left\_px} = 0$，$t_x = \frac{x}{100} \cdot A_w - 0$，所以 $x_{\text{final}} = \frac{x}{100} \cdot A_w = x_p$。

以 center 锚点为例：$\text{css\_left\_px} = C_w/2$，$t_x = \frac{x}{100} \cdot A_w - w_p/2$，所以 $x_{\text{final}} = C_w/2 - w_p/2 + \frac{x}{100} \cdot A_w = x_p$。

**结论**：`buildWidgetLayoutStyle` 与 `pxFromLayout` 计算出的像素位置完全等价。 ✓

## 7. DOM 快照：snapshotLayoutFromStyle

### 7.1 无旋转情况

当 `rotation = 0` 时，`getBoundingClientRect()` 返回的就是小组件的实际 CSS 尺寸和位置：

$$
x_p = \text{rect.left} - \text{containerRect.left}
$$

$$
y_p = \text{rect.top} - \text{containerRect.top}
$$

$$
w_p = \text{rect.width}, \quad h_p = \text{rect.height}
$$

### 7.2 有旋转情况

当 `rotation ≠ 0` 时，`getBoundingClientRect()` 返回的是旋转后的**轴对齐包围盒**（AABB），其尺寸和位置都与 CSS 布局尺寸不同。此时需要从 CSS 属性中直接读取：

$$
w_p = \text{offsetWidth}, \quad h_p = \text{offsetHeight}
$$

$$
x_p = B_x(a_x, C_w) + t_x
$$

$$
y_p = B_y(a_y, C_h) + t_y
$$

其中 $(t_x, t_y)$ 从 `style.transform` 中解析得到。

**原理**：CSS 布局中，`left: 0%` 将小组件放在锚点，`translate(t_x, t_y)` 偏移到最终位置。因此 `锚点基准 + translate = 左上角像素坐标`。这在旋转时仍然成立，因为 CSS 布局先计算 translate 再应用 rotate。

### 7.3 代码验证

对应 `transform_utils.ts:129-177`：

```typescript
if (rotation !== 0) {
    w = target.offsetWidth;
    h = target.offsetHeight;
    x = getAnchorBaseX(anchorX, containerWidth) + translateX;
    y = getAnchorBaseY(anchorY, containerHeight) + translateY;
} else {
    x = rect.left - containerLeft;
    y = rect.top - containerTop;
    w = rect.width;
    h = rect.height;
}
```

## 8. 自适应模式（Adapt Modes）

容器尺寸变化时，四种自适应模式决定小组件如何响应。

### 8.1 stretch（拉伸）

**策略**：小组件的 w/h 百分比不变，x/y 百分比不变。随容器等比缩放。

$$
w_p' = \frac{w}{100} \cdot C_w', \quad h_p' = \frac{h}{100} \cdot C_h'
$$

$$
x' = x, \quad y' = y
$$

直接由 `buildWidgetLayoutStyle` 使用原始 `layout` 计算，无需额外处理。

### 8.2 fixed（固定像素）

**策略**：冻结小组件的像素尺寸，调整 x/y 百分比使小组件保持在相同的像素位置。

**推导**：设初始容器为 $(C_{w0}, C_{h0})$，变化后为 $(C_w', C_h')$。

1. 初始像素尺寸：

$$
w_p = \frac{w}{100} \cdot C_{w0}, \quad h_p = \frac{h}{100} \cdot C_{h0}
$$

2. 初始像素位置（用 `pxFromLayout`）：

$$
x_{p0} = B_x(a_x, C_{w0}) - O_x(a_x, w_p) + \frac{x}{100} \cdot A_{w0}
$$

其中 $A_{w0} = C_{w0} - w_p$。

3. 反推新的 x 百分比：

$$
x' = \frac{x_{p0} - B_x(a_x, C_w') + O_x(a_x, w_p)}{A_w'} \times 100
$$

其中 $A_w' = C_w' - w_p$。

**代码验证**（`Widget.tsx:131-190`）：

```typescript
const baseLeft = getAnchorBaseX(anchorX, baseContainer.width) -
    getAnchorOffsetX(anchorX, fixedSize.widthPx) +
    ((layout.x / 100) * baseAvailableWidth);
// ... 与 pxFromLayout 公式一致，计算初始像素位置

const nextX = currentAvailableWidth > 0
    ? ((baseLeft - currentBaseX + currentOffsetX) / currentAvailableWidth) * 100
    : 0;
// ... 与上述逆推公式一致
```

### 8.3 stick（粘附）

**策略**：冻结小组件的像素尺寸，但 x/y 百分比**保持不变**。小组件"粘"在锚点的百分比位置上。

$$
w_p' = w_p \text{ (固定)}, \quad h_p' = h_p \text{ (固定)}
$$

$$
x' = x, \quad y' = y
$$

代码实现：`effectiveLayout = undefined`（使用原始 layout 的 x/y），`fixedPixelSize` 覆盖 w/h。

### 8.4 stretch-ratio（等比拉伸）

**策略**：小组件按容器缩放比例**等比缩放**，保持宽高比。位置也相对于锚点等比缩放。

**推导**：

1. 计算容器缩放比例：

$$
s_x = \frac{C_w'}{C_{w0}}, \quad s_y = \frac{C_h'}{C_{h0}}
$$

$$
s = \min(s_x, s_y)
$$

取 $\min$ 确保小组件不会超出容器。

2. 缩放后的像素尺寸：

$$
w_p' = w_p \cdot s, \quad h_p' = h_p \cdot s
$$

3. 初始像素位置（与 fixed 相同）：

$$
x_{p0} = B_x(a_x, C_{w0}) - O_x(a_x, w_p) + \frac{x}{100} \cdot A_{w0}
$$

4. 缩放位置（相对于锚点基准）：

$$
x_p' = B_x(a_x, C_w') + (x_{p0} - B_x(a_x, C_{w0})) \cdot s
$$

即：新锚点基准 + 旧偏移量 × 缩放因子。

5. 反推新的 x 百分比：

$$
x' = \frac{x_p' - B_x(a_x, C_w') + O_x(a_x, w_p')}{A_w'} \times 100
$$

6. 新的 w/h 百分比：

$$
w' = \frac{w_p'}{C_w'} \times 100, \quad h' = \frac{h_p'}{C_h'} \times 100
$$

**代码验证**（`Widget.tsx:233-316`）：

```typescript
const scaleX = containerBounds.width / baseContainer.width;
const scaleY = containerBounds.height / baseContainer.height;
const scale = Math.min(scaleX, scaleY);

const scaledWidth = fixedSize.widthPx * scale;
const scaledHeight = fixedSize.heightPx * scale;

const scaledX = anchorBaseX_current + (baseLeft - anchorBaseX_base) * scale;
const scaledY = anchorBaseY_current + (baseTop - anchorBaseY_base) * scale;
```

与上述推导完全一致。 ✓

## 9. 锚点切换补偿

### 9.1 问题

用户在设置面板中切换锚点时，x/y 百分比的含义会改变。如果不做补偿，小组件会跳到新的位置。

### 9.2 解决方案

1. 用旧锚点计算当前像素位置：$x_p = \text{pxFromLayout}(L_{\text{old}}, C_w, C_h)$
2. 用新锚点反推新的 x/y 百分比：$x' = \text{layoutFromPx}(x_p, C_w, C_h, a_x^{\text{new}}, a_y^{\text{new}})$

**数学本质**：像素位置不变，仅变换坐标系（从旧锚点坐标系到新锚点坐标系）。

**代码验证**（`SettingsPanel.tsx:26-90`）：

```typescript
const px = pxFromLayout(sourceWidget.layout, containerWidth, containerHeight);
// 用新锚点的 base/offset 反推百分比
const newX = ((px.x - anchorBaseX(newAnchorX) + anchorOffsetX(newAnchorX, w)) / availableWidth) * 100;
```

## 10. 旋转坐标处理

### 10.1 CSS 旋转模型

CSS `transform: translate(tx, ty) rotate(θ)` 的计算顺序是**从右到左**：

1. 先旋转：将小组件绕自身中心旋转 θ 度
2. 再平移：将旋转后的小组件移动到 $(t_x, t_y)$ 位置

因此小组件的四个角坐标需要用旋转矩阵计算。

### 10.2 旋转矩阵

设小组件中心为 $(c_x, c_y)$，旋转角度为 $\theta$（度），则旋转矩阵为：

$$
R(\theta) = \begin{pmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{pmatrix}
$$

四个角的局部坐标（相对于中心）：

$$
\text{TL} = \left(-\frac{w_p}{2}, -\frac{h_p}{2}\right), \quad \text{TR} = \left(\frac{w_p}{2}, -\frac{h_p}{2}\right)
$$

$$
\text{BL} = \left(-\frac{w_p}{2}, \frac{h_p}{2}\right), \quad \text{BR} = \left(\frac{w_p}{2}, \frac{h_p}{2}\right)
$$

旋转后的全局坐标：

$$
\begin{pmatrix} x' \\ y' \end{pmatrix} = \begin{pmatrix} c_x \\ c_y \end{pmatrix} + R(\theta) \cdot \begin{pmatrix} dx \\ dy \end{pmatrix}
$$

### 10.3 为什么 snapshotLayoutFromStyle 需要特殊处理

`getBoundingClientRect()` 返回的是旋转后的 AABB（轴对齐包围盒），其：

$$
\text{rect.width} = w_p \cdot |\cos\theta| + h_p \cdot |\sin\theta|
$$

$$
\text{rect.height} = w_p \cdot |\sin\theta| + h_p \cdot |\cos\theta|
$$

这与小组件的实际 CSS 尺寸 $(w_p, h_p)$ 不同。因此在 `rotation ≠ 0` 时，必须从 `offsetWidth`/`offsetHeight` 和 `style.transform` 中读取真实值。

## 11. 层级控制：order 字段的设计原因

### 11.1 问题：为什么不用数组排序控制层级？

直觉上，控制多个小组件的上下层级顺序，最简单的方式是在数组中排列它们的顺序——数组越靠后，渲染越靠上。对于普通 DOM 元素，这种方式完全可行：调整 `appendChild` 顺序即可改变视觉层级。

**但 iframe 是个例外。**

当 iframe 元素在 DOM 中的顺序发生变化时（无论是通过 `insertBefore`、`appendChild` 还是直接修改数组重新渲染），浏览器会**重新加载 iframe 的内容**。这是因为 iframe 的加载生命周期与它在 DOM 树中的位置紧密绑定——DOM 位置变化意味着"离开文档树再重新插入"，触发了 iframe 的 `unload` → `reload` 流程。

这对于小组件引擎来说是不可接受的：用户只是想调整 widget 的上下遮挡关系，却导致所有涉及位置变动的 iframe 小组件重新加载，造成闪烁、状态丢失和用户体验下降。

### 11.2 解决方案：order 字段 + z-index

因此，WidgetLayout 采用了 `order` 字段来控制层级：

```typescript
type WidgetLayout = {
    // ... 其他字段
    order: number;    // z-index 层级
};
```

`order` 在渲染时直接映射为 CSS `z-index` 属性（`Widget.tsx:87`）：

```typescript
return {
    position: 'absolute',
    left: anchorLeft,
    top: anchorTop,
    width: `${widthPx}px`,
    height: `${heightPx}px`,
    transform: `translate(${translateX}px, ${translateY}px) rotate(${layout.rotation}deg)`,
    zIndex: layout.order,  // ← order 直接映射为 z-index
};
```

这样做的好处：

1. **DOM 顺序不变**：所有 widget 始终保持在同一组 DOM 节点中，不改变它们的相对顺序
2. **视觉层级可控**：通过修改 `z-index` 值即可控制谁遮挡谁
3. **iframe 不重载**：因为 DOM 位置没有变化，iframe 不会触发重载

移动操作（`move.ts`）通过交换两个 widget 的 `order` 值来实现"上移"和"下移"，而不是移动数组中的位置。

### 11.3 Demo：iframe 重载问题演示

#### 目的

模拟真实场景中通过 DOM 元素顺序控制小组件层级（即"上移""下移"操作）。点击按钮后，左右两侧同时执行交换操作，观察 iframe 是否因 DOM 顺序变化而重载。

#### 验证内容

交换 DOM 顺序是否影响 iframe 的加载状态？每种方案对 iframe 的重载行为有何差异？

#### 四种方案

- **① z-index**：DOM 顺序不变，仅交换 CSS `z-index` 值 → **完全不重载**
- **② 无 key**：`v-for` 不指定 key（用索引），Vue 按位置复用 DOM 节点 → **完全重载**（两个 iframe 均重新挂载）
- **③ 纯 JS**：绕过 Vue，直接调用 `insertBefore` 操作 DOM 节点 → **完全重载**（浏览器将节点移出再插入，触发重载）
- **④ 有 key**：`v-for` 指定稳定 key，Vue 通过 diff 算法对比新旧节点 → **部分重载**（相当于将末尾的 iframe 移除后插入到第一个之前，仅被移动的那个 iframe 重载，且位置发生变化）

#### 结果

只有 z-index 方案能完全避免 iframe 重载。无 key 和纯 JS 方案均导致两个 iframe 完全重载。有 key 方案虽利用了 diff 算法减少重建范围，但仍无法避免被移动节点的重载。

<IframeOrderDemo />

### 11.4 小结

| 方案 | 实现 | iframe 行为 | 说明 |
|------|------|------------|------|
| ① z-index | 修改 CSS `z-index`，DOM 不变 | **不重载** ✅ | 唯一完全安全的方案 |
| ② 无 key | `v-for` 索引做 key，按位置复用 | **完全重载** ❌ | 两个 iframe 均重载 |
| ③ 纯 JS | `insertBefore` 直接操作 DOM | **完全重载** ❌ | 两个 iframe 均重载 |
| ④ 有 key | `v-for` 稳定 id 做 key，diff 算法 | **部分重载** ⚠️ | 仅被移动的 iframe 重载 |

WidgetLayout 选择 `order` 字段的原因：小组件引擎需要支持 iframe 类型的小组件，而 iframe 在 DOM 顺序变化时会重载，因此不能依赖数组排序来控制层级。`order` 字段渲染为 `z-index`，在不改变 DOM 结构的前提下实现层级控制。

## 12. 数据流总结

```
WidgetLayout (百分比存储)
    │
    ├─→ pxFromLayout() ──→ PxRect (像素坐标)
    │                          │
    │                          ├─→ layoutFromPx() ──→ WidgetLayout (逆推)
    │                          │
    │                          └─→ Moveable 交互后的 DOM 快照
    │
    └─→ buildWidgetLayoutStyle() ──→ CSS Style
                                       │
                                       ├─ position: absolute
                                       ├─ left/top (锚点百分比)
                                       ├─ width/height (像素)
                                       └─ transform: translate() rotate()

Moveable 拖拽/缩放/旋转结束
    │
    └─→ snapshotLayoutFromStyle()
         ├─ rotation=0: 从 getBoundingClientRect() 读取
         └─ rotation≠0: 从 offsetWidth/Height + transform 读取
         └─→ layoutFromPx() ──→ 更新 WidgetLayout
```

## 13. 正确性论证总结

| 模块 | 数学性质 | 验证方式 |
|------|---------|---------|
| `pxFromLayout` | 百分比 → 像素的双射（在有效定义域内） | 单元测试：4 种锚点 × 边界条件 |
| `layoutFromPx` | `pxFromLayout` 的逆运算 | Roundtrip 测试：$\|L' - L\| < 10^{-5}$ |
| `buildWidgetLayoutStyle` | CSS 渲染位置 = `pxFromLayout` 结果 | 公式等价性证明（§6.4） |
| `snapshotLayoutFromStyle` | DOM 状态 → WidgetLayout 的忠实还原 | 分旋转/无旋转两种情况推导 |
| `fixed` adapt | 像素位置不变，百分比重算 | 逆推公式 + 单调性（$A_w'$ 随 $C_w'$ 增大） |
| `stretch-ratio` adapt | 等比缩放 + 锚点相对位置缩放 | $\min(s_x, s_y)$ 保证不溢出 |
| `compensateAnchorChange` | 坐标系变换（锚点切换） | `pxFromLayout` → `layoutFromPx` 级联 |
