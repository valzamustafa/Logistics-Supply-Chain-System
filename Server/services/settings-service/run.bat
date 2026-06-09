@echo off
REM Settings Service Deployment Script (Windows)
REM This script sets up and runs the Settings Service

setlocal enabledelayedexpansion

echo ================================
echo Settings Service Setup Script
echo ================================
echo.

REM Configuration
set SERVICE_NAME=Settings Service
set SERVICE_PATH=..\..\..\..
set PORT_HTTP=5011
set PORT_HTTPS=7011
set DOTNET_VERSION=8.0

echo Starting %SERVICE_NAME% setup...
echo.

REM Check if .NET is installed
echo Checking .NET installation...
dotnet --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: .NET is not installed
    echo Please install .NET %DOTNET_VERSION% from https://dotnet.microsoft.com/download
    exit /b 1
)

for /f "tokens=*" %%i in ('dotnet --version') do set DOTNET_VERSION_INSTALLED=%%i
echo [OK] .NET %DOTNET_VERSION_INSTALLED% found
echo.

REM Restore packages
echo Restoring NuGet packages...
dotnet restore
echo [OK] Packages restored
echo.

REM Build project
echo Building project...
dotnet build
echo [OK] Project built
echo.

REM Run project
echo Starting %SERVICE_NAME%...
echo Service will run on:
echo   HTTP:  http://localhost:%PORT_HTTP%
echo   HTTPS: https://localhost:%PORT_HTTPS%
echo.
echo Press Ctrl+C to stop the service
echo.

dotnet run

echo.
echo %SERVICE_NAME% stopped

endlocal
