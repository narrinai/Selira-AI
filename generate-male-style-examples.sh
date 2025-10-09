#!/bin/bash

echo "🚀 Generating 2 attractive male style example images..."

# Realistic Male
echo ""
echo "🎨 Generating realistic-male-style.png..."
curl -s -X POST "https://selira.ai/.netlify/functions/selira-generate-custom-image" \
  -H "Content-Type: application/json" \
  -d '{
    "customPrompt": "professional portrait photo of extremely handsome muscular shirtless man, chiseled jawline, piercing eyes, seductive expression, abs visible, bedroom lighting, intimate atmosphere, photorealistic, high quality, 8k, attractive male model",
    "characterName": "Realistic Male Style",
    "category": "realistic",
    "style": "realistic",
    "shotType": "portrait",
    "sex": "male",
    "ethnicity": "white",
    "hairLength": "short",
    "hairColor": "brown"
  }' | jq -r '.imageUrl' > /tmp/realistic-male-url.txt

REALISTIC_URL=$(cat /tmp/realistic-male-url.txt)
echo "URL: $REALISTIC_URL"
curl -s -o "images/realistic-male-style.png" "$REALISTIC_URL"
echo "✅ Saved: images/realistic-male-style.png"
sleep 10

# Anime Male
echo ""
echo "🎨 Generating anime-male-style.png..."
curl -s -X POST "https://selira.ai/.netlify/functions/selira-generate-custom-image" \
  -H "Content-Type: application/json" \
  -d '{
    "customPrompt": "anime illustration of extremely handsome shirtless young man, perfect muscular body, attractive facial features, seductive bedroom eyes, intimate pose, professional anime art style, detailed shading, attractive bishounen character",
    "characterName": "Anime Male Style",
    "category": "anime-manga",
    "style": "anime",
    "shotType": "portrait",
    "sex": "male",
    "ethnicity": "asian",
    "hairLength": "medium",
    "hairColor": "black"
  }' | jq -r '.imageUrl' > /tmp/anime-male-url.txt

ANIME_URL=$(cat /tmp/anime-male-url.txt)
echo "URL: $ANIME_URL"
curl -s -o "images/anime-male-style.png" "$ANIME_URL"
echo "✅ Saved: images/anime-male-style.png"

echo ""
echo "✨ Both male style examples generated!"
