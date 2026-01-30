#!/bin/bash
cd "$(dirname "$0")"

echo "🔄 Pulling latest changes..."
git pull

echo "📦 Installing dependencies..."
bun install

echo "🗄️ Running migrations..."
bun db:migrate

echo "🚀 Starting server..."
bun dev --port 5005
