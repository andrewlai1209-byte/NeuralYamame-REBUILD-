# NeuralYamame-REBUILD Stockfish Research Notes

This file is a research attachment for NeuralYamame-REBUILD. It does **not** rename the project and does **not** vendor Stockfish code.

## What was researched

- Stockfish is a free, open-source UCI chess engine derived from Glaurung 2.1 and intended to analyze chess positions and compute strong moves.
- Stockfish is distributed as a command-line engine rather than a bundled chess GUI, so GUI/API integrations normally communicate through UCI or a wrapper.
- Modern Stockfish releases use NNUE-style evaluation; the official Stockfish NNUE note describes downloading or building a development binary and pairing it with the default `.nnue` network file when required.
- Stockfish development relies heavily on Fishtest, a distributed task queue/testing framework for large-scale chess-engine experiments.

## Sources checked on 2026-07-21

- Official Stockfish website: https://stockfishchess.org/
- Official Stockfish GitHub repository: https://github.com/official-stockfish/Stockfish
- Official Stockfish docs: https://official-stockfish.github.io/docs/stockfish-wiki/Home.html
- Official NNUE article: https://stockfishchess.org/blog/2020/introducing-nnue-evaluation/
- Official Fishtest repository: https://github.com/official-stockfish/fishtest

## Practical implications for this codebase

1. Keep NeuralYamame-REBUILD as the product/engine identity and treat Stockfish as a research baseline, not a replacement.
2. Maintain a fail-safe architecture: external sources such as Lichess Explorer, Syzygy, or any future UCI Stockfish bridge should never block the local search fallback.
3. Prefer small deterministic benchmark positions for CI/debug stability, and use longer self-play or SPRT-style experiments only outside lightweight validation.
4. If a future native Stockfish bridge is added, keep it behind an explicit option because Stockfish binaries and NNUE files are platform-specific artifacts.

## Recommended follow-up tasks

- Add an optional UCI adapter interface so NeuralYamame-REBUILD can compare its chosen move with a locally installed Stockfish binary when available.
- Store benchmark history snapshots to track nodes-per-second and latency regressions over time.
- Add an opening-explorer confidence threshold so online master-game moves require a minimum sample size before overriding local search.

## Implemented optional comparator plan

A local Stockfish comparator should remain optional. The project now expects `STOCKFISH_PATH` only when a developer wants to compare NeuralYamame-REBUILD output with a local UCI Stockfish binary. This keeps the repository free of platform-specific Stockfish binaries and preserves the NeuralYamame-REBUILD identity.
