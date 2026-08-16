#!/bin/bash

echo "🚀 Iniciando despliegue COMPLETO de Aether Trade (Sin Caché Base)..."

# ==========================================
# 1. API GATEWAY
# ==========================================
echo "📦 1/3 Preparando y desplegando API Gateway..."
cp apps/api-gateway/Dockerfile .
gcloud run deploy aethertrade-gateway \
  --source . \
  --region southamerica-west1 \
  --project aethertrade-core \
  --clear-base-image

# ==========================================
# 2. WORKER AI
# ==========================================
# echo "🤖 2/3 Preparando y desplegando Worker AI..."
# cp apps/workers-ai/Dockerfile .
# gcloud run deploy aethertrade-worker-ai \
#   --source . \
#   --region southamerica-west1 \
#   --project aethertrade-core \
#   --clear-base-image


# ==========================================
# 3. LANDING NEXT.JS
# ==========================================
echo "🌐 3/3 Preparando y desplegando Landing Page..."

# ⚡ FIX A PRUEBA DE BALAS: Escribimos el .env.production a la fuerza 
# Reemplaza AIzaSy... con tu llave real
echo "NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSyDxzPPuGfjR0GrRGoG0TDKJycexz76Lg7o" > apps/landing-next/.env.local
echo "NEXT_PUBLIC_API_GATEWAY_URL=https://aethertrade-gateway-126152513656.southamerica-west1.run.app" >> apps/landing-next/.env.local
echo "NEXT_PUBLIC_SITE_URL=https://ravsstore.com" >> apps/landing-next/.env.local

# 1. Copiar el Dockerfile optimizado a la raíz
cp apps/landing-next/Dockerfile ./Dockerfile

# 2. Generar un nombre de etiqueta única basada en la fecha y hora
export IMAGE_TAG="southamerica-west1-docker.pkg.dev/aethertrade-core/cloud-run-source-deploy/aethertrade-landing:$(date +%Y%m%d%H%M%S)"

# 3. Construir la imagen explícitamente en Cloud Build
gcloud builds submit --tag $IMAGE_TAG .

# 4. Desplegar ESA imagen exacta en Cloud Run
gcloud run deploy aethertrade-landing \
  --image $IMAGE_TAG \
  --region southamerica-west1 \
  --project aethertrade-core \
  --port 3000 \
  --allow-unauthenticated \
  --set-env-vars="API_GATEWAY_URL=https://aethertrade-gateway-126152513656.southamerica-west1.run.app"
# Limpieza final
rm Dockerfile
echo "✅ ¡Despliegue de los 3 servicios completado con éxito!"