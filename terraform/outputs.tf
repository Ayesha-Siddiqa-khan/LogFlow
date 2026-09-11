# ==============================================================================
# OUTPUTS
# ==============================================================================

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

output "cloudwatch_alarm_name" {
  description = "Name of the CloudWatch high error rate alarm"
  value       = aws_cloudwatch_metric_alarm.high_error_alarm.alarm_name
}

output "compute_instance_id" {
  description = "ID of the optional container host EC2 instance"
  value       = length(aws_instance.container_host) > 0 ? aws_instance.container_host[0].id : "Not provisioned (var.enable_compute_node = false)"
}

output "alb_dns_name" {
  description = "DNS name of the optional Application Load Balancer"
  value       = length(aws_lb.main) > 0 ? aws_lb.main[0].dns_name : "Not provisioned (var.enable_alb = false)"
}

output "ecr_login_command" {
  description = "Shell command to authenticate Docker to Amazon ECR"
  value       = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${values(aws_ecr_repository.service_repo)[0].repository_url}"
}
