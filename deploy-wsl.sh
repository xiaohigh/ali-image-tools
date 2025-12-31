#!/bin/bash
echo "=========================================="
echo "  Deploying to Cloudflare Pages via WSL"
echo "=========================================="

cd /mnt/d/AI/AI_CODE/61_阿里云图片模型

echo "[1/3] Installing dependencies..."
npm install

echo ""
echo "[2/3] Building for Cloudflare Pages..."
npx @cloudflare/next-on-pages

echo ""
echo "[3/3] Deploying..."
npx wrangler pages deploy .vercel/output/static --project-name "aliyun-image-model" --branch main

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
