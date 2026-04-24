# AGENTS.md

## Purpose

This file is the short operational contract for agents working in this repository.

Use it to understand:
- what this project is
- which behaviors are intentional and should not be changed casually
- how complex work must be reviewed
- where to find agent-only reference material

Do not turn this file into a full manual. Detailed agent guidance belongs in `agent-docs/`.

## Project Snapshot

This repository contains `gcg`, a Node.js CLI that generates git commit messages with the Gemini CLI.

Current product shape:
- staged-only by default
- optional per-repo config via `.gcgrc.json` at the git root
- branch context and recent commit history are prompt inputs
- minimal commit-message validation
- interactive actions: Commit, Regenerate, Edit, Cancel

Runtime requirements:
- Node.js `18+`
- `git`
- `gemini` CLI installed and authenticated

Published package:
- `@devjinung41/gemini-commit-generator`

## Mandatory Subagent Review

For complex work, self-review is not sufficient.

Complex work must be evaluated by a subagent before reporting completion to the user.

Complex work includes:
- changes across multiple files
- changes to core runtime logic
- changes to validation behavior
- changes to configuration behavior
- changes to release or publish flow
- large documentation restructures
- changes to branching, staging, or commit behavior
- any change that affects user-visible CLI behavior

Required workflow for complex work:
1. implement the change
2. run relevant local verification
3. request subagent review or validation
4. address meaningful findings
5. re-run verification if needed
6. only then report results to the user

Do not declare complex work complete until a subagent has reviewed it.

Self-evaluation may be used as a supplement, but never as a replacement for subagent review on complex work.

## Non-Negotiable Product Rules

### 1. Staged-only is the default

Default behavior is staged-only.

Do not change this casually.

If `autoStage` is enabled, the CLI runs `git add -A` before analysis.

### 2. Validation is intentionally minimal

Validation is not meant to enforce Conventional Commits.

Blocking failures are limited to clearly unusable output such as:
- empty message
- missing title
- AI wrapper/prefix text
- code fences that remain in the final normalized message

Warnings:
- title longer than 50 characters

Do not reintroduce strict style enforcement unless explicitly requested.

### 3. `historyCount` has a minimum of 5

If config sets `historyCount < 5`:
- the value is clamped to `5`
- a warning is surfaced

Do not weaken this rule casually.

### 4. Gemini model is not configurable

Gemini model selection is intentionally fixed in code.

Do not add config support for model selection unless explicitly requested.

### 5. Edit commits immediately if valid

The `Edit` action:
- opens the user's editor
- revalidates the edited message
- commits immediately if valid

It does not return to the menu first when validation passes.

### 6. Branch safety is intentional behavior

If `strictBranchCheck` is enabled, the CLI blocks when the branch is:
- behind
- diverged
- detached HEAD

It warns but continues when:
- there is no upstream branch
- the local branch is ahead of remote

### 7. Branch context is advisory

Branch name and issue-like hints are prompt inputs.

They are hints, not hard requirements.

Do not turn branch-derived issue hints into mandatory commit output unless explicitly requested.

## Config Rules

Supported `.gcgrc.json` keys are currently:
- `autoStage`
- `historyCount`
- `notifyOnComplete`
- `strictBranchCheck`
- `fetchBeforeSyncCheck`

Config file location:
- git repository root only

Unknown keys are ignored with warnings.

Detailed config behavior belongs in `agent-docs/` and user-facing docs, not here.

## Documentation Boundaries

User-facing docs live in `docs/`.

Agent-facing docs live in `agent-docs/`.

Keep those roles separate.

### README rules

`README.md` and `README.ko.md` must stay short and onboarding-focused.

They should contain:
- what the tool is
- prerequisites
- install
- quick start
- links to deeper docs

Do not expand README back into a full reference manual.

### `docs/` rules

`docs/` is for users.

Do not store agent-only process rules there.

### Mermaid rules

Mermaid diagrams are allowed when they clarify important flows.

If you update a Mermaid diagram:
- ensure it matches the implementation exactly
- do not simplify away meaningful behavior differences

## Testing Expectations

When code changes, run:

```bash
npm test
```

If you change any of the following, update tests as needed:
- config normalization
- branch issue-hint extraction
- validation behavior

This repository mostly has unit-level coverage.

Higher-risk areas that deserve extra care:
- regenerate after staged-state changes
- edit flow
- branch-state transitions
- commit failure after menu selection

## Release Notes

Typical release flow:
1. update version in `package.json`
2. refresh `package-lock.json`
3. run tests
4. publish to npm
5. create git tag
6. create GitHub release

Keep package version, git tag, and release aligned.

## Commit Style Guidance

Recent manual commits in this repository often use bracket-style Korean titles such as:
- `[Refactor] ...`
- `[Docs] ...`
- `[Chore] ...`

If asked to create commits for this repository, prefer the recent style unless the user asks otherwise.

## Reference Docs For Agents

- Project map: `agent-docs/project-map.md`
- Change and review rules: `agent-docs/change-rules.md`
- Documentation rules: `agent-docs/doc-rules.md`
- Release playbook: `agent-docs/release-playbook.md`

Use those files for details instead of growing this file.

## Things To Avoid

- Reintroducing strict commit-style enforcement
- Making Gemini model configurable again without explicit request
- Expanding README back into a full manual
- Changing staged-only default without treating it as a significant behavior change
- Letting Mermaid diagrams drift from real behavior
- Reporting complex work complete without subagent review
