# AI Collaboration Rules

## Overview

This document defines how human developers and AI assistants collaborate on the NeuralYamame chess engine project.

## Roles and Responsibilities

### Human Developer
- Define project vision and architecture
- Make final decisions on design trade-offs
- Review and approve all code changes
- Validate AI-generated suggestions
- Provide context and domain expertise

### AI Assistant
- Generate code implementations
- Suggest optimizations and improvements
- Identify potential bugs and issues
- Provide documentation drafts
- Offer alternative approaches

## Communication Protocol

### Task Specification
When requesting work from AI:
1. **Context**: Provide background information
2. **Objective**: Clearly state what needs to be done
3. **Constraints**: List any limitations or requirements
4. **Acceptance Criteria**: Define what "done" looks like

Example:
```
Context: We're implementing singular extension in the search module.
Objective: Add singular extension pruning to alphaBeta function.
Constraints: Must not break existing tests, maintain <5% overhead.
Acceptance: Passes perft, +30 Elo in testing, documented.
```

### Progress Updates
AI should report:
- What was completed
- Any issues encountered
- Decisions made and rationale
- Next steps recommended

### Clarification Requests
AI should ask when:
- Requirements are ambiguous
- Multiple valid approaches exist
- Trade-offs need human input
- Edge cases need clarification

## Code Quality Standards

### AI-Generated Code Must
- Follow established coding standards
- Include appropriate comments
- Have no TypeScript errors
- Pass existing tests
- Include new tests for new functionality

### Before Submitting AI Code
Human must:
- Review logic correctness
- Verify performance implications
- Check for security issues
- Ensure architectural consistency
- Run full test suite

## Decision Making Framework

### AI Can Decide
- Variable naming (within conventions)
- Code organization within functions
- Comment wording
- Test data selection

### AI Should Propose
- Algorithm choices
- Data structure selection
- Optimization strategies
- Refactoring opportunities

### Human Must Decide
- Architecture changes
- API modifications
- Breaking changes
- Performance vs. readability trade-offs
- Feature prioritization

## Iteration Process

### Single-Turn Tasks
For well-defined tasks:
1. Human provides specification
2. AI implements solution
3. Human reviews and approves/requests changes

### Multi-Turn Tasks
For complex tasks:
1. Human outlines goal
2. AI proposes approach
3. Human approves/refines approach
4. AI implements incrementally
5. Regular check-ins every 2-3 iterations
6. Final review and integration

## Knowledge Management

### Documentation
- AI drafts documentation
- Human validates accuracy
- Both contribute examples
- Keep docs synchronized with code

### Lessons Learned
- Document discovered patterns
- Record performance findings
- Note common pitfalls
- Share optimization techniques

## Error Handling

### When AI Makes Mistakes
1. Human identifies the issue
2. AI acknowledges and corrects
3. Root cause analysis if systemic
4. Update guidelines to prevent recurrence

### When Human Disagrees
1. Human explains reasoning
2. AI adjusts recommendations
3. Document decision rationale
4. Move forward collaboratively

## Continuous Improvement

### Feedback Loop
- Weekly review of AI contributions
- Identify improvement areas
- Update collaboration guidelines
- Share successful patterns

### Metrics to Track
- Code acceptance rate
- Review iteration count
- Bug introduction rate
- Productivity improvement

## Ethical Considerations

### Attribution
- AI contributions acknowledged
- No false claims of authorship
- Transparent about AI involvement

### Responsibility
- Human ultimately responsible for code
- AI is a tool, not a decision-maker
- Safety and correctness paramount

## Tools and Integration

### Recommended Workflow
```
Human → Task specification → AI
AI → Implementation draft → Human
Human → Review feedback → AI
AI → Revised implementation → Human
Human → Approval → Merge
```

### Version Control
- All AI code goes through Git
- Commit messages indicate AI assistance
- PR description notes AI contribution level
- Review comments address AI-specific concerns

## Best Practices

### For Humans
- Be specific in requests
- Provide timely feedback
- Explain rejection reasons
- Acknowledge good suggestions

### For AI
- Ask clarifying questions
- Explain your reasoning
- Offer alternatives
- Admit uncertainty
- Prioritize correctness over cleverness

## Emergency Procedures

### Critical Bug Discovery
1. Immediate notification
2. Collaborative debugging
3. Rapid fix development
4. Thorough testing before deployment
5. Post-mortem analysis

### Performance Regression
1. Identify source of regression
2. Compare against baseline
3. Develop mitigation strategy
4. Implement and verify fix
5. Update benchmarks
