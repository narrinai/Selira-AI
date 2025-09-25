#!/bin/bash

# Simple script to download all Replicate avatars to local /avatars folder

echo "🎨 Downloading Replicate avatars to local storage..."

cd "/Users/sebastiaansmits/Documents/Selira AI"

# Female companions
echo "📥 Downloading female companion avatars..."
curl -o "avatars/victoria-rose.webp" "https://replicate.delivery/xezq/HvMaId5T4PZ2JRNjP4hITO6MrxtemcEnIWDz0R9qa7MVGPsKA/out-0.webp" &
curl -o "avatars/mia-rodriguez.webp" "https://replicate.delivery/xezq/eFKdf0eeCoDuVRQlKux7RadhmKG5KWTf5w5fxOzXxy9gOjHWF/out-0.webp" &
curl -o "avatars/carmen-delacroix.webp" "https://replicate.delivery/xezq/e6PSISReg5rHUkocHoJC1DfBL9fwon1GLftRJ8xXGp8xtxDrC/out-0.webp" &
curl -o "avatars/lisa-park.webp" "https://replicate.delivery/xezq/7nFo1To0yW7cMBMGSnJ9PGIZnjntnT8KDGHhYqgfYNyfNewqA/out-0.webp" &
curl -o "avatars/dr-sarah-mitchell.webp" "https://replicate.delivery/xezq/nyNdP56p287TGJoDrXDMKCr8QMEfRqIuQZSFHR1JsTjuGPsKA/out-0.webp" &

# Male companions
echo "📥 Downloading male companion avatars..."
curl -o "avatars/marcus-thompson.webp" "https://replicate.delivery/xezq/oqmwPe6818V7K6Y0XdNZ0Zwzv3fHoHSRycgtWU7NJOqiUewqA/out-0.webp" &
curl -o "avatars/diego-ramirez.webp" "https://replicate.delivery/xezq/lAu6XW8rYrJBFpdfw2EQsRrhMXEti9pwxARZXgf759gsUewqA/out-0.webp" &
curl -o "avatars/jin-park.webp" "https://replicate.delivery/xezq/giXoPjM2MrIABN8i1pKO54eufNUBoosOI7os22yp3vT9UewqA/out-0.webp" &
curl -o "avatars/raj-patel.webp" "https://replicate.delivery/xezq/XqKRODl2rw6SKVG7J33Ng5nfKPkndd8B0bbDprEeHO6WVewqA/out-0.webp" &
curl -o "avatars/chen-wei.webp" "https://replicate.delivery/xezq/IN5ofz73pBXZfUKQao7EYniAxgde9czJaXaTKeWj86e8tyDrC/out-0.webp" &
curl -o "avatars/akio-tanaka.webp" "https://replicate.delivery/xezq/lb3jBqaaxz7hJha6UlRazbPOXdSLBfrgDQ8OwElgeQ9ZWewqA/out-0.webp" &
curl -o "avatars/kenji-watanabe.webp" "https://replicate.delivery/xezq/E2mV34ESSPq4I5NNOMR0NxqVBvXKee2XcEIfK6AITDZ0t8wqA/out-0.webp" &

# Wait for all downloads to complete
wait

echo "✅ All avatars downloaded!"
echo "📁 Saved to: $(pwd)/avatars/"

# List downloaded files
echo "📋 Downloaded files:"
ls -la avatars/*.webp

echo "🎉 Avatar download complete! Images are now stored locally and won't expire."