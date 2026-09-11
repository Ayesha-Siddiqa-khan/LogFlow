# LogFlow - Observability & DevOps Platform

LogFlow is a lightweight, multi-service platform built for practicing DevOps, centralized logging, containerization, Infrastructure as Code (Terraform), Kubernetes deployment, CI/CD pipelines, and incident troubleshooting.

---

## 1. Project Overview

Modern cloud architectures distribute microservices across containers and clusters. LogFlow demonstrates how to generate structured logs, ingest them centrally, visualize service health and log streams in real-time, and diagnose controlled failure scenarios.

### Core Components
- **`payments-api`**: Payment processing REST service producing transaction logs and health checks (port `3001`).
- **`web-api`**: Frontend-facing API handling item catalog queries and simulated errors (port `3002`).
- **`worker`**: Background queue worker running periodic task batches with latency reporting (port `3003`).
- **`dashboard`**: Centralized log store and real-time observability console with live search, filters, and chaos testing triggers (port `3000`).

---

## 2. Architecture

```text
                                GitHub Repository
                                       |
                                       v
                               GitHub Actions CI/CD
                     (Test -> Build -> Push -> Deploy -> Verify)
                                       |
                         +-------------+-------------+
                         |                           |
                         v                           v
                    Amazon ECR                 AWS Infrastructure
             (4 Container Repositories)      (VPC, Subnets, SG, IAM)
                         |                           |
                         +-------------+-------------+
                                       |
                                       v
                             Kubernetes Cluster
                  +--------------------+--------------------+
                  |                    |                    |
                  v                    v                    v
            payments-api            web-api               worker
             (2 Pods)               (2 Pods)             (2 Pods)
                  |                    |                    |
                  +--------------------+--------------------+
                                       |
                                       | (HTTP Structured Logs / Stdout)
                                       v
                           LogFlow Central Dashboard
                         (Central Log Ingest & Web UI)
                                  Port 3000
```

---

## 3. Local Setup

### Prerequisites
- **Node.js** v18+ installed
- **Docker** and **Docker Compose** installed
- **kubectl** (optional for Kubernetes deployment)

### Running Standalone (Without Docker)

You can run each service directly with Node.js:

```bash
# Terminal 1 - Start Central Dashboard & Log Store
cd dashboard
npm start

# Terminal 2 - Start Payments API
cd services/payments-api
npm start

# Terminal 3 - Start Web API
cd services/web-api
npm start

# Terminal 4 - Start Background Worker
cd services/worker
npm start
```

Visit the dashboard at [http://localhost:3000](http://localhost:3000).

---

## 4. Docker Commands

### Running with Docker Compose (Recommended)

Run the entire multi-service stack with a single command:

```bash
# Build and start all 4 services in the background
docker compose up --build -d

# View consolidated logs from all containers
docker compose logs -f

# Check running container statuses and health
docker compose ps

# Stop all services
docker compose down
```

### Building Individual Docker Images

```bash
# Payments API
docker build -t logflow-payments-api:latest ./services/payments-api

# Web API
docker build -t logflow-web-api:latest ./services/web-api

# Worker
docker build -t logflow-worker:latest ./services/worker

# Dashboard
docker build -t logflow-dashboard:latest ./dashboard
```

---

## 5. AWS Setup

### Prerequisites
1. An AWS account with administrative or DevOps permissions.
2. AWS CLI configured locally:
   ```bash
   aws configure
   ```

### Cost Guardrails & Free-Tier Design
- **No NAT Gateways**: Saves ~$32/month per gateway by using public subnets with direct Internet Gateway routing.
- **ECR Lifecycle Policies**: Automatically retains only the 5 most recent tagged images and deletes untagged images after 7 days to eliminate storage charges.
- **CloudWatch Retention**: Capped at 7 days to avoid log storage costs.
- **Instance Types**: Sized for `t3.micro` or lightweight single-node compute.

---



## 7. Kubernetes Deployment

LogFlow includes Kubernetes manifests in the `k8s/` directory configured with 2 replicas, rolling update strategy, resource requests/limits, and liveness/readiness probes.

### Deploying to Kubernetes

```bash
# 1. Create the dedicated namespace
kubectl apply -f k8s/namespace.yaml

# 2. Deploy Payments API (Deployment, Service, ConfigMap)
kubectl apply -f k8s/payments-api/

# 3. Deploy Web API
kubectl apply -f k8s/web-api/

# 4. Deploy Background Worker
kubectl apply -f k8s/worker/

# 5. Deploy Dashboard & Log Ingestion Service
kubectl apply -f k8s/dashboard/

# 6. Verify deployment rollouts
kubectl rollout status deployment/payments-api -n logflow
kubectl rollout status deployment/web-api -n logflow
kubectl rollout status deployment/worker -n logflow
kubectl rollout status deployment/dashboard -n logflow
```

### Accessing the Dashboard in Kubernetes

```bash
kubectl port-forward svc/dashboard 3000:3000 -n logflow
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 8. CI/CD Workflow (GitHub Actions)

The repository includes an automated pipeline in `.github/workflows/ci-cd.yml`:

```text
Push to main branch
       |
       v
[Stage 1: Unit Tests] (payments-api, web-api, worker, dashboard)
       |
       v
[Stage 2: Build Docker Images] (Matrix build for all 4 services)
       |
       v
[Stage 3: Push to Amazon ECR] (Tagged with commit SHA and :latest)
       |
       v
[Stage 4: Deploy to Kubernetes] (kubectl apply)
       |
       v
[Stage 5: Verify Rollout] (kubectl rollout status)
```

### Required GitHub Secrets
Configure these in **GitHub Repository -> Settings -> Secrets and variables -> Actions**:
- `AWS_ACCESS_KEY_ID`: AWS IAM access key with ECR and EKS permissions.
- `AWS_SECRET_ACCESS_KEY`: AWS IAM secret key.
- `AWS_REGION`: AWS region (e.g. `us-east-1`).
- `KUBECONFIG_DATA`: Base64-encoded `kubeconfig` for target cluster (`cat ~/.kube/config | base64 -w 0`).

---

## 9. Centralized Logging Architecture

LogFlow implements structured logging compliant with Twelve-Factor App principles:

1. **Standardized JSON Schema**:
   ```json
   {
     "timestamp": "2026-09-12T10:30:00.000Z",
     "service": "payments-api",
     "level": "INFO",
     "message": "payment processed successfully [id: pay_7x9k2p]",
     "metadata": { "amount": 120, "currency": "USD" }
   }
   ```
2. **Dual-Path Ingestion**:
   - **Path A (Container / Cluster stdout)**: Written directly to `stdout` for Docker logging drivers, Kubernetes log collectors (FluentBit / Promtail), and AWS CloudWatch Container Insights.
   - **Path B (HTTP Stream)**: Pushed to `LOG_COLLECTOR_URL` (`http://dashboard:3000/api/logs`) for real-time visualization and filtering without requiring external log shippers.

---

## 10. Troubleshooting Steps

When diagnosing issues:
1. **Check Service Health Cards**: Open the dashboard to see if any node is marked `DOWN` or `DEGRADED`.
2. **Filter by Level**: Set Level filter to `ERROR` or `WARN` to view abnormal events.
3. **Inspect Service Logs**: Filter by specific service (e.g., `payments-api`) to isolate the trace.
4. **Inspect Kubernetes Pods**:
   ```bash
   kubectl get pods -n logflow
   kubectl describe pod -l app=payments-api -n logflow
   kubectl logs -l app=payments-api -n logflow --tail=50
   ```

---

## 11. Reproducing Failure Scenarios & Recovery

LogFlow includes automated chaos tools to practice real-world incident response.

### Scenario 1: Service Failure (Crash / Unhealthy)
- **Trigger**:
  - Dashboard UI: Click **"Scenario 1: Fail Payments API"**
  - Or CLI: `pwsh ./scripts/simulate-failures.ps1 -Scenario 1` (or `./scripts/simulate-failures.sh 1`)
- **Symptoms**:
  - `/health` returns HTTP 503.
  - Dashboard health card turns red (`DOWN`).
  - Kubernetes readiness probe fails, taking pod out of service endpoints.
- **Recovery**:
  - Click **"Restore All Services"** or run:
    ```bash
    curl -X POST http://localhost:3001/reset
    ```

### Scenario 2: Application Error Storm
- **Trigger**:
  - Dashboard UI: Click **"Scenario 2: App Error Storm"**
  - Or CLI: `pwsh ./scripts/simulate-failures.ps1 -Scenario 2` (or `./scripts/simulate-failures.sh 2`)
- **Symptoms**:
  - Elevated error rate on dashboard metrics.
  - High volume of `ERROR` logs: `database connection timeout on web-api`.
- **Diagnosis**:
  - Filter by `Level = ERROR` on the dashboard to locate the failing endpoint and stack trace.

### Scenario 3: Degraded Worker (Queue Backpressure)
- **Trigger**:
  - Dashboard UI: Click **"Scenario 3: Degrade Worker"**
  - Or CLI: `pwsh ./scripts/simulate-failures.ps1 -Scenario 3` (or `./scripts/simulate-failures.sh 3`)
- **Symptoms**:
  - Worker status transitions to `DEGRADED`.
  - Periodic `WARN` logs: `queue processing is slow (lag: 4200ms, memory backpressure detected)`.
- **Recovery**:
  - Click **"Restore All Services"** or run:
    ```bash
    curl -X POST http://localhost:3003/reset
    ```
