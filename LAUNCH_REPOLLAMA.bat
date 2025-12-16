@echo off
title RepoLlama Launcher
echo ==========================================
echo   Starting RepoLlama...
echo ==========================================

:: Navigate to the project directory
cd /d "c:\Users\blake\Desktop\RepoLlama"

:: Open the browser (it might show 'connection refused' for a second until server starts)
start "" "http://localhost:3000"

:: Start the Next.js development server
echo Starting Server...
npm run dev

pause
