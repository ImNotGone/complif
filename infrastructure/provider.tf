terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment this once you have a backend configured
  # backend "s3" {
  #   bucket = "complif-terraform-state"
  #   key    = "onboarding-portal/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "Business Onboarding Portal"
      ManagedBy = "Terraform"
      Environment = var.environment
    }
  }
}
