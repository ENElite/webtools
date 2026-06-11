# ImageHero 显示模式

## 概述

`ImageHero` 组件负责图片的展示，支持 5 种加载模式，控制背景图（预览图）和前景图（原图）的加载时序，以优化用户体验。

## 模式总览

| 模式 | 说明 | 背景图 | 前景图 |
|------|------|--------|--------|
| `imageOnly` | 同步加载，无预览 | 直接设为原图 | 直接设为原图 |
| `imageAsync` | 异步加载，无预览 | 等待原图加载完成 | 等待原图加载完成 |
| `allAsync` | 异步加载，分离加载 | 异步加载预览图 | 异步加载原图 |
| `previewAsync` | 预览优先（默认） | 立即显示预览图 | 预览加载后设置原图 |
| `allSync` | 同步加载，带预览 | 同步设置预览图 | 背景图加载完成后设置原图 |

### 交互式演示

使用下方组件体验各模式的加载行为差异：

- **下拉框** 切换 5 种 mode
- **重置** 按钮重新预览当前 mode 的加载动画
- **下一张（自动切换）** 模拟壁纸自动切换
- **下一张（用户切换）** 模拟用户主动切换

<ImageHeroModeDemo />

## 组件结构

```
┌─────────────────────────────────────────┐
│  Container (absolute inset-0)           │
│  ┌───────────────────────────────────┐  │
│  │  Background Layer                 │  │
│  │  (预览图 / 原图，object-cover)     │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  Backdrop Blur (18px)             │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  Foreground Layer                 │  │
│  │  (原图，支持 objectFit + 跟踪)    │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## 各模式详解

### 1. imageOnly — 同步加载，无预览

```typescript
if (mode === 'imageOnly') {
    void Promise.resolve().then(() => {
        setBackgroundSrc(url);
        setForegroundSrc(url);
    });
}
```

**行为**：
- 在下一个微任务中直接设置背景图和前景图为原图 URL
- 不进行异步加载验证
- 不使用预览图

**适用场景**：图片已缓存或对加载体验要求不高。

### 2. imageAsync — 异步加载，无预览

```typescript
if (mode === 'imageAsync') {
    setForegroundSrc('');
    void loadImage(url).then((loaded) => {
        if (!loaded) { onImageError(); return; }
        setBackgroundSrc(url);
        setForegroundSrc(url);
    });
}
```

**行为**：
1. 清空前景图
2. 异步创建 `Image` 对象加载原图
3. 加载成功后同时设置背景图和前景图
4. 加载失败触发 `onImageError`

**适用场景**：无预览图的场景，确保图片加载完成后再展示。

### 3. allAsync — 异步分离加载

```typescript
if (mode === 'allAsync') {
    void loadImage(backgroundUrl).then((loaded) => {
        if (loaded) setBackgroundSrc(backgroundUrl);
    });
    void loadImage(url).then((loaded) => {
        if (!loaded) { onImageError(); return; }
        setForegroundSrc(url);
    });
}
```

**行为**：
1. 同时异步加载预览图和原图
2. 预览图加载完成 → 设置背景图（模糊背景）
3. 原图加载完成 → 设置前景图（清晰前景）
4. 两张图独立加载，互不阻塞

**适用场景**：预览图和原图 URL 不同，需要分别加载。

### 4. previewAsync — 预览优先（默认）

```typescript
if (mode === 'previewAsync') {
    void loadImage(backgroundUrl).then((loaded) => {
        if (!loaded) { onImageError(); return; }
        setBackgroundSrc(backgroundUrl);
        setForegroundSrc(url);  // 预览加载后立即设置原图
    });
}
```

**行为**：
1. 异步加载预览图
2. 预览图加载完成 → 设置背景图
3. 立即设置前景图（浏览器会自行加载）
4. 预览图作为加载占位，原图逐步清晰

**适用场景**：默认模式，提供最佳的渐进式加载体验。

### 5. allSync — 同步加载，带预览

```typescript
// 同步设置背景图
void Promise.resolve().then(() => {
    setBackgroundSrc(backgroundUrl);
    allSyncPendingRef.current = { token, backgroundUrl, foregroundUrl: url };
});

// 背景图 onLoad 回调中设置前景图
onLoad={(event) => {
    if (mode !== 'allSync') return;
    const pending = allSyncPendingRef.current;
    if (loadedUrl === expectedUrl) {
        allSyncPendingRef.current = null;
        setForegroundSrc(pending.foregroundUrl);
    }
}}
```

**行为**：
1. 在微任务中同步设置背景图（预览图 URL）
2. 等待背景图的 `onLoad` 事件触发
3. 背景图加载完成后才设置前景图
4. 使用 `loadTokenRef` 防止竞态条件

**适用场景**：需要确保背景图（预览）完全加载后再显示原图。

## 鼠标跟踪

所有模式都支持鼠标跟踪视差效果：

```typescript
const offsetX = (mouse.clientX / window.innerWidth - 0.5) * trackIntensity;
const offsetY = (mouse.clientY / window.innerHeight - 0.5) * trackIntensity;

// 应用到前景图
style={{
    transform: `scale(${trackScale / 100}) translate(${offsetX}%, ${offsetY}%)`,
}}
```

| 参数 | 说明 |
|------|------|
| `trackScale` | 缩放比例（百分比） |
| `trackIntensity` | 跟踪强度（0 = 禁用） |
| `enableMouseTracking` | 是否启用跟踪 |

## 竞态处理

所有模式使用 `loadTokenRef` 处理快速切换图片时的竞态条件：

```typescript
loadTokenRef.current += 1;
const token = loadTokenRef.current;

// 加载完成后检查 token 是否过期
void loadImage(url).then((loaded) => {
    if (loadTokenRef.current !== token) return;  // 已切换到新图片，丢弃
    // ...
});
```

## VideoHero

视频展示组件，与 ImageHero 结构类似：

```
┌─────────────────────────────────────────┐
│  Poster Layer (背景图)                   │
│  object-cover                            │
├─────────────────────────────────────────┤
│  Backdrop Blur (18px)                    │
├─────────────────────────────────────────┤
│  Video Element                           │
│  autoPlay, muted, playsInline, controls  │
│  objectFit 可配置                        │
└─────────────────────────────────────────┘
```

视频组件使用 `onCanPlay` 事件控制淡入效果，加载完成后从 `opacity-0` 过渡到 `opacity-100`。
