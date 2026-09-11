# ==============================================================================
# AMAZON ECR (Elastic Container Registry)
# Cost Guardrail: Lifecycle policy deletes untagged images in 7 days and retains
# only 5 tagged images to minimize AWS S3 container storage charges.
# ==============================================================================

resource "aws_ecr_repository" "service_repo" {
  for_each             = local.services
  name                 = "${var.project_name}-${each.value.name}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(local.common_tags, {
    Service = each.value.name
  })
}

resource "aws_ecr_lifecycle_policy" "service_policy" {
  for_each   = aws_ecr_repository.service_repo
  repository = each.value.name
  policy     = local.ecr_lifecycle_policy
}
