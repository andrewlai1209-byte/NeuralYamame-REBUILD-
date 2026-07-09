export const EMPTY = 0n;
export const ALL = 0xffffffffffffffffn;

// De Bruijn multiplication for fast LSB index
const DE_BRUIJN_64 = 0x03f79d71b4ca8b09n;
const INDEX_64 = new Int32Array([
    0, 1, 48, 2, 57, 49, 28, 3, 61, 58, 50, 42, 38, 29, 17, 4,
    62, 55, 59, 36, 51, 33, 43, 11, 39, 14, 30, 19, 18, 5, 21, 6,
    63, 47, 56, 27, 60, 41, 37, 16, 54, 35, 32, 10, 13, 26, 40, 15,
    53, 34, 9, 25, 52, 8, 24, 7, 23, 22, 21, 20, 20, 20, 20, 20 // Dummy padding
]);

// Helper for fast LSB
function getLSBIndex(bb: bigint): number {
    return INDEX_64[Number(((bb & -bb) * DE_BRUIJN_64) >> 58n)];
}

export function setBit(bb: bigint, sq: number): bigint {
    return bb | (1n << BigInt(sq));
}

export function clearBit(bb: bigint, sq: number): bigint {
    return bb & ~(1n << BigInt(sq));
}

export function toggleBit(bb: bigint, sq: number): bigint {
    return bb ^ (1n << BigInt(sq));
}

export function checkBit(bb: bigint, sq: number): boolean {
    return (bb & (1n << BigInt(sq))) !== 0n;
}

export function popLSB(bb: bigint): { sq: number; bb: bigint } {
    if (bb === 0n) return { sq: -1, bb: 0n };
    const sq = getLSBIndex(bb);
    return { sq, bb: bb & (bb - 1n) };
}

export function popCount(bb: bigint): number {
    let count = 0;
    let temp = bb & ALL;
    while (temp > 0n) {
        temp &= temp - 1n;
        count++;
    }
    return count;
}
