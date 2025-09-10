@echo off
REM USB Certificate Diagnostic Tool
REM This script helps diagnose USB certificate access issues

echo.
echo ===============================================
echo   USB Certificate Diagnostic Tool
echo ===============================================
echo.

REM Check if PowerShell is available
powershell -Command "Get-Host" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PowerShell is not available on this system
    echo Please install PowerShell or run the .ps1 file directly
    pause
    exit /b 1
)

REM Run the PowerShell diagnostic script
echo Running USB certificate diagnostic...
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0diagnose-usb-certificate.ps1" %*

echo.
echo Press any key to exit...
pause >nul
