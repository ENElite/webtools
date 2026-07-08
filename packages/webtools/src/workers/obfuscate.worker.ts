/**
 * 图片混淆 Web Worker
 *
 * 在独立线程中执行混淆/反混淆计算，支持进度汇报。
 * 主线程不会被阻塞。
 */

// ── 从 lib/image-obfuscate.ts 复制的纯算法 ──────────────
// Worker 中不能 import DOM 相关模块，因此内联算法。

const MIN_BLOCK_SIZE = 16;
const MAX_BLOCK_SIZE = 256;

function computeBlockSize(width: number, height: number): number {
    const maxDim = Math.max(width, height);
    let size = Math.max(1, Math.floor(maxDim / 10));
    let power = 1;
    while (power * 2 <= size) {
        power *= 2;
    }
    return Math.max(MIN_BLOCK_SIZE, Math.min(MAX_BLOCK_SIZE, power));
}

function rot(n: number, x: number, y: number, rx: number, ry: number): [number, number] {
    if (ry === 0) {
        if (rx === 1) {
            x = n - 1 - x;
            y = n - 1 - y;
        }
        const tmp = x;
        x = y;
        y = tmp;
    }
    return [x, y];
}

function hilbertD2xy(n: number, d: number): [number, number] {
    let x = 0;
    let y = 0;
    for (let s = 1; s < n; s *= 2) {
        const rx = 1 & (d >> 1);
        const ry = 1 & (d ^ rx);
        [x, y] = rot(s, x, y, rx, ry);
        x += s * rx;
        y += s * ry;
        d >>= 2;
    }
    return [x, y];
}

function hilbertXY2d(n: number, x: number, y: number): number {
    let d = 0;
    for (let s = n >> 1; s > 0; s >>= 1) {
        const rx = (x & s) > 0 ? 1 : 0;
        const ry = (y & s) > 0 ? 1 : 0;
        d += s * s * ((3 * rx) ^ ry);
        [x, y] = rot(s, x, y, rx, ry);
    }
    return d;
}

function createRng(seed: number) {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) & 0x7fffffff;
        return state / 0x7fffffff;
    };
}

function generateInvolutivePermutation(n: number, rng: () => number): number[] {
    const perm = new Array(n);
    for (let i = 0; i < n; i++) {
        perm[i] = i;
    }
    const available: number[] = [];
    for (let i = 0; i < n; i++) {
        available.push(i);
    }
    for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = available[i];
        available[i] = available[j];
        available[j] = tmp;
    }
    for (let k = 0; k + 1 < available.length; k += 2) {
        const a = available[k];
        const b = available[k + 1];
        perm[a] = b;
        perm[b] = a;
    }
    return perm;
}

function computeSeed(width: number, height: number): number {
    return width * 114514 + height * 1919810;
}

function padImage(data: Uint8ClampedArray, width: number, height: number, blockSize: number) {
    const paddedWidth = Math.ceil(width / blockSize) * blockSize;
    const paddedHeight = Math.ceil(height / blockSize) * blockSize;
    if (paddedWidth === width && paddedHeight === height) {
        return { paddedData: data, paddedWidth: width, paddedHeight: height };
    }
    const paddedData = new Uint8ClampedArray(paddedWidth * paddedHeight * 4);
    for (let y = 0; y < height; y++) {
        const srcRow = y * width * 4;
        const dstRow = y * paddedWidth * 4;
        paddedData.set(data.subarray(srcRow, srcRow + width * 4), dstRow);
    }
    return { paddedData, paddedWidth, paddedHeight };
}

function cropImage(
    data: Uint8ClampedArray, paddedWidth: number, paddedHeight: number,
    originalWidth: number, originalHeight: number,
): Uint8ClampedArray {
    if (paddedWidth === originalWidth && paddedHeight === originalHeight) {
        return data;
    }
    const cropped = new Uint8ClampedArray(originalWidth * originalHeight * 4);
    for (let y = 0; y < originalHeight; y++) {
        const srcRow = y * paddedWidth * 4;
        const dstRow = y * originalWidth * 4;
        cropped.set(data.subarray(srcRow, srcRow + originalWidth * 4), dstRow);
    }
    return cropped;
}

/**
 * 核心混淆函数（支持进度汇报）
 * 每处理若干行块后 postMessage 汇报进度。
 */
function obfuscatePaddedWithProgress(
    data: Uint8ClampedArray, width: number, height: number,
    origWidth: number, origHeight: number, blockSize: number,
    onProgress: (progress: number) => void,
): Uint8ClampedArray {
    const cols = Math.ceil(width / blockSize);
    const rows = Math.ceil(height / blockSize);
    const newData = new Uint8ClampedArray(data.length);
    const totalBlocks = cols * rows;
    const progressInterval = Math.max(1, Math.floor(totalBlocks / 20)); // ~5% 步进

    const seed = computeSeed(origWidth, origHeight);

    for (let by = 0; by < rows; by++) {
        for (let bx = 0; bx < cols; bx++) {
            const blockW = Math.min(blockSize, origWidth - bx * blockSize);
            const blockH = Math.min(blockSize, origHeight - by * blockSize);
            if (blockW <= 0 || blockH <= 0) continue;

            const blockN = blockSize;
            const validPositions: number[] = [];
            for (let py = 0; py < blockH; py++) {
                for (let px = 0; px < blockW; px++) {
                    validPositions.push(hilbertXY2d(blockN, px, py));
                }
            }

            const blockRng = createRng(seed + bx * 7 + by * 13);
            const perm = generateInvolutivePermutation(validPositions.length, blockRng);

            for (let i = 0; i < validPositions.length; i++) {
                const srcD = validPositions[i];
                const dstD = validPositions[perm[i]];

                const [px, py] = hilbertD2xy(blockN, srcD);
                const [dpx, dpy] = hilbertD2xy(blockN, dstD);

                const srcIdx = ((by * blockSize + py) * width + bx * blockSize + px) * 4;
                const dstIdx = ((by * blockSize + dpy) * width + bx * blockSize + dpx) * 4;

                newData[dstIdx] = data[srcIdx];
                newData[dstIdx + 1] = data[srcIdx + 1];
                newData[dstIdx + 2] = data[srcIdx + 2];
                newData[dstIdx + 3] = data[srcIdx + 3];
            }
        }

        // 每行块完成后检查是否需要汇报进度
        const currentBlock = (by + 1) * cols;
        if ((by + 1) % Math.max(1, Math.floor(rows / 20)) === 0 || by === rows - 1) {
            onProgress(Math.min(0.95, currentBlock / totalBlocks));
        }
    }

    return newData;
}

// ── Worker 入口 ─────────────────────────────────────────

interface ObfuscatePayload {
    width: number;
    height: number;
    data: Uint8ClampedArray;
}

self.onmessage = (e: MessageEvent<{ type: string; payload: ObfuscatePayload }>) => {
    if (e.data.type !== 'process') return;

    const { width, height, data } = e.data.payload;

    try {
        const postProgress = (progress: number) => {
            self.postMessage({ type: 'progress', progress });
        };

        postProgress(0);

        const blockSize = computeBlockSize(width, height);

        postProgress(0.05);

        const { paddedData, paddedWidth, paddedHeight } = padImage(
            new Uint8ClampedArray(data), width, height, blockSize,
        );

        postProgress(0.1);

        const obfuscated = obfuscatePaddedWithProgress(
            paddedData, paddedWidth, paddedHeight, width, height, blockSize, (p) => {
                // 将 0.1~0.95 映射到整体进度 0.1~0.95
                postProgress(0.1 + p * 0.85);
            },
        );

        postProgress(0.95);

        const cropped = cropImage(obfuscated, paddedWidth, paddedHeight, width, height);

        postProgress(1.0);

        self.postMessage({
            type: 'done',
            payload: {
                width,
                height,
                data: cropped,
            },
        });
    } catch (err) {
        self.postMessage({
            type: 'error',
            message: err instanceof Error ? err.message : String(err),
        });
    }
};
