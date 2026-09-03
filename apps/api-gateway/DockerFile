# --- ETAPA 1: Compilación (Builder) ---
FROM node:20-slim AS builder

WORKDIR /app

# Copiar archivos de configuración de dependencias de la raíz y de la app
COPY package*.json ./
COPY apps/api-gateway/package*.json ./apps/api-gateway/

# Instalar todas las dependencias del monorepo
RUN npm install

# Copiar el código fuente de la API Gateway
COPY apps/api-gateway ./apps/api-gateway

# Compilar TypeScript
WORKDIR /app/apps/api-gateway
RUN npm run build

# Limpiar dependencias de desarrollo en la raíz para dejar el node_modules listo para producción
WORKDIR /app
RUN npm prune --production


# --- ETAPA 2: Ejecución (Runner) ---
FROM node:20-slim

WORKDIR /app

# Variable de entorno para producción
ENV NODE_ENV=production

# Copiar el package.json específico, los node_modules ya limpios y el código compilado desde el builder
COPY --from=builder /app/apps/api-gateway/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api-gateway/dist ./dist

# Cloud Run usa el puerto 8080 por defecto
EXPOSE 8080

# Comando para arrancar la API
CMD ["node", "dist/server.js"]