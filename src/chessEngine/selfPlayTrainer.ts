import { mkdirSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { BitboardEngine, COLOR_WHITE } from './board';
import { generateMoves, Move } from './movegen';
import { evaluate } from './evaluation';
import { EngineConfig } from '../types';

interface TrainingSample {
  game: number;
  ply: number;
  fen: string;
  move: string;
  score: number;
  legalMoves: number;
  result: string;
}

const config: EngineConfig = {
  maxDepth: 1,
  personality: 'positional',
  evalMode: 'hybrid',
  enableOnlineGameSearch: false,
  quiescenceLimit: 2,
  maxCapturesToCheck: 4
};

function moveToUci(move: Move): string {
  const from = String.fromCharCode(97 + (move.from % 8)) + (Math.floor(move.from / 8) + 1);
  const to = String.fromCharCode(97 + (move.to % 8)) + (Math.floor(move.to / 8) + 1);
  const promotion = move.promotion !== -1 ? ['p', 'n', 'b', 'r', 'q', 'k'][move.promotion] : '';
  return `${from}${to}${promotion}`;
}

function selectBestMove(board: BitboardEngine): { move: Move; score: number; legalMoves: number } | null {
  const moves = generateMoves(board);
  if (moves.length === 0) return null;

  const maximizing = board.sideToMove === COLOR_WHITE;
  let bestMove = moves[0];
  let bestScore = maximizing ? -Infinity : Infinity;

  for (const move of moves) {
    board.makeMove(move);
    const score = evaluate(board, config, 0.5);
    board.undoMove(move);

    if ((maximizing && score > bestScore) || (!maximizing && score < bestScore)) {
      bestMove = move;
      bestScore = score;
    }
  }

  return { move: bestMove, score: bestScore, legalMoves: moves.length };
}

function runSelfPlay(games = 2, maxPlies = 24): TrainingSample[] {
  const samples: TrainingSample[] = [];

  for (let game = 1; game <= games; game++) {
    const board = new BitboardEngine();
    const chess = new Chess();

    for (let ply = 1; ply <= maxPlies; ply++) {
      const selected = selectBestMove(board);
      if (!selected) break;

      const fen = boardToFen(board);
      const move = moveToUci(selected.move);
      chess.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] });
      board.makeMove(selected.move);

      samples.push({
        game,
        ply,
        fen,
        move,
        score: selected.score,
        legalMoves: selected.legalMoves,
        result: chess.isGameOver() ? chessResult(chess) : '*'
      });

      if (chess.isGameOver()) break;
    }
  }

  return samples;
}

function boardToFen(board: BitboardEngine): string {
  return `${boardToPlacement(board)} ${board.sideToMove === COLOR_WHITE ? 'w' : 'b'} ${castlingToFen(board.castlingRights)} ${board.epSquare === -1 ? '-' : squareToAlgebraic(board.epSquare)} ${board.halfMoveClock} ${board.fullMoveNumber}`;
}

function boardToPlacement(board: BitboardEngine): string {
  const pieces = ['p', 'n', 'b', 'r', 'q', 'k'];
  const ranks: string[] = [];

  for (let rank = 7; rank >= 0; rank--) {
    let row = '';
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const sq = rank * 8 + file;
      let piece = '';
      for (let color = 0; color < 2; color++) {
        for (let type = 0; type < 6; type++) {
          if ((board.pieceBB[color][type] & (1n << BigInt(sq))) !== 0n) {
            piece = color === COLOR_WHITE ? pieces[type].toUpperCase() : pieces[type];
          }
        }
      }
      if (piece) {
        if (empty > 0) row += empty.toString();
        empty = 0;
        row += piece;
      } else {
        empty++;
      }
    }
    if (empty > 0) row += empty.toString();
    ranks.push(row);
  }

  return ranks.join('/');
}

function castlingToFen(rights: number): string {
  let fen = '';
  if (rights & 1) fen += 'K';
  if (rights & 2) fen += 'Q';
  if (rights & 4) fen += 'k';
  if (rights & 8) fen += 'q';
  return fen || '-';
}

function squareToAlgebraic(square: number): string {
  return String.fromCharCode(97 + (square % 8)) + (Math.floor(square / 8) + 1);
}

function chessResult(chess: Chess): string {
  if (chess.isCheckmate()) return chess.turn() === 'w' ? '0-1' : '1-0';
  return '1/2-1/2';
}

function main() {
  const samples = runSelfPlay();
  mkdirSync('training-runs', { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = `training-runs/selfplay-${timestamp}.jsonl`;
  writeFileSync(outputPath, samples.map((sample) => JSON.stringify(sample)).join('\n') + '\n');

  const averageLegalMoves = samples.length > 0
    ? samples.reduce((sum, sample) => sum + sample.legalMoves, 0) / samples.length
    : 0;

  console.log('=== NeuralYamame-REBUILD Self-Play Training Export ===');
  console.log(`samples=${samples.length} games=2 maxPlies=24 averageLegalMoves=${averageLegalMoves.toFixed(2)} output=${outputPath}`);
}

main();
