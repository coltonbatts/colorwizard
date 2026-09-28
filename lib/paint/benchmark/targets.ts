/**
 * Target colors for the paint-accuracy benchmark.
 *
 * The "curated" sets are hand-picked representative colors (typical of what a
 * painter samples from photos), NOT measured from a photo corpus. The gamut
 * sweep is a plain sRGB grid. The "recoverable" set is built by mixing known
 * recipes forward, so the right answer is known.
 */
export interface BenchmarkTarget {
    set: string;
    name: string;
    hex: string;
}

const named = (set: string, entries: Array<[string, string]>): BenchmarkTarget[] =>
    entries.map(([name, hex]) => ({ set, name, hex }));

export const SKIN: BenchmarkTarget[] = named('skin', [
    ['fair highlight', '#F5D5C0'], ['fair mid', '#E8B9A0'], ['fair shadow', '#B98670'],
    ['light highlight', '#EFC7A5'], ['light mid', '#DDA783'], ['light shadow', '#A8735A'],
    ['medium highlight', '#D9A57A'], ['medium mid', '#C08860'], ['medium shadow', '#8C5A3E'],
    ['tan highlight', '#C68E62'], ['tan mid', '#A97148'], ['tan shadow', '#6E4530'],
    ['brown highlight', '#9A6640'], ['brown mid', '#7B4B2E'], ['brown shadow', '#4A2C1C'],
    ['deep highlight', '#6B4028'], ['deep mid', '#4E2D1B'], ['deep shadow', '#2E1A10'],
    ['blush', '#D98E82'], ['lip', '#B5544F'],
]);

export const SKY: BenchmarkTarget[] = named('sky', [
    ['zenith', '#3E7CC1'], ['mid sky', '#6FA3D8'], ['horizon haze', '#BBD7EC'],
    ['pale morning', '#DCE9F2'], ['overcast', '#B5BEC6'], ['storm grey', '#6E7A86'],
    ['dusk blue', '#5A6E9A'], ['sunset orange', '#E8925A'], ['sunset pink', '#D9848F'],
    ['cloud shadow', '#8FA1B5'], ['cloud white', '#F2F1EC'], ['deep twilight', '#2D3F63'],
]);

export const FOLIAGE: BenchmarkTarget[] = named('foliage', [
    ['sunlit leaf', '#8DB53F'], ['spring green', '#7FB05A'], ['mid leaf', '#5C8A3A'],
    ['shadow leaf', '#2F5A2A'], ['deep pine', '#1F3A2A'], ['olive', '#7A7A3A'],
    ['dry grass', '#B5A55A'], ['meadow', '#6B9440'], ['sage', '#8A9A78'],
    ['fern', '#4C7A44'], ['moss', '#5F6B32'], ['autumn leaf', '#C7742A'],
    ['dark undergrowth', '#26382A'], ['yellow-green highlight', '#B5C955'],
]);

export const EARTH: BenchmarkTarget[] = named('earth', [
    ['sandstone', '#C9A27A'], ['wet sand', '#8A7358'], ['dark soil', '#3E2E22'],
    ['clay', '#A65E3C'], ['terracotta', '#C45C3E'], ['weathered wood', '#8C7B6B'],
    ['bark', '#4E3D30'], ['granite', '#8B8D8F'], ['slate', '#4D5560'],
    ['brick', '#9B4A38'],
]);

export const NEUTRALS: BenchmarkTarget[] = named('neutral', [
    ['near white', '#F4F4F2'], ['light grey', '#C8C8C6'], ['mid grey', '#8A8A88'],
    ['dark grey', '#4A4A49'], ['near black', '#1C1C1B'], ['warm grey', '#9A928A'],
    ['cool grey', '#8A929A'], ['pure white', '#FFFFFF'],
]);

export const CURATED: BenchmarkTarget[] = [...SKIN, ...SKY, ...FOLIAGE, ...EARTH, ...NEUTRALS];

/** 6×6×6 sRGB grid (channel steps of 51): the whole gamut, including colors no oil palette can reach. */
export function gamutSweep(): BenchmarkTarget[] {
    const levels = [0, 51, 102, 153, 204, 255];
    const out: BenchmarkTarget[] = [];
    for (const r of levels) for (const g of levels) for (const b of levels) {
        const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
        out.push({ set: 'sweep', name: hex, hex });
    }
    return out;
}

/** Small, fast, seedable PRNG (mulberry32). */
export function seededRandom(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
