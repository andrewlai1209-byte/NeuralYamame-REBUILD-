// src/workers/search.worker.ts
import { Chess } from 'chess.js';
import { ChessEngine } from '../engine';

self.onmessage = async (e: MessageEvent) => {
  const { fen, config, trainingProgress, trainedWeights, history, moveHistory } = e.data;
  const chess = new Chess(fen);
  const engine = new ChessEngine(config);
  
  // Perform the search passing move history if available
  const result = await engine.search(fen, trainingProgress, history || moveHistory);
  
  self.postMessage(result);
};
