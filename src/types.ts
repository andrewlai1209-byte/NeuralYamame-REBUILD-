/**
 * @fileoverview Core Type Definitions for NeuralYamame REBUILD
 * 
 * Centralized type system ensuring type safety across all engine modules.
 * Designed for long-term maintainability and extensibility.
 * 
 * @module types
 * @version 2.0.0
 * @since 2024
 * 
 * @compliance
 * - First Law: Comprehensive type system for architectural clarity
 * - Second Law: Every type serves correctness, maintainability, or scalability
 * - Fifth Law: Types designed before implementation
 */

// ============================================================================
// Basic Chess Types
// ============================================================================

/**
 * Square index on the chessboard (0 = a1, 63 = h8)
 */
export type Square = number;

/**
 * Color identifier (0 = white, 1 = black)
 */
export type Color = 0 | 1;

/**
 * Piece type identifier (0=pawn, 1=knight, 2=bishop, 3=rook, 4=queen, 5=king)
 */
export type PieceType = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Bitboard representation using 64-bit bigint
 * Each bit represents a square on the board
 */
export type Bitboard = bigint;

// ============================================================================
// Engine Configuration Types
// ============================================================================

export type EnginePersonalityId = 'tactical' | 'positional' | 'gambiter' | 'defensive';

export interface EnginePersonality {
  id: EnginePersonalityId;
  name: string;
  avatar: string;
  description: string;
  quote: string;
  materialWeights: {
    p: number;
    n: number;
    b: number;
    r: number;
    q: number;
    k: number;
  };
  pstWeights: number;
  mobilityWeight: number;
  kingSafetyWeight: number;
  pawnStructureWeight: number;
}

export type EvaluationMode = 
  | 'traditional' 
  | 'neural' 
  | 'hybrid' 
  | 'leeza_mcts' 
  | 'stockfish_nnue' 
  | 'komodo_mcts' 
  | 'patricia_neural' 
  | 'nova_chess' 
  | 'pantheon_fusion' 
  | 'neuralcore_rl_selfplay' 
  | 'lc0_neural' 
  | 'torch_hybrid';

export interface EngineConfig {
  maxDepth: number;
  personality: EnginePersonalityId;
  evalMode: EvaluationMode;
  timeLimitMs?: number;
  quiescenceLimit?: number;
  maxCapturesToCheck?: number;
  difficulty?: 'beginner' | 'intermediate' | 'expert' | 'grandmaster';
  leezaThinkingThreads?: number;
  customWeights?: {
    p?: number;
    n?: number;
    b?: number;
    r?: number;
    q?: number;
    k?: number;
    bishopPairBonus?: number;
    pstWeights?: number;
  };
}

// ============================================================================
// Move Types
// ============================================================================

/**
 * Move flags for special move types
 */
export enum MoveFlags {
  NORMAL = 0,
  EN_PASSANT = 1,
  CASTLE = 2,
  PAWN_DOUBLE = 4
}

/**
 * Represents a chess move with all necessary information
 */
export interface Move {
  from: Square;
  to: Square;
  piece: PieceType;
  captured: PieceType | -1;
  promotion: PieceType | -1;
  flags: MoveFlags;
}

/**
 * Internal move representation for search (packed format)
 */
export type PackedMove = number;

// ============================================================================
// Board State Types
// ============================================================================

/**
 * Complete state of a chess position for hashing and repetition detection
 */
export interface BoardState {
  pieces: Array<{ color: Color; pieceType: PieceType; square: Square }>;
  sideToMove: Color;
  castlingRights: number;
  epSquare: Square | -1;
  halfMoveClock: number;
  fullMoveNumber: number;
}

/**
 * Stack entry for makeMove/undoMove operations
 */
export interface BoardStateSnapshot {
  epSquare: Square | -1;
  castlingRights: number;
  halfMoveClock: number;
  hashKey: bigint;
  capturedPiece?: { pieceType: PieceType; square: Square };
}

// ============================================================================
// Search Types
// ============================================================================

/**
 * Transposition table entry
 */
export interface TTEntry {
  key: bigint;
  depth: number;
  score: number;
  flag: TTFlag;
  bestMove: Move | null;
}

/**
 * Transposition table bound types
 */
export enum TTFlag {
  EXACT = 0,
  ALPHA = 1,
  BETA = 2
}

/**
 * Search result structure
 */
export interface SearchResult {
  bestMove: {
    from: string;
    to: string;
    promotion?: string;
  } | null;
  score: number;
  depth: number;
  nodes: number;
  nps: number;
  pv: Move[];
}

/**
 * Perft test result
 */
export interface PerftResult {
  depth: number;
  customNodes: number;
  oracleNodes: number;
  matched: boolean;
  timeCustomMs: number;
  timeOracleMs: number;
  npsCustom: number;
  npsOracle: number;
}

// ============================================================================
// Training and Analysis Types
// ============================================================================

export interface DuelConfig {
  engine1: EngineConfig;
  engine2: EngineConfig;
  enabled: boolean;
}

export interface TrainingGame {
  id: string;
  whiteEngine: string;
  blackEngine: string;
  result: '1-0' | '0-1' | '1/2-1/2' | 'ongoing';
  movesCount: number;
  currentFen: string;
  moveHistory: string[];
  evalHistory: number[];
  startTime: string;
}

export interface LeezaMCTSNode {
  move: string;
  visits: number;
  qValue: number;
  prior: number;
  uct: number;
}

export interface LeezaTrainingConfig {
  learningRate: number;
  batchSize: number;
  optimizer: 'SGD' | 'Adam' | 'RMSprop';
  architecture: 'ResNet-20' | 'ResNet-40' | 'ViT-Transformer';
  epochsToRun: number;
}

export interface EloHistoryPoint {
  epoch: number;
  gamesPlayed: number;
  eloTraditional: number;
  eloNeural: number;
  eloHybrid: number;
}

export interface LossMetricPoint {
  epoch: number;
  policyLoss: number;
  valueLoss: number;
  accuracy: number;
}

export interface TrainingSummary {
  totalGames: number;
  winRate: number;
  drawRate: number;
  lossRate: number;
  currentElo: number;
  policyLoss: number;
  valueLoss: number;
  trainSpeed: number;
  gamesInCloud: number;
  recentGames: TrainingGame[];
}

export interface LiveAnalysisData {
  depth: number;
  selDepth: number;
  nodes: number;
  nps: number;
  score: number;
  mateIn?: number;
  pv: string[];
  commentary?: string;
  isAnalyzing: boolean;
}

// ============================================================================
// Benchmark Types
// ============================================================================

/**
 * Benchmark metrics for performance analysis
 */
export interface BenchmarkMetrics {
  nodesPerSecond: number;
  perftTime: number;
  hashCollisionRate: number;
  averageSearchDepth: number;
  memoryUsageMB: number;
}

/**
 * Benchmark result for a single test case
 */
export interface BenchmarkResult {
  name: string;
  metrics: BenchmarkMetrics;
  timestamp: number;
  passed: boolean;
}
