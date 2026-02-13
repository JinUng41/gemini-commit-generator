# gemini-commit-generator 🤖

A cross-platform, zero-config AI commit tool that learns your project's style and generates high-quality commit messages using the Google Gemini CLI.

**English** | [한국어](./README.ko.md)

## ✨ Features
- **Multi-language Support**: Select between English and Korean at startup.
- **Cross-Platform**: Works seamlessly on macOS, Linux, and Windows via Node.js.
- **Auto Staging**: Automatically stages all changes (`git add .`) on execution.
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
2. **Review Summary**: Check the summary of staged changes.
3. **Provide Context**: (Optional) Enter extra info for the AI.
4. **Choose Action**: Review the generated message and choose to Commit, Regenerate, Edit, or Cancel.

## 🔄 Updating
```bash
npm update -g @jinung41/gemini-commit-generator
```

## 🗑️ Uninstallation
```bash
npm uninstall -g @jinung41/gemini-commit-generator
```

## 📄 License
This project is licensed under the MIT License.
