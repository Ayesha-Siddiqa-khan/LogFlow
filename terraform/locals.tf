# ==============================================================================
# LOCAL VALUES
# Common expressions, tagging conventions, and microservice definitions
# ==============================================================================

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  # Microservices managed under LogFlow
  services = {
    "payments-api" = {
      name = "payments-api"
      port = 3001
    }
    "web-api" = {
      name = "web-api"
      port = 3002
    }
    "worker" = {
      name = "worker"
      port = 3003
    }
    "dashboard" = {
      name = "dashboard"
      port = 3000
    }
  }

  # Standard tags merged with default tags
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  # Cost Guardrail: ECR lifecycle policy to avoid unexpected AWS storage charges
  ecr_lifecycle_policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images older than 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Retain maximum ${var.image_retention_count} tagged images for cost control"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "build-", "latest"]
          countType     = "imageCountMoreThan"
          countNumber   = var.image_retention_count
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
