import type { Highs } from 'highs';

export interface LinearTerm { name: string; coef: number }
export interface LP {
    name: string; binaries: string[];
    objective: { name: string; direction: number; vars: LinearTerm[] };
    subjectTo: { name: string; vars: LinearTerm[]; bnds: { type: number; lb: number; ub: number } }[];
}
export interface SolveOptions { msglev?: number; presol?: boolean; mipgap?: number; tmlim?: number }
export interface SolveResult { result: { status: number; z: number; vars: Record<string, number> } }
export interface Solver {
    MIN: number; EQ: number; UP: number; OFF: number; OPT: number;
    solve(lp: LP, options?: SolveOptions): SolveResult | Promise<SolveResult>;
}

/** HiGHS is also the MILP engine used by scipy.optimize.milp in the Python version. */
export function createStampSolver(highs: Highs): Solver {
    const expression = (terms: LinearTerm[]) => terms.map(v => `${v.coef < 0 ? '-' : '+'} ${Math.abs(v.coef)} ${v.name}`).join(' ');
    return {
        MIN: 1, EQ: 5, UP: 3, OFF: 0, OPT: 5,
        solve(lp, options) {
            const model = [
                'Minimize', `obj: ${expression(lp.objective.vars)}`, 'Subject To',
                ...lp.subjectTo.filter(row => row.vars.length).map(row => `${row.name}: ${expression(row.vars)} ${row.bnds.type === 5 ? '=' : '<='} ${row.bnds.ub}`),
                'Binary', ...lp.binaries, 'End',
            ].join('\n');
            const result = highs.solve(model, { output_flag: false, mip_rel_gap: 0, mip_abs_gap: 0, time_limit: options?.tmlim ?? 90 });
            return { result: {
                status: result.Status === 'Optimal' ? 5 : 0,
                z: result.ObjectiveValue ?? 0,
                vars: Object.fromEntries(Object.entries(result.Columns ?? {}).map(([name, col]) => [name, col.Primal ?? 0])),
            } };
        },
    };
}
