#!/bin/bash
set -e

echo "🚀 Deploying to PRODUCTION (Live)..."

# 1. Build Frontend
echo "📦 Building Frontend..."
cd frontend
npm run build
cd ..

# 2. Build Functions (Optional but good practice to ensure latest)
echo "📦 Building Functions..."
cd functions
npm run build
cd ..

# 3. Deploy Everything
echo "📤 Deploying to Firebase Production..."
firebase deploy

echo "✅ Production Deployment Complete!"
