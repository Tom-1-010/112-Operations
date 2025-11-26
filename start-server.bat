@echo off
echo ========================================
echo Starting Meldkamer Simulator...
echo ========================================
echo.

cd /d "%~dp0"
set NODE_ENV=development

echo Checking Node.js...
node --version
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo.
echo Installing dependencies if needed...
call npm install

echo.
echo Starting server...
echo.
npx tsx server/index.ts

if errorlevel 1 (
    echo.
    echo ========================================
    echo ERROR: Server failed to start
    echo ========================================
    echo Check the error messages above
    pause
)
