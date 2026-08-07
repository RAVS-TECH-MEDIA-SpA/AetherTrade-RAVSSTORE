
    # GCP Setup Guide

    This document outlines the steps to configure Google Cloud Platform for the AetherTrade project.

    ## Step 1: Set the Active Project
    Based on your screenshots, we need to use the `aethertrade-core` project.

    ```bash
    gcloud config set project aethertrade-core
    ```

    ## Step 2: Enable Required APIs
    Enable the necessary services for Storage, Pub/Sub, Cloud Run, and Artifact Registry.

    ```bash
    gcloud services enable storage.googleapis.com pubsub.googleapis.com run.googleapis.com artifactregistry.googleapis.com
    ```

    ## Step 3: Create Cloud Storage Bucket
    Create a public bucket in Santiago, Chile for optimal latency.

    ```bash
    gcloud storage buckets create gs://ravs-aethertrade-assets-prod --location=southamerica-west1
    gcloud storage buckets add-iam-policy-binding gs://ravs-aethertrade-assets-prod --member=allUsers --role=roles/storage.objectViewer
    ```
    *Note: If the bucket name is taken, append a number (e.g., `ravs-aethertrade-assets-prod-01`).*

    ## Step 4: Create Pub/Sub Infrastructure
    Set up the messaging queues for the AI Workers.

    ```bash
    gcloud pubsub topics create product-discovery-tasks
    gcloud pubsub subscriptions create product-discovery-tasks-sub --topic=product-discovery-tasks
    ```

    ## Step 5: Update Environment Variables
    Update your `.env` file with the newly created resources.

    ```env
    GCP_PROJECT_ID=aethertrade-core
    GCS_BUCKET_NAME=ravs-aethertrade-assets-prod
    PUBSUB_TOPIC_NAME=product-discovery-tasks
    ```
    