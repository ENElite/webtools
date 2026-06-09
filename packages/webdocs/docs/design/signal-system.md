# 信号系统设计

## 概述

信号系统由两部分组成：

1. **SignalBus**：类型安全的发布/订阅事件总线，用于解耦小组件状态变化与运行时响应
2. **Signal-Slot 连接系统**：参考 Qt 的信号与槽机制，通过 `Connection` 四元组将信号路由到目标 Slot 执行

## SignalBus

### 信号类型

#### 基础信号结构

```typescript
type BaseSignal<T extends string, P = void> = {
    timestamp: number;      // 时间戳
    source: SignalSource;   // 信号源
    type: T;                // 信号类型
    payload: P;             // 负载数据
    widgetId?: string;      // 关联的小组件 ID
};
```

#### 四种信号源

**WidgetSignal — 小组件属性变化**

```typescript
type WidgetSignal = BaseSignal<WidgetPath, { prev: unknown; next: unknown }>;
```

当小组件的任何顶层属性发生变化时触发，携带变化前后的值。`WidgetPath` 是类型安全的属性路径（如 `style.opacity`、`layout.x`）。

**SystemSignal — 系统状态**

```typescript
type SystemSignal = BaseSignal<'idle' | 'active'>;
```

系统空闲 5 秒后触发 `idle`，用户交互后触发 `active`。

**UserSignal — 用户交互**

```typescript
type UserSignal = BaseSignal<'mouse.enter' | 'mouse.leave' | 'mouse.click'>;
```

鼠标进入/离开/点击小组件时触发。

**LifecycleSignal — 生命周期**

```typescript
type LifecycleSignal = BaseSignal<'mount' | 'unmount' | 'visible' | 'hidden'>;
```

小组件挂载/卸载/可见/隐藏时触发。

### SignalBus 接口

```typescript
interface SignalBus {
    emit(signal: Signal): void;                    // 发射信号
    on<T>(type: T, handler: Handler): () => void;  // 订阅特定类型
    onAny(handler: Handler): () => void;            // 订阅所有信号
    off(type: string, handler: Handler): void;      // 取消订阅
}
```

项目中使用单例 `signalBus` 实例。

### 信号工厂函数

```typescript
function createWidgetSignal(widgetId, type, prev, next): WidgetSignal;
function createSystemSignal(type): SystemSignal;
function createUserSignal(type, widgetId?): UserSignal;
function createLifecycleSignal(type, widgetId?): LifecycleSignal;
```

### 信号发射时机

**命令执行时**

`overlayStore.executeCommand()` 在命令执行后：

1. 对比新旧 widget 列表
2. 新增的 widget → 发射 `lifecycle.mount`
3. 删除的 widget → 发射 `lifecycle.unmount`
4. 变化的 widget → 逐个属性对比，发射 `widget.*` 信号

**Undo/Redo 时**

`overlayStore.undo()` 和 `overlayStore.redo()` 同样对比新旧状态并发射信号。

**系统空闲检测**

`OverlayRoot` 中的 `SystemIdleEmitter` 使用 `useIdle(5000)` 检测空闲状态，发射 `system.idle` / `system.active` 信号。

## Signal-Slot 连接系统

### Connection 四元组

```typescript
type Connection = {
    /** signal 标识符，如 'model.style.opacity', 'user.mouse.click' */
    signal: string;
    /** 目标 widgetId */
    target: string;
    /** slot 标识符，如 'animation' */
    slot: string;
    /** slot 参数，如 { duration: 0.3, easing: 'ease-out' } */
    params?: Record<string, SlotParamValue>;
};
```

- `signal` 和 `slot` 均为 `'.'` 分隔的字符串标识符
- 连接总是从当前 widget 发出，`target` 为空字符串时表示自身
- Slot 的 `accepts` 声明它能处理的 signal type 前缀模式

### Slot 定义

```typescript
type SlotDefinition = {
    type: string;           // 唯一标识，如 'animation'
    label: string;          // 编辑器展示名
    group: string;          // 分组，编辑器按组折叠展示
    accepts: string[];      // 接受的 signal type 前缀模式
    paramSchema: SlotParamSchemaItem[];  // 参数定义，编辑器自动生成表单
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

### Slot 注册表

全局注册表管理所有 Slot 定义：

```typescript
function registerSlot(definition: SlotDefinition): void;
function unregisterSlot(type: string): void;
function getSlot(type: string): SlotDefinition | undefined;
function getAllSlots(): SlotDefinition[];
function getSlotsForSignalType(signalType: string): SlotDefinition[];
function isSlotCompatibleWithSignal(slotType: string, signalType: string): boolean;
```

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

### 内置 Slot

#### animation — 窗口动画

```typescript
const ANIMATION_SLOT: SlotDefinition = {
    type: 'animation',
    label: '窗口动画',
    group: '动画',
    accepts: ['lifecycle', 'user', 'system'],
    paramSchema: [
        { key: 'effect', type: 'enum', default: 'fade' },
        { key: 'easing', type: 'enum', default: 'ease-out' },
        { key: 'duration', type: 'slider', default: 0.3 },
        { key: 'delay', type: 'slider', default: 0 },
        { key: 'loop', type: 'boolean', default: false },
        { key: 'hold', type: 'boolean', default: false },
        { key: 'direction', type: 'enum', default: 'up' },
        { key: 'intensity', type: 'slider', default: 1 },
    ],
    execute(params, ctx) {
        const controls = ctx.getControls(ctx.targetWidgetId);
        if (!controls) return;
        const preset = buildPreset(config);
        controls.set(preset.initial);
        controls.start({ ...preset.animate, transition });
    },
};
```

## WidgetRuntime — 每个小组件的运行时管理器

参考 Qt 的 `QObject`，每个 widget 拥有一个 `WidgetRuntime` 实例：

```typescript
class WidgetRuntime {
    emit(type: string, payload?: unknown): void;     // 发射信号到全局 signalBus
    on(type: string, handler: SignalHandler): Unsubscribe;  // 监听信号
    registerSlot(type: string, handler: SlotHandler): Unsubscribe;  // 注册 slot
    connect(connection: Connection): void;            // 添加连接
    disconnect(predicate: (c: Connection) => boolean): void;  // 移除连接
    dispose(): void;                                  // 销毁，清理所有订阅
}
```

### 连接路由流程

```
signalBus.emit(signal)
       │
       ▼
WidgetRuntime._setupConnectionListener()
       │
       ├── 检查 signal.type 是否匹配 connection.signal（前缀匹配）
       ├── 检查 signal.widgetId 是否匹配当前 runtime.id
       │
       ▼
ExecuteSlot(slotType, signal, targetWidgetId, params)
       │
       ├── 优先查找本实例的 slot handler
       ├── Fallback 到全局 slot registry
       │
       ▼
SlotDefinition.execute(params, ctx)
```

### WidgetRuntimeRegistry

全局 singleton，管理所有 WidgetRuntime 实例：

```typescript
const widgetRuntimeRegistry = new WidgetRuntimeRegistry();
// getOrCreate(widgetId) → WidgetRuntime
// dispose(widgetId) → 清理 runtime
// disposeAll() → 清理所有 runtime
```

## 信号日志

开发模式下可通过 `enableSignalLog(true)` 开启信号与槽位的日志输出：

```typescript
enableSignalLog(true);

// 信号发射日志
console.log('⚡ signal model.style.opacity [widget-123]');

// 槽位执行日志
console.log('🔧 animation ← signal lifecycle.mount widget-123 → widget-456');
```

## 设计决策

1. **单例模式**：全局 `signalBus` 简化跨组件通信
2. **类型安全**：通过 TypeScript 泛型确保信号类型与处理器匹配
3. **自动取消订阅**：`on()` 返回取消订阅函数，配合 React `useEffect` 清理
4. **通配符订阅**：`onAny` 用于调试和全局监听
5. **时间戳**：每个信号携带时间戳，支持时序分析
6. **Qt 风格**：参考 Qt 信号与槽机制，通过 Connection 四元组实现松耦合的跨组件通信
7. **前缀匹配**：Slot 通过 `accepts` 前缀模式声明兼容的信号类型，编辑器自动过滤
8. **双层执行**：WidgetRuntime 实例 slot → 全局 SlotDefinition，支持组件自定义和全局共享
