/**
 * 图片混淆算法 v5（Hilbert 曲线 + 填充边界）
 *
 * 将图像填充到 128 的整数倍后，对所有块做 Hilbert 置换。
 * 输出时裁剪回原始尺寸。
 *
 * 特性：
 * - 所有像素都被混淆（包括边缘）
 * - 精确对合：混淆两次 = 还原原图
 * - 色彩保留：块平均色彩不变
 * - 无标记像素：混淆图完全干净
 */

const BLOCK_SIZE = 128;

// ============================================================
// Hilbert 曲线（Skilling 算法）
// ============================================================

function rot(
  n: number, x: number, y: number, rx: number, ry: number,
): [number, number] {
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

// ============================================================
// 伪随机数生成器
// ============================================================

function createRng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

// ============================================================
// 对合排列
// ============================================================

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

// ============================================================
// 种子计算
// ============================================================

function computeSeed(width: number, height: number): number {
  return width * 114514 + height * 1919810;
}

// ============================================================
// 填充/裁剪辅助函数
// ============================================================

function padImage(data: Uint8ClampedArray, width: number, height: number): {
  paddedData: Uint8ClampedArray;
  paddedWidth: number;
  paddedHeight: number;
} {
  const paddedWidth = Math.ceil(width / BLOCK_SIZE) * BLOCK_SIZE;
  const paddedHeight = Math.ceil(height / BLOCK_SIZE) * BLOCK_SIZE;

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

// ============================================================
// 核心混淆函数
// ============================================================

function obfuscatePadded(
  data: Uint8ClampedArray, width: number, height: number,
  origWidth: number, origHeight: number,
): Uint8ClampedArray {
  const cols = Math.ceil(width / BLOCK_SIZE);
  const rows = Math.ceil(height / BLOCK_SIZE);
  const newData = new Uint8ClampedArray(data.length);

  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const blockW = Math.min(BLOCK_SIZE, origWidth - bx * BLOCK_SIZE);
      const blockH = Math.min(BLOCK_SIZE, origHeight - by * BLOCK_SIZE);
      if (blockW <= 0 || blockH <= 0) continue;

      // 收集块内有效 Hilbert 位置
      const blockN = BLOCK_SIZE;
      const validPositions: number[] = [];
      for (let py = 0; py < blockH; py++) {
        for (let px = 0; px < blockW; px++) {
          validPositions.push(hilbertXY2d(blockN, px, py));
        }
      }

      // 生成对合排列
      const seed = computeSeed(origWidth, origHeight);
      const blockRng = createRng(seed + bx * 7 + by * 13);
      const perm = generateInvolutivePermutation(validPositions.length, blockRng);

      // 应用置换
      for (let i = 0; i < validPositions.length; i++) {
        const srcD = validPositions[i];
        const dstD = validPositions[perm[i]];

        const [px, py] = hilbertD2xy(blockN, srcD);
        const [dpx, dpy] = hilbertD2xy(blockN, dstD);

        const srcIdx = ((by * BLOCK_SIZE + py) * width + bx * BLOCK_SIZE + px) * 4;
        const dstIdx = ((by * BLOCK_SIZE + dpy) * width + bx * BLOCK_SIZE + dpx) * 4;

        newData[dstIdx] = data[srcIdx];
        newData[dstIdx + 1] = data[srcIdx + 1];
        newData[dstIdx + 2] = data[srcIdx + 2];
        newData[dstIdx + 3] = data[srcIdx + 3];
      }
    }
  }

  return newData;
}

// ============================================================
// 公开 API
// ============================================================

/**
 * 对图像执行混淆操作
 * 1. 填充到 128 整数倍
 * 2. 对所有块做 Hilbert 置换
 * 3. 裁剪回原始尺寸
 */
export function obfuscateImage(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;

  const { paddedData, paddedWidth, paddedHeight } = padImage(
    new Uint8ClampedArray(data), width, height,
  );

  const obfuscated = obfuscatePadded(paddedData, paddedWidth, paddedHeight, width, height);

  const cropped = cropImage(obfuscated, paddedWidth, paddedHeight, width, height);

  return new ImageData(cropped as ImageDataArray, width, height);
}
