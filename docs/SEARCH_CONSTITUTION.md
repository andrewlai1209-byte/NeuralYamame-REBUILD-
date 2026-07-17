# Search Constitution

## Overview

The search system is the brain of the chess engine. It must be efficient, accurate, and robust.

## Core Algorithms

### Principal Variation Search (PVS)
- Null-window searches for non-PV nodes
- Full-window only for PV nodes
- Reduces nodes by ~50% compared to standard alpha-beta

### Aspiration Windows (ASP)
- Start with narrow window around previous iteration's score
- Window size: ±50 centipawns
- On failure, re-search with full window

### Iterative Deepening
- Search depth 1, 2, 3, ... up to maximum
- Enables time management and early termination
- Provides best move at any interruption point

## Advanced Techniques

### Internal Iterative Reduction (IIR)
```typescript
if (!ttEntry && depth >= 4) {
    depth--; // Reduce depth when no TT entry
}
```

### Singular Extension
```typescript
if (depth >= 8 && !isRoot && ttEntry.depth >= depth - 3) {
    const singularBeta = ttEntry.score - depth;
    const singularDepth = (depth - 1) / 2;
    // Test if this move is significantly better than alternatives
}
```

### Late Move Reductions (LMR)
```typescript
if (depth >= 3 && i >= 4 && !isCapture && !isCheck) {
    reduction = Math.log(depth) * Math.log(i) / 2;
    depth -= reduction;
}
```

### Null Move Pruning
- Disabled in endgame (≤8 pieces) to avoid Zugzwang
- R = 2 for depth < 6, R = 3 for depth ≥ 6

### Mate Distance Pruning
```typescript
const mateAlpha = -99999 + ply;
const mateBeta = 99999 - ply;
```

## Quiescence Search

### Key Features
- Only search captures and checks
- Prevents horizon effect
- Proper mate score propagation with ply offset

```typescript
private quiesce(board, alpha, beta, isMaximizing, evalFunc, ply) {
    const standPat = inCheck ? -99999 + ply : evalFunc(board);
    // Only captures (or all moves if in check)
    // Return scores adjusted by ply for mate distances
}
```

## Time Management

### Dynamic Allocation
- Base time: remainingTime / (movesToGo + constant)
- Increment consideration
- Safety margin for critical positions

### Node-based Budget
- Maximum nodes per search
- Periodic checks every 2048 nodes

## Transposition Table Integration

### Lookup Strategy
1. Check for exact match
2. Use bound information for cutoffs
3. Prioritize TT move for ordering

### Storage Policy
- Always replace on same or greater depth
- 16M entries (256MB)

## Move Ordering

### Priority Order
1. TT move (if valid)
2. Captures (MVV-LVA)
3. Killer moves
4. Counter moves
5. History moves
6. Other moves

## Performance Targets

| Metric | Target |
|--------|--------|
| Nodes/sec | >500K |
| Search depth (1s) | 15+ plies |
| TT hit rate | >70% |
| PVS efficiency | >90% null windows |

## Error Handling

- Graceful degradation on timeout
- Safe fallback on hash collisions
- No crashes on invalid positions
