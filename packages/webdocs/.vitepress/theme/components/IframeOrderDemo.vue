<script setup>
import { ref, nextTick } from 'vue'

// iframe 内部源码：挂载 1s 后从 0 开始，每 0.1s +1
function makeIframeSrc(label) {
  const s = 'scr' + 'ipt'
  const raw = '<!DOCTYPE html><html><head><'
    + 'style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font:16px monospace;background:#1a1a2e;color:#eee}</'
    + 'style></head><body><div id="root"></div><'
    + s + '>'
    + 'let n=0;setTimeout(()=>{setInterval(()=>{n++;document.getElementById("root").textContent="' + label + ': "+n},100)},1000)'
    + '</' + s + '></body></html>'
  return 'data:text/html;base64,' + btoa(raw)
}

const srcA = makeIframeSrc('A')
const srcB = makeIframeSrc('B')

// ── 1. z-index：DOM 不变，只改 z-index ──
const zIndexFrames = ref([
  { id: 'a', src: srcA, zIndex: 1 },
  { id: 'b', src: srcB, zIndex: 2 },
])

function swapZIndex() {
  const a = zIndexFrames.value[0], b = zIndexFrames.value[1]
  const t = a.zIndex; a.zIndex = b.zIndex; b.zIndex = t
}

// ── 2. 无 key：Vue 按位置复用 DOM 节点 ──
const noKeyOrder = ref([srcA, srcB])

function swapNoKey() {
  const t = noKeyOrder.value[0]
  noKeyOrder.value[0] = noKeyOrder.value[1]
  noKeyOrder.value[1] = t
}

// ── 3. 纯 JS：直接操作 DOM 节点顺序 ──
const jsContainer = ref(null)
const jsOrder = ref([srcA, srcB])

function swapJsDom() {
  const container = jsContainer.value
  if (!container || container.children.length < 2) return
  // insertBefore 将第一个子节点移到第二个之后
  container.insertBefore(container.children[0], null)
  // 交换 label 显示
  const t = jsOrder.value[0]
  jsOrder.value[0] = jsOrder.value[1]
  jsOrder.value[1] = t
}

// ── 4. 有 key：Vue 重建 DOM 节点 → 触发重载 ──
const withKeyFrames = ref([
  { id: 'a', src: srcA },
  { id: 'b', src: srcB },
])
const withKeyOrder = ref([0, 1])

function swapWithKey() {
  const t = withKeyOrder.value[0]
  withKeyOrder.value[0] = withKeyOrder.value[1]
  withKeyOrder.value[1] = t
}

</script>

<template>
  <div style="display:flex; flex-direction:column; gap:12px; margin:16px 0;">
    <div style="display:flex; justify-content:center; gap:8px;">
      <button @click="swapZIndex"
        style="padding:6px 16px; border-radius:4px; border:1px solid var(--vp-c-brand); background:var(--vp-c-brand); color:#fff; cursor:pointer; font-size:13px;">
        交换 z-index
      </button>
      <button @click="swapNoKey"
        style="padding:6px 16px; border-radius:4px; border:1px solid var(--vp-c-brand); background:var(--vp-c-brand); color:#fff; cursor:pointer; font-size:13px;">
        交换（无 key）
      </button>
      <button @click="swapJsDom"
        style="padding:6px 16px; border-radius:4px; border:1px solid var(--vp-c-brand); background:var(--vp-c-brand); color:#fff; cursor:pointer; font-size:13px;">
        交换（纯 JS）
      </button>
      <button @click="swapWithKey"
        style="padding:6px 16px; border-radius:4px; border:1px solid var(--vp-c-brand); background:var(--vp-c-brand); color:#fff; cursor:pointer; font-size:13px;">
        交换（有 key）
      </button>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">

      <!-- 1. z-index -->
      <div style="border:1px solid var(--vp-c-border); border-radius:8px; padding:10px;">
        <h4 style="margin:0 0 6px; font-size:13px; color:var(--vp-c-brand);">① z-index（不重载）</h4>
        <div style="display:flex; flex-direction:column; gap:6px;">
          <div v-for="f in zIndexFrames" :key="f.id" style="position:relative; height:44px;">
            <div
              style="position:absolute; left:4px; top:2px; font-size:10px; color:var(--vp-c-text-2); z-index:1; pointer-events:none;">
              z-index: {{ f.zIndex }}
            </div>
            <iframe :src="f.src"
              :style="{ width: '100%', height: '100%', border: '2px solid #4fc3f7', borderRadius: '4px', zIndex: f.zIndex }" />
          </div>
        </div>
      </div>

      <!-- 2. 无 key -->
      <div style="border:1px solid var(--vp-c-border); border-radius:8px; padding:10px;">
        <h4 style="margin:0 0 6px; font-size:13px; color:var(--vp-c-brand);">② 无 key（不重载）</h4>
        <div style="display:flex; flex-direction:column; gap:6px;">
          <div v-for="(src, idx) in noKeyOrder" style="position:relative; height:44px;">
            <div
              style="position:absolute; left:4px; top:2px; font-size:10px; color:var(--vp-c-text-2); z-index:1; pointer-events:none;">
              order: {{ idx }}
            </div>
            <iframe :src="src" style="width:100%; height:100%; border:2px solid #81c784; border-radius:4px;" />
          </div>
        </div>
      </div>

      <!-- 3. 纯 JS -->
      <div style="border:1px solid var(--vp-c-border); border-radius:8px; padding:10px;">
        <h4 style="margin:0 0 6px; font-size:13px; color:var(--vp-c-brand);">③ 纯 JS DOM（不重载）</h4>
        <div ref="jsContainer" style="display:flex; flex-direction:column; gap:6px;">
          <div v-for="(src, idx) in jsOrder" :key="'js-' + idx" style="position:relative; height:44px;">
            <div
              style="position:absolute; left:4px; top:2px; font-size:10px; color:var(--vp-c-text-2); z-index:1; pointer-events:none;">
              order: {{ idx }}
            </div>
            <iframe :src="src" style="width:100%; height:100%; border:2px solid #ce93d8; border-radius:4px;" />
          </div>
        </div>
      </div>

      <!-- 4. 有 key -->
      <div style="border:1px solid var(--vp-c-border); border-radius:8px; padding:10px;">
        <h4 style="margin:0 0 6px; font-size:13px; color:var(--vp-c-brand);">④ 有 key（会重载）</h4>
        <div style="display:flex; flex-direction:column; gap:6px;">
          <div v-for="(f, pos) in withKeyOrder" :key="withKeyFrames[f].id" style="position:relative; height:44px;">
            <div
              style="position:absolute; left:4px; top:2px; font-size:10px; color:var(--vp-c-text-2); z-index:1; pointer-events:none;">
              order: {{ pos }}
            </div>
            <iframe :src="withKeyFrames[f].src"
              style="width:100%; height:100%; border:2px solid #ef9a9a; border-radius:4px;" />
          </div>
        </div>
      </div>

    </div>

    <p style="font-size:12px; color:var(--vp-c-text-2); text-align:center; margin:2px 0 0;">
      ① 完全不重载；②③ 完全重载（计数器归零）；④ 部分重载（仅被移动的 iframe 归零）。
    </p>
  </div>
</template>
