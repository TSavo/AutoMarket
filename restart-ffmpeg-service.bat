@echo off
REM Restart FFmpeg Docker Service
REM This script rebuilds and restarts the FFmpeg Docker container

echo 🔄 Restarting FFmpeg Docker Service...
echo.

REM Change to the ffmpeg service directory
pushd services\ffmpeg

echo 📦 Stopping existing containers...
docker-compose down

echo 🔨 Building and starting containers...
docker-compose up --build -d

echo ✅ FFmpeg service restarted!
echo.
echo 🌐 Service should be available at: http://localhost:8006
echo 🔍 Check logs with: docker-compose logs -f
echo.

REM Return to original directory
popd

echo 📁 Returned to project root
pause
