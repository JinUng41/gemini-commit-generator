# Project Map

This document explains where major behavior lives in the codebase so an agent can quickly locate the correct file to change.

## Top-Level Structure

- `index.js`
  - CLI entrypoint
  - Orchestrates the full runtime flow
  - Wires together config, git state, AI generation, validation, editor flow, and commit flow
  - Routes commands like `help` and `config`

- `src/`
  - Core implementation modules

- `test/`
  - Unit tests for current behavior

- `README.md`, `README.ko.md`
  - Quick onboarding only

- `docs/`
  - User-facing detailed documentation

- `agent-docs/`
  - Agent-facing guidance and process rules

## Module Responsibilities

## `index.js`

Use this file when changing:
- CLI orchestration order
- menu behavior
- when branch checks run
- when config is loaded
- when Gemini generation is triggered
- when validation warnings or blocking errors are shown

This file should stay orchestration-focused.

If logic becomes reusable, move it into `src/` rather than growing `index.js` again.

This file also decides:
- whether saved global language is used
- whether interactive language selection is needed
- when `gcg config` runs instead of the normal commit flow

## `src/config.js`

Use this file when changing:
- supported `.gcgrc.json` keys
- default config values
- value normalization
- warning generation for config issues

Important current rules:
- config is loaded from git repository root only
- unknown keys are ignored with warnings
- `historyCount < 5` is clamped to `5`
- Gemini model selection is intentionally not configurable

## `src/global-config.js`

Use this file when changing:
- global language preference storage
- the location of `~/.config/gcg/settings.json`
- reset behavior for saved language

Important current rules:
- this file is separate from `.gcgrc.json`
- current global scope is language preference only
- reset removes `settings.json` when it becomes empty

## `src/git.js`

Use this file when changing:
- git root detection
- staged summary logic
- staged diff collection
- branch safety checks
- issue hint extraction from branch names
- recent history collection

Important current rules:
- staged-only is the default workflow
- `autoStage` uses `git add -A`
- generation-time diff collection is based on the current staged state
- `Regenerate` refreshes staged context and rebuilds the prompt from current staged state
- `Commit` compares the current staged snapshot against the analyzed snapshot and blocks if they differ
- be careful not to overstate analyzed-vs-committed scope guarantees in docs or guidance

## `src/ai.js`

Use this file when changing:
- Gemini prompt construction
- normalization of Gemini output
- validation rules
- warning vs blocking behavior
- automatic retry behavior

Important current rules:
- validation is intentionally minimal
- title length over 50 is a warning, not a block
- only clearly unusable output should block
- model selection is fixed in code

## `src/commit.js`

Use this file when changing:
- editor integration
- temp file handling for commit messages
- the actual `git commit -F` invocation

Important current rule:
- edited messages commit immediately if valid

## `src/notifier.js`

Use this file when changing completion notifications.

Current scope is intentionally small:
- terminal bell only

## `src/ui.js`

Use this file when changing:
- user-facing CLI strings
- EN/KO text
- spinner behavior
- printing helpers

Keep user-visible wording aligned with real behavior.

## Tests

## `test/config.test.js`

Update this when changing:
- config normalization
- config fallback behavior
- warnings for invalid config

## `test/global-config.test.js`

Update this when changing:
- `~/.config/gcg/settings.json` location
- saved default language behavior
- reset behavior for global language

## `test/git.test.js`

Update this when changing:
- branch issue hint extraction
- branch parsing assumptions

## `test/ai.test.js`

Update this when changing:
- validation behavior
- normalization behavior
- warning vs blocking behavior

## Documentation Mapping

User docs:
- onboarding: `README.md`, `README.ko.md`
- user detail: `docs/`

Agent docs:
- process and internal guidance: `agent-docs/`

If a code change affects user-visible behavior, update user docs.

If a code change affects internal agent expectations, update agent docs.

## Where To Start For Common Changes

### Config behavior change
- `src/config.js`
- `test/config.test.js`
- `docs/configuration.md`
- possibly `AGENTS.md` or `agent-docs/`

### Validation behavior change
- `src/ai.js`
- `index.js`
- `test/ai.test.js`
- `docs/validation.md`
- possibly `docs/workflow.md`

### Branch behavior change
- `src/git.js`
- `index.js`
- `test/git.test.js`
- `docs/workflow.md`
- `docs/troubleshooting.md`

### README or docs restructure
- `README.md`
- `README.ko.md`
- `docs/`
- `AGENTS.md` or `agent-docs/` if agent guidance also changes

### Release or publish process change
- `package.json`
- `package-lock.json`
- `agent-docs/release-playbook.md`
- release docs if user-facing behavior changes
