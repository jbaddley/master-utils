#!/usr/bin/env bash
# Deploy master-utils / image-tools to theater-stack Lightsail instance.
# Run from your laptop (SSH must reach 54.152.205.78):
#   chmod +x scripts/deploy-utilio.sh
#   ./scripts/deploy-utilio.sh
#
# Requires: ~/.ssh/theater-stack-deploy.pem

set -euo pipefail

HOST="54.152.205.78"
KEY="${SSH_KEY:-$HOME/.ssh/theater-stack-deploy.pem}"
DOMAIN="utilio.solutions"
APP_DIR="/srv/app"
REPO="https://github.com/jbaddley/master-utils.git"

DB_HOST="ls-249d31080d21016b1c6e91ef4b22ba33dcc029eb.cefoy40yw3l4.us-east-1.rds.amazonaws.com"
DB_USER="dbmasteruser"
DB_NAME="theater_stack"
DB_PASS="${DB_PASS:?Set DB_PASS — aws lightsail get-relational-database-master-user-password --relational-database-name theater-stack-db --region us-east-1}"

# URL-encode password for DATABASE_URL
DB_PASS_ENC=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$DB_PASS")

AWS_KEY="${AWS_ACCESS_KEY_ID:?Set AWS_ACCESS_KEY_ID (utilio-s3 IAM user)}"
AWS_SECRET="${AWS_SECRET_ACCESS_KEY:?Set AWS_SECRET_ACCESS_KEY}"
AUTH_SECRET="${AUTH_SECRET:-$(openssl rand -base64 32)}"

echo "▸ SSH preflight"
ssh -i "$KEY" -o StrictHostKeyChecking=no "ubuntu@$HOST" "echo ok"

echo "▸ Bootstrap server (first run only)"
ssh -i "$KEY" "ubuntu@$HOST" bash <<'REMOTE_BOOT'
set -e
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs git nginx certbot python3-certbot-nginx
  sudo npm install -g pm2
fi
sudo mkdir -p /srv/app
REMOTE_BOOT

echo "▸ Sync app"
ssh -i "$KEY" "ubuntu@$HOST" bash <<REMOTE_SYNC
set -e
if [ ! -d $APP_DIR/.git ]; then
  sudo rm -rf $APP_DIR
  sudo git clone $REPO $APP_DIR
  sudo chown -R ubuntu:ubuntu $APP_DIR
else
  cd $APP_DIR && git pull
fi
REMOTE_SYNC

echo "▸ Write .env.local"
ssh -i "$KEY" "ubuntu@$HOST" bash <<REMOTE_ENV
set -e
cat > $APP_DIR/.env.local <<ENV
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS_ENC}@${DB_HOST}:5432/${DB_NAME}"
AUTH_SECRET="${AUTH_SECRET}"
NEXT_PUBLIC_SITE_URL="https://${DOMAIN}"
NEXT_PUBLIC_SITE_NAME="Utilio"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="${AWS_KEY}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET}"
AWS_S3_BUCKET="utilio-uploads"
NODE_ENV=production
ENV
REMOTE_ENV

echo "▸ Build and migrate"
ssh -i "$KEY" "ubuntu@$HOST" bash <<REMOTE_BUILD
set -e
cd $APP_DIR
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 delete utilio 2>/dev/null || true
pm2 start "npm start" --name utilio
pm2 save
sudo env PATH=\$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true
REMOTE_BUILD

echo "▸ nginx"
ssh -i "$KEY" "ubuntu@$HOST" bash <<REMOTE_NGINX
set -e
sudo sed "s/yourdomain.com/${DOMAIN}/g" $APP_DIR/nginx.conf | sudo tee /etc/nginx/sites-available/utilio >/dev/null
sudo ln -sf /etc/nginx/sites-available/utilio /etc/nginx/sites-enabled/utilio
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
REMOTE_NGINX

echo "▸ TLS (certbot)"
ssh -i "$KEY" "ubuntu@$HOST" "sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos -m jasonbaddley@gmail.com || true"

echo ""
echo "=== Deploy complete ==="
echo "https://${DOMAIN}"
