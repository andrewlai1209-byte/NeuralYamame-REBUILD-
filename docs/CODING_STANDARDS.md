# Coding Standards

## TypeScript Guidelines

### Type Safety
```typescript
// GOOD: Explicit types for clarity
const pieceType: number = PIECE_QUEEN;
const colorBB: bigint[] = [0n, 0n];

// AVOID: Implicit any types
function process(data) { ... } // Missing type annotation
```

### Naming Conventions
```typescript
// Classes: PascalCase
class BitboardEngine { }

// Functions/Methods: camelCase
function generateMoves() { }

// Constants: UPPER_SNAKE_CASE
const MAX_DEPTH = 64;

// Private members: prefix with underscore (optional)
private _internalState: number;
```

### File Organization
```typescript
// 1. Imports (grouped by source)
import { Chess } from 'chess.js';
import { BitboardEngine } from './board';

// 2. Constants
export const PIECE_PAWN = 0;

// 3. Interfaces/Types
export interface Move { }

// 4. Classes
export class Engine { }

// 5. Functions
export function evaluate() { }
```

## Performance Rules

### Hot Path Restrictions
In search-critical code (alphaBeta, quiesce, makeMove):
- NO object creation
- NO array allocation
- NO string operations
- NO function calls (inline when possible)

### Memory Efficiency
```typescript
// GOOD: Typed arrays for numeric data
const accumulators = new Float32Array(256);

// AVOID: Regular arrays for numbers
const accumulators = [];
```

### BigInt Usage
```typescript
// Precompute powers of 2
const BIT_POWERS = Array.from({ length: 64 }, (_, i) => 1n << BigInt(i));

// Use in hot paths instead of computing
const bit = BIT_POWERS[sq];
```

## Documentation Requirements

### Function Documentation
```typescript
/**
 * Generate all pseudo-legal moves for current position
 * @param board - Current board state
 * @param onlyCaptures - If true, only generate capture moves
 * @returns Array of moves sorted by MVV-LVA
 */
export function generateMoves(board: BitboardEngine, onlyCaptures = false): Move[] { }
```

### Inline Comments
```typescript
// GOOD: Explains WHY, not WHAT
// Subtract 15 to move from h8 (63) to a7 (48)
// This accounts for rank change (-8) and file reset (-7)
sq -= 15;

// AVOID: Redundant comments
sq -= 15; // Subtract 15 from sq
```

## Error Handling

### Defensive Programming
```typescript
// Validate inputs
if (sq < 0 || sq >= 64) {
    throw new Error(`Invalid square: ${sq}`);
}

// Handle edge cases gracefully
public getPiece(sq: number): number {
    if (sq < 0 || sq >= 64) return -1;
    // ...
}
```

### Assertion Strategy
```typescript
// Debug-only assertions
if (DEBUG) {
    console.assert(pieceCount <= 32, 'Too many pieces');
}
```

## Testing Standards

### Unit Test Structure
```typescript
describe('BitboardEngine', () => {
    describe('parseFen', () => {
        it('should parse standard starting position', () => {
            const board = new BitboardEngine();
            board.parseFen(START_FEN);
            expect(board.pieceBB[COLOR_WHITE][PIECE_PAWN]).toBe(0xFF00n);
        });
    });
});
```

### Performance Tests
```typescript
it('should achieve target NPS', () => {
    const start = performance.now();
    engine.search(depth, timeLimit);
    const duration = performance.now() - start;
    const nps = nodes / (duration / 1000);
    expect(nps).toBeGreaterThan(500000);
});
```

## Code Review Checklist

### Before Submitting
- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] No console.log in production code
- [ ] Documentation updated
- [ ] Benchmarks recorded if performance changed

### Reviewer Focus Areas
- Correctness of chess logic
- Performance implications
- Code clarity and maintainability
- Test coverage adequacy

## Version Control

### Commit Messages
```
feat: add singular extension to search

- Implement singular extension pruning
- Add test cases for extension triggers
- Update documentation

Fixes #123
```

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `perf/description` - Performance improvements
- `docs/description` - Documentation updates
