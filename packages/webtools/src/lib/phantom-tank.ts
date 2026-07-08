/**
 * 幻影坦克（Phantom Tank）图片叠加算法
 *
 * 注意：核心算法已移至 Worker 实现（workers/phantom-tank.worker.ts），
 * 此文件保留接口定义供类型使用。
 *
 * 标准浏览器 Alpha 合成：
 *   白底: R = P × α + 255 × (1 - α) = A
 *   黑底: R = P × α               = B
 *
 *   → α = 1 - (A - B) / 255   (需 A ≥ B)
 *   → P = B / α = 255B / (255 - A + B)
 */

export interface PhantomTankOptions {
    imageDataA: ImageData;
    imageDataB: ImageData;
}

export interface PhantomTankResult {
    imageData: ImageData;
}
