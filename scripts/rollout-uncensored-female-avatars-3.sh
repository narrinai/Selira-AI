#!/bin/bash
# Rollout script for avatar_url_3 generation for all uncensored female companions
# Runs the bulk script repeatedly until all companions have avatar_url_3

FUNCTION_URL="https://selira.ai/.netlify/functions/generate-avatar-3-bulk?trigger=manual"
MAX_ITERATIONS=200  # Safety limit (we have 174 companions)
DELAY_BETWEEN_CALLS=35  # 35 seconds between calls (function takes ~20s + buffer)

echo "🚀 Starting Uncensored Female Avatar_url_3 Rollout"
echo "=================================================="
echo ""
echo "Target: All Selira uncensored female companions without avatar_url_3"
echo "Expected: ~174 companions to process"
echo "Time per companion: ~35 seconds (20s generation + 15s buffer)"
echo "Estimated total time: ~2 hours"
echo ""
echo "Press Ctrl+C to stop at any time"
echo ""

SUCCESS_COUNT=0
FAIL_COUNT=0
ITERATION=0

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))

  echo "[$ITERATION] Processing companion..."

  # Call the bulk function
  RESPONSE=$(curl -X POST "$FUNCTION_URL" \
    -H "Content-Type: application/json" \
    -s --max-time 60 2>&1)

  # Check if response is valid JSON
  if echo "$RESPONSE" | jq -e . >/dev/null 2>&1; then
    # Parse response
    SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
    PROCESSED=$(echo "$RESPONSE" | jq -r '.processed')
    SUCCESS_RESULT=$(echo "$RESPONSE" | jq -r '.successCount')
    FAIL_RESULT=$(echo "$RESPONSE" | jq -r '.failCount')

    if [ "$SUCCESS" = "true" ] && [ "$PROCESSED" = "1" ]; then
      if [ "$SUCCESS_RESULT" = "1" ]; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        echo "   ✅ Success! (Total: $SUCCESS_COUNT)"
      else
        FAIL_COUNT=$((FAIL_COUNT + 1))
        ERROR=$(echo "$RESPONSE" | jq -r '.errors[0]' 2>/dev/null)
        echo "   ❌ Failed: $ERROR (Total failures: $FAIL_COUNT)"
      fi
    elif [ "$SUCCESS" = "true" ] && [ "$PROCESSED" = "0" ]; then
      echo "   🎉 ALL DONE! No more companions to process."
      break
    else
      echo "   ⚠️ Unexpected response: $RESPONSE"
      FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
  else
    echo "   ❌ Network error or timeout"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi

  # Progress update every 10 companions
  if [ $((ITERATION % 10)) -eq 0 ]; then
    echo ""
    echo "📊 Progress Update:"
    echo "   Iterations: $ITERATION"
    echo "   ✅ Successful: $SUCCESS_COUNT"
    echo "   ❌ Failed: $FAIL_COUNT"
    echo ""
  fi

  # Delay before next call
  if [ $ITERATION -lt $MAX_ITERATIONS ]; then
    echo "   ⏱️ Waiting ${DELAY_BETWEEN_CALLS}s..."
    sleep $DELAY_BETWEEN_CALLS
  fi
done

# Final summary
echo ""
echo "=================================================="
echo "📊 ROLLOUT COMPLETE"
echo "=================================================="
echo "Total iterations: $ITERATION"
echo "✅ Successful: $SUCCESS_COUNT"
echo "❌ Failed: $FAIL_COUNT"
echo ""

if [ $FAIL_COUNT -gt 0 ]; then
  echo "⚠️ Some companions failed. You can re-run this script to retry."
fi

echo "✨ Rollout finished!"
