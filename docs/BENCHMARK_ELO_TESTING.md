# Benchmark & Elo Testing

## Benchmark Suite

### Standard Test Positions

#### Position 1: Start Position
```
FEN: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
Expected Perft(6): 119,060,324
Target Depth (1s): 15+ plies
```

#### Position 2: Middlegame Tactical
```
FEN: r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4
Expected: Bc4 is best move
Target: Find tactic within 500ms
```

#### Position 3: Endgame
```
FEN: 8/8/8/8/8/3k4/3P4/3K4 w - - 0 1
Expected: Pawn promotion wins
Target: Solve in <1s
```

#### Position 4: Complex Strategy
```
FEN: r2qkb1r/pp2nppp/3p1n2/3Pp1B1/4P3/2N2Q2/PPP2PPP/R3KB1R w KQkq - 0 9
Expected: Long-term positional advantage
Target: Evaluate correctly at depth 10+
```

## Performance Metrics

### Speed Benchmarks

| Metric | Minimum | Target | Excellent |
|--------|---------|--------|-----------|
| Nodes/sec | 300K | 500K | 1M+ |
| Eval time | <50μs | <20μs | <10μs |
| TT lookup | <5μs | <1μs | <500ns |
| Move gen | <10μs | <5μs | <2μs |

### Memory Benchmarks

| Metric | Maximum | Target | Excellent |
|--------|---------|--------|-----------|
| Heap size | 100MB | 50MB | 25MB |
| GC pauses | 50ms | 10ms | 5ms |
| TT memory | 512MB | 256MB | 128MB |

## Elo Testing Protocol

### Match Setup

#### Time Controls
- **Blitz**: 3+2 (3 minutes + 2 seconds increment)
- **Rapid**: 10+5
- **Classical**: 30+10

#### Opponents
- Stockfish 8 (baseline ~3000 Elo)
- Previous engine version
- Other JavaScript engines

### Statistical Requirements

#### Sample Size
- Minimum 100 games per matchup
- Preferred 500+ games for significance
- Multiple opening sets to reduce bias

#### Confidence Level
- 95% confidence interval required
- Error margin <50 Elo points
- Use BayesElo or similar for analysis

### Test Suites

#### Opening Books
1. **Balanced Book**: 50 openings, equal win rates
2. **Tactical Book**: Sharp positions, forcing lines
3. **Endgame Book**: Theoretical endgames
4. **Random Book**: Unbalanced material

#### Position Categories
- Open games (e4 e5)
- Closed games (d4 d5)
- Semi-open (e4 vs non-e5)
- Flank openings

## Regression Testing

### Automated Tests

#### Daily Benchmarks
```bash
# Run on every commit
npm run bench -- --depth 15 --time 5000
# Compare against baseline
# Alert if >5% regression
```

#### Weekly Elo Matches
```bash
# Run against fixed opponent
npm run elo-test -- --games 200 --opponent stockfish
# Track Elo trend over time
```

### Manual Testing

#### Visual Inspection
- Review lost games for blunders
- Check evaluation consistency
- Verify PV accuracy

#### Edge Case Testing
- Zugzwang positions
- Fortress positions
- Perpetual check scenarios
- Promotion edge cases

## Result Analysis

### Win/Draw/Loss Statistics

```
Total Games: 200
Wins: 85 (42.5%)
Draws: 70 (35.0%)
Losses: 45 (22.5%)
Score: 58.75%
Elo Difference: +62 ± 45
```

### Performance by Phase

| Phase | Win Rate | Avg Score | Notes |
|-------|----------|-----------|-------|
| Opening | 45% | 0.52 | Good preparation |
| Middlegame | 55% | 0.58 | Strong tactics |
| Endgame | 48% | 0.54 | Room for improvement |

### Common Failure Modes

1. **Horizon Effect**: Missing deep tactics
2. **Evaluation Errors**: Misjudging positions
3. **Time Trouble**: Poor time management
4. **Opening Traps**: Falling for known traps

## Continuous Improvement

### A/B Testing Framework

```typescript
interface ABTest {
    name: string;
    variantA: EngineConfig;
    variantB: EngineConfig;
    games: number;
    result: ABTestResult;
}
```

### Feature Impact Measurement

| Feature | Elo Gain | Nodes Impact | Memory Impact |
|---------|----------|--------------|---------------|
| Null Move Pruning | +80 | -40% | None |
| LMR | +60 | -30% | None |
| NNUE (256) | +150 | +20% | +2MB |
| TT (16M) | +40 | -15% | +256MB |

## Reporting

### Weekly Report Template

```
## Week XX - Engine Performance Report

### Key Metrics
- Current Elo: XXXX (±YY)
- Change from last week: +/- ZZ
- NPS: AAA,AAA

### Improvements Merged
1. Feature A (+XX Elo)
2. Optimization B (-YY% time)

### Known Issues
1. Bug description
2. Investigation status

### Next Week Goals
1. Goal 1
2. Goal 2
```
