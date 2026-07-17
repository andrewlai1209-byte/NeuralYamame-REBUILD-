# SMP Design (Lazy Synchronous Multi-Processing)

## Overview

Multi-threaded search allows the engine to explore more nodes in the same time, increasing playing strength significantly.

## Architecture Principles

### Lazy Synchronization
- Threads run mostly independently
- Minimal locking overhead
- Best move sharing without strict consistency

### Thread Roles
1. **Main Thread**: Controls search, manages time, makes final decision
2. **Worker Threads**: Assist with node exploration, report best moves

## Data Structures

### Shared Resources
```typescript
interface SharedState {
    bestMove: Move | null;
    bestScore: number;
    currentPv: Move[];
    nodesSearched: number;
    stopFlag: boolean;
}
```

### Thread-Local State
```typescript
interface ThreadState {
    id: number;
    localTT: TranspositionTable; // Subset of shared TT
    killerMoves: Move[][];
    historyMoves: Record<string, number>;
    counterMoves: Record<string, Move>;
    accumWhite: Float32Array; // NNUE accumulators
    accumBlack: Float32Array;
}
```

## Synchronization Strategy

### Lock-Free Communication
- Atomic operations for shared counters
- Volatile flags for stop signals
- Periodic polling instead of interrupts

### Transposition Table Sharing
- Single large TT shared among all threads
- Lock-free reads (safe with proper hashing)
- Optimistic writes with collision handling

### Best Move Updates
- Main thread owns final decision
- Workers suggest via atomic swap
- PV information updated periodically

## Work Distribution

### Root Move Splitting
```typescript
// At root, distribute moves among threads
const moves = generateMoves(board);
for (let i = 0; i < moves.length; i++) {
    const threadId = i % numThreads;
    threads[threadId].addRootMove(moves[i]);
}
```

### Dynamic Load Balancing
- Idle threads steal work from busy threads
- Work units are subtrees at depth threshold
- Stealing occurs when local queue empty

## Search Coordination

### Iterative Deepening Sync
- All threads start new depth together
- Main thread broadcasts depth change
- Workers complete current task then sync

### Time Management
- Main thread controls time allocation
- Soft timeout: finish current iteration
- Hard timeout: immediate stop

## Implementation Details

### Thread Pool
```typescript
class ThreadPool {
    private workers: Worker[];
    private sharedState: SharedState;
    
    constructor(numThreads: number) {
        this.workers = [];
        for (let i = 0; i < numThreads; i++) {
            this.workers.push(new Worker('search-worker.js'));
        }
    }
    
    search(position: Position, time: number): Move {
        // Distribute work
        // Wait for completion
        // Collect results
    }
}
```

### Message Protocol
```typescript
// Main → Worker
{ type: 'SEARCH', position: FEN, depth: number, time: number }
{ type: 'STOP' }
{ type: 'NEW_GAME' }

// Worker → Main
{ type: 'BEST_MOVE', move: Move, score: number }
{ type: 'PV', moves: Move[], score: number, depth: number }
{ type: 'NODES', count: number }
{ type: 'DONE' }
```

## Performance Considerations

### Cache Efficiency
- Each thread has local data structures
- Minimize false sharing
- Align data to cache lines

### Contention Reduction
- Avoid locks in hot paths
- Use thread-local storage where possible
- Batch updates to shared state

### Scaling Expectations

| Threads | Speedup | Efficiency |
|---------|---------|------------|
| 1 | 1.0x | 100% |
| 2 | 1.8x | 90% |
| 4 | 3.2x | 80% |
| 8 | 5.6x | 70% |
| 16 | 9.0x | 56% |

## Safety Guarantees

### Determinism
- Same position + time = same move (single-threaded)
- Multi-threaded may vary slightly due to timing
- No crashes from race conditions

### Data Integrity
- TT entries always valid (atomic writes)
- No partial updates visible
- Graceful degradation on errors

## Testing Requirements

### Correctness Tests
- Single-threaded vs multi-threaded comparison
- Reproducibility within tolerance
- No lost nodes or double-counting

### Performance Tests
- Speedup measurement on various positions
- Memory usage scaling
- Contention profiling

### Stress Tests
- Rapid start/stop cycles
- High-load scenarios
- Edge cases (time trouble, mate threats)

## Migration Path

### Phase 1: Preparation
- Extract thread-safe components
- Define message interfaces
- Create worker script template

### Phase 2: Basic SMP
- Implement thread pool
- Add root move splitting
- Enable TT sharing

### Phase 3: Optimization
- Add dynamic load balancing
- Tune synchronization points
- Optimize memory layout

### Phase 4: Advanced Features
- Selective search extensions
- Asynchronous PV reporting
- Adaptive thread allocation
