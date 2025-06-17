@echo off
echo Horizon City Theme Animation
echo =============================================

if "%~1"=="--help" (
  echo Usage:
  echo   animate-themes.bat ^<theme-slug^>
  echo   animate-themes.bat --all [--force]
  echo.
  echo Options:
  echo   --all    Process all themes that need animation
  echo   --force  Force animation even for themes that already have animated videos
  echo   --help   Display this help message
  exit /b 0
)

if "%~1"=="" (
  echo Error: Missing theme slug or --all option
  echo Run 'animate-themes.bat --help' for usage information
  exit /b 1
)

echo Animating theme(s)...
echo.

node animate-themes.js %*

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Process failed!
  exit /b 1
)

echo.
echo Process completed!
