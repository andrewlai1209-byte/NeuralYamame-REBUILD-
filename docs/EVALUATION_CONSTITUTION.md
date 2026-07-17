# Evaluation Constitution

## Overview

The evaluation function determines the strength of a chess position. Modern engines use a combination of classical terms and neural networks (NNUE).

## Architecture Layers

### Layer 1: Material Counting
- Base piece values: P=100, N=320, B=330, R=500, Q=900
- Phase detection for endgame scaling
- Material imbalance bonuses

### Layer 2: Piece-Square Tables (PST)
- Position-dependent piece values
- Separate tables for middle and endgame
- Flipped for black perspective

### Layer 3: Pawn Structure
- Doubled pawns penalty: -15 per extra pawn
- Isolated pawns penalty: -12
- Passed pawn bonus: scales with rank advancement
- Pawn majorities bonus

### Layer 4: Piece Activity
- Knight outpost bonuses
- Bishop pair bonus: +30
- Bishop mobility on long diagonals
- Rook on open/semi-open files
- Queen activity in center

### Layer 5: King Safety
- Pawn shield evaluation
- King tropism (enemy pieces nearby)
- Attack potential calculation

### Layer 6: NNUE (Efficiently Updatable Neural Network)

#### Network Architecture
```
Input: 768 features (12 piece types × 64 squares)
Hidden: 256 neurons (Clipped ReLU activation)
Output: Single evaluation score
```

#### Feature Encoding
- Perspective-based: each side sees board from own view
- Incremental updates during make/unmake move
- Only changed features recomputed

#### Weight Initialization
- Deterministic seed for reproducibility
- Material-based base weights
- Spatial importance factors
- Controlled noise for diversity

## NNUE Implementation Details

### Feature Index Calculation
```typescript
getFeatureIndex(color, pieceType, sq): number {
    const pIdx = color === WHITE ? pieceType : pieceType + 6;
    return pIdx * 64 + sq;
}
```

### Accumulator Update
```typescript
updateAccumulators(accumWhite, accumBlack, move, sideToMove) {
    // Remove piece from 'from' square
    // Add piece to 'to' square
    // Handle captures
    // All operations O(HIDDEN_SIZE)
}
```

### Forward Propagation
```typescript
evaluateAccumulators(accumWhite, accumBlack): number {
    let output = biasO;
    for (h = 0; h < HIDDEN_SIZE; h++) {
        const valW = clamp(accumWhite[h], 0, 127);
        const valB = clamp(accumBlack[h], 0, 127);
        output += valW * weightsHO[h] + valB * weightsHO[HIDDEN_SIZE + h];
    }
    return output;
}
```

## Classical Evaluation Terms

### Center Control
- Core center (d4, e4, d5, e5): +15 per piece
- Extended center: +5 per piece

### Mobility
- Number of legal moves
- Weighted by game phase
- Reduced for blocked positions

### Threats
- Attacking enemy pieces
- Defending own pieces
- Pawn attacks on pieces

## Endgame Detection

### Piece Count Threshold
- ≤8 total pieces: endgame phase
- Adjust evaluation weights accordingly

### Special Endgame Knowledge
- King centralization bonus
- Pawn structure importance increases
- Knight vs Bishop considerations

## Scaling Factors

### Game Phase
```typescript
const nonPawnMaterial = ...;
const phase = min(1.0, nonPawnMaterial / 6400);
// Interpolate between MG and EG evaluations
```

### Training Adjustments
- Support for learned weight adjustments
- Style-based multipliers
- Difficulty-level scaling

## Performance Optimization

### Incremental Updates
- Avoid full re-evaluation when possible
- Update only changed accumulators
- Cache frequently accessed values

### Bitboard Efficiency
- Use bit parallelism for pattern detection
- Precomputed masks for common queries
- Population count for quick metrics

## Quality Metrics

| Term | Weight Range | Impact |
|------|-------------|--------|
| Material | 100% | Foundation |
| PST | 20-50% | Positional |
| Pawn Structure | 15-30% | Strategic |
| King Safety | 20-40% | Tactical |
| NNUE | 60-100% | Overall |

## Testing Requirements

- Static position tests
- Progressive evaluation tests
- NNUE accuracy benchmarks
- Classical vs NNUE correlation
