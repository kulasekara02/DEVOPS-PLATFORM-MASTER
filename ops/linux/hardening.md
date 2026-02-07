# Linux Server Hardening Guide

Security best practices for production servers.

## SSH Hardening

### 1. Disable Root Login

```bash
sudo vim /etc/ssh/sshd_config
```

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
MaxAuthTries 3
LoginGraceTime 60
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers devops admin
```

```bash
sudo systemctl restart sshd
```

### 2. Change SSH Port (Optional)

```bash
# Change port
Port 2222

# Update firewall
sudo ufw allow 2222/tcp
sudo ufw delete allow 22/tcp
```

### 3. Use SSH Keys Only

```bash
# Generate strong key
ssh-keygen -t ed25519 -a 100 -C "admin@company.com"

# Set correct permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
chmod 600 ~/.ssh/id_ed25519
```

## Firewall Configuration

### UFW Setup

```bash
# Enable UFW
sudo ufw enable

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Essential services
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Rate limiting for SSH
sudo ufw limit ssh

# Check status
sudo ufw status verbose
```

### Advanced iptables (if needed)

```bash
# Block ping (optional)
sudo iptables -A INPUT -p icmp --icmp-type echo-request -j DROP

# Log dropped packets
sudo iptables -A INPUT -j LOG --log-prefix "IPTables-Dropped: "
```

## Fail2Ban Setup

```bash
# Install
sudo apt install -y fail2ban

# Create local config
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo vim /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
ignoreip = 127.0.0.1/8

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 24h
```

```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Check status
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

## User Security

### Sudo Configuration

```bash
# Edit sudoers safely
sudo visudo
```

```
# Require password for sudo
Defaults        timestamp_timeout=5
Defaults        passwd_tries=3

# Allow devops user
devops ALL=(ALL:ALL) ALL

# No password for specific commands (careful!)
# devops ALL=(ALL) NOPASSWD: /usr/bin/docker
```

### Password Policy

```bash
# Install libpam-pwquality
sudo apt install -y libpam-pwquality

# Configure password requirements
sudo vim /etc/security/pwquality.conf
```

```
minlen = 12
dcredit = -1
ucredit = -1
ocredit = -1
lcredit = -1
```

## System Updates

### Automatic Security Updates

```bash
sudo apt install -y unattended-upgrades

sudo dpkg-reconfigure -plow unattended-upgrades

# Configure
sudo vim /etc/apt/apt.conf.d/50unattended-upgrades
```

```
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
```

## File System Security

### Secure Permissions

```bash
# Restrict /tmp
sudo chmod 1777 /tmp

# Secure home directories
sudo chmod 700 /home/*

# Secure SSH directory
chmod 700 ~/.ssh
chmod 600 ~/.ssh/*
```

### Disable Unused Filesystems

```bash
sudo vim /etc/modprobe.d/disable-filesystems.conf
```

```
install cramfs /bin/true
install freevxfs /bin/true
install jffs2 /bin/true
install hfs /bin/true
install hfsplus /bin/true
install udf /bin/true
```

## Docker Security

### Docker Daemon Configuration

```bash
sudo vim /etc/docker/daemon.json
```

```json
{
  "icc": false,
  "userns-remap": "default",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "no-new-privileges": true,
  "live-restore": true
}
```

```bash
sudo systemctl restart docker
```

### Container Best Practices

- Run containers as non-root
- Use read-only filesystems
- Drop all capabilities, add only needed
- Use security profiles (AppArmor/SELinux)
- Scan images for vulnerabilities

## Logging and Auditing

### Configure Auditd

```bash
sudo apt install -y auditd

sudo vim /etc/audit/rules.d/audit.rules
```

```
# Monitor sudo usage
-w /etc/sudoers -p wa -k sudoers
-w /etc/sudoers.d/ -p wa -k sudoers

# Monitor SSH
-w /etc/ssh/sshd_config -p wa -k sshd

# Monitor Docker
-w /usr/bin/docker -p x -k docker
-w /var/lib/docker -p wa -k docker

# Monitor user/group changes
-w /etc/passwd -p wa -k identity
-w /etc/group -p wa -k identity
```

```bash
sudo systemctl enable auditd
sudo systemctl start auditd

# View audit logs
sudo ausearch -k docker
```

## Security Checklist

- [ ] SSH: Disable root login
- [ ] SSH: Use key-based authentication only
- [ ] SSH: Limit users who can SSH
- [ ] Firewall: Enable and configure UFW
- [ ] Firewall: Only allow necessary ports
- [ ] Fail2ban: Install and configure
- [ ] Updates: Enable automatic security updates
- [ ] Users: Use strong password policies
- [ ] Users: Limit sudo access
- [ ] Docker: Run containers as non-root
- [ ] Docker: Configure daemon securely
- [ ] Logging: Enable auditd
- [ ] Logging: Centralize logs

## Regular Security Tasks

```bash
# Weekly
- Review auth logs
- Check for failed login attempts
- Update packages

# Monthly
- Review user accounts
- Check sudo access
- Review firewall rules
- Scan for vulnerabilities

# Quarterly
- Rotate SSH keys
- Review security policies
- Penetration testing
```
