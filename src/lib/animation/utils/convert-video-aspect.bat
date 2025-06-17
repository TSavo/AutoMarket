@echo off
echo Video Aspect Ratio Converter (9:16 to 3:4)
echo =========================================

if "%~1"=="--help" (
  echo Usage:
  echo   convert-video-aspect.bat ^<input-path^> [output-path] [--overwrite]
  echo   convert-video-aspect.bat --dir ^<input-dir^> ^<output-dir^> [--overwrite]
  echo.
  echo Options:
  echo   --dir        Process all videos in a directory
  echo   --overwrite  Overwrite existing output files
  echo   --help       Display this help message
  exit /b 0
)

if "%~1"=="" (
  echo Error: Missing input path
  echo Run 'convert-video-aspect.bat --help' for usage information
  exit /b 1
)

echo Converting video(s) from 9:16 to 3:4 aspect ratio...
echo.

node convert-video-aspect.js %*

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Video conversion failed!
  exit /b 1
)

echo.
echo Conversion completed!
echo.
echo Press any key to exit...
pause > nul
