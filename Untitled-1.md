# 1. Haces el build en la nube para actualizar la imagen
gcloud builds submit --config apps/api-gateway/cloudbuild.yaml .

# 2. Despliegas esa nueva imagen con las variables corregidas
gcloud run deploy api-gateway \
    --image gcr.io/ravstore-scraper-prod/api-gateway \
    --region southamerica-west1 \
    --platform managed \
    --allow-unauthenticated \
    --add-cloudsql-instances=ravstore-scraper-prod:southamerica-west1:ravstore-db-prod \
    --vpc-connector ravstore-vpc-conn \
    --set-env-vars="NODE_ENV=production,\
DB_USER=admin_aether,\
DB_PASSWORD=tu_pass_inventado,\
DB_NAME=aethertrade_db,\
DB_HOST=/cloudsql/ravstore-scraper-prod:southamerica-west1:ravstore-db-prod,\
DATABASE_URL=postgresql://admin_aether:tu_pass_inventado@/aethertrade_db?host=/cloudsql/ravstore-scraper-prod:southamerica-west1:ravstore-db-prod,\
REDIS_HOST=10.207.123.235,\
REDIS_PORT=6379,\
MP_ACCESS_TOKEN=APP_USR-717921459440425-051022-432170beaf5b7d017b69bc54de179034-3390920876,\
NEXT_PUBLIC_SITE_URL=https://ravstore.cl,\
WORKER_API_URL=https://workers-ai-102694868306.southamerica-west1.run.app"

https://api-gateway-102694868306.southamerica-west1.run.app

# 1. Haces el build usando tu archivo cloudbuild.yaml
gcloud builds submit --config apps/workers-ai/cloudbuild.yaml .

# 2. Despliegas la nueva versión (v1.0.4) con el nuevo Redis
gcloud run deploy workers-ai \
    --image gcr.io/ravstore-scraper-prod/ravstore-worker:v7.4.3 \
    --region southamerica-west1 \
    --platform managed \
    --no-allow-unauthenticated \
    --add-cloudsql-instances=ravstore-scraper-prod:southamerica-west1:ravstore-db-prod \
    --vpc-connector ravstore-vpc-conn \
    --set-env-vars="NODE_ENV=production,DB_USER=admin_aether,DB_PASSWORD=tu_pass_inventado,DB_NAME=aethertrade_db,DB_HOST=/cloudsql/ravstore-scraper-prod:southamerica-west1:ravstore-db-prod,DATABASE_URL=postgresql://admin_aether:tu_pass_inventado@/aethertrade_db?host=/cloudsql/ravstore-scraper-prod:southamerica-west1:ravstore-db-prod,REDIS_HOST=10.207.123.235,REDIS_PORT=6379,GEMINI_API_KEY=AIzaSyC1vVlm3tYpEc3FACC14QVPhsyl3wC-S-c,RAPID_API_KEY=92c3763da9msh400efa1ba1e7a96p1d956djsnbf1b2e00983d,SERPER_API_KEY=486a33176290fd5c5553052c1d05cb5fa947a38e,GOOGLE_CLOUD_PROJECT=ravstore-scraper-prod"

postgresql://admin_aether:tu_pass_inventado@/aethertrade_db?host=/cloudsql/ravstore-scraper-prod:southamerica-west1:ravstore-db-prod

https://ravstore-scraper-prod.web.app