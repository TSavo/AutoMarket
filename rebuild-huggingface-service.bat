@echo off
echo 🔄 Rebuilding HuggingFace Docker service with ESPnet support...

cd services\huggingface

echo 📦 Stopping existing service...
docker-compose down

echo 🏗️ Building new image with ESPnet...
docker-compose build --no-cache

echo 🚀 Starting updated service...
docker-compose up -d

echo ⏳ Waiting for service to be ready...
timeout /t 30

echo ✅ HuggingFace service rebuilt successfully!
echo 📋 Check logs with: docker-compose logs -f

cd ..\..
