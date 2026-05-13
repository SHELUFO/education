@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18+ is required. Please install Node.js first.
  pause
  exit /b 1
)
start "" http://localhost:5188/
node server.js
pause
