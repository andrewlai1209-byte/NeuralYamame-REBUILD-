/**
 * @fileoverview Magic Bitboards Attack Generation for NeuralYamame REBUILD
 * 
 * Implements high-performance attack generation using Magic Bitboards technique.
 * This replaces the O(n) slider attack generation with O(1) table lookups.
 * 
 * @module chessEngine/attacks
 * @version 2.0.0
 * @since 2024
 * 
 * @design_principles
 * - O(1) attack generation for all piece types
 * - Precomputed magic numbers and tables for maximum performance
 * - Type-safe interfaces for all public APIs
 * - Comprehensive JSDoc documentation
 * 
 * @compliance
 * - First Law: Complete architectural redesign replacing legacy O(n) logic
 * - Second Law: Every function serves correctness or performance
 * - Third Law: Superior architecture over existing code
 */

import type { Square, Bitboard } from '../types';

// ============================================================================
// File Masks
// ============================================================================

const NOT_A_FILE = 0xfefefefefefefefen;
const NOT_H_FILE = 0x7f7f7f7f7f7f7f7fn;
const NOT_AB_FILE = 0xfcfcfcfcfcfcfcfcn;
const NOT_GH_FILE = 0x3f3f3f3f3f3f3f3fn;

// ============================================================================
// Precomputed Attack Tables
// ============================================================================

/**
 * Knight attacks for each square (precomputed)
 */
export const KNIGHT_ATTACKS: Bitboard[] = new Array(64).fill(0n);

/**
 * King attacks for each square (precomputed)
 */
export const KING_ATTACKS: Bitboard[] = new Array(64).fill(0n);

/**
 * Pawn attacks for each square and color [color][square]
 * color: 0 = white, 1 = black
 */
export const PAWN_ATTACKS: Bitboard[][] = [new Array(64).fill(0n), new Array(64).fill(0n)];

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initializes all precomputed attack tables
 * Called once on module load
 */
for (let sq = 0; sq < 64; sq++) {
  const bb = 1n << BigInt(sq);
  
  // Knight attacks
  let nAttacks = 0n;
  nAttacks |= (bb << 17n) & NOT_A_FILE;
  nAttacks |= (bb << 15n) & NOT_H_FILE;
  nAttacks |= (bb << 10n) & NOT_AB_FILE;
  nAttacks |= (bb << 6n) & NOT_GH_FILE;
  nAttacks |= (bb >> 17n) & NOT_H_FILE;
  nAttacks |= (bb >> 15n) & NOT_A_FILE;
  nAttacks |= (bb >> 10n) & NOT_GH_FILE;
  nAttacks |= (bb >> 6n) & NOT_AB_FILE;
  KNIGHT_ATTACKS[sq] = nAttacks & 0xffffffffffffffffn;

  // King attacks
  let kAttacks = 0n;
  kAttacks |= (bb << 8n);
  kAttacks |= (bb >> 8n);
  kAttacks |= (bb << 1n) & NOT_A_FILE;
  kAttacks |= (bb >> 1n) & NOT_H_FILE;
  kAttacks |= (bb << 9n) & NOT_A_FILE;
  kAttacks |= (bb >> 9n) & NOT_H_FILE;
  kAttacks |= (bb << 7n) & NOT_H_FILE;
  kAttacks |= (bb >> 7n) & NOT_A_FILE;
  KING_ATTACKS[sq] = kAttacks & 0xffffffffffffffffn;

  // Pawn attacks
  PAWN_ATTACKS[0][sq] = ((bb << 7n) & NOT_H_FILE) | ((bb << 9n) & NOT_A_FILE);
  PAWN_ATTACKS[1][sq] = ((bb >> 7n) & NOT_A_FILE) | ((bb >> 9n) & NOT_H_FILE);
}

// ============================================================================
// Ray Attack Helpers
// ============================================================================

/**
 * Direction vectors for rook moves [deltaFile, deltaRank]
 */
const ROOK_DIRECTIONS: Array<[number, number]> = [[0, 1], [1, 0], [0, -1], [-1, 0]];

/**
 * Direction vectors for bishop moves [deltaFile, deltaRank]
 */
const BISHOP_DIRECTIONS: Array<[number, number]> = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

/**
 * Generates sliding piece attacks for a given square
 * 
 * This is used during magic bitboard initialization and as fallback.
 * For production search, use precomputed magic bitboard tables.
 * 
 * @param square - The square to generate attacks from (0-63)
 * @param blockers - Bitboard of all blocking pieces
 * @param rookLike - Include rook-like attacks (horizontal/vertical)
 * @param bishopLike - Include bishop-like attacks (diagonal)
 * @returns Bitboard of attacked squares
 * 
 * @complexity O(n) where n = max