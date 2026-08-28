# ETAPA 1: Builder
FROM node:20-slim AS builder
WORKDIR /app

# Copiamos archivos de configuración
COPY package*.json ./
COPY apps/workers-ai/package*.json ./apps/workers-ai/

# Instalamos todo en el builder
RUN npm install

# Copiamos el resto del código
COPY . . 
WORKDIR /app/apps/workers-ai
RUN npx tsc

# ETAPA 2: Producción
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

# Copiamos los package.json de nuevo
COPY package*.json ./
COPY apps/workers-ai/package*.json ./apps/workers-ai/

# INSTALACIÓN LIMPIA: Esto asegura que todas las dependencias estén presentes
RUN npm install --omit=dev

# Copiamos el dist compilado desde el builder
COPY --from=builder /app/apps/workers-ai/dist ./apps/workers-ai/dist

# Cambiamos al directorio del worker
WORKDIR /app/apps/workers-ai

# Ejecutamos el archivo principal de Express ya compilado (¡Adiós a tsx y a los timeouts!)
CMD ["node", "dist/index.js"]