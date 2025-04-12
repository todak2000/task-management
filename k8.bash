#!/bin/bash

# Define the project ID as a variable
PROJECT_ID="task-project-daniel"  # Replace with your actual GCP project ID
REGION="europe-west3"
ZONE="europe-west3-a"
CLUSTER_NAME="task-api-cluster"
MACHINE="e2-medium"
MYSQL_INSTANCE="task-api-mysql"
MYSQL_PASSWORD="Qwerty@12345"
MYSQL_DB="taskdb"
MYSQL_HOST="localhost"
MYSQL_USER="root"
MONGODB_URI="mongodb+srv://todak2000:LdmD5s93m6dJl6mY@task-management-db.31ots.mongodb.net/?retryWrites=true&w=majority&appName=task-management-db"

REDIS_INSTANCE="task-api-redis"

SERVICE_ACCOUNT_CLOUD_PROXY="cloud-sql-proxy"
SERVICE_ACCOUNT_NAME="cloud-sql-service-account"
# Create a GKE cluster
gcloud container clusters create $CLUSTER_NAME \
    --zone $ZONE \
    --num-nodes 3 \
    --machine-type $MACHINE \
    --workload-pool=$PROJECT_ID.svc.id.goog


# To correctly check if Workload Identity is enabled using grep
gcloud container clusters describe $CLUSTER_NAME --zone=$ZONE | grep "workloadPool:"

# Connect kubectl to the cluster
gcloud container clusters get-credentials $CLUSTER_NAME --zone $ZONE

# Create MySQL instance
gcloud sql instances create $MYSQL_INSTANCE \
    --database-version=MYSQL_8_0 \
    --tier=db-g1-small \
    --region=$REGION \
    --root-password=$MYSQL_PASSWORD

# get MYSQL instance connection name
gcloud sql instances describe $MYSQL_INSTANCE --format='value(connectionName)'

CLOUD_SQL_CONNECTION_NAME=$(gcloud sql instances describe $MYSQL_INSTANCE --format='value(connectionName)')
# Create database
gcloud sql databases create $MYSQL_DB \
    --instance=$MYSQL_INSTANCE


# MIgration Process
# 1. change the Docker CMD command to
# CMD ["node", "dist/migration.js"]
# 2. Build it locally
docker build -t gcr.io/task-project-daniel/migration-script:latest .

docker push gcr.io/task-project-daniel/migration-script:latest

echo -n "root" | gcloud secrets create MYSQL_USER --data-file=-
echo -n "Qwerty@12345" | gcloud secrets create MYSQL_PASSWORD --data-file=-
echo -n "taskdb" | gcloud secrets create MYSQL_DB --data-file=-
echo -n "localhost" | gcloud secrets create MYSQL_HOST --data-file=-
echo -n "mongodb+srv://todak2000:LdmD5s93m6dJl6mY@task-management-db.31ots.mongodb.net/?retryWrites=true&w=majority&appName=task-management-db" | gcloud secrets create MONGODB_URI --data-file=-

# gcloud run jobs create migration-job \
#   --image gcr.io/$PROJECT_ID/migration-script:latest \
#   --set-env-vars INITIATE_MIGRATION=true \
#   --set-secrets DB_USER=MYSQL_USER:latest,DB_PASSWORD=MYSQL_PASSWORD:latest,DB_NAME=MYSQL_DB:latest,DB_HOST=MYSQL_HOST:latest,MONGODB_URI=MONGODB_URI:latest

gcloud run jobs create migration-job \
  --image gcr.io/$PROJECT_ID/migration-script:latest \
  --set-env-vars INITIATE_MIGRATION=true \
  --set-secrets DB_USER=MYSQL_USER:latest,DB_PASSWORD=MYSQL_PASSWORD:latest,DB_NAME=MYSQL_DB:latest,MONGODB_URI=MONGODB_URI:latest \
  --volume name=cloudsql-credentials,secret=cloud-sql-key \
  --task-template \
    --container \
      --command "/bin/sh" \
      --args '-c' "/cloudsql/cloud_sql_proxy --structured-logging --address=0.0.0.0 --port=3306 $PROJECT_ID:$REGION:task-api-mysql --credentials-file=/mnt/cloudsql/credentials.json & sleep 2 && node /app/migrate.js" \
      --volume-mount /mnt/cloudsql,cloudsql-credentials \
  --region=$REGION

gcloud run jobs execute migration-job --region=$REGION
# migration-job-wp24x name of the runiugin job pod
gcloud run jobs executions describe migration-job-wp24x --region=$REGION
gcloud run jobs logs migration-job-wp24x --task=0 --follow

# Create a Redis instance
gcloud redis instances create $REDIS_INSTANCE \
    --region=$REGION \
    --zone=$ZONE \
    --size=1 \
    --redis-version=redis_7_0 \
    --enable-auth

# get the authstring which serves as password
gcloud redis instances get-auth-string $REDIS_INSTANCE --region=$REGION

# Package the app
cat > Dockerfile << 'EOL'
# Stage 1: Build the application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm install

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Create the runtime image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["node", "dist/app.js"]
EOL

# build containers
docker build -t gcr.io/$PROJECT_ID/task-api:dev .
docker build -t gcr.io/$PROJECT_ID/task-api:prod .

# push to gcp
docker push gcr.io/$PROJECT_ID/task-api:dev
docker push gcr.io/$PROJECT_ID/task-api:prod

# Create service account for Cloud SQL
gcloud iam service-accounts create $SERVICE_ACCOUNT_CLOUD_PROXY

# Add IAM roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:cloud-sql-proxy@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Enable the IAM binding between your Service acc and K8s
gcloud iam service-accounts add-iam-policy-binding \
--role="roles/iam.workloadIdentityUser" \
--member="serviceAccount:$PROJECT_ID.svc.id.goog[default/$CLUSTER_NAME]" \
$SERVICE_ACCOUNT_CLOUD_PROXY@$PROJECT_ID.iam.gserviceaccount.com

kubectl annotate serviceaccount \
$SERVICE_ACCOUNT_NAME \
iam.gke.io/gcp-service-account=$SERVICE_ACCOUNT_CLOUD_PROXY@$PROJECT_ID.iam.gserviceaccount.com

# Create and download key
gcloud iam service-accounts keys create key.json \
  --iam-account=$SERVICE_ACCOUNT_CLOUD_PROXY@$PROJECT_ID.iam.gserviceaccount.com

# Create Kubernetes secret for service account key
kubectl create secret generic cloud-sql-key \
  --from-file=credentials.json=key.json


# Create directory structure
mkdir -p k8s/development k8s/production

# Database Secret
cat > k8s/mysql-secret.yaml << 'EOL'
apiVersion: v1
kind: Secret
metadata:
  name: mysql-secret
type: Opaque
data:
  MYSQL_USER: cm9vdA==
  MYSQL_PASSWORD: UXdlcnR5QDEyMzQ1
EOL

# Redis Secret
cat > k8s/redis-secret.yaml << 'EOL'
apiVersion: v1
kind: Secret
metadata:
  name: redis-secret
type: Opaque
data:
  REDIS_PASSWORD: UXdlcnR5QDEyMzQ1
EOL

# App Secret
cat > k8s/app-secret.yaml << 'EOL'
apiVersion: v1
kind: Secret
metadata:
  name: app-secret
type: Opaque
data:
  JWT_SECRET: dGFzay1tYW5hZ2VtZW50LTIwMDA=
  JWT_REFRESH_SECRET: dGFzay1tYW5hZ2VtZW50LXJlZnJlc2gtMjAwMA==
EOL

# Config Map for environment variables
cat > k8s/app-config.yaml << 'EOL'
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NODE_ENV: "production"
  MYSQL_HOST: "cloud-sql-proxy"
  MYSQL_DB: "taskdb"
  MYSQL_PORT: "3306"
  REDIS_HOST: "10.84.243.51"
  REDIS_PORT: "6379"
  GOOGLE_REDIS_URL: "10.84.243.51"
  INITIATE_MIGRATION: "false"
  REDIS_USERNAME: "redis"
  CLOUD_SQL_CONNECTION_NAME: "task-project-daniel:europe-west3:task-api-mysql"
  DOMAIN_URL: "http://35.198.161.28"
  MONGODB_URI: "mongodb+srv://todak2000:LdmD5s93m6dJl6mY@task-management-db.31ots.mongodb.net/?retryWrites=true&w=majority&appName=task-management-db"
EOL

# Development Service - NodePort
cat > k8s/development/app-service.yaml << 'EOL'
apiVersion: v1
kind: Service
metadata:
  name: task-api-dev
spec:
  type: NodePort
  ports:
  - port: 3000
    targetPort: 3000
    nodePort: 30000
  selector:
    app: task-api
    env: development
EOL

# Production Service - LoadBalancer
cat > k8s/production/app-service.yaml << 'EOL'
apiVersion: v1
kind: Service
metadata:
  name: task-api-prod
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: task-api
    env: production
EOL

# Redis Service - ClusterIP
cat > k8s/redis-service.yaml << 'EOL'
apiVersion: v1
kind: Service
metadata:
  name: redis-service
spec:
  type: ClusterIP
  ports:
  - port: 6379
    targetPort: 6379
  selector:
    app: redis
EOL

# Redis  PersistentVolumeClaim (PVC)
cat > k8s/redis-pvc.yaml << 'EOL'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
EOL

# Cloud SQL Proxy Service - ClusterIP
cat > k8s/cloudsql-service.yaml << 'EOL'
apiVersion: v1
kind: Service
metadata:
  name: cloud-sql-proxy
spec:
  type: ClusterIP
  ports:
  - port: 3306
    targetPort: 3306
  selector:
    app: cloud-sql-proxy
EOL

# Development Deployment
cat > k8s/development/app-deployment.yaml << EOL
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-api-dev
spec:
  replicas: 2
  selector:
    matchLabels:
      app: task-api
      env: development
  template:
    metadata:
      labels:
        app: task-api
        env: development
    spec:
      serviceAccountName: $SERVICE_ACCOUNT_NAME 
      containers:
      - name: task-api
        image: gcr.io/${PROJECT_ID}/task-api:dev
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "development"
        - name: DB_HOST
          value: "127.0.0.1"
        - name: DB_PORT
          value: "3306"
        - name: DOMAIN_URL
          value: "localhost-dev"
        - name: MONGODB_URI
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: MONGODB_URI
        - name: DB_NAME
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: MYSQL_DB
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: MYSQL_USER
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: MYSQL_PASSWORD
        - name: REDIS_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: REDIS_HOST
        - name: GOOGLE_REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: GOOGLE_REDIS_URL
        - name: REDIS_USERNAME
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: REDIS_USERNAME
        - name: REDIS_PORT
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: REDIS_PORT
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: REDIS_PASSWORD
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secret
              key: JWT_SECRET
        - name: JWT_REFRESH_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secret
              key: JWT_REFRESH_SECRET
        - name: INITIATE_MIGRATION
          value: "true"
        resources:
          limits:
            cpu: "100m"
            memory: "512Mi"
          requests:
            cpu: "100m"
            memory: "128Mi"
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 15
          periodSeconds: 20
      - name: cloud-sql-proxy
        image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.1.0
        args:
          - "--structured-logs"
          - "--address=0.0.0.0"
          - "--port=3306"
          - "${PROJECT_ID}:${REGION}:task-api-mysql"
          - "--credentials-file=/secrets/credentials.json"
        ports:
        - containerPort: 3306
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
        volumeMounts:
        - name: cloud-sql-key
          mountPath: /secrets
          readOnly: true
      volumes:
      - name: cloud-sql-key
        secret:
          secretName: cloud-sql-key
EOL

# Production Deployment
cat > k8s/production/app-deployment.yaml << EOL
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-api-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: task-api
      env: production
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    metadata:
      labels:
        app: task-api
        env: production
    spec:
      serviceAccountName: $SERVICE_ACCOUNT_NAME 
      containers:
      - name: task-api
        image: gcr.io/${PROJECT_ID}/task-api:prod
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: NODE_ENV
        - name: DB_HOST
          value: "127.0.0.1"
        - name: DB_PORT
          value: "3306"
        - name: DOMAIN_URL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: DOMAIN_URL
        - name: DB_NAME
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: MYSQL_DB
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: MYSQL_USER
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: MYSQL_PASSWORD
        - name: REDIS_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: REDIS_HOST
        - name: GOOGLE_REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: GOOGLE_REDIS_URL
        - name: REDIS_USERNAME
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: REDIS_USERNAME
        - name: REDIS_PORT
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: REDIS_PORT
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: REDIS_PASSWORD
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secret
              key: JWT_SECRET
        - name: JWT_REFRESH_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secret
              key: JWT_REFRESH_SECRET
        resources:
          limits:
            cpu: "1"
            memory: "1Gi"
          requests:
            cpu: "100m"      # Reduced from 500m
            memory: "128Mi"  # Reduced from 512Mi
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 20
      - name: cloud-sql-proxy
        image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.1.0
        args:
          - "--structured-logs"
          - "--address=0.0.0.0"
          - "--port=3306"
          - "${PROJECT_ID}:${REGION}:task-api-mysql"
          - "--credentials-file=/secrets/credentials.json"
        ports:
        - containerPort: 3306
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
        volumeMounts:
        - name: cloud-sql-key
          mountPath: /secrets
          readOnly: true
      volumes:
      - name: cloud-sql-key
        secret:
          secretName: cloud-sql-key
EOL

# Cloud SQL Proxy Deployment
cat > k8s/cloudsql-deployment.yaml << EOL
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cloud-sql-proxy
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cloud-sql-proxy
  template:
    metadata:
      labels:
        app: cloud-sql-proxy
    spec:
      serviceAccountName: $SERVICE_ACCOUNT_NAME
      containers:
      - name: cloud-sql-proxy
        image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.1.0
        args:
          - "--structured-logs"
          - "--address=0.0.0.0"
          - "--port=3306"
          - "${PROJECT_ID}:$REGION:task-api-mysql"
          - "--credentials-file=/secrets/credentials.json"
        ports:
        - containerPort: 3306
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
        volumeMounts:
        - name: cloud-sql-key
          mountPath: /secrets
          readOnly: true
      volumes:
      - name: cloud-sql-key
        secret:
          secretName: cloud-sql-key
EOL

# Redis Deployment
cat > k8s/redis-deployment.yaml << 'EOL'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:6-alpine
        ports:
        - containerPort: 6379
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: REDIS_PASSWORD
        resources:
          limits:
            cpu: "300m"
            memory: "512Mi"
          requests:
            cpu: "100m"
            memory: "256Mi"
        volumeMounts:
        - name: redis-data
          mountPath: /data
      volumes:
      - name: redis-data
        persistentVolumeClaim:
          claimName: redis-data
EOL

# Service Account for Cloud SQL
cat > k8s/cloudsql-serviceaccount.yaml << 'EOL'
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cloud-sql-service-account
EOL

# Encode secrets for Kubernetes
echo -n "root" | base64
echo -n "Qwerty@12345" | base64
echo -n "task-management-2000" | base64

echo -n "task-management-refresh-2000" | base64

# then manually copy and replace them in the respective manifest
# Personally, i replaced, deleted all manifest and recreated them again 

# If necessary, grant write permissions:
chmod +w k8s/*.yaml

# Apply secrets and config maps
kubectl apply -f k8s/mysql-secret.yaml
kubectl apply -f k8s/redis-secret.yaml
kubectl apply -f k8s/app-secret.yaml
kubectl apply -f k8s/app-config.yaml
kubectl apply -f k8s/cloudsql-serviceaccount.yaml

# Apply service account binding
kubectl create clusterrolebinding cloud-sql-admin \
  --clusterrole=cluster-admin \
  --serviceaccount=default:$SERVICE_ACCOUNT_NAME

# Deploy Cloud SQL Proxy
kubectl apply -f k8s/cloudsql-service.yaml
# k8s/cloudsql-deployment.yaml  no longer used because it has been 
# added directly into the prod deployment manifest
# separating the containers made it difficult to connect so the 
# clould sql deployment was deployed in same space as the prod 
# prod deployment to ensure easy connection, 
# so each pod should have two containers - 
# one for prod, the other for sql service account

# kubectl apply -f k8s/cloudsql-deployment.yaml 

# Deploy Redis
kubectl apply -f k8s/redis-service.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/redis-pvc.yaml

# Deploy development environment
kubectl apply -f k8s/development/app-deployment.yaml
kubectl apply -f k8s/development/app-service.yaml

# Deploy production environment
kubectl apply -f k8s/production/app-deployment.yaml
kubectl apply -f k8s/production/app-service.yaml



# Access production service (LoadBalancer) to external IP address
# Get the LoadBalancer IP
export SERVICE_IP=$(kubectl get service task-api-prod -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test the health endpoint
curl http://$SERVICE_IP/health

# 35.198.161.28

# Remember to add the SERVICE IP to the cors allows IPS
# go to src/middleware/customCors/index.ts to update the allowedOringins Array

then rebuild and redeploy to gcloud for both prod and dev, reapply the production/dev manifests respectively


# Debuging session
# cloud sql instance was not running
# upon research, there was a permission issue which is solved with

gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --format="table(bindings.role)" \
  --filter="bindings.members:serviceAccount:cloud-sql-proxy@$PROJECT_ID.iam.gserviceaccount.com"

  # the above was not the issue. It was a credential issue which was not added when creating the service account. the command was updated to add the credentials. first save the key.json as secret and then add it

  # At this stage, opening the loadbalancer IP: http://34.107.0.197/api-docs/ wont load untill i create the firewall to give it acess
  gcloud compute firewall-rules create allow-http-to-loadbalancer --allow=tcp:80
  

  # TO cehck logs of all pods in a deployment in one swop
  kubectl logs deployment/task-api-prod --all-containers=true -f


  # To make updates
  # Update deployments
kubectl rollout restart deployment task-api-dev
kubectl rollout restart deployment task-api-prod


# delete single pod
kubectl delete pod -l app=<APP_NAME>