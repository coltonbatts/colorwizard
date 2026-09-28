/**
 * The procedural scenes behind the plan corpus. They are stand-ins for photos:
 * smooth shading, soft edges, texture and sensor noise, in the color regimes a
 * painter meets (skin, sky and foliage, warm interior, high-key, low-key,
 * low-chroma still life, saturated color). They are NOT real photographs, so
 * benchmark numbers from them show how an algorithm behaves on this mix of
 * colors, not on any particular real picture.
 */
import { Canvas, add, cover, DESIGN_H, DESIGN_W, ellipseSd, ellipsoidLight, fbm, hex, mix, ramp, rectSd, scale, smoothstep, clamp01, type RGB } from './paint'

type Stops = Array<[number, RGB]>
type Vec3 = [number, number, number]

const KEY_LIGHT: Vec3 = [-0.5, -0.55, 0.65]
const stops = (...entries: Array<[number, string]>): Stops => entries.map(([t, h]) => [t, hex(h)])

/** A lit ellipsoid (sphere, fruit, head). Lambert picks the color from `colors`. */
function ellipsoid(
    c: Canvas, cx: number, cy: number, rx: number, ry: number, colors: Stops,
    o: { light?: Vec3; bounce?: RGB; spec?: number; grain?: number; seed?: number; soft?: number; alpha?: number } = {},
) {
    c.paint((u, v) => {
        const a = cover(ellipseSd(u, v, cx, cy, rx, ry), o.soft ?? 0.8)
        if (a <= 0) return null
        const { lambert, ny } = ellipsoidLight(u, v, cx, cy, rx, ry, o.light ?? KEY_LIGHT)
        let color = ramp(colors, lambert)
        if (o.bounce) color = add(color, scale(o.bounce, 0.16 * smoothstep(0.1, 1, ny) * (1 - lambert)))
        if (o.spec) color = add(color, scale([1, 1, 1], o.spec * lambert ** 28))
        if (o.grain) color = scale(color, 1 + (fbm(u * 0.6, v * 0.6, 3, o.seed ?? 1) - 0.5) * o.grain)
        return [color, a * (o.alpha ?? 1)]
    })
}

/** A vertical cylinder (jug, cup, bottle), lit from the side. */
function cylinder(c: Canvas, x0: number, x1: number, y0: number, y1: number, colors: Stops, o: { light?: Vec3; grain?: number; seed?: number } = {}) {
    const cx = (x0 + x1) / 2
    const rx = (x1 - x0) / 2
    const light = o.light ?? KEY_LIGHT
    const len = Math.hypot(...light)
    c.paint((u, v) => {
        const a = cover(rectSd(u, v, x0, y0, x1, y1))
        if (a <= 0) return null
        const nx = clamp01(Math.abs((u - cx) / rx))
        const nz = Math.sqrt(1 - nx * nx)
        const sign = (u - cx) / rx
        const lambert = clamp01((sign * light[0] + nz * light[2]) / len)
        let color = ramp(colors, lambert)
        if (o.grain) color = scale(color, 1 + (fbm(u * 0.4, v * 0.4, 3, o.seed ?? 2) - 0.5) * o.grain)
        return [color, a]
    })
}

/** A soft dark cast shadow. */
function shadow(c: Canvas, cx: number, cy: number, rx: number, ry: number, tint: RGB, strength: number, blur = 10) {
    c.paint((u, v) => [tint, strength * cover(ellipseSd(u, v, cx, cy, rx, ry), blur)])
}

function backdrop(c: Canvas, top: RGB, bottom: RGB, o: { vignette?: number; texture?: number; seed?: number } = {}) {
    c.paint((u, v) => {
        const vig = 1 - (o.vignette ?? 0) * smoothstep(70, 200, Math.hypot(u - DESIGN_W / 2, (v - DESIGN_H / 2) * 1.25))
        const tex = 1 + ((fbm(u * 0.03, v * 0.03, 3, o.seed ?? 3) - 0.5) * (o.texture ?? 0))
        return [scale(mix(top, bottom, v / DESIGN_H), vig * tex), 1]
    })
}

// ---------------------------------------------------------------------------
// Portraits
// ---------------------------------------------------------------------------

interface PortraitStyle {
    skin: Stops
    bgTop: string
    bgBottom: string
    jacket: Stops
    shirt: string
    hair: string
    lip: string
    light: Vec3
}

function portrait(c: Canvas, s: PortraitStyle) {
    const cx = 128, cy = 84, rx = 44, ry = 58
    backdrop(c, hex(s.bgTop), hex(s.bgBottom), { vignette: 0.4, texture: 0.08, seed: 5 })
    shadow(c, cx + 20, cy + 14, rx + 14, ry + 10, scale(hex(s.bgBottom), 0.3), 0.5, 22)

    // jacket and shirt
    c.paint((u, v) => {
        const a = cover(ellipseSd(u, v, cx, 226, 122, 76))
        if (a <= 0) return null
        const { lambert } = ellipsoidLight(u, v, cx, 226, 122, 76, s.light)
        return [scale(ramp(s.jacket, lambert), 1 + (fbm(u * 0.5, v * 0.5, 3, 9) - 0.5) * 0.18), a]
    })
    ellipsoid(c, cx, 208, 24, 36, stops([0, '#8A8884'], [0.5, '#D6D3CC'], [1, '#F1EFEA']).map(([t, col]) => [t, mix(col, hex(s.shirt), 0.55)] as [number, RGB]), { light: s.light })

    // hair behind the head, then the neck, then a shadow under the chin
    ellipsoid(c, cx, cy - 4, rx + 8, ry + 10, [[0, scale(hex(s.hair), 0.35)], [0.6, hex(s.hair)], [1, scale(hex(s.hair), 2.1)]], { light: s.light, grain: 0.35, seed: 11 })
    ellipsoid(c, cx, 146, 21, 34, s.skin.map(([t, col]) => [t, scale(col, 0.62)] as [number, RGB]), { light: s.light })
    shadow(c, cx, cy + 62, 33, 15, scale(s.skin[0][1], 0.5), 0.55, 8)

    // ears and head
    for (const side of [-1, 1]) ellipsoid(c, cx + side * (rx - 1), cy + 8, 6, 10, s.skin.map(([t, col]) => [t, scale(col, 0.85)] as [number, RGB]), { light: s.light })
    ellipsoid(c, cx, cy, rx, ry, s.skin, { light: s.light, bounce: hex('#D9836E'), grain: 0.04, seed: 21 })
    // nose: a second small form on the face so the shadow side reads
    ellipsoid(c, cx + 1, cy + 9, 6, 11, s.skin, { light: s.light, soft: 9, alpha: 0.5 })
    c.paint((u, v) => [scale(s.skin[0][1], 0.55), 0.3 * cover(ellipseSd(u, v, cx + 5, cy + 21, 5, 3), 4)])
    // cheeks
    for (const side of [-1, 1]) c.paint((u, v) => [hex('#D67A6C'), 0.2 * cover(ellipseSd(u, v, cx + side * 26, cy + 16, 15, 11), 14)])
    // brows, eyes, mouth
    for (const side of [-1, 1]) {
        const ex = cx + side * 17
        c.paint((u, v) => [scale(hex(s.hair), 0.7), 0.85 * cover(ellipseSd(u, v - side * (u - ex) * 0.05, ex, cy - 15, 11, 1.7), 1.2)])
        c.paint((u, v) => [scale(s.skin[0][1], 0.55), 0.35 * cover(ellipseSd(u, v, ex, cy - 7, 10, 4.5), 4)])
        c.paint((u, v) => [hex('#EDE6DE'), cover(ellipseSd(u, v, ex, cy - 7, 6.5, 2.6), 0.9)])
        c.paint((u, v) => [hex('#2A1B14'), cover(ellipseSd(u, v, ex, cy - 7, 2.7, 2.7), 0.9)])
    }
    c.paint((u, v) => [scale(hex(s.lip), 0.78), cover(ellipseSd(u, v, cx, cy + 33.5, 13, 2.3), 1)])
    c.paint((u, v) => [hex(s.lip), cover(ellipseSd(u, v, cx, cy + 37, 11.5, 3.6), 1.2)])
    c.paint((u, v) => [scale(s.skin[0][1], 0.5), 0.25 * cover(ellipseSd(u, v, cx, cy + 43, 9, 2.5), 5)])

    // front hair: everything above a curved hairline, with streaks
    c.paint((u, v) => {
        const hairline = cy - 27 + 20 * Math.abs((u - cx) / rx) ** 2 + 6 * Math.sin((u - cx) * 0.11)
        const a = cover(ellipseSd(u, v, cx, cy - 3, rx + 3, ry + 3)) * cover(v - hairline, 2.2)
        if (a <= 0) return null
        const { lambert } = ellipsoidLight(u, v, cx, cy - 4, rx + 8, ry + 10, s.light)
        const streak = fbm(u * 0.45, v * 0.05 + u * 0.02, 3, 31)
        const base = hex(s.hair)
        return [scale(ramp([[0, scale(base, 0.3)], [0.6, base], [1, scale(base, 2.3)]], clamp01(lambert * 0.9 + (streak - 0.5) * 0.7)), 1), a]
    })
}

export const portraitLight = (c: Canvas) =>
    portrait(c, {
        skin: stops([0, '#8E6048'], [0.35, '#C48F70'], [0.7, '#E6B898'], [1, '#F6DAC4']),
        bgTop: '#8E8A84', bgBottom: '#6F6A66',
        jacket: stops([0, '#161B26'], [0.6, '#2E3646'], [1, '#4A5468']),
        shirt: '#E4E2DC', hair: '#5A3A26', lip: '#B5544F', light: KEY_LIGHT,
    })

export const portraitDeep = (c: Canvas) =>
    portrait(c, {
        skin: stops([0, '#2A160D'], [0.35, '#5A3320'], [0.7, '#8C5A3A'], [1, '#B98258']),
        bgTop: '#C9B79C', bgBottom: '#A8967C',
        jacket: stops([0, '#A89F90'], [0.6, '#D6CDBD'], [1, '#F0E9DB']),
        shirt: '#7E2F2A', hair: '#140C08', lip: '#7A3A34', light: [0.55, -0.5, 0.65],
    })

// ---------------------------------------------------------------------------
// Landscape: sky, clouds, hills, meadow, trees, a path
// ---------------------------------------------------------------------------

export function landscape(c: Canvas) {
    const skyStops = stops([0, '#3E7CC1'], [0.55, '#6FA3D8'], [1, '#BBD7EC'])
    c.paint((u, v) => {
        let color = ramp(skyStops, clamp01(v / 108))
        const n = fbm(u * 0.018, v * 0.06, 5, 41)
        const body = smoothstep(0.52, 0.74, n) * smoothstep(118, 60, v)
        if (body > 0) {
            const lit = clamp01(1.25 - (fbm(u * 0.018, v * 0.06 + 0.05, 5, 41) - n) * 9 - v / 200)
            color = mix(color, mix(hex('#9FB0C2'), hex('#F6F4EE'), lit), body)
        }
        return [color, 1]
    })
    // far and mid hills
    c.paint((u, v) => {
        const ridge = 100 + 9 * Math.sin(u * 0.035 + 1) + 14 * fbm(u * 0.02, 0.5, 3, 51)
        return [mix(hex('#8AA0B8'), hex('#B4C6D6'), smoothstep(ridge, ridge + 26, v)), cover(ridge - v, 1.5)] as const
    })
    c.paint((u, v) => {
        const ridge = 112 + 7 * Math.sin(u * 0.05 + 3) + 10 * fbm(u * 0.03, 2.5, 3, 52)
        const t = smoothstep(ridge, ridge + 30, v)
        return [mix(hex('#5F7F5A'), hex('#8FA678'), t), cover(ridge - v, 1.5)]
    })
    // meadow
    c.paint((u, v) => {
        if (v < 118) return null
        const n = fbm(u * 0.05, v * 0.09, 4, 61)
        const dry = smoothstep(0.35, 0.75, fbm(u * 0.02 + 5, v * 0.05, 3, 62))
        const base = ramp(stops([0, '#6B9440'], [0.5, '#8DB53F'], [1, '#B5C955']), n)
        const nearer = smoothstep(120, 192, v)
        return [scale(mix(mix(base, hex('#B5A55A'), dry * 0.75), hex('#4E7A2C'), nearer * 0.5), 0.85 + 0.3 * fbm(u * 0.6, v * 0.6, 2, 63)), 1]
    })
    // tree line
    c.paint((u, v) => {
        const top = 108 + 12 * fbm(u * 0.04, 8, 3, 71)
        const clump = fbm(u * 0.09, v * 0.11, 4, 72)
        const a = smoothstep(top, top + 3, v) * (1 - smoothstep(122, 128, v)) * smoothstep(0.32, 0.5, clump + (v - top) * 0.004)
        if (a <= 0) return null
        return [ramp(stops([0, '#1F3A2A'], [0.55, '#2F5A2A'], [1, '#5C8A3A']), clump * 0.9 + 0.1 * smoothstep(top, top + 12, v)), a]
    })
    // path receding to the horizon
    c.paint((u, v) => {
        if (v < 122) return null
        const halfWidth = 2 + (v - 122) * 0.5
        const center = 132 + (v - 122) * 0.32
        const a = cover(Math.abs(u - center) - halfWidth, 1.6)
        if (a <= 0) return null
        const t = smoothstep(122, 192, v)
        return [scale(mix(hex('#C9A27A'), hex('#8A6A48'), t * 0.7), 0.85 + 0.3 * fbm(u * 0.5, v * 0.5, 3, 81)), a]
    })
    // foreground grass blades as noise
    c.paint((u, v) => {
        if (v < 160) return null
        const n = fbm(u * 0.7, v * 0.25, 3, 91)
        return [ramp(stops([0, '#2F5A2A'], [0.6, '#5C8A3A'], [1, '#B5A55A']), n), smoothstep(160, 192, v) * 0.7 * (n > 0.4 ? 1 : 0.3)]
    })
    // the tree
    c.paint((u, v) => {
        const a = cover(rectSd(u, v, 41, 78, 48, 176))
        return a > 0 ? [ramp(stops([0, '#2A1E16'], [0.5, '#4E3D30'], [1, '#7A6248']), clamp01((48 - u) / 7 + 0.3 * fbm(u, v * 0.2, 2, 95))), a] : null
    })
    for (const [tx, ty, r] of [[44, 70, 26], [26, 84, 20], [62, 84, 20], [40, 52, 18], [56, 62, 18]] as const) {
        ellipsoid(c, tx, ty, r, r * 0.9, stops([0, '#16301F'], [0.45, '#3A6B34'], [0.8, '#7FA83A'], [1, '#B5C955']), { grain: 0.55, seed: 97 + tx, soft: 3 })
    }
    shadow(c, 54, 178, 34, 5, hex('#1F3A2A'), 0.5, 6)
}

// ---------------------------------------------------------------------------
// Warm interior
// ---------------------------------------------------------------------------

export function interiorWarm(c: Canvas) {
    const lamp = { x: 76, y: 58 }
    const glow = (u: number, v: number) => Math.exp(-((u - lamp.x) ** 2 + (v - lamp.y) ** 2) / (2 * 78 ** 2))
    // wall
    c.paint((u, v) => {
        const g = glow(u, v)
        const texture = 1 + (fbm(u * 0.05, v * 0.05, 3, 111) - 0.5) * 0.1
        const dim = 1 - 0.55 * smoothstep(120, 256, u)
        return [scale(mix(scale(hex('#B58A62'), 0.42), hex('#F0CC94'), g), texture * dim), 1]
    })
    // floor planks
    c.paint((u, v) => {
        if (v < 130) return null
        const plank = Math.floor((v - 130) / 11 + Math.sin(u * 0.01) * 0.2)
        const tone = 0.75 + 0.35 * ((plank * 37) % 7) / 7
        const seam = smoothstep(0.85, 1, ((v - 130) / 11) % 1)
        const grain = 0.85 + 0.3 * fbm(u * 0.08, v * 1.2, 3, 121)
        const g = glow(u, Math.min(v, 150) - 30)
        return [scale(ramp(stops([0, '#4E2D1B'], [0.5, '#7B4B2E'], [1, '#B07A50']), clamp01(0.25 + tone * 0.4 + g * 0.5)), grain * (1 - 0.5 * seam)), 1]
    })
    c.paint((u, v) => [hex('#5A3A28'), cover(rectSd(u, v, 0, 127, DESIGN_W, 131), 0.8)])
    // window and the light it throws
    c.paint((u, v) => [ramp(stops([0, '#FBFBF6'], [0.6, '#DCE9F2'], [1, '#BBD7EC']), (v - 28) / 80), cover(rectSd(u, v, 170, 28, 228, 108))])
    c.paint((u, v) => {
        const bars = Math.min(rectSd(u, v, 170, 28, 228, 108) * -1, 99) < 2 ? 1 : 0
        const cross = Math.abs(u - 199) < 1.5 || Math.abs(v - 67) < 1.5 ? 1 : 0
        const inside = rectSd(u, v, 168, 26, 230, 110) < 0 ? 1 : 0
        return inside && (bars || cross) ? [hex('#3A2A20'), 1] : null
    })
    c.paint((u, v) => {
        if (v < 131) return null
        const slant = u - (150 + (v - 131) * 0.55)
        return [hex('#EDF3F8'), 0.28 * cover(Math.abs(slant) - 22, 4) * smoothstep(192, 140, v)]
    })
    // sofa
    shadow(c, 66, 152, 64, 6, hex('#1A0E08'), 0.6, 8)
    c.paint((u, v) => {
        const a = cover(rectSd(u, v, 8, 100, 124, 150), 1.4)
        if (a <= 0) return null
        const lit = smoothstep(8, 124, u) * 0.6 + glow(u, v) * 0.6
        return [scale(ramp(stops([0, '#3A1410'], [0.5, '#8C3A2E'], [1, '#C4604A']), clamp01(lit)), 0.9 + 0.2 * fbm(u * 0.4, v * 0.4, 3, 131)), a]
    })
    c.paint((u, v) => [scale(hex('#3A1410'), 0.9), 0.35 * cover(Math.abs(v - 120) - 1.2, 1.4) * cover(rectSd(u, v, 14, 104, 118, 148), 1)])
    // lamp
    c.paint((u, v) => [hex('#2A1A14'), cover(rectSd(u, v, 75, 66, 77, 132))])
    ellipsoid(c, 76, 134, 9, 3, stops([0, '#1A0E08'], [1, '#5A3A28']))
    c.paint((u, v) => {
        const a = cover(rectSd(u, v, 60 + (v - 40) * 0.5, 40, 92 - (v - 40) * 0.5, 66), 1)
        return a > 0 ? [ramp(stops([0, '#F0C06A'], [0.6, '#FFE7A8'], [1, '#FFF6D6']), 1 - Math.abs(u - lamp.x) / 22), a] : null
    })
    // rug
    c.paint((u, v) => {
        const sd = ellipseSd(u, v, 156, 172, 84, 17)
        const a = cover(sd)
        if (a <= 0) return null
        const rings = Math.floor(-sd / 3.2)
        const band = rings <= 0 ? hex('#3E2E22') : rings % 3 === 0 ? hex('#E8C58A') : hex('#A65E3C')
        return [scale(band, 0.75 + 0.35 * glow(u, 150) + 0.15 * fbm(u * 0.7, v * 0.7, 2, 141)), a]
    })
}

// ---------------------------------------------------------------------------
// High key
// ---------------------------------------------------------------------------

export function highKey(c: Canvas) {
    backdrop(c, hex('#F4F1EA'), hex('#FDFCF9'), { vignette: 0.05, texture: 0.02, seed: 151 })
    c.paint((u, v) => (v > 116 ? [mix(hex('#FCFBF7'), hex('#EAE8E1'), smoothstep(116, 192, v)), smoothstep(112, 120, v)] : null))
    const shade = hex('#D5D9DF')
    shadow(c, 134, 138, 52, 7, shade, 0.7, 9)
    shadow(c, 196, 142, 52, 8, shade, 0.7, 9)
    shadow(c, 66, 138, 26, 4, hex('#D9DDD3'), 0.6, 7)
    const porcelain = stops([0, '#C5CCD6'], [0.4, '#E4E8EE'], [0.8, '#F8F9FB'], [1, '#FFFFFF'])
    // cup, its opening, and handle
    cylinder(c, 96, 148, 76, 132, porcelain, { light: [-0.7, -0.3, 0.6] })
    c.paint((u, v) => [hex('#CDD3DB'), cover(ellipseSd(u, v, 122, 76, 26, 6))])
    c.paint((u, v) => [hex('#F6F7F9'), cover(ellipseSd(u, v, 122, 75, 24, 4.2))])
    c.paint((u, v) => [hex('#E6E9EE'), cover(Math.abs(ellipseSd(u, v, 154, 100, 12, 17)) - 3, 1.2) * (u > 146 ? 1 : 0)])
    // bowl
    c.paint((u, v) => {
        const a = cover(ellipseSd(u, v, 196, 116, 52, 28)) * (v > 116 ? 1 : 0)
        if (a <= 0) return null
        const { lambert } = ellipsoidLight(u, v, 196, 116, 52, 28, [-0.6, -0.4, 0.7])
        return [ramp(porcelain, lambert), a]
    })
    c.paint((u, v) => [hex('#F0F2F5'), cover(ellipseSd(u, v, 196, 116, 52, 8))])
    c.paint((u, v) => [hex('#D3D8DF'), cover(ellipseSd(u, v, 196, 117, 47, 6), 1.5)])
    // a pale flower
    c.paint((u, v) => [hex('#C6D8AE'), cover(rectSd(u, v, 64.5, 96, 66.5, 138))])
    ellipsoid(c, 74, 118, 14, 5, stops([0, '#B9CFA0'], [1, '#E6EFD6']))
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2
        ellipsoid(c, 65 + Math.cos(angle) * 8, 92 + Math.sin(angle) * 7, 7, 6.5, stops([0, '#EFB9BE'], [0.6, '#F7D9DC'], [1, '#FFF3F3']), { light: KEY_LIGHT })
    }
    ellipsoid(c, 65, 92, 4.5, 4.5, stops([0, '#D9A04A'], [1, '#F1CE7A']))
}

// ---------------------------------------------------------------------------
// Low key
// ---------------------------------------------------------------------------

export function lowKey(c: Canvas) {
    backdrop(c, hex('#0C0A09'), hex('#1A1410'), { vignette: 0.5, texture: 0.1, seed: 171 })
    c.paint((u, v) => [hex('#3A2818'), 0.35 * Math.exp(-((u - 70) ** 2 + (v - 70) ** 2) / (2 * 55 ** 2))])
    c.paint((u, v) => (v > 132 ? [mix(hex('#100C09'), hex('#2A1F16'), smoothstep(132, 192, v)), smoothstep(128, 136, v)] : null))
    // bottle, mostly lost in the dark
    cylinder(c, 22, 48, 60, 138, stops([0, '#050605'], [0.5, '#0C0F0E'], [0.85, '#2E3836'], [1, '#748583']), { light: [-0.95, -0.1, 0.15] })
    cylinder(c, 30, 40, 34, 62, stops([0, '#050605'], [0.7, '#0C0F0E'], [1, '#5A6866']), { light: [-0.95, -0.1, 0.15] })
    c.paint((u, v) => [hex('#B8C7C4'), 0.4 * cover(rectSd(u, v, 25.5, 70, 27.2, 125), 1)])
    // a pear behind and an apple in front
    shadow(c, 170, 141, 30, 4, hex('#000000'), 0.5, 6)
    ellipsoid(c, 170, 108, 23, 36, stops([0, '#070704'], [0.35, '#2A2A0C'], [0.75, '#7C7424'], [1, '#C4B850']), { light: [-0.85, -0.3, 0.35], grain: 0.3, seed: 181 })
    shadow(c, 118, 145, 44, 6, hex('#000000'), 0.55, 7)
    ellipsoid(c, 116, 108, 38, 36, stops([0, '#0B0605'], [0.3, '#3E100C'], [0.7, '#9C2A1B'], [1, '#E0603C']), { light: [-0.7, -0.5, 0.5], spec: 0.5, bounce: hex('#5A2A18'), grain: 0.2, seed: 191 })
    c.paint((u, v) => [hex('#241208'), cover(rectSd(u, v, 115, 66, 117.5, 78), 0.8) * cover(-(v - 66), 1)])
    c.paint((u, v) => [hex('#FFE0C8'), 0.55 * cover(ellipseSd(u, v, 100, 90, 7, 4), 4)])
}

// ---------------------------------------------------------------------------
// Low-chroma still life
// ---------------------------------------------------------------------------

export function stillLifeMuted(c: Canvas) {
    backdrop(c, hex('#A8A196'), hex('#8E887E'), { vignette: 0.25, texture: 0.12, seed: 211 })
    c.paint((u, v) => (v > 122 ? [mix(hex('#7E766A'), hex('#655F54'), smoothstep(122, 192, v)), smoothstep(119, 125, v)] : null))
    c.paint((u, v) => [hex('#565046'), 0.7 * cover(Math.abs(v - 122) - 0.8, 1)])
    // drapery
    c.paint((u, v) => {
        if (v < 140 || u > 90) return null
        const fold = 0.5 + 0.5 * Math.sin(u * 0.16 + fbm(u * 0.03, v * 0.03, 3, 221) * 6)
        return [mix(hex('#7C7466'), hex('#B4AC9C'), fold), smoothstep(140, 150, v) * smoothstep(96, 60, u)]
    })
    const shade = hex('#3E3A33')
    shadow(c, 92, 138, 44, 6, shade, 0.5, 8)
    shadow(c, 148, 140, 24, 5, shade, 0.5, 8)
    shadow(c, 214, 142, 44, 6, shade, 0.5, 8)
    // jug
    cylinder(c, 54, 98, 64, 134, stops([0, '#4E4E46'], [0.45, '#8A8A7E'], [1, '#BDBCAE']), { grain: 0.1, seed: 231 })
    cylinder(c, 64, 88, 46, 66, stops([0, '#4E4E46'], [0.45, '#8A8A7E'], [1, '#BDBCAE']))
    c.paint((u, v) => [hex('#5A5A50'), cover(ellipseSd(u, v, 76, 46, 12, 3))])
    c.paint((u, v) => [hex('#8A8A7E'), cover(Math.abs(ellipseSd(u, v, 100, 88, 10, 18)) - 2.5, 1) * (u > 96 ? 1 : 0)])
    // bottle
    cylinder(c, 126, 152, 76, 136, stops([0, '#343C32'], [0.5, '#5F6B5A'], [1, '#93A08A']))
    cylinder(c, 134, 144, 46, 78, stops([0, '#343C32'], [0.5, '#5F6B5A'], [1, '#93A08A']))
    c.paint((u, v) => [hex('#C9C1AE'), cover(rectSd(u, v, 128, 100, 150, 118))])
    // bowl and eggs
    c.paint((u, v) => {
        const a = cover(ellipseSd(u, v, 212, 124, 46, 20)) * (v > 124 ? 1 : 0)
        if (a <= 0) return null
        const { lambert } = ellipsoidLight(u, v, 212, 124, 46, 20, KEY_LIGHT)
        return [ramp(stops([0, '#7C7566'], [0.5, '#B9B2A2'], [1, '#DAD4C6']), lambert), a]
    })
    c.paint((u, v) => [hex('#928B7C'), cover(ellipseSd(u, v, 212, 124, 46, 7))])
    for (const [ex, ey] of [[198, 118], [214, 116], [228, 119]] as const) {
        ellipsoid(c, ex, ey, 11, 13, stops([0, '#8C8474'], [0.5, '#C9C1AE'], [1, '#EAE4D6']), { grain: 0.06, seed: ex })
    }
    c.paint((u, v) => [hex('#B9B2A2'), cover(rectSd(u, v, 168, 124, 256, 132), 1) * (v > 124 ? 0.9 : 0)])
}

// ---------------------------------------------------------------------------
// Sunset
// ---------------------------------------------------------------------------

export function sunset(c: Canvas) {
    const sun = { x: 168, y: 128 }
    const sky = stops([0, '#2D3F63'], [0.3, '#5A4E82'], [0.55, '#C46F8C'], [0.78, '#E8925A'], [1, '#F8C870'])
    c.paint((u, v) => {
        let color = ramp(sky, clamp01(v / 138))
        const d2 = (u - sun.x) ** 2 + (v - sun.y) ** 2
        color = add(color, scale(hex('#FF9C4A'), 0.55 * Math.exp(-d2 / (2 * 46 ** 2))))
        const n = fbm(u * 0.012, v * 0.085, 5, 241)
        const band = smoothstep(0.5, 0.7, n) * smoothstep(20, 40, v) * smoothstep(122, 96, v)
        if (band > 0) {
            const nearSun = Math.exp(-((u - sun.x) ** 2) / (2 * 90 ** 2)) * smoothstep(20, 110, v)
            const lit = clamp01(0.25 + 0.75 * nearSun + (fbm(u * 0.012, v * 0.085 - 0.06, 5, 241) - n) * 6)
            color = mix(color, ramp(stops([0, '#4A3560'], [0.45, '#B4587A'], [0.8, '#F4A070'], [1, '#FFD69A']), lit), band * 0.92)
        }
        color = add(color, scale(hex('#FFF1C0'), Math.exp(-d2 / (2 * 7 ** 2))))
        return [color, 1]
    })
    // land silhouette, with a hint of glow on the ridge
    c.paint((u, v) => {
        const ridge = 140 + 7 * Math.sin(u * 0.04) + 9 * fbm(u * 0.03, 4.5, 3, 251)
        const a = cover(ridge - v, 1.2)
        if (a <= 0) return null
        return [mix(hex('#4A2A3A'), hex('#151018'), smoothstep(ridge, ridge + 6, v)), a]
    })
    for (const [tx, h, w] of [[30, 34, 9], [46, 26, 7], [64, 40, 10], [222, 46, 11], [238, 30, 8]] as const) {
        c.paint((u, v) => {
            const base = 158
            const t = (base - v) / h
            return t > 0 && t < 1 ? [hex('#110D14'), cover(Math.abs(u - tx) - w * (1 - t) * (0.6 + 0.4 * fbm(u * 0.3, v * 0.3, 2, 261)), 1)] : null
        })
    }
}

// ---------------------------------------------------------------------------
// Saturated fruit
// ---------------------------------------------------------------------------

export function fruitSaturated(c: Canvas) {
    c.paint((u, v) => {
        const fold = 0.5 + 0.5 * Math.sin(u * 0.045 + fbm(u * 0.02, v * 0.03, 3, 271) * 5)
        return [scale(mix(hex('#1E5E86'), hex('#3B93BD'), fold), 1 - 0.3 * smoothstep(60, 200, Math.hypot(u - 128, v - 96))), 1]
    })
    c.paint((u, v) => (v > 112 ? [mix(hex('#F1EFE8'), hex('#CFCFC8'), smoothstep(112, 192, v)), smoothstep(108, 118, v)] : null))
    c.paint((u, v) => [hex('#2C7FA8'), 0.16 * smoothstep(112, 190, v)])
    const shade = hex('#5E6066')
    for (const [x, y, rx] of [[82, 140, 34], [130, 152, 30], [178, 146, 30], [204, 152, 22], [34, 148, 20], [166, 116, 24]] as const) shadow(c, x, y, rx, 6, shade, 0.45, 7)
    ellipsoid(c, 166, 100, 22, 22, stops([0, '#7A2E04'], [0.5, '#E8771A'], [1, '#FFB05A']), { spec: 0.5, grain: 0.15, seed: 281 })
    ellipsoid(c, 34, 118, 18, 28, stops([0, '#2E4A08'], [0.5, '#7FA61E'], [1, '#C9E060']), { spec: 0.4, bounce: hex('#F1EFE8') })
    ellipsoid(c, 82, 112, 32, 30, stops([0, '#4A0A0A'], [0.5, '#C8281E'], [1, '#F0604A']), { spec: 0.6, bounce: hex('#F1EFE8') })
    ellipsoid(c, 130, 126, 27, 25, stops([0, '#3E0808'], [0.5, '#B41E18'], [1, '#EE5A44']), { spec: 0.6, bounce: hex('#F1EFE8') })
    ellipsoid(c, 178, 130, 25, 16, stops([0, '#8A6A08'], [0.5, '#E5C21A'], [1, '#FFF07A']), { spec: 0.5, bounce: hex('#F1EFE8') })
    ellipsoid(c, 204, 138, 20, 13, stops([0, '#8A6A08'], [0.5, '#EBCB22'], [1, '#FFF48A']), { spec: 0.5, bounce: hex('#F1EFE8') })
    for (const [x, y] of [[82, 82], [130, 102]] as const) c.paint((u, v) => [hex('#2E1A10'), cover(rectSd(u, v, x - 1, y, x + 1, y + 9), 0.8)])
}

export const SCENES: Array<{ name: string; seed: number; exposure?: number; draw: (c: Canvas) => void; blurb: string }> = [
    { name: 'portrait-light', seed: 1, draw: portraitLight, blurb: 'light skin, dark jacket, neutral wall (portrait/skin)' },
    { name: 'portrait-deep', seed: 2, draw: portraitDeep, blurb: 'deep skin, pale jacket, warm wall (portrait/skin, high value contrast)' },
    { name: 'landscape', seed: 3, draw: landscape, blurb: 'sky with clouds, hills, meadow, dark foliage, a path' },
    { name: 'interior-warm', seed: 4, draw: interiorWarm, blurb: 'lamp-lit room with a cool window, wood floor, red sofa' },
    { name: 'high-key', seed: 5, exposure: 1.06, draw: highKey, blurb: 'white porcelain on white, pale shadows, nearly all light values' },
    { name: 'low-key', seed: 6, draw: lowKey, blurb: 'apple and pear emerging from near-black, nearly all dark values' },
    { name: 'still-life-muted', seed: 7, draw: stillLifeMuted, blurb: 'grey-beige-olive jug, bottle, bowl; very low chroma' },
    { name: 'sunset', seed: 8, draw: sunset, blurb: 'saturated violet, magenta and orange sky over a silhouette' },
    { name: 'fruit-saturated', seed: 9, draw: fruitSaturated, blurb: 'red, yellow, orange and green fruit on a teal cloth; high chroma' },
]
