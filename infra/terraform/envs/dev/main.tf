# =============================================================================
# Development Environment - Terraform Configuration
# =============================================================================
# This configuration is for cloud deployments. For local development,
# use kind or docker-compose instead.
#
# Usage:
#   terraform init
#   terraform plan
#   terraform apply
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment to use remote state
  # backend "s3" {
  #   bucket         = "your-terraform-state-bucket"
  #   key            = "devops-platform/dev/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}

# =============================================================================
# Provider Configuration
# =============================================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "devops-platform-master"
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}

# =============================================================================
# Variables
# =============================================================================

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "devops-platform"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

# =============================================================================
# VPC Module
# =============================================================================

module "vpc" {
  source = "../../modules/vpc"

  name        = "${var.project_name}-${var.environment}"
  environment = var.environment
  vpc_cidr    = "10.0.0.0/16"

  availability_zones   = ["${var.aws_region}a", "${var.aws_region}b"]
  private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnet_cidrs  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true  # Cost savings for dev

  tags = {
    Environment = var.environment
  }
}

# =============================================================================
# Kubernetes Cluster
# =============================================================================

module "k8s" {
  source = "../../modules/k8s"

  name        = "${var.project_name}-${var.environment}"
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids

  kubernetes_version = "1.28"

  node_groups = {
    default = {
      instance_types = ["t3.medium"]
      min_size       = 1
      max_size       = 3
      desired_size   = 2
      disk_size      = 50
      labels         = {}
      taints         = []
    }
  }

  enable_cluster_autoscaler = true

  tags = {
    Environment = var.environment
  }
}

# =============================================================================
# Outputs
# =============================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "cluster_endpoint" {
  description = "Kubernetes cluster endpoint"
  value       = module.k8s.cluster_endpoint
}

output "cluster_name" {
  description = "Kubernetes cluster name"
  value       = module.k8s.cluster_name
}

output "kubeconfig_command" {
  description = "Command to update kubeconfig"
  value       = "aws eks update-kubeconfig --name ${module.k8s.cluster_name} --region ${var.aws_region}"
}
