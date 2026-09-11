# ==============================================================================
# AWS IAM (Identity and Access Management - Least Privilege)
# ==============================================================================

# IAM role for EC2 / EKS node compute instances
resource "aws_iam_role" "node_role" {
  name = "${local.name_prefix}-node-role"

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

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-node-role"
  })
}

# Attach read-only ECR policy to allow nodes to pull container images
resource "aws_iam_role_policy_attachment" "ecr_readonly" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.node_role.name
}

# Attach CloudWatch agent policy to allow sending metrics and container logs
resource "aws_iam_role_policy_attachment" "cloudwatch_agent" {
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
  role       = aws_iam_role.node_role.name
}

# Instance profile for compute instances running Docker or Kubernetes
resource "aws_iam_instance_profile" "node_profile" {
  name = "${local.name_prefix}-node-profile"
  role = aws_iam_role.node_role.name
}
