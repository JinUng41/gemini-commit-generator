# Change Rules

This document defines how agents must approach implementation work in this repository.

## Core Rule

For complex work, subagent review is mandatory.

Self-review is not enough.

## What Counts As Complex Work

Treat the work as complex if any of the following is true:
- more than one file is changed
- core runtime logic is changed
- validation behavior is changed
- config behavior is changed
- branch safety or staged-state behavior is changed
- docs are restructured across multiple files
- release or publish flow is changed
- user-visible CLI behavior changes

If unsure, treat the task as complex.

## Required Workflow For Complex Work

1. inspect the relevant files first
2. implement the change
3. run relevant local verification
4. request subagent review or validation
5. address meaningful findings
6. run follow-up verification if needed
7. only then report completion to the user

Do not skip step 4.

## What Local Verification Means

At minimum, run the checks that match the change.

Most code changes should run:

```bash
npm test
```

If the task touches packaging, releases, or publish flow, also consider checks such as:

```bash
npm pack --dry-run
```

If the task changes docs only, verify links, wording, and structure against the implementation.

## What Subagent Review Should Cover

Subagent review should focus on:
- logic bugs
- behavior regressions
- mismatches between docs and implementation
- missing tests or weak coverage
- hidden edge cases in interactive flows

Ask for review of the actual changed files, not a vague summary.

## How To Handle Findings

If the subagent returns meaningful findings:
- fix them
- do not ignore them without a clear reason
- re-run verification if the fixes affect behavior
- request re-review when appropriate

If the subagent reports no findings, you may report completion after your own verification is done.

## Small Work Exception

Trivial single-file edits may not require subagent review.

Examples:
- typo fix in one document
- one small wording adjustment in user-facing text
- one narrow comment change

Even then, use judgment. If the file is high-risk or the effect is user-visible, prefer review.

## Behavior Change Checklist

Before considering any behavior change complete, check whether you also need to update:
- tests
- `docs/`
- `README.md` or `README.ko.md`
- `AGENTS.md`
- `agent-docs/`

## High-Risk Areas In This Repository

Take extra care with:
- staged-only vs auto-stage behavior
- branch safety checks
- validation blocking vs warning logic
- regenerate flow
- edit flow
- release and publish steps

These areas are easy to explain incorrectly or to break through small changes.

## Explicit Prohibitions

Do not:
- rely on self-review alone for complex work
- report complex work complete before subagent review
- treat user-facing docs as agent-internal truth
- leave docs or tests stale after a behavior change
