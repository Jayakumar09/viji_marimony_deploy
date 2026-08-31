# AI-Powered Matrimony Platform - Implementation Guide

## Overview
This implementation adds AI-powered features to the existing Vijayalakshmi Boyar Matrimony platform while preserving all existing functionality.

## New Features

### 1. AI Profile Generation (`POST /api/ai/generate-profile`)
- Generates culturally appropriate "About Me" and personality summaries
- Uses OpenAI GPT-3.5-turbo
- Respects South Asian matrimonial values
- Automatically saves generated profiles

### 2. AI Match Suggestions (`GET /api/ai/matches`)
- Algorithm-based matching considering:
  - Age compatibility (±10 years)
  - Location (same city/state)
  - Religion and caste
  - Education level
  - Marital status
  - Occupation compatibility
- Returns match scores (0-100)
- Detailed compatibility breakdown

### 3. Interest System (`/api/interests/*`)
- Send/receive interest requests
- Accept/reject interests
- Mutual interest unlocks chat capability
- Prevents duplicate requests

### 4. Premium Subscription Integration (`/api/payment/*`)
- Razorpay integration ready
- Three plans: FREE, PREMIUM, VIP
- Chat access control:
  - FREE: Limited (requires accepted interest)
  - PREMIUM: Unlimited chat + contact details
  - VIP: Priority + featured profile + AI matchmaking

### 5. AI Chat Assistant (`POST /api/ai/chat-suggestions`)
- Generates 3 polite response suggestions
- Culturally appropriate
- Context-aware

### 6. Content Moderation
- Real-time profanity filtering
- Suspicious pattern detection (phone numbers, external links)
- Auto-flagging of inappropriate content

## Database Changes

### New Tables
```sql
-- Profiles table for AI-enhanced data
CREATE TABLE profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE REFERENCES users(id),
    gender TEXT,
    dob TIMESTAMP,
    age INTEGER,
    religion TEXT,
    caste TEXT,
    mother_tongue TEXT,
    marital_status TEXT,
    education TEXT,
    occupation TEXT,
    income TEXT,
    location TEXT,
    about_me TEXT,
    partner_preferences JSONB,
    photo_urls TEXT[],
    is_verified BOOLEAN DEFAULT false
);

-- Interest requests (already existed, now enhanced)
CREATE TABLE interests (
    id TEXT PRIMARY KEY,
    sender_id TEXT REFERENCES users(id),
    receiver_id TEXT REFERENCES users(id),
    status TEXT DEFAULT 'PENDING',
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions for premium features
CREATE TABLE subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    plan TEXT,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    status TEXT DEFAULT 'ACTIVE',
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT
);
```

## API Endpoints

### AI Features
- `POST /api/ai/generate-profile` - Generate AI profile
- `GET /api/ai/profile` - Get AI profile
- `PUT /api/ai/profile` - Update AI profile
- `GET /api/ai/matches` - Get AI match suggestions
- `GET /api/ai/matches/:userId` - Detailed match analysis
- `POST /api/ai/chat-suggestions` - AI chat responses
- `GET /api/ai/check-chat/:userId` - Check chat access

### Interest System
- `POST /api/interests/send` - Send interest
- `POST /api/interests/respond/:id` - Accept/reject interest
- `GET /api/interests/list` - List received interests
- `GET /api/interests/sent` - List sent interests
- `GET /api/interests/stats` - Interest statistics

### Payment
- `POST /api/payment/create-order` - Create Razorpay order
- `POST /api/payment/verify` - Verify payment
- `POST /api/payment/webhook` - Razorpay webhook
- `GET /api/payment/status` - Check subscription status

### Chat (Enhanced)
- `POST /api/message/send` - User-to-user chat
- `GET /api/message/conversations` - Chat list
- `GET /api/message/chat/:userId` - Chat with user

## Frontend Pages

### New Pages
- `src/pages/Matches.js` - AI match suggestions with filters
- `src/pages/AIProfile.js` - AI profile generation/editing
- `src/pages/UserChat.js` - User-to-user chat (enhanced)

### Updated Pages
- `src/pages/Interests.js` - Interest management
- `src/pages/Profile.js` - Profile with AI suggestions
- `src/components/Header.js` - New navigation items

## Environment Variables

Add to `.env`:
```
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-3.5-turbo

# Razorpay Configuration (for production)
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# AI Rate Limiting
AI_RATE_LIMIT=10
```

## Installation

1. Install backend dependencies:
```bash
cd backend
npm install openai razorpay express-rate-limit
npx prisma generate
npx prisma db push
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

## Running the Application

1. Start backend:
```bash
cd backend
npm start
```

2. Start frontend:
```bash
cd frontend
npm start
```

## Testing

### Test AI Profile Generation
1. Login to the application
2. Navigate to "AI Profile" page
3. Fill in basic information
4. Click "AI Generate"
5. Review and save generated content

### Test AI Matches
1. Generate AI profile first
2. Navigate to "AI Matches" page
3. Adjust filters if needed
4. View matching suggestions with scores

### Test Interest System
1. Find a user in search
2. Click "Send Interest"
3. Have the other user accept/reject
4. Chat becomes available if accepted

### Test Premium Features
1. Navigate to subscription page
2. Choose a plan
3. Complete payment (test mode)
4. Chat and contact features unlock

## Security Considerations

1. **Rate Limiting**: AI endpoints limited to 10 requests per 15 minutes per user
2. **Content Moderation**: All messages filtered for profanity and suspicious content
3. **Access Control**: Chat requires premium subscription OR accepted interest
4. **Data Validation**: All inputs validated with Zod/Joi
5. **HTTPS**: Required for production (especially payment)

## Performance Optimization

1. **Caching**: Redis for frequently accessed data
2. **Database Indexes**: Added on frequently queried fields
3. **Pagination**: All list endpoints support pagination
4. **Prisma Client**: Connection pooling enabled

## Scalability

1. **Microservices Ready**: Services can be split into separate containers
2. **Queue Support**: AI operations can be queued (Bull/RabbitMQ)
3. **CDN Ready**: Static assets served via CDN
4. **Database Sharding**: Ready for user growth

## Future Enhancements

1. **Machine Learning**: Custom match prediction model
2. **Video Verification**: AI-powered identity verification
3. **Language Translation**: Multi-language support (Tamil, Hindi, etc.)
4. **Mobile App**: Native iOS/Android apps
5. **WhatsApp Integration**: Notifications and chat
6. **Advanced Analytics**: User behavior and match success tracking

## Support

For issues or questions:
- Contact: vijayalakshmijayakumar45@gmail.com
- Documentation: See inline code comments
- API Docs: Swagger/OpenAPI (can be added)

## License

MIT License - See LICENSE file for details