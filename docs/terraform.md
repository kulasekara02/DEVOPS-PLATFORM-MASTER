# Terraform Guide

## Overview

Terraform is used for cloud infrastructure provisioning. For local development, use Docker Compose or kind instead.

## Structure

```
infra/terraform/
├── modules/
│   ├── vpc/          # VPC, subnets, NAT
│   └── k8s/          # EKS cluster
└── envs/
    ├── dev/          # Development
    ├── staging/      # Staging
    └── prod/         # Production
```

## Prerequisites

```bash
# Install Terraform
brew install terraform

# Or download from https://terraform.io

# Verify
terraform version
```

## Getting Started

### 1. Configure AWS Credentials

```bash
# Using AWS CLI
aws configure

# Or environment variables
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
export AWS_REGION="us-east-1"
```

### 2. Initialize

```bash
cd infra/terraform/envs/dev
terraform init
```

### 3. Plan

```bash
# Preview changes
terraform plan

# Save plan to file
terraform plan -out=tfplan
```

### 4. Apply

```bash
# Apply changes
terraform apply

# Apply saved plan
terraform apply tfplan

# Auto-approve (use with caution)
terraform apply -auto-approve
```

## Modules

### VPC Module

Creates a VPC with public and private subnets.

```hcl
module "vpc" {
  source = "../../modules/vpc"

  name        = "devops-platform-dev"
  environment = "dev"
  vpc_cidr    = "10.0.0.0/16"

  availability_zones   = ["us-east-1a", "us-east-1b"]
  private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnet_cidrs  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true  # Cost savings for non-prod
}
```

### Kubernetes Module

Creates an EKS cluster with managed node groups.

```hcl
module "k8s" {
  source = "../../modules/k8s"

  name        = "devops-platform-dev"
  environment = "dev"
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids

  kubernetes_version = "1.28"

  node_groups = {
    default = {
      instance_types = ["t3.medium"]
      min_size       = 1
      max_size       = 5
      desired_size   = 2
      disk_size      = 50
      labels         = {}
      taints         = []
    }
  }
}
```

## State Management

### Remote State (Recommended)

```hcl
terraform {
  backend "s3" {
    bucket         = "your-terraform-state-bucket"
    key            = "devops-platform/dev/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

### Create State Resources

```bash
# Create S3 bucket
aws s3api create-bucket --bucket your-terraform-state-bucket --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket your-terraform-state-bucket \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for locking
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

## Common Commands

```bash
# Initialize
terraform init

# Format code
terraform fmt

# Validate configuration
terraform validate

# Preview changes
terraform plan

# Apply changes
terraform apply

# Destroy resources
terraform destroy

# Show current state
terraform show

# List resources
terraform state list

# Import existing resource
terraform import aws_instance.example i-1234567890abcdef0

# Refresh state
terraform refresh

# Output values
terraform output
```

## Variables

### terraform.tfvars

```hcl
# infra/terraform/envs/dev/terraform.tfvars
aws_region   = "us-east-1"
project_name = "devops-platform"
environment  = "dev"
```

### Variable Precedence

1. Environment variables (`TF_VAR_name`)
2. `terraform.tfvars`
3. `*.auto.tfvars`
4. `-var` and `-var-file` flags

## Workspaces

```bash
# List workspaces
terraform workspace list

# Create workspace
terraform workspace new staging

# Switch workspace
terraform workspace select dev

# Show current
terraform workspace show
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Terraform Init
  run: terraform init

- name: Terraform Plan
  run: terraform plan -out=tfplan

- name: Terraform Apply
  if: github.ref == 'refs/heads/main'
  run: terraform apply tfplan
```

## Best Practices

1. **Remote state**: Always use for team environments
2. **State locking**: Prevent concurrent modifications
3. **Workspaces or directories**: Separate environments
4. **Modules**: Reuse infrastructure code
5. **Variables**: Never hardcode secrets
6. **Plan before apply**: Review changes
7. **Version constraints**: Lock provider versions
8. **Code formatting**: Use `terraform fmt`

## Troubleshooting

### State Lock

```bash
# Force unlock (use carefully)
terraform force-unlock LOCK_ID
```

### Provider Issues

```bash
# Upgrade providers
terraform init -upgrade

# Clear cache
rm -rf .terraform
terraform init
```

### Import Resources

```bash
# Import existing resource
terraform import aws_vpc.main vpc-12345678
```
