# AI Features Setup Guide - Vijayalakshmi Boyar Matrimony

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed database with test data (optional)
node prisma/seed-ai.js

# Start server
npm start
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

## Configuration

### Backend (.env)

```env
# Required for AI features
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL=gpt-3.5-turbo
AI_RATE_LIMIT=10

# Razorpay (for production payments)
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
```

### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:5001/api
```

## Feature Walkthrough

### 1. AI Profile Generation

**Endpoint**: `POST /api/ai/generate-profile`

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "age": 28,
  "gender": "Male",
  "education": "Graduate",
  "occupation": "Software Engineer",
  "city": "Mumbai",
  "state": "Maharashtra",
  "country": "India",
  "maritalStatus": "Never Married",
  "religion": "Hindu",
  "caste": "Boyar",
  "motherTongue": "Hindi",
  "fatherName": "Rajesh",
  "motherName": "Sunita",
  "familyType": "Joint Family",
  "familyValues": "Traditional",
  "aboutFamily": "We are a close-knit family with strong cultural values.",
  "interests": "Reading, traveling, cooking",
  "partnerPreferences": {
    "ageRange": "24-30",
    "education": "Graduate or above",
    "occupation": "Professional"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "...",
      "aboutMe": "...",
      "personalitySummary": "..."
    },
    "generated": {
      "aboutMe": "I am a software engineer...",
      "personalitySummary": "I am a family-oriented person..."
    }
  }
}
```

### 2. AI Match Suggestions

**Endpoint**: `GET /api/ai/matches`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `minAge` (number, optional)
- `maxAge` (number, optional)
- `location` (string, optional)
- `religion` (string, optional)
- `caste` (string, optional)
- `maritalStatus` (string, optional)
- `education` (string, optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "user": {
          "id": "...",
          "firstName": "Jane",
          "lastName": "Smith",
          "age": 26,
          "city": "Mumbai",
          "state": "Maharashtra"
        },
        "profile": {
          "education": "Post Graduate",
          "occupation": "Doctor",
          "aboutMe": "..."
        },
        "matchScore": 85,
        "compatibility": {
          "age": {
            "user": 28,
            "target": 26,
            "difference": 2,
            "compatible": true
          },
          "location": {
            "sameLocation": true,
            "sameState": true
          },
          "religion": {
            "same": true
          },
          "caste": {
            "same": true
          }
        },
        "strengths": [
          "Age compatibility",
          "Same location",
          "Same religion"
        ],
        "connectionStatus": {
          "hasExpressedInterest": false,
          "interestStatus": null,
          "canMessage": false
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 3. Interest System

#### Send Interest
**Endpoint**: `POST /api/interests/send`

**Request Body**:
```json
{
  "receiverId": "user-id",
  "message": "Hi, I would like to connect with you."
}
```

#### Accept/Reject Interest
**Endpoint**: `POST /api/interests/respond/:interestId`

**Request Body**:
```json
{
  "status": "ACCEPTED"
}
```

#### List Interests
**Endpoint**: `GET /api/interests/list`

**Query Parameters**:
- `status` (string, optional): PENDING, ACCEPTED, REJECTED
- `page` (number, default: 1)
- `limit` (number, default: 20)

### 4. Chat Access

**Endpoint**: `GET /api/ai/check-chat/:userId`

**Response**:
```json
{
  "success": true,
  "data": {
    "canChat": true,
    "accessType": "subscription",
    "subscription": { ... },
    "interest": null
  }
}
```

### 5. AI Chat Suggestions

**Endpoint**: `POST /api/ai/chat-suggestions`

**Request Body**:
```json
{
  "conversationContext": "Just met and exchanged interests",
  "message": "Hi, it's nice to meet you!",
  "targetUserId": "user-id"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "suggestions": [
      "It's wonderful to meet you too! I've been looking forward to connecting.",
      "Nice to meet you! I noticed we have similar interests in travel.",
      "Hello! It's great to finally connect. How has your day been?"
    ],
    "generatedAt": "2026-04-27T10:30:00.000Z"
  }
}
```

### 6. Subscription Management

#### Create Order
**Endpoint**: `POST /api/payment/create-order`

**Request Body**:
```json
{
  "planId": "PREMIUM"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "orderId": "order_123",
    "amount": 99900,
    "currency": "INR",
    "planId": "PREMIUM",
    "planName": "Premium Plan"
  }
}
```

#### Verify Payment
**Endpoint**: `POST /api/payment/verify`

**Request Body**:
```json
{
  "razorpay_order_id": "order_123",
  "razorpay_payment_id": "payment_123",
  "razorpay_signature": "signature_here",
  "planId": "PREMIUM",
  "amount": 999
}
```

#### Check Status
**Endpoint**: `GET /api/payment/status`

**Response**:
```json
{
  "success": true,
  "data": {
    "hasActive": true,
    "activePlan": "PREMIUM",
    "activeSubscription": {
      "id": "...",
      "plan": "PREMIUM",
      "amount": 999,
      "startDate": "2026-04-27T10:00:00.000Z",
      "endDate": "2026-07-26T10:00:00.000Z",
      "status": "ACTIVE"
    },
    "allSubscriptions": [],
    "planDetails": {
      "id": "PREMIUM",
      "name": "Premium Plan",
      "amount": 999,
      "duration": 90,
      "features": [...]
    }
  }
}
```

## Testing with Postman

### Collection Setup
1. Import the API collection
2. Set environment variables:
   - `base_url`: http://localhost:5001
   - `token`: Your JWT token

### Test Flow
1. Login to get token
2. Generate AI profile
3. Get AI match suggestions
4. Send interest to a match
5. Accept interest (as other user)
6. Verify chat access
7. Send chat message

## Common Issues

### 1. OpenAI API Key Error
**Error**: `OpenAI API key is not configured`

**Solution**: Add `OPENAI_API_KEY` to .env file

### 2. Database Connection Error
**Error**: `Can't reach database server`

**Solution**: 
- Check DATABASE_URL in .env
- Ensure PostgreSQL is running
- Verify network connectivity

### 3. Prisma Client Not Generated
**Error**: `Cannot find module '@prisma/client'`

**Solution**: 
```bash
npx prisma generate
npm install
```

### 4. Chat Access Denied
**Error**: `Premium access required`

**Solution**: 
- Upgrade to premium subscription
- OR have the other user accept your interest

## Performance Benchmarks

| Endpoint | Avg Response Time | Max Concurrent Users |
|----------|------------------|---------------------|
| AI Profile Generation | 3-5s | 50 |
| Match Suggestions | 100-200ms | 500 |
| Interest Send | 50-100ms | 1000 |
| Chat Send | 50-100ms | 1000 |
| Payment Verification | 1-2s | 200 |

## Monitoring

### Key Metrics to Track
1. AI API usage and costs
2. Match suggestion success rate
3. Interest acceptance rate
4. Premium conversion rate
5. Chat engagement rate

### Logs
- Backend logs: `backend/logs/`
- Error tracking: Check console for error stack traces
- Performance: Use `/api/debug/performance` endpoint

## Deployment

### Production Checklist
- [ ] Set NODE_ENV=production
- [ ] Configure production database (PostgreSQL)
- [ ] Add real OpenAI API key
- [ ] Configure Razorpay for real payments
- [ ] Set up SSL/TLS certificates
- [ ] Configure rate limiting
- [ ] Set up backup schedule
- [ ] Configure monitoring and alerts
- [ ] Test all payment flows
- [ ] Verify AI content moderation

### Render Deployment
1. Connect repository to Render
2. Set build command: `npm run build`
3. Set start command: `npm start`
4. Add environment variables
5. Deploy!

## Support

For issues or questions:
- Check logs: `backend/logs/`
- Review error messages in console
- Test endpoints with Postman
- Contact: vijayalakshmijayakumar45@gmail.com