# Production environment settings
aws_region            = "us-east-1"
environment           = "prod"
project_name          = "logflow"
vpc_cidr              = "10.100.0.0/16"
public_subnet_cidrs   = ["10.100.1.0/24", "10.100.2.0/24"]
log_retention_in_days = 30
image_retention_count = 10
enable_compute_node   = true
instance_type         = "t3.small"
enable_alb            = true
