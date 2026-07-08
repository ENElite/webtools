/**
 * 幻影坦克 Web Worker
 *
 * 在独立线程中执行灰度转换、色阶调整、幻影坦克生成，支持进度汇报。
 */

// ── 工具函数（从 lib/phantom-tank.ts 内联）──────────────

function toGrayscale(src: ImageData): ImageData {
    const { width, height, data } = src;
    const out = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i += 4) {
        const g = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        out[i] = out[i + 1] = out[i + 2] = g;
        out[i + 3] = data[i + 3];
    }
    return new ImageData(out, width, height);
}

function autoAdjustLevels(
    imageDataA: ImageData,
    imageDataB: ImageData,
): { adjustedA: ImageData; adjustedB: ImageData } {
    const { width, height } = imageDataA;
    const n = width * height;

    const findRange = (data: Uint8ClampedArray): [number, number] => {
        const hist = new Uint32Array(256);
        for (let i = 0; i < data.length; i += 4) hist[data[i]]++;
        let lo = 0, hi = 255, acc = 0;
        for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= n * 0.01) { lo = i; break; } }
        acc = 0;
        for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= n * 0.01) { hi = i; break; } }
        return [lo, hi];
    };

    const [minA, maxA] = findRange(imageDataA.data);
    const [minB, maxB] = findRange(imageDataB.data);

    if (minA >= maxB) {
        return { adjustedA: imageDataA, adjustedB: imageDataB };
    }

    const rangeA = maxA - minA || 1;
    const rangeB = maxB - minB || 1;
    const split = Math.round((rangeB / (rangeA + rangeB)) * 255);

    const lutA = new Uint8Array(256);
    const lutB = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
        lutA[i] = Math.round(split + ((i - minA) / rangeA) * (255 - split));
        lutB[i] = Math.round(((i - minB) / rangeB) * split);
    }

    const rA = new Uint8ClampedArray(imageDataA.data.length);
    const rB = new Uint8ClampedArray(imageDataB.data.length);
    for (let i = 0; i < rA.length; i += 4) {
        const vA = lutA[imageDataA.data[i]];
        const vB = lutB[imageDataB.data[i]];
        rA[i] = rA[i + 1] = rA[i + 2] = vA; rA[i + 3] = imageDataA.data[i + 3];
        rB[i] = rB[i + 1] = rB[i + 2] = vB; rB[i + 3] = imageDataB.data[i + 3];
    }

    return {
        adjustedA: new ImageData(rA, width, height),
        adjustedB: new ImageData(rB, width, height),
    };
}

function resizeTo(src: ImageData, tw: number, th: number): ImageData {
    // 简单的最近邻缩放（Worker 中不能用 canvas）
    const sc = new Uint8ClampedArray(src.width * src.height * 4);
    sc.set(src.data);
    const s = Math.min(tw / src.width, th / src.height);
    const dw = Math.round(src.width * s);
    const dh = Math.round(src.height * s);
    const offsetX = Math.round((tw - dw) / 2);
    const offsetY = Math.round((th - dh) / 2);
    const out = new Uint8ClampedArray(tw * th * 4); // 全黑
    for (let dy = 0; dy < dh; dy++) {
        for (let dx = 0; dx < dw; dx++) {
            const sx = Math.round(dx / s);
            const sy = Math.round(dy / s);
            const srcIdx = (sy * src.width + sx) * 4;
            const dstIdx = ((offsetY + dy) * tw + (offsetX + dx)) * 4;
            out[dstIdx] = sc[srcIdx];
            out[dstIdx + 1] = sc[srcIdx + 1];
            out[dstIdx + 2] = sc[srcIdx + 2];
            out[dstIdx + 3] = sc[srcIdx + 3];
        }
    }
    return new ImageData(out, tw, th);
}

// ── 幻影坦克核心（支持进度汇报）─────────────────────────

interface PhantomTankPayload {
    imageDataA: { width: number; height: number; data: Uint8ClampedArray };
    imageDataB: { width: number; height: number; data: Uint8ClampedArray };
    useGrayscale: boolean;
}

self.onmessage = (e: MessageEvent<{ type: string; payload: PhantomTankPayload }>) => {
    if (e.data.type !== 'process') return;

    const { imageDataA: rawA, imageDataB: rawB, useGrayscale } = e.data.payload;

    try {
        const postProgress = (p: number) => self.postMessage({ type: 'progress', progress: p });

        postProgress(0);

        const A = new ImageData(new Uint8ClampedArray(rawA.data), rawA.width, rawA.height);
        let B = new ImageData(new Uint8ClampedArray(rawB.data), rawB.width, rawB.height);

        // 缩放 B 到 A 的尺寸
        if (B.width !== A.width || B.height !== A.height) {
            postProgress(0.05);
            B = resizeTo(B, A.width, A.height);
        }

        let fA = A, fB = B;
        if (useGrayscale) {
            postProgress(0.15);
            fA = toGrayscale(A);
            fB = toGrayscale(B);
            postProgress(0.35);
            const adj = autoAdjustLevels(fA, fB);
            fA = adj.adjustedA;
            fB = adj.adjustedB;
        }

        postProgress(0.5);

        // 生成幻影坦克（按行分块汇报进度）
        const { width, height } = fA;
        const dA = fA.data, dB = fB.data;
        const out = new Uint8ClampedArray(width * height * 4);
        const totalPixels = width * height;
        const progressInterval = Math.max(1, Math.floor(totalPixels / 10)); // ~10% 步进

        for (let i = 0, len = dA.length; i < len; i += 4) {
            const aR = dA[i] >= dB[i] ? (255 - dA[i] + dB[i]) / 255 : 1;
            const aG = dA[i + 1] >= dB[i + 1] ? (255 - dA[i + 1] + dB[i + 1]) / 255 : 1;
            const aB = dA[i + 2] >= dB[i + 2] ? (255 - dA[i + 2] + dB[i + 2]) / 255 : 1;
            const α = (aR + aG + aB) / 3;

            if (α > 0) {
                const inv = 1 / α;
                out[i] = Math.min(255, Math.round(dB[i] * inv));
                out[i + 1] = Math.min(255, Math.round(dB[i + 1] * inv));
                out[i + 2] = Math.min(255, Math.round(dB[i + 2] * inv));
            }
            out[i + 3] = Math.round(α * 255);

            // 进度汇报
            if ((i / 4) % progressInterval === 0) {
                postProgress(0.5 + 0.5 * (i / 4) / totalPixels);
            }
        }

        postProgress(1.0);

        self.postMessage({
            type: 'done',
            payload: {
                imageData: { width, height, data: out },
            },
        });
    } catch (err) {
        self.postMessage({
            type: 'error',
            message: err instanceof Error ? err.message : String(err),
        });
    }
};
