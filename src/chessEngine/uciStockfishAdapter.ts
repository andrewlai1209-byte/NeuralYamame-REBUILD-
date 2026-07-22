import { spawn } from 'node:child_process';

export interface StockfishComparisonResult {
  enabled: boolean;
  neuralYamameMove?: string | null;
  stockfishMove?: string | null;
  matches?: boolean;
  depth?: number;
  reason?: string;
}

export function parseBestMove(output: string): string | null {
  const match = output.match(/(?:^|\n)bestmove\s+(\S+)/);
  if (!match || match[1] === '(none)') return null;
  return match[1];
}

export async function getStockfishBestMove(fen: string, depth = 8, stockfishPath = process.env.STOCKFISH_PATH): Promise<StockfishComparisonResult> {
  if (!stockfishPath) {
    return { enabled: false, reason: 'STOCKFISH_PATH is not configured.' };
  }

  return new Promise((resolve) => {
    const engine = spawn(stockfishPath, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    let settled = false;
    const safeDepth = Math.min(20, Math.max(1, depth));

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        engine.kill();
        resolve({ enabled: true, stockfishMove: null, depth: safeDepth, reason: 'Stockfish timed out.' });
      }
    }, 5000);

    engine.stdout.on('data', (chunk) => {
      output += chunk.toString();
      const bestMove = parseBestMove(output);
      if (bestMove && !settled) {
        settled = true;
        clearTimeout(timeout);
        engine.kill();
        resolve({ enabled: true, stockfishMove: bestMove, depth: safeDepth });
      }
    });

    engine.on('error', (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({ enabled: false, reason: error.message });
      }
    });

    engine.on('close', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({ enabled: true, stockfishMove: parseBestMove(output), depth: safeDepth, reason: 'Stockfish exited before bestmove.' });
      }
    });

    engine.stdin.write('uci\n');
    engine.stdin.write('isready\n');
    engine.stdin.write(`position fen ${fen}\n`);
    engine.stdin.write(`go depth ${safeDepth}\n`);
  });
}
