# 运行时架构设计

## 概述

运行时系统负责小组件的渲染、交互、动画播放和生命周期管理。它由三个子运行时（userRuntime、systemRuntime、lifecycleRuntime）加两个独立模块（StyleAnimator、WidgetRuntime）组成，通过 React Context 提供给整个小组件树。

## 架构图

```
┌──────────────────────────────────────────────────────┐
│                   RuntimeProvider                     │
│  ┌────────────────────────────────────────────────┐  │
│  │            RuntimeContextValue                 │  │
│  │  ┌──────────┐  ┌──────────────────────────┐   │  │
│  │  │userRtime │  │ systemRuntime            │   │  │
│  │  │(鼠标)    │  │ (空闲/活跃)              │   │  │
│  │  └──────────┘  └──────────────────────────┘   │  │
│  │  ┌──────────┐  ┌──────────────────────────┐   │  │
│  │  │lifecycle │  │ WidgetRuntimeRegistry    │   │  │
│  │  │Runtime   │  │ (per-widget runtime)     │   │  │
│  │  │(生命周期)│  └──────────────────────────┘   │  │
│  │  └──────────┘                                 │  │
│  └────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────┤
│                   OverlayRoot                        │
│  ┌────────────────────────────────────────────────┐  │
│  │  Widget × N                                    │  │
│  │  ├── StyleAnimator (CSS 属性过渡动画)          │  │
│  │  ├── WidgetRenderer (小组件内容)               │  │
│  │  ├── 拖拽/缩放/旋转手柄                       │  │
│  │  └── WidgetRuntime (信号/槽/连接管理)          │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  SettingsPanel (浮动设置面板)                  │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  OverlayMoveable (交互手柄)                    │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  DevtoolsPanel (开发工具面板)                  │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
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

## StyleAnimator — CSS 属性动画代理

`StyleAnimator` 替代了旧的 `animationRuntime`，将 widget.style 的动画属性和静态属性分离，通过 Framer Motion 的 `animate` prop 实现 CSS 过渡动画。

### 工作原理

```
widget.style + widget.animation
         │
         ▼
    ┌─────────────────────┐
    │     StyleAnimator   │
    │  ┌───────────────┐  │
    │  │ animatedProps │──┼──→ motion.div animate prop (有过渡动画)
    │  │ (选中的属性)  │  │
    │  └───────────────┘  │
    │  ┌───────────────┐  │
    │  │ staticProps   │──┼──→ motion.div style prop (立即变化)
    │  │ (未选中的属性)│  │
    │  └───────────────┘  │
    └─────────────────────┘
```

### 核心类型

```typescript
type WidgetAnimationSettings = {
    easing?: string;           // 缓动曲线
    duration?: number;         // 过渡时长（秒）
    delay?: number;            // 过渡延迟（秒）
    animatedProperties?: string[];  // 启用过渡动画的 CSS 属性列表
};
```

### 可动画属性

```typescript
const ALL_ANIMATABLE_PROPS = new Set([
    'opacity', 'backgroundColor', 'borderRadius', 'outline', 'outlineOffset',
    'boxShadow', 'backdropFilter', 'backgroundImage',
]);
```

### 属性分离逻辑

1. 构建完整 style（从 `widget.style` 映射为 CSSProperties）
2. 根据 `widget.animation.animatedProperties` 分离为两组：
   - **animated**：在选中列表中的属性 → 放入 `animate` prop
   - **static**：不在选中列表中的属性 → 放入 `style` prop
3. 构建 `transition` 配置，对每个 animated 属性设置统一的 duration/easing/delay

### 入场动画

组件挂载时自动播放一个 1 秒的淡入动画（CSS keyframe），通过 `widget-mount-fade` class 实现，延迟 0.5 秒开始。

### overflow 控制

`widget.style.overflow === true` 时容器设为 `visible`，否则为 `hidden`。

## WidgetRuntime — 每个小组件的运行时管理器

设计参考 Qt 的 `QObject`，每个 widget 拥有一个 `WidgetRuntime` 实例，统一管理信号、槽和连接。

```typescript
class WidgetRuntime {
    readonly id: string;

    // Signal 管理
    emit(type: string, payload?: unknown): void;
    on(type: string, handler: SignalHandler): Unsubscribe;

    // Slot 管理
    registerSlot(type: string, handler: SlotHandler): Unsubscribe;
    unregisterSlot(type: string): void;
    getSlotHandler(type: string): SlotHandler | undefined;
    getRegisteredSlotTypes(): string[];

    // Connection 管理
    connect(connection: Connection): void;
    disconnect(predicate: (c: Connection) => boolean): void;
    getConnections(): readonly Connection[];
    setConnections(connections: Connection[]): void;

    // 生命周期
    dispose(): void;
}
```

### 连接路由

当信号触发时，`WidgetRuntime` 执行以下流程：

1. 检查所有 connections，找到匹配的连接（signal type 前缀匹配 + widgetId 匹配）
2. 优先查找本实例注册的 slot handler
3. Fallback 到全局 slot registry（`getSlot(type)`）
4. 执行 slot，传递连接参数和上下文

### WidgetRuntimeRegistry

全局 singleton，管理所有 `WidgetRuntime` 实例：

```typescript
class WidgetRuntimeRegistry {
    getOrCreate(widgetId: string): WidgetRuntime;
    get(widgetId: string): WidgetRuntime | undefined;
    dispose(widgetId: string): void;
    disposeAll(): void;
    getWidgetIds(): string[];
    has(widgetId: string): boolean;
}

const widgetRuntimeRegistry = new WidgetRuntimeRegistry();
```

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
2. **视觉样式**：通过 `StyleAnimator` 应用 `WidgetStyle`（边框、圆角、阴影等）
3. **动画播放**：`StyleAnimator` 处理 CSS 属性过渡，Slot 系统处理窗口级动画
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

React Context Provider，将子运行时和 WidgetRuntimeRegistry 注入组件树：

```typescript
<RuntimeProvider>
    <SystemIdleEmitter />
    <OverlayRoot ... />
</RuntimeProvider>
```

### DevtoolsPanel

开发工具面板，提供三个视图：

- **Widgets**：小组件列表和属性检查器
- **Signals**：实时信号日志
- **State**：overlay store 状态快照

通过快捷键切换显示/隐藏，支持 `useDevtoolsStore` 控制面板状态。

## Moveable 扩展

### dimensionable

处理小组件的尺寸约束（最小/最大宽高）。

### widgetable

处理小组件的交互手柄（设置按钮、拖拽手柄等）。

### orderable

显示小组件的 `order` 值作为覆盖层标签，辅助可视化层级顺序。

## 数据流

```
用户交互 → UserRuntime.emit*() → SignalBus
                                    │
                    ┌───────────────┼───────────────┐
                    ↓               ↓               ↓
              WidgetRuntime    lifecycleRuntime   SystemRuntime
             (连接路由到 slot)   (生命周期信号)    (空闲检测)
                    │
                    ▼
              Slot 执行器
                    │
         ┌──────────┼──────────┐
         ↓          ↓          ↓
    animation    updateWidget  emit (链式)
    slot         (修改属性)    (触发下一轮信号)
         │          │
         ▼          ▼
   Framer Motion   Command
   (容器动画)    (持久化变更)
         │          │
         └────┬─────┘
              ↓
        React 重渲染
```

## 设计决策

1. **职责分离**：三个子运行时 + StyleAnimator + WidgetRuntime 各司其职，降低耦合
2. **Context 注入**：通过 React Context 提供，避免 prop drilling
3. **信号驱动**：运行时通过信号系统通信，而非直接调用
4. **CSS 过渡动画**：StyleAnimator 将 widget.style 属性分离为动画/静态两组，未选中的属性不受默认过渡影响
5. **Qt 风格信号槽**：WidgetRuntime 参考 Qt QObject，每个小组件管理自己的信号、槽和连接
6. **可扩展**：新运行时可通过 RuntimeProvider 注入，新 Slot 可通过全局注册表添加
