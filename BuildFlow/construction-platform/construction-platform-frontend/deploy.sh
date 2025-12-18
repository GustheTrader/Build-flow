#!/bin/bash

# AI Construction Platform - Vercel Deployment Script
echo "🚀 Deploying AI Construction Platform to Vercel..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the construction-platform-frontend directory."
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo "📋 Preparing deployment..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
pnpm clean 2>/dev/null || npm run clean 2>/dev/null || echo "No clean script found, skipping..."

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --prefer-offline

# Build for production
echo "🔨 Building for production..."
pnpm build:prod

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi

echo "✅ Build successful!"

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
npx vercel --prod

echo ""
echo "✨ Deployment complete!"
echo ""
echo "🎯 Your AI Construction Platform is now ready for investor presentations!"
echo ""
echo "📊 Demo features included:"
echo "   • 5 realistic construction projects"
echo "   • 7 AI agents with live monitoring"
echo "   • Human-in-the-loop workflow"
echo "   • Real-time business metrics"
echo ""
echo "💡 Access your deployment URL above to start your investor demo!"