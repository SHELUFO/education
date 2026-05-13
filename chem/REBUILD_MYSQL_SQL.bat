@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18+ is required. Please install Node.js first.
  pause
  exit /b 1
)
node scripts\create-mysql-dump.js
pause
