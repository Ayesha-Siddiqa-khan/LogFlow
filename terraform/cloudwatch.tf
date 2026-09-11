# ==============================================================================
# AMAZON CLOUDWATCH LOGS & ALARMS
# Central log management and alerting with short retention for cost control
# ==============================================================================

resource "aws_cloudwatch_log_group" "logflow" {
  name              = "/aws/logflow/${var.environment}"
  retention_in_days = var.log_retention_in_days

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-log-group"
  })
}

# Metric filter to extract error counts from centralized JSON logs
resource "aws_cloudwatch_log_metric_filter" "error_filter" {
  name           = "${local.name_prefix}-error-filter"
  pattern        = "{ $.level = \"ERROR\" }"
  log_group_name = aws_cloudwatch_log_group.logflow.name

  metric_transformation {
    name          = "ErrorCount"
    namespace     = "LogFlow/Metrics"
    value         = "1"
    default_value = "0"
  }
}

# CloudWatch Alarm for high error rate (Failure Scenario 2 monitoring)
resource "aws_cloudwatch_metric_alarm" "high_error_alarm" {
  alarm_name          = "${local.name_prefix}-high-error-rate"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "ErrorCount"
  namespace           = "LogFlow/Metrics"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alarm triggered when LogFlow application detects 5 or more errors in 1 minute"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-error-alarm"
  })
}
