import { beforeAll, describe, expect, it, vi } from 'vitest';
import loadHighs from 'highs';
import { createStampSolver } from './stamp-solver';
import { renderStamp, moveColor, candidates, DEFAULT_STAMP_OPTIONS, finderCells, KINDS, planLayout, validateOptions, type Shape, type Solver } from './stamp-qr';

let solver: Solver;
beforeAll(async () => { solver = createStampSolver(await loadHighs()); });
const matrix = (rows: string[]) => rows.map(r => [...r].map(v => v === '1'));
function score(shapes: Shape[]) {
    return [shapes.length, ...KINDS.slice(0, 4).map(k => -shapes.filter(s => s.kind === k).reduce((n, s) => n + s.cells.length, 0))];
}
function compare(a: number[], b: number[]) { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; }
// Independent exhaustive cover enumeration; does not use the MILP constraint builder.
function exhaustive(m: boolean[][]) {
    const choices = candidates(m, 'all', new Set());
    const active = m.flatMap((row, r) => row.flatMap((v, c) => v ? [r * m.length + c] : []));
    let best = [Infinity];
    function visit(selected: Shape[], used: Set<number>, boxes: Set<number>) {
        const cell = active.find(c => !used.has(c));
        if (cell === undefined) { const s = score(selected); if (compare(s, best) < 0) best = s; return; }
        if (selected.length >= best[0]) return;
        for (const shape of choices) {
            if (!shape.cells.includes(cell) || shape.cells.some(c => used.has(c)) || shape.box.some(c => boxes.has(c))) continue;
            visit([...selected, shape], new Set([...used, ...shape.cells]), new Set([...boxes, ...shape.box]));
        }
    }
    visit([], new Set(), new Set());
    return best;
}

describe('stamp QR', () => {
    it('uses the requested defaults', () => {
        expect(DEFAULT_STAMP_OPTIONS).toMatchObject({ colors: [64, 112, 238, 255], finder: 'four_sides', finderWidth: 'standard', xMode: 'all' });
    });
    it('clamps four handles without crossing or escaping bounds', () => {
        const colors = DEFAULT_STAMP_OPTIONS.colors;
        expect(moveColor(colors, 0, 0)).toEqual([40, 112, 238, 255]);
        expect(moveColor(colors, 1, 255)).toEqual([64, 237, 238, 255]);
        expect(moveColor(colors, 2, 0)).toEqual([64, 112, 113, 255]);
        expect(moveColor(colors, 3, 400)).toEqual(colors);
        expect(colors).toEqual([64, 112, 238, 255]);
    });
    it('paints separated structure colors and paints X last regardless of candidate order', () => {
        const calls: { type: string; color: string }[] = [];
        const ctx = { fillStyle: '', fillRect() { calls.push({ type: 'rect', color: this.fillStyle }); }, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() { calls.push({ type: 'x', color: this.fillStyle }); } };
        vi.stubGlobal('OffscreenCanvas', class { getContext() { return ctx; } });
        try {
            const shapes: Shape[] = [
                { kind: 'big_x', row: 8, col: 8, size: 3, cells: [], box: [] },
                { kind: 'dot', row: 12, col: 8, size: 1, cells: [], box: [] },
                { kind: 'horizontal', row: 13, col: 8, size: 2, cells: [], box: [] },
                { kind: 'vertical', row: 14, col: 8, size: 3, cells: [], box: [] },
            ];
            renderStamp(Array.from({ length: 21 }, () => Array(21).fill(false)), shapes, DEFAULT_STAMP_OPTIONS);
            expect(calls.slice(1, 5).map(c => c.color)).toEqual(['#404040', '#707070', '#eeeeee', '#eeeeee']);
            expect(calls.slice(-2)).toEqual([{ type: 'x', color: '#ffffff' }, { type: 'x', color: '#ffffff' }]);
            expect(calls.slice(5, -2).every(c => c.color === '#ffffff')).toBe(true);
        } finally { vi.unstubAllGlobals(); }
    });
    it('reserves only three finders', () => { expect(finderCells(21).size).toBe(147); expect(finderCells(21).has(8 * 21 + 6)).toBe(false); });
    it('limits X sizes without removing line candidates', () => {
        const m = matrix(['1111', '1111', '1111', '1111']);
        const xs = (mode: 'all' | 'small' | 'only3') => [...new Set(candidates(m, mode, new Set()).filter(s => s.kind.endsWith('_x')).map(s => s.size))].sort();
        expect(xs('all')).toEqual([2, 3, 4]); expect(xs('small')).toEqual([2]); expect(xs('only3')).toEqual([3]);
        expect(candidates(m, 'only3', new Set()).some(s => s.kind === 'vertical')).toBe(true);
    });
    it('enforces line minimum lengths', () => {
        const c = candidates(matrix(['111', '111', '111']), 'all', new Set());
        expect(c.filter(s => s.kind === 'vertical').every(s => s.size >= 3)).toBe(true);
        expect(c.filter(s => s.kind === 'horizontal').every(s => s.size >= 2)).toBe(true);
    });
    it('matches exhaustive lexicographic optimum for every 3×3 binary matrix', async () => {
        for (let bits = 1; bits < 512; bits++) {
            const m = Array.from({ length: 3 }, (_, r) => Array.from({ length: 3 }, (_, c) => !!(bits & (1 << (r * 3 + c)))));
            const shapes = await planLayout(m, 'all', solver, undefined, new Set());
            expect(score(shapes), `matrix ${bits}`).toEqual(exhaustive(m));
            const cells = shapes.flatMap(s => s.cells), boxes = shapes.flatMap(s => s.box);
            expect(new Set(cells).size).toBe(cells.length); expect(new Set(boxes).size).toBe(boxes.length);
            expect(cells.length).toBe(m.flat().filter(Boolean).length);
        }
    });
    it('extends the higher-priority vertical with the same structure count', async () => {
        const shapes = await planLayout(matrix(['1100', '1000', '1000', '1000']), 'all', solver, undefined, new Set());
        expect(shapes.length).toBe(2); expect(shapes.find(s => s.kind === 'vertical')?.size).toBe(4);
    });
    it('rejects a merely feasible solution rather than claiming optimality', async () => {
        const mock: Solver = { ...solver, solve: () => ({ name: 'mock', time: 0, result: { status: 2, z: 0, vars: {} } }) };
        await expect(planLayout(matrix(['11', '11']), 'all', mock, undefined, new Set())).rejects.toThrow('证明');
    });
    it('validates empty, oversized UTF-8 and invalid numeric input', () => {
        for (const patch of [{ text: '' }, { text: '印'.repeat(425) }, { moduleSize: 11 }])
            expect(() => validateOptions({ ...DEFAULT_STAMP_OPTIONS, ...patch })).toThrow();
        for (const colors of [[39, 100, 190, 255], [60, 60, 190, 255], [100, 60, 190, 255], [60, 100, 190, 256], [60.5, 100, 190, 255]])
            expect(() => validateOptions({ ...DEFAULT_STAMP_OPTIONS, colors: colors as [number, number, number, number] })).toThrow();
        expect(() => validateOptions({ ...DEFAULT_STAMP_OPTIONS, colors: [40, 41, 42, 43] })).not.toThrow();
        expect(() => validateOptions({ ...DEFAULT_STAMP_OPTIONS, text: '你好\u0000🙂\n' })).not.toThrow();
    });
});
