# Deployment Guide: Vijayalakshmi Boyar Matrimony App

## Cloudflare Pages + Workers with Prisma and AWS PostgreSQL

---

## Prerequisites

1. **Cloudflare Account** - Sign up at https://cloudflare.com
2. **AWS RDS PostgreSQL** - Your existing database
3. **Node.js 18+** - Required for Cloudflare Workers

---

## Step 1: Update Environment Variables

### Backend Production (.env.production)

Update `backend/.env.production` with your actual values:

```env
# Database - AWS RDS PostgreSQL
DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require"

# JWT Secret (generate a strong random string)
JWT_SECRET=your-secure-jwt-secret-min-32-chars

# Update other secrets with real values
```

### Frontend Production (.env.production)

```env
REACT_APP_API_URL=https://your-worker.your-subdomain.workers.dev/api
NODE_ENV=production
```

---

## Step 2: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies  
cd ../frontend
npm install
```

---

## Step 3: Generate Prisma Client

```bash
cd backend
npx prisma generate
```

---

## Step 4: Deploy to Cloudflare Workers

### Option A: Deploy Backend API

```bash
cd backend

# Login to Cloudflare
npx wrangler login

# Deploy to production
npx wrangler deploy
```

### Option B: Deploy with Secrets

```bash
# Set secrets (required for production)
npx wrangler secret put DATABASE_URL
# Enter: postgresql://user:pass@host:5432/db?sslmode=require

npx wrangler secret put JWT_SECRET
# Enter: your-jwt-secret

npx wrangler secret put ENCRYPTION_KEY
# Enter: your-32-char-encryption-key
```

---

## Step 5: Deploy Frontend to Cloudflare Pages

### Option A: Using Wrangler

```bash
cd frontend

# Build the React app
npm run build

# Deploy using wrangler
npx wrangler pages deploy build
```

### Option B: Using Cloudflare Dashboard

1. Go to Cloudflare Dashboard > Pages
2. Connect to GitHub or upload directly
3. Set build settings:
   - Build command: `npm run build`
   - Build output directory: `build`
4. Add environment variable: `REACT_APP_API_URL`

---

## Step 6: Configure Custom Domain (Optional)

1. Go to Cloudflare Dashboard > Workers
2. Click on your worker > Triggers
3. Add custom domain

---

## Project Structure

```
viji_marimony_new/
├── backend/
│   ├── src/
│   │   ├── worker.js          # Cloudflare Worker entry
│   │   ├── lib/
│   │   │   ├── db.js          # Prisma database client
│   │   │   └── prisma.js      # Prisma singleton
│   │   └── routes/            # Hono API routes
│   ├── prisma/
│   │   └── schema.prisma      # PostgreSQL schema
│   ├── wrangler.toml          # Cloudflare config
│   ├── .env.production        # Production env vars
│   └── server.js              # Express server (dev)
├── frontend/
│   ├── public/
│   │   └── _redirects         # SPA routing
│   ├── src/
│   │   └── services/api.js    # API configuration
│   └── .env.production        # Frontend production env
└── DEPLOYMENT.md              # This file
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Profiles
- `GET /api/profile` - List profiles
- `GET /api/profile/:id` - Get profile
- `PUT /api/profile/update` - Update profile

### Search
- `POST /api/search` - Advanced search
- `GET /api/search/quick` - Quick search

### Messages
- `GET /api/message/:userId` - Get messages
- `POST /api/message` - Send message

### Interests
- `POST /api/interest` - Send interest
- `GET /api/interest/sent` - Sent interests
- `GET /api/interest/received` - Received interests

### Payments
- `POST /api/payments/create-order` - Create order
- `POST /api/payments/verify` - Verify payment
- `GET /api/payments/history` - Payment history

### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/users` - List users
- `POST /api/admin/users/:id/verify` - Verify user

---

## Troubleshooting

### Database Connection Issues
- Ensure AWS RDS security group allows Cloudflare IPs
- Use `?sslmode=require` in DATABASE_URL
- Check IAM credentials for RDS

### CORS Errors
- Update CORS settings in server.js for production domain
- Add your Cloudflare Pages URL to allowed origins

### Build Errors
- Clear node_modules and reinstall
- Ensure Node.js version is 18+

---

## Support

For issues, contact: vijayalakshmijayakumar45@gmail.com
