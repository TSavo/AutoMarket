@echo off
echo Starting Zonos TTS Docker Service...
echo.

echo 🐳 Starting Docker container...
docker-compose -f services\zonos\docker-compose.yml up -d

echo.
echo ⏳ Waiting for service to initialize...
timeout /t 15 /nobreak > nul

echo.
echo 🔍 Checking service status...
docker ps | findstr zonos

echo.
echo 🌐 Testing service endpoint...
curl -s http://localhost:7860/ > nul
if %errorlevel% == 0 (
    echo ✅ Service is responding
) else (
    echo ⚠️  Service may still be starting up
)

echo.
echo 📋 Service Information:
echo    URL: http://localhost:7860/
echo    Container: zonos-tts-server
echo    Image: kprinssu/zonos:latest
echo.
echo 💡 Usage:
echo    npx tsx test-zonos-docker.ts
echo    npx tsx zonos-integration-example.ts
echo.
echo 🛑 To stop: docker-compose -f services\zonos\docker-compose.yml down
echo.

pause
