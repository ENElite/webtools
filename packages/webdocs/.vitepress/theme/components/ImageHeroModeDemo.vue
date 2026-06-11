<template>
  <div class="imagehero-mode-demo">
    <!-- 控制栏 -->
    <div class="demo-controls">
      <div class="control-row">
        <div class="control-group">
          <label class="control-label">Mode</label>
          <select v-model="currentMode" class="mode-select">
            <option v-for="m in modes" :key="m.value" :value="m.value">
              {{ m.label }}
            </option>
          </select>
        </div>
        <div class="control-actions">
          <button class="btn btn-reset" @click="reset">重置</button>
          <button class="btn btn-next" @click="nextImage">下一张</button>
        </div>
      </div>
      <div class="control-row">
        <div class="duration-group">
          <label class="control-label">背景加载</label>
          <input
            v-model.number="customBgDelay"
            type="range"
            min="100"
            max="3000"
            step="100"
            class="duration-slider"
          />
          <span class="duration-value">{{ customBgDelay }}ms</span>
        </div>
        <div class="duration-group">
          <label class="control-label">前景加载</label>
          <input
            v-model.number="customFgDelay"
            type="range"
            min="100"
            max="3000"
            step="100"
            class="duration-slider"
          />
          <span class="duration-value">{{ customFgDelay }}ms</span>
        </div>
      </div>
    </div>

    <!-- 预览区域 -->
    <div class="demo-preview">
      <div class="preview-container">
        <!-- 纯白底色（空状态） -->
        <div class="layer white-bg" />
        <!-- Background Layer（浅蓝 = previewUrl） -->
        <div
          class="layer background-layer"
          :style="backgroundStyle"
        >
          <span v-if="bgVisible" class="layer-text bg-text">preview-{{ bgDisplayIndex }}</span>
        </div>
        <!-- Backdrop Blur -->
        <div class="layer backdrop-blur" />
        <!-- Foreground Layer（浅绿 = imageUrl） -->
        <div
          v-if="fgVisible"
          class="layer foreground-layer"
          :style="foregroundStyle"
        >
          <span class="layer-text fg-text">image-{{ fgDisplayIndex }}</span>
        </div>
      </div>
      <div class="mode-badge">{{ currentMode }}</div>
    </div>

    <!-- 时间线 -->
    <div class="demo-timeline">
      <div class="timeline-header">加载时序</div>
      <div class="timeline-body">
        <div class="timeline-row">
          <span class="timeline-label">Background</span>
          <div class="timeline-bar-track">
            <div
              class="timeline-bar bg-bar"
              :style="{
                marginLeft: bgTimelineLeft,
                width: bgTimelineWidth,
              }"
            />
          </div>
          <span class="timeline-time">{{ bgTimeLabel }}</span>
        </div>
        <div class="timeline-row">
          <span class="timeline-label">Foreground</span>
          <div class="timeline-bar-track">
            <div
              class="timeline-bar fg-bar"
              :style="{
                marginLeft: fgTimelineLeft,
                width: fgTimelineWidth,
              }"
            />
          </div>
          <span class="timeline-time">{{ fgTimeLabel }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

type Mode = 'imageOnly' | 'imageAsync' | 'allAsync' | 'previewAsync' | 'allSync'

interface ModeOption {
  label: string
  value: Mode
}

const BG_COLOR = '#a8d8ea' // 浅蓝 = previewUrl
const FG_COLOR = '#a8e6cf' // 浅绿 = imageUrl

const modes: ModeOption[] = [
  { label: 'imageOnly — 同步加载，无预览', value: 'imageOnly' },
  { label: 'imageAsync — 异步加载，无预览', value: 'imageAsync' },
  { label: 'allAsync — 异步分离加载', value: 'allAsync' },
  { label: 'previewAsync — 预览优先（默认）', value: 'previewAsync' },
  { label: 'allSync — 同步加载，带预览', value: 'allSync' },
]

// ─── 状态 ───────────────────────────────────────────────
const currentMode = ref<Mode>('previewAsync')
const customBgDelay = ref(800)
const customFgDelay = ref(1200)
const imageIndex = ref(0) // 目标图片索引
const bgDisplayIndex = ref(0) // 背景层实际显示的图片索引
const fgDisplayIndex = ref(0) // 前景层实际显示的图片索引

// Background layer
const bgVisible = ref(false)
const bgProgress = ref(0) // 0-1，clip-path 渐进
const bgInstant = ref(false) // true = 完整弹出，无渐进

// Foreground layer
const fgVisible = ref(false)
const fgProgress = ref(0)
const fgInstant = ref(false)

// 定时器 / 动画帧
const timers: ReturnType<typeof setTimeout>[] = []
const rafs: number[] = []

// ─── 清理 ───────────────────────────────────────────────
function clearAll() {
  timers.forEach(id => clearTimeout(id))
  rafs.forEach(id => cancelAnimationFrame(id))
  timers.length = 0
  rafs.length = 0
}

function pushTimer(fn: () => void, ms: number) {
  timers.push(setTimeout(fn, ms))
}

function pushRaf(fn: FrameRequestCallback) {
  rafs.push(requestAnimationFrame(fn))
}

// ─── 状态重置 ───────────────────────────────────────────
function resetState() {
  bgVisible.value = false
  bgProgress.value = 0
  bgInstant.value = false
  bgDisplayIndex.value = imageIndex.value
  fgVisible.value = false
  fgProgress.value = 0
  fgInstant.value = false
  fgDisplayIndex.value = imageIndex.value
}

// ─── 动画辅助 ───────────────────────────────────────────

/** 渐进式加载（从上到下，模拟浏览器自然加载） */
function startProgressive(layer: 'bg' | 'fg', duration: number, fromProgress = 0) {
  if (layer === 'bg') {
    bgInstant.value = false
    bgVisible.value = true
    bgProgress.value = fromProgress
    bgDisplayIndex.value = imageIndex.value
  } else {
    fgInstant.value = false
    fgVisible.value = true
    fgProgress.value = fromProgress
    fgDisplayIndex.value = imageIndex.value
  }

  const start = performance.now()
  const remaining = (1 - fromProgress) * duration
  const tick = () => {
    const elapsed = performance.now() - start
    const p = Math.min(fromProgress + (elapsed / remaining) * (1 - fromProgress), 1)
    if (layer === 'bg') bgProgress.value = p
    else fgProgress.value = p
    if (p < 1) pushRaf(tick)
  }
  pushRaf(tick)
}

/** 从指定进度开始渐进式加载（用于 previewAsync 中 fg 已加载一段时间的场景） */
function startProgressiveFrom(layer: 'bg' | 'fg', duration: number, fromProgress: number) {
  startProgressive(layer, duration, fromProgress)
}

/** 完整弹出（无渐进，图片异步加载完成后直接展示完整图片） */
function showInstant(layer: 'bg' | 'fg') {
  if (layer === 'bg') {
    bgInstant.value = true
    bgVisible.value = true
    bgDisplayIndex.value = imageIndex.value
  } else {
    fgInstant.value = true
    fgVisible.value = true
    fgDisplayIndex.value = imageIndex.value
  }
}

// ─── 模式执行 ───────────────────────────────────────────

function executeMode(reset = false) {
  clearAll()

  const mode = currentMode.value
  const bgDelay = customBgDelay.value
  const fgDelay = customFgDelay.value

  // allAsync：切换时保留上一张图片，重置时从白屏开始
  if (mode === 'allAsync') {
    if (!reset) {
      pushTimer(() => showInstant('bg'), bgDelay)
      pushTimer(() => showInstant('fg'), fgDelay)
      return
    }
    // 重置：先清空，再异步加载
    resetState()
    pushTimer(() => showInstant('bg'), bgDelay)
    pushTimer(() => showInstant('fg'), fgDelay)
    return
  }

  // imageAsync：切换时保留上一张图片，重置时从白屏开始
  if (mode === 'imageAsync') {
    if (!reset) {
      pushTimer(() => {
        showInstant('bg')
        showInstant('fg')
      }, fgDelay)
      return
    }
    // 重置：先清空，再异步加载
    resetState()
    pushTimer(() => {
      showInstant('bg')
      showInstant('fg')
    }, fgDelay)
    return
  }

  // previewAsync：切换时保留上一张图片，重置时从白屏开始
  if (mode === 'previewAsync') {
    if (!reset) {
      pushTimer(() => {
        showInstant('bg')
        const alreadyLoaded = bgDelay / fgDelay
        startProgressiveFrom('fg', fgDelay, Math.min(alreadyLoaded, 0.95))
      }, bgDelay)
      return
    }
    // 重置：先清空，再异步加载
    resetState()
    pushTimer(() => {
      showInstant('bg')
      startProgressive('fg', fgDelay)
    }, bgDelay)
    return
  }

  resetState()

  switch (mode) {
    /**
     * mode 0: imageOnly — 同步加载，无预览
     * 立即设置前台和背景 src 为 imageUrl，等待浏览器自然加载（从上往下）
     */
    case 'imageOnly':
      // bg 和 fg 的 src 都是 imageUrl，同一张图片，加载速度相同
      startProgressive('bg', fgDelay)
      startProgressive('fg', fgDelay)
      break

    /**
     * mode 1: allAsync — 异步加载，无预览
     * 异步加载前台和背景 img，每个 onload 成功后直接展示完整图片
     * 没有从上往下的加载过程
     */
    case 'allAsync':
      pushTimer(() => showInstant('bg'), bgDelay)
      pushTimer(() => showInstant('fg'), fgDelay)
      break

    /**
     * mode 2: previewAsync — 预览优先（默认）
     * 同时异步加载背景和前台 img
     * 等待背景 img 加载完成后，再刷新背景和前台的 src 为对应 src
     * 无论前台 img 是否加载成功
     */
    case 'previewAsync':
      pushTimer(() => {
        // 背景异步加载完成 → 刷新两个层
        bgVisible.value = false
        fgVisible.value = false
        bgProgress.value = 0
        fgProgress.value = 0
        pushTimer(() => {
          // 背景直接展示（异步加载已完成，完整弹出），前台渐进加载
          showInstant('bg')
          startProgressive('fg', fgDelay)
        }, 30) // 短暂闪烁模拟 img.src 刷新
      }, bgDelay)
      break

    /**
     * mode 3: allSync — 同步加载，带预览
     * 立即设置背景 src 为 previewUrl（浏览器自然加载）
     * 清空前台，异步加载 imageUrl
     * 等待背景 onLoad 成功后，无论 imageUrl 是否加载成功，立即设置前台 src 为 imageUrl
     */
    case 'allSync':
      startProgressive('bg', bgDelay)
      pushTimer(() => {
        // 背景 onLoad → 设置前台 src
        startProgressive('fg', Math.max(fgDelay - bgDelay, 300))
      }, bgDelay)
      break
  }
}

// ─── 样式 ───────────────────────────────────────────────

/** imageOnly / imageAsync 模式下，bg 的 src 也是 imageUrl，不用 previewUrl 的浅蓝 */
const bgIsImageOnly = computed(() =>
  currentMode.value === 'imageOnly' || currentMode.value === 'imageAsync',
)

const backgroundStyle = computed(() => {
  if (!bgVisible.value) return { opacity: 0 }
  const color = bgIsImageOnly.value ? FG_COLOR : BG_COLOR
  if (bgInstant.value) return { background: color, opacity: 1 }
  return {
    background: color,
    clipPath: `inset(0 0 ${(1 - bgProgress.value) * 100}% 0)`,
    opacity: 1,
  }
})

const foregroundStyle = computed(() => {
  if (!fgInstant.value) return {
    background: FG_COLOR,
    clipPath: `inset(0 0 ${(1 - fgProgress.value) * 100}% 0)`,
    opacity: fgVisible.value ? 1 : 0,
  }
  return { background: FG_COLOR, opacity: 1 }
})

// ─── 时间线 ─────────────────────────────────────────────

interface TimelineInfo {
  startMs: number
  endMs: number
}

const bgTimelineInfo = computed<TimelineInfo>(() => {
  const bgDelay = customBgDelay.value
  const fgDelay = customFgDelay.value
  switch (currentMode.value) {
    case 'imageOnly':
      return { startMs: 0, endMs: fgDelay }
    case 'allAsync':
      return { startMs: 0, endMs: bgDelay }
    case 'previewAsync':
      return { startMs: bgDelay, endMs: bgDelay }
    case 'allSync':
      return { startMs: 0, endMs: bgDelay }
    case 'imageAsync':
      return { startMs: fgDelay, endMs: fgDelay }
    default:
      return { startMs: 0, endMs: bgDelay }
  }
})

const fgTimelineInfo = computed<TimelineInfo>(() => {
  const bgDelay = customBgDelay.value
  const fgDelay = customFgDelay.value
  switch (currentMode.value) {
    case 'imageOnly':
      return { startMs: 0, endMs: fgDelay }
    case 'allAsync':
      return { startMs: 0, endMs: fgDelay }
    case 'previewAsync':
      return { startMs: bgDelay, endMs: bgDelay + fgDelay }
    case 'allSync':
      return { startMs: bgDelay, endMs: bgDelay + Math.max(fgDelay - bgDelay, 300) }
    case 'imageAsync':
      return { startMs: fgDelay, endMs: fgDelay }
    default:
      return { startMs: 0, endMs: fgDelay }
  }
})

const maxTimelineMs = computed(() => {
  return Math.max(
    bgTimelineInfo.value.endMs,
    fgTimelineInfo.value.endMs,
    100,
  )
})

function msToPercent(ms: number): string {
  return `${(ms / maxTimelineMs.value) * 100}%`
}

const bgTimelineLeft = computed(() => msToPercent(bgTimelineInfo.value.startMs))
const bgTimelineWidth = computed(() => {
  const info = bgTimelineInfo.value
  const w = info.endMs - info.startMs
  return w <= 0 ? '2px' : msToPercent(w)
})
const fgTimelineLeft = computed(() => msToPercent(fgTimelineInfo.value.startMs))
const fgTimelineWidth = computed(() => {
  const info = fgTimelineInfo.value
  const w = info.endMs - info.startMs
  return w <= 0 ? '2px' : msToPercent(w)
})
const bgTimeLabel = computed(() => {
  const info = bgTimelineInfo.value
  if (info.startMs === info.endMs) return `${info.endMs}ms`
  return `${info.startMs}→${info.endMs}ms`
})
const fgTimeLabel = computed(() => {
  const info = fgTimelineInfo.value
  if (info.startMs === info.endMs) return `${info.endMs}ms`
  return `${info.startMs}→${info.endMs}ms`
})

// ─── 操作 ───────────────────────────────────────────────

/** 重置：清空所有图像，重新加载 preview-0 / image-0 */
function reset() {
  imageIndex.value = 0
  executeMode(true)
}

/** 下一张：保留当前状态，切换到下一张 preview-{id} / image-{id} */
function nextImage() {
  imageIndex.value = (imageIndex.value + 1) % 5
  executeMode()
}

// 初始执行
executeMode()

onUnmounted(() => {
  clearAll()
})
</script>

<style scoped>
.imagehero-mode-demo {
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  overflow: hidden;
  margin: 16px 0;
}

/* ── 控制栏 ── */
.demo-controls {
  padding: 12px 16px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-border);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  white-space: nowrap;
}

.mode-select {
  padding: 5px 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
  cursor: pointer;
  min-width: 220px;
}

.control-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  padding: 5px 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn:hover {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand-1);
}

.btn-reset { background: var(--vp-c-default-soft); }
.btn-next { background: var(--vp-c-brand-soft); border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); }
.btn-switch { background: rgba(34,197,94,.1); border-color: #22c55e; color: #16a34a; }

/* ── 加载时长滑块 ── */
.duration-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.duration-slider {
  width: 120px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--vp-c-border);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.duration-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  cursor: pointer;
  border: 2px solid var(--vp-c-bg);
  box-shadow: 0 1px 3px rgba(0,0,0,.2);
}

.duration-slider::-moz-range-thumb {
  width: 14px; height: 14px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  cursor: pointer;
  border: 2px solid var(--vp-c-bg);
  box-shadow: 0 1px 3px rgba(0,0,0,.2);
}

.duration-value {
  font-size: 12px;
  font-family: monospace;
  color: var(--vp-c-text-2);
  min-width: 48px;
  text-align: right;
}

/* ── 预览区域 ── */
.demo-preview {
  position: relative;
  width: 100%;
  height: 300px;
  overflow: hidden;
}

.preview-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.layer {
  position: absolute;
  inset: 0;
}

.white-bg { background: #ffffff; }

.background-layer {
  will-change: clip-path, opacity;
}

.backdrop-blur {
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.foreground-layer {
  box-shadow: 0 4px 20px rgba(0,0,0,.15);
  will-change: clip-path, opacity;
}

.layer-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 28px;
  font-weight: 700;
  font-family: monospace;
  white-space: nowrap;
  pointer-events: none;
}

.bg-text { color: rgba(0, 80, 120, 0.7); }
.fg-text { color: rgba(0, 100, 60, 0.7); }

.mode-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  background: rgba(0,0,0,.5);
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  backdrop-filter: blur(4px);
}

/* ── 时间线 ── */
.demo-timeline {
  padding: 12px 16px;
  background: var(--vp-c-bg-soft);
  border-top: 1px solid var(--vp-c-border);
}

.timeline-header {
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: .5px;
}

.timeline-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timeline-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.timeline-label {
  width: 80px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  text-align: right;
}

.timeline-bar-track {
  flex: 1;
  height: 18px;
  background: var(--vp-c-bg);
  border-radius: 4px;
  overflow: hidden;
}

.timeline-bar {
  height: 100%;
  border-radius: 4px;
  transition: margin-left .3s ease, width .3s ease;
}

.bg-bar { background: #a8d8ea; }
.fg-bar { background: #a8e6cf; }

.timeline-time {
  width: 80px;
  font-size: 11px;
  color: var(--vp-c-text-2);
  font-family: monospace;
}
</style>
