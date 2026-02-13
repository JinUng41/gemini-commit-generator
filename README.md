# gemini-commit-generator 🤖

A universal, zero-config AI commit tool that learns your project's style and generates high-quality commit messages using the Google Gemini CLI.

**English** | [한국어](./README.ko.md)

## ✨ Features
- **Zero Config**: Automatically detects your project's language, format, and tone from `git history`.
- **Context Aware**: Accepts optional user input to capture the "why" behind the code.
- **Interactive**: Review, regenerate, edit, or update directly from the menu.
- **Universal**: Works with any language (English, Korean, Japanese, etc.) and any convention (Conventional Commits, [Prefix], etc.).

## 🚀 Installation

### Prerequisites
You need the [Gemini CLI](https://github.com/google/gemini-cli) installed and configured.

### Quick Install (macOS/Linux)
Run the following command in your terminal:
```bash
curl -sSL https://raw.githubusercontent.com/JinUng41/gemini-commit-generator/main/aic.sh -o aic && chmod +x aic && sudo mv aic /usr/local/bin/aic && echo -e "\n\033[1;32m🎉 aic installed successfully! Type 'aic' to start.\033[0m"
```

## 💡 Usage
Just type `aic` in any git repository:
```bash
aic
```

1. It stages all changes (`git add .`).
2. It asks for optional context (e.g., "Refactored login logic").
3. Gemini analyzes the `diff` and `history` to propose a message.
4. Select from the menu:
   - **Commit**: Accept and commit.
   - **Regenerate**: Try another AI suggestion.
   - **Edit**: Modify the message manually.
   - **Update**: Update `aic` to the latest version.
   - **Cancel**: Exit without committing.

## 🔄 Updating
To update to the latest version manually:
```bash
aic --update
```

## 🗑️ Uninstallation
To safely remove `aic` from your system:
```bash
aic --uninstall
```

## 📄 License
This project is licensed under the MIT License.
