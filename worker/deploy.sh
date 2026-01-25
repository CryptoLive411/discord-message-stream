#!/bin/bash
# Deploy Discord Mirror Worker to VPS
# Usage: ./deploy.sh [vps-ip] [ssh-user]
#
# Examples:
#   ./deploy.sh 159.203.78.25
#   ./deploy.sh 159.203.78.25 root

set -e

# Configuration
VPS_IP="${1:-159.203.78.25}"
SSH_USER="${2:-root}"
REMOTE_DIR="/opt/discord-relay"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================"
echo "  Discord Mirror Worker Deployment"
echo "========================================"
echo ""
echo "Target: ${SSH_USER}@${VPS_IP}:${REMOTE_DIR}"
echo ""

# Check if worker file exists
if [ ! -f "${SCRIPT_DIR}/discord_telegram_relay.py" ]; then
    echo "ERROR: discord_telegram_relay.py not found in ${SCRIPT_DIR}"
    echo "Make sure you're running this from the worker directory or project root."
    exit 1
fi

echo "[1/4] Uploading worker script..."
scp "${SCRIPT_DIR}/discord_telegram_relay.py" "${SSH_USER}@${VPS_IP}:${REMOTE_DIR}/"

echo ""
echo "[2/4] Uploading .env.example (for reference)..."
scp "${SCRIPT_DIR}/.env.example" "${SSH_USER}@${VPS_IP}:${REMOTE_DIR}/" 2>/dev/null || echo "  (skipped - file not found)"

echo ""
echo "[3/4] Restarting discord-relay service..."
ssh "${SSH_USER}@${VPS_IP}" "systemctl restart discord-relay"

echo ""
echo "[4/4] Checking service status..."
ssh "${SSH_USER}@${VPS_IP}" "systemctl status discord-relay --no-pager -l | head -20"

echo ""
echo "========================================"
echo "  Deployment Complete!"
echo "========================================"
echo ""
echo "To watch logs:"
echo "  ssh ${SSH_USER}@${VPS_IP} 'journalctl -u discord-relay -f'"
echo ""
echo "To check status:"
echo "  ssh ${SSH_USER}@${VPS_IP} 'systemctl status discord-relay'"
echo ""
