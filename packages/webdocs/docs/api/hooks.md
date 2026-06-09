# Hooks

## @webtools/shared Hooks

以下 Hooks 定义在 `@webtools/shared` 包中，由 webwidget 和 webpaper 共享使用：

### useIntervalFn

```typescript
function useIntervalFn(fn: () => void, delay: number | null): void;
```

定时器 Hook，自动清理。`delay` 为 `null` 时暂停。

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

### useTimestamp

```typescript
function useTimestamp(interval?: number): number;
```

返回当前时间戳，可选自动更新间隔。

## webwidget Hooks

### useLive2D

```typescript
function useLive2D(containerRef: RefObject<HTMLCanvasElement>, modelPath: string): void;
```

Live2D 模型加载与渲染 Hook。

### useScaledCanvas

```typescript
function useScaledCanvas(
    canvasRef: RefObject<HTMLCanvasElement>,
    scale: number
): CanvasRenderingContext2D | null;
```

Canvas 缩放 Hook，处理 DPI 适配。

## webpaper Hooks

### useFetch

功能完整的数据请求 Hook，支持链式 API、生命周期回调、自动重试：

```typescript
function useFetch<T>(
    url: string,
    options?: RequestInit,
    config?: UseFetchOptions<T>
): UseFetchReturn<T>;
```

**状态属性**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `data` | `T \| null` | 解析后的响应数据 |
| `isFetching` | `boolean` | 是否正在请求 |
| `error` | `Error \| null` | 请求错误 |
| `aborted` | `boolean` | 是否被取消 |
| `canAbort` | `boolean` | 是否可以取消 |
| `response` | `Response \| null` | 原始 Response 对象 |

**方法**：

| 方法 | 说明 |
|------|------|
| `execute(opts?)` | 手动执行请求 |
| `abort()` | 取消当前请求 |
| `refetch()` | 重新请求 |
| `updateUrl(url, execute?)` | 更新 URL 并可选执行 |
| `onResponse(cb)` | 注册响应回调 |
| `onError(cb)` | 注册错误回调 |
| `onFinally(cb)` | 注册完成回调 |

**链式 HTTP 方法**：

```typescript
const { data } = useFetch('/api')
    .post()
    .json<{ id: number }>();
```

支持 `.get()`、`.post()`、`.put()`、`.delete()`、`.patch()`、`.head()`、`.options()`。

**链式响应格式**：

```typescript
const { data } = useFetch('/api/data')
    .json<{ items: Item[] }>();    // 解析为 JSON
    .text();                        // 解析为文本
    .blob();                        // 解析为 Blob
    .arrayBuffer();                 // 解析为 ArrayBuffer
    .custom(parser);                // 自定义解析器
```

**配置选项**：

```typescript
type UseFetchOptions<T> = {
    immediate?: boolean;      // 立即执行（默认 true）
    refetch?: boolean;        // 依赖变化时重新请求（默认 true）
    retry?: number | 'inf';   // 重试次数
    retryDelay?: number | 'auto';  // 重试延迟（'auto' 为指数退避）
    deps?: DependencyList;    // 依赖数组
    beforeFetch?: (ctx) => void;   // 请求前回调
    afterFetch?: (ctx) => void;    // 请求后回调
    onResponse?: (ctx) => void;    // 响应回调
    onError?: (ctx) => void;       // 错误回调
    onFinally?: () => void;        // 完成回调
};
```

**工厂函数**：

```typescript
function createFetch(baseUrl: string, baseOptions?: RequestInit, baseConfig?: UseFetchOptions<any>);
```

创建预配置的 `useFetch` 实例：

```typescript
const useApi = createFetch('https://api.example.com', {
    headers: { Authorization: 'Bearer token' },
});

// 使用
const { data } = useApi('/users');
```

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
