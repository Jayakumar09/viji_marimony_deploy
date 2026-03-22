#!/bin/bash

echo "🔧 DATABASE SETUP SCRIPT FOR VIJAYALAKSHMI BOYAR MATRIMONY"
echo "=================================================="

echo ""
echo "📋 OPTIONS:"
echo "1. Local PostgreSQL (Recommended for development)"
echo "2. AWS RDS PostgreSQL (Production cloud database)"
echo "3. Create new AWS RDS instance"
echo ""
read -p "Choose database option (1-3): " choice

case $choice in
  1)
    echo "🏠 Setting up Local PostgreSQL..."
    
    # Check if PostgreSQL is installed
    if ! command -v psql &> /dev/null; then
        echo "❌ PostgreSQL not found. Installing..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install postgresql
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get install postgresql postgresql-contrib
        else
            echo "📥 Please download PostgreSQL from: https://www.postgresql.org/download/"
        fi
    fi
    
    echo "🔧 Configuring local database..."
    echo "CREATE DATABASE boyar_matrimony;" | sudo -u postgres psql
    echo "CREATE USER postgres WITH PASSWORD 'password';" | sudo -u postgres psql
    echo "GRANT ALL PRIVILEGES ON DATABASE boyar_matrimony TO postgres;" | sudo -u postgres psql
    
    # Update .env for local use
    sed -i 's|DATABASE_URL=.*|DATABASE_URL="postgresql://postgres:password@localhost:5432/boyar_matrimony"|g' ../backend/.env
    
    echo "✅ Local PostgreSQL configured!"
    ;;
    
  2)
    echo "☁️  Testing AWS RDS Connection..."
    
    # Test network connectivity
    if ping -c 3 viji-postgres-db.czmeo4s8s2e.ap-south-2.rds.amazonaws.com &> /dev/null; then
        echo "✅ RDS endpoint reachable"
        
        # Test PostgreSQL connection
        if psql "postgresql://vijiadmindb:#4d#Eyb^EX(b@viji-postgres-db.czmeo4s8s2e.ap-south-2.rds.amazonaws.com:5432/postgres?sslmode=require" -c "SELECT 1;" &> /dev/null; then
            echo "✅ Database connection successful!"
            
            # Update .env for AWS
            sed -i 's|DATABASE_URL=.*|DATABASE_URL="postgresql://vijiadmindb:%234d%23Eyb%5EEX%28b%29@viji-postgres-db.czmeo4s8s2e.ap-south-2.rds.amazonaws.com:5432/postgres?sslmode=require"|g' ../backend/.env
            
            echo "🚀 Ready to run Prisma commands!"
        else
            echo "❌ Database connection failed. Check:"
            echo "   - RDS instance status in AWS console"
            echo "   - Security group allows your IP"
            echo "   - Credentials are correct"
        fi
    else
        echo "❌ Cannot reach RDS endpoint. Check:"
        echo "   - Internet connection"
        echo "   - RDS instance is running"
        echo "   - Correct AWS region"
    fi
    ;;
    
  3)
    echo "🆕 Creating new AWS RDS instance..."
    echo "📖 Follow these steps:"
    echo "   1. Go to AWS Console → RDS"
    echo "   2. Click 'Create Database'"
    echo "   3. Choose PostgreSQL"
    echo "   4. Dev/Test environment"
    echo "   5. Instance class: db.t3.micro (free tier)"
    echo "   6. Multi-AZ: No"
    echo "   7. Storage: 20GB GP2"
    echo "   8. VPC: Default"
    echo "   9. Username: vijiadmindb"
    echo "   10. Password: #4d#Eyb^EX(b"
    echo "   11. Database name: postgres"
    echo "   12. Backup retention: 7 days"
    echo "   13. Enable deletion protection"
    echo ""
    echo "📧 Once created, note:"
    echo "   - Endpoint (hostname)"
    echo "   - Security group settings"
    echo "   - Add your IP to inbound rules (port 5432)"
    ;;
    
  *)
    echo "❌ Invalid option"
    exit 1
    ;;
esac

echo ""
echo "🧪 Next Steps:"
echo "   cd backend"
echo "   npx prisma db push"
echo "   npx prisma db seed"
echo "   cd .. && npm run dev"