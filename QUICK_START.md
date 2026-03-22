# 🚀 QUICK START GUIDE - Database Solutions

## 🎯 **IMMEDIATE TESTING** (5 minutes)

### Option A: Docker PostgreSQL (Easiest)
```bash
# Install Docker (if not installed)
# Then run:
docker run -d --name postgres-test \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=boyar_matrimony \
  -p 5432:5432 \
  postgres:13

# Update .env:
DATABASE_URL="postgresql://postgres:password@localhost:5432/boyar_matrimony"

# Test:
cd backend && npx prisma db push && npx prisma db seed
```

### Option B: Modify Schema for SQLite (Quick but limited)
```bash
# Remove unsupported features from schema.prisma:
- Delete all "enum" types
- Change "photos" from "String[]" to "String" (or remove)
- Change "amount" from "Decimal" to "Float"
- Save and run: npx prisma db push
```

---

## 🔧 **RECOMMENDED PATH** (Production Ready)

### Step 1: AWS RDS Diagnosis
```bash
# 1. Check if RDS exists and is running
aws rds describe-db-instances --db-instance-identifier viji-postgres-db

# 2. Check security group
aws ec2 describe-security-groups --group-ids sg-xxxxxxxxx

# 3. Test connectivity from different network
ping -c 3 viji-postgres-db.czmeo4s8s2e.ap-south-2.rds.amazonaws.com
```

### Step 2: Fix Common RDS Issues
```bash
# If RDS exists but not reachable:
# 1. Add your IP to security group inbound rules:
#    Port: 5432, Source: 0.0.0.0/0 (for testing)

# 2. Or create new security group:
aws ec2 create-security-group --group-name boyar-matrimony-db --description "For matrimony app"
aws ec2 authorize-security-group-ingress --group-name boyar-matrimony-db --protocol tcp --port 5432 --cidr 0.0.0.0/0

# 3. Update RDS to use new security group
```

### Step 3: Update Application Configuration
```bash
# Update backend/.env:
DATABASE_URL="postgresql://vijiadmindb:%234d%23Eyb%5EEX%28b%29@viji-postgres-db.czmeo4s8s2e.ap-south-2.rds.amazonaws.com:5432/postgres?sslmode=require"

# Test connection:
cd backend
npx prisma db push
npx prisma db seed
```

---

## 🆘 **ALTERNATIVE DATABASES** (If AWS Issues Persist)

### Option 1: Neon PostgreSQL (Free Cloud)
```bash
# 1. Go to: https://neon.tech/
# 2. Create free PostgreSQL database
# 3. Get connection string
# 4. Update .env:
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require"

# 5. Test:
npx prisma db push
```

### Option 2: Supabase PostgreSQL (Free Cloud)
```bash
# 1. Go to: https://supabase.com/
# 2. Create new project
# 3. Get connection string from settings
# 4. Update .env
# 5. Test with prisma
```

---

## 🎮 **TESTING AFTER DATABASE SETUP**

### 1. Verify Database Connection
```bash
cd backend
npx prisma studio  # Opens browser at http://localhost:5555
# Should show tables with data if seed worked
```

### 2. Start Development Servers
```bash
cd ..
npm run dev
# Should see:
# Frontend: http://localhost:3000
# Backend:  http://localhost:5001
```

### 3. Test User Registration
1. Go to http://localhost:3000/register
2. Create test user
3. Verify profile creation works

### 4. Test All Features
1. ✅ User login/logout
2. ✅ Profile creation with photos
3. ✅ Search functionality
4. ✅ Interest system
5. ✅ Messaging between users

---

## 🆘 **QUICK DATABASE BACKUP PLANS**

### If AWS RDS is not accessible now:
1. **Use Docker PostgreSQL** for immediate testing
2. **Switch to Neon/Supabase** for cloud database
3. **Fix AWS RDS** when time permits
4. **Migrate data** later if needed

### Recommended Sequence:
```
Docker PostgreSQL → Test Features → Fix AWS RDS → Production Deploy
     (5 min)         (30 min)       (whenever)      (later)
```

---

## 📞 **HELP IS AVAILABLE**

**Database Setup Issues**:
- Check: https://docs.prisma.io/getting-started
- Docker: https://hub.docker.com/_/postgres
- Cloud alternatives: Neon.tech, Supabase.com

**Application Issues**:
- Email: info@vijayalakshmiboyarmatrimony.com
- Phone: +91 7639150271
- GitHub: Create issue in repository

**Choose the database option that works best for your current situation!** 🚀