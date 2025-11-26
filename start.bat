@echo off
echo Starting Meldkamer Simulator...
echo.
set NODE_ENV=development
npx tsx server/index.ts
if errorlevel 1 (
    echo.
    echo ERROR: Server failed to start
    echo Check the error messages above
    pause
)














