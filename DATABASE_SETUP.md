# 🔧 Database Setup Guide

## Option 1: Local PostgreSQL (Recommended for Testing)

### Step 1: Install PostgreSQL
```bash
# On Windows (using Chocolatey)
choco install postgresql

# Or download from: https://www.postgresql.org/download/windows/
```

### Step 2: Create Database
```bash
# After installation, open SQL Shell (psql)
CREATE DATABASE boyar_matrimony;
CREATE USER postgres WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE boyar_matrimony TO postgres;
```

### Step 3: Update .env
```bash
# The .env file is already configured for local testing:
DATABASE_URL="postgresql://postgres:password@localhost:5432/boyar_matrimony"
```

### Step 4: Test Connection
```bash
cd backend
npx prisma db push
npx prisma db seed
```

---

## Option 2: AWS RDS (Production/Cloud)

### Step 1: Check RDS Instance Status
1. Go to AWS Console → RDS → Instances
2. Verify instance is "Available"
3. Check security group allows your IP address

### Step 2: Test Network Connectivity
```bash
# Test if RDS endpoint is reachable
ping viji-postgres-db.czmeo4s8s2e.ap-south-2.rds.amazonaws.com

# Test port connectivity (requires telnet)
telnet viji-postgres-db.czmeo4s8s2e.ap-south-2.rds.amazonaws.com 5432
```

### Step 3: Update .env for AWS
```bash
# Uncomment AWS RDS section in backend/.env:
POSTGRES_HOST=viji-postgres-db.czmeo4s8s2e.ap-south-2.rds.amazonaws.com
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=vijiadmindb
POSTGRES_PASSWORD=#4d#Eyb^EX(b)
POSTGRES_SSL=true

# Update DATABASE_URL with URL-encoded password
DATABASE_URL="postgresql://vijiadmindb:%234d%23Eyb%5EEX%28b%29@viji-postgres-db.czmeo4s8s2e.ap-south-2.rds.amazonaws.com:5432/postgres?sslmode=require"
```

### Step 4: Test AWS Connection
```bash
cd backend
npx prisma db push
npx prisma db seed
```

---

## 🛠️ Troubleshooting

### Local PostgreSQL Issues
```bash
# Check if PostgreSQL is running
pg_ctl status

# Start PostgreSQL service
# Windows: Services → PostgreSQL (right-click → Start)

# Check database exists
psql -U postgres -h localhost -p 5432 -c "\l"
```

### AWS RDS Issues
1. **Security Group**: Add your IP to inbound rules (port 5432)
2. **VPC Settings**: Ensure RDS is in correct VPC
3. **Password Reset**: If password is wrong, reset in AWS Console
4. **SSL Mode**: AWS RDS requires `sslmode=require`

### Connection String Testing
```bash
# Test with psql command directly
psql "postgresql://vijiadmindb:#4d#Eyb^EX(b@viji-postgres-db.czmeo4s8s2e.ap-south-2.rds.amazonaws.com:5432/postgres?sslmode=require"
```

---

## 🚀 Quick Start (Recommended)

1. **Use Local PostgreSQL** for testing (easier setup)
2. **Get full MVP running** locally
3. **Switch to AWS RDS** when ready for deployment
4. **Test AWS connectivity** with proper security settings

---

## 📞 Support if Issues Persist

- **AWS RDS**: Check instance status and security groups
- **Network**: Test with different internet connection
- **Credentials**: Verify database user permissions
- **Help**: info@vijayalakshmiboyarmatrimony.com