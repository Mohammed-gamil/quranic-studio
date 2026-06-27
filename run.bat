@echo off
title Quranic Studio Launcher
cd /d "%~dp0"

echo =============================================
echo 🌙 Quranic Studio - Startup Script (Windows)
echo =============================================

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js is not installed. Please install Node.js (v18+) and try again.
    pause
    exit /b 1
)

:: Check if node_modules folder exists, if not run npm install
if not exist "node_modules\" (
    echo 📦 node_modules not found. Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Error: Failed to install npm packages.
        pause
        exit /b 1
    )
)

:: Check if esbuild is working (handles cross-platform node_modules copy/share issues)
if exist "node_modules\" (
    call node_modules\.bin\esbuild.cmd --version >nul 2>nul
    if %errorlevel% neq 0 (
        echo ⚠️ esbuild platform binary is incompatible or missing. Repairing node_modules...
        call npm install
        if %errorlevel% neq 0 (
            echo ❌ Error: Failed to repair npm packages.
            pause
            exit /b 1
        )
    )
)

:: Check if native dependencies like better-sqlite3 work
if exist "node_modules\" (
    call node -e "const Db = require('better-sqlite3'); new Db(':memory:')" >nul 2>nul
    if %errorlevel% neq 0 (
        echo ⚠️ Native binary incompatibility detected (e.g., better-sqlite3). Rebuilding native modules...
        call npm rebuild
        if %errorlevel% neq 0 (
            echo ❌ Error: Failed to rebuild native modules.
            pause
            exit /b 1
        )
    )
)

:: Terminate any process occupying the target port before starting
set PORT=3000
if exist .env (
    for /f "tokens=2 delims==" %%I in ('findstr /I "^PORT=" .env') do set PORT=%%I
)
set PORT=%PORT: =%

for /f "tokens=5" %%a in ('netstat -aon ^| findstr /R /C:":%PORT% *LISTENING"') do (
    echo ⚠️ Port %PORT% is already in use by process PID %%a. Terminating process...
    taskkill /F /PID %%a >nul 2>nul
    timeout /t 1 >nul 2>nul
)

:: Start the application in development mode
echo 🚀 Starting Quranic Studio in development mode...
echo Press Ctrl+C to stop.
call npm run dev
pause
