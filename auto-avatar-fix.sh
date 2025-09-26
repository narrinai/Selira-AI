#!/bin/bash

# Auto Avatar Fix Script voor Selira AI
# Draait dagelijks om corrupted Replicate URLs te fixen

# Set working directory
cd "/Users/sebastiaansmits/Documents/Selira AI"

# Log file voor debugging
LOG_FILE="/Users/sebastiaansmits/Documents/Selira AI/logs/avatar-fix-$(date +%Y%m%d).log"
mkdir -p logs

echo "🚀 Starting automated avatar fix - $(date)" >> "$LOG_FILE"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found" >> "$LOG_FILE"
    exit 1
fi

# Run the avatar fix script (V2 with adult prompts)
echo "🎨 Running complete avatar solution V2..." >> "$LOG_FILE"
node complete-avatar-solution-v2.js >> "$LOG_FILE" 2>&1

# Check if there are new avatar files to commit
if [ -n "$(git status --porcelain avatars/)" ]; then
    echo "📁 New avatar files found, committing..." >> "$LOG_FILE"

    # Add avatar files
    git add avatars/

    # Count new files
    NEW_FILES=$(git status --porcelain avatars/ | wc -l)

    # Commit with informative message
    git commit -m "🤖 Automated avatar fix - $(date +%Y-%m-%d)

- Fixed $NEW_FILES avatar URLs
- Converted Replicate URLs to local storage
- Automated via cron job

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

    # Push to deploy
    git push

    echo "✅ Successfully committed and deployed $NEW_FILES new avatars" >> "$LOG_FILE"
else
    echo "ℹ️ No new avatar files to commit" >> "$LOG_FILE"
fi

echo "🎉 Automated avatar fix completed - $(date)" >> "$LOG_FILE"
echo "----------------------------------------" >> "$LOG_FILE"