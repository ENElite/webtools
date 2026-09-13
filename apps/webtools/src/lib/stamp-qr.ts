import type { LP, Solver } from './stamp-solver';
export type { Solver } from './stamp-solver';

export type FinderStyle = 'dark_all' | 'standard' | 'four_sides';
export type XMode = 'all' | 'small' | 'only3';
export type Kind = 'big_x' | 'vertical' | 'horizontal' | 'small_x' | 'dot';
export type StampColors = [number, number, number, number];
export const COLOR_LABELS = ['更暗色 · 点', '暗色 · 横线', '亮色 · 竖线', '更亮色 · 定位符 / X'];
export const grayHex = (v: number) => `#${v.toString(16).padStart(2, '0').repeat(3)}`;
export function moveColor(colors: StampColors, index: number, value: number): StampColors {
    const next: StampColors = [...colors];
    next[index] = Math.max(index === 0 ? 40 : colors[index - 1] + 1, Math.min(index === 3 ? 255 : colors[index + 1] - 1, Math.round(value)));
    return next;
}
export interface StampOptions {
    text: string;
    finder: FinderStyle;
    finderWidth: 'standard' | 'dot';
    xMode: XMode;
    colors: StampColors;
    moduleSize: number;
}
export const DEFAULT_STAMP_OPTIONS: StampOptions = {
    text: '印花集：你好世界！', finder: 'four_sides', finderWidth: 'standard',
    xMode: 'all', colors: [60, 100, 190, 255], moduleSize: 24,
};
export const KINDS: Kind[] = ['big_x', 'vertical', 'horizontal', 'small_x', 'dot'];
export const KIND_LABELS: Record<Kind, string> = {
    big_x: '大 X', vertical: '竖线', horizontal: '横线', small_x: '小 x', dot: '点',
};
export interface Shape { kind: Kind; cells: number[]; box: number[]; row: number; col: number; size: number }
export interface StampResult {
    blob: Blob; modules: number; version: number; mask: number; pixels: number;
    counts: Record<Kind, number>; options: StampOptions;
}

export function validateOptions(o: StampOptions) {
    if (typeof o.text !== 'string' || !o.text.length) throw new Error('请输入要编码的文字或链接。');
    if (new TextEncoder().encode(o.text).length > 1273) throw new Error('内容超过 H 级二维码的 1273 字节容量，请缩短内容。');
    if (!['dark_all', 'standard', 'four_sides'].includes(o.finder)
        || !['standard', 'dot'].includes(o.finderWidth) || !['all', 'small', 'only3'].includes(o.xMode)) throw new Error('配置项无效。');
    if (!Array.isArray(o.colors) || o.colors.length !== 4 || o.colors.some((v, i) => !Number.isInteger(v) || v < 40 || v > 255 || (i > 0 && v <= o.colors[i - 1]))) throw new Error('四种亮度须为 40–255 的整数，并严格从暗到亮递增。');
    if (!Number.isInteger(o.moduleSize) || o.moduleSize < 12 || o.moduleSize > 48) throw new Error('每格尺寸须为 12–48 的整数。');
}

export function finderCells(n: number) {
    const cells = new Set<number>();
    for (const [r, c] of [[0, 0], [n - 7, 0], [0, n - 7]])
        for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) cells.add((r + y) * n + c + x);
    return cells;
}

export function candidates(matrix: boolean[][], mode: XMode, reserved = finderCells(matrix.length)): Shape[] {
    const n = matrix.length;
    const active = new Set<number>();
    matrix.forEach((row, r) => row.forEach((v, c) => { if (v && !reserved.has(r * n + c)) active.add(r * n + c); }));
    const out: Shape[] = [];
    for (const cell of active) {
        const r = Math.floor(cell / n), c = cell % n;
        for (let size = 2; r + size <= n && c + size <= n; size++) {
            if (!active.has((r + size - 1) * n + c + size - 1)) break;
            if ((mode === 'small' && size !== 2) || (mode === 'only3' && size !== 3)) continue;
            const cells = [...new Set(Array.from({ length: size }, (_, i) => [(r + i) * n + c + i, (r + i) * n + c + size - 1 - i]).flat())];
            const box = Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => (r + y) * n + c + x)).flat();
            if (cells.every(i => active.has(i)) && box.every(i => !reserved.has(i)))
                out.push({ kind: size === 2 ? 'small_x' : 'big_x', cells, box, row: r, col: c, size });
        }
        for (const [dr, dc, min, kind] of [[1, 0, 3, 'vertical'], [0, 1, 2, 'horizontal']] as const) {
            const cells = [cell];
            while (r + dr * cells.length < n && c + dc * cells.length < n && active.has((r + dr * cells.length) * n + c + dc * cells.length)) {
                cells.push((r + dr * cells.length) * n + c + dc * cells.length);
                if (cells.length >= min) out.push({ kind, cells: [...cells], box: kind === 'vertical' ? [...cells] : [], row: r, col: c, size: cells.length });
            }
        }
        out.push({ kind: 'dot', cells: [cell], box: [], row: r, col: c, size: 1 });
    }
    return out;
}

/** Exact set partition, then lexicographic covered-cell maximization, as in stamp_qr.py. */
export async function planLayout(matrix: boolean[][], mode: XMode, solver: Solver, progress = (_v: number) => {}, reserved = finderCells(matrix.length), deadline = Date.now() + 90000) {
    const shapes = candidates(matrix, mode, reserved);
    const coverage = new Map<number, number[]>(), exclusions = new Map<number, number[]>();
    shapes.forEach((s, i) => {
        for (const [map, cells] of [[coverage, s.cells], [exclusions, s.box]] as const)
            for (const cell of cells) { if (!map.has(cell)) map.set(cell, []); map.get(cell)!.push(i); }
    });
    const rows = [...[...coverage.values()].map(ids => ({ ids, exact: true })),
        ...[...exclusions.values()].filter(ids => ids.length > 1).map(ids => ({ ids, exact: false }))];
    const parents = shapes.map((_, i) => i);
    function root(i: number): number { while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i]; } return i; }
    for (const { ids } of rows) for (const id of ids) parents[root(id)] = root(ids[0]);
    const groups = new Map<number, number[]>();
    shapes.forEach((_, i) => { const r = root(i); if (!groups.has(r)) groups.set(r, []); groups.get(r)!.push(i); });
    const groupedRows = new Map<number, typeof rows>();
    for (const row of rows) { const r = root(row.ids[0]); if (!groupedRows.has(r)) groupedRows.set(r, []); groupedRows.get(r)!.push(row); }
    const selected: Shape[] = [];
    let done = 0;
    for (const [r, ids] of groups) {
        if (ids.length === 1) selected.push(shapes[ids[0]]);
        else {
            // Eliminate dot variables: uncovered cells become dots automatically.
            // total = active cells + sum((1 - covered cells) * chosen structure).
            // This equivalent set-packing model is much smaller for dense QR matrices.
            const variables = ids.filter(i => shapes[i].kind !== 'dot');
            const lp: LP = {
                name: 'stamp', binaries: variables.map(i => `x${i}`),
                objective: { name: 'count', direction: solver.MIN, vars: [] },
                subjectTo: groupedRows.get(r)!.map((row, j) => ({
                    name: `c${j}`, vars: row.ids.filter(i => shapes[i].kind !== 'dot').map(i => ({ name: `x${i}`, coef: 1 })),
                    bnds: { type: solver.UP, lb: 0, ub: 1 },
                })),
            };
            let values: Record<string, number> = {};
            for (const kind of ['count', ...KINDS.slice(0, 4)]) {
                const vars = variables.map(i => ({ name: `x${i}`, coef: kind === 'count' ? 1 - shapes[i].cells.length : shapes[i].kind === kind ? -shapes[i].cells.length : 0 })).filter(v => v.coef !== 0);
                if (!vars.length) continue;
                const remaining = (deadline - Date.now()) / 1000;
                if (remaining <= 0) throw new Error('精确优化超时，请缩短内容或限制 X 尺寸后重试。');
                lp.objective = { name: kind, direction: solver.MIN, vars };
                const { result } = await solver.solve(lp, { msglev: solver.OFF, presol: true, mipgap: 0, tmlim: Math.max(1, Math.floor(remaining)) });
                if (result.status !== solver.OPT) throw new Error('未能在时限内证明结构数最优，请缩短内容或限制 X 尺寸。');
                values = result.vars;
                const optimum = Math.round(result.z);
                lp.subjectTo.push({ name: `lock_${kind}`, vars, bnds: { type: solver.EQ, lb: optimum, ub: optimum } });
            }
            const chosen = variables.filter(i => values[`x${i}`] > 0.5).map(i => shapes[i]);
            const covered = new Set(chosen.flatMap(s => s.cells));
            selected.push(...chosen, ...ids.filter(i => shapes[i].kind === 'dot' && !covered.has(shapes[i].cells[0])).map(i => shapes[i]));
        }
        progress(++done / groups.size);
    }
    return selected;
}

export function renderStamp(matrix: boolean[][], shapes: Shape[], o: StampOptions): OffscreenCanvas {
    const n = matrix.length, m = o.moduleSize, border = 4, pixels = (n + 8) * m;
    const canvas = new OffscreenCanvas(pixels, pixels), ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, pixels, pixels);
    const [darker, dark, bright, brighter] = o.colors.map(grayHex);
    const side = (m - 1) / Math.sqrt(2), inset = (m - side) / 2;
    const edge = (v: number) => Math.ceil(v - 0.5);
    function rect(r: number, c: number, h: number, w: number, pad: number, color: string) {
        const x = edge((c + border) * m + pad), y = edge((r + border) * m + pad);
        ctx.fillStyle = color;
        ctx.fillRect(x, y, edge((c + border + w) * m - pad) - x, edge((r + border + h) * m - pad) - y);
    }
    function strip(r: number, c: number, r2: number, c2: number) {
        const radius = (m - 1) / 2;
        const points = [ [r, c], [r2, c2] ].flatMap(([y, x]) => {
            x = (x + border) * m + radius; y = (y + border) * m + radius;
            return [[x - radius, y], [x, y - radius], [x + radius, y], [x, y + radius]];
        }).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        const hull: number[][] = [];
        for (const seq of [points, [...points].reverse()]) {
            const half: number[][] = [];
            for (const p of seq) { while (half.length >= 2 && cross(half.at(-2)!, half.at(-1)!, p) <= 0) half.pop(); half.push(p); }
            hull.push(...half.slice(0, -1));
        }
        ctx.fillStyle = brighter; ctx.beginPath();
        hull.forEach(([x, y], i) => { if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
        ctx.closePath(); ctx.fill();
    }
    for (const s of shapes) {
        const { row: r, col: c, size } = s;
        if (s.kind === 'dot') rect(r, c, 1, 1, inset, darker);
        else if (s.kind === 'horizontal') rect(r, c, 1, size, inset, dark);
        else if (s.kind === 'vertical') { rect(r, c, size - 1, 1, inset, bright); rect(r + size - 1, c, 1, 1, inset, bright); }

    }
    const pad = o.finderWidth === 'standard' ? 0 : inset;
    const color = brighter;
    for (const [r, c] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
        // Draw connected bars, not separated finder modules. Inset applies to their outlines.
        if (o.finder === 'four_sides') {
            rect(r, c + 2, 1, 3, pad, color); rect(r + 6, c + 2, 1, 3, pad, color);
            rect(r + 2, c, 3, 1, pad, color); rect(r + 2, c + 6, 3, 1, pad, color);
        } else {
            rect(r, c, 7, 7, pad, color);
            rect(r + 1, c + 1, 5, 5, -pad, '#000');
        }
        rect(r + 2, c + 2, 3, 3, pad, color);
    }
    // Paint X last, independently of the optimizer's candidate order.
    for (const { row: r, col: c, size, kind } of shapes) {
        if (kind === 'big_x' || kind === 'small_x') {
            strip(r, c, r + size - 1, c + size - 1);
            strip(r, c + size - 1, r + size - 1, c);
        }
    }
    return canvas;
}
