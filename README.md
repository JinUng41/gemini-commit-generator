# gemini-commit-generator 🤖

A cross-platform, zero-config AI commit tool that learns your project's style and generates high-quality commit messages using the Google Gemini CLI.

**English** | [한국어](./README.ko.md)

## ✨ Features
- **Multi-language Support**: Select between English and Korean at startup.
- **Cross-Platform**: Works seamlessly on macOS, Linux, and Windows via Node.js.
- **Auto Staging**: Automatically stages all changes (`git add .`) on execution.
- **Branch Safety Guard**: Compares local and remote branch pointers before commit. Blocks commit when branch is behind/diverged/detached.
- **Zero Config**: Automatically detects your project's language and format from `git history`.
- **Context Aware**: Captures the "why" from optional user input.
- **Interactive**: Review, regenerate, or edit messages before committing.

## 🚀 Installation

### Prerequisites
1. [Node.js](https://nodejs.org/) (v14 or higher)
2. [Gemini CLI](https://github.com/google/gemini-cli) must be installed and accessible via the `gemini` command.

### Install via npm (Global)
```bash
npm install -g @devjinung41/gemini-commit-generator
```

## 💡 Usage
Just type `gcg` in any git repository:
```bash
gcg
```
1. **Select Language**: Choose English (1) or Korean (2).
2. **Safety Check**: The tool compares local/remote branch pointers before staging and again right before commit.
3. **Review Summary**: Check the summary of staged changes.
4. **Provide Context**: (Optional) Enter extra info for the AI.
5. **Choose Action**: Review the generated message and choose to Commit, Regenerate, Edit, or Cancel.

Typical runtime: AI analysis usually takes around **30 seconds** (may vary by diff size, network, and model response time).

## 🖥️ Prompt Walkthrough
```text
$ gcg
🌐 Step 1: Select Language / Step 1: 언어 선택
1) English
2) 한국어
Selection [1-2] > 1

🚀 Starting AI Commit Generator...
✔ Step 2: Staging changes and gathering data...
🔒 Branch safety check passed.

📊 Change Summary:
  + 1 new files
  ~ 2 modified files

📝 Step 3: Provide context (Optional, press Enter to skip)
> improve signup validation and send onboarding email after account creation

✔ AI Analysis completed in 29.84s

--------------------------------------------
feat: improve signup validation flow

auth-service.js: Tighten email/password validation rules
signup-form.tsx: Add inline validation and clearer error messages
email-welcome.ts: Send onboarding email after successful signup
--------------------------------------------

What would you like to do?
1) ✅ Commit
2) 🔄 Regenerate
3) ✏️  Edit
4) ❌ Cancel
Selection [1-4] > 1
🎉 Successfully committed!
```

## 🧭 Menu Actions
- `1) Commit`: Commits immediately with the generated message.
- `2) Regenerate`: Re-runs analysis and drafts a new message.
- `3) Edit`: Opens your `$EDITOR` (or `vi`/`notepad`) to edit before commit.
- `4) Cancel`: Exits without committing.

## ⚠ Common Messages
- `No upstream branch is configured`: Commit still works, but remote pointer comparison is skipped.
- `Remote branch is ahead` / `Local and remote branches have diverged`: Commit is blocked for safety.
- `This is not a git repository`: Run `gcg` inside a git repository.
- `Gemini CLI authentication required`: Run `gemini` once and complete login.

## 🔄 Updating
```bash
npm update -g @devjinung41/gemini-commit-generator
```

## 🗑️ Uninstallation
```bash
npm uninstall -g @devjinung41/gemini-commit-generator
```

## 📄 License
This project is licensed under the MIT License.
