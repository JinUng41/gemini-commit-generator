# gemini-commit-generator 🤖

`gcg` is a cross-platform AI commit assistant for git repositories. It reads your staged changes, recent commit history, and current branch context, then drafts a commit message with the Gemini CLI.

**English** | [한국어](./README.ko.md)

## Prerequisites
1. [Node.js](https://nodejs.org/) `18+`
2. [Gemini CLI](https://github.com/google/gemini-cli) installed and available as `gemini`
3. Gemini CLI authentication completed once in your terminal

## Install
```bash
npm install -g @devjinung41/gemini-commit-generator
```

For local development from this repository:
```bash
npm link
```

## Quick Start
1. Stage the files you want in the commit.
```bash
git add path/to/file
```

2. Run `gcg` inside the git repository.
```bash
gcg
```

3. If no default language is saved yet, choose a language.

You can save one for later with:
```bash
gcg config
```

4. Optionally add extra context, then select one of:
- `Commit`
- `Regenerate`
- `Edit` to open your editor and commit immediately if the edited message is valid
- `Cancel`

## What To Expect
- `gcg` uses staged changes only by default.
- You can save a default language in `~/.config/gcg/settings.json` with `gcg config`.
- Use `gcg help` for a short command summary.
- If you want it to stage everything automatically, create `.gcgrc.json` at the git root and set `autoStage` to `true`.
- Branch safety checks are enabled by default.
- If Gemini returns unusable output, `gcg` retries once automatically.

## Docs
- [Getting Started](./docs/getting-started.md)
- [Configuration](./docs/configuration.md)
- [Workflow](./docs/workflow.md)
- [Validation](./docs/validation.md)
- [Troubleshooting](./docs/troubleshooting.md)

## License
MIT
