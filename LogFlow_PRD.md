# LogFlow - Product Requirements Document (PRD)

## 1. Project Overview

**Project Name:** LogFlow  
**Project Type:** DevOps Practice Project  
**Primary Goal:** Build a small application platform focused on centralized logging, observability, containerization, cloud deployment, CI/CD, Infrastructure as Code, and troubleshooting.

LogFlow is a lightweight platform that runs multiple small services and collects their application logs into one centralized location with a simple dashboard.

The application itself should remain intentionally simple. The main learning objectives are DevOps, deployment, operations, monitoring, and troubleshooting.

---

## 2. Problem Statement

When multiple services run independently, their logs are distributed across containers or servers. Troubleshooting requires checking each service separately.

LogFlow should provide a simple way to:

- Generate logs from multiple services.
- Collect logs centrally.
- View logs from different services in one place.
- Identify errors and unhealthy services.
- Practice diagnosing failures using logs and metrics.

---

## 3. Goals

### Primary Goals

- Build a small multi-service application.
- Containerize all services with Docker.
- Push container images to Amazon ECR.
- Provision infrastructure using Terraform.
- Deploy the application to AWS.
- Create a CI/CD pipeline using GitHub Actions.
- Deploy the services to Kubernetes.
- Centralize application logs.
- Add basic health checks and metrics.
- Practice troubleshooting intentionally introduced failures.

### Learning Goals

The project should help practice:

- Linux
- Git and GitHub
- Docker
- AWS
- Terraform
- GitHub Actions
- Kubernetes
- Logging
- Monitoring
- Troubleshooting
- Basic cloud security

---

## 4. Non-Goals

The project should NOT become a large production application.

Do not add:

- Complex authentication.
- Payments.
- Large databases.
- Social features.
- Advanced business logic.
- Unnecessary frontend features.
- A complicated microservices architecture.

The application should stay small so that the majority of the work remains focused on DevOps.

---

## 5. Proposed Architecture

```text
                         GitHub
                            |
                            v
                     GitHub Actions
                            |
                   Build & Test Docker
                            |
                            v
                         Amazon ECR
                            |
                            v
                       Kubernetes
                +-----------+-----------+
                |           |           |
                v           v           v
          payments-api   web-api      worker
                |           |           |
                +-----------+-----------+
                            |
                            v
                     Log Collector
                            |
                            v
                    Central Log Store
                            |
                            v
                       Dashboard
```

---

## 6. Application Components

### 6.1 Payments API

A small API that exposes:

- Health endpoint.
- Basic status endpoint.
- An endpoint that generates normal logs.
- An endpoint or mechanism that can generate error logs for troubleshooting practice.

Example log:

```text
INFO payments-api payment processed successfully
```

Example error:

```text
ERROR payments-api payment processing failed
```

### 6.2 Web API

A simple service that:

- Responds to HTTP requests.
- Provides a health endpoint.
- Generates normal application logs.
- Can generate warning/error logs.

### 6.3 Worker

A background-style service that:

- Performs a simple repeated task.
- Writes logs periodically.
- Reports its status.
- Can simulate a degraded condition.

---

## 7. Logging Requirements

Every service should produce structured or consistently formatted logs.

Each log should contain, where practical:

- Timestamp
- Service name
- Log level
- Message

Example:

```text
2026-09-12T10:30:00Z payments-api INFO payment processed
2026-09-12T10:30:05Z worker WARN queue processing is slow
2026-09-12T10:30:10Z web-api ERROR request failed
```

The system should make it possible to identify which service generated each log.

---

## 8. Centralized Logging

The project should collect logs from the different services into a central logging system.

The exact logging stack can be selected during implementation based on the deployment environment and simplicity.

The solution should support:

- Collecting logs from multiple containers/pods.
- Searching or filtering logs.
- Identifying the originating service.
- Viewing error and warning logs.
- Basic troubleshooting.

---

## 9. Dashboard Requirements

Create a simple dashboard that displays:

- Service status.
- Recent logs.
- Error count or error entries.
- Basic health information.

Example:

```text
LogFlow Dashboard

Services
--------------------------------
payments-api    Healthy
web-api         Healthy
worker          Degraded

Recent Logs
--------------------------------
INFO  payments-api  Payment processed
WARN  worker        Queue processing slow
ERROR web-api       Request failed
```

The dashboard does not need to be visually complex.

---

## 10. Docker Requirements

Each application service must have a Dockerfile.

Requirements:

- Use appropriate lightweight base images.
- Keep images reasonably small.
- Use environment variables where appropriate.
- Expose only required ports.
- Do not hard-code secrets.
- Provide a local development method for running all services.

The project should support testing the services locally before AWS deployment.

---

## 11. AWS Requirements

Use AWS for the cloud deployment.

The project should practice:

- VPC
- Subnets
- Security Groups
- IAM
- EC2 or Kubernetes infrastructure as appropriate
- Amazon ECR
- CloudWatch where useful

Avoid unnecessary paid AWS resources.

The implementation should prioritize free-tier-friendly or low-cost resources where practical.

---

## 12. Terraform Requirements

Terraform should manage the infrastructure instead of creating infrastructure manually.

Terraform should include:

- Provider configuration.
- Variables.
- Outputs.
- Reusable resource definitions.
- Environment configuration where appropriate.

The Terraform code should be organized clearly so that another developer can understand and modify it.

---

## 13. Kubernetes Requirements

Deploy the services to Kubernetes.

Required concepts:

- Deployments
- Services
- ConfigMaps where needed
- Secrets where needed
- Multiple replicas
- Resource requests/limits
- Liveness probes
- Readiness probes
- Rolling updates

Example:

```text
payments-api
  replicas: 2

web-api
  replicas: 2

worker
  replicas: 2
```

The exact replica counts may be adjusted based on available resources.

---

## 14. CI/CD Requirements

Use GitHub Actions.

Pipeline stages should include:

```text
Push to GitHub
      |
      v
Run Tests
      |
      v
Build Docker Images
      |
      v
Push Images to Amazon ECR
      |
      v
Deploy / Update Kubernetes
      |
      v
Verify Deployment
```

The pipeline should fail when tests or required build steps fail.

Secrets and credentials must be handled securely through GitHub/AWS configuration rather than committed to the repository.

---

## 15. Health Checks

Every service should expose a health endpoint where applicable.

Example:

```text
GET /health
```

Expected response:

```json
{
  "status": "healthy"
}
```

Kubernetes should use appropriate readiness and liveness probes.

---

## 16. Monitoring

Add basic monitoring for:

- Pod/service availability.
- CPU usage.
- Memory usage.
- Restart counts.
- Application errors.
- Basic request/service health.

The monitoring solution should remain simple enough for a DevOps practice project.

---

## 17. Failure Simulation

A major learning objective is troubleshooting.

The project should intentionally support controlled failure scenarios.

Examples:

### Scenario 1 - Service Failure

Stop or break one service.

Expected task:

```text
Identify the unhealthy service
        ↓
Check Kubernetes status
        ↓
Check logs
        ↓
Find the error
        ↓
Fix the problem
        ↓
Verify recovery
```

### Scenario 2 - Application Error

Generate repeated application errors.

Expected task:

- Find the service producing errors.
- Search centralized logs.
- Identify the cause.
- Fix the issue.
- Verify that error logs stop.

### Scenario 3 - Degraded Worker

Make the worker process slower than normal.

Expected task:

- Detect the degraded service.
- Inspect logs and resource usage.
- Identify the problem.
- Restore normal operation.

---

## 18. Security Requirements

- Never commit AWS credentials.
- Never commit API keys or secrets.
- Use environment variables or secret management.
- Apply least-privilege IAM permissions where practical.
- Expose only required network ports.
- Do not make internal services publicly accessible unless required.

---

## 19. Repository Structure

A suggested structure:

```text
logflow/
│
├── services/
│   ├── payments-api/
│   ├── web-api/
│   └── worker/
│
├── dashboard/
│
├── docker/
│
├── k8s/
│   ├── payments-api/
│   ├── web-api/
│   └── worker/
│
├── terraform/
│
├── .github/
│   └── workflows/
│
├── scripts/
│
├── README.md
└── .gitignore
```

The final structure may be adjusted to match the implementation.

---

## 20. Documentation Requirements

The README must explain:

1. Project overview.
2. Architecture.
3. Local setup.
4. Docker commands.
5. AWS setup.
6. Terraform commands.
7. Kubernetes deployment commands.
8. CI/CD workflow.
9. Logging architecture.
10. Troubleshooting steps.
11. How to intentionally reproduce failure scenarios.
12. How to clean up AWS resources.

Example Terraform workflow:

```bash
terraform init
terraform plan
terraform apply
```

Cleanup:

```bash
terraform destroy
```

Only include commands that match the final implementation.

---

## 21. Cost Guardrails

The project is for practice, so cost should be controlled.

Requirements:

- Prefer low-cost AWS resources.
- Avoid unnecessary NAT Gateways, Elastic IPs, or other resources that can create unexpected charges.
- Clearly document potentially billable resources.
- Provide a cleanup procedure.
- Verify that resources are removed after testing.

---

## 22. Acceptance Criteria

The project is considered complete when:

- [ ] Three small services are running.
- [ ] Each service produces identifiable logs.
- [ ] Services can run locally using Docker.
- [ ] Docker images can be built successfully.
- [ ] Images are pushed to Amazon ECR.
- [ ] AWS infrastructure is provisioned using Terraform.
- [ ] Services are deployed to Kubernetes.
- [ ] Kubernetes health probes are working.
- [ ] Logs from multiple services can be viewed centrally.
- [ ] Dashboard shows service/log status.
- [ ] GitHub Actions successfully runs the CI/CD pipeline.
- [ ] No secrets are committed to Git.
- [ ] At least one intentional failure can be reproduced.
- [ ] The failure can be diagnosed using logs and/or metrics.
- [ ] The issue can be fixed and the service restored.
- [ ] README contains setup, deployment, troubleshooting, and cleanup instructions.
- [ ] AWS resources can be cleaned up safely.

---

## 23. Definition of Done

LogFlow is complete when a developer can:

```text
Clone repository
      ↓
Run services locally
      ↓
Build Docker images
      ↓
Push images to ECR
      ↓
Provision infrastructure with Terraform
      ↓
Deploy to Kubernetes
      ↓
Open the dashboard
      ↓
View centralized logs
      ↓
Detect a simulated failure
      ↓
Troubleshoot it
      ↓
Fix it
      ↓
Verify recovery
      ↓
Clean up resources
```

The final project should demonstrate that the developer can not only deploy an application, but also **operate, observe, troubleshoot, and automate it**.
