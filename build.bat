@echo off
echo ======================================
echo 神机营 - 图片编辑器 打包脚本
echo ======================================

echo [1/4] 构建 Next.js...
call npm run build
if %errorlevel% neq 0 (
    echo Next.js 构建失败！
    pause
    exit /b 1
)

echo [2/4] 运行 electron-builder...
call npx electron-builder --win --x64
if %errorlevel% neq 0 (
    echo Electron 打包失败！
    pause
    exit /b 1
)

echo [3/4] 复制 node_modules 到 resources...
if exist "dist\win-unpacked\resources\standalone" (
    xcopy /E /I /Y ".next\standalone\node_modules" "dist\win-unpacked\resources\standalone\node_modules"
)

echo [4/4] 重新打包 portable exe...
if exist "dist\win-unpacked" (
    echo 正在重新生成便携版...
    PowerShell -Command "Compress-Archive -Path 'dist\win-unpacked\*' -DestinationPath 'dist\神机营-图片编辑器-1.0.0-win-x64.zip' -Force"
    echo 已生成压缩包: dist\神机营-图片编辑器-1.0.0-win-x64.zip
)

echo ======================================
echo 打包完成！
echo 解压版: dist\win-unpacked\
echo 压缩包: dist\神机营-图片编辑器-1.0.0-win-x64.zip
echo ======================================
pause
