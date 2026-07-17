/**
 * NeuralYamame REBUILD - Board Representation with Incremental Hash
 * 
 * Adheres to:
 * - First Law: Complete redesign for O(1) incremental hash updates
 * - Second Law: Every line serves correctness and performance
 * - Fifth Law: Architecture designed before implementation
 * 
 * Key improvements over legacy:
 * - Incremental Zobrist hash updates (O(1) vs O(n))
 * - Clear separation of board state and hash management
 * - Type-safe move application
 */

import { EMPTY, ALL, setBit, clearBit, toggleBit, checkBit, popLSB, popCount } from './bitboard';
import { KNIGHT_ATTACKS, KING_ATTACKS, PAWN_ATTACKS, getRookAttacks, getBishopAttacks, getQueenAttacks } from './attacks';
import { ZOBRIST_PIECE, ZOBRIST_SIDE, ZOBRIST_CASTLING, ZOBRIST_EP } from './zobrist';
import { Move } from './movegen';

export const PIECE_PAWN = 0;
export const PIECE_KNIGHT = 1;
export const PIECE_BISHOP = 2;
export const PIECE_ROOK = 3;
export const PIECE_QUEEN = 4;
export const PIECE_KING = 5;

export const COLOR_WHITE = 0;
export const COLOR_BLACK = 1;

/**
 * Board state snapshot for undo operations
 */
interface BoardState {
  epSquare: number;
  castlingRights: number;
  halfMoveClock: number;
  hashKey: bigint;
}

export class BitboardEngine {
  public pieceBB: bigint[][] = [
    [0n, 0n, 0n, 0n, 0n, 0n],
    [0n, 0n, 0n, 0n, 0n, 0n]
  ];
  public colorBB: bigint[] = [0n, 0n];
  public occupied: bigint = 0n;

  public sideToMove: number = COLOR_WHITE;
  public epSquare: number = -1; // 0-63, -1 if none
  public castlingRights: number = 15; // WK=1, WQ=2, BK=4, BQ=8
  public halfMoveClock: number = 0;
  public fullMoveNumber: number = 1;

  public history: BoardState[] = [];
  public hashKey: bigint = 0n;

  constructor() {
    this.parseFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  }

  /**
   * Parse FEN string and initialize board state
   * Includes incremental hash computation from scratch
   */
  public parseFen(fen: string): void {
    this.pieceBB = [[0n,0n,0n,0n,0n,0n], [0n,0n,0n,0n,0n,0n]];
    this.colorBB = [0n, 0n];
    this.occupied = 0n;
    this.history = [];
    this.hashKey = 0n;

    const parts = fen.split(' ');
    const boardStr = parts[0];
    
    let sq = 56; // a8
    for (let i = 0; i < boardStr.length; i++) {
      const char = boardStr[i];
      if (char === '/') {
        sq -= 15; // Move to next rank: h8=63 -> a7=48, subtract 15
      } else if (char >= '1' && char <= '8') {
        sq += parseInt(char, 10);
      } else {
        const isWhite = char === char.toUpperCase();
        const color = isWhite ? COLOR_WHITE : COLOR_BLACK;
        const typeChar = char.toLowerCase();
        let type = -1;
        if (typeChar === 'p') type = PIECE_PAWN;
        if (typeChar === 'n') type = PIECE_KNIGHT;
        if (typeChar === 'b') type = PIECE_BISHOP;
        if (typeChar === 'r') type = PIECE_ROOK;
        if (typeChar === 'q') type = PIECE_QUEEN;
        if (typeChar === 'k') type = PIECE_KING;

        if (type !== -1) {
          const bit = 1n << BigInt(sq);
          this.pieceBB[color][type] |= bit;
          this.colorBB[color] |= bit;
          // Incrementally update hash
          this.hashKey ^= ZOBRIST_PIECE[color][type][sq];
        }
        sq++;
      }
    }
    
    this.occupied = this.colorBB[COLOR_WHITE] | this.colorBB[COLOR_BLACK];
    this.sideToMove = parts[1] === 'w' ? COLOR_WHITE : COLOR_BLACK;
    
    // Update hash for side to move
    if (this.sideToMove === COLOR_BLACK) {
      this.hashKey ^= ZOBRIST_SIDE;
    }
    
    this.castlingRights = 0;
    if (parts[2] !== '-') {
      if (parts[2].includes('K')) this.castlingRights |= 1;
      if (parts[2].includes('Q')) this.castlingRights |= 2;
      if (parts[2].includes('k')) this.castlingRights |= 4;
      if (parts[2].includes('q')) this.castlingRights |= 8;
    }
    // Update hash for castling rights
    this.hashKey ^= ZOBRIST_CASTLING[this.castlingRights];

    this.epSquare = -1;
    if (parts[3] !== '-') {
      const file = parts[3].charCodeAt(0) - 'a'.charCodeAt(0);
      const rank = parts[3].charCodeAt(1) - '1'.charCodeAt(0);
      this.epSquare = rank * 8 + file;
      // Update hash for en passant
      this.hashKey ^= ZOBRIST_EP[this.epSquare % 8];
    } else {
      this.hashKey ^= ZOBRIST_EP[8];
    }

    this.halfMoveClock = parseInt(parts[4] || '0', 10);
    this.fullMoveNumber = parseInt(parts[5] || '1', 10);
  }

  /**
   * Check if a square is attacked by a given color
   * Uses Magic Bitboards for O(1) slider attack generation
   */
  public isSquareAttacked(sq: number, byColor: number): boolean {
    const opp = byColor;
    
    // Knights
    if ((KNIGHT_ATTACKS[sq] & this.pieceBB[opp][PIECE_KNIGHT]) !== 0n) return true;
    
    // Pawns
    if ((PAWN_ATTACKS[opp ^ 1][sq] & this.pieceBB[opp][PIECE_PAWN]) !== 0n) return true;
    
    // King
    if ((KING_ATTACKS[sq] & this.pieceBB[opp][PIECE_KING]) !== 0n) return true;
    
    // Sliders - Rooks and Queens
    const rooksQueens = this.pieceBB[opp][PIECE_ROOK] | this.pieceBB[opp][PIECE_QUEEN];
    if (rooksQueens !== 0n) {
      if ((getRookAttacks(sq, this.occupied) & rooksQueens) !== 0n) return true;
    }
    
    // Bishops and Queens
    const bishopsQueens = this.pieceBB[opp][PIECE_BISHOP] | this.pieceBB[opp][PIECE_QUEEN];
    if (bishopsQueens !== 0n) {
      if ((getBishopAttacks(sq, this.occupied) & bishopsQueens) !== 0n) return true;
    }

    return false;
  }

  /**
   * Check if the current side's king is in check
   */
  public inCheck(color: number): boolean {
    const kingBB = this.pieceBB[color][PIECE_KING];
    if (kingBB === 0n) return false;
    const kingSq = popLSB(kingBB).sq;
    return this.isSquareAttacked(kingSq, color ^ 1);
  }

  /**
   * Apply a move to the board with O(1) incremental hash update
   * This is the critical path function for search performance
   */
  public makeMove(m: Move): void {
    // Save state for undo
    this.history.push({
      epSquare: this.epSquare,
      castlingRights: this.castlingRights,
      halfMoveClock: this.halfMoveClock,
      hashKey: this.hashKey
    });

    const fromBB = 1n << BigInt(m.from);
    const toBB = 1n << BigInt(m.to);
    const color = this.sideToMove;
    const opp = color ^ 1;

    // Remove piece from source square
    this.pieceBB[color][m.piece] ^= fromBB;
    this.colorBB[color] ^= fromBB;
    this.hashKey ^= ZOBRIST_PIECE[color][m.piece][m.from];

    // Handle captures (including en passant)
    if (m.captured !== -1) {
      let capSq = m.to;
      if (m.flags === 1) { // En passant
        capSq = color === COLOR_WHITE ? m.to - 8 : m.to + 8;
      }
      const capBB = 1n << BigInt(capSq);
      this.pieceBB[opp][m.captured] ^= capBB;
      this.colorBB[opp] ^= capBB;
      this.hashKey ^= ZOBRIST_PIECE[opp][m.captured][capSq];
      this.halfMoveClock = 0;
    } else if (m.piece === PIECE_PAWN) {
      this.halfMoveClock = 0;
    } else {
      this.halfMoveClock++;
    }

    // Place piece at destination (handle promotion)
    let putPiece = m.promotion !== -1 ? m.promotion : m.piece;
    
    this.pieceBB[color][putPiece] ^= toBB;
    this.colorBB[color] ^= toBB;
    this.hashKey ^= ZOBRIST_PIECE[color][putPiece][m.to];

    // Handle castling rook moves
    if (m.flags === 2) { // Castling
      if (m.to === 62) { // White kingside
        this.pieceBB[color][PIECE_ROOK] ^= (1n << 63n) | (1n << 61n);
        this.colorBB[color] ^= (1n << 63n) | (1n << 61n);
        this.hashKey ^= ZOBRIST_PIECE[color][PIECE_ROOK][63] ^ ZOBRIST_PIECE[color][PIECE_ROOK][61];
      } else if (m.to === 58) { // White queenside
        this.pieceBB[color][PIECE_ROOK] ^= (1n << 56n) | (1n << 59n);
        this.colorBB[color] ^= (1n << 56n) | (1n << 59n);
        this.hashKey ^= ZOBRIST_PIECE[color][PIECE_ROOK][56] ^ ZOBRIST_PIECE[color][PIECE_ROOK][59];
      } else if (m.to === 6) { // Black kingside
        this.pieceBB[color][PIECE_ROOK] ^= (1n << 7n) | (1n << 5n);
        this.colorBB[color] ^= (1n << 7n) | (1n << 5n);
        this.hashKey ^= ZOBRIST_PIECE[color][PIECE_ROOK][7] ^ ZOBRIST_PIECE[color][PIECE_ROOK][5];
      } else if (m.to === 2) { // Black queenside
        this.pieceBB[color][PIECE_ROOK] ^= (1n << 0n) | (1n << 3n);
        this.colorBB[color] ^= (1n << 0n) | (1n << 3n);
        this.hashKey ^= ZOBRIST_PIECE[color][PIECE_ROOK][0] ^ ZOBRIST_PIECE[color][PIECE_ROOK][3];
      }
    }

    // Update castling rights hash
    this.hashKey ^= ZOBRIST_CASTLING[this.castlingRights];

    // Update castling rights
    if (m.piece === PIECE_KING) {
      if (color === COLOR_WHITE) this.castlingRights &= ~(1 | 2);
      else this.castlingRights &= ~(4 | 8);
    }
    if (m.from === 63 || m.to === 63) this.castlingRights &= ~1;
    if (m.from === 56 || m.to === 56) this.castlingRights &= ~2;
    if (m.from === 7 || m.to === 7) this.castlingRights &= ~4;
    if (m.from === 0 || m.to === 0) this.castlingRights &= ~8;

    this.hashKey ^= ZOBRIST_CASTLING[this.castlingRights];

    // Update en passant
    if (this.epSquare !== -1) {
      this.hashKey ^= ZOBRIST_EP[this.epSquare % 8];
    } else {
      this.hashKey ^= ZOBRIST_EP[8];
    }

    if (m.flags === 4) { // Double pawn push
      this.epSquare = color === COLOR_WHITE ? m.from + 8 : m.from - 8;
      this.hashKey ^= ZOBRIST_EP[this.epSquare % 8];
    } else {
      this.epSquare = -1;
      this.hashKey ^= ZOBRIST_EP[8];
    }

    // Update occupied bitboard
    this.occupied = this.colorBB[COLOR_WHITE] | this.colorBB[COLOR_BLACK];
    
    // Switch side to move
    this.sideToMove ^= 1;
    this.hashKey ^= ZOBRIST_SIDE;
    
    if (this.sideToMove === COLOR_WHITE) this.fullMoveNumber++;
  }

  /**
   * Undo the last move with O(1) hash restoration
   */
  public undoMove(m: Move): void {
    const state = this.history.pop();
    if (!state) return;

    this.sideToMove ^= 1;
    if (this.sideToMove === COLOR_BLACK) this.fullMoveNumber--;

    const color = this.sideToMove;
    const opp = color ^ 1;
    const fromBB = 1n << BigInt(m.from);
    const toBB = 1n << BigInt(m.to);

    let putPiece = m.promotion !== -1 ? m.promotion : m.piece;

    this.pieceBB[color][putPiece] ^= toBB;
    this.colorBB[color] ^= toBB;

    this.pieceBB[color][m.piece] ^= fromBB;
    this.colorBB[color] ^= fromBB;

    if (m.captured !== -1) {
      let capSq = m.to;
      if (m.flags === 1) capSq = color === COLOR_WHITE ? m.to - 8 : m.to + 8;
      const capBB = 1n << BigInt(capSq);
      this.pieceBB[opp][m.captured] ^= capBB;
      this.colorBB[opp] ^= capBB;
    }

    if (m.flags === 2) { // Restore castling rook
      if (m.to === 62) {
        this.pieceBB[color][PIECE_ROOK] ^= (1n << 63n) | (1n << 61n);
        this.colorBB[color] ^= (1n << 63n) | (1n << 61n);
      } else if (m.to === 58) {
        this.pieceBB[color][PIECE_ROOK] ^= (1n << 56n) | (1n << 59n);
        this.colorBB[color] ^= (1n << 56n) | (1n << 59n);
      } else if (m.to === 6) {
        this.pieceBB[color][PIECE_ROOK] ^= (1n << 7n) | (1n << 5n);
        this.colorBB[color] ^= (1n << 7n) | (1n << 5n);
      } else if (m.to === 2) {
        this.pieceBB[color][PIECE_ROOK] ^= (1n << 0n) | (1n << 3n);
        this.colorBB[color] ^= (1n << 0n) | (1n << 3n);
      }
    }

    // Restore all state from snapshot (O(1))
    this.epSquare = state.epSquare;
    this.castlingRights = state.castlingRights;
    this.halfMoveClock = state.halfMoveClock;
    this.hashKey = state.hashKey;
    this.occupied = this.colorBB[COLOR_WHITE] | this.colorBB[COLOR_BLACK];
  }
}
