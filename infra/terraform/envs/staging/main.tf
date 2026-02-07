# =============================================================================
# Staging Environment - Terraform Configuration
# =============================================================================
# Similar to dev but with more resources for testing
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "devops-platform-master"
      Environment = "staging"
      ManagedBy   = "terraform"
    }
  }
}

variable "aws_region" {
  default = "us-east-1"
}

variable "project_name" {
  default = "devops-platform"
}

variable "environment" {
  default = "staging"
}

module "vpc" {
  source = "../../modules/vpc"

  name        = "${var.project_name}-${var.environment}"
  environment = var.environment
  vpc_cidr    = "10.1.0.0/16"

  availability_zones   = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnet_cidrs = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
  public_subnet_cidrs  = ["10.1.101.0/24", "10.1.102.0/24", "10.1.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
}

module "k8s" {
  source = "../../modules/k8s"

  name        = "${var.project_name}-${var.environment}"
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids

  kubernetes_version = "1.28"

  node_groups = {
    default = {
      instance_types = ["t3.large"]
      min_size       = 2
      max_size       = 6
      desired_size   = 3
      disk_size      = 100
      labels         = {}
      taints         = []
    }
  }

  enable_cluster_autoscaler = true
}

output "cluster_endpoint" {
  value = module.k8s.cluster_endpoint
}
