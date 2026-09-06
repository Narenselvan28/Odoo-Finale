@echo off
REM ==========================================================
REM DealFlow360 Search Engine Demo - Windows Setup Script
REM ==========================================================

echo =========================================================
echo   DealFlow360 - Standalone Full-Text Search Engine Setup
echo =========================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking environment configuration...
if not exist ".env" (
    echo Creating .env from .env.example...
    copy .env.example .env
) else (
    echo .env already exists.
)
echo.

echo [2/3] Installing npm dependencies...
call npm install
echo.

echo [3/3] Database Initialization Instructions:
echo To initialize or reset the MySQL database and sample data, run:
echo mysql -u root -p0000 ^< database\init.sql
echo (or in PowerShell):
echo Get-Content database\init.sql ^| mysql -u root -p0000
echo.

echo =========================================================
echo Setup complete!
echo To start the search engine server:
echo   npm start
echo.
echo Then open your browser at:
echo   http://localhost:3000
echo.
echo To run the automated search test suite:
echo   npm test
echo =========================================================
pause
