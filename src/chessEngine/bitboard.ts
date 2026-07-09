export const EMPTY = 0n;
export const ALL = 0xffffffffffffffffn;

// Helper for fast LSB (Bitscan Forward) using native-optimized Math.clz32
function getLSBIndex(bb: bigint): number {
    const low = Number(bb & 0xffffffffn);
    if (low !== 0) {
        return 31 - Math.clz32(low & -low);
    }
    const high = Number((bb >> 32n) & 0xffffffffn);
    if (high !== 0) {
        return 63 - Math.clz32(high & -high);
    }
    return -1;
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
