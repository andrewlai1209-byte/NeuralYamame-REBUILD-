# NeuralYamame REBUILD - Master Architecture Plan

## Executive Summary

This document serves as the single source of truth for the NeuralYamame REBUILD project. All development must align with this architecture and **The Six Laws**.

---

## Current State Assessment (v0.3)

### ✅ Completed Modules

| Module | Status | Quality | Notes |
|--------|--------|---------|-------|
| Bitboard Core | Complete | Good | Uses BigInt, needs Magic Bitboards |
| Board Representation | Complete | Good | FEN parsing correct, incremental hash needed |
| Move Generation | Complete | Basic | Pseudo-legal only, needs perft validation |
| Search Framework | Complete | Good | PVS+LMR implemented, needs ASP/IIR |
| NNUE Evaluation | Complete | Excellent | 256 hidden layers, incremental updates |
| Transposition Table | Complete | Excellent | 256MB/16M entries |
| Documentation | Complete | Excellent | Six Laws + 12 constitutional docs |

### ⚠️ Technical Debt Identified

1. **No Magic Bitboards** - Slider attacks use O(1) lookup but not magic numbers
2. **No Incremental Hash Updates** - `generateHash()` is O(n) instead of O(1)
3. **No Singular Extension** - Missing critical search extension for forced moves
4. **No Dynamic Time Management** - Fixed time allocation, no adaptive control
5. **No UCI Protocol** - Cannot interface with standard chess GUIs
6. **No Opening Book** - Missing position database for early game
7. **No Endgame Tablebase** - Missing perfect play in endgames
8. **No Multi-threading** - Single-threaded search only
9. **No Benchmark Suite** - Cannot measure performance regressions
10. **No Unit Tests** - Correctness not automatically verified

---

## Target Architecture (v1.0)

### Layer 1: Core Engine (v0.1 - COMPLETE)
```
src/core/
├── Bitboard.ts          # Immutable bitboard operations
├── Square.ts            # Square, File, Rank types
├── Piece.ts             # Piece type constants
└── Color.ts             # Color constants
```

### Layer 2: Board Representation (v0.1 - COMPLETE)
```
src/board/
├── Position.ts          # Main board state (replaces board.ts)
├── Move.ts              # Move encoding/decoding
├── Zobrist.ts           # Hash key generation (incremental)
└── Validation.ts        # Position legality checks
```

### Layer 3: Attack Generation (v0.2 - IN PROGRESS)
```
src/attacks/
├── MagicBitboards.ts    # Magic number slider attacks
├── Precomputed.ts       # Static attack tables
└── Generator.ts         # Magic number generator tool
```

### Layer 4: Move Generation (v0.2 - COMPLETE)
```
src/movegen/
├── MoveGenerator.ts     # Pseudo-legal move generation
├── LegalFilter.ts       # Check evasion filtering
└── Perft.ts             # Performance testing
```

### Layer 5: Evaluation (v0.3-v0.4 - COMPLETE)
```
src/evaluation/
├── NNUE.ts              # Neural network evaluation
├── Classical.ts         # Fallback classical evaluation
├── PawnStructure.ts     # Pawn bonus/malus tables
└── PieceTables.ts       # PST and mobility bonuses
```

### Layer 6: Search (v0.2-v0.5 - IN PROGRESS)
```
src/search/
├── AlphaBeta.ts         # Principal search algorithm
├── Quiescence.ts        # Capture search
├── Extensions.ts        # Singular, check, recapture extensions
├── Reductions.ts        # LMR, history-based reductions
├── TimeManager.ts       # Dynamic time allocation
└── MTDf.ts              # Aspiration windows
```

### Layer 7: Infrastructure (v0.5-v1.0 - MISSING)
```
src/infra/
├── UCI.ts               # Universal Chess Interface
├── OpeningBook.ts       # Book probing
├── Tablebase.ts         # Endgame tablebase
└── ThreadPool.ts        # Lazy SMP implementation
```

---

## Development Roadmap

### Phase 1: Foundation Strengthening (NOW)
**Goal:** Eliminate critical technical debt before adding features

#### Task 1.1: Implement Incremental Zobrist Hash
- **Current:** `generateHash()` scans entire board O(n)
- **Target:** Update hash during makeMove/undoMove O(1)
- **Impact:** 15-20% search speed improvement
- **Priority:** CRITICAL

#### Task 1.2: Implement Magic Bitboards
- **Current:** `getSliderAttacks()` uses fill algorithms
- **Target:** Precomputed magic number lookups
- **Impact:** 30-40% attack generation speedup
- **Priority:** HIGH

#### Task 1.3: Add Perft Validation Suite
- **Current:** No automated correctness testing
- **Target:** Perft(1-6) validation on startup
- **Impact:** Prevents regression bugs
- **Priority:** CRITICAL

#### Task 1.4: Create Benchmark Framework
- **Current:** No performance baseline
- **Target:** Standard positions with NPS/score metrics
- **Impact:** Measurable optimization validation
- **Priority:** CRITICAL

### Phase 2: Search Enhancements (NEXT)
**Goal:** Implement advanced search techniques

#### Task 2.1: Aspiration Windows (ASP)
- Implement iterative deepening with narrowing windows
- Handle fail-high/fail-low gracefully

#### Task 2.2: Internal Iterative Reductions (IIR)
- Reduce depth when no TT move available
- Improves search efficiency in unknown positions

#### Task 2.3: Singular Extension
- Detect forced moves and extend search
- Critical for tactical accuracy

#### Task 2.4: Improved LMR Formula
- Replace static reduction with history-based formula

### Phase 3: Evaluation Refinement
**Goal:** Enhance NNUE with positional understanding

#### Task 3.1: Pawn Structure Evaluation
#### Task 3.2: Bishop Pair Bonus
#### Task 3.3: King Safety Evaluation

### Phase 4: Infrastructure (v0.5+)
**Goal:** Production-ready engine features

#### Task 4.1: UCI Protocol Implementation
#### Task 4.2: Opening Book Integration
#### Task 4.3: Endgame Tablebase
#### Task 4.4: Lazy SMP Threading

---

## Quality Gates

### Gate 1: Architecture Review (BEFORE coding)
- [ ] Design document created
- [ ] Alternatives considered and documented
- [ ] Six Laws compliance verified
- [ ] API contracts defined

### Gate 2: Correctness Testing (BEFORE merge)
- [ ] Perft(1-5) passes
- [ ] Unit tests written and passing
- [ ] Edge cases covered

### Gate 3: Performance Validation (BEFORE release)
- [ ] Benchmark suite run
- [ ] No NPS regression (>5% improvement required)
- [ ] Memory usage within bounds

### Gate 4: Code Review (BEFORE merge)
- [ ] Two independent reviews
- [ ] Six Laws checklist completed
- [ ] Documentation updated

---

## Decision Log

### Decision 1: Keep BigInt for Bitboards
- **Date:** 2024-07-17
- **Rationale:** TypeScript doesn't support Uint64, BigInt is safest option
- **Trade-off:** Slight performance cost vs correctness guarantee

### Decision 2: 256 Hidden Layer NNUE
- **Date:** 2024-07-17
- **Rationale:** Balance between strength and inference speed
- **Status:** Implemented

### Decision 3: 256MB Transposition Table
- **Date:** 2024-07-17
- **Rationale:** Modern systems have ample RAM, larger TT = better search
- **Status:** Implemented

---

## Success Metrics

### Technical KPIs
- **Nodes/second:** > 5M nps on single core
- **Perft(6):** < 2 seconds
- **Memory usage:** < 512 MB default

### Playing Strength KPIs
- **Elo Rating:** > 2200 (CCRL blitz)
- **Tactical accuracy:** > 95% on STS test suite

### Engineering KPIs
- **Test coverage:** > 80%
- **Build time:** < 30 seconds

---

## Appendix: Six Laws Compliance Checklist

Every PR must answer these questions:

1. **First Law:** Does this optimize for long-term architecture or minimal changes?
2. **Second Law:** What long-term purpose does every line serve?
3. **Third Law:** Are we preserving quality or just preserving old code?
4. **Fourth Law:** Have we evaluated the lifetime maintenance cost?
5. **Fifth Law:** Was architecture designed before implementation began?
6. **Sixth Law:** Did we learn from Stockfish without copying?

---

*Last Updated: 2024-07-17*
*Version: 1.0-draft*
