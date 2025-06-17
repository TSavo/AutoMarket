@echo off
echo Horizon City Technology Animation
echo =============================================

if "%~1"=="--help" (
  echo Usage:
  echo   animate-technologies.bat ^<technology-slug^>
  echo   animate-technologies.bat --all [--force]
  echo.
  echo Options:
  echo   --all    Process all technologies that need animation
  echo   --force  Force animation even for technologies that already have animated videos
  echo   --help   Display this help message
  exit /b 0
)

if "%~1"=="" (
  echo Error: Missing technology slug or --all option
  echo Run 'animate-technologies.bat --help' for usage information
  exit /b 1
)

echo Animating technology(s)...
echo.

node animate-technologies.js %*

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Process failed!
  exit /b 1
)

echo.
echo Process completed!
