# NNUE Roadmap

## Current State (v0.4)

- ✓ 256 hidden neurons (upgraded from 16)
- ✓ Incremental accumulator updates
- ✓ Clipped ReLU activation
- ✓ Dual-perspective evaluation
- ✓ Deterministic weight initialization

## Phase 1: Foundation (Completed)

### Architecture
- Input: 768 features (12 piece types × 64 squares)
- Hidden: 256 neurons
- Output: Single score

### Features Implemented
- Basic piece-square encoding
- Perspective-based view
- Incremental updates for make/unmake moves

### Weight Initialization
- Material-based seeding
- Spatial importance factors
- Controlled randomization

## Phase 2: Enhancement (In Progress)

### Network Structure Improvements
- [ ] Multi-layer architecture (2 hidden layers)
- [ ] Attention mechanisms for piece interactions
- [ ] Pawn structure specific sub-network

### Feature Enrichment
- [ ] Castling rights as features
- [ ] En passant availability
- [ ] Move history context
- [ ] Threat detection features

### Training Pipeline
- [ ] Self-play data collection
- [ ] Position labeling with search results
- [ ] Gradient descent optimization
- [ ] Validation against known positions

## Phase 3: Advanced Features (Planned)

### Hybrid Evaluation
- Combine NNUE with classical terms
- Dynamic weighting based on position type
- Special handling for unusual positions

### Efficiency Optimizations
- SIMD instructions for bulk operations
- Quantized weights (int8 instead of float32)
- Selective update strategies

### Specialized Networks
- Opening book integration
- Endgame-specific networks
- Tactical pattern recognition

## Implementation Timeline

| Milestone | Target Date | Key Deliverables |
|-----------|-------------|------------------|
| v0.4 Base | Q1 2025 | 256-neuron network, incremental updates |
| v0.4 Enhanced | Q2 2025 | Improved features, better initialization |
| v0.5 SMP-Aware | Q3 2025 | Thread-safe accumulators, shared evaluation |
| v1.0 Production | Q4 2025 | Trained weights, optimized inference |

## Performance Targets

| Metric | Current | Target |
|--------|---------|--------|
| Eval time | ~50μs | <20μs |
| Memory usage | 2MB | <1MB |
| Accuracy (vs deep search) | 75% | >90% |
| Correlation with Stockfish | 0.70 | >0.85 |

## Testing Strategy

### Unit Tests
- Feature index calculation
- Accumulator update correctness
- Forward propagation accuracy

### Integration Tests
- Full game evaluation consistency
- Make/unmake move round-trip
- Hash key synchronization

### Benchmark Positions
- Bratko-Kopec tactical test set
- Strategic position database
- Endgame tablebase comparison

## Known Limitations

1. **No Training Yet**: Weights are heuristically initialized, not trained
2. **Limited Context**: No awareness of move history or tempo
3. **Fixed Architecture**: Cannot adapt to different position types dynamically

## Future Research Directions

- Transformer-based attention for long-range piece interactions
- Graph neural networks for board representation
- Reinforcement learning for weight optimization
- Multi-task learning (evaluation + move prediction)

## Dependencies

- TypeScript/JavaScript runtime
- BigInt support for bitboards
- Float32Array for efficient storage
- Web Workers for async training (future)
