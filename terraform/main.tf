# Data source to dynamically discover available AZs in current region
data "aws_availability_zones" "available" {
  state = "available"
}

# ==============================================================================
# NETWORKING (VPC, Subnets, Internet Gateway, Route Tables)
# Cost Guardrail Note: We avoid AWS NAT Gateways ($32+/mo each) by using public
# subnets with direct Internet Gateway routing for this DevOps practice project.
# ==============================================================================

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name                                            = "${var.project_name}-public-subnet-${count.index + 1}"
    "kubernetes.io/role/elb"                        = "1"
    "kubernetes.io/cluster/${var.project_name}-k8s" = "shared"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# ==============================================================================
# SECURITY GROUPS (Least Privilege Network Firewalls)
# ==============================================================================

resource "aws_security_group" "dashboard_ingress" {
  name        = "${var.project_name}-dashboard-sg"
  description = "Security group for external access to LogFlow Dashboard"
  vpc_id      = aws_vpc.main.id

  # HTTP access to Dashboard UI
  ingress {
    description = "Dashboard Web UI"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # NodePort access if Kubernetes NodePort is used
  ingress {
    description = "Kubernetes NodePort for Dashboard"
    from_port   = 30080
    to_port     = 30080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-dashboard-sg"
  }
}

resource "aws_security_group" "internal_services" {
  name        = "${var.project_name}-internal-services-sg"
  description = "Security group for internal microservices communication"
  vpc_id      = aws_vpc.main.id

  # Allow intra-VPC communication for microservices
  ingress {
    description = "Intra-VPC service communication"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-internal-services-sg"
  }
}

# ==============================================================================
# AMAZON ECR (Elastic Container Registry)
# Cost Guardrail Note: Lifecycle rules expire untagged images in 7 days and retain
# only 5 tagged images to prevent ongoing AWS S3 container storage charges.
# ==============================================================================

locals {
  services = {
    "payments-api" = "payments-api"
    "web-api"      = "web-api"
    "worker"       = "worker"
    "dashboard"    = "dashboard"
  }

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

resource "aws_ecr_repository" "service_repo" {
  for_each             = local.services
  name                 = "${var.project_name}-${each.value}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Service = each.value
  }
}

resource "aws_ecr_lifecycle_policy" "service_policy" {
  for_each   = aws_ecr_repository.service_repo
  repository = each.value.name
  policy     = local.ecr_lifecycle_policy
}

# ==============================================================================
# CLOUDWATCH LOG GROUP
# Central log group for container / node logs with 7-day retention
# ==============================================================================

resource "aws_cloudwatch_log_group" "logflow" {
  name              = "/aws/logflow/${var.environment}"
  retention_in_days = var.log_retention_in_days

  tags = {
    Name = "${var.project_name}-log-group"
  }
}

# ==============================================================================
# IAM (Identity & Access Management)
# Least privilege role for EC2 / EKS node compute instances
# ==============================================================================

resource "aws_iam_role" "node_role" {
  name = "${var.project_name}-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-node-role"
  }
}

resource "aws_iam_role_policy_attachment" "ecr_readonly" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.node_role.name
}

resource "aws_iam_role_policy_attachment" "cloudwatch_agent" {
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
  role       = aws_iam_role.node_role.name
}

resource "aws_iam_instance_profile" "node_profile" {
  name = "${var.project_name}-node-profile"
  role = aws_iam_role.node_role.name
}
