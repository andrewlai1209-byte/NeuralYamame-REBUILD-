export interface TTEntry {
  key: bigint;
  depth: number;
  score: number;
  flag: number; // 0 = EXACT, 1 = ALPHA, 2 = BETA
  bestMove: any;
}

export class TranspositionTable {
  private entries: (TTEntry | null)[];
  private maxEntries: number;

  constructor(maxSizeMB: number = 256) { // Increased default from 64MB to 256MB for 16M entries
    // Approx 32 bytes per entry in JS (object overhead). Let's be conservative.
    const entrySize = 32; 
    const numEntries = Math.floor((maxSizeMB * 1024 * 1024) / entrySize);
    
    // Nearest power of 2 for fast modulo
    this.maxEntries = 1;
    while (this.maxEntries <= numEntries && this.maxEntries < 16777216) { // 16M = 2^24
      this.maxEntries <<= 1;
    }
    if (this.maxEntries > 16777216) { this.maxEntries >>= 1; } // back down to fit 16M

    this.entries = new Array(this.maxEntries).fill(null);
  }

  public get(key: bigint): TTEntry | null {
    // In JS bitwise works on 32-bit, so for large mod we use BigInt mod
    // Wait, maxEntries is a power of 2, so we can use bitwise AND if we cast key to Number.
    // However, JS bitwise limits to 32 bits.
    const index = Number(key & BigInt(this.maxEntries - 1));
    const entry = this.entries[index];
    if (entry && entry.key === key) {
      return entry;
    }
    return null;
  }

  public set(key: bigint, depth: number, score: number, flag: number, bestMove: any): void {
    const index = Number(key & BigInt(this.maxEntries - 1));
    const existing = this.entries[index];
    
    // Always replace strategy or replace if depth >= existing depth
    if (!existing || existing.key !== key || depth >= existing.depth) {
      this.entries[index] = { key, depth, score, flag, bestMove };
    }
  }

  public clear(): void {
    this.entries.fill(null);
  }

  public size(): number {
    return this.maxEntries;
  }
}
