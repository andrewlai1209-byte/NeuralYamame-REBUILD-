# Review Checklist

## Architecture Review

### Module Structure
- [ ] Single responsibility principle followed
- [ ] Dependencies are minimal and acyclic
- [ ] Public API is well-defined and stable
- [ ] Internal implementation details hidden

### Data Flow
- [ ] Data ownership is clear
- [ ] No unnecessary data copying
- [ ] Immutable data where appropriate
- [ ] Thread-safety considered (for SMP)

## Code Quality Review

### Readability
- [ ] Variable names are descriptive
- [ ] Function names indicate purpose
- [ ] Complex logic has explanatory comments
- [ ] Consistent formatting throughout

### Maintainability
- [ ] No code duplication (DRY principle)
- [ ] Magic numbers replaced with constants
- [ ] Configuration externalized
- [ ] Error messages are helpful

### Performance
- [ ] Hot paths optimized
- [ ] No unnecessary allocations in loops
- [ ] Algorithm complexity appropriate
- [ ] Memory usage reasonable

## Chess Logic Review

### Correctness
- [ ] Move generation verified with perft
- [ ] Evaluation function tested on known positions
- [ ] Hash key updates are correct
- [ ] Special moves (castling, en passant, promotion) handled

### Edge Cases
- [ ] Empty board handling
- [ ] King-only endgames
- [ ] Maximum piece positions
- [ ] Invalid FEN strings

## Testing Review

### Coverage
- [ ] Unit tests for all public functions
- [ ] Integration tests for major workflows
- [ ] Performance benchmarks included
- [ ] Regression tests for bug fixes

### Quality
- [ ] Tests are deterministic
- [ ] Test names describe expected behavior
- [ ] Assertions have meaningful messages
- [ ] Test data is realistic

## Documentation Review

### Completeness
- [ ] README updated with changes
- [ ] API documentation current
- [ ] Architecture diagrams accurate
- [ ] Changelog entries added

### Clarity
- [ ] Examples are working code
- [ ] Diagrams are readable
- [ ] Terminology is consistent
- [ ] Links are not broken

## Security Review

### Input Validation
- [ ] FEN strings validated before parsing
- [ ] User input sanitized
- [ ] Buffer overflows prevented
- [ ] Resource limits enforced

### Data Integrity
- [ ] Hash collisions handled gracefully
- [ ] State corruption detected
- [ ] Recovery mechanisms in place
- [ ] No data races (for SMP)

## Pre-Merge Checklist

### Code Status
- [ ] All tests pass locally
- [ ] No TypeScript errors
- [ ] Linting passes
- [ ] No debug code left in

### Documentation
- [ ] Commit message follows convention
- [ ] PR description explains changes
- [ ] Related issues referenced
- [ ] Breaking changes documented

### Deployment
- [ ] Build succeeds
- [ ] Bundle size acceptable
- [ ] No new dependencies (or justified)
- [ ] Migration path defined (if needed)

## Post-Merge Actions

### Verification
- [ ] Deployed version works correctly
- [ ] Performance metrics monitored
- [ ] Error logs checked
- [ ] User feedback collected

### Follow-up
- [ ] Technical debt logged
- [ ] Future improvements identified
- [ ] Knowledge shared with team
- [ ] Documentation finalized
