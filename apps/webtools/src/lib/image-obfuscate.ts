/**
 * 图片混淆算法 v6（Hilbert 曲线 + 动态区块大小 + 填充边界）
 *
 * 根据图片尺寸动态选择区块大小，使长边约有 10 个区块。
 * 将图像填充到区块大小的整数倍后，对所有块做 Hilbert 置换。
 * 输出时裁剪回原始尺寸。
 *
 * 特性：
 * - 所有像素都被混淆（包括边缘）
 * - 精确对合：混淆两次 = 还原原图
 * - 色彩保留：块平均色彩不变
 * - 无标记像素：混淆图完全干净
 * - 动态区块：大图使用更大区块避免细密马赛克
 */

const MIN_BLOCK_SIZE = 16;
const MAX_BLOCK_SIZE = 256;

/**
 * 根据图片尺寸动态计算区块边长（2 的幂）。
 * 目标：长边约有 10 个区块，即 blockSize ≈ max(w, h) / 10。
 * Hilbert 曲线要求边长为 2 的幂，因此向下取到最近的 2 的幂。
 */
function computeBlockSize(width: number, height: number): number {
  const maxDim = Math.max(width, height);
  let size = Math.max(1, Math.floor(maxDim / 10));

  // 向下取到最近的 2 的幂
  let power = 1;
  while (power * 2 <= size) {
    power *= 2;
  }

  // 钳制到合理范围
  return Math.max(MIN_BLOCK_SIZE, Math.min(MAX_BLOCK_SIZE, power));
}


// ============================================================
// 公开 API
// ============================================================

/**
 * 获取图像混淆时的区块信息（不含实际处理）
 */
export function getObfuscateBlockInfo(width: number, height: number): {
  blockSize: number;
  cols: number;
  rows: number;
} {
  const blockSize = computeBlockSize(width, height);
  return {
    blockSize,
    cols: Math.ceil(width / blockSize),
    rows: Math.ceil(height / blockSize),
  };
}
