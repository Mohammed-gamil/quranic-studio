#!/bin/bash

# Navigate to the script's directory
cd "$(dirname "$0")"

echo "============================================="
echo "🌙 Quranic Studio - Startup Script (Linux/macOS)"
echo "============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js (v18+) and try again."
    exit 1
fi

# Check if node_modules folder exists, if not run npm install
if [ ! -d "node_modules" ]; then
    echo "📦 node_modules not found. Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to install npm packages."
        exit 1
    fi
fi

# Check if esbuild is working (handles cross-platform node_modules copy/share issues)
if [ -d "node_modules" ]; then
    if ! ./node_modules/.bin/esbuild --version &>/dev/null; then
        echo "⚠️ esbuild platform binary is incompatible or missing. Repairing node_modules..."
        npm install
        if [ $? -ne 0 ]; then
            echo "❌ Error: Failed to repair npm packages."
            exit 1
        fi
    fi
fi

# Check if native dependencies like better-sqlite3 work
if [ -d "node_modules" ]; then
    if ! node -e "const Db = require('better-sqlite3'); new Db(':memory:')" &>/dev/null; then
        echo "⚠️ Native binary incompatibility detected (e.g., better-sqlite3). Rebuilding native modules..."
        npm rebuild
        if [ $? -ne 0 ]; then
            echo "❌ Error: Failed to rebuild native modules."
            exit 1
        fi
    fi
fi

# Terminate any process occupying the target port before starting
PORT=3000
if [ -f .env ]; then
    ENV_PORT=$(grep -E "^PORT=" .env | cut -d '=' -f 2 | tr -d '\r' | tr -d ' ')
    if [ ! -z "$ENV_PORT" ]; then
        PORT=$ENV_PORT
    fi
fi

PID=$(lsof -t -i:$PORT 2>/dev/null)
if [ -z "$PID" ]; then
    # Fallback to ss if lsof is not available
    PID=$(ss -lptn "sport = :$PORT" 2>/dev/null | grep -oP 'pid=\K\d+')
fi

if [ ! -z "$PID" ]; then
    echo "⚠️ Port $PORT is already in use by process $PID. Terminating process..."
    kill -9 $PID 2>/dev/null
    sleep 1
fi

# Start the application in development mode
echo "🚀 Starting Quranic Studio in development mode..."
echo "Press Ctrl+C to stop."
npm run dev
