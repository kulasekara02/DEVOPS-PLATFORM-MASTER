# Ubuntu Server Setup Guide

This guide covers setting up an Ubuntu server for running the DevOps Platform.

## Initial Server Setup

### 1. Update System

```bash
# Update package lists
sudo apt update

# Upgrade all packages
sudo apt upgrade -y

# Install essential packages
sudo apt install -y \
  curl \
  wget \
  git \
  vim \
  htop \
  tree \
  unzip \
  jq \
  ca-certificates \
  gnupg \
  lsb-release \
  software-properties-common
```

### 2. Create Application User

```bash
# Create user for running applications
sudo useradd -m -s /bin/bash devops

# Add to sudo group (optional)
sudo usermod -aG sudo devops

# Set password
sudo passwd devops

# Switch to new user
su - devops
```

### 3. Configure SSH

```bash
# Generate SSH key (on your local machine)
ssh-keygen -t ed25519 -C "your-email@example.com"

# Copy public key to server
ssh-copy-id devops@your-server-ip

# On server: Secure SSH configuration
sudo vim /etc/ssh/sshd_config
```

Add/modify these settings:
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
```

```bash
# Restart SSH
sudo systemctl restart sshd
```

## Install Docker

```bash
# Remove old versions
sudo apt remove docker docker-engine docker.io containerd runc 2>/dev/null

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Verify installation
docker --version
docker compose version
```

## Install Kubernetes Tools

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
kubectl version --client

# Install kind (for local clusters)
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify
kind version
helm version
```

## Install Development Tools

```bash
# Install Node.js (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Verify
node --version
npm --version

# Install common global packages
npm install -g pnpm typescript
```

## Configure Firewall

```bash
# Install ufw if not present
sudo apt install -y ufw

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow application ports (if needed)
sudo ufw allow 3000/tcp  # Frontend
sudo ufw allow 8080/tcp  # API

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

## Set Up Log Rotation

```bash
# Create custom logrotate config
sudo vim /etc/logrotate.d/devops-platform
```

Add:
```
/var/log/devops-platform/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 devops devops
    sharedscripts
    postrotate
        systemctl reload docker 2>/dev/null || true
    endscript
}
```

## Create Systemd Service for Docker Compose

```bash
# Create service file
sudo vim /etc/systemd/system/devops-platform.service
```

Add:
```ini
[Unit]
Description=DevOps Platform Master
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/devops/devops-platform-master
ExecStart=/usr/bin/docker compose -f infra/docker/docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f infra/docker/docker-compose.prod.yml down
User=devops
Group=devops

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable devops-platform
sudo systemctl start devops-platform

# Check status
sudo systemctl status devops-platform
```

## Verify Setup

```bash
# Check Docker
docker run hello-world

# Check kind
kind create cluster --name test
kubectl get nodes
kind delete cluster --name test

# Check all services
systemctl status docker
systemctl status ufw
```

## Next Steps

1. Clone the repository
2. Configure environment variables
3. Start with `docker compose up` or deploy to kind
4. Set up monitoring and backups

See the main README for application deployment instructions.
