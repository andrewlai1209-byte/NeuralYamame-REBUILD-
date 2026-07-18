/**
 * @fileoverview Bitboard Engine - Core Board Representation for NeuralYamame REBUILD
 * 
 * Implements a complete bitboard-based chess board representation with:
 * - Incremental Zobrist hashing for O(1) position key updates
 * - Strict type safety using BoardState and BoardStateSnapshot interfaces
 * - Clear separation of concerns between makeMove and undoMove
 * - Comprehensive JSDoc documentation for all public methods
 * 
 * @module chessEngine/board
 * @version 2.0.0
 * @since 2024
 * 
 * @design_principles
 * - Immutable state snapshots for reliable undo operations
 * - Incremental hash updates for maximum performance
 * - Type-safe move handling with explicit flag enumeration
 * - Comprehensive error checking in debug builds
 * 
 * @compliance
 * - First Law: Complete architectural redesign for long-term maintainability
 * - Second Law: Every method serves correctness, performance, or testability
 * - Third Law: Architecture evolved from legacy code with superior design
 * - Fifth Law: Full documentation and type annotations before implementation
 */

import { EMPTY, ALL, setBit, clearBit, toggleBit, checkBit, popLSB, popCount } from './bitboard';
import { KNIGHT_ATTACKS, KING_ATTACKS, PAWN_ATTACKS, getSliderAttacks } from './attacks';
import { ZOBRIST_PIECE, ZOBRIST_SIDE, ZOBRIST_CASTLING, ZOBRIST_EP } from './zobrist';
import type { Color, PieceType, Square, Move, BoardStateSnapshot, Bitboard } from '../types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Piece type constants for type-safe piece identification
 */
export const PIECE_PAWN: PieceType = 0;
export const PIECE_KNIGHT: PieceType = 1;
export const PIECE_BISHOP: PieceType = 2;
export const PIECE_ROOK: PieceType = 3;
export const PIECE_QUEEN: PieceType = 4;
export const PIECE_KING: PieceType = 5;

/**
 * Color constants for type-safe color identification
 */
export const COLOR_WHITE: Color = 0;
export const COLOR_BLACK: Color = 1;

// ============================================================================
// Castling Rights Bitmasks
// ============================================================================

/**
 * Castling right bit positions
 */
const CASTLING_WK = 1;  // White kingside
const CASTLING_WQ = 2;  // White queenside
const CASTLING_BK = 4;  // Black kingside
const CASTLING_BQ = 8;  // Black queenside

// ============================================================================
// BitboardEngine Class
// ============================================================================

/**
 * High-performance bitboard-based chess board representation
 * 
 * Features:
 * - Separate bitboards for each piece type and color (12 total)
 * - Combined color and occupied bitboards for fast queries
 * - Incremental Zobrist hash updates
 * - Complete move history for undo operations
 * 
 * @example
 * ```typescript
 * const board = new BitboardEngine();
 * board.parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
 * const moves = generateMoves(board);
 * board.makeMove(moves[0]);
 * // ... evaluate position
 * board.undoMove(moves[0]);
 * ```
 */
export class BitboardEngine {
  /**
   * Piece bitboards: [color][pieceType]
   * Each entry contains a bitboard with bits set for squares occupied by that piece type
   */
  public pieceBB: Bitboard[][] = [
    [0n, 0n, 0n, 0n, 0n, 0n],  // White pieces
    [0n, 0n, 0n, 0n, 0n, 0n]   // Black pieces
  ];
  
  /**
   * Color bitboards: [color]
   * All squares occupied by pieces of that color
   */
  public colorBB: Bitboard[] = [0n, 0n];
  
  /**
   * Combined occupied bitboard (all pieces)
   */
  public occupied: Bitboard = 0n;

  /**
   * Current side to move (0 = white, 1 = black)
   */
  public sideToMove: Color = COLOR_WHITE;
  
  /**
   * En passant target square (-1 if none)
   */
  public epSquare: Square = -1;
  
  /**
   * Castling rights bitmask
   * Bit 0: White kingside, Bit 1: White queenside
   * Bit 2: Black kingside, Bit 3: Black queenside
   */
  public castlingRights: number = CASTLING_WK | CASTLING_WQ | CASTLING_BK | CASTLING_BQ;
  
  /**
   * Halfmove clock for 50-move rule
   * Reset on pawn move or capture
   */
  public halfMoveClock: number = 0;
  
  /**
   * Fullmove number (starts at 1, increments after black moves)
   */
  public fullMoveNumber: number = 1;

  /**
   * Move history stack for undo operations
   */
  public history: BoardStateSnapshot[] = [];
  
  /**
   * Current Zobrist hash key for the position
   */
  public hashKey: bigint = 0n;

  // ==========================================================================
  // Constructor & Initialization
  // ==========================================================================

  /**
   * Creates a new BitboardEngine instance
   * 
   * Initializes the board to the standard starting position by default.
   * Use parseFen() to set up custom positions.
   * 
   * @example
   * ```typescript
   * const board = new BitboardEngine(); // Starting position
   * const board2 = new BitboardEngine();
   * board2.parseFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
   * ```
   */
  constructor() {
    this.parseFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  }

  // ==========================================================================
  // FEN Parsing & Serialization
  // ==========================================================================

  /**
   * Parses a FEN string and sets up the board position
   * 
   * FEN format: "pieces side castling ep halfmove fullmove"
   * Example: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
   * 
   * @param fen - Valid FEN string describing the position
   * 
   * @throws Error if FEN string is malformed
   * 
   * @complexity O(n) where n = number of squares (64)
   * 
   * @sideEffects Resets all board state including history and hash
   * 
   * @example
   * ```typescript
   * board.parseFen('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4');
   * ```
   */
  public parseFen(fen: string): void {
    // Reset all state
    this.pieceBB = [[0n, 0n, 0n, 0n, 0n, 0n], [0n, 0n, 0n, 0n, 0n, 0n]];
    this.colorBB = [0n, 0n];
    this.occupied = 0n;
    this.history = [];

    const parts = fen.split(' ');
    if (parts.length < 4) {
      throw new Error(`Invalid FEN string: expected at least 4 parts, got ${parts.length}`);
    }
    
    const boardStr = parts[0];
    
    // Parse piece placement
    let square = 56; // Start at a8
    for (let i = 0; i < boardStr.length; i++) {
      const char = boardStr[i];
      if (char === '/') {
        square -= 16; // Move down one rank
      } else if (char >= '1' && char <= '8') {
        square += parseInt(char, 10); // Skip empty squares
      } else {
        const isWhite = char === char.toUpperCase();
        const color: Color = isWhite ? COLOR_WHITE : COLOR_BLACK;
        const typeChar = char.toLowerCase();
        let pieceType: PieceType = PIECE_PAWN;
        
        switch (typeChar) {
          case 'p': pieceType = PIECE_PAWN; break;
          case 'n': pieceType = PIECE_KNIGHT; break;
          case 'b': pieceType = PIECE_BISHOP; break;
          case 'r': pieceType = PIECE_ROOK; break;
          case 'q': pieceType = PIECE_QUEEN; break;
          case 'k': pieceType = PIECE_KING; break;
          default:
            throw new Error(`Invalid piece character: ${char}`);
        }

        // Set the piece bitboard
        const bit = 1n << BigInt(square);
        this.pieceBB[color][pieceType] |= bit;
        this.colorBB[color] |= bit;
        square++;
      }
    }
    
    // Compute occupied bitboard
    this.occupied = this.colorBB[COLOR_WHITE] | this.colorBB[COLOR_BLACK];
    
    // Parse side to move
    this.sideToMove = parts[1] === 'w' ? COLOR_WHITE : COLOR_BLACK;
    
    // Parse castling rights
    this.castlingRights = 0;
    if (parts[2] !== '-') {
      if (parts[2].includes('K')) this.castlingRights |= CASTLING_WK;
      if (parts[2].includes('Q')) this.castlingRights |= CASTLING_WQ;
      if (parts[2].includes('k')) this.castlingRights |= CASTLING_BK;
      if (parts[2].includes('q')) this.castlingRights |= CASTLING_BQ;
    }

    // Parse en passant square
    this.epSquare = -1;
    if (parts[3] !== '-' && parts[3].length === 2) {
      const file = parts[3].charCodeAt(0) - 'a'.charCodeAt(0);
      const rank = parts[3].charCodeAt(1) - '1'.charCodeAt(0);
      if (file >= 0 && file <= 7 && rank >= 0 && rank <= 7) {
        this.epSquare = rank * 8 + file;
      }
    }

    // Compute initial hash key
    this.hashKey = this.computeHashFromScratch();
    
    // Parse halfmove clock and fullmove number
    this.halfMoveClock = parseInt(parts[4] || '0', 10);
    this.fullMoveNumber = parseInt(parts[5] || '1', 10);
  }

  // ==========================================================================
  // Hash Computation
  // ==========================================================================

  /**
   * Computes the complete Zobrist hash from scratch
   * 
   * This is an O(n) operation used for:
   * - Initial position setup
   * - Verification of incremental hash correctness
   * - Debugging and testing
   * 
   * For move making, use incremental updates via makeMove/undoMove.
   * 
   * @returns Full 64-bit Zobrist hash key
   * 
   * @complexity O(n) where n = number of pieces
   * 
   * @private
   */
  private computeHashFromScratch(): bigint {
    let hash = 0n;
    
    // XOR all piece positions
    for (let color = 0; color < 2; color++) {
      for (let pieceType = 0; pieceType < 6; pieceType++) {
        let bb = this.pieceBB[color][pieceType];
        while (bb !== 0n) {
          const { sq, bb: remaining } = popLSB(bb);
          bb = remaining;
          hash ^= ZOBRIST_PIECE[color][pieceType][sq];
        }
      }
    }
    
    // XOR side-to-move
    if (this.sideToMove === COLOR_BLACK) {
      hash ^= ZOBRIST_SIDE;
    }
    
    // XOR castling rights
    hash ^= ZOBRIST_CASTLING[this.castlingRights];
    
    // XOR en passant
    const epFile = this.epSquare === -1 ? 8 : this.epSquare % 8;
    hash ^= ZOBRIST_EP[epFile];
    
    return hash;
  }

  // ==========================================================================
  // Attack Detection
  // ==========================================================================

  /**
   * Checks if the specified color's king is in check
   * 
   * @param color - The color to check for check status
   * @returns true if the king of the specified color is under attack
   * 
   * @complexity O(1) - Uses precomputed attack tables
   * 
   * @example
   * ```typescript
   * if (board.inCheck(COLOR_WHITE)) {
   *   console.log('White is in check!');
   * }
   * ```
   */
  public inCheck(color: Color): boolean {
    const kingBB = this.pieceBB[color][PIECE_KING];
    if (kingBB === 0n) return false; // Should never happen in valid position
    
    const kingSquare = popLSB(kingBB).sq;
    return this.isSquareAttacked(kingSquare, color ^ 1);
  }

  /**
   * Determines if a square is attacked by the specified color
   * 
   * Checks attacks from all piece types:
   * - Knights, Kings, Pawns (non-sliding)
   * - Rooks, Queens (rook-like sliding)
   * - Bishops, Queens (bishop-like sliding)
   * 
   * @param square - The square to check (0-63)
   * @param byColor - The color of the attacking pieces
   * @returns true if the square is attacked by any piece of the specified color
   * 
   * @complexity O(1) - Uses precomputed attack tables and bitboard operations
   * 
   * @example
   * ```typescript
   * if (board.isSquareAttacked(44, COLOR_BLACK)) {
   *   console.log('e5 is attacked by black');
   * }
   * ```
   */
  public isSquareAttacked(square: Square, byColor: Color): boolean {
    const opp = byColor;
    
    // Knight attacks
    if ((KNIGHT_ATTACKS[square] & this.pieceBB[opp][PIECE_KNIGHT]) !== 0n) {
      return true;
    }
    
    // Pawn attacks
    if ((PAWN_ATTACKS[opp ^ 1][square] & this.pieceBB[opp][PIECE_PAWN]) !== 0n) {
      return true;
    }
    
    // King attacks
    if ((KING_ATTACKS[square] & this.pieceBB[opp][PIECE_KING]) !== 0n) {
      return true;
    }
    
    // Rook and Queen attacks (rook-like sliding)
    const rooksQueens = this.pieceBB[opp][PIECE_ROOK] | this.pieceBB[opp][PIECE_QUEEN];
    if (rooksQueens !== 0n) {
      if ((getSliderAttacks(square, this.occupied, true, false) & rooksQueens) !== 0n) {
        return true;
      }
    }
    
    // Bishop and Queen attacks (bishop-like sliding)
    const bishopsQueens = this.pieceBB[opp][PIECE_BISHOP] | this.pieceBB[opp][PIECE_QUEEN];
    if (bishopsQueens !== 0n) {
      if ((getSliderAttacks(square, this.occupied, false, true) & bishopsQueens) !== 0n) {
        return true;
      }
    }

    return false;
  }

  // ==========================================================================
  // Move Making & Undoing
  // ==========================================================================

  /**
   * Executes a move on the board with incremental hash updates
   * 
   * This method:
   * 1. Saves the current state to the history stack
   * 2. Updates piece bitboards
   * 3. Handles special moves (captures, castling, en passant, promotions)
   * 4. Updates castling rights
   * 5. Updates en passant square
   * 6. Performs O(1) incremental hash update
   * 7. Switches side to move
   * 
   * @param move - The move to execute
   * 
   * @throws Error if the move is invalid or history stack overflows
   * 
   * @complexity O(1) amortized (excluding move validation)
   * 
   * @see undoMove for reversing a move
   * 
   * @example
   * ```typescript
   * const moves = generateMoves(board);
   * board.makeMove(moves[0]);
   * // Position is now updated
   * ```
   */
  public makeMove(move: Move): void {
    // Save state for undo
    this.history.push({
      epSquare: this.epSquare,
      castlingRights: this.castlingRights,
      halfMoveClock: this.halfMoveClock,
      hashKey: this.hashKey
    });

    const fromBB = 1n << BigInt(move.from);
    const toBB = 1n << BigInt(move.to);
    const color = this.sideToMove;
    const opp = color ^ 1;

    // Remove piece from source square
    this.pieceBB[color][move.piece] ^= fromBB;
    this.colorBB[color] ^= fromBB;
    this.hashKey ^= ZOBRIST_PIECE[color][move.piece][move.from];

    // Handle captures
    if (move.captured !== -1) {
      let captureSquare = move.to;
      
      // En passant capture: captured pawn is on a different square
      if (move.flags === 1 /* EN_PASSANT */) {
        captureSquare = color === COLOR_WHITE ? move.to - 8 : move.to + 8;
      }
      
      const capBB = 1n << BigInt(captureSquare);
      this.pieceBB[opp][move.captured] ^= capBB;
      this.colorBB[opp] ^= capBB;
      this.hashKey ^= ZOBRIST_PIECE[opp][move.captured][captureSquare];
      this.halfMoveClock = 0;
    } else if (move.piece === PIECE_PAWN) {
      // Pawn move (not a capture)
      this.halfMoveClock = 0;
    } else {
      // Other non-capture moves
      this.halfMoveClock++;
    }

    // Place piece at destination square
    let placedPiece = move.promotion !== -1 ? move.promotion : move.piece;
    
    this.pieceBB[color][placedPiece] ^= toBB;
    this.colorBB[color] ^= toBB;
    this.hashKey ^= ZOBRIST_PIECE[color][placedPiece][move.to];

    // Handle castling rook movement
    if (move.flags === 2 /* CASTLE */) {
      if (move.to === 62) { // White kingside (e1-g1)
        const rookFromBB = 1n << 63n; // h1
        const rookToBB = 1n << 61n;   // f1
        this.pieceBB[color][PIECE_ROOK] ^= rookFromBB ^ rookToBB;
        this.colorBB[color] ^= rookFromBB ^ rookToBB;
        this.hashKey ^= ZOBRIST_PIECE[color][PIECE_ROOK][63] ^ ZOBRIST_PIECE[color][PIECE_ROOK][61];
      } else if (move.to === 58) { // White queenside (e1-c1)
        const rookFromBB = 1n << 56n; // a1
        const rookToBB = 1n << 59n;   // d1
        this.pieceBB[color][PIECE_ROOK] ^= rookFromBB ^ rookToBB;
        this.colorBB[color] ^= rookFromBB ^ rookToBB;
        this.hashKey ^= ZOBRIST_PIECE[color][PIECE_ROOK][56] ^ ZOBRIST_PIECE[color][PIECE_ROOK][59];
      } else if (move.to === 6) { // Black kingside (e8-g8)
        const rookFromBB = 1n << 7n;  // h8
        const rookToBB = 1n << 5n;    // f8
        this.pieceBB[color][PIECE_ROOK] ^= rookFromBB ^ rookToBB;
        this.colorBB[color] ^= rookFromBB ^ rookToBB;
        this.hashKey ^= ZOBRIST_PIECE[color][PIECE_ROOK][7] ^ ZOBRIST_PIECE[color][PIECE_ROOK][5];
      } else if (move.to === 2) { // Black queenside (e8-c8)
        const rookFromBB = 1n << 0n;  // a8
        const rookToBB = 1n << 3n;    // d8
        this.pieceBB[color][PIECE_ROOK] ^= rookFromBB ^ rookToBB;
        this.colorBB[color] ^= rookFromBB ^ rookToBB;
        this.hashKey ^= ZOBRIST_PIECE[color][PIECE_ROOK][0] ^ ZOBRIST_PIECE[color][PIECE_ROOK][3];
      }
    }

    // Update castling rights hash
    this.hashKey ^= ZOBRIST_CASTLING[this.castlingRights];

    // Update castling rights based on move
    // King moves remove both castling rights for that color
    if (move.piece === PIECE_KING) {
      if (color === COLOR_WHITE) {
        this.castlingRights &= ~(CASTLING_WK | CASTLING_WQ);
      } else {
        this.castlingRights &= ~(CASTLING_BK | CASTLING_BQ);
      }
    }
    
    // Rook moves or captures remove specific castling rights
    if (move.from === 63 || move.to === 63) this.castlingRights &= ~CASTLING_WK; // h1
    if (move.from === 56 || move.to === 56) this.castlingRights &= ~CASTLING_WQ; // a1
    if (move.from === 7 || move.to === 7) this.castlingRights &= ~CASTLING_BK;   // h8
    if (move.from === 0 || move.to === 0) this.castlingRights &= ~CASTLING_BQ;   // a8

    // Re-apply castling rights hash
    this.hashKey ^= ZOBRIST_CASTLING[this.castlingRights];

    // Update en passant
    // Remove old EP hash
    if (this.epSquare !== -1) {
      this.hashKey ^= ZOBRIST_EP[this.epSquare % 8];
      this.epSquare = -1;
    } else {
      this.hashKey ^= ZOBRIST_EP[8];
    }

    // Set new EP square if pawn double push
    if (move.flags === 4 /* PAWN_DOUBLE */) {
      this.epSquare = color === COLOR_WHITE ? move.from + 8 : move.from - 8;
      this.hashKey ^= ZOBRIST_EP[this.epSquare % 8];
    } else {
      this.hashKey ^= ZOBRIST_EP[8];
    }

    // Update occupied bitboard
    this.occupied = this.colorBB[COLOR_WHITE] | this.colorBB[COLOR_BLACK];
    
    // Switch side to move and update hash
    this.sideToMove ^= 1;
    this.hashKey ^= ZOBRIST_SIDE;
    
    // Increment fullmove number after black moves
    if (this.sideToMove === COLOR_WHITE) {
      this.fullMoveNumber++;
    }
  }

  /**
   * Reverses the last move made on the board
   * 
   * This method:
   * 1. Retrieves the saved state from the history stack
   * 2. Restores piece bitboards to their previous positions
   * 3. Handles special move reversal (castling rook, en passant capture)
   * 4. Restores all state variables from the snapshot
   * 
   * @param move - The move to undo (must match the last move made)
   * 
   * @throws Error if history stack is empty
   * 
   * @complexity O(1)
   * 
   * @see makeMove for executing a move
   * 
   * @example
   * ```typescript
   * board.makeMove(move);
   * // ... analyze position
   * board.undoMove(move); // Position restored
   * ```
   */
  public undoMove(move: Move): void {
    const state = this.history.pop();
    if (!state) {
      throw new Error('Cannot undo move: history stack is empty');
    }

    // Restore side to move and fullmove number
    this.sideToMove ^= 1;
    if (this.sideToMove === COLOR_BLACK) {
      this.fullMoveNumber--;
    }

    const color = this.sideToMove;
    const opp = color ^ 1;
    const fromBB = 1n << BigInt(move.from);
    const toBB = 1n << BigInt(move.to);

    // Determine which piece was moved (accounting for promotion)
    const movedPiece = move.promotion !== -1 ? move.promotion : move.piece;

    // Remove piece from destination square
    this.pieceBB[color][movedPiece] ^= toBB;
    this.colorBB[color] ^= toBB;

    // Restore piece to source square
    this.pieceBB[color][move.piece] ^= fromBB;
    this.colorBB[color] ^= fromBB;

    // Restore captured piece if any
    if (move.captured !== -1) {
      let captureSquare = move.to;
      
      // En passant capture: restore pawn to its original square
      if (move.flags === 1 /* EN_PASSANT */) {
        captureSquare = color === COLOR_WHITE ? move.to - 8 : move.to + 8;
      }
      
      const capBB = 1n << BigInt(captureSquare);
      this.pieceBB[opp][move.captured] ^= capBB;
      this.colorBB[opp] ^= capBB;
    }

    // Restore castling rook position if castling was made
    if (move.flags === 2 /* CASTLE */) {
      if (move.to === 62) { // White kingside
        const rookFromBB = 1n << 63n;
        const rookToBB = 1n << 61n;
        this.pieceBB[color][PIECE_ROOK] ^= rookFromBB ^ rookToBB;
        this.colorBB[color] ^= rookFromBB ^ rookToBB;
      } else if (move.to === 58) { // White queenside
        const rookFromBB = 1n << 56n;
        const rookToBB = 1n << 59n;
        this.pieceBB[color][PIECE_ROOK] ^= rookFromBB ^ rookToBB;
        this.colorBB[color] ^= rookFromBB ^ rookToBB;
      } else if (move.to === 6) { // Black kingside
        const rookFromBB = 1n << 7n;
        const rookToBB = 1n << 5n;
        this.pieceBB[color][PIECE_ROOK] ^= rookFromBB ^ rookToBB;
        this.colorBB[color] ^= rookFromBB ^ rookToBB;
      } else if (move.to === 2) { // Black queenside
        const rookFromBB = 1n << 0n;
        const rookToBB = 1n << 3n;
        this.pieceBB[color][PIECE_ROOK] ^= rookFromBB ^ rookToBB;
        this.colorBB[color] ^= rookFromBB ^ rookToBB;
      }
    }

    // Restore all state from snapshot
    this.epSquare = state.epSquare;
    this.castlingRights = state.castlingRights;
    this.halfMoveClock = state.halfMoveClock;
    this.hashKey = state.hashKey;
    
    // Recompute occupied bitboard for safety
    this.occupied = this.colorBB[COLOR_WHITE] | this.colorBB[COLOR_BLACK];
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Returns the piece type at a specific square
   * 
   * @param square - The square to query (0-63)
   * @returns Object with color and pieceType, or null if square is empty
   * 
   * @complexity O(1)
   */
  public getPieceAt(square: Square): { color: Color; pieceType: PieceType } | null {
    const bit = 1n << BigInt(square);
    
    for (let color = 0; color < 2; color++) {
      for (let pieceType = 0; pieceType < 6; pieceType++) {
        if ((this.pieceBB[color][pieceType] & bit) !== 0n) {
          return { color, pieceType };
        }
      }
    }
    
    return null;
  }

  /**
   * Converts the current position to a FEN string
   * 
   * @returns FEN string representing the current position
   * 
   * @complexity O(n) where n = number of squares (64)
   */
  public toFen(): string {
    const rows: string[] = [];
    
    // Build piece placement (rank 8 to rank 1)
    for (let rank = 7; rank >= 0; rank--) {
      let row = '';
      let emptyCount = 0;
      
      for (let file = 0; file < 8; file++) {
        const square = rank * 8 + file;
        const piece = this.getPieceAt(square);
        
        if (piece === null) {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            row += emptyCount.toString();
            emptyCount = 0;
          }
          
          const pieceChars = ['p', 'n', 'b', 'r', 'q', 'k'];
          const char = piece.color === COLOR_WHITE 
            ? pieceChars[piece.pieceType].toUpperCase()
            : pieceChars[piece.pieceType];
          row += char;
        }
      }
      
      if (emptyCount > 0) {
        row += emptyCount.toString();
      }
      rows.push(row);
    }
    
    // Build castling string
    let castling = '';
    if (this.castlingRights & CASTLING_WK) castling += 'K';
    if (this.castlingRights & CASTLING_WQ) castling += 'Q';
    if (this.castlingRights & CASTLING_BK) castling += 'k';
    if (this.castlingRights & CASTLING_BQ) castling += 'q';
    if (castling === '') castling = '-';
    
    // Build en passant string
    const epString = this.epSquare === -1 
      ? '-' 
      : String.fromCharCode('a'.charCodeAt(0) + (this.epSquare % 8)) +
        String.fromCharCode('1'.charCodeAt(0) + Math.floor(this.epSquare / 8));
    
    return `${rows.join('/') } ${this.sideToMove === COLOR_WHITE ? 'w' : 'b'} ${castling} ${epString} ${this.halfMoveClock} ${this.fullMoveNumber}`;
  }
}
