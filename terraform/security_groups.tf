# ==============================================================================
# SECURITY GROUPS (Network Firewalls - Least Privilege)
# ==============================================================================

# Security group for external access to the LogFlow Dashboard & NodePort
resource "aws_security_group" "dashboard_ingress" {
  name        = "${local.name_prefix}-dashboard-sg"
  description = "Security group for external access to LogFlow Dashboard"
  vpc_id      = aws_vpc.main.id

  # Dashboard Web UI
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

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-dashboard-sg"
  })
}

# Security group for internal microservices communication
resource "aws_security_group" "internal_services" {
  name        = "${local.name_prefix}-internal-services-sg"
  description = "Security group for internal microservices communication"
  vpc_id      = aws_vpc.main.id

  # Intra-VPC communication for microservices
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

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-internal-services-sg"
  })
}
