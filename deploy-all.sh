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
echo "🤖 2/3 Preparando y desplegando Worker AI..."
cp apps/workers-ai/Dockerfile .
gcloud run deploy aethertrade-worker-ai \
  --source . \
  --region southamerica-west1 \
  --project aethertrade-core \
  --clear-base-image

# ==========================================
# 3. LANDING NEXT.JS
# ==========================================
echo "🌐 3/3 Preparando y desplegando Landing Page..."
# 1. Copiar el Dockerfile optimizado a la raíz
cp apps/landing-next/Dockerfile ./Dockerfile

# 2. Generar un nombre de etiqueta única basada en la fecha y hora
export IMAGE_TAG="southamerica-west1-docker.pkg.dev/aethertrade-core/cloud-run-source-deploy/aethertrade-landing:$(date +%Y%m%d%H%M%S)"

# 3. Construir la imagen explícitamente en Cloud Build (sin intermediarios)
gcloud builds submit --tag $IMAGE_TAG .

# 4. Desplegar ESA imagen exacta en Cloud Run, definiendo el puerto correcto y las variables
gcloud run deploy aethertrade-landing \
  --image $IMAGE_TAG \
  --region southamerica-west1 \
  --project aethertrade-core \
  --port 3000 \
  --allow-unauthenticated \
  --set-env-vars="NEXT_PUBLIC_API_GATEWAY_URL=https://aethertrade-gateway-126152513656.southamerica-west1.run.app,NEXT_PUBLIC_SITE_URL=https://ravsstore.com,API_GATEWAY_URL=https://aethertrade-gateway-126152513656.southamerica-west1.run.app"

# 5. Limpieza del entorno
rm Dockerfile

# Limpieza final
rm Dockerfile
echo "✅ ¡Despliegue de los 3 servicios completado con éxito!"