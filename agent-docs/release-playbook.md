# Release Playbook

This document describes the expected release flow for this repository.

## Typical Release Sequence

1. finish code and documentation changes
2. run relevant verification, usually `npm test`
3. update version in `package.json`
4. refresh `package-lock.json`
5. commit the version bump
6. publish to npm
7. create a git tag
8. create a GitHub release

Keep these artifacts aligned:
- npm package version
- `package.json` version
- git tag version
- GitHub release version

## Versioning Expectations

Use semver intentionally.

Examples:
- patch for small fixes
- minor for backward-compatible feature additions
- major when defaults, supported runtime versions, or core behavior change

Examples of changes that may justify a major bump in this repository:
- staged-only default replacing auto-stage assumptions
- Node runtime floor changes
- major config or validation philosophy changes

## Before Publish

Typical checks:

```bash
npm test
```

```bash
npm pack --dry-run
```

Check package contents before publish.

## npm Publish Notes

Typical command:

```bash
npm publish --access public
```

Common issues:
- npm authentication required
- one-time password or browser-based approval required

Do not assume publish succeeded until npm confirms it.

## Tag And Release

Typical tag naming:

```text
vX.Y.Z
```

Typical flow:

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

Then create the GitHub release.

## Release Notes Guidance

Release notes should summarize:
- major code changes
- user-visible behavior changes
- breaking changes
- documentation changes when they matter to users

When a release changes defaults or runtime requirements, call that out explicitly.

## Documentation Sync During Release

Before finalizing a release, verify that:
- README still reflects onboarding truth
- `docs/` reflects user-visible behavior
- `AGENTS.md` and `agent-docs/` reflect internal process truth

## Post-Release Sanity Check

Useful follow-up checks:

```bash
npm view @devjinung41/gemini-commit-generator version
```

Verify that:
- npm shows the expected version
- git tag exists remotely
- GitHub release is present

## Process Reminder

If release work touches multiple files or changes process behavior, it is complex work.

That means subagent review is still required before reporting completion.
