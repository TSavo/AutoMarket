@echo off
echo Horizon City Character Animation
echo ==============================

if "%~1"=="--help" goto :help
if "%~1"=="" goto :help

goto :main

:help
  echo Usage: animate-character.bat [options] [character-slug]
  echo.
  echo Options:
  echo   --generate-prompt   Generate animation prompt only
  echo   --animate           Animate the character portrait
  echo   --list              List all available characters
  echo   --help              Show this help message
  echo   --prompt="text"     Specify a custom animation prompt (bypasses Ollama)
  echo.
  echo Examples:
  echo   animate-character.bat --list
  echo   animate-character.bat --generate-prompt akiko
  echo   animate-character.bat --animate akiko
  echo   animate-character.bat akiko  (generates prompt and animates)
  echo   animate-character.bat akiko --prompt="The character blinks slowly and tilts her head slightly."
  exit /b 1

:main

node animate-character.js %*

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Character animation failed!
  exit /b 1
)

echo.
echo Character animation completed successfully!
echo.
echo Press any key to exit...
pause > nul
