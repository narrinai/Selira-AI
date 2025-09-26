#!/bin/bash

# Setup script for automated avatar processing cron job
# This ensures companions always get avatars without manual intervention

echo "🚀 Setting up automated avatar processing for production scalability..."

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROCESSOR_SCRIPT="$SCRIPT_DIR/scheduled-avatar-processor.js"

echo "📁 Script location: $PROCESSOR_SCRIPT"

# Verify the processor script exists
if [ ! -f "$PROCESSOR_SCRIPT" ]; then
    echo "❌ Error: scheduled-avatar-processor.js not found!"
    exit 1
fi

# Make the processor script executable
chmod +x "$PROCESSOR_SCRIPT"

# Create a cron job that runs every 10 minutes
CRON_JOB="*/10 * * * * cd $SCRIPT_DIR && node scheduled-avatar-processor.js >> avatar-processor.log 2>&1"

echo "⚙️ Adding cron job to run every 10 minutes:"
echo "$CRON_JOB"

# Add to crontab (remove existing entries for this script first)
(crontab -l 2>/dev/null | grep -v "scheduled-avatar-processor.js"; echo "$CRON_JOB") | crontab -

echo "✅ Cron job installed successfully!"
echo "📊 Avatar processor will run every 10 minutes and process up to 5 companions per run"
echo "📝 Logs will be written to: $SCRIPT_DIR/avatar-processor.log"

echo ""
echo "🔧 Production Setup Complete:"
echo "• Companions are created with empty Avatar_URL (no placeholders)"
echo "• Async avatar generation triggers immediately after creation"
echo "• Scheduled processor runs every 10 minutes as backup"
echo "• System processes 5 companions per run (scalable)"
echo "• No manual intervention required"

echo ""
echo "📊 To monitor the system:"
echo "  tail -f $SCRIPT_DIR/avatar-processor.log"
echo ""
echo "🗑️  To remove the cron job:"
echo "  crontab -l | grep -v scheduled-avatar-processor.js | crontab -"
echo ""

# Test the processor once
echo "🧪 Running initial test..."
node "$PROCESSOR_SCRIPT"

echo ""
echo "🎉 Setup complete! Avatar processing is now fully automated."
