# Deploying the Task Management API to K8s with Self-Signed HTTPS on GKE

This guide provides step-by-step instructions to deploy the **Task Management API** on Google Cloud Platform (GCP) using Kubernetes (GKE), Cloud SQL, Redis, and secure it with a self-signed HTTPS certificate. The deployment process is divided into logical sections for clarity and ease of use.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Note on Database Migration](#note-on-database-migration)
3. [Setting Up the Environment](#setting-up-the-environment)
4. [Creating the GKE Cluster](#creating-the-gke-cluster)
5. [Setting Up Cloud SQL (MySQL)](#setting-up-cloud-sql-mysql)
6. [Setting Up Redis](#setting-up-redis)
7. [Building and Pushing Docker Images](#building-and-pushing-docker-images)
8. [Creating Kubernetes Secrets](#creating-kubernetes-secrets)
9. [Generating and Uploading Self-Signed SSL Certificate](#generating-and-uploading-self-signed-ssl-certificate)
10. [Configuring Kubernetes Manifests for HTTPS](#configuring-kubernetes-manifests-for-https)
11. [Deploying to Kubernetes](#deploying-to-kubernetes)
12. [Testing the HTTPS Deployment](#testing-the-https-deployment)
13. [Debugging and Troubleshooting](#debugging-and-troubleshooting)
14. [Updating the Deployment](#updating-the-deployment)
15. [Cleanup](#cleanup)

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
export PROJECT_ID="<GCP-PROJECT-ID>"
export REGION="<GCP-REGION>"
export ZONE="<GCP-ZONE>"
export CLUSTER_NAME="<CLUSTER-NAME>"
export MACHINE="e2-medium" # can chose another machine type of choice
export MYSQL_INSTANCE="<MYSQL-INSTANCE-NAME>"
export MYSQL_PASSWORD="<MYSQL-PASSWORD>"
export MYSQL_DB="<MYSQL-DB-NAME>"
export MYSQL_HOST="localhost"  # Leave it as localhost
export MYSQL_USER="<MYSQL-USER>"
export MONGODB_URI="<MONGODB-URI>"
export REDIS_INSTANCE="<REDIS-INSTANCE-NAME>"
export SERVICE_ACCOUNT_CLOUD_PROXY="<SERVICE-ACCOUNT-PROXY-INSTANCE>"
export SERVICE_ACCOUNT_NAME="<SERVICE-ACCOUNT-NAME>"
export SSL_CERTIFICATE_NAME="<SSL-CERTIFICATE-NAME>" # Name of the uploaded SSL certificate
export STATIC_IP_ADDRESS_NAME="<STATIC-IP-ADDRESS-NAME>"
```

-----

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

-----

## Setting Up the Environment

1.  **Enable Required APIs**:

    ```bash
    gcloud services enable container.googleapis.com sqladmin.googleapis.com redis.googleapis.com compute.googleapis.com run.googleapis.com iam.googleapis.com
    ```

2.  **Set Project**:

    ```bash
    gcloud config set project $PROJECT_ID
    ```

-----

## Creating the GKE Cluster

1.  **Create the GKE Cluster**:

    ```bash
    gcloud container clusters create $CLUSTER_NAME \
        --zone $ZONE \
        --num-nodes 3 \
        --machine-type $MACHINE \
        --workload-pool=$PROJECT_ID.svc.id.goog
    ```

2.  **Verify Workload Identity**:

    ```bash
    gcloud container clusters describe $CLUSTER_NAME --zone=$ZONE | grep "workloadPool:"
    ```

3.  **Connect `kubectl` to the Cluster**:

    ```bash
    gcloud container clusters get-credentials $CLUSTER_NAME --zone $ZONE
    ```

-----

## Setting Up Cloud SQL (MySQL)

1.  **Create the MySQL Instance**:

    ```bash
    gcloud sql instances create $MYSQL_INSTANCE \
        --database-version=MYSQL_8_0 \
        --tier=db-g1-small \
        --region=$REGION \
        --root-password=$MYSQL_PASSWORD
    ```

2.  **Get the Connection Name**:

    ```bash
    CLOUD_SQL_CONNECTION_NAME=$(gcloud sql instances describe $MYSQL_INSTANCE --format='value(connectionName)')
    echo $CLOUD_SQL_CONNECTION_NAME
    ```

3.  **Create the Database**:

    ```bash
    gcloud sql databases create $MYSQL_DB --instance=$MYSQL_INSTANCE
    ```

3.  **Create a global static IP**:

    ```bash
    gcloud compute addresses create $STATIC_IP_ADDRESS_NAME --global
    ```

-----

## Setting Up Redis

1.  **Create the Redis Instance**:

    ```bash
    gcloud redis instances create $REDIS_INSTANCE \
        --region=$REGION \
        --zone=$ZONE \
        --size=1 \
        --redis-version=redis_7_0 \
        --enable-auth
    ```

2.  **Get the Redis Auth String**:

    ```bash
    gcloud redis instances get-auth-string $REDIS_INSTANCE --region=$REGION
    ```

-----

## Building and Pushing Docker Images

1.  **Build the Docker Image**:

    ```bash
    docker build -t gcr.io/$PROJECT_ID/task-api:dev .
    docker build -t gcr.io/$PROJECT_ID/task-api:prod .
    ```

2.  **Push the Docker Image to GCR**:

    ```bash
    docker push gcr.io/$PROJECT_ID/task-api:dev
    docker push gcr.io/$PROJECT_ID/task-api:prod
    ```

-----

## Creating Kubernetes Secrets

```bash
echo -n "<MYSQL_USER>" | base64 > k8s/encoded_mysql_user.txt
echo -n "<MYSQL_PASSWORD>" | base64 > k8s/encoded_mysql_password.txt
echo -n "<MYSQL_DB>" | base64 > k8s/encoded_mysql_db.txt
echo -n "<YOUR-JWT-SECRET>" | base64 > k8s/encoded_jwt_secret.txt
echo -n "<YOUR-JWT-REFRESH-SECRET>" | base64 > k8s/encoded_jwt_refresh_secret.txt
echo -n "<YOUR REDIS PASSWORD>" | base64 > k8s/encoded_redis_password.txt

cat > k8s/mysql-secret.yaml << EOL
apiVersion: v1
kind: Secret
metadata:
  name: mysql-secret
type: Opaque
data:
  MYSQL_USER: $(cat k8s/encoded_mysql_user.txt)
  MYSQL_PASSWORD: $(cat k8s/encoded_mysql_password.txt)
EOL

cat > k8s/redis-secret.yaml << EOL
apiVersion: v1
kind: Secret
metadata:
  name: redis-secret
type: Opaque
data:
  REDIS_PASSWORD: $(cat k8s/encoded_redis_password.txt)
EOL

cat > k8s/app-secret.yaml << EOL
apiVersion: v1
kind: Secret
metadata:
  name: app-secret
type: Opaque
data:
  JWT_SECRET: $(cat k8s/encoded_jwt_secret.txt)
  JWT_REFRESH_SECRET: $(cat k8s/encoded_jwt_refresh_secret.txt)
EOL

cat > k8s/app-config.yaml << EOL
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NODE_ENV: "production"
  MYSQL_HOST: "cloud-sql-proxy"
  MYSQL_DB: "taskdb"
  MYSQL_PORT: "3306"
  REDIS_HOST: "$(gcloud redis instances describe $REDIS_INSTANCE --region=$REGION --format='value(host)')"
  REDIS_PORT: "6379"
  GOOGLE_REDIS_URL: "$(gcloud redis instances describe $REDIS_INSTANCE --region=$REGION --format='value(host)')"
  INITIATE_MIGRATION: "false"
  REDIS_USERNAME: "default"
  CLOUD_SQL_CONNECTION_NAME: "$PROJECT_ID:$REGION:$MYSQL_INSTANCE"
  DOMAIN_URL: "http://$(gcloud compute addresses describe $STATIC_IP_ADDRESS_NAME --global --format='value(address)')"
  MONGODB_URI: "$MONGODB_URI"
EOL

kubectl apply -f k8s/mysql-secret.yaml
kubectl apply -f k8s/redis-secret.yaml
kubectl apply -f k8s/app-secret.yaml
kubectl apply -f k8s/app-config.yaml
```

-----

## Generating and Uploading Self-Signed SSL Certificate

1.  **Generate Private Key**:

    ```bash
    openssl genrsa -out tls.key 2048
    ```

2.  **Generate Certificate Signing Request (CSR)**:

    ```bash
    INGRESS_IP=$(gcloud compute addresses describe $STATIC_IP_ADDRESS_NAME --global --format='value(address)')
    openssl req -new -key tls.key -out tls.csr -subj "/CN=$INGRESS_IP"
    ```

3.  **Generate Self-Signed Certificate**:

    ```bash
    openssl x509 -req -days 365 -in tls.csr -signkey tls.key -out tls.crt
    ```

4.  **Upload the Certificate to GCP**:

    ```bash
    gcloud compute ssl-certificates create $SSL_CERTIFICATE_NAME \
      --certificate=tls.crt \
      --private-key=tls.key
    ```

-----

## Configuring Kubernetes Manifests for HTTPS

```bash
cat > k8s/production/app-service.yaml << EOL
apiVersion: v1
kind: Service
metadata:
  name: task-api-prod
spec:
  type: NodePort
  ports:
    - port: 443
      targetPort: 3000
      nodePort: 30443 # Choose an available nodePort
    - port: 80
      targetPort: 3000
      nodePort: 30080 # Choose an available nodePort for non-HTTPS
  selector:
    app: task-api
    env: production
EOL

cat > k8s/production/app-ingress.yaml << EOL
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: task-api-ingress
  annotations:
    kubernetes.io/ingress.class: "gce"
    kubernetes.io/ingress.global-static-ip-name: "$STATIC_IP_ADDRESS_NAME"
    ingress.gcp.kubernetes.io/pre-shared-cert: "$SSL_CERTIFICATE_NAME"
spec:
  defaultBackend:
    service:
      name: task-api-prod
      port:
        number: 443
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

cat > k8s/redis-service.yaml << EOL
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
      storage: 1Gi
EOL

cat > k8s/development/app-service.yaml << EOL
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
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: mysql-secret
        - secretRef:
            name: redis-secret
        - secretRef:
            name: app-secret
        - name: INITIATE_MIGRATION
          value: "false"
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
          - "$PROJECT_ID:$REGION:$MYSQL_INSTANCE"
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
```
## Deploying to Kubernetes

1.  **Apply Service Account and Role Binding**:

    ```bash
    kubectl apply -f k8s/cloudsql-serviceaccount.yaml
    kubectl create clusterrolebinding cloud-sql-admin \
      --clusterrole=cluster-admin \
      --serviceaccount=default:$SERVICE_ACCOUNT_NAME
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
    INGRESS_IP=$(gcloud compute addresses describe $STATIC_IP_ADDRESS_NAME --global --format='value(address)')
    echo $INGRESS_IP
    ```

2.  **Access Your Application via HTTPS**:
    Open your web browser and navigate to `https://$INGRESS_IP`.

    **Important Note on Self-Signed Certificates:** Because you are using a self-signed certificate, your browser will likely display a warning message indicating that the connection is not secure. This is expected. You will need to manually proceed or add an exception in your browser to access the site. This is generally **not recommended for production environments** as it requires users to bypass security warnings. For a production setup, you should obtain a certificate from a trusted Certificate Authority (CA) as discussed earlier in the general README.

3.  **Test the Health Endpoint over HTTPS**:

    ```bash
    curl -k https://$INGRESS_IP/health
    ```
    The `-k` flag tells `curl` to ignore certificate errors, which is necessary for self-signed certificates.

-----

## 13. Debugging and Troubleshooting

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
    Verify the `task-api-prod` service has the correct NodePort (e.g., `30443` for HTTPS and `30080` for HTTP).

4.  **Check Ingress Status**:

    ```bash
    kubectl describe ingress task-api-ingress
    ```
    Look for any errors or issues reported by the Ingress controller. Ensure the correct SSL certificate (`$SSL_CERTIFICATE_NAME`) is associated.

5.  **Check Pod Logs**:

    ```bash
    kubectl logs deployment/task-api-prod --all-containers=true -f
    kubectl logs deployment/cloud-sql-proxy -f
    kubectl logs deployment/redis -f
    ```
    Examine the logs of your application containers and the Cloud SQL Proxy for any errors.

6.  **Restart Deployments**:

    ```bash
    kubectl rollout restart deployment task-api-dev
    kubectl rollout restart deployment task-api-prod
    kubectl rollout restart deployment cloud-sql-proxy
    kubectl rollout restart deployment redis
    ```

-----

## 14. Updating the Deployment

1.  **Rebuild and Push Docker Image**:

    ```bash
    docker build -t gcr.io/$PROJECT_ID/task-api:prod .
    docker push gcr.io/$PROJECT_ID/task-api:prod
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
    kubectl rollout restart deployment task-api-prod
    ```

-----

## 15. Cleanup

1.  **Delete Kubernetes Deployments and Services**:

    ```bash
    kubectl delete -f k8s/development/
    kubectl delete -f k8s/production/
    kubectl delete -f k8s/redis-deployment.yaml
    kubectl delete -f k8s/redis-service.yaml
    kubectl delete -f k8s/redis-pvc.yaml
    kubectl delete -f k8s/cloudsql-deployment.yaml
    kubectl delete -f k8s/cloudsql-service.yaml
    kubectl delete -f k8s/cloudsql-serviceaccount.yaml
    kubectl delete -f k8s/app-secret.yaml
    kubectl delete -f k8s/app-config.yaml
    kubectl delete -f k8s/mysql-secret.yaml
    kubectl delete -f k8s/redis-secret.yaml
    ```

2.  **Delete the GKE Cluster**:

    ```bash
    gcloud container clusters delete $CLUSTER_NAME --zone=$ZONE
    ```

3.  **Delete Cloud SQL and Redis Instances**:

    ```bash
    gcloud sql instances delete $MYSQL_INSTANCE
    gcloud redis instances delete $REDIS_INSTANCE --region=$REGION
    ```

4.  **Delete the Global Static IP Address**:

    ```bash
    gcloud compute addresses delete $STATIC_IP_ADDRESS_NAME --global
    ```

5.  **Delete the Self-Signed SSL Certificate**:

    ```bash
    gcloud compute ssl-certificates delete $SSL_CERTIFICATE_NAME
    ```

-----

By following this guide, you should be able to successfully deploy and manage the **Task Management API** on GKE with self-signed HTTPS. Remember that self-signed certificates are not trusted by default and are generally not suitable for public-facing production environments. For a secure production setup, consider using a trusted Certificate Authority like Let's Encrypt.