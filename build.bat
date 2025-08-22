@echo off
echo.
echo ========================================
echo  Building Darpan Uno v2.0.0
echo  Created by Dayanand Darpan
echo ========================================
echo.

echo [1/5] Cleaning previous builds...
if exist "dist" rmdir /s /q "dist"
if exist "dist-electron" rmdir /s /q "dist-electron"
if exist "out" rmdir /s /q "out"

echo [2/5] Installing dependencies...
call npm install

echo [3/5] Building React application...
call npm run build

echo [4/5] Building Electron application...
call npm run build:electron

echo [5/5] Creating distribution packages...
call npm run dist

echo.
echo ========================================
echo  Build Complete!
echo ========================================
echo.
echo Distribution files created in ./dist/
echo Ready for upload to GitHub Releases
echo.
echo Download links:
echo - Windows Installer: darpan-uno-setup-2.0.0.exe
echo - Windows Portable: darpan-uno-portable-2.0.0.zip
echo.
pause
