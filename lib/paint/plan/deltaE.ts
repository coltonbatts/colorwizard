/**
 * CIEDE2000 on raw CIELAB (D65) numbers, with no allocation and few transcendental calls,
 * for loops that need millions of evaluations. It is the same formula culori's
 * differenceCiede2000 uses (tested equal to 1e-7), so it agrees with `recipe.error00` and
 * the match labels.
 *
 * Speed comes from working with hue as vectors: the hue difference term comes from a dot and
 * a cross product, the mean hue is the direction of the summed unit vectors, and the cosines
 * in T use multiple-angle identities. That leaves one atan2, one exp and one sin per call.
 *
 * `kL` is the standard CIEDE2000 lightness weight: below 1 it makes lightness differences
 * count more (a "value first" objective). The reported metric always uses kL = 1.
 */
const RAD = Math.PI / 180
const POW7_25 = 6103515625 // 25 ** 7
const COS30 = Math.cos(30 * RAD)
const SIN30 = Math.sin(30 * RAD)
const COS6 = Math.cos(6 * RAD)
const SIN6 = Math.sin(6 * RAD)
const COS63 = Math.cos(63 * RAD)
const SIN63 = Math.sin(63 * RAD)

const pow7 = (x: number) => {
    const x2 = x * x
    return x2 * x2 * x2 * x
}

export function ciede2000(l1: number, a1: number, b1: number, l2: number, a2: number, b2: number, kL = 1): number {
    const c1 = Math.sqrt(a1 * a1 + b1 * b1)
    const c2 = Math.sqrt(a2 * a2 + b2 * b2)
    const cBar7 = pow7((c1 + c2) / 2)
    const g = 1 + 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + POW7_25)))
    const a1p = g * a1
    const a2p = g * a2
    const c1p = Math.sqrt(a1p * a1p + b1 * b1)
    const c2p = Math.sqrt(a2p * a2p + b2 * b2)

    const dLp = l2 - l1
    const dCp = c2p - c1p
    const cProd = c1p * c2p
    let dHp = 0
    let cosH = 1
    let sinH = 0
    if (cProd > 0) {
        const dot = a1p * a2p + b1 * b2
        const cross = a1p * b2 - b1 * a2p
        const cosD = dot / cProd
        if (cosD > -0.999999) {
            // ΔH' = 2 √(C1'C2') sin(Δh'/2), with sin(Δh'/2) = sin(Δh') / (2 cos(Δh'/2)): no cancellation for small angles
            dHp = (2 * Math.sqrt(cProd) * (cross / cProd)) / (2 * Math.sqrt((1 + cosD) / 2))
            // mean hue: direction of the sum of the unit vectors
            const sx = a1p / c1p + a2p / c2p
            const sy = b1 / c1p + b2 / c2p
            const norm = Math.sqrt(sx * sx + sy * sy)
            cosH = sx / norm
            sinH = sy / norm
        } else {
            // Hues (nearly) opposite: which side is "between" them is a tie the standard settles with its angle rules
            let h1 = Math.atan2(b1, a1p)
            if (h1 < 0) h1 += 2 * Math.PI
            let h2 = Math.atan2(b2, a2p)
            if (h2 < 0) h2 += 2 * Math.PI
            let dh = h2 - h1
            if (dh > Math.PI) dh -= 2 * Math.PI
            else if (dh < -Math.PI) dh += 2 * Math.PI
            dHp = 2 * Math.sqrt(cProd) * Math.sin(dh / 2)
            let hm = (h1 + h2) / 2
            if (Math.abs(h1 - h2) > Math.PI) hm -= Math.PI
            if (hm < 0) hm += 2 * Math.PI
            cosH = Math.cos(hm)
            sinH = Math.sin(hm)
        }
    } else if (c1p > 0 || c2p > 0) {
        // one color has no chroma: the mean hue is the other's
        const cp = c1p > 0 ? c1p : c2p
        cosH = (c1p > 0 ? a1p : a2p) / cp
        sinH = (c1p > 0 ? b1 : b2) / cp
    }
    let hBar = Math.atan2(sinH, cosH) / RAD
    if (hBar < 0) hBar += 360

    const lBarp = (l1 + l2) / 2
    const cBarp = (c1p + c2p) / 2
    // cos(2h), sin(2h), cos(3h), sin(3h), cos(4h) from cos(h), sin(h)
    const c2h = cosH * cosH - sinH * sinH
    const s2h = 2 * sinH * cosH
    const c3h = c2h * cosH - s2h * sinH
    const s3h = s2h * cosH + c2h * sinH
    const c4h = c2h * c2h - s2h * s2h
    const s4h = 2 * s2h * c2h
    const t = 1 - 0.17 * (cosH * COS30 + sinH * SIN30) + 0.24 * c2h + 0.32 * (c3h * COS6 - s3h * SIN6) - 0.2 * (c4h * COS63 + s4h * SIN63)
    const hd = (hBar - 275) / 25
    const dTheta = 30 * Math.exp(-hd * hd)
    const cBarp7 = pow7(cBarp)
    const rC = 2 * Math.sqrt(cBarp7 / (cBarp7 + POW7_25))
    const lTerm = (lBarp - 50) * (lBarp - 50)
    const sL = 1 + (0.015 * lTerm) / Math.sqrt(20 + lTerm)
    const sC = 1 + 0.045 * cBarp
    const sH = 1 + 0.015 * cBarp * t
    const rT = -Math.sin(2 * dTheta * RAD) * rC

    const x = dLp / (kL * sL)
    const y = dCp / sC
    const z = dHp / sH
    return Math.sqrt(Math.max(0, x * x + y * y + z * z + rT * y * z))
}
