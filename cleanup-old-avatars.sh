#!/bin/bash

# Script to cleanup avatar files older than 30 days
# This helps keep the repository size manageable

echo "🧹 Cleaning up avatar files older than 30 days..."

cd "/Users/sebastiaansmits/Documents/Selira AI/avatars"

# Find files older than 30 days
OLD_FILES=$(find . -name "*.webp" -mtime +30 -type f)
OLD_COUNT=$(find . -name "*.webp" -mtime +30 -type f | wc -l)

# Also find other image types that might be old
OLD_FILES_ALL=$(find . \( -name "*.jpg" -o -name "*.png" -o -name "*.webp" \) -mtime +30 -type f)
OLD_COUNT_ALL=$(find . \( -name "*.jpg" -o -name "*.png" -o -name "*.webp" \) -mtime +30 -type f | wc -l)

echo "📊 Found $OLD_COUNT_ALL old image files (older than 30 days)"

if [ $OLD_COUNT_ALL -gt 0 ]; then
    echo "📋 Files to be deleted:"
    find . \( -name "*.jpg" -o -name "*.png" -o -name "*.webp" \) -mtime +30 -type f -exec ls -la {} \;

    echo ""
    read -p "❓ Do you want to delete these $OLD_COUNT_ALL old files? (y/N): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Delete old files
        find . \( -name "*.jpg" -o -name "*.png" -o -name "*.webp" \) -mtime +30 -type f -delete

        # Also clean up any .DS_Store files
        find . -name ".DS_Store" -delete

        echo "✅ Deleted $OLD_COUNT_ALL old image files"
        echo "💾 Repository size reduced by cleaning up old avatars"

        # Show remaining files count
        REMAINING=$(find . -name "*.webp" -type f | wc -l)
        echo "📈 Remaining avatar files: $REMAINING"

    else
        echo "❌ No files deleted - cleanup cancelled"
    fi
else
    echo "✅ No old files found - all avatars are recent (within 30 days)"

    # Show current stats
    TOTAL_FILES=$(find . \( -name "*.jpg" -o -name "*.png" -o -name "*.webp" \) -type f | wc -l)
    TOTAL_SIZE=$(du -sh . | cut -f1)
    echo "📊 Current stats:"
    echo "   Total image files: $TOTAL_FILES"
    echo "   Total size: $TOTAL_SIZE"
fi

echo ""
echo "🎯 Note: This script keeps all avatars from the last 30 days"
echo "🔄 Run this script periodically to keep repository size manageable"