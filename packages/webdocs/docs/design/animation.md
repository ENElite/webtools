# 动画系统设计

## 概述

动画系统基于 Framer Motion，提供声明式的动画配置和运行时编译。小组件通过动画槽（Animation Slot）绑定信号，当信号触发时播放对应的动画。

## 动画模型

### AnimationConfig

动画配置的核心类型：

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

### AnimationSlot

动画槽将信号与动画配置关联：

```typescript
type AnimationSlot = {
    signal: AnimationTrigger;    // 触发信号
    motion: AnimationConfig;     // 动画配置
};

type WidgetAnimation = AnimationSlot[];
```

### AnimationTrigger

```typescript
type AnimationTrigger = {
    source: AnimationTriggerSource;  // 'widget' | 'system' | 'user' | 'lifecycle'
    type: string;                     // 信号类型
};
```

## 动画效果

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

## 运行时编译

`animationRuntime.compile(widgetId, animation)` 将声明式动画配置编译为 Framer Motion 的 `animate`/`exit` 配置：

1. 遍历 `WidgetAnimation` 数组
2. 对每个 slot，匹配当前信号
3. 调用 `buildPreset(config)` 生成 motion variant
4. 调用 `getTransition(config)` 生成 transition 配置
5. 返回清理函数

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

1. **声明式配置**：动画通过 JSON 配置定义，运行时编译为 Framer Motion
2. **信号驱动**：动画槽绑定信号，实现事件驱动的动画触发
3. **强度参数**：`intensity` 统一控制动画幅度，支持 0-1 范围调节
4. **预设系统**：内置常见动画效果，降低使用门槛
5. **可组合**：多个动画槽可以同时绑定不同信号
