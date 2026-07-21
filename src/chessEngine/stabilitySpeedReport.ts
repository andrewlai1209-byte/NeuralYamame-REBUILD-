import { performance } from 'node:perf_hooks';
import { BitboardEngine } from './board';
import { generateMoves } from './movegen';
import { evaluate } from './evaluation';
import { EngineConfig } from '../types';

interface BenchPosition {
  name: string;
  fen: string;
}

interface BenchResult {
  name: string;
  legalMoves: number;
  evaluatedChildren: number;
  checksum: number;
  elapsedMs: number;
  positionsPerSecond: number;
  stable: boolean;
}

const positions: BenchPosition[] = [
  {
    name: 'Starting position movegen baseline',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  },
  {
    name: 'Developed middlegame pressure',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R b KQkq - 2 3'
  },
  {
    name: 'Castling-rights stress position',
    fen: 'r3k2r/pppq1ppp/2npbn2/4p3/4P3/2NPBN2/PPPQ1PPP/R3K2R w KQkq - 4 8'
  },
  {
    name: 'Promotion and king-safety edge case',
    fen: '4k3/P6p/8/8/8/8/p6P/4K3 w - - 0 1'
  }
];

const evalConfig: EngineConfig = {
  maxDepth: 1,
  personality: 'positional',
  evalMode: 'hybrid',
  enableOnlineGameSearch: false,
  quiescenceLimit: 2,
  maxCapturesToCheck: 4
};

function runPosition(position: BenchPosition, iterations = 250): BenchResult {
  const board = new BitboardEngine();
  board.parseFen(position.fen);

  const originalHash = board.hashKey;
  const started = performance.now();
  let evaluatedChildren = 0;
  let checksum = 0;
  let legalMoves = 0;

  for (let i = 0; i < iterations; i++) {
    const moves = generateMoves(board);
    legalMoves = moves.length;

    for (const move of moves) {
      board.makeMove(move);
      checksum += evaluate(board, evalConfig, 0.5);
      evaluatedChildren++;
      board.undoMove(move);
    }

    if (board.hashKey !== originalHash) {
      throw new Error(`Hash instability detected in ${position.name}`);
    }
  }

  const elapsedMs = performance.now() - started;
  const positionsPerSecond = elapsedMs > 0 ? Math.round((evaluatedChildren / elapsedMs) * 1000) : evaluatedChildren;

  return {
    name: position.name,
    legalMoves,
    evaluatedChildren,
    checksum,
    elapsedMs: Math.round(elapsedMs * 100) / 100,
    positionsPerSecond,
    stable: legalMoves > 0 && evaluatedChildren > 0 && Number.isFinite(checksum) && board.hashKey === originalHash
  };
}

function main() {
  const results = positions.map((position) => runPosition(position));
  const stableCount = results.filter((result) => result.stable).length;
  const totalElapsedMs = Math.round(results.reduce((sum, result) => sum + result.elapsedMs, 0) * 100) / 100;
  const totalEvaluatedChildren = results.reduce((sum, result) => sum + result.evaluatedChildren, 0);
  const aggregatePositionsPerSecond = totalElapsedMs > 0 ? Math.round((totalEvaluatedChildren / totalElapsedMs) * 1000) : totalEvaluatedChildren;

  console.log('=== NeuralYamame-REBUILD Stability & Speed Report ===');
  for (const result of results) {
    console.log(`[${result.stable ? 'STABLE' : 'UNSTABLE'}] ${result.name}`);
    console.log(`  legalMoves=${result.legalMoves} evaluatedChildren=${result.evaluatedChildren} checksum=${result.checksum} elapsedMs=${result.elapsedMs} positionsPerSecond=${result.positionsPerSecond}`);
  }
  console.log(`SUMMARY stable=${stableCount}/${results.length} totalEvaluatedChildren=${totalEvaluatedChildren} totalElapsedMs=${totalElapsedMs} aggregatePositionsPerSecond=${aggregatePositionsPerSecond}`);

  if (stableCount !== results.length) {
    process.exit(1);
  }
}

main();
