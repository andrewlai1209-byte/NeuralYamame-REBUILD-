/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Chess } from "chess.js";
import { BitboardEngine } from "./chessEngine/board";
import { EngineConfig, EnginePersonality, EnginePersonalityId } from './types';
import { findBookMove } from './openingBook';

import { PERSONALITIES, TRAINING_PROFILES } from './chessEngine/personalities';
import { evaluate, evaluateNNUE } from './chessEngine/evaluation';
import { TranspositionTable } from './chessEngine/tt';
import { ChessEngineSearch } from './chessEngine/search';
import { fetchOnlineGameMove } from './lib/onlineGameExplorer';

export { PERSONALITIES, TRAINING_PROFILES };

/**
 * High-level Chess Engine orchestration wrapper.
 * Acts as the platform-integration interface for UI and database interactions,
 * keeping the actual search and evaluation logic 100% pure and decoupled.
 */
export class ChessEngine {
  private config: EngineConfig;
  private static globalTransTable = new TranspositionTable(100000);
  private transTable = ChessEngine.globalTransTable;
  private searchRunner: ChessEngineSearch;

  constructor(config: EngineConfig) {
    this.config = config;
    this.searchRunner = new ChessEngineSearch(config, this.transTable);
  }

  /**
   * Update engine configuration dynamically
   */
  public updateConfig(newConfig: EngineConfig) {
    this.config = { ...this.config, ...newConfig };
    this.searchRunner.updateConfig(this.config);
  }

  /**
   * Evaluate a position from White's perspective
   */
  public evaluate(board: BitboardEngine, trainingProgress: number = 0.5): number {
    return evaluate(board, this.config, trainingProgress);
  }

  /**
   * Fast NNUE-like heuristic evaluator
   */
  public evaluateNNUE(chess: Chess): number {
    const board = new BitboardEngine();
    board.parseFen(chess.fen());
    return evaluateNNUE(board);
  }

  /**
   * Search for the absolute best move in the position
   */
  public async search(fen: string, trainingProgress: number = 0.5, moveHistory?: string[]): Promise<{
    bestMove: any;
    score: number;
    depth: number;
    nodes: number;
    nps: number;
    pv: string[];
    bookOpeningName?: string;
    leezaMctsNodes?: any[];
    leezaValueHead?: { whiteWin: number; draw: number; blackWin: number };
    policyMap?: Record<string, number>;
    onlineGameReference?: {
      source: string;
      games: number;
      whiteWins: number;
      draws: number;
      blackWins: number;
    };
  }> {
    const chess = new Chess(fen);

    // 1. Opening Book Integration
    const history = moveHistory || [];
    const bookMove = findBookMove(history);
    if (bookMove) {
      return {
        bestMove: bookMove.nextBookMove,
        score: 0,
        depth: 0,
        nodes: 0,
        nps: 0,
        pv: [bookMove.nextBookMove],
        bookOpeningName: bookMove.name
      };
    }

    // 1.25 Online master-game explorer integration. This is optional and
    // fail-safe: any network/API issue falls through to normal engine search.
    const onlineBookMove = await this.findOnlineMasterGameMove(fen);
    if (onlineBookMove) {
      return onlineBookMove;
    }

    // 1.5 Syzygy Endgame Tablebase Integration (7-piece or fewer)
    const pieceCount = fen.split(' ')[0].replace(/[\/1-8]/g, '').length;
    if (pieceCount <= 7) {
      try {
        let data: any = null;
        const isClient = typeof window !== 'undefined' || (typeof self !== 'undefined' && self.location && self.location.origin);
        if (isClient) {
          const origin = typeof self !== 'undefined' && self.location ? self.location.origin : '';
          const response = await fetch(`${origin}/api/syzygy?fen=${encodeURIComponent(fen)}`);
          if (response.ok) {
            data = await response.json();
          }
        } else {
          const response = await fetch(`https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`);
          if (response.ok) {
            data = await response.json();
          }
        }

        if (data && data.moves && data.moves.length > 0) {
          const bestMoveData = data.moves[0];
          const tempChess = new Chess(fen);
          let parsedMove = null;
          try {
            parsedMove = tempChess.move(bestMoveData.uci);
          } catch (err) {
            try {
              parsedMove = tempChess.move(bestMoveData.san);
            } catch (_) {}
          }

          if (parsedMove) {
            let score = 0;
            if (data.category === 'win' || bestMoveData.category === 'win') {
              score = tempChess.turn() === 'b' ? 20000 : -20000;
            } else if (data.category === 'loss' || bestMoveData.category === 'loss') {
              score = tempChess.turn() === 'b' ? -20000 : 20000;
            }
            
            return {
              bestMove: {
                san: parsedMove.san,
                from: parsedMove.from,
                to: parsedMove.to,
                piece: parsedMove.piece,
                color: parsedMove.color,
                promotion: parsedMove.promotion || undefined,
                lan: parsedMove.from + parsedMove.to + (parsedMove.promotion || '')
              },
              score: score,
              depth: data.dtz || 0,
              nodes: 1,
              nps: 1,
              pv: [parsedMove.san],
              bookOpeningName: "Syzygy Endgame Tablebase"
            };
          }
        }
      } catch (err) {
        console.warn("Syzygy tablebase lookup skipped:", err);
      }
    }

    // 2. Check Extension Heuristic: If in check or deep game, extend target search depth
    let modifiedDepth = this.config.maxDepth;
    if (chess.inCheck() || chess.history().length > 10) {
      modifiedDepth = (this.config.maxDepth || 2) + 1;
    }

    // Temporarily apply depth extensions dynamically
    const originalDepth = this.config.maxDepth;
    this.config.maxDepth = modifiedDepth;
    this.searchRunner.updateConfig(this.config);

    let result;

    // 3. Dispatch to specific modular search algorithms
    if (this.config.evalMode === 'leeza_mcts') {
      result = this.searchRunner.searchLEEZAMCTS(chess, trainingProgress);
    } else if (this.config.evalMode === 'stockfish_nnue') {
      result = this.searchRunner.searchStockfishNNUE(chess, trainingProgress);
    } else if (this.config.evalMode === 'komodo_mcts') {
      result = this.searchRunner.searchKomodoDragonMCTS(chess, trainingProgress);
    } else if (this.config.evalMode === 'patricia_neural') {
      result = this.searchRunner.searchPatriciaNeural(chess, trainingProgress);
    } else if (this.config.evalMode === 'nova_chess') {
      result = this.searchRunner.searchNovaChess(chess, trainingProgress);
    } else if (this.config.evalMode === 'lc0_neural') {
      result = this.searchRunner.searchLc0Neural(chess, trainingProgress);
    } else if (this.config.evalMode === 'torch_hybrid') {
      result = this.searchRunner.searchTorchHybrid(chess, trainingProgress);
    } else if (this.config.evalMode === 'pantheon_fusion') {
      result = this.searchRunner.searchPantheonFusion(chess, trainingProgress);
    } else if (this.config.evalMode === 'neuralcore_rl_selfplay') {
      // Fire-and-forget reinforcement learning database telemetry update
      this.updateRlTelemetry();
      result = this.searchRunner.searchDeepThemed(
        chess,
        trainingProgress,
        6,
        165000,
        2200,
        (c) => this.evaluate(c, trainingProgress),
        "TD-RL"
      );
    } else {
      // Default fallback search
      result = this.searchRunner.searchDeepThemed(
        chess,
        trainingProgress,
        this.config.maxDepth || 3,
        100000,
        50000,
        (c) => this.evaluate(c, trainingProgress),
        'default'
      );
    }

    // Restore configuration
    this.config.maxDepth = originalDepth;
    this.searchRunner.updateConfig(this.config);

    // Enrich bestMove with full Chess.js properties (from, to, piece, etc.)
    if (result.bestMove) {
      const tempChess = new Chess(fen);
      const moveObj = result.bestMove;
      if (moveObj) {
        try {
          const parsedMove = tempChess.move(moveObj.san || moveObj);
          if (parsedMove) {
            result.bestMove = {
              san: parsedMove.san,
              from: parsedMove.from,
              to: parsedMove.to,
              piece: parsedMove.piece,
              color: parsedMove.color,
              promotion: parsedMove.promotion || undefined,
              lan: parsedMove.from + parsedMove.to + (parsedMove.promotion || '')
            };
          }
        } catch (e) {
          // Fallback if chess.js move throws (e.g. if the move is invalid for any reason)
          if (typeof result.bestMove === 'string') {
            result.bestMove = { san: result.bestMove };
          }
        }
      }
    }

    // 4. Record experience asynchronously using local-first fail-safe buffers
    const sanMove = result.bestMove ? (result.bestMove.san || result.bestMove.toString()) : 'none';
    const isWorker = typeof window === 'undefined' && typeof self !== 'undefined';
    if (!isWorker) {
      import('./lib/rlExperience').then(({ saveExperience }) => {
        saveExperience({ fen, bestMove: sanMove, score: result.score }).catch(() => {});
      }).catch(() => {});
    }

    return result;
  }


  private async findOnlineMasterGameMove(fen: string) {
    if (this.config.enableOnlineGameSearch === false || typeof fetch === 'undefined') return null;

    try {
      const isBrowserLike = typeof window !== 'undefined' || (typeof self !== 'undefined' && !!self.location?.origin);
      const origin = isBrowserLike ? self.location.origin : undefined;
      return await fetchOnlineGameMove(fen, fetch, origin);
    } catch (err) {
      console.warn('Online master-game lookup skipped:', err);
      return null;
    }
  }

  /**
   * Save reinforcement learning global telemetry asynchronously
   */
  private async updateRlTelemetry() {
    const isWorker = typeof window === 'undefined' && typeof self !== 'undefined';
    if (isWorker) return;

    try {
      const { db } = await import('./lib/firebase');
      const { doc, getDoc, updateDoc, increment, setDoc } = await import('firebase/firestore');
      if (!db) return;

      const docRef = doc(db, 'rl_experience', 'global');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        await updateDoc(docRef, {
          totalEpisodes: increment(1),
          rewardsGathered: increment(1.0)
        });
      } else {
        await setDoc(docRef, {
          totalEpisodes: 1,
          rewardsGathered: 1.0
        });
      }
    } catch (e) {
      console.warn("Telemetry update deferred offline:", e);
    }
  }
}
