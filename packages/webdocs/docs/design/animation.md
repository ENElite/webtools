# 动画系统设计

## 概述

动画系统由两层组成：

1. **StyleAnimator（CSS 属性过渡动画）**：将 `widget.style` 的动画属性通过 Framer Motion 的 `animate` prop 实现平滑过渡
2. **Slot 系统（窗口级动画）**：通过信号-槽机制触发预设动画效果（fade、slide、scale 等）

## 第一层：StyleAnimator — CSS 属性过渡

### WidgetAnimationSettings

小组件模型上的动画设置，控制 `widget.style` 属性的过渡动画：

```typescript
type WidgetAnimationSettings = {
    easing?: string;           // 缓动曲线（ease-in / ease-out / ease-in-out / linear）
    duration?: number;         // 过渡时长（秒），默认 0.3
    delay?: number;            // 过渡延迟（秒），默认 0
    animatedProperties?: string[];  // 启用过渡动画的 CSS 属性列表
};
```

### 属性分离

`StyleAnimator` 将 `widget.style` 分为两组：

- **animatedProps**：在 `animatedProperties` 列表中的属性 → 放入 `motion.div` 的 `animate` prop，有过渡动画
- **staticProps**：不在列表中的属性 → 放入 `motion.div` 的 `style` prop，立即变化

这样未选中的属性不会被 Framer Motion 默认过渡影响。

### 可动画属性

```typescript
const ALL_ANIMATABLE_PROPS = new Set([
    'opacity', 'backgroundColor', 'borderRadius', 'outline', 'outlineOffset',
    'boxShadow', 'backdropFilter', 'backgroundImage',
]);
```

### 工作流程

```
widget.style + widget.animation
         │
         ▼
    buildFullStyle()  ──→ 完整 CSSProperties
         │
         ▼
    splitStyle()  ──→ animated (CSSProperties) + static (CSSProperties)
         │
         ▼
    buildTransition()  ──→ transition 配置（每个属性独立的 duration/easing/delay）
         │
         ▼
    motion.div
        ├── style = { ...staticProps, ...externalStyle }
        ├── animate = animated
        └── transition = transition
```

## 第二层：Slot 系统 — 窗口级动画

### 动画 Slot

动画效果通过 Slot 系统注册和执行。`animationSlot` 是内置的窗口级动画 Slot：

```typescript
const ANIMATION_SLOT: SlotDefinition = {
    type: 'animation',
    label: '窗口动画',
    group: '动画',
    accepts: ['lifecycle', 'user', 'system'],  // 接受的信号前缀
    paramSchema: [...],  // 参数定义，编辑器自动生成表单
    execute(params, ctx) { ... },
};
```

### 触发机制

动画 Slot 通过 Connection 连接信号：

```
信号 (lifecycle.mount / user.mouse.click / ...)
  │
  ▼
WidgetRuntime 连接路由
  │
  ▼
animationSlot.execute(params, ctx)
  │
  ▼
buildPreset(config) → Framer Motion controls.start()
```

### AnimationConfig

动画配置的核心类型（用于 Slot 参数和预设构建）：

```typescript
type AnimationConfig = {
    motionType: MotionType;      // 运动类型
    effect: AnimationEffect;     // 动画效果
    loop: boolean;               // 是否循环
    delay: number;               // 延迟（秒）
    duration: number;            // 持续时间（秒）
    intensity: number;           // 强度（0-1）
    direction?: AnimationDirection;  // 方向
    easing?: AnimationEasing;    // 缓动函数
};
```

### 11 种预设效果

| 效果 | 说明 | 参数 |
|------|------|------|
| `fade` | 淡入淡出 | intensity 控制最大透明度 |
| `slide` | 滑动 | direction 控制方向，intensity 控制距离 |
| `scale` | 缩放 | intensity 控制缩放幅度 |
| `rotate` | 旋转 | intensity 控制旋转角度 |
| `blur` | 模糊 | intensity 控制模糊半径 |
| `glitch` | 故障效果 | CSS animation 驱动 |
| `pulse` | 脉冲 | intensity 控制缩放幅度 |
| `shake` | 抖动 | intensity 控制抖动幅度 |
| `bounce` | 弹跳 | 弹跳高度随 intensity 递减 |
| `flip` | 翻转 | intensity 控制翻转角度 |
| `typewriter` | 打字机 | 预留效果 |

### 预设构建器

```typescript
function buildPreset(config: AnimationConfig): PresetResult {
    // 返回 initial、animate、exit 三个状态
    return {
        initial: { opacity: 0, scale: 0.7 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.7 },
    };
}
```

## 运动类型

### Spring（弹簧）

```typescript
{ type: 'spring', stiffness: 300, damping: 20 }
```

物理模拟的弹簧动画，适合自然的交互反馈。

### Tween（补间）

```typescript
{ type: 'tween', duration: 0.3, ease: 'ease-out' }
```

基于时间的线性插值，精确控制持续时间和缓动。

### Transition（过渡）

```typescript
{ type: 'tween', duration: 0.3, ease: 'easeInOut' }
```

窗口过渡动画风格。

## 缓动函数

| 值 | 说明 |
|----|------|
| `ease-in` | 慢开始，快结束 |
| `ease-out` | 快开始，慢结束 |
| `ease-in-out` | 慢开始，慢结束 |
| `linear` | 匀速 |

## 动画方向

用于 slide 效果：

| 方向 | 说明 |
|------|------|
| `up` | 从下向上 |
| `down` | 从上向下 |
| `left` | 从右向左 |
| `right` | 从左向右 |

## 可用的信号触发源

| 信号 | 说明 |
|------|------|
| `lifecycle.mount` | 挂载时 |
| `system.idle` | 空闲时 |
| `user.mouse.enter` | 鼠标进入 |
| `user.mouse.leave` | 鼠标离开 |
| `user.mouse.click` | 鼠标点击 |
| `widget.style.*` | 属性变化（透明度、背景色、边框等） |

## Slot 参数 Schema

动画 Slot 的参数通过 `paramSchema` 定义，编辑器自动生成对应的表单控件：

```typescript
type SlotParamSchemaItem = {
    key: string;
    label: string;
    type: 'number' | 'string' | 'boolean' | 'enum' | 'color' | 'slider' | 'widgetRef';
    default?: SlotParamValue;
    meta?: Record<string, unknown>;
};
```

支持条件显示（`visibleWhen`），例如方向选项仅在 effect 为 `slide` 时显示。

## 默认配置

```typescript
const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
    effect: 'fade',
    motionType: 'tween',
    loop: false,
    delay: 0,
    duration: 0.3,
    intensity: 1,
};
```

## 设计决策

1. **双层动画**：CSS 属性过渡（StyleAnimator）+ 窗口级动画（Slot 系统），各司其职
2. **声明式配置**：动画通过 JSON 配置定义，运行时编译为 Framer Motion
3. **信号驱动**：动画 Slot 绑定信号，实现事件驱动的动画触发
4. **强度参数**：`intensity` 统一控制动画幅度，支持 0-1 范围调节
5. **预设系统**：内置常见动画效果，降低使用门槛
6. **属性选择**：用户可精确选择哪些 style 属性参与过渡动画
