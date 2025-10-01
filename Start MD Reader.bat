@echo off
:: Start script for MD Reader application

echo Starting MD Reader...
echo ===================

:: Check if MDReader.exe exists
if not exist "MDReader.exe" (
    echo Error: MDReader.exe not found in the current directory.
    echo Please run this script from the same directory as MDReader.exe
    pause
    exit /b 1
)

:: Start the application
start "" "MDReader.exe"

echo MD Reader started successfully!
timeout /t 2 /nobreak >nul