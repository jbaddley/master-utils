#!/usr/bin/env bash
# AWS Lightsail provisioning script for master-utils
# Run this from a machine with AWS CLI v2 configured (aws configure).
# Required IAM permissions: lightsail:*, s3:*, iam:CreateUser, iam:CreateAccessKey, iam:PutUserPolicy
#
# Usage:
#   chmod +x scripts/provision.sh
#   DB_PASSWORD="<strong-password>" DOMAIN="yourdomain.com" ./scripts/provision.sh

set -euo pipefail

REGION="${AWS_DEFAULT_REGION:-us-east-1}"
AZ="${REGION}a"
BUCKET="master-utils-uploads"
DB_ID="master-utils-db"
DB_NAME="masterutils"
DB_USER="masterutils"
DB_PASSWORD="${DB_PASSWORD:?Set DB_PASSWORD env var before running}"
DOMAIN="${DOMAIN:?Set DOMAIN env var before running}"
INSTANCE="master-utils-app"
STATIC_IP="master-utils-ip"
IAM_USER="master-utils-s3"

echo "=== Region: $REGION | Domain: $DOMAIN ==="

# ── Step 1: S3 Bucket ────────────────────────────────────────────────────────

echo ""
echo "▸ Creating S3 bucket: $BUCKET"
if [ "$REGION" = "us-east-1" ]; then
  aws s3api create-bucket --bucket "$BUCKET" --region "$REGION"
else
  aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION"
fi

echo "▸ Blocking public access on $BUCKET"
aws s3api put-public-access-block \
  --bucket "$BUCKET" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "▸ Setting CORS on $BUCKET"
aws s3api put-bucket-cors --bucket "$BUCKET" --cors-configuration "{
  \"CORSRules\": [{
    \"AllowedOrigins\": [\"https://$DOMAIN\"],
    \"AllowedMethods\": [\"GET\",\"PUT\",\"POST\",\"DELETE\"],
    \"AllowedHeaders\": [\"*\"],
    \"MaxAgeSeconds\": 3600
  }]
}"

# ── IAM user for app S3 access ───────────────────────────────────────────────

echo ""
echo "▸ Creating IAM user: $IAM_USER"
aws iam create-user --user-name "$IAM_USER"

echo "▸ Attaching inline S3 policy"
aws iam put-user-policy \
  --user-name "$IAM_USER" \
  --policy-name S3BucketAccess \
  --policy-document "{
    \"Version\":\"2012-10-17\",
    \"Statement\":[{
      \"Effect\":\"Allow\",
      \"Action\":[\"s3:PutObject\",\"s3:GetObject\",\"s3:DeleteObject\",\"s3:ListBucket\"],
      \"Resource\":[\"arn:aws:s3:::$BUCKET\",\"arn:aws:s3:::$BUCKET/*\"]
    }]
  }"

echo ""
echo "▸ Creating access key for $IAM_USER — SAVE THIS OUTPUT:"
aws iam create-access-key --user-name "$IAM_USER"

# ── Step 2: Lightsail Managed Database ───────────────────────────────────────

echo ""
echo "▸ Creating Lightsail managed PostgreSQL 16 database: $DB_ID"
aws lightsail create-relational-database \
  --relational-database-name "$DB_ID" \
  --availability-zone "$AZ" \
  --relational-database-blueprint-id "postgres_16" \
  --relational-database-bundle-id "micro_3_0" \
  --master-database-name "$DB_NAME" \
  --master-username "$DB_USER" \
  --master-user-password "$DB_PASSWORD" \
  --no-publicly-accessible

echo "▸ Waiting for database to become available (~5 min)…"
while true; do
  STATE=$(aws lightsail get-relational-database \
    --relational-database-name "$DB_ID" \
    --query "relationalDatabase.state" --output text)
  echo "  state: $STATE"
  [ "$STATE" = "available" ] && break
  sleep 30
done

DB_ENDPOINT=$(aws lightsail get-relational-database \
  --relational-database-name "$DB_ID" \
  --query "relationalDatabase.masterEndpoint.address" --output text)
echo "▸ Database endpoint: $DB_ENDPOINT"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_ENDPOINT}:5432/${DB_NAME}"
echo "▸ DATABASE_URL: $DATABASE_URL"

# ── Step 3: Lightsail Instance ───────────────────────────────────────────────

echo ""
echo "▸ Creating Lightsail instance: $INSTANCE"
aws lightsail create-instances \
  --instance-names "$INSTANCE" \
  --availability-zone "$AZ" \
  --blueprint-id "ubuntu_22_04" \
  --bundle-id "medium_3_0" \
  --user-data "$(cat <<'USERDATA'
#!/bin/bash
set -e
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git nginx certbot python3-certbot-nginx
npm install -g pm2
mkdir -p /srv/app
cd /srv/app
git clone https://github.com/jbaddley/master-utils.git .
npm ci
npx prisma generate
USERDATA
)"

echo "▸ Waiting for instance to become running…"
while true; do
  STATE=$(aws lightsail get-instance \
    --instance-name "$INSTANCE" \
    --query "instance.state.name" --output text)
  echo "  state: $STATE"
  [ "$STATE" = "running" ] && break
  sleep 15
done

# ── Static IP ────────────────────────────────────────────────────────────────

echo ""
echo "▸ Allocating static IP: $STATIC_IP"
aws lightsail allocate-static-ip --static-ip-name "$STATIC_IP"
aws lightsail attach-static-ip \
  --static-ip-name "$STATIC_IP" \
  --instance-name "$INSTANCE"

STATIC_ADDR=$(aws lightsail get-static-ip \
  --static-ip-name "$STATIC_IP" \
  --query "staticIp.ipAddress" --output text)
echo "▸ Static IP: $STATIC_ADDR"

# ── Firewall ─────────────────────────────────────────────────────────────────

echo ""
echo "▸ Opening ports 80 and 443"
aws lightsail open-instance-public-ports \
  --instance-name "$INSTANCE" \
  --port-info "fromPort=80,toPort=80,protocol=TCP"
aws lightsail open-instance-public-ports \
  --instance-name "$INSTANCE" \
  --port-info "fromPort=443,toPort=443,protocol=TCP"

# ── Summary ──────────────────────────────────────────────────────────────────

cat <<SUMMARY

=== Provisioning complete ===

Static IP:    $STATIC_ADDR
DB endpoint:  $DB_ENDPOINT
DATABASE_URL: $DATABASE_URL

Next steps:
  1. Point your DNS A record for $DOMAIN → $STATIC_ADDR
  2. SSH to the instance:
       aws lightsail download-default-key-pair  # save as lightsail-key.pem
       ssh -i lightsail-key.pem ubuntu@$STATIC_ADDR
  3. Create /srv/app/.env.local  (see .env.local.example in repo)
  4. On the instance:
       cd /srv/app
       npx prisma migrate deploy
       npm run build
       pm2 start "npm start" --name master-utils
       pm2 save && pm2 startup
  5. Configure nginx:
       sudo cp /srv/app/nginx.conf /etc/nginx/sites-available/master-utils
       # Edit server_name in the file to: $DOMAIN
       sudo ln -s /etc/nginx/sites-available/master-utils /etc/nginx/sites-enabled/
       sudo nginx -t && sudo systemctl reload nginx
       sudo certbot --nginx -d $DOMAIN

SUMMARY
