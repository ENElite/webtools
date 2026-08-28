# 信号槽连接系统设计

## 概述

信号槽连接系统参考 Qt 的信号与槽机制，通过 `Connection` 四元组将一个小组件的信号路由到另一个小组件（或自身）的 Slot 执行。这使得小组件之间可以松耦合地通信和协作。

## 核心概念

### Connection 四元组

```typescript
type Connection = {
    /** signal 标识符，如 'model.style.opacity', 'user.mouse.click' */
    signal: string;
    /** 目标 widgetId（空字符串表示自身） */
    target: string;
    /** slot 标识符，如 'animation' */
    slot: string;
    /** slot 参数，如 { duration: 0.3, easing: 'ease-out' } */
    params?: Record<string, SlotParamValue>;
};
```

### 设计思想

- `Connection` 仅描述链接关系，不包含执行逻辑
- 具体的执行逻辑由 `WidgetRuntime` 负责
- signal 和 slot 均为 `'.'` 分隔的字符串标识符
- 通过前缀匹配实现松耦合的信号路由

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                    WidgetRuntimeRegistry                    │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ WidgetRuntime A  │  │ WidgetRuntime B  │                │
│  │ ┌──────────────┐ │  │ ┌──────────────┐ │                │
│  │ │ signals:     │ │  │ │ signals:     │ │                │
│  │ │  emit()      │ │  │ │  emit()      │ │                │
│  │ │  on()        │ │  │ │  on()        │ │                │
│  │ ├──────────────┤ │  │ ├──────────────┤ │                │
│  │ │ slots:       │ │  │ │ slots:       │ │                │
│  │ │  register()  │ │  │ │  register()  │ │                │
│  │ │  execute()   │ │  │ │  execute()   │ │                │
│  │ ├──────────────┤ │  │ ├──────────────┤ │                │
│  │ │ connections: │ │  │ │ connections: │ │                │
│  │ │  connect()   │ │  │ │  connect()   │ │                │
│  │ │  disconnect()│ │  │ │  disconnect()│ │                │
│  │ └──────────────┘ │  │ └──────────────┘ │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              全局 Slot 注册表                        │   │
│  │  animation ──→ AnimationSlot (窗口动画)              │   │
│  │  custom.xxx ──→ 自定义 Slot ...                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## WidgetRuntime

每个小组件拥有一个 `WidgetRuntime` 实例，统一管理信号、槽和连接：

```typescript
class WidgetRuntime {
    readonly id: string;

    // Signal 管理
    emit(type: string, payload?: unknown): void;    // 发射到全局 signalBus
    on(type: string, handler: SignalHandler): Unsubscribe;

    // Slot 管理
    registerSlot(type: string, handler: SlotHandler): Unsubscribe;
    unregisterSlot(type: string): void;

    // Connection 管理
    connect(connection: Connection): void;
    disconnect(predicate: (c: Connection) => boolean): void;
    setConnections(connections: Connection[]): void;

    // 生命周期
    dispose(): void;
}
```

### 连接路由流程

当信号触发时，`WidgetRuntime` 执行以下流程：

```
signalBus.emit(signal)
       │
       ▼
WidgetRuntime._setupConnectionListener()
       │
       ├── 1. 检查 signal.type 是否匹配 connection.signal（前缀匹配）
       ├── 2. 检查 signal.widgetId 是否匹配当前 runtime.id
       │
       ▼
ExecuteSlot(slotType, signal, targetWidgetId, params)
       │
       ├── 3. 优先查找本实例的 slot handler（registerSlot 注册的）
       ├── 4. Fallback 到全局 slot registry（getSlot(type)）
       │
       ▼
SlotDefinition.execute(params, ctx)
```

## Slot 定义

### SlotDefinition

```typescript
type SlotDefinition = {
    type: string;           // 唯一标识，如 'animation'
    label: string;          // 编辑器展示名
    group: string;          // 分组，编辑器按组折叠展示
    accepts: string[];      // 接受的 signal type 前缀模式
    paramSchema: SlotParamSchemaItem[];  // 参数定义
    execute(params: Record<string, SlotParamValue>, ctx: SlotContext): void;
};
```

### 前缀匹配规则

Slot 通过 `accepts` 数组声明它接受的 signal type 前缀：

```typescript
// 示例
accepts: ['model.style']       // 只接受 model.style.* 信号
accepts: ['lifecycle', 'user'] // 接受 lifecycle.* 和 user.* 信号
accepts: []                    // 空数组表示接受所有信号
```

匹配逻辑：`signalType.startsWith(acceptPattern)`。

### Slot 参数 Schema

```typescript
type SlotParamSchemaItem = {
    key: string;
    label: string;
    type: 'number' | 'string' | 'boolean' | 'enum' | 'color' | 'slider' | 'widgetRef';
    default?: SlotParamValue;
    meta?: Record<string, unknown>;  // 如 options、min/max、visibleWhen
};
```

编辑器根据 `paramSchema` 自动生成对应的表单控件，支持条件显示。

### Slot 执行上下文

```typescript
type SlotContext = {
    widgetId: string;           // 信号触发的 widget
    targetWidgetId: string;     // 实际作用的 widget
    signalType: string;         // 信号类型
    prev: unknown;              // 信号原始 payload.prev
    next: unknown;              // 信号原始 payload.next
    getControls(widgetId: string): AnimationControls | null;
    updateWidget(widgetId: string, set: Record<string, unknown>): void;
    emit(source: string, type: string, prev: unknown, next: unknown): void;
};
```

## 内置 Slot

### animation — 窗口动画

```typescript
const ANIMATION_SLOT: SlotDefinition = {
    type: 'animation',
    label: '窗口动画',
    group: '动画',
    accepts: ['lifecycle', 'user', 'system'],
    paramSchema: [
        { key: 'effect', type: 'enum', default: 'fade',
          meta: { options: [
              { label: '淡入淡出', value: 'fade' },
              { label: '滑动', value: 'slide' },
              { label: '缩放', value: 'scale' },
              // ... 9 种效果
          ]}},
        { key: 'easing', type: 'enum', default: 'ease-out' },
        { key: 'duration', type: 'slider', default: 0.3,
          meta: { min: 0.1, max: 5, step: 0.1, unit: 's' }},
        { key: 'delay', type: 'slider', default: 0 },
        { key: 'loop', type: 'boolean', default: false },
        { key: 'hold', type: 'boolean', default: false,
          meta: { visibleWhen: { field: 'loop', equals: false } }},
        { key: 'direction', type: 'enum', default: 'up',
          meta: { visibleWhen: { field: 'effect', values: ['slide'] } }},
        { key: 'intensity', type: 'slider', default: 1,
          meta: { min: 0, max: 1, step: 0.05 }},
    ],
    execute(params, ctx) {
        const controls = ctx.getControls(ctx.targetWidgetId);
        if (!controls) return;
        const preset = buildPreset(config);
        const transition = getMotionTransition(config.motionType, config);
        controls.set(preset.initial);
        controls.start({ ...preset.animate, transition });
    },
};
```

## WidgetRuntimeRegistry

全局 singleton，管理所有 WidgetRuntime 实例：

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

## ConnectionEditor

`ConnectionEditor` 是一个新的编辑器组件，用于在设置面板中配置小组件的信号-槽连接：

- 选择目标小组件（widgetRef）
- 选择信号类型（从兼容的信号列表中选择）
- 选择 Slot（自动过滤兼容的 Slot）
- 配置 Slot 参数（根据 paramSchema 自动生成表单）

## 使用示例

### 声明式连接（通过 WidgetModel.connections）

```typescript
const widget: WidgetModel = {
    id: 'widget-1',
    kind: WidgetKinds.TEXT,
    // ...
    connections: [
        {
            signal: 'user.mouse.click',    // 当自身被点击时
            target: 'widget-2',            // 触发 widget-2 的动画
            slot: 'animation',
            params: { effect: 'scale', duration: 0.5 },
        },
    ],
};
```

### 编程式连接（通过 WidgetRuntime）

```typescript
const runtime = widgetRuntimeRegistry.getOrCreate('widget-1');

// 注册自定义 slot
runtime.registerSlot('custom.action', (params, ctx) => {
    console.log('Custom action triggered', params);
});

// 添加连接
runtime.connect({
    signal: 'user.mouse.click',
    target: 'widget-2',
    slot: 'animation',
    params: { effect: 'fade' },
});
```

## 向后兼容

系统保留了旧的 `SignalBinding` 类型，`SlotExecutor` 同时支持：

1. 新式 `Connection` 四元组（推荐）
2. 旧式 `SignalBinding`（向后兼容）

## 设计决策

1. **Qt 风格**：参考 Qt 信号与槽机制，通过 Connection 四元组实现松耦合
2. **前缀匹配**：Slot 通过 `accepts` 前缀模式声明兼容的信号类型
3. **双层执行**：WidgetRuntime 实例 slot → 全局 SlotDefinition，支持组件自定义和全局共享
4. **Schema 驱动**：Slot 参数通过 `paramSchema` 定义，编辑器自动生成表单
5. **可组合**：多个 Connection 可以同时绑定不同信号，实现复杂的交互逻辑
