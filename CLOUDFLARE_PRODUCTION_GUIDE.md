# Cloudflare Production Deployment Guide
## Vijayalakshmi Boyar Matrimony App - Full Stack Deployment

---

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Project Structure](#project-structure)
4. [AWS RDS PostgreSQL Setup](#aws-rds-postgresql-setup)
5. [Cloudflare Account Setup](#cloudflare-account-setup)
6. [Environment Variables Configuration](#environment-variables-configuration)
7. [Local Development Testing](#local-development-testing)
8. [Backend Deployment (Cloudflare Workers)](#backend-deployment-cloudflare-workers)
9. [Frontend Deployment (Cloudflare Pages)](#frontend-deployment-cloudflare-pages)
10. [Custom Domain Configuration](#custom-domain-configuration)
11. [Database Migration](#database-migration)
12. [GitHub CI/CD Setup](#github-cicd-setup)
13. [Testing & Verification](#testing--verification)
14. [Troubleshooting](#troubleshooting)
15. [Maintenance & Monitoring](#maintenance--monitoring)

---

## Overview

This guide provides step-by-step instructions for deploying the Vijayalakshmi Boyar Matrimony application to Cloudflare Pages and Workers with AWS PostgreSQL database.

### Deployment Architecture
- **Frontend:** React App → Cloudflare Pages
- **Backend API:** Node.js/Express → Cloudflare Workers (Hono framework)
- **Database:** AWS RDS PostgreSQL
- **File Storage:** Cloudinary
- **SMS/OTP:** Twilio

---

## Prerequisites

Before starting deployment, ensure you have:

### Required Accounts
- [ ] Cloudflare Account (https://cloudflare.com)
- [ ] AWS Account with RDS access (https://aws.amazon.com)
- [ ] GitHub Account (https://github.com)
- [ ] Twilio Account (for SMS)
- [ ] Cloudinary Account (for image storage)
- [ ] Razorpay/PhonePe Account (for payments)

### Required Tools
- [ ] Node.js 18.x or higher
- [ ] Git installed locally
- [ ] npm or yarn package manager
- [ ] Cloudflare Wrangler CLI (`npm install -g wrangler`)
- [ ] Code editor (VS Code recommended)

### System Requirements
- Minimum 2GB RAM for building
- Stable internet connection
- Access to terminal/command line

---

## Project Structure

```
viji_marimony_new/
├── backend/                          # Backend API
│   ├── src/
│   │   ├── worker.js                 # Cloudflare Worker entry
│   │   ├── lib/
│   │   │   ├── db.js                 # Prisma database client
│   │   │   └── prisma.js             # Prisma singleton
│   │   └── routes/                   # Hono API routes
│   │       ├── auth.js               # Authentication routes
│   │       ├── profile.js             # Profile management
│   │       ├── search.js             # Search functionality
│   │       ├── message.js            # Messaging
│   │       ├── interest.js           # Interest system
│   │       ├── lookup.js             # Dropdown data
│   │       ├── verification.js      # ID verification
│   │       ├── admin.js             # Admin panel
│   │       ├── payments.js          # Payment processing
│   │       └── chat.js              # Live chat
│   ├── prisma/
│   │   ├── schema.prisma             # Database schema
│   │   └── migrations/              # Database migrations
│   ├── controllers/                  # Express controllers (legacy)
│   ├── routes/                       # Express routes (legacy)
│   ├── services/                     # Business logic
│   ├── utils/                        # Utilities
│   ├── config/                       # Configuration
│   ├── middleware/                   # Express middleware
│   ├── server.js                     # Express server (dev)
│   ├── wrangler.toml                 # Cloudflare config
│   ├── package.json                   # Dependencies
│   ├── .env.example                   # Environment template
│   └── .env.production               # Production env vars
│
├── frontend/                          # React Frontend
│   ├── public/
│   │   ├── _redirects               # SPA routing
│   │   └── index.html
│   ├── src/
│   │   ├── components/              # React components
│   │   ├── pages/                   # Page components
│   │   ├── services/               # API services
│   │   ├── contexts/               # React contexts
│   │   ├── hooks/                  # Custom hooks
│   │   ├── utils/                  # Utilities
│   │   ├── config/                 # Configuration
│   │   └── App.js                  # Main app
│   ├── package.json
│   └── .env.production
│
├── CLOUDFLARE_PRODUCTION_GUIDE.md    # This file
├── DEPLOYMENT.md                     # Quick reference
└── README.md                         # Project readme
```

---

## AWS RDS PostgreSQL Setup

### Step 1: Create RDS PostgreSQL Instance

1. Login to AWS Console → RDS → Create Database
2. **Choose a database creation method:** Standard create
3. **Engine options:** PostgreSQL (latest minor version)
4. **Templates:** Production or Free tier
5. **Settings:**
   - DB instance identifier: `viji-matrimony-db`
   - Master username: `vijiadmindb`
   - Master password: (create strong password)
6. **Instance configuration:**
   - Burstable classes (db.t3.micro for free tier)
7. **Storage:** Enable storage autoscaling (optional)
8. **Connectivity:**
   - VPC: Default
   - Public access: No (for security)
   - VPC security groups: Create new
9. **Database authentication:** Password authentication
10. **Additional configuration:**
    - Initial database name: `postgres`
11. Click **Create database**

### Step 2: Configure Security Groups

1. Go to RDS → Databases → Your instance
2. Click on VPC security groups
3. Edit inbound rules:
   - Type: PostgreSQL
   - Source: Custom IP (for Cloudflare)
   - Note: Cloudflare uses dynamic IPs, so allow all or use RDS Proxy

### Step 3: Get Connection Details

From RDS Console, note:
- Endpoint: `viji-postgres-db.xxxx.ap-south-2.rds.amazonaws.com`
- Port: `5432`
- Database name: `postgres`
- Username: `vijiadmindb`
- Password: (your password)

### Step 4: Test Connection

```bash
# Install PostgreSQL client
# Linux: sudo apt install postgresql-client
# Mac: brew install postgresql

# Test connection
psql -h viji-postgres-db.xxxx.ap-south-2.rds.amazonaws.com -U vijiadmindb -d postgres
# Enter password when prompted
```

---

## Cloudflare Account Setup

### Step 1: Create Cloudflare Account

1. Go to https://cloudflare.com
2. Sign up with email
3. Add your domain (or use *.workers.dev subdomain)

### Step 2: Get API Token

1. Go to Profile → API Tokens
2. Click **Create Custom Token**
3. Configure:
   - Name: `viji-matrimony-deploy`
   - Permissions:
     - Account: Edit
     - Workers Scripts: Edit
     - Pages: Edit
4. Copy the token (shown once)

### Step 3: Get Account ID

1. Go to Dashboard → Overview
2. Copy the Account ID from the URL or sidebar

---

## Environment Variables Configuration

### Backend Production Variables

Create `backend/.env.production`:

```env
# ===========================================
# ENVIRONMENT
# ===========================================
NODE_ENV=production
PORT=5001

# ===========================================
# DATABASE - AWS RDS POSTGRESQL
# ===========================================
# Format: postgresql://username:password@host:port/database?sslmode=require
DATABASE_URL="postgresql://vijiadmindb:YourPassword123@viji-postgres-db.czmeo4s8s2e.ap-south-2.rds.amazonaws.com:5432/postgres?sslmode=require"

# Individual PostgreSQL config (optional, DATABASE_URL takes precedence)
POSTGRES_HOST=viji-postgres-db.czmeo4s8s2e.ap-south-2.rds.amazonaws.com
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=vijiadmindb
POSTGRES_PASSWORD=YourPassword123
POSTGRES_SSL=true

# ===========================================
# JWT CONFIGURATION
# ===========================================
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
JWT_EXPIRE=7d

# ===========================================
# FRONTEND URL (FOR CORS)
# ===========================================
FRONTEND_URL=https://viji-matrimony.pages.dev

# ===========================================
# EMAIL CONFIGURATION
# ===========================================
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
FROM_EMAIL=noreply@vijayalakshmiboyarmatrimony.com

# ===========================================
# TWILIO (SMS/OTP)
# ===========================================
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+17624726509

# ===========================================
# CLOUDINARY (IMAGE UPLOAD)
# ===========================================
CLOUDINARY_CLOUD_NAME=do6o1xqs1
CLOUDINARY_API_KEY=A3O6QFL4uzHeuSOs1eWC-z1zDuQ
CLOUDINARY_API_SECRET=your-actual-cloudinary-secret

# ===========================================
# ADMIN CREDENTIALS
# ===========================================
ADMIN_EMAIL=info@vijayalakshmiboyarmatrimony.com
ADMIN_PHONE=+917639150271
ADMIN_PASSWORD=your-admin-password-hash

# ===========================================
# PAYMENT GATEWAY - RAZORPAY
# ===========================================
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# ===========================================
# PAYMENT GATEWAY - PHONEPE
# ===========================================
PHONEPE_ENVIRONMENT=production
PHONEPE_MERCHANT_ID=your-merchant-id
PHONEPE_MERCHANT_KEY=your-merchant-key

# ===========================================
# PAYMENT SETTINGS
# ===========================================
PAYMENT_COMMISSION_PERCENTAGE=4
INTERNATIONAL_PAYMENTS_ENABLED=true

# Bank Details (for manual transfers)
BANK_ACCOUNT_HOLDER_NAME=Vijayalakshmi Boyar Matrimony
BANK_NAME=State Bank of India
BANK_ACCOUNT_NUMBER=XXXXXXXXXXXX
BANK_IFSC_CODE=SBIN0000000
BANK_BRANCH=Main Branch

# ===========================================
# ENCRYPTION
# ===========================================
ENCRYPTION_KEY=your-32-character-encryption-key

# ===========================================
# AWS SERVICES
# ===========================================
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=ap-south-1
AWS_REKOGNITION_COLLECTION_ID=boyar-matrimony-faces
AWS_S3_BUCKET=viji-matrimony-uploads

# ===========================================
# AI VERIFICATION
# ===========================================
AI_VERIFICATION_ENABLED=true
AI_CONFIDENCE_THRESHOLD=0.85
AI_FACE_MATCH_THRESHOLD=0.90
AI_TAMPER_THRESHOLD=0.30
AI_RATE_LIMIT=10
TESSERACT_LANGUAGE=eng+hin
```

### Frontend Production Variables

Create `frontend/.env.production`:

```env
# API URL - Point to your Cloudflare Worker
REACT_APP_API_URL=https://viji-matrimony-api.your-subdomain.workers.dev/api

# Environment
NODE_ENV=production
```

---

## Local Development Testing

### Step 1: Install Dependencies

```bash
# Backend
cd backend
npm install
npx prisma generate

# Frontend
cd ../frontend
npm install
```

### Step 2: Configure Local Environment

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with local SQLite for testing
```

### Step 3: Run Development Servers

```bash
# Terminal 1 - Backend (Express on port 5001)
cd backend
npm run dev

# Terminal 2 - Frontend (React on port 3000)
cd frontend
npm start
```

### Step 4: Test Application

1. Open http://localhost:3000
2. Register a new user
3. Login
4. Create a profile
5. Test search, messages, interests

---

## Backend Deployment (Cloudflare Workers)

### Step 1: Install Wrangler CLI

```bash
# Install globally
npm install -g wrangler

# Verify installation
wrangler --version
```

### Step 2: Login to Cloudflare

```bash
npx wrangler login
# Opens browser for authentication
```

### Step 3: Configure wrangler.toml

The file `backend/wrangler.toml` should contain:

```toml
name = "viji-matrimony-api"
main = "src/worker.js"
compatibility_date = "2024-01-01"
node_compat = true

[env.production]
name = "viji-matrimony-api-prod"

[vars]
ENVIRONMENT = "production"
API_VERSION = "1.0.0"
```

### Step 4: Set Production Secrets

```bash
cd backend

# Database URL
echo "postgresql://user:password@host:5432/db?sslmode=require" | npx wrangler secret put DATABASE_URL

# JWT Secret
echo "your-jwt-secret-32-chars-minimum" | npx wrangler secret put JWT_SECRET

# Encryption Key
echo "your-32-character-encryption-key" | npx wrangler secret put ENCRYPTION_KEY

# Cloudinary API Secret
echo "your-cloudinary-secret" | npx wrangler secret put CLOUDINARY_API_SECRET

# AWS Secret Access Key
echo "your-aws-secret" | npx wrangler secret put AWS_SECRET_ACCESS_KEY

# Twilio Auth Token
echo "your-twilio-token" | npx wrangler secret put TWILIO_AUTH_TOKEN

# Razorpay Key Secret
echo "your-razorpay-secret" | npx wrangler secret put RAZORPAY_KEY_SECRET
```

### Step 5: Deploy Worker

```bash
cd backend

# Deploy to production
npx wrangler deploy --env production

# Or standard deploy
npx wrangler deploy

# Example output:
#Uploaded viji-matrimony-api (3.25 sec)
#Published viji-matrimony-api (3.25 sec)
#https://viji-matrimony-api.your-subdomain.workers.dev
```

### Step 6: Verify Worker

```bash
# Test health endpoint
curl https://viji-matrimony-api.your-subdomain.workers.dev/

# Should return:
# {"message":"Vijayalakshmi Boyar Matrimony API","version":"1.0.0","status":"running","environment":"cloudflare-workers","database":"postgresql"}
```

---

## Frontend Deployment (Cloudflare Pages)

### Option A: Deploy Using Wrangler

```bash
cd frontend

# Build React app
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy build --project-name=viji-matrimony
```

### Option B: Deploy Using GitHub Integration

1. Go to Cloudflare Dashboard → Pages
2. Click **Connect to Git**
3. Select your repository
4. Configure:
   - Production branch: `main`
   - Build command: `npm run build`
   - Build output directory: `build`
5. Click **Save and Deploy**

### Option C: Deploy Using Dashboard

1. Go to Cloudflare Dashboard → Pages
2. Click **Create project** → **Upload assets**
3. Drag and drop the `build` folder
4. Note your URL: `https://viji-matrimony.pages.dev`

---

## Custom Domain Configuration

### Step 1: Add Custom Domain to Worker

```bash
# Add custom domain
npx wrangler routes update --pattern api.yourdomain.com
```

Or via Dashboard:
1. Workers → Your Worker → Triggers
2. Custom Domains → Add Domain
3. Enter: `api.yourdomain.com`

### Step 2: Add Custom Domain to Pages

1. Cloudflare Dashboard → Pages → Your Project
2. Custom Domains → Set up a custom domain
3. Enter: `www.yourdomain.com`

### Step 3: Configure SSL/TLS

1. Go to SSL/TLS → Overview
2. Set encryption mode: **Full (strict)**
3. Enable **Always Use HTTPS**

---

## Database Migration

### Step 1: Push Schema to RDS

```bash
cd backend

# Set environment variable
export DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# Push schema (creates tables)
npx prisma db push

# Or create and run migrations
npx prisma migrate deploy
```

### Step 2: Verify Tables

```bash
# Connect to database
psql -h host -U user -d postgres

# List tables
\dt

# Should show: users, interests, messages, payments, etc.
```

### Step 3: Seed Database (Optional)

```bash
# Run seed script
npx prisma db seed

# Or manually
node prisma/seed.js
```

---

## GitHub CI/CD Setup

### Step 1: Create GitHub Repository

```bash
# Initialize git
git init
git add .
git commit -m "Initial commit: Cloudflare deployment setup"

# Create repo on GitHub, then:
git remote add origin https://github.com/your-username/viji_marimony_new.git
git branch -M main
git push -u origin main
```

### Step 2: Add Secrets to GitHub

1. Go to GitHub → Repository → Settings → Secrets
2. Add secrets:

| Secret Name | Value |
|------------|-------|
| CLOUDFLARE_API_TOKEN | Your Cloudflare API token |
| CLOUDFLARE_ACCOUNT_ID | Your Cloudflare Account ID |

### Step 3: Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      # Backend
      - name: Install backend dependencies
        run: |
          cd backend
          npm ci
          
      - name: Generate Prisma Client
        run: |
          cd backend
          npx prisma generate
          
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy
        workingDirectory: ./backend
        
      # Frontend
      - name: Install frontend dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Build frontend
        run: |
          cd frontend
          npm run build
          
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: viji-matrimony
          directory: frontend/build
```

### Step 4: Trigger Deployment

```bash
# Make a change and push
git add .
git commit -m "Deploy to production"
git push origin main
```

---

## Testing & Verification

### API Testing

```bash
# Health check
curl https://your-worker.workers.dev/

# Register user
curl -X POST https://your-worker.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "gender": "Male",
    "dateOfBirth": "1995-01-15",
    "city": "Chennai",
    "state": "Tamil Nadu",
    "maritalStatus": "Never Married"
  }'

# Login
curl -X POST https://your-worker.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

### Frontend Testing

1. Visit: `https://viji-matrimony.pages.dev`
2. Test user registration
3. Test login/logout
4. Test profile creation
5. Test search
6. Test messaging

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Symptoms:** Worker returns 500 error with database connection message

**Solutions:**
- Verify DATABASE_URL is correct
- Check AWS RDS is accessible
- Ensure SSL is enabled (`?sslmode=require`)
- Check AWS security group allows connections

```bash
# Test connection locally
psql -h your-rds-endpoint -U username -d database
```

#### 2. CORS Errors

**Symptoms:** Browser blocks API requests

**Solutions:**
- Update CORS in backend/server.js
- Add your domain to allowed origins

```javascript
// In server.js
const allowedOrigins = [
  'https://viji-matrimony.pages.dev',
  'https://yourdomain.com'
];
```

#### 3. Build Failures

**Symptoms:** Frontend build fails

**Solutions:**
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 4. Worker Timeout

**Symptoms:** Requests hang or timeout

**Solutions:**
- Check Worker logs: `npx wrangler tail`
- Reduce database queries
- Add caching with KV Store

#### 5. Out of Memory

**Symptoms:** Build process killed

**Solutions:**
- Increase Node memory limit
```bash
NODE_OPTIONS=--max_old_space_size=4096 npm run build
```

---

## Maintenance & Monitoring

### View Worker Logs

```bash
# Real-time logs
npx wrangler tail

# List deployments
npx wrangler deployments list
```

### Rollback Deployment

```bash
# List deployments and find ID
npx wrangler deployments list

# Rollback to specific version
npx wrangler rollback [deployment-id]
```

### Update Worker

```bash
# Make code changes, then redeploy
npx wrangler deploy
```

### Database Backups

```bash
# Create database backup
pg_dump -h host -U user -d database > backup.sql

# Restore backup
psql -h host -U user -d database < backup.sql
```

---

## Quick Reference Commands

### Development
```bash
# Backend dev
cd backend && npm run dev

# Frontend dev
cd frontend && npm start
```

### Build
```bash
# Frontend build
cd frontend && npm run build
```

### Deploy
```bash
# Backend
cd backend && npx wrangler deploy

# Frontend
cd frontend && npx wrangler pages deploy build
```

### Monitor
```bash
# View logs
npx wrangler tail

# Check deployments
npx wrangler deployments list
```

### Database
```bash
# Push schema
cd backend && npx prisma db push

# Create migration
cd backend && npx prisma migrate dev

# Generate Prisma client
cd backend && npx prisma generate
```

---

## Support & Resources

### Official Documentation
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Prisma Docs](https://www.prisma.io/docs/)
- [Hono Framework](https://hono.dev/)

### Community
- [Cloudflare Discord](https://discord.gg/cloudflaredev)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/cloudflare-workers)

### Project Contacts
- **Email:** vijayalakshmijayakumar45@gmail.com
- **Phone:** +91 7639150271

---

## License

MIT License - See LICENSE file for details

---

**Document Version:** 1.0  
**Last Updated:** March 2026  
**Author:** Vijayalakshmi Jayakumar
