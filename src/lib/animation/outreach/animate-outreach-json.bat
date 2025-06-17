@echo off
echo Horizon City Outreach JSON Animation
echo =============================================

if "%~1"=="--help" (
  echo Usage:
  echo   animate-outreach-json.bat ^<image-filename^>
  echo   animate-outreach-json.bat --all [--force]
  echo.
  echo Options:
  echo   --all    Process all images in the JSON file
  echo   --force  Force animation even for images that already have animated videos
  echo   --help   Display this help message
  exit /b 0
)

if "%~1"=="" (
  echo Error: Missing image filename or --all option
  echo Run 'animate-outreach-json.bat --help' for usage information
  exit /b 1
)

echo Animating outreach image(s)...
echo.

cd %~dp0
node animate-outreach-json.js %*

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Process failed!
  exit /b 1
)

echo.
echo Process completed!
exit /b 0
