#!/bin/bash
set -e

echo "🚀 Deploying to TEST channel (test-version)..."

# 1. Build Frontend
echo "📦 Building Frontend..."
cd frontend
npm run build
cd ..

# 2. Deploy to Hosting Channel
echo "📤 Deploying to Firebase Hosting Channel: test-version..."
firebase hosting:channel:deploy test-version

echo "✅ Test Deployment Complete!"
