/**
 * Paint recipe accuracy benchmark.
 *
 *   npx vite-node -c vitest.config.ts scripts/paint-benchmark.ts [--quick] [--json out.json]
 *
 * Runs the spectral solver (lib/paint/solveRecipe.ts) and the heuristic engine
 * (lib/colorMixer.ts) over curated + swept + known-recipe targets, compares the
 * solver against an independent brute-force baseline, and probes the spectral
 * pipeline's assumptions. Results are printed as markdown; see
 * docs/paint-accuracy-audit.md for the interpreted numbers.
 */
import { writeFileSync } from 'node:fs';
import {
    baselineOptimum,
    CORE_SIX,
    heuristicRow,
    knownMixes,
    quantile,
    solverRow,
    type SolverRow,
} from '../lib/paint/benchmark/metrics';
import { CURATED, gamutSweep } from '../lib/paint/benchmark/targets';
import { MATCH_THRESHOLDS } from '../lib/spectral/types';
import { PALETTE, createColor, getPaletteColors, mixPigmentsSync } from '../lib/spectral/adapter';
import { solveRecipe } from '../lib/paint/solveRecipe';

const args = process.argv.slice(2);
const quick = args.includes('--quick');
const jsonPath = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;

const f = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : 'n/a');
const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(1)}% (${n}/${of})`;
const out: Record<string, unknown> = {};

function table(headers: string[], rows: Array<Array<string | number>>) {
    console.log(`| ${headers.join(' | ')} |`);
    console.log(`|${headers.map(() => '---').join('|')}|`);
    for (const row of rows) console.log(`| ${row.join(' | ')} |`);
    console.log();
}

function bySet<T extends { set: string }>(rows: T[]): Record<string, T[]> {
    const groups: Record<string, T[]> = {};
    for (const row of rows) (groups[row.set] ??= []).push(row);
    return groups;
}

function summarizeSolver(label: string, rows: SolverRow[]) {
    const ok = rows.map((r) => r.errorOK);
    const d00 = rows.map((r) => r.error00);
    const ms = rows.map((r) => r.ms);
    const tried = rows.filter((r) => r.diagnostics.triedThreePigment).length;
    const used = rows.filter((r) => r.diagnostics.usedThreePigment).length;
    return [
        label,
        rows.length,
        f(quantile(ok, 0.5)), f(quantile(ok, 0.95)), f(Math.max(...ok)),
        f(quantile(d00, 0.5)), f(quantile(d00, 0.95)),
        pct(rows.filter((r) => r.errorOK >= MATCH_THRESHOLDS.FAIR).length, rows.length),
        pct(tried, rows.length),
        pct(used, rows.length),
        f(quantile(ms, 0.5), 1), f(quantile(ms, 0.95), 1),
    ];
}

async function main() {
    const sweep = gamutSweep();
    const known = await knownMixes(quick ? 30 : 100, 1);
    const targets = [...CURATED, ...sweep, ...known];

    // 1. Spectral solver --------------------------------------------------
    console.log('## 1. Spectral solver (lib/paint/solveRecipe.ts, default Core 6)\n');
    await solverRow(CURATED[0]); // warm-up so first-call spectral import doesn't skew p95
    const rows: SolverRow[] = [];
    for (const target of targets) rows.push(await solverRow(target));
    out.solver = rows;

    const groups = bySet(rows);
    table(
        ['set', 'n', 'ΔE-OK p50', 'p95', 'max', 'ΔE00 p50', 'p95', 'Poor (≥6 OK)', '3-pigment tried', '3-pigment used', 'ms p50', 'ms p95'],
        [...Object.entries(groups).map(([set, r]) => summarizeSolver(set, r)), summarizeSolver('ALL', rows)]
    );

    console.log('Match-quality bands (recipe.error thresholds Excellent <1, Good <2.5, Fair <6):\n');
    table(
        ['set', 'Excellent', 'Good', 'Fair', 'Poor'],
        Object.entries(groups).map(([set, r]) => [
            set,
            ...(['Excellent', 'Good', 'Fair', 'Poor'] as const).map((q) => pct(r.filter((x) => x.matchQuality === q).length, r.length)),
        ])
    );

    console.log('What each match-quality label means in CIEDE2000 (predictedHex vs target):\n');
    table(
        ['label', 'n', 'ΔE00 p50', 'p95', 'max'],
        (['Excellent', 'Good', 'Fair', 'Poor'] as const).map((q) => {
            const r = rows.filter((x) => x.matchQuality === q).map((x) => x.error00);
            return [q, r.length, f(quantile(r, 0.5)), f(quantile(r, 0.95)), f(Math.max(...r))];
        })
    );

    console.log('### Paintability\n');
    table(
        ['set', 'ingredient <2%', 'no ≤12-part recipe within +1 ΔE', 'unpaintable (either)', 'median parts', 'p95 parts', 'displayed-% recipe adds ΔE p50', 'p95', 'max'],
        Object.entries(groups).concat([['ALL', rows]]).map(([set, r]) => [
            set,
            pct(r.filter((x) => x.minShare < 0.02).length, r.length),
            pct(r.filter((x) => !x.partsWithinBudget).length, r.length),
            pct(r.filter((x) => x.unpaintable).length, r.length),
            f(quantile(r.map((x) => x.partsTotal), 0.5), 0),
            f(quantile(r.map((x) => x.partsTotal), 0.95), 0),
            f(quantile(r.map((x) => x.displayedErrorOK - x.errorOK), 0.5)),
            f(quantile(r.map((x) => x.displayedErrorOK - x.errorOK), 0.95)),
            f(Math.max(...r.map((x) => x.displayedErrorOK - x.errorOK))),
        ])
    );

    const badHex = rows.filter((r) => Math.abs(r.error00) > 0 && r.errorOK < 0.5 && r.error00 > 1);
    console.log(`Targets where the solver reports OKLab error <0.5 but predictedHex is >1 ΔE00 away: ${badHex.length}\n`);
    table(
        ['target', 'set', 'OKLab error', 'ΔE00'],
        badHex.slice(0, 12).map((r) => [r.hex, r.set, f(r.errorOK), f(r.error00)])
    );

    // 2. Known-recipe recovery ------------------------------------------
    console.log('## 2. Recovery of known recipes\n');
    let sameSet = 0;
    const l1: number[] = [];
    for (let i = 0; i < known.length; i++) {
        const row = rows.find((r) => r.set === 'known' && r.name === known[i].name)!;
        const truthIds = known[i].truth.map((t) => t.pigmentId).sort().join();
        const gotIds = row.ids.slice().sort().join();
        if (truthIds === gotIds) {
            sameSet++;
            const total = known[i].truth.reduce((s, t) => s + t.weight, 0);
            const diff = known[i].truth.reduce((s, t) => s + Math.abs(t.weight / total - row.weights[row.ids.indexOf(t.pigmentId)]), 0);
            l1.push(diff / 2); // total-variation distance, 0–1
        }
    }
    console.log(`Recovered the exact pigment set: ${pct(sameSet, known.length)}; weight distance (total variation) when set matches: median ${f(quantile(l1, 0.5) * 100, 1)} pts, p95 ${f(quantile(l1, 0.95) * 100, 1)} pts.\n`);
    const threeTruth = known.filter((k) => k.truth.length === 3);
    const threeRows = threeTruth.map((k) => rows.find((r) => r.set === 'known' && r.name === k.name)!);
    console.log(`Known 3-pigment recipes (n=${threeRows.length}): solver ΔE-OK p50 ${f(quantile(threeRows.map((r) => r.errorOK), 0.5))}, p95 ${f(quantile(threeRows.map((r) => r.errorOK), 0.95))}, max ${f(Math.max(...threeRows.map((r) => r.errorOK)))}; 3-pigment stage skipped for ${pct(threeRows.filter((r) => !r.diagnostics.triedThreePigment).length, threeRows.length)}; solver left >0.5 ΔE-OK on the table for ${pct(threeRows.filter((r) => r.errorOK > 0.5).length, threeRows.length)}.\n`);
    const skipped = rows.filter((r) => !r.diagnostics.triedThreePigment);
    console.log(`Solves that skipped the 3-pigment search (2-pigment error ≤1.5): ${pct(skipped.length, rows.length)}; of those, final error >0.5: ${pct(skipped.filter((r) => r.errorOK > 0.5).length, skipped.length)}, >1.0: ${pct(skipped.filter((r) => r.errorOK > 1).length, skipped.length)}.\n`);
    out.recovery = { sameSet, n: known.length, tvMedian: quantile(l1, 0.5), tvP95: quantile(l1, 0.95) };

    // 3. Heuristic engine -----------------------------------------------
    console.log('## 3. Heuristic engine (lib/colorMixer.ts), scored through the spectral model\n');
    const hrows = [];
    for (const target of [...CURATED, ...sweep]) hrows.push(await heuristicRow(target));
    out.heuristic = hrows;
    const hgroups = bySet(hrows);
    table(
        ['set', 'n', 'ΔE-OK p50', 'p95', 'max', 'ΔE00 p50', 'p95', 'Poor (≥6 OK)', 'uses an unmapped amount'],
        [...Object.entries(hgroups), ['ALL', hrows] as const].map(([set, r]) => [
            set, r.length,
            f(quantile(r.map((x) => x.errorOK), 0.5)), f(quantile(r.map((x) => x.errorOK), 0.95)), f(Math.max(...r.map((x) => x.errorOK))),
            f(quantile(r.map((x) => x.error00), 0.5)), f(quantile(r.map((x) => x.error00), 0.95)),
            pct(r.filter((x) => x.errorOK >= MATCH_THRESHOLDS.FAIR).length, r.length),
            pct(r.filter((x) => x.unmappedAmounts.length > 0).length, r.length),
        ])
    );
    const solverByHex = new Map(rows.filter((r) => r.set !== 'known').map((r) => [r.hex + r.set, r]));
    const wins = hrows.filter((h) => solverByHex.get(h.hex + h.set)!.errorOK + 0.5 < h.errorOK).length;
    console.log(`Spectral solver beats the heuristic by >0.5 ΔE-OK on ${pct(wins, hrows.length)} of curated+sweep targets.\n`);

    // 4. Solver vs brute-force baseline ---------------------------------
    console.log('## 4. Does the solver find the true optimum?\n');
    const sample = quick
        ? [...CURATED.filter((_, i) => i % 6 === 0)]
        : [...CURATED, ...sweep.filter((_, i) => i % 3 === 0)];
    const gaps: Array<{ hex: string; set: string; solver: number; baseline: number; baseline3: number; gap: number; gap3: number; solverIds: string; baseIds: string }> = [];
    for (const target of sample) {
        const solver = rows.find((r) => r.hex === target.hex && r.set === target.set)!;
        const base = await baselineOptimum(target.hex);
        const base3 = await baselineOptimum(target.hex, CORE_SIX, 3);
        gaps.push({
            hex: target.hex, set: target.set, solver: solver.errorOK, baseline: base.errorOK, baseline3: base3.errorOK, gap: solver.errorOK - base.errorOK, gap3: solver.errorOK - base3.errorOK,
            solverIds: solver.ids.join('+'), baseIds: base.ids.map((id, i) => `${id}:${(base.weights[i] * 100).toFixed(0)}`).join('+'),
        });
    }
    out.baseline = gaps;
    const g = gaps.map((x) => x.gap);
    table(
        ['n', 'baseline ΔE-OK p50', 'solver ΔE-OK p50', 'gap p50', 'gap p95', 'gap max', 'solver worse by >0.5', '>1', '>2'],
        [[
            gaps.length, f(quantile(gaps.map((x) => x.baseline), 0.5)), f(quantile(gaps.map((x) => x.solver), 0.5)),
            f(quantile(g, 0.5)), f(quantile(g, 0.95)), f(Math.max(...g)),
            pct(g.filter((x) => x > 0.5).length, g.length), pct(g.filter((x) => x > 1).length, g.length), pct(g.filter((x) => x > 2).length, g.length),
        ]]
    );
    const g3 = gaps.map((x) => x.gap3);
    const cap = gaps.map((x) => x.baseline3 - x.baseline);
    console.log('Splitting the gap: search quality (solver vs best possible 3-pigment mix) and the cost of the 3-pigment cap (best 3-pigment vs best 4-pigment):\n');
    table(
        ['measure', 'p50', 'p95', 'max', '>0.5', '>1', '>2'],
        [
            ['solver − best 3-pigment (search quality)', f(quantile(g3, 0.5)), f(quantile(g3, 0.95)), f(Math.max(...g3)), pct(g3.filter((x) => x > 0.5).length, g3.length), pct(g3.filter((x) => x > 1).length, g3.length), pct(g3.filter((x) => x > 2).length, g3.length)],
            ['best 3-pigment − best 4-pigment (cost of cap)', f(quantile(cap, 0.5)), f(quantile(cap, 0.95)), f(Math.max(...cap)), pct(cap.filter((x) => x > 0.5).length, cap.length), pct(cap.filter((x) => x > 1).length, cap.length), pct(cap.filter((x) => x > 2).length, cap.length)],
        ]
    );
    console.log('Worst 10 gaps:\n');
    table(
        ['target', 'set', 'solver', 'baseline', 'gap', 'solver recipe', 'baseline recipe'],
        gaps.sort((a, b) => b.gap - a.gap).slice(0, 10).map((x) => [x.hex, x.set, f(x.solver), f(x.baseline), f(x.gap), x.solverIds, x.baseIds])
    );
    const trulyPoor = gaps.filter((x) => x.baseline >= MATCH_THRESHOLDS.FAIR).length;
    console.log(`Targets that no ≤4-pigment mix of the Core 6 can reach within ΔE-OK 6 (genuinely out of gamut): ${pct(trulyPoor, gaps.length)}\n`);

    // 5. Tinting-strength assumptions -----------------------------------
    console.log('## 5. Tinting strength\n');
    await getPaletteColors();
    const white = await createColor(PALETTE[0].hex);
    table(
        ['pigment', 'hex', 'tintingStrength', 'luminance Y', 'potency = ts²·Y', 'potency vs white'],
        PALETTE.map((p) => {
            const c = mixPigmentsSync([{ pigmentId: p.id, weight: 1 }]).spectralColor;
            const potency = p.tintingStrength ** 2 * c.luminance;
            return [p.id, p.hex, p.tintingStrength, f(c.luminance, 4), f(potency, 3), `${f(potency / (PALETTE[0].tintingStrength ** 2 * white.luminance), 2)}×`];
        })
    );

    console.log('Measured potency: share of pigment (spectral.js weight) that darkens white by 20 OKLab L points.\n');
    const potencyRows: Array<Array<string | number>> = [];
    for (const p of PALETTE.slice(1)) {
        let lo = 0;
        let hi = 1;
        const whiteL = mixPigmentsSync([{ pigmentId: PALETTE[0].id, weight: 1 }]).spectralColor.OKLab[0];
        for (let i = 0; i < 40; i++) {
            const mid = (lo + hi) / 2;
            const L = mixPigmentsSync([{ pigmentId: PALETTE[0].id, weight: 1 - mid }, { pigmentId: p.id, weight: mid }]).spectralColor.OKLab[0];
            if (whiteL - L < 0.2) lo = mid; else hi = mid;
        }
        potencyRows.push([p.id, p.tintingStrength, `${f(lo * 100, 1)}%`]);
    }
    table(['pigment', 'tintingStrength', 'share needed'], potencyRows);

    console.log('Sensitivity: every tintingStrength ×0.5 / ×2, one pigment at a time, curated targets only.\n');
    const base = new Map(rows.filter((r) => r.set !== 'sweep' && r.set !== 'known').map((r) => [r.hex, r]));
    const sens: Array<Array<string | number>> = [];
    for (const id of CORE_SIX) {
        const pigment = PALETTE.find((p) => p.id === id)!;
        const original = pigment.tintingStrength;
        for (const factor of [0.5, 2]) {
            pigment.tintingStrength = original * factor;
            const changed: number[] = [];
            const errs: number[] = [];
            let setChanged = 0;
            let used = 0;
            for (const target of CURATED) {
                const before = base.get(target.hex)!;
                const recipe = await solveRecipe(target.hex);
                errs.push(recipe.error - before.errorOK);
                const idx = recipe.ingredients.findIndex((i) => i.pigment.id === id);
                const prev = before.ids.indexOf(id);
                if (idx >= 0 || prev >= 0) {
                    used++;
                    changed.push(Math.abs((idx >= 0 ? recipe.ingredients[idx].weight : 0) - (prev >= 0 ? before.weights[prev] : 0)));
                }
                if (recipe.ingredients.map((i) => i.pigment.id).sort().join() !== before.ids.slice().sort().join()) setChanged++;
            }
            pigment.tintingStrength = original;
            sens.push([id, `×${factor}`, used, f(quantile(changed, 0.5) * 100, 1), f(quantile(changed, 0.95) * 100, 1), pct(setChanged, CURATED.length), f(quantile(errs, 0.5)), f(quantile(errs, 0.95))]);
        }
    }
    table(['pigment', 'change', 'targets using it', "its weight shifts p50 (pts)", 'p95 (pts)', 'recipes with different pigment set', 'Δ solver error p50', 'p95'], sens);

    console.log('Forward-model spot checks (weights are spectral.js "factors"; note the square in its concentration formula):\n');
    const spot: Array<Array<string | number>> = [];
    for (const [id, share] of [['ivory-black', 0.02], ['ivory-black', 0.05], ['ivory-black', 0.1], ['phthalo-blue', 0.02], ['phthalo-blue', 0.05], ['cadmium-red', 0.1]] as const) {
        const m = mixPigmentsSync([{ pigmentId: 'titanium-white', weight: 1 - share }, { pigmentId: id, weight: share }]);
        spot.push([`white + ${id}`, `${share * 100}%`, m.hex, f(m.spectralColor.OKLab[0] * 100, 1)]);
    }
    table(['mix', 'share', 'predicted hex', 'OKLab L×100'], spot);

    // 6. Adapter / cache ------------------------------------------------
    console.log('## 6. Adapter cache\n');
    const a = await solveRecipe('#87CEEB');
    await solveRecipe('#C45C3E');
    const a2 = await solveRecipe('#87CEEB');
    console.log(`Deterministic across interleaved solves (A, B, A): ${JSON.stringify(a.ingredients.map((i) => [i.pigment.id, i.weight])) === JSON.stringify(a2.ingredients.map((i) => [i.pigment.id, i.weight]))}`);

    if (jsonPath) writeFileSync(jsonPath, JSON.stringify(out, null, 2));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
