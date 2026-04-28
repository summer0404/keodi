#!/bin/bash
# =============================================================================
# Keodi VPS Initial Setup Script
# Run as root on a fresh Ubuntu 22.04/24.04 VPS
# Usage: chmod +x vps-setup.sh && sudo ./vps-setup.sh
# =============================================================================

set -euo pipefail

echo "=========================================="
echo "🚀 Keodi VPS Setup"
echo "=========================================="

# ─────────────────────────────────────────────
# 1. System Update
# ─────────────────────────────────────────────
echo "📦 Updating system packages..."
apt update && apt upgrade -y
apt install -y curl wget git htop unzip nano ufw

# ─────────────────────────────────────────────
# 2. Create deploy user
# ─────────────────────────────────────────────
echo "👤 Creating deploy user..."
if ! id "deploy" &>/dev/null; then
    adduser --disabled-password --gecos "" deploy
    usermod -aG sudo deploy
    echo "deploy ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/deploy
    
    # Copy SSH keys from root to deploy user
    mkdir -p /home/deploy/.ssh
    cp /root/.ssh/authorized_keys /home/deploy/.ssh/ 2>/dev/null || true
    chown -R deploy:deploy /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    chmod 600 /home/deploy/.ssh/authorized_keys 2>/dev/null || true
    echo "✅ Deploy user created"
else
    echo "ℹ️  Deploy user already exists"
fi

# ─────────────────────────────────────────────
# 3. Install Docker
# ─────────────────────────────────────────────
echo "🐳 Installing Docker..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    usermod -aG docker deploy
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker installed"
else
    echo "ℹ️  Docker already installed: $(docker --version)"
fi

# ─────────────────────────────────────────────
# 4. Install Docker Compose plugin
# ─────────────────────────────────────────────
echo "🐳 Ensuring Docker Compose plugin..."
apt install -y docker-compose-plugin 2>/dev/null || true
echo "Docker Compose version: $(docker compose version)"

# ─────────────────────────────────────────────
# 5. Install Nginx
# ─────────────────────────────────────────────
echo "🌐 Installing Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx
echo "✅ Nginx installed"

# ─────────────────────────────────────────────
# 6. Install Certbot
# ─────────────────────────────────────────────
echo "🔐 Installing Certbot..."
apt install -y certbot python3-certbot-nginx
echo "✅ Certbot installed"

# ─────────────────────────────────────────────
# 7. Configure Firewall
# ─────────────────────────────────────────────
echo "🔥 Configuring UFW firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
ufw --force enable
echo "✅ Firewall configured"

# ─────────────────────────────────────────────
# 8. Create project directories
# ─────────────────────────────────────────────
echo "📁 Creating project directories..."
mkdir -p /opt/keodi/env
mkdir -p /opt/keodi/monitoring
chown -R deploy:deploy /opt/keodi
echo "✅ Directories created"

# ─────────────────────────────────────────────
# 9. SSH Hardening
# ─────────────────────────────────────────────
echo "🔒 Hardening SSH..."
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd
echo "✅ SSH hardened (root login disabled, password auth disabled)"

# ─────────────────────────────────────────────
# 10. Configure swap (for 8GB RAM VPS)
# ─────────────────────────────────────────────
echo "💾 Configuring swap..."
if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=10
    echo "vm.swappiness=10" >> /etc/sysctl.conf
    echo "✅ 4GB swap created"
else
    echo "ℹ️  Swap already exists"
fi

echo ""
echo "=========================================="
echo "✅ VPS Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Add your GitHub Actions SSH public key to /home/deploy/.ssh/authorized_keys"
echo "2. Create env files in /opt/keodi/env/"
echo "3. Configure Nginx: sudo cp nginx/keodi-api.conf /etc/nginx/sites-available/"
echo "4. Setup SSL: sudo certbot --nginx -d your-domain.com"
echo "5. Trigger deploy from GitHub Actions"
echo ""
echo "⚠️  IMPORTANT: Log out and log back in as 'deploy' user!"
echo "    ssh deploy@$(curl -s ifconfig.me)"
