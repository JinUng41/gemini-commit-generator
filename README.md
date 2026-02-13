# gemini-commit-generator 🤖

A universal, zero-config AI commit tool that learns your project's style and generates high-quality commit messages using the Google Gemini CLI.

**English** | [한국어](./README.ko.md)

## ✨ Features
- **Zero Config**: Automatically detects your project's language, format, and tone from `git history`.
- **Context Aware**: Accepts optional user input to capture the "why" behind the code.
- **Interactive**: Review, regenerate, or edit messages before committing.
- **Universal**: Works with any language (English, Korean, Japanese, etc.) and any convention (Conventional Commits, Prefix-based, etc.).

## 🚀 Installation

### Prerequisites
You need the [Gemini CLI](https://github.com/google/gemini-cli) installed and configured.

### Quick Install (macOS/Linux)
Run the following command in your terminal:
```bash
curl -sSL https://raw.githubusercontent.com/JinUng41/gemini-commit-generator/main/aic.sh -o /usr/local/bin/aic && chmod +x /usr/local/bin/aic
```

## 💡 Usage
Just type `aic` in any git repository:
```bash
aic
```

1. It stages all changes (`git add .`).
2. It asks for optional context.
3. Gemini analyzes the `diff` and `history` to propose a message.
4. You choose to **Commit**, **Regenerate**, **Edit**, or **Cancel**.

## 📄 License
This project is licensed under the MIT License.
