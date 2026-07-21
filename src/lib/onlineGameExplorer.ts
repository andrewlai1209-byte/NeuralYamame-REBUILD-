import { Chess } from 'chess.js';

export interface OnlineGameThresholds {
  minOnlineGames?: number;
  minWinRateEdge?: number;
  maxDrawRate?: number;
}

export const DEFAULT_ONLINE_GAME_THRESHOLDS: Required<OnlineGameThresholds> = {
  minOnlineGames: 25,
  minWinRateEdge: 0,
  maxDrawRate: 0.95
};

export interface OnlineGameMoveResult {
  bestMove: {
    san: string;
    from: string;
    to: string;
    piece: string;
    color: string;
    promotion?: string;
    lan: string;
  };
  score: number;
  depth: number;
  nodes: number;
  nps: number;
  pv: string[];
  bookOpeningName: string;
  onlineGameReference: {
    source: string;
    games: number;
    whiteWins: number;
    draws: number;
    blackWins: number;
    drawRate: number;
    winRateEdge: number;
  };
}

export function buildOnlineGameSearchUrl(fen: string, origin?: string): string {
  if (origin) return `${origin}/api/master-games?fen=${encodeURIComponent(fen)}`;

  const params = new URLSearchParams({ fen, moves: '8', topGames: '3' });
  return `https://explorer.lichess.ovh/masters?${params.toString()}`;
}

export function mapExplorerDataToMove(fen: string, data: any, thresholds: OnlineGameThresholds = {}): OnlineGameMoveResult | null {
  const candidate = Array.isArray(data?.moves) ? data.moves[0] : null;
  if (!candidate?.san) return null;

  const tempChess = new Chess(fen);
  const parsedMove = tempChess.move(candidate.san);
  if (!parsedMove) return null;

  const whiteWins = Number(candidate.white || 0);
  const draws = Number(candidate.draws || 0);
  const blackWins = Number(candidate.black || 0);
  const games = whiteWins + draws + blackWins;
  if (games <= 0) return null;

  const mergedThresholds = { ...DEFAULT_ONLINE_GAME_THRESHOLDS, ...thresholds };
  const drawRate = draws / games;
  const winRateEdge = Math.abs(whiteWins - blackWins) / games;
  if (games < mergedThresholds.minOnlineGames) return null;
  if (winRateEdge < mergedThresholds.minWinRateEdge) return null;
  if (drawRate > mergedThresholds.maxDrawRate) return null;

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
    score: Math.round(((whiteWins - blackWins) / games) * 100),
    depth: 0,
    nodes: games,
    nps: 0,
    pv: [parsedMove.san],
    bookOpeningName: `Online master games: ${parsedMove.san}`,
    onlineGameReference: {
      source: data.source || 'Lichess Masters Explorer',
      games,
      whiteWins,
      draws,
      blackWins,
      drawRate,
      winRateEdge
    }
  };
}

export async function fetchOnlineGameMove(fen: string, fetchImpl: typeof fetch, origin?: string, thresholds: OnlineGameThresholds = {}): Promise<OnlineGameMoveResult | null> {
  const response = await fetchImpl(buildOnlineGameSearchUrl(fen, origin), { headers: { Accept: 'application/json' } });
  if (!response.ok) return null;
  return mapExplorerDataToMove(fen, await response.json(), thresholds);
}
