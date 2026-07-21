# NeuralYamame-REBUILD Stability, Speed, Training, and Debug Report

Generated on 2026-07-21 with `npm run benchmark:stability` after the Stockfish research attachment and debug pass.

## Scope

This report is a lightweight, deterministic training/debug validation pass. It does not claim to perform long-running NNUE weight training. Instead, it exercises core engine mechanics repeatedly so regressions in move generation, make/undo, hash restoration, and evaluation throughput are visible immediately.

## Debug finding fixed

During the debug pass, quiescence search treated `captured = -1` as truthy in JavaScript. That caused quiet non-capture moves to be searched as if they were captures, which could make a depth-1 search fail to return promptly. Pawn captures with `captured = 0` were also not ordered/scored correctly by truthiness checks.

The fix now uses explicit capture checks:

- quiet move: `captured === -1`
- real capture: `captured !== -1`
- en passant capture: `flags === 1`

## Stability benchmark data

| Position | Legal moves | Evaluated children | Elapsed ms | Positions/sec | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| Starting position movegen baseline | 20 | 5,000 | 107.66 | 46,441 | STABLE |
| Developed middlegame pressure | 31 | 7,750 | 131.97 | 58,727 | STABLE |
| Castling-rights stress position | 40 | 10,000 | 168.14 | 59,474 | STABLE |
| Promotion and king-safety edge case | 11 | 2,750 | 24.89 | 110,473 | STABLE |

## Aggregate result

- Stable positions: 4/4
- Total evaluated children: 25,500
- Total elapsed: 432.66 ms
- Aggregate throughput: 58,938 positions/sec

## Test/debug commands executed

- `npm run lint`
- `npm test`
- `npm run benchmark:stability`

## Follow-up training path

For actual long-running training, the next step should be to persist repeated benchmark/self-play snapshots and compare them over time. The current benchmark establishes the stable baseline needed before adding a heavier training loop.
