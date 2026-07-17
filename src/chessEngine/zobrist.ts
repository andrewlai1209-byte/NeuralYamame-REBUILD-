/**
 * NeuralYamame REBUILD - Incremental Zobrist Hash System
 * 
 * Adheres to:
 * - First Law: Complete redesign for O(1) hash updates during makeMove/undoMove
 * - Second Law: Every line serves correctness and performance
 * - Fifth Law: Architecture designed before implementation
 * 
 * @module zobrist
 */

export const ZOBRIST_PIECE: bigint[][][] = []; // [color][piece][square]
export let ZOBRIST_SIDE: bigint = 0n;
export const ZOBRIST_CASTLING: bigint[] = []; // [0..15]
export const ZOBRIST_EP: bigint[] = []; // [0..8] (0-7 for files, 8 for no EP)

/**
 * High-quality PRNG for Zobrist key generation
 * Uses XorShift64 algorithm for excellent statistical properties
 */
function nextRandom(state: { seed: bigint }): bigint {
  state.seed ^= state.seed << 13n;
  state.seed = BigInt.asUintN(64, state.seed);
  state.seed ^= state.seed >> 7n;
  state.seed = BigInt.asUintN(64, state.seed);
  state.seed ^= state.seed << 17n;
  state.seed = BigInt.asUintN(64, state.seed);
  return state.seed;
}

/**
 * Initialize all Zobrist keys with high-quality random values
 * Called once at engine startup with deterministic seed for reproducibility
 */
export function initZobrist(): void {
  const state = { seed: 1070372n }; // Fixed seed for determinism

  // Initialize piece-square keys: [color][piece][square]
  for (let c = 0; c < 2; c++) {
    ZOBRIST_PIECE[c] = [];
    for (let p = 0; p < 6; p++) {
      ZOBRIST_PIECE[c][p] = [];
      for (let s = 0; s < 64; s++) {
        ZOBRIST_PIECE[c][p][s] = nextRandom(state);
      }
    }
  }

  // Initialize side-to-move key
  ZOBRIST_SIDE = nextRandom(state);

  // Initialize castling rights keys (16 possible states: 0b0000 to 0b1111)
  // Bits: 0=WK, 1=WQ, 2=BK, 3=BQ
  for (let i = 0; i < 16; i++) {
    ZOBRIST_CASTLING[i] = nextRandom(state);
  }

  // Initialize en passant keys (8 files + none)
  for (let i = 0; i < 9; i++) {
    ZOBRIST_EP[i] = nextRandom(state);
  }
}

// Auto-initialize on module load
initZobrist();
