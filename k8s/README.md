# Deploying the Task Management API to K8s

This guide provides step-by-step instructions to deploy the **Task Management API** on Google Cloud Platform (GCP) using Kubernetes (GKE), Cloud SQL, Redis, and other services. The deployment process is divided into logical sections for clarity and ease of use.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Note on Database Migration](#note-on-database-migration)
3. [Setting Up the Environment](#setting-up-the-environment)
4. [Creating the GKE Cluster](#creating-the-gke-cluster)
5. [Setting Up Cloud SQL (MySQL)](#setting-up-cloud-sql-mysql)
6. [Setting Up Redis](#setting-up-redis)
7. [Building and Pushing Docker Images](#building-and-pushing-docker-images)
8. [Configuring Kubernetes Manifests](#configuring-kubernetes-manifests)
9. [Deploying to Kubernetes](#deploying-to-kubernetes)
10. [Testing the Deployment](#testing-the-deployment)
11. [Debugging and Troubleshooting](#debugging-and-troubleshooting)
12. [Updating the Deployment](#updating-the-deployment)
13. [Cleanup](#cleanup)

---

## Prerequisites

Before starting, ensure you have the following:
- A Google Cloud Platform (GCP) account with billing enabled.
- `gcloud` CLI installed and authenticated (`gcloud auth login`).
- `kubectl` CLI installed and configured.
- Docker installed locally.
- Basic knowledge of Kubernetes, GCP, and Docker.

Set the following environment variables in your terminal:
```bash
export PROJECT_ID="task-project-daniel"
export REGION="europe-west3"
export ZONE="europe-west3-a"
export CLUSTER_NAME="task-api-cluster"
```

---

## Note on Database Migration

The `development` deployment is configured with the environment variable `INITIATE_MIGRATION` set to `true`. This triggers the execution of the `dist/migration.js` script upon successful deployment. The purpose of this script is to facilitate the seamless migration of existing user data from the previous database (MongoDB) to the new Cloud SQL service.

### Key Points:
- **Purpose**: The migration process ensures that any existing data in MongoDB is transferred to the Cloud SQL database without manual intervention.
- **Optional**: Running the migration is not mandatory. If you do not need to migrate data, you can disable this feature by updating the `k8s/development/app-deployment.yaml` file.
  - Locate the `INITIATE_MIGRATION` variable and set its value to `false`.
- **Development-Specific**: The `development` deployment is primarily intended for handling database migrations. If you do not require this functionality, you can skip the `development` deployment entirely and proceed directly with the `production` deployment.

### Recommendation:
If your use case does not involve migrating data from MongoDB to Cloud SQL, it is recommended to ignore the `development` deployment and focus solely on deploying the `production` environment.

For more details on how to configure or disable the migration process, refer to the `k8s/development/app-deployment.yaml` file.

---

## Setting Up the Environment

1. **Enable Required APIs**:
   ```bash
   gcloud services enable container.googleapis.com sqladmin.googleapis.com redis.googleapis.com
   ```

2. **Set Project**:
   ```bash
   gcloud config set project $PROJECT_ID
   ```

---

## Creating the GKE Cluster

1. **Create the GKE Cluster**:
   ```bash
   gcloud container clusters create $CLUSTER_NAME \
       --zone $ZONE \
       --num-nodes 3 \
       --machine-type e2-medium \
       --workload-pool=$PROJECT_ID.svc.id.goog
   ```

2. **Verify Workload Identity**:
   ```bash
   gcloud container clusters describe $CLUSTER_NAME --zone=$ZONE | grep "workloadPool:"
   ```

3. **Connect `kubectl` to the Cluster**:
   ```bash
   gcloud container clusters get-credentials $CLUSTER_NAME --zone $ZONE
   ```

---

## Setting Up Cloud SQL (MySQL)

1. **Create the MySQL Instance**:
   ```bash
   gcloud sql instances create task-api-mysql \
       --database-version=MYSQL_8_0 \
       --tier=db-g1-small \
       --region=$REGION \
       --root-password=Qwerty@12345
   ```

2. **Get the Connection Name**:
   ```bash
   CLOUD_SQL_CONNECTION_NAME=$(gcloud sql instances describe task-api-mysql --format='value(connectionName)')
   echo $CLOUD_SQL_CONNECTION_NAME
   ```

3. **Create the Database**:
   ```bash
   gcloud sql databases create taskdb --instance=task-api-mysql
   ```

---

## Setting Up Redis

1. **Create the Redis Instance**:
   ```bash
   gcloud redis instances create task-api-redis \
       --region=$REGION \
       --zone=$ZONE \
       --size=1 \
       --redis-version=redis_7_0 \
       --enable-auth
   ```

2. **Get the Redis Auth String**:
   ```bash
   gcloud redis instances get-auth-string task-api-redis --region=$REGION
   ```

---

## Building and Pushing Docker Images

1. **Build the Docker Image**:
   ```bash
   docker build -t gcr.io/$PROJECT_ID/task-api:dev .

   docker build -t gcr.io/$PROJECT_ID/task-api:prod .
   ```

2. **Push the Docker Image to GCR**:
   ```bash
   docker push gcr.io/$PROJECT_ID/task-api:dev

   docker push gcr.io/$PROJECT_ID/task-api:prod
   ```

---

## Configuring Kubernetes Manifests

1. **Create Secrets**:
   ```bash
   echo -n "<db_user>" | gcloud secrets create MYSQL_USER --data-file=-
   echo -n "<db_password>" | gcloud secrets create MYSQL_PASSWORD --data-file=-
   echo -n "<db_name>" | gcloud secrets create MYSQL_DB --data-file=-
   ```

2. **Create Kubernetes Secrets**:
   ```bash
   kubectl create secret generic cloud-sql-key --from-file=credentials.json=key.json
   ```

3. **Apply ConfigMaps and Secrets**:
   ```bash
   kubectl apply -f k8s/mysql-secret.yaml
   kubectl apply -f k8s/redis-secret.yaml
   kubectl apply -f k8s/app-secret.yaml
   kubectl apply -f k8s/app-config.yaml
   ```

---

## Deploying to Kubernetes

1. **Deploy Cloud SQL Proxy**:
   ```bash
   kubectl apply -f k8s/cloudsql-service.yaml
   ```

2. **Deploy Redis**:
   ```bash
   kubectl apply -f k8s/redis-service.yaml
   kubectl apply -f k8s/redis-deployment.yaml
   kubectl apply -f k8s/redis-pvc.yaml
   ```

3. **Deploy Development Environment**:
   ```bash
   kubectl apply -f k8s/development/app-deployment.yaml
   kubectl apply -f k8s/development/app-service.yaml
   ```

4. **Deploy Production Environment**:
   ```bash
   kubectl apply -f k8s/production/app-deployment.yaml
   kubectl apply -f k8s/production/app-service.yaml
   ```

---

## Testing the Deployment

1. **Get the LoadBalancer IP**:
   ```bash
   export SERVICE_IP=$(kubectl get service task-api-prod -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
   ```

2. **Test the Health Endpoint**:
   ```bash
   curl http://$SERVICE_IP/health
   ```

---

## Debugging and Troubleshooting

1. **Check Logs**:
   ```bash
   kubectl logs deployment/task-api-prod --all-containers=true -f
   ```

2. **Restart Deployments**:
   ```bash
   kubectl rollout restart deployment task-api-dev
   kubectl rollout restart deployment task-api-prod
   ```
In the event the rollout pods are failing - this is due to the current configurations using small resources. delete the deployments and re-apply the manifests.
```bash
   #delete 
   kubectl delete deployment task-api-dev
   kubectl delete deployment task-api-prod

   #re-apply
   kubectl apply -f k8s/production/app-deployment.yaml
   kubectl apply -f k8s/production/app-service.yaml
   ```

---

## Updating the Deployment

1. **Rebuild and Push Docker Image**:
   ```bash
   docker build -t gcr.io/$PROJECT_ID/task-api:prod .
   docker push gcr.io/$PROJECT_ID/task-api:prod
   ```

2. **Restart Deployment**:
   ```bash
   kubectl rollout restart deployment task-api-prod
   ```

---

## Cleanup

1. **Delete the GKE Cluster**:
   ```bash
   gcloud container clusters delete $CLUSTER_NAME --zone=$ZONE
   ```

2. **Delete Cloud SQL and Redis Instances**:
   ```bash
   gcloud sql instances delete task-api-mysql
   gcloud redis instances delete task-api-redis --region=$REGION
   ```

3. **Delete Kubernetes Resources**:
   ```bash
   kubectl delete -f k8s/
   ```

---

By following this guide, you should be able to successfully deploy and manage the **Task Management API** on GCP. If you encounter any issues, refer to the [Debugging and Troubleshooting](#debugging-and-troubleshooting) section or consult the official GCP documentation.