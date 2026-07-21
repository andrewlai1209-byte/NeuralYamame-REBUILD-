import { Chess } from 'chess.js';

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
  };
}

export function buildOnlineGameSearchUrl(fen: string, origin?: string): string {
  if (origin) return `${origin}/api/master-games?fen=${encodeURIComponent(fen)}`;

  const params = new URLSearchParams({ fen, moves: '8', topGames: '3' });
  return `https://explorer.lichess.ovh/masters?${params.toString()}`;
}

export function mapExplorerDataToMove(fen: string, data: any): OnlineGameMoveResult | null {
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
      blackWins
    }
  };
}

export async function fetchOnlineGameMove(fen: string, fetchImpl: typeof fetch, origin?: string): Promise<OnlineGameMoveResult | null> {
  const response = await fetchImpl(buildOnlineGameSearchUrl(fen, origin), { headers: { Accept: 'application/json' } });
  if (!response.ok) return null;
  return mapExplorerDataToMove(fen, await response.json());
}
