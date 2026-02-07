# =============================================================================
# Production Environment - Terraform Configuration
# =============================================================================
# Production-grade configuration with HA and security best practices
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # REQUIRED: Use remote state for production
  # backend "s3" {
  #   bucket         = "your-terraform-state-bucket"
  #   key            = "devops-platform/prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "devops-platform-master"
      Environment = "prod"
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
  default = "prod"
}

module "vpc" {
  source = "../../modules/vpc"

  name        = "${var.project_name}-${var.environment}"
  environment = var.environment
  vpc_cidr    = "10.2.0.0/16"

  availability_zones   = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnet_cidrs = ["10.2.1.0/24", "10.2.2.0/24", "10.2.3.0/24"]
  public_subnet_cidrs  = ["10.2.101.0/24", "10.2.102.0/24", "10.2.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false  # HA NAT in production
}

module "k8s" {
  source = "../../modules/k8s"

  name        = "${var.project_name}-${var.environment}"
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids

  kubernetes_version = "1.28"

  node_groups = {
    general = {
      instance_types = ["t3.xlarge"]
      min_size       = 3
      max_size       = 10
      desired_size   = 5
      disk_size      = 100
      labels = {
        "workload-type" = "general"
      }
      taints = []
    }
    workers = {
      instance_types = ["t3.large"]
      min_size       = 2
      max_size       = 8
      desired_size   = 3
      disk_size      = 100
      labels = {
        "workload-type" = "workers"
      }
      taints = []
    }
  }

  enable_cluster_autoscaler = true
}

output "cluster_endpoint" {
  value = module.k8s.cluster_endpoint
}

output "cluster_name" {
  value = module.k8s.cluster_name
}
