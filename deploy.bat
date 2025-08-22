@echo off
REM Arduino AI IDE Deployment Script for Windows
REM Developer: Dayanand Darpan (https://www.dayananddarpan.me/)

echo.
echo 🚀 Arduino AI IDE Deployment Script
echo ======================================
echo Developer: Dayanand Darpan
echo Website: https://www.dayananddarpan.me/
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Node.js found
node --version

REM Install dependencies
echo.
echo ℹ️ Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed successfully

REM Clean previous builds
echo.
echo ℹ️ Cleaning previous builds...
if exist dist rmdir /s /q dist
echo ✅ Previous builds cleaned

REM Build the application
echo.
echo ℹ️ Building application...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed
    pause
    exit /b 1
)
echo ✅ Application built successfully

REM Check if dist folder exists
if not exist dist (
    echo ❌ Build folder 'dist' not found
    pause
    exit /b 1
)
echo ✅ Build verification passed

echo.
echo 🎉 Deployment Ready!
echo ====================
echo.
echo ℹ️ Available deployment options:
echo.
echo 1. 🖥️  Desktop Application:
echo    npm run electron
echo.
echo 2. 🌐 Web Application:
echo    Serve the 'dist/renderer' folder with any web server
echo    Example: python -m http.server 8080 (from dist/renderer)
echo.
echo 3. 📦 Create Installer:
echo    npm run dist (requires electron-builder)
echo.
echo 4. 🚀 Quick Test:
echo    npm run electron
echo.

set /p choice="Would you like to start the desktop application now? (y/n): "
if /i "%choice%"=="y" (
    echo.
    echo ℹ️ Starting Arduino AI IDE...
    call npm run electron
)

echo.
echo ✅ Deployment script completed!
echo 📋 See DEPLOYMENT_GUIDE.md for detailed instructions
echo 🌐 Developer: Dayanand Darpan - https://www.dayananddarpan.me/
echo.
pause
