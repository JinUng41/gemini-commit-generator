# Documentation Rules

This repository intentionally separates user-facing docs from agent-facing guidance.

## Documentation Boundaries

### User-facing docs

These are for users:
- `README.md`
- `README.ko.md`
- `docs/`

Use them to explain installation, usage, configuration, workflow, validation, and troubleshooting from a user's point of view.

### Agent-facing docs

These are for agents:
- `AGENTS.md`
- `agent-docs/`

Use them to describe internal editing rules, review requirements, release process, and repository-specific invariants.

Do not push agent-only process rules into `docs/`.

## README Rules

`README.md` and `README.ko.md` must remain onboarding-focused.

They should stay short.

Allowed content:
- what the tool is
- prerequisites
- install
- quick start
- short expectation-setting bullets
- links to detailed docs

Avoid turning README into:
- a full configuration reference
- a full validation reference
- a complete troubleshooting manual
- an internal contributor guide

## `docs/` Rules

`docs/` is where detailed user explanations belong.

Current user doc roles:
- `docs/getting-started.md`
- `docs/configuration.md`
- `docs/workflow.md`
- `docs/validation.md`
- `docs/troubleshooting.md`

When changing behavior, update the relevant user docs.

## Mermaid Rules

Mermaid diagrams are allowed only when they improve comprehension.

Current valid homes for diagrams include:
- `docs/workflow.md`
- `docs/validation.md`
- `docs/configuration.md`

If you change a Mermaid diagram:
- verify that it matches the implementation exactly
- include important branches that affect behavior
- avoid wording that overstates what the CLI actually does

If a diagram drifts from the code, fix the diagram or remove it.

## When To Update Docs

Update user docs when changing:
- config behavior
- workflow order
- validation behavior
- branch safety behavior
- release-facing user instructions

Update agent docs when changing:
- internal process rules
- review requirements
- repository invariants
- release playbook expectations

## Style Guidance For Agent Docs

Agent docs should be:
- concise
- rule-oriented
- implementation-aware
- clearly separate from user documentation

Prefer:
- bullets
- short sections
- direct statements of intent

Avoid:
- restating the entire user manual
- long narrative explanations that belong in `docs/`

## Sync Rule

If behavior changes, do not update only one side.

Consider whether the change affects:
- code
- tests
- user docs
- agent docs

The repository should not rely on a single source file while other guidance goes stale.
