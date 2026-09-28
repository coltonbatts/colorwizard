/**
 * Whole-picture paint plan benchmark.
 *
 *   npx vite-node -c vitest.config.ts scripts/paint-plan-benchmark.ts \
 *     [--algo library|naive] [--palette core6|zorn] [--budgets 5,8,12] [--reference] [--photos] [--json out.json]
 *
 * Plans every corpus picture (lib/paint/plan/fixtures/) at each pile budget with the chosen
 * algorithm and prints markdown tables: quality per picture, the summary per budget, and
 * runtime. All scores are against spectral.js's forward model: they show how well a plan's
 * piles repaint a picture on screen, not that real paint would match. Interpreted numbers
 * live in docs/paint-plan-audit.md.
 */
import { writeFileSync } from 'node:fs'
import { loadCorpus } from '../lib/paint/plan/fixtures/corpus'
import { measurePerPixelReference, monotonicityViolations, contextFor, PALETTES, PLANNERS, runBenchmark, summarize, type PerPixelReference } from '../lib/paint/plan/benchmark'
import { buildHistogram } from '../lib/paint/plan/histogram'

const args = process.argv.slice(2)
const option = (name: string, fallback: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback)
const algo = option('--algo', 'library')
const palette = option('--palette', 'core6')
const budgets = option('--budgets', '5,8,12').split(',').map(Number)
const withReference = args.includes('--reference')
const withPhotos = args.includes('--photos')
const jsonPath = args.includes('--json') ? option('--json', '') : null

if (!PLANNERS[algo]) throw new Error(`Unknown --algo ${algo}. Known: ${Object.keys(PLANNERS).join(', ')}`)
if (!(palette in PALETTES)) throw new Error(`Unknown --palette ${palette}. Known: ${Object.keys(PALETTES).join(', ')}`)

const f = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : 'n/a')
const pct = (n: number) => `${(n * 100).toFixed(1)}%`

function table(headers: string[], rows: Array<Array<string | number>>) {
    console.log(`| ${headers.join(' | ')} |`)
    console.log(`|${headers.map(() => '---').join('|')}|`)
    for (const row of rows) console.log(`| ${row.join(' | ')} |`)
    console.log()
}

async function main() {
    const images = loadCorpus(withPhotos ? 'all' : 'synthetic')
    const ctx = contextFor(palette)
    console.log(`## Plan benchmark: algorithm \`${algo}\`, palette \`${palette}\`, ${images.length} pictures, budgets ${budgets.join('/')}\n`)

    const rows = await runBenchmark(images, budgets, PLANNERS[algo], ctx)

    console.log('### Per picture\n')
    table(
        ['picture', 'piles', 'mean ΔE00', 'p95', 'value err (ΔL*)', 'unreachable', 'visibly off (>5)', 'parts', 'unpaintable', 'pigments', 'minor piles', 'ms'],
        rows.map((r) => [
            r.image, r.budget, f(r.score.meanDeltaE00), f(r.score.p95DeltaE00), f(r.score.meanValueError), pct(r.score.unreachableArea), pct(r.score.visiblyOffArea),
            r.score.totalParts, r.score.unpaintablePiles, r.score.distinctPigments, r.score.minorPiles, f(r.ms, 0),
        ]),
    )

    console.log('### Summary per budget (every picture counts equally)\n')
    const summaries = budgets.map((budget) => summarize(rows.filter((r) => r.budget === budget)))
    table(
        ['piles', 'mean ΔE00', 'p95 (mean)', 'p95 (worst)', 'value err', 'unreachable (mean)', 'unreachable (worst)', 'visibly off', 'parts', 'derived piles', 'unpaintable piles', 'pigments', 'minor piles', 'ms p50', 'ms p95'],
        summaries.map((s) => [
            s.budget, f(s.meanDeltaE00), f(s.p95DeltaE00), f(s.worstP95DeltaE00), f(s.meanValueError), pct(s.unreachableArea), pct(s.worstUnreachableArea), pct(s.visiblyOffArea),
            f(s.totalParts, 1), f(s.derivedPiles, 1), pct(s.unpaintableShare), f(s.distinctPigments, 1), f(s.minorPiles, 1), f(s.msP50, 0), f(s.msP95, 0),
        ]),
    )

    console.log('### Pile labels (share of piles, all pictures)\n')
    table(
        ['piles', 'Excellent', 'Good', 'Fair', 'Poor'],
        budgets.map((budget) => {
            const sel = rows.filter((r) => r.budget === budget)
            const total = sel.reduce((s, r) => s + r.score.pileCount, 0)
            return [budget, ...(['Excellent', 'Good', 'Fair', 'Poor'] as const).map((q) => pct(sel.reduce((s, r) => s + r.labels[q], 0) / total))]
        }),
    )

    console.log('### Where pixels go: nearest swatch vs nearest solved-for target (mean ΔE00, mean over pictures)\n')
    table(
        ['piles', 'assigned to nearest swatch', 'assigned to nearest target', 'difference'],
        budgets.map((budget) => {
            const sel = rows.filter((r) => r.budget === budget)
            const swatch = sel.reduce((s, r) => s + r.score.meanDeltaE00, 0) / sel.length
            const center = sel.reduce((s, r) => s + r.centerMeanDeltaE00, 0) / sel.length
            return [budget, f(swatch), f(center), f(center - swatch)]
        }),
    )

    console.log('### Determinism\n')
    const probe = images[0]
    const a = await PLANNERS[algo](buildHistogram(probe.data), budgets[0], ctx)
    const b = await PLANNERS[algo](buildHistogram(probe.data), budgets[0], ctx)
    const same = JSON.stringify(a.piles.map((p) => [p.targetHex, p.recipe.predictedHex, p.recipe.ingredients.map((i) => [i.pigment.id, i.parts ?? i.weight])])) ===
        JSON.stringify(b.piles.map((p) => [p.targetHex, p.recipe.predictedHex, p.recipe.ingredients.map((i) => [i.pigment.id, i.parts ?? i.weight])]))
    console.log(`Same picture, palette and budget twice (${probe.name}, ${budgets[0]} piles) gives an identical plan: **${same}**\n`)

    const violations = monotonicityViolations(rows)
    console.log('### Budget monotonicity (more piles should never look worse)\n')
    if (violations.length === 0) console.log('No picture got worse when the budget went up.\n')
    else {
        table(
            ['picture', 'piles', 'mean ΔE00 before', '→ piles', 'after'],
            violations.map((v) => [v.image, v.from, f(v.before), v.to, f(v.after)]),
        )
    }

    const references: PerPixelReference[] = []
    if (withReference) {
        console.log('### Reference: solve each sampled pixel on its own with the per-color solver\n')
        console.log('Not a strict floor: the solver minimizes OKLab distance and rounds to whole parts, while a plan gives each pixel the nearest swatch in ΔE00, so a plan can beat it.\n')
        for (const image of images) references.push(await measurePerPixelReference(image, ctx.solve))
        table(
            ['picture', 'sampled pixels', 'mean ΔE00', 'own recipe still Poor (>5)'],
            references.map((x) => [x.image, x.samples, f(x.meanDeltaE00), pct(x.unreachableShare)]),
        )
        console.log(`Mean over pictures: ΔE00 ${f(references.reduce((s, x) => s + x.meanDeltaE00, 0) / references.length)}, Poor ${pct(references.reduce((s, x) => s + x.unreachableShare, 0) / references.length)}\n`)
    }

    if (jsonPath) {
        writeFileSync(jsonPath, JSON.stringify({ algo, palette, budgets, summaries, references, violations, rows: rows.map(({ plan, ...r }) => ({ ...r, piles: plan.piles.map((p) => ({ targetHex: p.targetHex, predictedHex: p.recipe.predictedHex, parts: p.recipe.paintable ? p.recipe.totalParts : null })) })) }, null, 2))
    }
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
