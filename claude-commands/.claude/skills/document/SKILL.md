---
name: document
description: Update documentation after code changes
---

# Update Documentation Task

You are updating documentation after code changes.

## 1. Identify Changes
- Check git diff or recent commits for modified files
- Identify which features/modules were changed
- Note any new files, deleted files, or renamed files

## 2. Verify Current Implementation
**CRITICAL**: DO NOT trust existing documentation. Read the actual code.

For each changed file:
- Read the current implementation
- Understand actual behavior (not documented behavior)
- Note any discrepancies with existing docs

## 3. Update Relevant Documentation

- **CHANGELOG.md**: Add entry under "Unreleased" section
  - Use categories: Added, Changed, Fixed, Security, Removed
  - Be concise, user-facing language
- **System diagrams**: Keep the ASCII diagrams at the top of CHANGELOG.md in sync with INTRO.md
  - If architecture changed (new API routes, new components, new data flows), update both the CHANGELOG diagram and the matching diagram in INTRO.md
  - Diagrams to maintain: System Architecture, Chat & Goal Creation Flow, Calendar Integration, 3D Solar System Architecture, Database Schema

## 4. Documentation Style Rules

- **Concise** - Sacrifice grammar for brevity
- **Practical** - Examples over theory
- **Accurate** - Code verified, not assumed
- **Current** - Matches actual implementation

No enterprise fluff. No outdated information. No assumptions without verification.

## 5. Ask if Uncertain

If you're unsure about intent behind a change or user-facing impact, **ask the user** - don't guess.
