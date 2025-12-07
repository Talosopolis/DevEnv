variable "project_id" {
  description = "The GCP Project ID"
  type        = string
}

variable "region_primary" {
  description = "Primary region for resources (US)"
  type        = string
  default     = "us-central1"
}

variable "region_secondary" {
  description = "Secondary region for resources (EU)"
  type        = string
  default     = "europe-west3"
}
