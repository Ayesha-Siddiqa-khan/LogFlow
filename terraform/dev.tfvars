# Development environment settings
aws_region            = "us-east-1"
environment           = "dev"
project_name          = "logflow"
vpc_cidr              = "10.0.0.0/16"
public_subnet_cidrs   = ["10.0.1.0/24", "10.0.2.0/24"]
log_retention_in_days = 7
image_retention_count = 5
enable_compute_node   = false
instance_type         = "t3.micro"
enable_alb            = false
