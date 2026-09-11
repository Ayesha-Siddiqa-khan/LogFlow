output "vpc_id" {
  description = "The ID of the LogFlow VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "The IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "dashboard_security_group_id" {
  description = "Security group ID for Dashboard access"
  value       = aws_security_group.dashboard_ingress.id
}

output "internal_services_security_group_id" {
  description = "Security group ID for internal services communication"
  value       = aws_security_group.internal_services.id
}

output "ecr_repository_urls" {
  description = "Map of ECR repository URLs for Docker image push"
  value = {
    for k, v in aws_ecr_repository.service_repo : k => v.repository_url
  }
}

output "cloudwatch_log_group" {
  description = "Name of the CloudWatch Log Group"
  value       = aws_cloudwatch_log_group.logflow.name
}

output "ecr_login_command" {
  description = "Shell command to authenticate Docker to Amazon ECR"
  value       = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${values(aws_ecr_repository.service_repo)[0].repository_url}"
}
