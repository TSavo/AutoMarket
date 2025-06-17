@echo off
echo Horizon City Location Animation
echo =============================================

if "%~1"=="--help" (
  echo Usage:
  echo   animate-locations.bat ^<location-slug^> [--prompt "your animation prompt"]
  echo   animate-locations.bat --all [--force]
  echo.
  echo Options:
  echo   --all     Process all locations that need animation
  echo   --force   Force animation even for locations that already have animated videos
  echo   --prompt  Specify animation prompt directly, bypassing Ollama
  echo   --help    Display this help message
  exit /b 0
)

if "%~1"=="" (
  echo Error: Missing location slug or --all option
  echo Run 'animate-locations.bat --help' for usage information
  exit /b 1
)

echo Animating location(s)...
echo.

node animate-locations.js %*

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Process failed!
  exit /b 1
)

echo.
echo Process completed!
echo.
echo Press any key to exit...
pause > nul
