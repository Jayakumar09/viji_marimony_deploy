# PhonePe Payment Integration - Implementation Notes

## Project Overview
This project implements PhonePe Checkout v2 payment gateway integration with a React frontend and Node.js backend.

---

## Current Working Status ✅

### Last Updated: 2026-02-22

| Feature | Status | Notes |
|---------|--------|-------|
| PhonePe OAuth Token | ✅ Working | Client credentials flow |
| Payment Initiation | ✅ Working | Checkout v2 API |
| Payment Status Check | ✅ Working | Order status API |
| Callback Handler | ✅ Working | Server-to-server callback |
| Success Page | ✅ Working | Shows transaction details |
| Payment Mode Selection | ✅ Working | 6 payment modes |
| Direct Bank Transfer | ✅ Working | Offline payment option |
| GitHub Repository | ✅ Pushed | https://github.com/Jayakumar09/phonepe-payment |

---

## Project Structure

```
phonepe-payment/
├── config/
│   ├── phonepeConfig.js      # PhonePe configuration
│   └── plans.js              # Subscription plans
├── controllers/
│   └── paymentController.js  # Payment endpoints
├── routes/
│   └── paymentRoutes.js      # API routes
├── services/
│   └── phonepeService.js     # PhonePe API integration
├── subscription-ui/
│   └── src/
│       ├── components/
│       │   └── SuccessPage.js
│       ├── App.js            # Main UI with payment mode selection
│       └── App.css           # Styling
├── utils/
│   ├── asyncHandler.js
│   └── generateChecksum.js
├── .env.example              # Environment variables template
├── .gitignore
├── server.js                 # Express server
└── package.json
```

---

## API Endpoints

### Backend Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payment/initiate` | Initiate payment |
| GET | `/api/payment/status/:orderId` | Check payment status |
| POST | `/api/payment/callback` | PhonePe callback webhook |

### Request/Response Examples

#### Initiate Payment
```javascript
// Request
POST /api/payment/initiate
{
  "plan": "BASIC",           // BASIC | PRO | PREMIUM
  "paymentMode": "UPI"       // PAY_PAGE | UPI | CARD | WALLET | NET_BANKING | BANK_TRANSFER
}

// Response
{
  "orderId": "ORD_1234567890",
  "checkoutUrl": "https://checkout-preprod.phonepe.com/v2/pay?orderId=...",
  "merchantOrderId": "ORD_1234567890"
}
```

#### Check Payment Status
```javascript
// Request
GET /api/payment/status/ORD_1234567890

// Response
{
  "orderId": "ORD_1234567890",
  "state": "COMPLETED",
  "amount": 19900,
  "paymentMode": "UPI",
  "transactionId": "TXN123456"
}
```

---

## Payment Modes

| Mode ID | Display Name | Type |
|---------|--------------|------|
| PAY_PAGE | All Payment Methods | Online (default) |
| UPI | UPI | Online |
| CARD | Card Payment | Online |
| WALLET | Wallet | Online |
| NET_BANKING | Net Banking | Online |
| BANK_TRANSFER | Direct Bank Transfer | Offline |

---

## PhonePe API Configuration

### Environment Variables
```env
# Server
PORT=5000

# PhonePe Credentials
PHONEPE_MERCHANT_ID=your_merchant_id
PHONEPE_CLIENT_ID=your_client_id
PHONEPE_CLIENT_SECRET=your_client_secret
PHONEPE_CLIENT_VERSION=1

# API URLs
# Sandbox: https://api-preprod.phonepe.com/apis/pg-sandbox
# Production: https://api.phonepe.com/apis/pg
PHONEPE_BASE_URL=https://api-preprod.phonepe.com/apis/pg-sandbox

# Application URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

### PhonePe API Endpoints

| Purpose | Endpoint |
|---------|----------|
| OAuth Token | `POST /v1/oauth/token` |
| Create Payment | `POST /checkout/v2/pay` |
| Check Status | `GET /checkout/v2/order/{orderId}/status` |

### OAuth Token Request
```javascript
POST /v1/oauth/token
Content-Type: application/x-www-form-urlencoded

client_id=xxx
client_secret=xxx
client_version=1
grant_type=client_credentials
```

### Payment Payload
```javascript
{
  "merchantId": "MERCHANT_ID",
  "merchantOrderId": "ORD_" + Date.now(),
  "merchantUserId": "USER_" + Date.now(),
  "amount": 19900,  // Amount in paise (₹199.00)
  "redirectUrl": "http://localhost:3000/success",
  "redirectMode": "GET",
  "callbackUrl": "http://localhost:5000/api/payment/callback",
  "mobileNumber": "9999999999",
  "paymentInstrument": {
    "type": "PAY_PAGE"
  }
}
```

---

## Checkout URL Construction

PhonePe returns `orderId` in response. The checkout URL must be constructed properly:

```javascript
// For Sandbox
const checkoutUrl = `https://checkout-preprod.phonepe.com/v2/pay?orderId=${orderId}`;

// For Production
const checkoutUrl = `https://checkout.phonepe.com/v2/pay?orderId=${orderId}`;
```

**Important:** Do NOT use the API URL (`api-preprod.phonepe.com/apis/pg-sandbox`) for checkout - it will return 400 Bad Request.

---

## Bank Transfer Details (Offline Payment)

```
Account Holder Name : Vijayalakshmi
Bank Name           : State Bank of India (SBI)
Account Number      : 42238903895
IFSC Code           : SBIN0064593
```

---

## Testing in Sandbox

### Test UPI IDs
- `success@ybl` - Simulates successful payment
- `failure@ybl` - Simulates failed payment

### Test Cards
PhonePe sandbox provides test card numbers for testing card payments.

---

## Common Issues & Solutions

### Issue 1: 400 Bad Request on Checkout URL
**Cause:** Using API URL instead of checkout domain
**Solution:** Use `checkout-preprod.phonepe.com` for sandbox, not `api-preprod.phonepe.com`

### Issue 2: Transaction ID shows "Processing..."
**Cause:** PhonePe redirect didn't include transaction parameters
**Solution:** Check payment status via backend API using orderId

### Issue 3: Payment Mode shows "Online"
**Cause:** Payment mode not stored/retrieved properly
**Solution:** Store paymentMode in sessionStorage and use mapping function

---

## Implementation Checklist for New Projects

- [ ] Create PhonePe merchant account
- [ ] Get Client ID, Client Secret, Merchant ID
- [ ] Configure environment variables
- [ ] Implement OAuth token generation
- [ ] Implement payment initiation endpoint
- [ ] Implement payment status check endpoint
- [ ] Implement callback handler
- [ ] Create frontend with plan selection
- [ ] Add payment mode selection
- [ ] Create success/failure pages
- [ ] Test in sandbox environment
- [ ] Switch to production URLs

---

## Dependencies

### Backend
```json
{
  "express": "^4.x",
  "axios": "^1.x",
  "dotenv": "^16.x",
  "cors": "^2.x"
}
```

### Frontend
```json
{
  "react": "^19.x",
  "react-router-dom": "^6.x",
  "axios": "^1.x"
}
```

---

## Git Commits History

| Commit | Description |
|--------|-------------|
| `86b2839` | Initial commit: PhonePe payment integration |
| `eb102c1` | Add payment mode selection feature |
| `98d15d9` | Add Direct Bank Transfer payment option |
| `ecf1204` | Fix payment mode display on success page |

---

## References

- [PhonePe Developer Portal](https://developer.phonepe.com/)
- [PhonePe Checkout v2 Documentation](https://developer.phonepe.com/v2/docs/introduction)
- [GitHub Repository](https://github.com/Jayakumar09/phonepe-payment)

---

*This document is for reference and can be used to implement PhonePe payment integration in other projects.*
