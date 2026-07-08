/**
 * 图片混淆算法测试
 *
 * 注意：核心混淆算法已移至 Worker 实现（workers/obfuscate.worker.ts），
 * 此测试仅验证区块大小计算等辅助功能。
 */
import { describe, it, expect } from 'vitest';
import { getObfuscateBlockInfo } from '../../../webtools/src/lib/image-obfuscate';

// ── 区块大小计算测试 ──────────────────────────────────

describe('区块大小计算', () => {
    it('小图使用最小区块', () => {
        const info = getObfuscateBlockInfo(100, 100);
        expect(info.blockSize).toBeGreaterThanOrEqual(16);
        expect(info.blockSize).toBeLessThanOrEqual(256);
    });

    it('大图使用更大区块', () => {
        const small = getObfuscateBlockInfo(500, 500);
        const large = getObfuscateBlockInfo(5000, 5000);
        expect(large.blockSize).toBeGreaterThanOrEqual(small.blockSize);
    });

    it('区块大小应为 2 的幂', () => {
        const info = getObfuscateBlockInfo(4000, 3000);
        expect(info.blockSize & (info.blockSize - 1)).toBe(0);
    });

    it('区块数应覆盖整个图像', () => {
        const info = getObfuscateBlockInfo(4000, 3000);
        expect(info.cols * info.blockSize).toBeGreaterThanOrEqual(4000);
        expect(info.rows * info.blockSize).toBeGreaterThanOrEqual(3000);
    });
});
