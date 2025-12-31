@echo off
echo ==========================================
echo   Deploying to Cloudflare Pages via WSL
echo ==========================================
echo.
wsl bash -c "cd /mnt/d/AI/AI_CODE/61_阿里云图片模型 && npm install && npx @cloudflare/next-on-pages && npx wrangler pages deploy .vercel/output/static --project-name aliyun-image-model --branch main"
echo.
pause
