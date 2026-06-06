# Hooks

## webwidget Hooks

### useIntervalFn

```typescript
function useIntervalFn(fn: () => void, delay: number | null): void;
```

定时器 Hook，自动清理。`delay` 为 `null` 时暂停。

### useLive2D

```typescript
function useLive2D(containerRef: RefObject<HTMLCanvasElement>, modelPath: string): void;
```

Live2D 模型加载与渲染 Hook。

### useLocalFonts

```typescript
function useLocalFonts(): {
    fonts: Font[];
    loading: boolean;
    error: string | null;
    refresh: () => void;
};
```

加载用户本地字体（通过 `window.queryLocalFonts()`）。

### usePlaybackScheduler

```typescript
function usePlaybackScheduler(
    items: any[],
    interval: number,
    enabled: boolean
): {
    currentIndex: number;
    next: () => void;
    prev: () => void;
    play: () => void;
    pause: () => void;
};
```

播放调度 Hook，支持自动轮播和手动控制。

### usePosition

```typescript
function usePosition(
    layout: WidgetLayout,
    containerBounds: { width: number; height: number }
): { x: number; y: number; w: number; h: number };
```

根据百分比布局和容器尺寸计算实际像素位置。

### usePreloadImage

```typescript
function usePreloadImage(src: string): {
    loaded: boolean;
    error: boolean;
};
```

图片预加载 Hook，返回加载状态。

### useScaledCanvas

```typescript
function useScaledCanvas(
    canvasRef: RefObject<HTMLCanvasElement>,
    scale: number
): CanvasRenderingContext2D | null;
```

Canvas 缩放 Hook，处理 DPI 适配。

### useTimestamp

```typescript
function useTimestamp(interval?: number): number;
```

返回当前时间戳，可选自动更新间隔。

## webpaper Hooks

### useFetch

```typescript
function useFetch<T>(
    url: string,
    params?: Record<string, unknown>
): {
    data: T | null;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
};
```

数据请求 Hook，支持自动重试。

### useIntervalFn

同 webwidget 的 `useIntervalFn`。

### useLocalFonts

同 webwidget 的 `useLocalFonts`。

### usePlaybackScheduler

同 webwidget 的 `usePlaybackScheduler`。

### usePosition

同 webwidget 的 `usePosition`。

### usePreloadImage

同 webwidget 的 `usePreloadImage`。

### useTimestamp

同 webwidget 的 `useTimestamp`。

## Store Hooks

### useOverlayStore

```typescript
function useOverlayStore<T>(selector: (state: OverlayState) => T): T;
```

访问 overlay 状态，支持 selector 优化渲染。

**返回值**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `widgets` | `WidgetModel[]` | 所有小组件 |
| `activeWidgetId` | `WidgetId \| null` | 当前激活的小组件 |
| `canUndo` | `boolean` | 是否可撤销 |
| `canRedo` | `boolean` | 是否可重做 |
| `setWidgets` | `(widgets) => void` | 设置小组件列表 |
| `setActiveWidget` | `(id) => void` | 设置激活小组件 |
| `executeCommand` | `(cmd) => void` | 执行命令 |
| `undo` | `() => void` | 撤销 |
| `redo` | `() => void` | 重做 |

### useWidgetStore

```typescript
function useWidgetStore(): {
    widgets: WidgetModel[];
    activeWidgetId: WidgetId | null;
    activeWidget: WidgetModel | null;
    activate: (id: WidgetId | null) => void;
    findWidget: (id: WidgetId) => WidgetModel | null;
    onWidgetLayoutChange: (id: WidgetId, layout: WidgetLayout) => void;
    onWidgetStyleChange: (id: WidgetId, style: WidgetStyle) => void;
};
```

小组件操作的派生 store，提供常用操作方法。

### useWidgetAction

```typescript
function useWidgetAction(): {
    moveUp: (id: WidgetId) => void;
    moveDown: (id: WidgetId) => void;
    moveToTop: (id: WidgetId) => void;
    moveToBottom: (id: WidgetId) => void;
    remove: (id: WidgetId) => void;
    copy: (id: WidgetId) => void;
    resetRotation: (id: WidgetId) => void;
    toggleLock: (id: WidgetId) => void;
};
```

小组件操作 Hook，封装常用的小组件操作命令。
