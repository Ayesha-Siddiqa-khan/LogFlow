# ==============================================================================
# TERRAFORM REMOTE STATE BACKEND (Optional S3 + DynamoDB State Locking)
# To enable remote state, create your S3 bucket and DynamoDB table and uncomment:
# ==============================================================================

# terraform {
#   backend "s3" {
#     bucket         = "logflow-terraform-state-YOUR-ACCOUNT-ID"
#     key            = "logflow/dev/terraform.tfstate"
#     region         = "us-east-1"
#     encrypt        = true
#     dynamodb_table = "logflow-terraform-locks"
#   }
# }
