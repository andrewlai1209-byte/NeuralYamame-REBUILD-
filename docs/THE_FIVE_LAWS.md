# The Six Laws of NeuralYamame REBUILD

> **Status**: Supreme Engineering Constitution  
> **Authority**: Absolute - Overrides all other guidelines  
> **Effective**: Immediately upon project inception

These laws are not suggestions. They are the fundamental physical constants of the NeuralYamame REBUILD universe. Violating them is not an option; it is architectural suicide.

---

## The First Law: Architecture Over Preservation

> **Never optimize for minimal code changes.**  
> **Always optimize for the strongest possible long-term architecture.**

If achieving a superior design requires:
- Rewriting an entire subsystem
- Redesigning public APIs
- Reorganizing the project structure
- Replacing legacy implementations

**You are explicitly expected to do so.**

### Principles
- Existing code has **no special status** simply because it already exists.
- Every module must continuously justify its existence through:
  - Correctness
  - Maintainability
  - Performance
  - Scalability
  - Architectural clarity
- Prefer **deleting weak code** over preserving technical debt.
- Prefer a **clean redesign** over incremental patching.
- Prefer **sustainable engineering** over short-term convenience.

### Time Horizon
Every architectural decision should be made as if this engine will continue evolving for the **next ten years**.

### Objective
The objective is **never** to minimize changes.  
The objective is to **maximize** the long-term strength, clarity, and extensibility of the engine.

---

## The Second Law: Purposeful Existence

> **Every line of code must have a long-term purpose.**

No code should exist merely because it is:
- Convenient
- Experimental (without a path to production)
- Historically inherited

### Justification Criteria
Every class, function, module, algorithm, optimization, and abstraction **must** contribute to at least one of the following:

1. **Increase playing strength** (Elo gain)
2. **Improve correctness** (bug-free, deterministic)
3. **Improve maintainability** (readable, modular, documented)
4. **Improve scalability** (parallelizable, resource-efficient)
5. **Improve performance** (NPS, latency reduction)
6. **Improve testability** (unit-testable, mockable)
7. **Improve future extensibility** (open-closed principle)

### Enforcement
If a piece of code cannot clearly justify its existence under these principles, it must be:
- **Redesigned** to meet criteria, or
- **Removed** entirely

---

## The Third Law: Evolution Over Preservation

> **Do not preserve architecture. Preserve quality.**

Architecture is **not** an artifact to protect.  
Architecture is a **living system** that must continuously evolve.

### Core Beliefs
- If a better design exists, the previous architecture is **temporary**.
- Never allow compatibility with legacy design to become an obstacle to future improvements.
- **Evolution** is preferred over preservation.
- **Refactoring** is not maintenance—it is continuous improvement.

### When to Break Compatibility
Break compatibility when:
- A superior algorithm emerges
- A cleaner abstraction is discovered
- Technical debt accumulates beyond sustainable levels
- The current design limits future growth

---

## The Fourth Law: Feature Cost Awareness

> **Every feature carries a permanent maintenance cost.**

Before introducing **any** new:
- Feature
- Optimization
- Abstraction
- Dependency
- Subsystem

You **must** evaluate its lifetime cost.

### The Five Questions
Ask before implementation:

1. **Does it measurably improve the engine?** (Benchmark required)
2. **Can it be tested?** (Unit tests, integration tests)
3. **Can it be maintained?** (Clear ownership, documentation)
4. **Will it still make sense in five years?** (Long-term viability)
5. **Does it simplify or complicate the architecture?** (Net complexity impact)

### Decision Rule
**If the long-term cost outweighs the long-term value, DO NOT implement it.**

### Anti-Feature Stance
- No "nice-to-have" features without measurable benefit
- No experimental code in main branches
- No dependencies without clear justification
- No abstractions without multiple use cases

---

## The Fifth Law: Architect Before Implement

> **Architect before you implement.**

**Implementation is never the first step.**

### The Nine-Step Process
Every significant change **must** follow this order:

1. **Understand the problem** (Root cause analysis)
2. **Analyze the existing architecture** (Current state assessment)
3. **Identify weaknesses** (Gap analysis)
4. **Compare multiple possible designs** (At least 2-3 alternatives)
5. **Select the strongest long-term solution** (Decision matrix)
6. **Validate correctness** (Proof of concept, formal verification if needed)
7. **Implement** (Clean, tested, documented)
8. **Benchmark** (Performance, strength, memory)
9. **Review** (Peer review, self-review against laws)
10. **Document** (Update architecture docs, API docs, changelog)

### Enforcement
**Writing code without architectural reasoning is considered incomplete engineering.**

Pull requests without:
- Design rationale
- Alternative analysis
- Benchmark plans
- Test strategies

Will be **rejected**.

---

## The Sixth Law: Learn, Don't Copy

> **Never copy Stockfish. Learn from Stockfish.**

Study successful ideas, algorithms, and engineering practices from leading chess engines, but **implement them independently**.

### Core Philosophy
- The goal is to **understand underlying principles**—not to reproduce another engine.
- Every adopted technique must fit **NeuralYamame REBUILD's** own:
  - Architecture
  - Design philosophy
  - Long-term roadmap

### What We Study
- AlphaZero's neural network architectures
- Stockfish's search optimizations (NNUE, LMR, extensions)
- Leela Chess Zero's MCTS innovations
- Komodo's evaluation principles
- Ethereal's engineering practices

### What We Do Not Do
- Copy-paste code from any engine
- Blindly adopt techniques without understanding
- Sacrifice our architecture for compatibility with others
- Chase Elo gains at the expense of code quality

### Implementation Principle
**Reinvent the wheel—but make it rounder, faster, and more maintainable.**

---

## Enforcement Mechanisms

### Code Review Checklist
Every PR must be validated against all six laws:
- [ ] Does this change optimize for long-term architecture? (Law 1)
- [ ] Does every line have a justified purpose? (Law 2)
- [ ] Does this evolve or preserve quality? (Law 3)
- [ ] Has the lifetime cost been evaluated? (Law 4)
- [ ] Was architecture designed before implementation? (Law 5)
- [ ] Is this an independent implementation based on understanding? (Law 6)

### Architecture Review Triggers
Mandatory architecture review required when:
- Adding new subsystems
- Changing public APIs
- Introducing new dependencies
- Modifying core data structures
- Adding search/evaluation features

### Technical Debt Policy
- Technical debt must be tracked in dedicated issues
- Debt repayment is prioritized over new features (80/20 rule)
- Debt older than 3 months requires escalation

---

## Historical Context

These laws were forged from the lessons of countless failed chess engine projects:
- Engines that became unmaintainable due to premature optimization
- Projects that accumulated unsustainable technical debt
- Clones that never surpassed their inspirations due to lack of understanding
- Features that added complexity without strength gains

**NeuralYamame REBUILD will be different.**

---

## Living Document

This document evolves as our understanding deepens. However, the core principles are immutable. Any proposed changes to these laws require:
- Consensus from all core contributors
- Demonstration that the change strengthens the principles
- Documentation of the reasoning process

---

**Remember**: We are not building a chess engine for today. We are building the foundation for the next decade of chess AI innovation.
