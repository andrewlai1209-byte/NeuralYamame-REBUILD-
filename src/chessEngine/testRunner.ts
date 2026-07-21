import { setBit, clearBit, toggleBit, checkBit, popLSB, popCount } from './bitboard';
import { BitboardEngine, COLOR_WHITE, COLOR_BLACK, PIECE_PAWN, PIECE_KING, PIECE_ROOK } from './board';
import { generateMoves } from './movegen';
import { verifyMoveGen } from './perft';
import { nnueEvaluator } from './nnue';
import { ChessEngineSearch } from './search';
import { TranspositionTable } from './tt';
import { evaluate } from './evaluation';
import { Chess } from 'chess.js';
import { mapExplorerDataToMove } from '../lib/onlineGameExplorer';

async function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
  } catch (error: any) {
    console.error(`[FAIL] ${name}: ${error.message}`);
    process.exit(1);
  }
}

console.log("=== NEURALCORE CORE ENGINE TEST SUITE ===");

// 1. Bitboard Core Operations
await runTest("Bitboard Operator Core Math", () => {
  let bb = 0n;
  
  // setBit
  bb = setBit(bb, 0);
  bb = setBit(bb, 63);
  if (!checkBit(bb, 0) || !checkBit(bb, 63)) throw new Error("setBit/checkBit failed");
  if (checkBit(bb, 10)) throw new Error("invalid checkBit positive");

  // popCount
  if (popCount(bb) !== 2) throw new Error("popCount failed");

  // clearBit
  bb = clearBit(bb, 0);
  if (checkBit(bb, 0)) throw new Error("clearBit failed");
  if (popCount(bb) !== 1) throw new Error("popCount after clearBit failed");

  // toggleBit
  bb = toggleBit(bb, 32);
  if (!checkBit(bb, 32)) throw new Error("toggleBit failed to set");
  bb = toggleBit(bb, 32);
  if (checkBit(bb, 32)) throw new Error("toggleBit failed to clear");

  // popLSB
  bb = 0n;
  bb = setBit(bb, 5);
  bb = setBit(bb, 20);
  const { sq: sq1, bb: bb1 } = popLSB(bb);
  if (sq1 !== 5) throw new Error(`popLSB first index failed: expected 5 got ${sq1}`);
  const { sq: sq2, bb: bb2 } = popLSB(bb1);
  if (sq2 !== 20 || bb2 !== 0n) throw new Error("popLSB second index failed");
});

// 2. Precomputed attacks
await runTest("Basic Attack Generation Matrices", () => {
  const board = new BitboardEngine();
  // Ensure we can check check states
  const inCheck = board.inCheck(COLOR_WHITE);
  if (inCheck) throw new Error("Standard starting position is in check!");
});

// 3. Move Generator & Perft
await runTest("Bitboard MoveGen & Perft Accuracy", () => {
  const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const perftRes = verifyMoveGen(fen, 1);
  if (!perftRes.matched || perftRes.customNodes !== 20) {
    throw new Error(`Perft Depth 1 failed: custom nodes = ${perftRes.customNodes}`);
  }

  const perftRes2 = verifyMoveGen(fen, 2);
  if (!perftRes2.matched || perftRes2.customNodes !== 400) {
    throw new Error(`Perft Depth 2 failed: custom nodes = ${perftRes2.customNodes}`);
  }
  console.log(`  - Perft D1: ${perftRes.customNodes} nodes (matched)`);
  console.log(`  - Perft D2: ${perftRes2.customNodes} nodes (matched)`);
});


// 4. Castling legality and board updates
await runTest("Castling Move Generation & Rook Relocation", () => {
  const board = new BitboardEngine();
  board.parseFen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");

  const whiteCastles = generateMoves(board).filter((move) => move.piece === PIECE_KING && move.flags === 2);
  if (!whiteCastles.some((move) => move.from === 4 && move.to === 6)) {
    throw new Error("White king-side castling was not generated");
  }
  if (!whiteCastles.some((move) => move.from === 4 && move.to === 2)) {
    throw new Error("White queen-side castling was not generated");
  }

  const kingSideCastle = whiteCastles.find((move) => move.to === 6)!;
  board.makeMove(kingSideCastle);
  if (!checkBit(board.pieceBB[COLOR_WHITE][PIECE_KING], 6)) {
    throw new Error("White king did not land on g1 after castling");
  }
  if (!checkBit(board.pieceBB[COLOR_WHITE][PIECE_ROOK], 5)) {
    throw new Error("White rook did not land on f1 after castling");
  }
  board.undoMove(kingSideCastle);

  board.parseFen("r3k2r/8/8/8/8/8/6r1/R3K2R w KQkq - 0 1");
  const attackedDestinationCastles = generateMoves(board).filter((move) => move.piece === PIECE_KING && move.flags === 2);
  if (attackedDestinationCastles.some((move) => move.from === 4 && move.to === 6)) {
    throw new Error("White king-side castling was generated onto an attacked square");
  }

  board.parseFen("r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1");
  const blackCastles = generateMoves(board).filter((move) => move.piece === PIECE_KING && move.flags === 2);
  if (!blackCastles.some((move) => move.from === 60 && move.to === 62)) {
    throw new Error("Black king-side castling was not generated");
  }
  if (!blackCastles.some((move) => move.from === 60 && move.to === 58)) {
    throw new Error("Black queen-side castling was not generated");
  }
});


// 5. Online game explorer integration
await runTest("Online Master Game Search Integration", () => {
  const result = mapExplorerDataToMove('rnbqkbnr/pppppppp/8/8/8/P7/1PPPPPPP/RNBQKBNR b KQkq - 0 1', {
    source: 'Mock Masters Explorer',
    moves: [{ san: 'e5', white: 100, draws: 25, black: 125 }]
  });

  if (result?.bestMove.san !== 'e5') {
    throw new Error(`Online explorer move was not applied: ${JSON.stringify(result?.bestMove)}`);
  }
  if (result.onlineGameReference.games !== 250) {
    throw new Error('Online explorer game statistics were not attached');
  }
});


// 6. Search quiescence capture filtering debug
await runTest("Search Completes With Quiet Quiescence Moves", () => {
  const searcher = new ChessEngineSearch({ maxDepth: 1, personality: 'positional', evalMode: 'hybrid' }, new TranspositionTable(1000));
  const result = searcher.searchDeepThemed(
    new Chess(),
    0.5,
    1,
    1000,
    1000,
    (board) => evaluate(board, { maxDepth: 1, personality: 'positional', evalMode: 'hybrid' }, 0.5),
    'debug'
  );

  if (!result.bestMove || result.nodes <= 0 || !Number.isFinite(result.score)) {
    throw new Error(`Search did not produce a stable result: ${JSON.stringify(result)}`);
  }
});

// 7. NNUE & Accumulator Updates
await runTest("NNUE Incremental Accumulator Flow", () => {
  const board = new BitboardEngine();
  const accum = nnueEvaluator.computeAccumulators(board);
  const val1 = nnueEvaluator.evaluateAccumulators(accum.accumWhite, accum.accumBlack);

  // Apply e2-e4
  const move = { from: 12, to: 28, piece: PIECE_PAWN, captured: -1, promotion: -1, flags: 4 };
  nnueEvaluator.updateAccumulators(accum.accumWhite, accum.accumBlack, move, COLOR_WHITE);
  const val2 = nnueEvaluator.evaluateAccumulators(accum.accumWhite, accum.accumBlack);

  if (typeof val1 !== 'number' || typeof val2 !== 'number') {
    throw new Error("NNUE evaluation values are non-numeric");
  }
  console.log(`  - Standard NNUE position rating: ${val1}`);
  console.log(`  - e2-e4 NNUE position rating: ${val2}`);
});

console.log("\n[SUCCESS] All core chess engine diagnostics passed perfectly!");
