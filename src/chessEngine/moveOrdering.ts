import { Move } from './movegen';
import { BitboardEngine } from './board';

/**
 * Sort moves to optimize Alpha-Beta Pruning (PV move / MVV-LVA / Killer Moves / History Heuristics)
 */
export function sortMoves(
  board: BitboardEngine,
  moves: Move[],
  ply: number,
  ttMove: Move | null,
  killerMoves: Move[][],
  historyMoves: Record<string, number>,
  counterMoves?: Record<string, Move>,
  prevMove?: Move | null
): Move[] {
  const valueMap = [100, 320, 330, 500, 900, 20000]; // PAWN=0, KNIGHT=1, BISHOP=2, ROOK=3, QUEEN=4, KING=5
  
  return moves.map(m => {
    let priority = 0;
    
    // 1. PV/TT Best Move has highest priority
    if (ttMove && m.from === ttMove.from && m.to === ttMove.to && m.promotion === ttMove.promotion) {
      priority += 100000;
    }

    // 2. Captures: MVV-LVA (Most Valuable Victim, Least Valuable Assault)
    if (m.captured !== -1) {
      priority += 10000 + valueMap[m.captured] - (valueMap[m.piece] / 100);
    } else if (m.flags === 1) { // En passant
      priority += 10000 + valueMap[0] - (valueMap[0] / 100);
    }

    // 3. Promotion
    if (m.promotion !== -1) {
      priority += 9000 + valueMap[m.promotion];
    }

    // 4. Killer Moves (quiet moves that caused beta cutoffs in sibling nodes at this depth)
    const plyKillers = killerMoves[ply];
    if (plyKillers) {
      if (plyKillers[0] && m.from === plyKillers[0].from && m.to === plyKillers[0].to) {
        priority += 8000;
      } else if (plyKillers[1] && m.from === plyKillers[1].from && m.to === plyKillers[1].to) {
        priority += 7000;
      }
    }

    // 4.5 Countermove Heuristic (CMH) - Quiet responses to previous move
    if (prevMove && counterMoves) {
      const prevKey = `${prevMove.from}_${prevMove.to}`;
      const cm = counterMoves[prevKey];
      if (cm && m.from === cm.from && m.to === cm.to && m.promotion === cm.promotion) {
        priority += 7500; // Ordered just after killer move 1
      }
    }

    // 5. Checks
    board.makeMove(m);
    if (board.inCheck(board.sideToMove)) {
      priority += 5000;
    }
    board.undoMove(m);

    // 6. History Heuristics for quiet moves
    if (m.captured === -1 && m.flags !== 1) {
      const historyKey = `${m.from}_${m.to}_${m.promotion}`;
      const historyScore = historyMoves[historyKey] || 0;
      priority += Math.min(4000, historyScore);
    }

    // 7. Castling
    if (m.flags === 2) {
      priority += 1000;
    }
    
    return { move: m, priority };
  })
  .sort((a, b) => b.priority - a.priority)
  .map(x => x.move);
}
