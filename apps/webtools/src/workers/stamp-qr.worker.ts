import QRCode from 'qrcode';
import { createStampSolver } from '../lib/stamp-solver';
import { KINDS, planLayout, renderStamp, validateOptions, type StampOptions, type StampResult } from '../lib/stamp-qr';

self.onmessage = async (event: MessageEvent<{ payload: StampOptions }>) => {
    try {
        const o = event.data.payload;
        validateOptions(o);
        const qr = QRCode.create([{ data: new TextEncoder().encode(o.text), mode: 'byte' }], { errorCorrectionLevel: 'H' });
        const scope = self as typeof self & { importScripts(...urls: string[]): void; Module: typeof import('highs').default };
        scope.importScripts(new URL('/stamp-qr/highs.js', self.location.origin).href);
        const solver = createStampSolver(await scope.Module({ locateFile: () => new URL('/stamp-qr/highs.wasm', self.location.origin).href }));
        const n = qr.modules.size;
        const matrix = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => !!qr.modules.get(r, c)));
        const shapes = await planLayout(matrix, o.xMode, solver, v => self.postMessage({ type: 'progress', message: `正在排列结构：${Math.round(v * 100)}%` }));
        const canvas = renderStamp(matrix, shapes, o);
        const result: StampResult = {
            blob: await canvas.convertToBlob({ type: 'image/png' }), modules: n, version: qr.version,
            mask: qr.maskPattern ?? 0, pixels: canvas.width,
            counts: Object.fromEntries(KINDS.map(k => [k, shapes.filter(s => s.kind === k).length])) as StampResult['counts'], options: o,
        };
        self.postMessage({ type: 'done', payload: result });
    } catch (error) {
        self.postMessage({ type: 'error', message: error instanceof Error ? error.message : '生成失败，请重试。' });
    }
};
