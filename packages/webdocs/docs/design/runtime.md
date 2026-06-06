# 运行时架构设计

## 概述

运行时系统负责小组件的渲染、交互、动画播放和生命周期管理。它由五个子运行时组成，通过 React Context 提供给整个小组件树。

## 架构图

```
┌─────────────────────────────────────────────┐
│              RuntimeProvider                 │
│  ┌───────────────────────────────────────┐  │
│  │          RuntimeContextValue          │  │
│  │  ┌──────────┐  ┌──────────────────┐  │  │
│  │  │userRtime │  │ systemRuntime    │  │  │
│  │  │(鼠标)    │  │ (空闲/活跃)      │  │  │
│  │  └──────────┘  └──────────────────┘  │  │
│  │  ┌──────────┐  ┌──────────────────┐  │  │
│  │  │lifecycle │  │ animationRuntime │  │  │
│  │  │Runtime   │  │ (动画编译)       │  │  │
│  │  │(生命周期)│  └──────────────────┘  │  │
│  │  └──────────┘  ┌──────────────────┐  │  │
│  │                │ visualStateRtime │  │  │
│  │                │ (视觉状态)       │  │  │
│  │                └──────────────────┘  │  │
│  └───────────────────────────────────────┘  │
├─────────────────────────────────────────────┤
│              OverlayRoot                    │
│  ┌───────────────────────────────────────┐  │
│  │  Widget × N                           │  │
│  │  ├── WidgetRenderer (小组件内容)      │  │
│  │  ├── 拖拽/缩放/旋转手柄              │  │
│  │  └── 动画播放                        │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │  SettingsPanel (浮动设置面板)         │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │  OverlayMoveable (交互手柄)           │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## 子运行时

### UserRuntime — 用户交互

```typescript
interface UserRuntime {
    emitMouseEnter(widgetId: string): void;
    emitMouseLeave(widgetId: string): void;
    emitClick(widgetId: string): void;
}
```

处理鼠标进入/离开/点击事件，发射 `UserSignal`。

### SystemRuntime — 系统状态

```typescript
interface SystemRuntime {
    emitIdle(): void;
    emitActive(): void;
}
```

管理系统空闲/活跃状态，发射 `SystemSignal`。

### LifecycleRuntime — 生命周期

```typescript
interface LifecycleRuntime {
    mount(widgetId: string): void;
    unmount(widgetId: string): void;
    visible(widgetId: string): void;
    hidden(widgetId: string): void;
}
```

管理小组件的挂载/卸载/可见/隐藏状态，发射 `LifecycleSignal`。

### AnimationRuntime — 动画

```typescript
interface AnimationRuntime {
    compile(widgetId: string, animation: WidgetAnimation | undefined): () => void;
}
```

将声明式动画配置编译为 Framer Motion 配置，返回清理函数。

### VisualStateRuntime — 视觉状态

```typescript
interface VisualStateRuntime {
    set(widgetId: string, state: VisualMotionState): void;
    get(widgetId: string): VisualMotionState;
    clear(widgetId: string): void;
    subscribe(widgetId: string, listener: () => void): () => void;
}

type VisualMotionState = {
    animate: Record<string, unknown>;
    transition: Record<string, unknown>;
};
```

管理小组件的视觉状态（animate/transition 配置），支持订阅变化。

## 核心组件

### OverlayRoot

根 Overlay 组件，负责：

1. **渲染所有小组件**：遍历 `widgets` 数组，解析渲染器并渲染
2. **激活管理**：点击小组件时激活，点击空白处取消激活
3. **悬停管理**：鼠标进入/离开时显示/隐藏操作手柄
4. **设置面板**：点击设置按钮时打开 `SettingsPanel`
5. **键盘快捷键**：Ctrl+Z/Y 撤销/重做
6. **空闲检测**：通过 `SystemIdleEmitter` 检测系统空闲

### Widget

小组件包装器，负责：

1. **布局定位**：根据 `WidgetLayout` 计算百分比位置
2. **视觉样式**：应用 `WidgetStyle`（边框、圆角、阴影等）
3. **动画播放**：通过 Framer Motion 的 `AnimatePresence` 播放动画
4. **生命周期信号**：挂载/卸载时发射信号
5. **自动隐藏**：`autoHide` 属性启用时空闲后自动隐藏
6. **固定/拉伸**：根据 `adapt` 模式调整渲染方式

### Moveable

拖拽/缩放/旋转手柄，基于 `react-moveable`：

- 拖拽移动小组件
- 缩放小组件大小
- 旋转小组件角度
- 吸附辅助线显示

### SettingsPanel

浮动设置面板：

- 显示当前激活小组件的属性编辑器
- 通过 `PropertyInspector` 动态渲染 Schema 驱动的编辑器
- 支持最大化/最小化
- 点击外部区域关闭

### RuntimeProvider

React Context Provider，将五个子运行时注入组件树：

```typescript
<RuntimeProvider>
    <SystemIdleEmitter />
    <OverlayRoot ... />
</RuntimeProvider>
```

## Moveable 扩展

### dimensionable

处理小组件的尺寸约束（最小/最大宽高）。

### widgetable

处理小组件的交互手柄（设置按钮、拖拽手柄等）。

## 数据流

```
用户交互 → UserRuntime.emit*() → SignalBus
                                    │
                    ┌───────────────┼───────────────┐
                    ↓               ↓               ↓
              动画系统          生命周期          视觉状态
         (animationRuntime) (lifecycleRuntime) (visualStateRuntime)
                    │               │               │
                    └───────────────┼───────────────┘
                                    ↓
                              Framer Motion
                                    ↓
                              React 重渲染
```

## 设计决策

1. **职责分离**：五个子运行时各司其职，降低耦合
2. **Context 注入**：通过 React Context 提供，避免 prop drilling
3. **信号驱动**：运行时通过信号系统通信，而非直接调用
4. **编译式动画**：声明式配置 → 运行时编译 → Framer Motion
5. **可扩展**：新运行时可通过 RuntimeProvider 注入
