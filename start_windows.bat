@echo off
chcp 65001 > NUL
title LeviaTech Story - Server

:: Set current working directory to the directory of this batch file
cd /d "%~dp0"

echo ===================================================
echo     LeviaTech Story - Windows Launcher
echo ===================================================
echo.

if not exist "data" mkdir data
if not exist "logs" mkdir logs
if not exist "exports" mkdir exports
if not exist "cache" mkdir cache
if not exist "backups" mkdir backups

:: Copy default data files if data directory is empty
if exist "default_data" (
    xcopy /n /y /d "default_data\*.json" "data\" >nul 2>&1
)

echo Dang khoi dong server LeviaTech Story tai http://localhost:1997 ...
echo (Vui long khong dong cua so nay khi dang su dung)
echo.

:: Open browser automatically after 2 seconds delay to allow server initialization
start /b "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:1997"

:: Run Go API executable
if exist "levia_api.exe" (
    levia_api.exe
) else if exist "leviatech-story.exe" (
    leviatech-story.exe
) else (
    echo [ERROR] Khong tim thay file executable (levia_api.exe)!
)

echo.
echo Server da dung hoac gap loi. Nhan phim bat ky de thoat...
pause
