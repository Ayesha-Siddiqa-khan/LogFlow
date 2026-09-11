variable "aws_region" {
  description = "AWS region for LogFlow infrastructure deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
  default     = "logflow"
}

variable "vpc_cidr" {
  description = "CIDR block for the LogFlow VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets (multi-AZ)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "log_retention_in_days" {
  description = "CloudWatch log retention period in days (set low for cost control)"
  type        = number
  default     = 7
}

variable "image_retention_count" {
  description = "Maximum number of tagged container images to retain in ECR (cost guardrail)"
  type        = number
  default     = 5
}
