# Getting Started

This guide is for first-time users who want to get `gcg` working quickly and understand what the tool expects.

## What `gcg` Does

`gcg` generates a git commit message from:
- your currently staged changes
- recent commit titles from the repository
- your current branch name and issue-like hints from that branch
- optional context you type at runtime

It then lets you:
- commit the generated message immediately
- regenerate a new draft
- edit the message in your editor and commit immediately if the result is valid
- cancel without committing

## Prerequisites

You need all of the following before `gcg` can work:

1. Node.js `18+`
2. Gemini CLI installed and available as `gemini`
3. Gemini CLI login already completed
4. A git repository

## Install

Install from npm:

```bash
npm install -g @devjinung41/gemini-commit-generator
```

If you are developing this repository locally, you can link the current source instead:

```bash
npm link
```

That makes the local `gcg` command use the source code from this checkout.

## First Run

Run `gcg` inside a git repository:

```bash
gcg
```

The normal flow is:

1. If you have not saved a default language, select English or Korean.
2. `gcg` checks that Gemini CLI and git are available.
3. `gcg` reads staged changes, or stages everything if `autoStage` is enabled.
4. `gcg` shows a summary of the staged files.
5. You can enter optional context such as the reason for the change.
6. Gemini drafts a commit message.
7. You choose `Commit`, `Regenerate`, `Edit`, or `Cancel`.

Tip:
- save a default language with `gcg config`
- the default language is stored in `~/.config/gcg/settings.json`

Important detail:
- `Edit` is not a preview-only step
- if the edited message passes validation, `gcg` commits it immediately after the editor closes

## Prepare Staged Changes First

By default, `gcg` uses staged changes only.

Typical flow:

```bash
git add src/app.js
git add README.md
gcg
```

If nothing is staged, `gcg` stops and asks you to stage files first unless you have enabled `autoStage` in `.gcgrc.json`.

## A Minimal Successful Example

```bash
git add src/signup-form.tsx
gcg
```

Possible interaction:

```text
$ gcg
Tip: save a default language with `gcg config`
Step 1: choose language
Step 2: staged changes are collected
Step 3: optionally describe why the change exists
Step 4: Gemini drafts a message
```

Then you can commit or adjust the result.

## Save A Default Language

If you do not want to choose a language every time, run:

```bash
gcg config
```

Then choose:
- `Default language`
- `English` or `Korean`

If you choose `Reset`, `gcg` removes the saved default language.

When that leaves `~/.config/gcg/settings.json` empty, `gcg` deletes the file.

## Local Development Usage

If you are working on this repository itself, these commands are the fastest feedback loop:

```bash
npm test
npm link
```

Then in another git repository:

```bash
gcg
```

If you do not want to link globally, you can run the source directly:

```bash
node /path/to/gemini-commit-generator/index.js
```

## Common First-Run Mistakes

### No staged changes

You ran `gcg` before `git add`.

Fix:

```bash
git add path/to/file
gcg
```

### Gemini CLI is installed but not logged in

`gcg` can launch Gemini but Gemini cannot serve requests yet.

Fix:

```bash
gemini
```

Complete the login flow once, then run `gcg` again.

### You are not inside a git repository

`gcg` only works inside git repositories.

Fix:

```bash
git rev-parse --show-toplevel
```

If that command fails, move into a git repository first.

## Next Docs

- [Configuration](./configuration.md)
- [Workflow](./workflow.md)
- [Validation](./validation.md)
- [Troubleshooting](./troubleshooting.md)
