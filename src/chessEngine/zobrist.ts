export const ZOBRIST_PIECE: bigint[][][] = []; // [color][piece][square]
export let ZOBRIST_SIDE: bigint = 0n;
export const ZOBRIST_CASTLING: bigint[] = []; // [0..15]
export const ZOBRIST_EP: bigint[] = []; // [0..8] (0-7 for files, 8 for no EP)

function nextRandom(state: { seed: bigint }): bigint {
  state.seed ^= state.seed << 13n;
  // JavaScript bitwise operations on BigInt do not truncate to 64 bits automatically,
  // we must manually truncate it to 64 bits using BigInt.asUintN
  state.seed = BigInt.asUintN(64, state.seed);
  state.seed ^= state.seed >> 7n;
  state.seed = BigInt.asUintN(64, state.seed);
  state.seed ^= state.seed << 17n;
  state.seed = BigInt.asUintN(64, state.seed);
  return state.seed;
}

export function initZobrist() {
  const state = { seed: 1070372n }; // Fixed seed for determinism

  for (let c = 0; c < 2; c++) {
    ZOBRIST_PIECE[c] = [];
    for (let p = 0; p < 6; p++) {
      ZOBRIST_PIECE[c][p] = [];
      for (let s = 0; s < 64; s++) {
        ZOBRIST_PIECE[c][p][s] = nextRandom(state);
      }
    }
  }

  ZOBRIST_SIDE = nextRandom(state);

  for (let i = 0; i < 16; i++) {
    ZOBRIST_CASTLING[i] = nextRandom(state);
  }

  for (let i = 0; i < 9; i++) {
    ZOBRIST_EP[i] = nextRandom(state);
  }
}

initZobrist();
