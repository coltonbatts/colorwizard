/**
 * Minimal PNG codec (8-bit, non-interlaced) so the corpus needs no image library.
 * Node only: it uses node:zlib. Not imported by anything the app ships.
 */
import { deflateSync, inflateSync } from 'node:zlib'

export interface RawImage {
    width: number
    height: number
    /** RGBA, 4 bytes per pixel */
    data: Uint8Array
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const CRC_TABLE = (() => {
    const table = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
        let c = n
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
        table[n] = c >>> 0
    }
    return table
})()

function crc32(bytes: Uint8Array): number {
    let c = 0xffffffff
    for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, body: Uint8Array): Buffer {
    const head = Buffer.alloc(8)
    head.writeUInt32BE(body.length, 0)
    head.write(type, 4, 'ascii')
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0)
    return Buffer.concat([head, body, crc])
}

function paeth(a: number, b: number, c: number): number {
    const p = a + b - c
    const pa = Math.abs(p - a)
    const pb = Math.abs(p - b)
    const pc = Math.abs(p - c)
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}

/** Apply PNG filter `type` to one scanline (bpp = bytes per pixel). */
function filterRow(type: number, row: Uint8Array, prev: Uint8Array, bpp: number): Uint8Array {
    const out = new Uint8Array(row.length)
    for (let i = 0; i < row.length; i++) {
        const left = i >= bpp ? row[i - bpp] : 0
        const up = prev[i]
        const upLeft = i >= bpp ? prev[i - bpp] : 0
        const predictor = [0, left, up, (left + up) >> 1, paeth(left, up, upLeft)][type]
        out[i] = (row[i] - predictor) & 0xff
    }
    return out
}

/** Encode as 8-bit RGB (alpha is dropped), picking the cheapest filter per row. */
export function encodePng(image: RawImage): Buffer {
    const { width, height, data } = image
    const stride = width * 3
    const raw = Buffer.alloc((stride + 1) * height)
    let prev: Uint8Array = new Uint8Array(stride)
    for (let y = 0; y < height; y++) {
        const row = new Uint8Array(stride)
        for (let x = 0; x < width; x++) {
            const src = (y * width + x) * 4
            row.set([data[src], data[src + 1], data[src + 2]], x * 3)
        }
        let best: { type: number; bytes: Uint8Array; cost: number } = { type: 0, bytes: row, cost: Infinity }
        for (let type = 0; type < 5; type++) {
            const bytes = filterRow(type, row, prev, 3)
            let cost = 0
            for (const b of bytes) cost += b < 128 ? b : 256 - b
            if (cost < best.cost) best = { type, bytes, cost }
        }
        raw[y * (stride + 1)] = best.type
        raw.set(best.bytes, y * (stride + 1) + 1)
        prev = row
    }
    const ihdr = Buffer.alloc(13)
    ihdr.writeUInt32BE(width, 0)
    ihdr.writeUInt32BE(height, 4)
    ihdr.set([8, 2, 0, 0, 0], 8) // 8-bit, RGB, deflate, adaptive filtering, no interlace
    return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', new Uint8Array(0))])
}

/** Decode an 8-bit, non-interlaced PNG (gray, RGB, palette, or with alpha) to RGBA. */
export function decodePng(file: Uint8Array): RawImage {
    const buf = Buffer.from(file)
    if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error('Not a PNG file')

    let width = 0
    let height = 0
    let colorType = -1
    let palette: Buffer | null = null
    const idat: Buffer[] = []
    for (let offset = 8; offset < buf.length; ) {
        const length = buf.readUInt32BE(offset)
        const type = buf.toString('ascii', offset + 4, offset + 8)
        const body = buf.subarray(offset + 8, offset + 8 + length)
        if (type === 'IHDR') {
            width = body.readUInt32BE(0)
            height = body.readUInt32BE(4)
            colorType = body[9]
            if (body[8] !== 8) throw new Error('Only 8-bit PNGs are supported. Convert with: sips -s format png in.jpg --out out.png')
            if (body[12] !== 0) throw new Error('Interlaced PNGs are not supported')
        } else if (type === 'PLTE') palette = Buffer.from(body)
        else if (type === 'IDAT') idat.push(Buffer.from(body))
        else if (type === 'IEND') break
        offset += 12 + length
    }

    const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType]
    if (!channels) throw new Error(`Unsupported PNG color type ${colorType}`)
    const stride = width * channels
    const raw = inflateSync(Buffer.concat(idat))
    const pixels = new Uint8Array(stride * height)
    for (let y = 0; y < height; y++) {
        const type = raw[y * (stride + 1)]
        for (let i = 0; i < stride; i++) {
            const value = raw[y * (stride + 1) + 1 + i]
            const left = i >= channels ? pixels[y * stride + i - channels] : 0
            const up = y > 0 ? pixels[(y - 1) * stride + i] : 0
            const upLeft = y > 0 && i >= channels ? pixels[(y - 1) * stride + i - channels] : 0
            const predictor = [0, left, up, (left + up) >> 1, paeth(left, up, upLeft)][type]
            pixels[y * stride + i] = (value + predictor) & 0xff
        }
    }

    const data = new Uint8Array(width * height * 4)
    for (let p = 0; p < width * height; p++) {
        const s = p * channels
        let r: number, g: number, b: number, a = 255
        if (colorType === 0) [r, g, b] = [pixels[s], pixels[s], pixels[s]]
        else if (colorType === 4) [r, g, b, a] = [pixels[s], pixels[s], pixels[s], pixels[s + 1]]
        else if (colorType === 3) {
            const index = pixels[s]
            ;[r, g, b] = [palette![index * 3], palette![index * 3 + 1], palette![index * 3 + 2]]
        } else [r, g, b, a] = [pixels[s], pixels[s + 1], pixels[s + 2], colorType === 6 ? pixels[s + 3] : 255]
        data.set([r, g, b, a], p * 4)
    }
    return { width, height, data }
}
