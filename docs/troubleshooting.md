# Troubleshooting

This document covers the most common ways `gcg` can stop, warn, or behave differently than you expected.

## Gemini CLI Is Not Installed

Symptom:
- `gcg` stops immediately and says Gemini CLI is not installed

Fix:

```bash
npm install -g @google/gemini-cli
```

Then verify:

```bash
gemini --version
```

## Gemini Authentication Required

Symptom:
- `gcg` can run Gemini but message generation fails with an authentication-related error

Fix:

```bash
gemini
```

Complete the login flow once, then try `gcg` again.

## This Is Not A Git Repository

Symptom:
- `gcg` says the current directory is not a git repository

Fix:

Move into a git repository and verify:

```bash
git rev-parse --show-toplevel
```

## No Staged Changes Found

Symptom:
- `gcg` exits because there are no staged changes

Why it happens:
- default behavior is staged-only

Fix options:

```bash
git add path/to/file
gcg
```

Or enable auto staging in `.gcgrc.json`:

```json
{
  "autoStage": true
}
```

## No Upstream Branch Is Configured

Symptom:
- `gcg` warns that no upstream branch is configured

Meaning:
- remote pointer comparison cannot be performed
- this is a warning, not a hard failure

Common reason:
- the branch has never been pushed with tracking

Typical fix:

```bash
git push -u origin <branch-name>
```

## Branch Is Behind Remote

Symptom:
- `gcg` blocks generation or commit because the remote branch is ahead

Fix:

```bash
git pull --rebase
```

Then resolve any conflicts, restage if needed, and run `gcg` again.

## Branch Has Diverged

Symptom:
- `gcg` blocks because local and remote have different commits

Fix:
- sync the branch manually
- usually this means rebasing or merging first

Example:

```bash
git pull --rebase
```

## Detached HEAD

Symptom:
- `gcg` blocks because HEAD is detached

Meaning:
- you are not on a normal named branch

Fix:
- switch back to a branch
- or create a branch before using `gcg`

Example:

```bash
git switch -c my-work-branch
```

## Config Warnings

Symptom:
- `gcg` prints warnings about `.gcgrc.json`

Common causes:
- invalid JSON
- unknown keys
- wrong value types
- `historyCount` below `5`

Behavior:
- `gcg` does not crash for these cases
- it falls back to defaults or ignores the invalid key

## Why The Message Was Regenerated Automatically

Symptom:
- `gcg` says the first AI response failed validation and was regenerated once

Meaning:
- the original output was not usable as a commit message
- for example it may have been empty or included AI wrapper text

## Why Commit Is Still Blocked After Regeneration

Symptom:
- even after automatic retry, `gcg` still refuses direct commit

Meaning:
- the second response still failed blocking validation

Options:
- choose `Regenerate`
- choose `Edit` and fix the message manually
- choose `Cancel`

## Editor Opens But Commit Does Not Happen

Symptom:
- you edited the message, closed the editor, and `gcg` did not commit

Possible reasons:
- the file was closed without saving
- the final edited message still failed blocking validation
- branch safety check failed before the commit step

## Commit Fails After You Choose Commit

Symptom:
- `gcg` reaches the commit step but `git commit` itself fails

Possible reasons:
- git hooks rejected the commit
- repository state changed while the menu was open
- staged content disappeared or became invalid

What to do:
- read the `git commit` output carefully
- fix the hook or repository issue
- run `gcg` again if needed

## Related Docs

- [Getting Started](./getting-started.md)
- [Configuration](./configuration.md)
- [Workflow](./workflow.md)
- [Validation](./validation.md)
