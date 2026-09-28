import { converter, differenceCiede2000 } from 'culori'
import { describe, expect, it } from 'vitest'
import { ciede2000 } from './deltaE'
import { seededRandom } from './rng'

describe('ciede2000 kernel', () => {
    const toLab = converter('lab65')
    const reference = differenceCiede2000()

    it('matches culori on random colors, near-greys and hue wrap-around', () => {
        const rand = seededRandom(5)
        const hex = () => '#' + Array.from({ length: 3 }, () => Math.floor(rand() * 256).toString(16).padStart(2, '0')).join('')
        const pairs: Array<[string, string]> = Array.from({ length: 4000 }, () => [hex(), hex()])
        // near-neutral pairs, where the chroma correction matters most
        for (let i = 0; i < 1000; i++) {
            const g = Math.floor(rand() * 256)
            const n = () => Math.min(255, Math.max(0, g + Math.floor(rand() * 9) - 4))
            const f = (v: number) => v.toString(16).padStart(2, '0')
            pairs.push([`#${f(n())}${f(n())}${f(n())}`, `#${f(n())}${f(n())}${f(n())}`])
        }
        pairs.push(['#000000', '#000000'], ['#000000', '#FFFFFF'], ['#FF0000', '#FF0001'], ['#0000FF', '#FF00FF'], ['#091111', '#0f0909'], ['#1b201b', '#1b201b'], ['#FF0000', '#00FFFF'])
        let worst = 0
        for (const [a, b] of pairs) {
            const la = toLab(a)!
            const lb = toLab(b)!
            const mine = ciede2000(la.l, la.a, la.b, lb.l, lb.a, lb.b)
            worst = Math.max(worst, Math.abs(mine - reference(a, b)))
        }
        // Both forms are ill-conditioned for near-opposite hues (worst seen: 2e-9 on a ΔE of 90); 1e-7 is far below anything reported.
        expect(worst).toBeLessThan(1e-7)
    })

    it('is zero for identical colors, symmetric, and heavier on lightness when kL < 1', () => {
        expect(ciede2000(50, 10, -10, 50, 10, -10)).toBe(0)
        expect(ciede2000(40, 5, 5, 60, -5, 8)).toBeCloseTo(ciede2000(60, -5, 8, 40, 5, 5), 12)
        expect(ciede2000(40, 5, 5, 60, 5, 5, 0.5)).toBeGreaterThan(ciede2000(40, 5, 5, 60, 5, 5, 1))
    })
})
