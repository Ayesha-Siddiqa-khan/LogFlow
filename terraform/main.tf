# ==============================================================================
# LOGFLOW INFRASTRUCTURE ROOT ENTRY POINT
# 
# Infrastructure architecture is organized across dedicated domain files:
#   - vpc.tf              : VPC, Subnets, Internet Gateway, Routing
#   - security_groups.tf  : Least-privilege firewall definitions
#   - ecr.tf              : Elastic Container Registry & image lifecycle rules
#   - cloudwatch.tf       : Log groups, metric filters, and error alarms
#   - iam.tf              : Compute roles, policies, and instance profiles
#   - compute.tf          : Optional container host EC2 instance
#   - alb.tf              : Optional Application Load Balancer & target groups
#   - locals.tf           : Local variables, naming standards, service maps
#   - data.tf             : AWS data sources (AZs, AMI, caller identity)
#   - providers.tf        : AWS provider definition
#   - versions.tf         : Terraform and provider version constraints
#   - variables.tf        : Input parameters
#   - outputs.tf          : Provisioned infrastructure outputs
#   - backend.tf          : Remote state backend configuration
# ==============================================================================
