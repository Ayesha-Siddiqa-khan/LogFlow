# ==============================================================================
# COMPUTE INFRASTRUCTURE (Optional Low-Cost EC2 Container Host)
# Enabled when var.enable_compute_node is true (default: false for cost control)
# ==============================================================================

resource "aws_instance" "container_host" {
  count                  = var.enable_compute_node ? 1 : 0
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public[0].id
  vpc_security_group_ids = [aws_security_group.dashboard_ingress.id, aws_security_group.internal_services.id]
  iam_instance_profile   = aws_iam_instance_profile.node_profile.name

  user_data = <<-EOF
              #!/bin/bash
              dnf update -y
              dnf install -y docker git
              systemctl enable --now docker
              usermod -aG docker ec2-user
              EOF

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-container-host"
  })
}
