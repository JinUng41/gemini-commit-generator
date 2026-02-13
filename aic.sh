#!/usr/bin/env bash

# AI Commit (aic) - A universal AI-powered git commit tool
# Powered by Google Gemini CLI

# 1. Check for required tools
if ! command -v gemini &> /dev/null; then
    echo -e "\033[1;31m❌ Error: 'gemini' CLI is not installed.\033[0m"
    echo "Please install it first: https://github.com/google/gemini-cli"
    exit 1
fi

# Function to update the script
update_aic() {
    echo -e "\033[1;33m🔄 Checking for updates...\033[0m"
    # Find the current script path
    SCRIPT_PATH=$(command -v aic || echo "$0")
    
    # URL to the raw script on GitHub
    REPO_URL="https://raw.githubusercontent.com/JinUng41/gemini-commit-generator/main/aic.sh"
    
    # Create a temporary file
    TMP_FILE=$(mktemp)
    
    if curl -sSL "$REPO_URL" -o "$TMP_FILE"; then
        # Check if the download was successful and not empty
        if [ -s "$TMP_FILE" ]; then
            mv "$TMP_FILE" "$SCRIPT_PATH"
            chmod +x "$SCRIPT_PATH"
            echo -e "\033[1;32m🎉 aic has been updated to the latest version!\033[0m"
            exit 0
        fi
    fi
    
    echo -e "\033[1;31m❌ Update failed. Please check your internet connection or repository URL.\033[0m"
    rm -f "$TMP_FILE"
}

# Handle --update flag
if [[ "$1" == "--update" ]]; then
    update_aic
    exit 0
fi

# 2. Check for git repository
if ! git rev-parse --is-inside-work-tree &> /dev/null; then
    echo -e "\033[1;31m❌ Error: Not a git repository.\033[0m"
    exit 1
fi

# 3. Stage changes and check for diff
git add .
DIFF=$(git diff --cached)

if [ -z "$DIFF" ]; then
    echo -e "\033[1;33m✨ No changes staged. Please make some changes first.\033[0m"
    exit 1
fi

# 4. Analyze project style (Recent 15 commits)
GIT_HISTORY=$(git log -n 15 --pretty=format:"%s" 2>/dev/null)

# 5. Get user context
echo -e "
\033[1;34m📝 Any specific context for this commit? (Optional, press Enter to skip)\033[0m"
read -p "> " USER_CONTEXT

# 6. Construct Universal Prompt
SYSTEM_PROMPT="You are an expert software engineer. Generate a concise, high-quality commit message based on the provided diff.

[CRITICAL RULES]
1. STYLE MATCHING: Analyze the 'Recent Commit History' and strictly follow its language (e.g., English, Korean, Japanese), format (e.g., Conventional Commits, Prefix-based like [Feat]), and tone.
2. ONE LINE: Output ONLY the commit message itself in a single line. No explanations, no quotes, no markdown.
3. ACCURACY: Focus on the 'why' and 'what' of the changes.

[Context]
- User's Intent: ${USER_CONTEXT:-"Analyze the diff and generate the most appropriate message."}
- Recent Commit History (for style):
$GIT_HISTORY

[Code Changes (diff)]
$DIFF"

# Function to generate message
generate_msg() {
    echo -e "
\033[1;33m🤖 AI is analyzing project style and generating message...\033[0m"
    AI_MSG=$(gemini "$SYSTEM_PROMPT")
    
    if [ -z "$AI_MSG" ]; then
        echo -e "\033[1;31m❌ Failed to generate message. Please try again.\033[0m"
        return 1
    fi

    echo -e "
\033[1;37m--------------------------------------------\033[0m"
    echo -e "Proposed Message: \033[1;32m$AI_MSG\033[0m"
    echo -e "\033[1;37m--------------------------------------------\033[0m"
}

# Interactive Menu Loop
while true; do
    generate_msg || continue

    echo -e "\033[1;34mWhat would you like to do?\033[0m"
    echo "1) ✅ Commit (Accept this message)"
    echo "2) 🔄 Regenerate (Try another version)"
    echo "3) ✏️  Edit (Modify and commit)"
    echo "4) 🆙 Update (Update aic to latest)"
    echo "5) ❌ Cancel"
    read -p "Selection [1-5] > " choice

    case $choice in
        1)
            git commit -m "$AI_MSG"
            echo -e "
\033[1;32m🎉 Successfully committed!\033[0m"
            break
            ;;
        2)
            echo -e "
Regenerating with a fresh perspective..."
            continue
            ;;
        3)
            echo -e "
\033[1;34mEnter your custom message:\033[0m"
            read -p "> " edited_msg
            if [ -n "$edited_msg" ]; then
                git commit -m "$edited_msg"
                echo -e "
\033[1;32m🎉 Committed with custom message!\033[0m"
                break
            else
                echo -e "\033[1;31mMessage cannot be empty.\033[0m"
            fi
            ;;
        4)
            update_aic
            break
            ;;
        5)
            echo -e "
\033[1;31mCommit cancelled.\033[0m"
            break
            ;;
        *)
            echo -e "
\033[1;31mInvalid selection. Please try again.\033[0m"
            ;;
    esac
done
