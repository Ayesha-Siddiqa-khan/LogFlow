# ==============================================================================
# DATA SOURCES
# Discovers dynamic environment information from the active AWS account and region
# ==============================================================================

# Discovers available Availability Zones in the selected AWS region
data "aws_availability_zones" "available" {
  state = "available"
}

# Current AWS caller identity (Account ID, ARN, User/Role ID)
data "aws_caller_identity" "current" {}

# Current AWS region details
data "aws_region" "current" {}

# Latest Amazon Linux 2023 AMI for optional EC2 / Container host compute nodes
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}
