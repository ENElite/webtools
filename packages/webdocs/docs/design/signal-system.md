# 信号系统设计

## 概述

信号系统是一个类型安全的发布/订阅事件总线，用于解耦小组件状态变化与动画/运行时响应。

## 信号类型

### 基础信号结构

```typescript
type BaseSignal<T extends string, P = void> = {
    timestamp: number;      // 时间戳
    source: SignalSource;   // 信号源
    type: T;                // 信号类型
    payload: P;             // 负载数据
    widgetId?: string;      // 关联的小组件 ID
};
```

### 四种信号源

#### 1. WidgetSignal — 小组件属性变化

```typescript
type WidgetSignal = BaseSignal<WidgetPath, { prev: unknown; next: unknown }>;
```

当小组件的任何顶层属性发生变化时触发，携带变化前后的值。`WidgetPath` 是类型安全的属性路径（如 `style.opacity`、`layout.x`）。

#### 2. SystemSignal — 系统状态

```typescript
type SystemSignal = BaseSignal<'idle' | 'active'>;
```

系统空闲 5 秒后触发 `idle`，用户交互后触发 `active`。

#### 3. UserSignal — 用户交互

```typescript
type UserSignal = BaseSignal<'mouse.enter' | 'mouse.leave' | 'mouse.click'>;
```

鼠标进入/离开/点击小组件时触发。

#### 4. LifecycleSignal — 生命周期

```typescript
type LifecycleSignal = BaseSignal<'mount' | 'unmount' | 'visible' | 'hidden'>;
```

小组件挂载/卸载/可见/隐藏时触发。

## SignalBus

### 接口

```typescript
interface SignalBus {
    emit(signal: Signal): void;                    // 发射信号
    on<T>(type: T, handler: Handler): () => void;  // 订阅特定类型
    onAny(handler: Handler): () => void;            // 订阅所有信号
    off(type: string, handler: Handler): void;      // 取消订阅
}
```

### 实现

```typescript
function createSignalBus(): SignalBus {
    const handlers = new Map<string, Set<Handler>>();
    const anyHandlers = new Set<Handler>();

    return {
        emit(signal) {
            // 1. 通知特定类型的订阅者
            const typeHandlers = handlers.get(signal.type);
            if (typeHandlers) {
                for (const handler of typeHandlers) {
                    handler(signal);
                }
            }
            // 2. 通知通配符订阅者
            for (const handler of anyHandlers) {
                handler(signal);
            }
        },
        // ...
    };
}
```

项目中使用单例 `signalBus` 实例。

## 信号工厂函数

```typescript
function createWidgetSignal(widgetId, type, prev, next): WidgetSignal;
function createSystemSignal(type): SystemSignal;
function createUserSignal(type, widgetId?): UserSignal;
function createLifecycleSignal(type, widgetId?): LifecycleSignal;
```

## 信号发射时机

### 命令执行时

`overlayStore.executeCommand()` 在命令执行后：

1. 对比新旧 widget 列表
2. 新增的 widget → 发射 `lifecycle.mount`
3. 删除的 widget → 发射 `lifecycle.unmount`
4. 变化的 widget → 逐个属性对比，发射 `widget.*` 信号

### Undo/Redo 时

`overlayStore.undo()` 和 `overlayStore.redo()` 同样对比新旧状态并发射信号。

### 系统空闲检测

`OverlayRoot` 中的 `SystemIdleEmitter` 使用 `useIdle(5000)` 检测空闲状态，发射 `system.idle` / `system.active` 信号。

## 与动画系统的集成

动画槽（Animation Slot）通过信号触发：

```typescript
type AnimationTrigger = {
    source: AnimationTriggerSource;  // 'widget' | 'system' | 'user' | 'lifecycle'
    type: string;                     // 信号类型（如 'mouse.enter', 'mount'）
};
```

当信号匹配动画槽的 trigger 时，`animationRuntime` 编译并播放对应的动画配置。

## 设计决策

1. **单例模式**：全局 `signalBus` 简化跨组件通信
2. **类型安全**：通过 TypeScript 泛型确保信号类型与处理器匹配
3. **自动取消订阅**：`on()` 返回取消订阅函数，配合 React `useEffect` 清理
4. **通配符订阅**：`onAny` 用于调试和全局监听
5. **时间戳**：每个信号携带时间戳，支持时序分析
