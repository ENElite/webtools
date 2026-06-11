<script setup lang="ts">
import { ref, computed } from 'vue'

type Horizontal = 'left' | 'right'
type Vertical = 'top' | 'bottom'
type Position = `${Horizontal}-${Vertical}` | `${Vertical}-${Horizontal}`

const horizontalKeys = ['left', 'right']
const verticalKeys = ['top', 'bottom']

const position = ref<Position>('top-right')
const inside = ref(false)
const padding = ref(15)
const rotation = ref(0)

const widgetW = 200
const widgetH = 120
const containerW = 500
const containerH = 360
const overlayW = 80
const overlayH = 28

const cx = containerW / 2
const cy = containerH / 2

// Widget corners before rotation (relative to center)
const corners = [
    [-widgetW / 2, -widgetH / 2], // pos1: top-left
    [widgetW / 2, -widgetH / 2], // pos2: top-right
    [-widgetW / 2, widgetH / 2], // pos3: bottom-left
    [widgetW / 2, widgetH / 2], // pos4: bottom-right
]

// Rotated corners in container coordinates
const rotatedCorners = computed(() => {
    const rad = (rotation.value * Math.PI) / 180
    const cosA = Math.cos(rad)
    const sinA = Math.sin(rad)
    return corners.map(([dx, dy]) => [
        cx + dx * cosA - dy * sinA,
        cy + dx * sinA + dy * cosA,
    ])
})

// Parse position — mirrors positionUtils.ts logic exactly
const parsed = computed(() => {
    const [p1, p2] = position.value.split('-')
    const hFirst = horizontalKeys.includes(p1)
    const horizontal = (hFirst ? p1 : p2) as Horizontal
    const vertical = (hFirst ? p2 : p1) as Vertical
    return { horizontal, vertical, horizontalFirst: hFirst }
})

const isLeft = computed(() => parsed.value.horizontal === 'left')
const isTop = computed(() => parsed.value.vertical === 'top')

// Corner index: pos1=TL, pos2=TR, pos3=BL, pos4=BR
const cornerIndex = computed(() => {
    if (isTop.value && isLeft.value) return 0
    if (isTop.value && !isLeft.value) return 1
    if (!isTop.value && isLeft.value) return 2
    return 3
})

const cornerPos = computed(() => rotatedCorners.value[cornerIndex.value])

// Offset and translate — exact replica of positionUtils.ts getPositionStyles()
const offsetAndTranslate = computed(() => {
    const hFirst = parsed.value.horizontalFirst
    const il = inside.value
    const pad = padding.value
    const left = isLeft.value
    const top = isTop.value

    let offsetX = 0
    let offsetY = 0
    let translateX = '0%'
    let translateY = '0%'

    if (hFirst) {
        if (il) {
            offsetX = left ? pad : -pad
            offsetY = 0
            translateX = left ? '0%' : '-100%'
            translateY = top ? '0%' : '-100%'
        } else {
            offsetX = left ? -pad : pad
            offsetY = 0
            translateX = left ? '-100%' : '0%'
            translateY = top ? '0%' : '-100%'
        }
    } else {
        if (il) {
            offsetX = 0
            offsetY = top ? pad : -pad
            translateX = left ? '0%' : '-100%'
            translateY = top ? '0%' : '-100%'
        } else {
            offsetX = 0
            offsetY = top ? -pad : pad
            translateX = left ? '0%' : '-100%'
            translateY = top ? '-100%' : '0%'
        }
    }

    return { offsetX, offsetY, translateX, translateY }
})

// Build the EXACT same CSS transform string as positionUtils.ts
const overlayTransform = computed(() => {
    const [cx, cy] = cornerPos.value
    const { offsetX, offsetY, translateX, translateY } = offsetAndTranslate.value
    return `translate(${cx}px, ${cy}px) rotate(${rotation.value}deg) translate(${offsetX}px, ${offsetY}px) translate(${translateX}, ${translateY})`
})

const positionLabel = computed(() => position.value)

const positionOptions: Position[] = [
    'left-top', 'left-bottom', 'right-top', 'right-bottom',
    'top-left', 'top-right', 'bottom-left', 'bottom-right',
]

const widgetTransform = computed(() => `rotate(${rotation.value}deg)`)

const cornerDots = computed(() =>
    rotatedCorners.value.map((c, i) => ({
        x: c[0],
        y: c[1],
        label: ['pos1', 'pos2', 'pos3', 'pos4'][i],
    }))
)

function toggleOrder() {
    const h = parsed.value.horizontal
    const v = parsed.value.vertical
    position.value = `${v}-${h}` as Position
}
</script>

<template>
    <div class="mpd">
        <h3 class="mpd-title">Moveable Position 交互式演示</h3>
        <div class="mpd-layout">
            <!-- 控制面板 -->
            <div class="mpd-panel">
                <div class="mpd-section">
                    <div class="mpd-section-label">Position</div>
                    <div class="mpd-pos-grid">
                        <button v-for="pos in positionOptions" :key="pos"
                            :class="['mpd-btn', 'mpd-btn-sm', { active: position === pos }]" @click="position = pos">{{
                            pos }}</button>
                    </div>
                </div>

                <div class="mpd-section mpd-row">
                    <button class="mpd-btn mpd-swap" @click="toggleOrder">↻ 切换顺序</button>
                    <label class="mpd-checkbox">
                        <input type="checkbox" v-model="inside" />
                        Inside
                    </label>
                </div>

                <div class="mpd-section">
                    <div class="mpd-section-label">Padding: {{ padding }}px</div>
                    <input type="range" v-model.number="padding" min="0" max="50" step="1" class="mpd-slider" />
                </div>

                <div class="mpd-section">
                    <div class="mpd-section-label">Rotation: {{ rotation }}°</div>
                    <input type="range" v-model.number="rotation" min="-180" max="180" step="1" class="mpd-slider" />
                </div>

                <div class="mpd-badge">{{ positionLabel }}</div>

                <div class="mpd-info">
                    <div><strong>顺序:</strong> {{ parsed.horizontalFirst ? '水平优先' : '垂直优先' }}</div>
                    <div><strong>角点:</strong> {{ ['pos1 (TL)', 'pos2 (TR)', 'pos3 (BL)', 'pos4 (BR)'][cornerIndex] }}
                    </div>
                    <div><strong>offset:</strong> ({{ offsetAndTranslate.offsetX }}, {{ offsetAndTranslate.offsetY }})
                    </div>
                    <div><strong>translate:</strong> ({{ offsetAndTranslate.translateX }}, {{
                        offsetAndTranslate.translateY }})</div>
                </div>
            </div>

            <!-- 预览区域 -->
            <div class="mpd-preview-wrap">
                <div class="mpd-preview" :style="{ width: containerW + 'px', height: containerH + 'px' }">
                    <!-- Grid lines -->
                    <div class="mpd-grid-h" :style="{ top: containerH / 2 + 'px' }"></div>
                    <div class="mpd-grid-v" :style="{ left: containerW / 2 + 'px' }"></div>

                    <!-- Widget (rotated) -->
                    <div class="mpd-widget" :style="{
                        width: widgetW + 'px',
                        height: widgetH + 'px',
                        left: (cx - widgetW / 2) + 'px',
                        top: (cy - widgetH / 2) + 'px',
                        transform: widgetTransform,
                    }">
                        <span class="mpd-widget-label">Widget</span>
                        <span class="mpd-widget-rotation">{{ rotation }}°</span>
                    </div>

                    <!-- Corner dots -->
                    <div v-for="(dot, i) in cornerDots" :key="i" class="mpd-corner-dot"
                        :style="{ left: dot.x + 'px', top: dot.y + 'px' }" :title="dot.label">
                        <span class="mpd-corner-label">{{ dot.label }}</span>
                    </div>

                    <!-- Overlay — uses the EXACT same CSS transform chain as positionUtils.ts -->
                    <div class="mpd-overlay" :style="{
                        width: overlayW + 'px',
                        height: overlayH + 'px',
                        transform: overlayTransform,
                    }">
                        <span class="mpd-overlay-label">{{ position }}</span>
                    </div>
                </div>

                <pre class="mpd-code"><code>position: '{{ position }}'
padding: {{ padding }}
inside: {{ inside }}
rotation: {{ rotation }}°

/* CSS transform (from positionUtils.ts) */
transform:
  translate({{ cornerPos[0].toFixed(1) }}px, {{ cornerPos[1].toFixed(1) }}px)
  rotate({{ rotation }}deg)
  translate({{ offsetAndTranslate.offsetX }}px, {{ offsetAndTranslate.offsetY }}px)
  translate({{ offsetAndTranslate.translateX }}, {{ offsetAndTranslate.translateY }})</code></pre>
            </div>
        </div>
    </div>
</template>

<style scoped>
.mpd {
    border: 1px solid var(--vp-c-border);
    border-radius: 8px;
    padding: 20px;
    margin: 16px 0;
    background: var(--vp-c-bg);
}

.mpd-title {
    margin: 0 0 16px;
    font-size: 16px;
    font-weight: 600;
}

.mpd-layout {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
}

.mpd-panel {
    min-width: 240px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.mpd-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.mpd-section-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--vp-c-text-2);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.mpd-row {
    flex-direction: row;
    align-items: center;
    gap: 12px;
}

.mpd-pos-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
}

.mpd-btn {
    padding: 6px 14px;
    border: 1px solid var(--vp-c-border);
    border-radius: 6px;
    background: var(--vp-c-bg-soft);
    color: var(--vp-c-text-1);
    cursor: pointer;
    font-size: 13px;
    transition: all 0.15s;
}

.mpd-btn:hover {
    border-color: var(--vp-c-brand-1);
}

.mpd-btn.active {
    background: var(--vp-c-brand-1);
    color: #fff;
    border-color: var(--vp-c-brand-1);
}

.mpd-btn-sm {
    padding: 4px 6px;
    font-size: 11px;
    font-family: monospace;
}

.mpd-swap {
    font-size: 12px;
    padding: 4px 10px;
}

.mpd-checkbox {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    cursor: pointer;
}

.mpd-slider {
    width: 100%;
    accent-color: var(--vp-c-brand-1);
}

.mpd-badge {
    display: inline-block;
    padding: 6px 14px;
    background: var(--vp-c-brand-soft);
    color: var(--vp-c-brand-1);
    border-radius: 6px;
    font-family: monospace;
    font-size: 14px;
    font-weight: 600;
    text-align: center;
}

.mpd-info {
    font-size: 12px;
    color: var(--vp-c-text-2);
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    background: var(--vp-c-bg-soft);
    border-radius: 6px;
}

.mpd-info strong {
    color: var(--vp-c-text-1);
}

.mpd-preview-wrap {
    flex: 1;
    min-width: 340px;
}

.mpd-preview {
    position: relative;
    border: 2px solid var(--vp-c-border);
    border-radius: 8px;
    background:
        linear-gradient(var(--vp-c-border) 1px, transparent 1px),
        linear-gradient(90deg, var(--vp-c-border) 1px, transparent 1px);
    background-size: 50px 50px;
    overflow: hidden;
}

.mpd-grid-h,
.mpd-grid-v {
    position: absolute;
    background: var(--vp-c-divider);
}

.mpd-grid-h {
    left: 0;
    right: 0;
    height: 1px;
}

.mpd-grid-v {
    top: 0;
    bottom: 0;
    width: 1px;
}

.mpd-widget {
    position: absolute;
    background: var(--vp-c-bg-soft);
    border: 2px solid var(--vp-c-brand-1);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transform-origin: center center;
    z-index: 1;
}

.mpd-widget-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--vp-c-brand-1);
}

.mpd-widget-rotation {
    font-size: 11px;
    color: var(--vp-c-text-3);
}

.mpd-corner-dot {
    position: absolute;
    width: 6px;
    height: 6px;
    background: var(--vp-c-danger);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    z-index: 3;
}

.mpd-corner-label {
    position: absolute;
    top: -16px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 9px;
    color: var(--vp-c-danger);
    font-family: monospace;
    white-space: nowrap;
}

.mpd-overlay {
    position: absolute;
    left: 0;
    top: 0;
    will-change: transform;
    transform-origin: 0px 0px;
    background: var(--vp-c-brand-1);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.mpd-overlay-label {
    color: #fff;
    font-size: 10px;
    font-weight: 600;
    font-family: monospace;
}

.mpd-code {
    margin: 12px 0 0;
    padding: 12px;
    background: var(--vp-c-bg-soft);
    border-radius: 6px;
    font-size: 12px;
    line-height: 1.5;
    overflow-x: auto;
    border: 1px solid var(--vp-c-border);
}
</style>
