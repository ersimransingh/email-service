@echo off
REM PDF Signing Certificate Checker - Batch File Version
REM This is a simple wrapper for the PowerShell script

echo.
echo ========================================
echo   PDF Signing Certificate Checker
echo ========================================
echo.

REM Check if PowerShell is available
powershell -Command "Get-Host" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PowerShell is not available on this system
    echo Please install PowerShell or run the .ps1 file directly
    pause
    exit /b 1
)

REM Run the PowerShell script
echo Running certificate check...
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0check-pdf-signing-certificates.ps1" %*

echo.
echo Press any key to exit...
pause >nul
