# Performance Handbook

## Profiling Tools

### Built-in Diagnostics
```typescript
// Node counting
const nodes = engine.getNodes();
const nps = nodes / (timeMs / 1000);

// TT statistics
const ttHits = transpositionTable.getHits();
const ttSize = transpositionTable.getSize();
const hitRate = ttHits / nodes;
```

### Browser DevTools
- Performance tab for timeline analysis
- Memory tab for leak detection
- Console for timing measurements

## Optimization Targets

### Critical Path
1. Move generation (<5μs)
2. Evaluation (<20μs for NNUE)
3. TT lookup (<1μs)
4. Make/unmake move (<500ns)

### Secondary Targets
- Move ordering quality
- Search depth efficiency
- Memory access patterns

## Benchmarking Protocol

### Standard Positions
```
Start position: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
Middlegame: r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4
Endgame: 8/8/8/8/8/3k4/3P4/3K4 w - - 0 1
```

### Metrics to Record
| Metric | Tool | Target |
|--------|------|--------|
| Nodes/sec | Internal counter | >500K |
| Eval time | performance.now() | <20μs |
| TT hit rate | Calculated | >70% |
| Memory usage | DevTools | <50MB |
| GC pauses | Performance tab | <5ms |

## Common Bottlenecks

### JavaScript-Specific Issues

#### BigInt Operations
```typescript
// SLOW: Creating new BigInt frequently
const bit = 1n << BigInt(sq);

// FASTER: Precompute when possible
const bit = BIGINT_POWERS[sq];
```

#### Object Allocation
```typescript
// SLOW: Creating objects in hot path
const move = { from, to, piece, captured };

// FASTER: Use flat arrays or reuse objects
moves[moveCount++] = encodeMove(from, to, piece, captured);
```

#### Array Access
```typescript
// SLOW: Multi-dimensional array lookups
const value = PST[color][pieceType][rank][file];

// FASTER: Flattened arrays
const index = ((color * 6 + pieceType) * 8 + rank) * 8 + file;
const value = PST_FLAT[index];
```

### Algorithm Optimizations

#### Bitboard Population Count
```typescript
// Built-in popCount using bit manipulation
export function popCount(bb: bigint): number {
    let count = 0;
    while (bb !== 0n) {
        bb &= bb - 1n;
        count++;
    }
    return count;
}
```

#### Magic Bitboards (Future)
```typescript
// Precomputed attack tables with magic multipliers
const rookAttacks = ROOK_MAGICS[sq][(occupied & rookMask[sq]) * magic[sq] >> shift];
```

## Memory Management

### Object Pooling
```typescript
class MovePool {
    private pool: Uint32Array;
    private index: number = 0;
    
    allocate(): number {
        return this.pool[this.index++];
    }
    
    reset() {
        this.index = 0;
    }
}
```

### Garbage Collection Avoidance
- Reuse arrays instead of creating new ones
- Avoid closures in hot paths
- Use typed arrays for numeric data

## Parallelization Strategies

### Web Workers
```typescript
// Main thread
const worker = new Worker('engine-worker.js');
worker.postMessage({ type: 'SEARCH', fen, depth });

// Worker
self.onmessage = (e) => {
    const result = search(e.data.fen, e.data.depth);
    self.postMessage(result);
};
```

### Work Distribution
- Split root moves among workers
- Share TT via SharedArrayBuffer (if available)
- Aggregate results at main thread

## Testing Checklist

### Correctness
- [ ] Perft tests pass for all depths
- [ ] Hash key updates correctly
- [ ] Make/unmake is reversible
- [ ] No illegal moves generated

### Performance
- [ ] NPS meets target on benchmark positions
- [ ] Memory usage stable over long sessions
- [ ] No memory leaks detected
- [ ] GC pauses acceptable

### Robustness
- [ ] Handles invalid FEN gracefully
- [ ] Recovers from timeout interrupts
- [ ] Works across different browsers
- [ ] Consistent results (within tolerance)

## Continuous Improvement

### Weekly Benchmarks
- Track NPS trends
- Monitor memory growth
- Compare against previous versions

### A/B Testing
- Test optimization candidates
- Measure real-game impact
- Document findings

### Community Feedback
- Collect user reports
- Analyze game logs
- Identify edge cases
