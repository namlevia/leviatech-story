@echo off
chcp 65001 > NUL
title LeviaTech Story - Server Console

:: Fix working directory to batch file folder
cd /d "%~dp0"

echo ===================================================
echo     LeviaTech Story - Windows Server Launcher
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

echo [1/2] Dang khoi tao du lieu va thu muc...
echo [2/2] Chuan bi mo trinh duyet sau 3 giay (http://localhost:1997)...
echo.
echo ===================================================
echo LOG SERVER GO (VUI LONG KHONG DONG CUA SO NAY):
echo ===================================================
echo.

:: Open browser automatically after 3 seconds in background
start /b "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:1997"

:: Run Go API executable directly in this window
if exist "levia_api.exe" (
    levia_api.exe
) else if exist "leviatech-story.exe" (
    leviatech-story.exe
) else (
    echo [ERROR] Khong tim thay file executable (levia_api.exe)!
)

echo.
echo ===================================================
echo Server da ngung hoac gap loi.
echo Chi tiet log co the xem trong file: logs\leviatech_story.log
echo Nhan phim bat ky de thoat...
echo ===================================================
pause
