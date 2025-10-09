#!/bin/bash

echo "🚀 Generating 4 Asian male ethnicity thumbnails using Netlify function..."

# Korean
echo ""
echo "🎨 Generating korean-male.png..."
curl -X POST "https://selira.ai/.netlify/functions/selira-generate-custom-image" \
  -H "Content-Type: application/json" \
  -d '{
    "customPrompt": "professional portrait photo of handsome Korean man, short black hair, warm smile, wearing casual shirt, studio lighting, clean background, photorealistic, high quality, 8k",
    "characterName": "Korean Male",
    "category": "realistic",
    "style": "realistic",
    "shotType": "portrait",
    "sex": "male",
    "ethnicity": "korean",
    "hairLength": "short",
    "hairColor": "black"
  }' | jq -r '.imageUrl' | xargs -I {} curl -o "images/korean-male.png" {}
echo "✅ Saved: images/korean-male.png"
sleep 10

# Chinese
echo ""
echo "🎨 Generating chinese-male.png..."
curl -X POST "https://selira.ai/.netlify/functions/selira-generate-custom-image" \
  -H "Content-Type: application/json" \
  -d '{
    "customPrompt": "professional portrait photo of handsome Chinese man, short black hair, friendly expression, wearing casual shirt, studio lighting, clean background, photorealistic, high quality, 8k",
    "characterName": "Chinese Male",
    "category": "realistic",
    "style": "realistic",
    "shotType": "portrait",
    "sex": "male",
    "ethnicity": "chinese",
    "hairLength": "short",
    "hairColor": "black"
  }' | jq -r '.imageUrl' | xargs -I {} curl -o "images/chinese-male.png" {}
echo "✅ Saved: images/chinese-male.png"
sleep 10

# Japanese
echo ""
echo "🎨 Generating japanese-male.png..."
curl -X POST "https://selira.ai/.netlify/functions/selira-generate-custom-image" \
  -H "Content-Type: application/json" \
  -d '{
    "customPrompt": "professional portrait photo of handsome Japanese man, short black hair, gentle smile, wearing casual shirt, studio lighting, clean background, photorealistic, high quality, 8k",
    "characterName": "Japanese Male",
    "category": "realistic",
    "style": "realistic",
    "shotType": "portrait",
    "sex": "male",
    "ethnicity": "japanese",
    "hairLength": "short",
    "hairColor": "black"
  }' | jq -r '.imageUrl' | xargs -I {} curl -o "images/japanese-male.png" {}
echo "✅ Saved: images/japanese-male.png"
sleep 10

# Vietnamese
echo ""
echo "🎨 Generating vietnamese-male.png..."
curl -X POST "https://selira.ai/.netlify/functions/selira-generate-custom-image" \
  -H "Content-Type: application/json" \
  -d '{
    "customPrompt": "professional portrait photo of handsome Vietnamese man, short black hair, warm expression, wearing casual shirt, studio lighting, clean background, photorealistic, high quality, 8k",
    "characterName": "Vietnamese Male",
    "category": "realistic",
    "style": "realistic",
    "shotType": "portrait",
    "sex": "male",
    "ethnicity": "vietnamese",
    "hairLength": "short",
    "hairColor": "black"
  }' | jq -r '.imageUrl' | xargs -I {} curl -o "images/vietnamese-male.png" {}
echo "✅ Saved: images/vietnamese-male.png"

echo ""
echo "✨ All 4 Asian male ethnicity thumbnails generated!"
