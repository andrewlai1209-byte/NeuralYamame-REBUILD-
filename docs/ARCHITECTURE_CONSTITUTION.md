# NeuralYamame Architecture Constitution

## Project Vision

Build a modern, maintainable, high-performance chess engine with long-term architecture as the highest priority.

### Golden Rule
**Never optimize for minimal code changes. Optimize for the strongest long-term architecture, even if entire modules must be rewritten.**

### Core Principles
1. **Correctness before speed**: Never optimize at the cost of correctness
2. **Benchmark every optimization**: Measure before and after each change
3. **One responsibility per module**: Clean separation of concerns
4. **Reduce technical debt continuously**: Refactor proactively

## Version Roadmap

| Version | Milestone | Description | Target Elo |
|---------|-----------|-------------|------------|
| v0.1 | Bitboard Core | Complete bitboard implementation with Magic Bitboards | 1500 |
| v0.2 | Modern Search | ASP, IIR, Singular Extension, improved LMR | 1800 |
| v0.3 | Classical Evaluation | Pawn structure, piece activity, king safety | 2000 |
| v0.4 | NNUE | True dual-layer NNUE (256 hidden neurons) | 2200+ |
| v0.5 | Lazy SMP | Multi-threaded search with lazy synchronization | 2300+ |
| v1.0 | Stable Engine | Production-ready engine with UCI protocol | 2400+ |

## Module Architecture

```
src/chessEngine/
├── bitboard.ts      # Bitboard operations & constants
├── attacks.ts       # Attack generation (Magic Bitboards)
├── board.ts         # Board representation & FEN parsing
├── movegen.ts       # Move generation
├── moveOrdering.ts  # Move ordering heuristics
├── evaluation.ts    # Classical + NNUE evaluation
├── nnue.ts          # NNUE network architecture
├── search.ts        # Search algorithms (PVS, ASP, etc.)
├── tt.ts            # Transposition table (16M entries)
├── zobrist.ts       # Zobrist hashing
└── perft.ts         # Performance testing
```

## Quality Gates

1. **Architecture Review**: Every major change reviewed for architectural integrity
2. **Perft Tests**: Position verification tests must pass
3. **Regression Tests**: No performance regression allowed
4. **Benchmarks**: Documented performance metrics
5. **Documentation**: All public APIs documented
6. **Code Review**: Peer review required

## Definition of Done

- [ ] Compiles without errors
- [ ] All tests pass
- [ ] No benchmark regression
- [ ] Architecture improved or maintained
- [ ] Documentation updated
