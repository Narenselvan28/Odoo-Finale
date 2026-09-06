@echo off
setlocal enabledelayedexpansion
title DealFlow360 Launcher

echo ================================================================
echo               DEALFLOW 360 FULL-STACK LAUNCHER
echo ================================================================
echo.

cd /d "%~dp0"

echo [1/4] Pulling latest code from origin/main...
git pull origin main
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Git pull failed or returned non-zero exit code. Continuing with local codebase...
) else (
    echo [SUCCESS] Git repository synchronized with origin/main.
)
echo.

echo [2/4] Verifying dependencies...
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend && npm install && cd ..
)
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend && npm install && cd ..
)
echo.

echo [3/4] Launching Services in dedicated terminal windows...
echo.

:: 1. Launch Python Fast-ML & Intelligence Service (Port 4000)
echo Starting Python Fast-ML Intelligence Engine on http://localhost:4000 ...
start "DealFlow360 - Fast-ML Engine (Port 4000)" cmd /k "title DealFlow360 - Fast-ML (Port 4000) && cd /d "%~dp0fast-ml" && python app.py"

:: 2. Launch Node.js Express Backend Server (Port 5000)
echo Starting Node.js Express API on http://localhost:5000 ...
start "DealFlow360 - Node Backend (Port 5000)" cmd /k "title DealFlow360 - Backend (Port 5000) && cd /d "%~dp0backend" && npm start"

:: 3. Launch React Vite Frontend (Port 5173)
echo Starting React Vite Frontend on http://localhost:5173 ...
start "DealFlow360 - Frontend UI (Port 5173)" cmd /k "title DealFlow360 - Frontend (Port 5173) && cd /d "%~dp0frontend" && npm run dev"

echo.
echo [4/4] All 3 services dispatched!
echo.
echo ================================================================
echo                     SERVICE ACCESS URLS
echo ================================================================
echo  * Frontend Portal : http://localhost:5173
echo  * Backend API     : http://localhost:5000
echo  * Fast-ML Engine  : http://localhost:4000
echo ================================================================
echo.
echo Waiting 5 seconds before opening DealFlow360 in your browser...
timeout /t 5 /nobreak >nul
start http://localhost:5173

echo.
echo Press any key to close this launcher window (services will remain running).
pause >nul
