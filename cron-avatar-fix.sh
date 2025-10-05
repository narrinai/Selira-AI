#!/bin/bash

# Cron job script to fix Replicate avatar URLs
# Run this every 8 hours via crontab

echo "🕐 $(date): Starting avatar fix cron job..."

# Navigate to project directory
cd /Users/sebastiaansmits/Documents/Selira\ AI

# Run the fix script
node fix-replicate-urls.js

# Check if there were changes
if [ $? -eq 0 ]; then
    echo "✅ $(date): Avatar fix completed successfully"

    # Check if there are new avatar files to commit
    if git diff --quiet avatars/; then
        echo "ℹ️  No new avatar files to commit"
    else
        echo "📦 New avatar files found, committing and deploying..."

        # Add new avatar files
        git add avatars/

        # Commit with timestamp
        git commit -m "Auto-update: Fix Replicate avatar URLs ($(date '+%Y-%m-%d %H:%M'))"

        # Push to trigger Netlify deployment
        git push origin main

        echo "✅ $(date): Changes deployed to Netlify"
    fi
else
    echo "❌ $(date): Avatar fix failed with error code $?"
fi

echo "🏁 $(date): Cron job finished"
