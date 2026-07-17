import { Chess } from 'chess.js';
import { BitboardEngine, COLOR_WHITE } from './board';
import { Move, generateMoves } from './movegen';
import { EngineConfig } from '../types';
import { TranspositionTable, TTEntry } from './tt';
import { sortMoves } from './moveOrdering';
import { popCount } from './bitboard';

export class ChessEngineSearch {
  private config: EngineConfig;
  private transTable: TranspositionTable;
  private nodes: number = 0;
  private stopSearch: boolean = false;
  private startTime: number = 0;
  private timeLimitMs: number = 0;
  private maxNodes: number = 0;
  private killerMoves: Move[][] = new Array(100).fill(0).map(() => []);
  private historyMoves: Record<string, number> = {};
  private counterMoves: Record<string, Move> = {};

  constructor(config: EngineConfig, transTable: TranspositionTable) {
    this.config = config;
    this.transTable = transTable;
  }

  public updateConfig(config: EngineConfig) {
    this.config = config;
  }

  public searchDeepThemed(
    chess: Chess,
    trainingProgress: number,
    depth: number,
    maxNodes: number,
    timeLimitMs: number,
    evalFunc: (b: BitboardEngine) => number,
    themeName: string
  ) {
    const board = new BitboardEngine();
    board.parseFen(chess.fen());
    return this.searchDeepThemedInternal(board, trainingProgress, depth, maxNodes, timeLimitMs, evalFunc, themeName);
  }
  
  public searchDeepThemedInternal(
    board: BitboardEngine,
    trainingProgress: number,
    depth: number,
    maxNodes: number,
    timeLimitMs: number,
    evalFunc: (b: BitboardEngine) => number,
    themeName: string
  ) {
    this.nodes = 0;
    this.stopSearch = false;
    this.startTime = performance.now();
    this.timeLimitMs = timeLimitMs;
    this.maxNodes = maxNodes;
    this.counterMoves = {}; // Clear countermoves for the new search iteration
    const startTime = this.startTime;
    let bestMove: Move | null = null;
    let bestScore = -Infinity;
    let currentDepth = 1;
    let alpha = -100000;
    let beta = 100000;
    const windowSize = 50;

    // Iterative Deepening
    while (currentDepth <= depth) {
      if (this.nodes >= maxNodes || (performance.now() - startTime) > timeLimitMs) {
        break;
      }
      const isWhite = board.sideToMove === COLOR_WHITE;

      let result = this.alphaBeta(board, currentDepth, 0, alpha, beta, isWhite, evalFunc);

      // Aspiration window failure handling
      if (result.score <= alpha || result.score >= beta) {
        alpha = -100000;
        beta = 100000;
        result = this.alphaBeta(board, currentDepth, 0, alpha, beta, isWhite, evalFunc);
      }

      if (result.move && !this.stopSearch) {
        bestMove = result.move;
        bestScore = result.score;
        alpha = bestScore - windowSize;
        beta = bestScore + windowSize;
      }
      currentDepth++;
    }

    const duration = performance.now() - startTime;
    return {
      bestMove: bestMove ? {
        from: String.fromCharCode(97 + (bestMove.from % 8)) + (Math.floor(bestMove.from / 8) + 1),
        to: String.fromCharCode(97 + (bestMove.to % 8)) + (Math.floor(bestMove.to / 8) + 1),
        promotion: bestMove.promotion ? ['p','n','b','r','q','k'][bestMove.promotion] : undefined
      } : null,
      score: bestScore,
      depth: currentDepth - 1,
      nodes: this.nodes,
      nps: Math.round(this.nodes / (duration / 1000)),
      pv: bestMove ? [bestMove] : []
    };
  }

  private alphaBeta(
    board: BitboardEngine,
    depth: number,
    ply: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    evalFunc: (b: BitboardEngine) => number,
    allowNull: boolean = true,
    prevMove: Move | null = null
  ): { score: number; move: Move | null } {
    this.nodes++;
    
    // Time management check every 2048 nodes
    if ((this.nodes & 2047) === 0 && this.nodes > 0) {
       if (this.nodes >= this.maxNodes || (performance.now() - this.startTime) > this.timeLimitMs) {
          this.stopSearch = true;
       }
    }

    if (this.stopSearch) return { score: 0, move: null };

    // Mate Distance Pruning
    const mateAlpha = -99999 + ply;
    const mateBeta = 99999 - ply;
    if (alpha < mateAlpha) {
      alpha = mateAlpha;
      if (alpha >= beta) return { score: alpha, move: null };
    }
    if (beta > mateBeta) {
      beta = mateBeta;
      if (alpha >= beta) return { score: beta, move: null };
    }

    const fenKey = board.hashKey;
    
    const ttEntry = this.transTable.get(fenKey);
    if (ttEntry && ttEntry.depth >= depth) {
      if (ttEntry.flag === 0) return { score: ttEntry.score, move: ttEntry.bestMove };
      if (ttEntry.flag === 1 && ttEntry.score <= alpha) return { score: alpha, move: ttEntry.bestMove };
      if (ttEntry.flag === 2 && ttEntry.score >= beta) return { score: beta, move: ttEntry.bestMove };
    }

    if (depth <= 0) {
      if (board.inCheck(board.sideToMove) && ply < (this.config.maxDepth || 3) + 4) {
        // Check Extension: search 1 ply deeper instead of dropping straight into quiescence search
        return this.alphaBeta(board, 1, ply, alpha, beta, isMaximizing, evalFunc, false, prevMove);
      }
      const score = this.quiesce(board, alpha, beta, isMaximizing, evalFunc, ply);
      return { score, move: null };
    }

    // Reverse Futility Pruning (Static Null Move Pruning)
    if (depth <= 3 && ply > 0 && !board.inCheck(board.sideToMove)) {
       const staticEval = evalFunc(board);
       const margin = 120 * depth;
       if (isMaximizing && staticEval - margin >= beta) {
          return { score: beta, move: null };
       }
       if (!isMaximizing && staticEval + margin <= alpha) {
          return { score: alpha, move: null };
       }
    }

    // Null Move Pruning (disabled in endgame to avoid Zugzwang issues)
    if (allowNull && depth >= 3 && !board.inCheck(board.sideToMove)) {
       // Disable null move in endgame when few pieces remain (Zugzwang risk)
       const pieceCount = popCount(board.occupied);
       if (pieceCount > 8) {
         board.sideToMove ^= 1;
         const oldEp = board.epSquare;
         board.epSquare = -1;
         
         const R = depth > 6 ? 3 : 2;
         const ev = this.alphaBeta(board, depth - 1 - R, ply + 1, alpha, beta, !isMaximizing, evalFunc, false, null).score;
         
         board.sideToMove ^= 1;
         board.epSquare = oldEp;
         
         if (isMaximizing && ev >= beta) return { score: beta, move: null };
         if (!isMaximizing && ev <= alpha) return { score: alpha, move: null };
       }
    }

    // Futility Pruning
    if (depth <= 3 && !board.inCheck(board.sideToMove) && isMaximizing) {
       const staticEval = evalFunc(board);
       const futilityMargin = [0, 100, 300, 500]; // Depends on depth
       if (staticEval + futilityMargin[depth] <= alpha) {
          return { score: this.quiesce(board, alpha, beta, isMaximizing, evalFunc), move: null };
       }
    } else if (depth <= 3 && !board.inCheck(board.sideToMove) && !isMaximizing) {
       const staticEval = evalFunc(board);
       const futilityMargin = [0, 100, 300, 500]; // Depends on depth
       if (staticEval - futilityMargin[depth] >= beta) {
          return { score: this.quiesce(board, alpha, beta, isMaximizing, evalFunc), move: null };
       }
    }

    const rawMoves = generateMoves(board);
    if (rawMoves.length === 0) {
      return { score: board.inCheck(board.sideToMove) ? (isMaximizing ? -99999 + ply : 99999 - ply) : 0, move: null };
    }

    const ttMove = ttEntry ? rawMoves.find(m => m.from === (ttEntry.bestMove as any).from && m.to === (ttEntry.bestMove as any).to) : null;
    const moves = sortMoves(board, rawMoves, depth, ttMove, this.killerMoves, this.historyMoves, this.counterMoves, prevMove);

    let bestMove: Move | null = moves[0] || null;
    let i = 0;

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const m of moves) {
        board.makeMove(m);
        
        let ev: number;
        // Principal Variation Search (PVS) + Late Move Reductions (LMR)
        if (i === 0) {
            ev = this.alphaBeta(board, depth - 1, ply + 1, alpha, beta, false, evalFunc, true, m).score;
        } else {
            let d = depth - 1;
            // LMR condition
            if (depth >= 3 && i >= 3 && !m.captured && m.flags !== 2 && !board.inCheck(board.sideToMove)) {
                d--;
            }
            // Null window search
            ev = this.alphaBeta(board, d, ply + 1, alpha, alpha + 1, false, evalFunc, true, m).score;
            if (ev > alpha && ev < beta) {
                // Re-search with full window
                ev = this.alphaBeta(board, depth - 1, ply + 1, alpha, beta, false, evalFunc, true, m).score;
            }
        }
        
        board.undoMove(m);

        if (ev > maxEval) {
          maxEval = ev;
          bestMove = m;
        }
        alpha = Math.max(alpha, ev);
        if (beta <= alpha) {
          if (!m.captured) {
            if (!this.killerMoves[depth]) this.killerMoves[depth] = [];
            this.killerMoves[depth].unshift(m);
            if (this.killerMoves[depth].length > 2) this.killerMoves[depth].pop();
            const historyKey = `${m.from}_${m.to}_${m.promotion || ''}`;
            this.historyMoves[historyKey] = (this.historyMoves[historyKey] || 0) + depth * depth;

            // Store Countermove
            if (prevMove) {
              const prevKey = `${prevMove.from}_${prevMove.to}`;
              this.counterMoves[prevKey] = m;
            }
          }
          this.transTable.set(fenKey, depth, maxEval, 2, bestMove);
          break;
        }
        i++;
      }
      this.transTable.set(fenKey, depth, maxEval, 0, bestMove);
      return { score: maxEval, move: bestMove };
    } else {
      let minEval = Infinity;
      for (const m of moves) {
        board.makeMove(m);
        
        let ev: number;
        // PVS + LMR
        if (i === 0) {
            ev = this.alphaBeta(board, depth - 1, ply + 1, alpha, beta, true, evalFunc, true, m).score;
        } else {
            let d = depth - 1;
            if (depth >= 3 && i >= 3 && !m.captured && m.flags !== 2 && !board.inCheck(board.sideToMove)) {
                d--;
            }
            ev = this.alphaBeta(board, d, ply + 1, beta - 1, beta, true, evalFunc, true, m).score;
            if (ev > alpha && ev < beta) {
                ev = this.alphaBeta(board, depth - 1, ply + 1, alpha, beta, true, evalFunc, true, m).score;
            }
        }
        
        board.undoMove(m);

        if (ev < minEval) {
          minEval = ev;
          bestMove = m;
        }
        beta = Math.min(beta, ev);
        if (beta <= alpha) {
          if (!m.captured) {
            if (!this.killerMoves[depth]) this.killerMoves[depth] = [];
            this.killerMoves[depth].unshift(m);
            if (this.killerMoves[depth].length > 2) this.killerMoves[depth].pop();
            const historyKey = `${m.from}_${m.to}_${m.promotion || ''}`;
            this.historyMoves[historyKey] = (this.historyMoves[historyKey] || 0) + depth * depth;

            // Store Countermove
            if (prevMove) {
              const prevKey = `${prevMove.from}_${prevMove.to}`;
              this.counterMoves[prevKey] = m;
            }
          }
          this.transTable.set(fenKey, depth, minEval, 1, bestMove);
          break;
        }
        i++;
      }
      this.transTable.set(fenKey, depth, minEval, 0, bestMove);
      return { score: minEval, move: bestMove };
    }
  }

  // Quiescence search limits horizon effect
  private quiesce(board: BitboardEngine, alpha: number, beta: number, isMaximizing: boolean, evalFunc: (b: BitboardEngine) => number, ply: number = 0): number {
    this.nodes++;
    
    const inCheck = board.inCheck(board.sideToMove);
    const standPat = inCheck ? -99999 + ply : evalFunc(board);

    if (!inCheck) {
      if (isMaximizing) {
        if (standPat >= beta) return beta;
        if (alpha < standPat) alpha = standPat;
      } else {
        if (standPat <= alpha) return alpha;
        if (beta > standPat) beta = standPat;
      }
    }

    const rawMoves = generateMoves(board);
    // If in check, we must search all moves to find an escape. Otherwise, only search captures.
    const movesToTry = inCheck ? rawMoves : rawMoves.filter(m => m.captured);
    
    // Sort moves to try by MVV-LVA logic internally
    movesToTry.sort((a, b) => {
      const pVals: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
      const valA = a.captured ? ((pVals[a.captured] || 0) * 10 - (pVals[a.piece] || 0)) : 0;
      const valB = b.captured ? ((pVals[b.captured] || 0) * 10 - (pVals[b.piece] || 0)) : 0;
      return valB - valA;
    });

    if (isMaximizing) {
      let val = standPat;
      for (const m of movesToTry) {
        board.makeMove(m);
        const ev = this.quiesce(board, alpha, beta, false, evalFunc, ply + 1);
        board.undoMove(m);

        if (ev >= beta) return beta;
        if (ev > alpha) alpha = ev;
        val = Math.max(val, ev);
      }
      return inCheck && movesToTry.length === 0 ? -99999 + ply : alpha;
    } else {
      let val = standPat;
      for (const m of movesToTry) {
        board.makeMove(m);
        const ev = this.quiesce(board, alpha, beta, true, evalFunc, ply + 1);
        board.undoMove(m);

        if (ev <= alpha) return alpha;
        if (ev < beta) beta = ev;
        val = Math.min(val, ev);
      }
      return inCheck && movesToTry.length === 0 ? 99999 - ply : beta;
    }
  }

  // Define other fallback stubs to maintain interface compatibility
  public searchLEEZAMCTS(chess: Chess, trainingProgress: number) { return this.searchDeepThemed(chess, trainingProgress, this.config.maxDepth || 3, 200000, 3000, (c) => evalFuncNNUEFallback(c), "LEEZAMCTS"); }
  public searchStockfishNNUE(chess: Chess, trainingProgress: number) { return this.searchDeepThemed(chess, trainingProgress, this.config.maxDepth || 3, 200000, 3000, (c) => evalFuncNNUEFallback(c), "StockfishNNUE"); }
  public searchKomodoDragonMCTS(chess: Chess, trainingProgress: number) { return this.searchDeepThemed(chess, trainingProgress, this.config.maxDepth || 3, 200000, 3000, (c) => evalFuncNNUEFallback(c), "KomodoDragonMCTS"); }
  public searchPatriciaNeural(chess: Chess, trainingProgress: number) { return this.searchDeepThemed(chess, trainingProgress, this.config.maxDepth || 3, 200000, 3000, (c) => evalFuncNNUEFallback(c), "PatriciaNeural"); }
  public searchNovaChess(chess: Chess, trainingProgress: number) { return this.searchDeepThemed(chess, trainingProgress, this.config.maxDepth || 3, 200000, 3000, (c) => evalFuncNNUEFallback(c), "NovaChess"); }
  public searchLc0Neural(chess: Chess, trainingProgress: number) { return this.searchDeepThemed(chess, trainingProgress, this.config.maxDepth || 3, 200000, 3000, (c) => evalFuncNNUEFallback(c), "Lc0Neural"); }
  public searchTorchHybrid(chess: Chess, trainingProgress: number) { return this.searchDeepThemed(chess, trainingProgress, this.config.maxDepth || 3, 200000, 3000, (c) => evalFuncNNUEFallback(c), "TorchHybrid"); }
  public searchPantheonFusion(chess: Chess, trainingProgress: number) { return this.searchDeepThemed(chess, trainingProgress, this.config.maxDepth || 3, 200000, 3000, (c) => evalFuncNNUEFallback(c), "PantheonFusion"); }
}

import { evaluateNNUE } from './evaluation';
function evalFuncNNUEFallback(board: BitboardEngine): number {
  return evaluateNNUE(board);
}
