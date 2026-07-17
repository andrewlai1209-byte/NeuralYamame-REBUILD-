# Git Workflow

## Branch Strategy

### Main Branches
- `main` - Production-ready code (stable releases)
- `develop` - Integration branch for features

### Feature Branches
```
feature/<description>     # New features
fix/<bug-id-description>  # Bug fixes
perf/<optimization>       # Performance improvements
docs/<documentation>      # Documentation updates
test/<test-suite>         # Test additions
```

## Commit Message Convention

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `perf`: Performance improvement
- `docs`: Documentation change
- `style`: Code style change (no logic impact)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Build/config changes

### Examples
```
feat(search): add singular extension pruning

Implement singular extension as described in Stockfish paper.
Extension triggers when one move is significantly better than alternatives.

Fixes #142
Elo gain: +35 ± 28

---

fix(board): correct FEN parsing for empty squares

The parser was incorrectly handling consecutive numbers in FEN strings.
Changed sq increment logic to properly skip multiple empty squares.

Fixes #156
Perft verified up to depth 6

---

perf(nnue): optimize accumulator update loop

Use typed array operations and reduce function call overhead.
Precompute weight offsets for faster indexing.

Benchmark: eval time reduced from 45μs to 28μs (+60% speedup)
```

## Pull Request Process

### Before Creating PR
1. Rebase on latest `develop`
2. Run all tests locally
3. Check benchmark regression
4. Update documentation

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Performance improvement
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Perft verification completed
- [ ] Benchmarks recorded

## Performance Impact
- NPS change: +/- X%
- Memory change: +/- Y MB
- Elo estimate: +/- Z points

## Related Issues
Fixes #XXX, Related to #YYY
```

### Review Requirements
- At least 1 approval required
- All CI checks must pass
- No benchmark regression >5%
- Documentation updated

## Release Process

### Version Numbering
Follow Semantic Versioning: `MAJOR.MINOR.PATCH`
- MAJOR: Breaking changes
- MINOR: New features (backwards compatible)
- PATCH: Bug fixes only

### Release Checklist
```
[ ] Update version in package.json
[ ] Update CHANGELOG.md
[ ] Run full test suite
[ ] Create release tag: git tag -a v1.2.3 -m "Release v1.2.3"
[ ] Push tag: git push origin v1.2.3
[ ] Create GitHub release with notes
[ ] Deploy to production
```

## Hotfix Procedure

For critical bugs in production:

1. Branch from `main`: `git checkout -b hotfix/critical-bug main`
2. Fix the bug
3. Test thoroughly
4. Merge to `main` and `develop`
5. Create patch release

## Daily Workflow

### Starting Work
```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-feature
```

### During Work
```bash
# Make changes
git add .
git commit -m "feat(scope): describe change"

# Sync with develop regularly
git fetch origin
git rebase origin/develop
```

### Finishing Work
```bash
git push origin feature/my-feature
# Create PR on GitHub
# Address review comments
# Merge when approved
```

## Conflict Resolution

### Preferred Method: Rebase
```bash
git fetch origin
git rebase origin/develop
# Resolve conflicts
git rebase --continue
git push --force-with-lease
```

### Alternative: Merge
```bash
git merge origin/develop
# Resolve conflicts
git commit
git push
```

## Emergency Procedures

### Reverting Bad Commits
```bash
# Find the bad commit
git log --oneline

# Revert it
git revert <commit-hash>
git push origin develop
```

### Rolling Back Release
```bash
# Tag previous version
git tag -a v1.2.2-backup <previous-commit>

# Deploy previous version
# Investigate issue
# Create new fix release
```

## Repository Maintenance

### Cleaning Old Branches
```bash
# List merged branches
git branch --merged develop

# Delete local merged branches
git branch --merged develop | grep -v "\*" | xargs git branch -d

# Delete remote merged branches (careful!)
git fetch -p
```

### History Cleanup (Before Merge Only)
```bash
# Interactive rebase to squash commits
git rebase -i HEAD~5

# NEVER rewrite history on shared branches
```
