# Deploying the Task Management API to K8s with Self-Signed HTTPS on GKE

This guide provides step-by-step instructions to deploy the **Task Management API** on Google Cloud Platform (GCP) using Kubernetes (GKE), Cloud SQL, Redis, and secure it with a self-signed HTTPS certificate. The deployment process is divided into logical sections for clarity and ease of use.

This is a comprehensive guide for deploying your Task Management API\! Let's refine it to be more robust and simplified by reusing constants and adding explanations.

-----

## Table of Contents

1.  [Prerequisites](#prerequisites)
2.  [Architectural Overview](#architectural-overview)
3.  [Note on Database Migration](note-on-database-migration)
4.  [Setting Up the Environment](setting-up-the-environment)
5.  [Creating the GKE Cluster](creating-the-gke-cluster)
6.  [Setting Up Cloud SQL (MySQL)](setting-up-cloud-sql-mysql)
7.  [Setting Up Redis](setting-up-redis)
8.  [Building and Pushing Docker Images](building-and-pushing-docker-images)
9.  [Creating Kubernetes Secrets and ConfigMap](creating-kubernetes-secrets-and-configmap)
10. [Generating and Uploading Self-Signed SSL Certificate](generating-and-uploading-self-signed-ssl-certificate)
11. [Configuring Kubernetes Manifests for HTTPS](configuring-kubernetes-manifests-for-https)
12. [Deploying to Kubernetes](deploying-to-kubernetes)
13. [Testing the HTTPS Deployment](testing-the-https-deployment)
14. [Set up monitoring](set-up-monitoring)
15. [Debugging and Troubleshooting](debugging-and-troubleshooting)
16. [Updating the Deployment](updating-the-deployment)
17. [Cleanup](cleanup)

-----

## Prerequisites

Before starting, ensure you have the following:

  - A Google Cloud Platform (GCP) account with billing enabled.
  - `gcloud` CLI installed and authenticated (`gcloud auth login`).
  - `kubectl` CLI installed and configured.
  - Docker installed locally.
  - Basic knowledge of Kubernetes, GCP, and Docker.

Set the following environment variables in your terminal (using the constants defined above):

```bash
# --- CONSTANTS ---
readonly PROJECT_ID="<GCP-PROJECT-ID>"
readonly REGION="<GCP-REGION>"
readonly ZONE="<GCP-ZONE>"
readonly CLUSTER_NAME="<CLUSTER-NAME>"
readonly MACHINE_TYPE="e2-medium" # can choose another machine type
readonly MYSQL_INSTANCE_NAME="<MYSQL-INSTANCE-NAME>"
readonly MYSQL_PASSWORD="<MYSQL-PASSWORD>"
readonly MYSQL_DATABASE_NAME="<MYSQL-DB-NAME>"
readonly MYSQL_ROOT_USER="root" # Default root user for MySQL
readonly REDIS_INSTANCE_NAME="<REDIS-INSTANCE-NAME>"
readonly SERVICE_ACCOUNT_CLOUD_PROXY="<SERVICE-ACCOUNT-PROXY-INSTANCE>"
readonly KSA_NAME="task-api-ksa" # Kubernetes Service Account name
readonly SSL_CERTIFICATE_NAME="<SSL-CERTIFICATE-NAME>" # Name of the uploaded SSL certificate
readonly STATIC_IP_NAME="<STATIC-IP-ADDRESS-NAME>"
readonly APP_NAME="task-api"
readonly APP_VERSION_DEV="dev"
readonly APP_VERSION_PROD="prod"
readonly CONTAINER_REGISTRY="gcr.io"
readonly K8S_NAMESPACE_DEFAULT="default"
readonly CLOUD_SQL_PROXY_IMAGE="gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.1.0"
readonly REDIS_IMAGE="redis:6-alpine"
readonly APP_PORT=3000
readonly MYSQL_PORT=3306
readonly REDIS_PORT=6379
readonly SSL_PORT=443
readonly HTTP_PORT=80
readonly NODE_PORT_HTTPS=30443 # Choose an available nodePort
readonly NODE_PORT_HTTP=30080  # Choose an available nodePort for non-HTTPS
readonly REDIS_STORAGE_SIZE="1Gi"
readonly SSL_KEY_FILE="tls.key"
readonly SSL_CERT_FILE="tls.crt"
readonly SSL_CSR_FILE="tls.csr"
readonly SSL_VALIDITY_DAYS=365
readonly HEALTH_CHECK_PATH="/health"
readonly CLOUD_SQL_CONNECTION_STRING="$PROJECT_ID:$REGION:$MYSQL_INSTANCE_NAME"
readonly CORS_CONFIG_FILE="cors-config.json"
readonly CORS_CONFIG_MOUNT_PATH="/app/config"
readonly CLOUD_SQL_CREDENTIALS_SECRET="cloud-sql-key"
readonly CLOUD_SQL_CREDENTIALS_FILE="credentials.json"
readonly CLOUD_SQL_CREDENTIALS_MOUNT_PATH="/secrets"
readonly JWT_SECRET_NAME="jwt-secret"
readonly JWT_REFRESH_SECRET_NAME="jwt-refresh-secret"
readonly MYSQL_SECRET_NAME="mysql-secret"
readonly REDIS_SECRET_NAME="redis-secret"
readonly APP_CONFIG_NAME="app-config"
readonly MIGRATION_SCRIPT="dist/migration.js"
readonly CPU_LIMIT="1"
readonly MEMORY_LIMIT="1Gi"
readonly CPU_REQUEST="100m"
readonly MEMORY_REQUEST_LIGHT="128Mi"
readonly MEMORY_REQUEST_MEDIUM="256Mi"
readonly REDIS_VERSION="redis_7_0"
readonly MYSQL_VERSION="MYSQL_8_0"
readonly DB_TIER="db-g1-small"
readonly REDIS_SIZE=1
readonly REDIS_AUTH_ENABLED="--enable-auth" # Add if you want Redis authentication
readonly ARTIFACT_REPO_LOCATION="us"
readonly ARTIFACT_REPO_NAME="$CONTAINER_REGISTRY"
readonly DOCKER_REPO_URL="$CONTAINER_REGISTRY/$PROJECT_ID/$APP_NAME"
readonly WORKLOAD_POOL="$PROJECT_ID.svc.id.goog"

# Ensure these environment variables are set

export PROJECT_ID="$PROJECT_ID"
export REGION="$REGION"
export ZONE="$ZONE"
export CLUSTER_NAME="$CLUSTER_NAME"
export MACHINE="$MACHINE_TYPE"
export MYSQL_INSTANCE="$MYSQL_INSTANCE_NAME"
export MYSQL_PASSWORD="$MYSQL_PASSWORD"
export MYSQL_DB="$MYSQL_DATABASE_NAME"
export MYSQL_HOST="localhost"  # Leave it as localhost for proxy
export MYSQL_USER="<MYSQL-USER>"
export MONGODB_URI="<MONGODB-URI>"
export REDIS_INSTANCE="$REDIS_INSTANCE_NAME"
export SERVICE_ACCOUNT_CLOUD_PROXY="$SERVICE_ACCOUNT_CLOUD_PROXY"
export SERVICE_ACCOUNT_NAME="$KSA_NAME"
export SSL_CERTIFICATE_NAME="$SSL_CERTIFICATE_NAME"
export STATIC_IP_ADDRESS_NAME="$STATIC_IP_NAME"
```

-----

## Architectural Overview

This deployment leverages several key GCP services orchestrated by Kubernetes on GKE:


![Architecture Diagram](/diagram.svg)

**Explanation of Services:**

  * **Google Kubernetes Engine (GKE):** A managed Kubernetes service providing the environment to run and orchestrate the Task Management API containers.
  * **Cloud SQL (MySQL):** A fully managed relational database service for storing persistent application data (e.g., user accounts, tasks). We chose MySQL for its reliability and widespread use.
  * **Cloud Memorystore (Redis):** A fully managed in-memory data store service used for caching, session management, or as a message broker. Redis offers high performance and low latency, improving application responsiveness.
  * **GKE Ingress with Cloud Load Balancer:** An Ingress resource in Kubernetes exposes HTTP and HTTPS routes from outside the cluster to services within the cluster. GKE automatically provisions a Cloud Load Balancer to handle external traffic, including SSL termination when configured with an SSL certificate.
  * **Cloud SQL Proxy:** A secure way to connect to your Cloud SQL instance from within your Kubernetes cluster without having to deal with IP whitelisting or network configuration. It establishes an encrypted tunnel.
  * **Kubernetes Secrets:** Used to store sensitive information like database credentials and JWT secrets securely within the Kubernetes cluster.
  * **Kubernetes ConfigMap:** Used to store non-sensitive configuration data for the application, such as database names, hostnames, and environment variables.
  * **Workload Identity:** Allows Kubernetes service accounts in your GKE cluster to act as GCP service accounts, granting them permissions to access GCP resources securely (like Cloud SQL).

**Data Flow:**

1.  A user sends an HTTPS or HTTP request to the application's external IP address.
2.  The Cloud Load Balancer (managed by GKE Ingress) receives the request. For HTTPS, it terminates the SSL connection using the uploaded certificate.
3.  The Load Balancer routes the traffic to the appropriate Kubernetes Service (`task-api-prod`).
4.  The Service distributes the traffic across the running API pods.
5.  The API pods connect to the Cloud SQL database via the Cloud SQL Proxy (listening on `localhost:3306` inside the pod). The proxy securely forwards the connection to the Cloud SQL instance.
6.  The API pods interact with the Cloud Memorystore (Redis) instance using the provided hostname and port.
7.  Kubernetes Secrets and ConfigMaps are mounted as environment variables or files within the API pods, providing necessary configuration.

-----

## Note on Database Migration

The `development` deployment is configured with the environment variable `INITIATE_MIGRATION` set to `true`. This triggers the execution of the `$MIGRATION_SCRIPT` upon successful deployment. The purpose of this script is to facilitate the seamless migration of existing user data from the previous database (MongoDB) to the new Cloud SQL service.

### Key Points:

  - **Purpose**: The migration process ensures that any existing data in MongoDB is transferred to the Cloud SQL database without manual intervention.
  - **Optional**: Running the migration is not mandatory. If you do not need to migrate data, you can disable this feature by updating the `k8s/development/app-deployment.yaml` file.
      - Locate the `INITIATE_MIGRATION` variable and set its value to `false`.
  - **Development-Specific**: The `development` deployment is primarily intended for handling database migrations. If you do not require this functionality, you can skip the `development` deployment entirely and proceed directly with the `production` deployment.

### Recommendation:

If your use case does not involve migrating data from MongoDB to Cloud SQL, it is recommended to ignore the `development` deployment and focus solely on deploying the `production` environment.

For more details on how to configure or disable the migration process, refer to the `k8s/development/app-deployment.yaml` file.

-----

## Setting Up the Environment

1.  **Enable Required APIs**:

    ```bash
    gcloud services enable container.googleapis.com sqladmin.googleapis.com redis.googleapis.com compute.googleapis.com run.googleapis.com iam.googleapis.com artifactregistry.googleapis.com containerregistry.googleapis.com
    ```

2.  **Set Project**:

    ```bash
    gcloud config set project "$PROJECT_ID"
    ```

-----

## Creating the GKE Cluster

1.  **Create the GKE Cluster**:

    ```bash
    gcloud container clusters create "$CLUSTER_NAME" \
        --zone "$ZONE" \
        --num-nodes 3 \
        --machine-type "$MACHINE_TYPE" \
        --workload-pool="$WORKLOAD_POOL"
    ```

2.  **Verify Workload Identity**:

    ```bash
    gcloud container clusters describe "$CLUSTER_NAME" --zone="$ZONE" | grep "workloadPool:"
    ```

3.  **Connect `kubectl` to the Cluster**:

    ```bash
    gcloud container clusters get-credentials "$CLUSTER_NAME" --zone "$ZONE" --project "$PROJECT_ID"
    ```

-----

## Setting Up Cloud SQL (MySQL)

1.  **Create the MySQL Instance**:

    ```bash
    gcloud sql instances create "$MYSQL_INSTANCE_NAME" \
        --database-version="$MYSQL_VERSION" \
        --tier="$DB_TIER" \
        --region="$REGION" \
        --root-password="$MYSQL_PASSWORD"
    ```

2.  **Get the Connection Name**:

    ```bash
    readonly CLOUD_SQL_CONNECTION_NAME=$(gcloud sql instances describe "$MYSQL_INSTANCE_NAME" --format='value(connectionName)')
    echo "$CLOUD_SQL_CONNECTION_NAME"
    ```

3.  **Create the Database**:

    ```bash
    gcloud sql databases create "$MYSQL_DATABASE_NAME" --instance="$MYSQL_INSTANCE_NAME"
    ```

4.  **Create a global static IP**:

    ```bash
    gcloud compute addresses create "$STATIC_IP_NAME" --global
    ```

5.  **Create service account for Cloud SQL**:

    ```bash
    gcloud iam service-accounts create "$SERVICE_ACCOUNT_CLOUD_PROXY"
    ```

6.  **Add IAM roles**:

    ```bash
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SERVICE_ACCOUNT_CLOUD_PROXY@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client"
    ```

7.  **Enable the IAM binding between your Service acc and K8s**:

    ```bash
    gcloud iam service-accounts add-iam-policy-binding \
    --role="roles/iam.workloadIdentityUser" \
    --member="serviceAccount:$PROJECT_ID.svc.id.goog[$K8S_NAMESPACE_DEFAULT/$KSA_NAME]" \
    "$SERVICE_ACCOUNT_CLOUD_PROXY@$PROJECT_ID.iam.gserviceaccount.com"
    ```

8.  **Annotate Service account**:

    ```bash
    kubectl annotate serviceaccount \
    "$KSA_NAME" \
    iam.gke.io/gcp-service-account="$SERVICE_ACCOUNT_CLOUD_PROXY@$PROJECT_ID.iam.gserviceaccount.com"
    ```

9.  **Create and download key**:

    ```bash
    gcloud iam service-accounts keys create key.json \
    --iam-account="$SERVICE_ACCOUNT_CLOUD_PROXY@$PROJECT_ID.iam.gserviceaccount.com"
    ```

10. **Create Kubernetes secret for service account key**:

    ```bash
    kubectl create secret generic "$CLOUD_SQL_CREDENTIALS_SECRET" \
    --from-file="$CLOUD_SQL_CREDENTIALS_FILE"=key.json
    ```

-----

## Setting Up Redis

1.  **Create the Redis Instance**:

    ```bash
    gcloud redis instances create "$REDIS_INSTANCE_NAME" \
        --region="$REGION" \
        --zone="$ZONE" \
        --size="$REDIS_SIZE" \
        --redis-version="$REDIS_VERSION" "$REDIS_AUTH_ENABLED"
    ```

2.  **Get the Redis Auth String (if enabled)**:

    ```bash
    gcloud redis instances get-auth-string "$REDIS_INSTANCE_NAME" --region="$REGION"
    ```

-----

## Building and Pushing Docker Images

1.  **Build the Docker Image**:

    ```bash
    docker build -t "$DOCKER_REPO_URL:$APP_VERSION_DEV" .
    docker build -t "$DOCKER_REPO_URL:$APP_VERSION_PROD" .
    ```

2.  **Create Artifact repo via the console (if you haven't)**:

    ```bash
    gcloud artifacts repositories create "$ARTIFACT_REPO_NAME" \
    --repository-format=docker \
    --location="$ARTIFACT_REPO_LOCATION" \
    --project="$PROJECT_ID"
    ```

3.  **Update IAM policy**:

    ```bash
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
      --member="user:<your-email@example.com>" \
      --role="roles/artifactregistry.writer"

    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
      --member="serviceAccount:$SERVICE_ACCOUNT_CLOUD_PROXY@$PROJECT_ID.iam.gserviceaccount.com" \
      --role="roles/storage.objectViewer"
    ```

4.  **Push the Docker Image to GCR**:

    ```bash
    docker push "$DOCKER_REPO_URL:$APP_VERSION_DEV"
    docker push "$DOCKER_REPO_URL:$APP_VERSION_PROD"
    ```

-----

## Creating Kubernetes Secrets and ConfigMap

```bash
echo -n "<MYSQL_USER>" | base64 > k8s/encoded_mysql_user.txt
echo -n "$MYSQL_PASSWORD" | base64 > k8s/encoded_mysql_password.txt
echo -n "$MYSQL_DATABASE_NAME" | base64 > k8s/encoded_mysql_db.txt
echo -n "<YOUR-JWT-SECRET>" | base64 > k8s/encoded_jwt_secret.txt
echo -n "<YOUR-JWT-REFRESH-SECRET>" | base64 > k8s/encoded_jwt_refresh_secret.txt
echo -n "<YOUR REDIS PASSWORD>" | base64 > k8s/encoded_redis_password.txt

cat > k8s/"$MYSQL_SECRET_NAME".yaml << EOL
apiVersion: v1
kind: Secret
metadata:
  name: "$MYSQL_SECRET_NAME"
type: Opaque
data:
  MYSQL_USER: $(cat k8s/encoded_mysql_user.txt)
  MYSQL_PASSWORD: $(cat k8s/encoded_mysql_password.txt)
EOL

cat > k8s/"$REDIS_SECRET_NAME".yaml << EOL
apiVersion: v1
kind: Secret
metadata:
  name: "$REDIS_SECRET_NAME"
type: Opaque
data:
  REDIS_PASSWORD: $(cat k8s/encoded_redis_password.txt)
EOL

cat > k8s/"$JWT_SECRET_NAME".yaml << EOL
apiVersion: v1
kind: Secret
metadata:
  name: "$JWT_SECRET_NAME"
type: Opaque
data:
  JWT_SECRET: $(cat k8s/encoded_jwt_secret.txt)
  JWT_REFRESH_SECRET: $(cat k8s/encoded_jwt_refresh_secret.txt)
EOL

cat > k8s/"$APP_CONFIG_NAME".yaml << EOL
apiVersion: v1
kind: ConfigMap
metadata:
  name: "$APP_CONFIG_NAME"
data:
  NODE_ENV: "production"
  MYSQL_HOST: "cloud-sql-proxy"
  MYSQL_DB: "$MYSQL_DATABASE_NAME"
  MYSQL_PORT: "$MYSQL_PORT"
  REDIS_HOST: "$(gcloud redis instances describe "$REDIS_INSTANCE_NAME" --region="$REGION" --format='value(host)')"
  REDIS_PORT: "$REDIS_PORT"
  GOOGLE_REDIS_URL: "$(gcloud redis instances describe "$REDIS_INSTANCE_NAME" --region="$REGION" --format='value(host)')"
  INITIATE_MIGRATION: "false"
  REDIS_USERNAME: "default"
  CLOUD_SQL_CONNECTION_NAME: "$CLOUD_SQL_CONNECTION_STRING"
  DOMAIN_URL: "https://$(gcloud compute addresses describe "$STATIC_IP_NAME" --global --format='value(address)')"
  MONGODB_URI: "$MONGODB_URI"
  "$CORS_CONFIG_FILE": |
    {
      "allowedOrigins": [
        "http://localhost:3000",
        "http://localhost:8080",
        "https://task-management-scsb.onrender.com",
        "http://$(gcloud compute addresses describe "$STATIC_IP_NAME" --global --format='value(address)')",
        "https://$(gcloud compute addresses describe "$STATIC_IP_NAME" --global --format='value(address)')"
      ]
    }
EOL

kubectl apply -f k8s/"$MYSQL_SECRET_NAME".yaml
kubectl apply -f k8s/"$REDIS_SECRET_NAME".yaml
kubectl apply -f k8s/"$JWT_SECRET_NAME".yaml
kubectl apply -f k8s/"$APP_CONFIG_NAME".yaml
```

-----

## Generating and Uploading Self-Signed SSL Certificate

1.  **Generate Private Key**:

    ```bash
    openssl genrsa -out "$SSL_KEY_FILE" 2048
    ```

2.  **Generate Certificate Signing Request (CSR)**:

    ```bash
    readonly INGRESS_IP=$(gcloud compute addresses describe "$STATIC_IP_NAME" --global --format='value(address)')
    openssl req -new -key "$SSL_KEY_FILE" -out "$SSL_CSR_FILE" -subj "/CN=$INGRESS_IP"
    ```

3.  **Generate Self-Signed Certificate**:

    ```bash
    openssl x509 -req -days "$SSL_VALIDITY_DAYS" -in "$SSL_CSR_FILE" -signkey "$SSL_KEY_FILE" -out "$SSL_CERT_FILE"
    ```

4.  **Upload the Certificate to GCP**:

    ```bash
    gcloud compute ssl-certificates create "$SSL_CERTIFICATE_NAME" \
      --certificate="$SSL_CERT_FILE" \
      --private-key="$SSL_KEY_FILE"
    ```

-----

## Configuring Kubernetes Manifests for HTTPS

```bash
cat > k8s/production/app-service.yaml << EOL
apiVersion: v1
kind: Service
metadata:
  name: "$APP_NAME"-"$APP_VERSION_PROD"
spec:
  type: NodePort
  ports:
    - name: https
      port: "$SSL_PORT"
      targetPort: "$APP_PORT"
      nodePort: "$NODE_PORT_HTTPS"
    - name: http
      port: "$HTTP_PORT"
      targetPort: "$APP_PORT"
      nodePort: "$NODE_PORT_HTTP"
  selector:
    app: "$APP_NAME"
    env: "$APP_VERSION_PROD"
EOL

cat > k8s/production/app-ingress.yaml << EOL
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: "$APP_NAME"-ingress
  annotations:
    kubernetes.io/ingress.class: "gce"
    kubernetes.io/ingress.global-static-ip-name: "$STATIC_IP_NAME"
    ingress.gcp.kubernetes.io/pre-shared-cert: "$SSL_CERTIFICATE_NAME"
spec:
  defaultBackend:
    service:
      name: "$APP_NAME"-"$APP_VERSION_PROD"
      port:
        number: "$SSL_PORT"
EOL

cat > k8s/cloudsql-serviceaccount.yaml << EOL
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cloud-sql-service-account
EOL

cat > k8s/production/app-deployment.yaml << EOL
apiVersion: apps/v1
kind: Deployment
metadata:
  name: "$APP_NAME"-"$APP_VERSION_PROD"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: "$APP_NAME"
      env: "$APP_VERSION_PROD"
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    metadata:
      labels:
        app: "$APP_NAME"
        env: "$APP_VERSION_PROD"
    spec:
      serviceAccountName: "$KSA_NAME"
      containers:
      - name: "$APP_NAME"
        image: "$DOCKER_REPO_URL":"$APP_VERSION_PROD"
        imagePullPolicy: Always
        ports:
        - containerPort: "$APP_PORT"
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: "$APP_CONFIG_NAME"
              key: NODE_ENV
        - name: DB_HOST
          value: "127.0.0.1"
        - name: DB_PORT
          value: "$MYSQL_PORT"
        - name: DOMAIN_URL
          valueFrom:
            configMapKeyRef:
              name: "$APP_CONFIG_NAME"
              key: DOMAIN_URL
        - name: DB_NAME
          valueFrom:
            configMapKeyRef:
              name: "$APP_CONFIG_NAME"
              key: MYSQL_DB
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: "$MYSQL_SECRET_NAME"
              key: MYSQL_USER
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: "$MYSQL_SECRET_NAME"
              key: MYSQL_PASSWORD
        - name: REDIS_HOST
          valueFrom:
            configMapKeyRef:
              name: "$APP_CONFIG_NAME"
              key: REDIS_HOST
        - name: GOOGLE_REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: "$APP_CONFIG_NAME"
              key: GOOGLE_REDIS_URL
        - name: REDIS_USERNAME
          valueFrom:
            configMapKeyRef:
              name: "$APP_CONFIG_NAME"
              key: REDIS_USERNAME
        - name: REDIS_PORT
          valueFrom:
            configMapKeyRef:
              name: "$APP_CONFIG_NAME"
              key: REDIS_PORT
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: "$REDIS_SECRET_NAME"
              key: REDIS_PASSWORD
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: "$JWT_SECRET_NAME"
              key: JWT_SECRET
        - name: JWT_REFRESH_SECRET
          valueFrom:
            secretKeyRef:
              name: "$JWT_SECRET_NAME"
              key: "JWT_REFRESH_SECRET"
        - name: ALLOWED_ORIGINS_CONFIG_PATH
          value: "$CORS_CONFIG_MOUNT_PATH"/"$CORS_CONFIG_FILE"
        volumeMounts:
        - name: cors-config-volume
          mountPath: "$CORS_CONFIG_MOUNT_PATH"
          readOnly: true
        resources:
          limits:
            cpu: "$CPU_LIMIT"
            memory: "$MEMORY_LIMIT"
          requests:
            cpu: "$CPU_REQUEST"
            memory: "$MEMORY_REQUEST_LIGHT"
        readinessProbe:
          httpGet:
            path: "$HEALTH_CHECK_PATH"
            port: "$APP_PORT"
          initialDelaySeconds: 10
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: "$HEALTH_CHECK_PATH"
            port: "$APP_PORT"
          initialDelaySeconds: 30
          periodSeconds: 20
      - name: cloud-sql-proxy
        image: "$CLOUD_SQL_PROXY_IMAGE"
        args:
          - "--structured-logs"
          - "--address=0.0.0.0"
          - "--port=$MYSQL_PORT"
          - "$CLOUD_SQL_CONNECTION_STRING"
          - "--credentials-file=$CLOUD_SQL_CREDENTIALS_MOUNT_PATH"/"$CLOUD_SQL_CREDENTIALS_FILE"
        ports:
        - containerPort: "$MYSQL_PORT"
        resources:
          requests:
            cpu: "$CPU_REQUEST"
            memory: "$MEMORY_REQUEST_LIGHT"
        volumeMounts:
        - name: cloud-sql-key
          mountPath: "$CLOUD_SQL_CREDENTIALS_MOUNT_PATH"
          readOnly: true
      volumes:
      - name: cloud-sql-key
        secret:
          secretName: "$CLOUD_SQL_CREDENTIALS_SECRET"
      - name: cors-config-volume
        configMap:
          name: "$APP_CONFIG_NAME"
          items:
            - key: "$CORS_CONFIG_FILE"
              path: "$CORS_CONFIG_FILE"
EOL

cat > k8s/redis-service.yaml << EOL
apiVersion: v1
kind: Service
metadata:
  name: redis-service
spec:
  type: ClusterIP
  ports:
  - port: "$REDIS_PORT"
    targetPort: "$REDIS_PORT"
  selector:
    app: redis
EOL

cat > k8s/redis-deployment.yaml << EOL
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
        image: "$REDIS_IMAGE"
        ports:
        - containerPort: "$REDIS_PORT"
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: "$REDIS_SECRET_NAME"
              key: REDIS_PASSWORD
        resources:
          limits:
            cpu: "300m"
            memory: "512Mi"
          requests:
            cpu: "$CPU_REQUEST"
            memory: "$MEMORY_REQUEST_MEDIUM"
        volumeMounts:
        - name: redis-data
          mountPath: /data
      volumes:
      - name: redis-data
        persistentVolumeClaim:
          claimName: redis-data
EOL

cat > k8s/redis-pvc.yaml << EOL
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: "$REDIS_STORAGE_SIZE"
EOL

cat > k8s/development/app-service.yaml << EOL
apiVersion: v1
kind: Service
metadata:
  name: "$APP_NAME"-"$APP_VERSION_DEV"
spec:
  type: NodePort
  ports:
  - port: "$APP_PORT"
    targetPort: "$APP_PORT"
    nodePort: 30000
  selector:
    app: "$APP_NAME"
    env: "$APP_VERSION_DEV"
EOL

cat > k8s/development/app-deployment.yaml << EOL
apiVersion: apps/v1
kind: Deployment
metadata:
  name: "$APP_NAME"-"$APP_VERSION_DEV"
spec:
  replicas: 2
  selector:
    matchLabels:
      app: "$APP_NAME"
      env: "$APP_VERSION_DEV"
  template:
    metadata:
      labels:
        app: "$APP_NAME"
        env: "$APP_VERSION_DEV"
    spec:
      serviceAccountName: "$KSA_NAME"
      containers:
      - name: "$APP_NAME"
        image: "$DOCKER_REPO_URL":"$APP_VERSION_DEV"
        imagePullPolicy: Always
        ports:
        - containerPort: "$APP_PORT"
        env:
        - name: NODE_ENV
          value: "development"
        - name: DB_HOST
          value: "127.0.0.1"
        - name: DB_PORT
          value: "$MYSQL_PORT"
        - name: DOMAIN_URL
          value: "localhost"
        - name: MONGODB_URI
          valueFrom:
            configMapKeyRef:
              name: "$APP_CONFIG_NAME"
              key: MONGODB_URI
        - name: DB_NAME
          valueFrom:
            configMapKeyRef:
              name: "$APP_CONFIG_NAME"
              key: MYSQL_DB
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: "$MYSQL_SECRET_NAME"
              key: MYSQL_USER
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: "$MYSQL_SECRET_NAME"
              key: MYSQL_PASSWORD
        - name: REDIS_HOST
          valueFrom:
            configMapKeyRef:
              name: "$APP_CONFIG_NAME"
              key: REDIS_HOST
        - name: GOOGLE_REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: "$APP_CONFIG_NAME"
              key: GOOGLE_REDIS_URL
        - name: REDIS_USERNAME
          valueFrom:
            configMapKeyRef:
              name: "$APP_CONFIG_NAME"
              key: REDIS_USERNAME
        - name: REDIS_PORT
          valueFrom:
            configMapKeyRef:
              name: "$APP_CONFIG_NAME"
              key: REDIS_PORT
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: "$REDIS_SECRET_NAME"
              key: REDIS_PASSWORD
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: "$JWT_SECRET_NAME"
              key: JWT_SECRET
        - name: JWT_REFRESH_SECRET
          valueFrom:
            secretKeyRef:
              name: "$JWT_SECRET_NAME"
              key: "JWT_REFRESH_SECRET"
        - name: INITIATE_MIGRATION
          value: "false" # change to true if you want to initate migration
        - name: ALLOWED_ORIGINS_CONFIG_PATH
          value: "$CORS_CONFIG_MOUNT_PATH"/"$CORS_CONFIG_FILE"
        volumeMounts:
        - name: cors-config-volume
          mountPath: "$CORS_CONFIG_MOUNT_PATH"
          readOnly: true
        resources:
          limits:
            cpu: "$CPU_LIMIT"
            memory: "$MEMORY_LIMIT"
          requests:
            cpu: "$CPU_REQUEST"
            memory: "$MEMORY_REQUEST_LIGHT"
        readinessProbe:
          httpGet:
            path: "$HEALTH_CHECK_PATH"
            port: "$APP_PORT"
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: "$HEALTH_CHECK_PATH"
            port: "$APP_PORT"
          initialDelaySeconds: 15
          periodSeconds: 20
      - name: cloud-sql-proxy
        image: "$CLOUD_SQL_PROXY_IMAGE"
        args:
          - "--structured-logs"
          - "--address=0.0.0.0"
          - "--port=$MYSQL_PORT"
          - "$CLOUD_SQL_CONNECTION_STRING"
          - "--credentials-file=$CLOUD_SQL_CREDENTIALS_MOUNT_PATH"/"$CLOUD_SQL_CREDENTIALS_FILE"
        ports:
        - containerPort: "$MYSQL_PORT"
        resources:
          requests:
            cpu: "$CPU_REQUEST"
            memory: "$MEMORY_REQUEST_LIGHT"
        volumeMounts:
        - name: cloud-sql-key
          mountPath: "$CLOUD_SQL_CREDENTIALS_MOUNT_PATH"
          readOnly: true
      volumes:
      - name: cloud-sql-key
        secret:
          secretName: "$CLOUD_SQL_CREDENTIALS_SECRET"
      - name: cors-config-volume
        configMap:
          name: "$APP_CONFIG_NAME"
          items:
            - key: "$CORS_CONFIG_FILE"
              path: "$CORS_CONFIG_FILE"
EOL
```

## Deploying to Kubernetes

1.  **Apply Service Account and Role Binding**:

    ```bash
    kubectl apply -f k8s/cloudsql-serviceaccount.yaml
    kubectl create clusterrolebinding cloud-sql-admin \
      --clusterrole=cluster-admin \
      --serviceaccount="$K8S_NAMESPACE_DEFAULT":"$KSA_NAME"
    ```

2.  **Deploy Redis**:

    ```bash
    kubectl apply -f k8s/redis-service.yaml
    kubectl apply -f k8s/redis-deployment.yaml
    kubectl apply -f k8s/redis-pvc.yaml
    ```

3.  **Deploy Development Environment**:

    ```bash
    kubectl apply -f k8s/development/app-deployment.yaml
    kubectl apply -f k8s/development/app-service.yaml
    ```

4.  **Deploy Production Environment**:

    ```bash
    kubectl apply -f k8s/production/app-deployment.yaml
    kubectl apply -f k8s/production/app-ingress.yaml
    kubectl apply -f k8s/production/app-service.yaml
    ```

-----

## 12. Testing the HTTPS Deployment

1.  **Get the Static IP Address**:

    ```bash
    readonly INGRESS_IP=$(gcloud compute addresses describe "$STATIC_IP_NAME" --global --format='value(address)')
    echo "$INGRESS_IP"
    ```

2.  **Access Your Application via HTTPS**:
    Open your web browser and navigate to `https://$INGRESS_IP`.

    **Important Note on Self-Signed Certificates:** Because you are using a self-signed certificate, your browser will likely display a warning message indicating that the connection is not secure. This is expected. You will need to manually proceed or add an exception in your browser to access the site. This is generally **not recommended for production environments** as it requires users to bypass security warnings. For a production setup, you should obtain a certificate from a trusted Certificate Authority (CA) as discussed earlier in the general README.

3.  **Test the Health Endpoint over HTTPS**:

    ```bash
    curl -k https://"$INGRESS_IP"/"$HEALTH_CHECK_PATH"
    ```
    The `-k` flag tells `curl` to ignore certificate errors, which is necessary for self-signed certificates.

-----

## 13. Set up monitoring

1.  **Enable Cloud Monitoring API**:

    ```bash
    gcloud services enable monitoring.googleapis.com
    ```

2.  **Create a GKE dashboard**:

    ```bash
    gcloud container clusters update "$CLUSTER_NAME" \
    --zone "$ZONE" \
    --monitoring=monitoring.googleapis.com/kubernetes \
    --logging=logging.googleapis.com/kubernetes
    ```

-----

## 14. Debugging and Troubleshooting

1.  **Check Pod Status**:

    ```bash
    kubectl get pods
    ```
    Ensure all pods are in a `Running` and `Ready` state.

2.  **Check Deployment Status**:

    ```bash
    kubectl get deployments
    ```
    Ensure all deployments have the desired number of ready replicas.

3.  **Check Service Status**:

    ```bash
    kubectl get services
    ```
    Verify the `"$APP_NAME"-"$APP_VERSION_PROD"` service has the correct NodePort (e.g., `"$NODE_PORT_HTTPS"` for HTTPS and `"$NODE_PORT_HTTP"` for HTTP).

4.  **Check Ingress Status**:

    ```bash
    kubectl describe ingress "$APP_NAME"-ingress
    ```
    Look for any errors or issues reported by the Ingress controller. Ensure the correct SSL certificate (`"$SSL_CERTIFICATE_NAME"`) is associated.

5.  **Check Pod Logs**:

    ```bash
    kubectl logs deployment/"$APP_NAME"-"$APP_VERSION_PROD" --all-containers=true -f
    kubectl logs deployment/cloud-sql-proxy -f
    kubectl logs deployment/redis -f
    ```
    Examine the logs of your application containers and the Cloud SQL Proxy for any errors.

6.  **Restart Deployments**:

    ```bash
    kubectl rollout restart deployment "$APP_NAME"-"$APP_VERSION_DEV"
    kubectl rollout restart deployment "$APP_NAME"-"$APP_VERSION_PROD"
    kubectl rollout restart deployment cloud-sql-proxy
    kubectl rollout restart deployment redis
    ```

-----

## 15. Updating the Deployment

1.  **Rebuild and Push Docker Image**:

    ```bash
    docker build -t "$DOCKER_REPO_URL":"$APP_VERSION_PROD" .
    docker push "$DOCKER_REPO_URL":"$APP_VERSION_PROD"
    ```

2.  **Apply Updated Kubernetes Manifests (if changes were made)**:

    ```bash
    kubectl apply -f k8s/production/app-deployment.yaml
    kubectl apply -f k8s/production/app-ingress.yaml
    kubectl apply -f k8s/production/app-service.yaml
    # Apply other modified manifests as needed
    ```

3.  **Restart Deployment**:

    ```bash
    kubectl rollout restart deployment "$APP_NAME"-"$APP_VERSION_PROD"
    ```

-----

## 16. Cleanup

1.  **Delete Kubernetes Deployments and Services**:

    ```bash
    kubectl delete -f k8s/development/
    kubectl delete -f k8s/production/
    kubectl delete -f k8s/redis-deployment.yaml
    kubectl delete -f k8s/redis-service.yaml
    kubectl delete -f k8s/redis-pvc.yaml
    kubectl delete -f k8s/cloudsql-serviceaccount.yaml
    kubectl delete -f k8s/"$JWT_SECRET_NAME".yaml
    kubectl delete -f k8s/"$APP_CONFIG_NAME".yaml
    kubectl delete -f k8s/"$MYSQL_SECRET_NAME".yaml
    kubectl delete -f k8s/"$REDIS_SECRET_NAME".yaml
    ```

2.  **Delete the GKE Cluster**:

    ```bash
    gcloud container clusters delete "$CLUSTER_NAME" --zone="$ZONE"
    ```

3.  **Delete Cloud SQL and Redis Instances**:

    ```bash
    gcloud sql instances delete "$MYSQL_INSTANCE_NAME"
    gcloud redis instances delete "$REDIS_INSTANCE_NAME" --region="$REGION"
    ```

4.  **Delete the Global Static IP Address**:

    ```bash
    gcloud compute addresses delete "$STATIC_IP_NAME" --global
    ```

5.  **Delete the Self-Signed SSL Certificate**:

    ```bash
    gcloud compute ssl-certificates delete "$SSL_CERTIFICATE_NAME"
    ```

-----

By following this refined guide, you can deploy and manage the **Task Management API** on GKE with self-signed HTTPS in a more organized and efficient manner, leveraging constants for better maintainability. Remember to replace the placeholder values in the constants with your actual GCP project details.