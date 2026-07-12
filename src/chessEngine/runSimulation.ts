import { Chess } from 'chess.js';
import { ChessEngine } from '../engine';
import { EngineConfig } from '../types';

async function runSimulation() {
  const claudeConfig: EngineConfig = {
    maxDepth: 4,
    personality: 'tactical',
    evalMode: 'hybrid',
    timeLimitMs: 50
  };

  const oldConfig: EngineConfig = {
    maxDepth: 4,
    personality: 'positional',
    evalMode: 'traditional',
    timeLimitMs: 50
  };

  let claudeWins = 0;
  let oldWins = 0;
  let draws = 0;

  console.log("Starting 10 simulation games...");

  for (let i = 0; i < 10; i++) {
    const chess = new Chess();
    const claudeEngine = new ChessEngine(claudeConfig);
    const oldEngine = new ChessEngine(oldConfig);

    while (!chess.isGameOver()) {
      const isClaudeTurn = (chess.turn() === 'w' && i % 2 === 0) || (chess.turn() === 'b' && i % 2 !== 0);
      const engine = isClaudeTurn ? claudeEngine : oldEngine;
      const result = await engine.search(chess.fen());
      if (!result.bestMove) break;
      chess.move(result.bestMove.san);
    }

    if (chess.isCheckmate()) {
      const winnerIsClaude = (chess.turn() === 'b' && i % 2 === 0) || (chess.turn() === 'w' && i % 2 !== 0);
      if (winnerIsClaude) claudeWins++;
      else oldWins++;
    } else {
      draws++;
    }
    console.log(`Game ${i + 1} finished.`);
  }

  console.log(`Results: Claude: ${claudeWins}, Old: ${oldWins}, Draws: ${draws}`);
  // Rough ELO estimation
  // Score = wins + 0.5 * draws
  // WinRate = Score / Games
  // R = 400 * log10(WinRate / (1 - WinRate)) + 1845
  const winRate = (claudeWins + 0.5 * draws) / 10;
  const eloAdjustment = 400 * Math.log10(winRate / (1 - winRate + 0.001));
  console.log(`Estimated ELO Adjustment: +${Math.round(eloAdjustment)}`);
}

runSimulation();
