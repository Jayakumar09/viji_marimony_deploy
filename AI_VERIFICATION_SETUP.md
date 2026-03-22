# AI Verification Module - Installation & Setup Guide

This guide covers the complete setup for the production AI verification system in Vijayalakshmi Boyar Matrimony.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [AWS Setup](#aws-setup)
4. [Environment Configuration](#environment-configuration)
5. [Testing](#testing)
6. [API Usage](#api-usage)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements
- Node.js 18.x or higher
- npm 9.x or higher
- 4GB+ RAM (for Tesseract OCR)
- 10GB+ disk space (for OCR language data)

### AWS Account Requirements
- AWS Account with access to:
  - Amazon Rekognition
  - Amazon S3 (optional, for large file handling)
- IAM user with appropriate permissions

---

## Installation

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

This will install the following AI-related packages:
- `@aws-sdk/client-rekognition` - AWS Rekognition for face matching
- `@aws-sdk/client-s3` - AWS S3 for file storage (optional)
- `tesseract.js` - OCR for document text extraction
- `sharp` - Image processing and tamper detection
- `uuid` - Unique identifier generation

### Step 2: Verify Installation

```bash
# Check if all packages are installed
npm list @aws-sdk/client-rekognition tesseract.js sharp
```

---

## AWS Setup

### Step 1: Create IAM User

1. Go to AWS Console → IAM → Users → Create User
2. User name: `boyar-matrimony-ai`
3. Select "Programmatic access"
4. Attach the following policies:
   - `AmazonRekognitionFullAccess`
   - `AmazonS3FullAccess` (if using S3)

### Step 2: Create Access Keys

1. Go to the created user → Security Credentials
2. Create Access Key
3. **Save the Access Key ID and Secret Access Key securely**

### Step 3: Create Rekognition Collection

The collection will be created automatically on first use, or you can create it manually:

```bash
aws rekognition create-collection \
  --collection-id boyar-matrimony-faces \
  --region ap-south-1
```

### Step 4: Configure AWS CLI (Optional)

```bash
aws configure
# Enter your Access Key ID
# Enter your Secret Access Key
# Default region: ap-south-1
# Default output format: json
```

---

## Environment Configuration

Add the following to your `.env` file:

```env
# ===========================================
# AI VERIFICATION CONFIGURATION
# ===========================================

# AWS Configuration for Rekognition (Face Matching)
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=ap-south-1
AWS_REKOGNITION_COLLECTION_ID=boyar-matrimony-faces

# AWS S3 Bucket for temporary image storage (optional)
AWS_S3_BUCKET=your-s3-bucket-name

# AI Verification Settings
AI_VERIFICATION_ENABLED=true
AI_CONFIDENCE_THRESHOLD=0.85
AI_FACE_MATCH_THRESHOLD=0.90
AI_TAMPER_THRESHOLD=0.30

# Rate Limiting for AI endpoints (requests per minute)
AI_RATE_LIMIT=10

# Tesseract OCR Language (for Indian documents)
TESSERACT_LANGUAGE=eng+hin
```

### Environment Variables Explained

| Variable | Description | Default |
|----------|-------------|---------|
| `AI_VERIFICATION_ENABLED` | Enable/disable AI verification | `true` |
| `AI_CONFIDENCE_THRESHOLD` | Minimum confidence for auto-approval | `0.85` |
| `AI_FACE_MATCH_THRESHOLD` | Minimum similarity for face match | `0.90` |
| `AI_TAMPER_THRESHOLD` | Maximum tamper score for approval | `0.30` |
| `AI_RATE_LIMIT` | Max AI requests per minute per user | `10` |
| `TESSERACT_LANGUAGE` | OCR languages (eng=English, hin=Hindi) | `eng+hin` |

---

## Testing

### Test AI Services Status

```bash
# Start the server
npm run dev

# Test AI status endpoint
curl http://localhost:5001/api/verification/ai/status
```

Expected response:
```json
{
  "status": "operational",
  "version": "2.0.0",
  "aiEnabled": true,
  "services": {
    "documentValidation": { "status": "active", "provider": "Tesseract.js" },
    "faceMatch": { "status": "active", "provider": "AWS Rekognition" },
    "tamperDetection": { "status": "active", "provider": "Sharp" }
  }
}
```

### Test OCR Extraction

```javascript
// test-ocr.js
const ai = require('./ai-verification');

async function testOCR() {
  const result = await ai.extractText('./test-id-card.jpg');
  console.log('Extracted Text:', result.text);
  console.log('Confidence:', result.confidence);
}

testOCR();
```

### Test Face Comparison

```javascript
// test-face.js
const ai = require('./ai-verification');

async function testFace() {
  const result = await ai.compareFaces('./id-photo.jpg', './selfie.jpg');
  console.log('Match:', result.match);
  console.log('Confidence:', result.confidence);
  console.log('Recommendation:', result.recommendation);
}

testFace();
```

---

## API Usage

### Process Full Verification

```javascript
const aiVerification = require('./ai-verification');

// Process complete verification
const result = await aiVerification.processVerification({
  file: uploadedFile,           // Multer file object
  idNumber: '123456789012',     // User-provided ID number
  idType: 'AADHAAR',            // ID type
  selfiePath: '/path/to/selfie.jpg',
  idImagePath: '/path/to/id.jpg'
});

console.log('Recommendation:', result.recommendation);
// Output: 'APPROVE', 'REVIEW', or 'REJECT'

console.log('Confidence:', result.confidence);
// Output: 0.0 - 1.0

console.log('Flags:', result.flags);
// Output: Array of warning/error messages
```

### Quick Validation

```javascript
// Fast validation without face comparison
const result = await aiVerification.quickValidation({
  file: uploadedFile,
  idNumber: 'ABCDE1234F',
  idType: 'PAN'
});
```

### Individual Services

```javascript
// Validate ID format only
const validation = aiVerification.validateIdFormat('123456789012', 'AADHAAR');

// Check for tampering
const tamperResult = await aiVerification.checkTampering('/path/to/document.jpg');

// Compare faces
const faceResult = await aiVerification.compareFaces('/path/to/id.jpg', '/path/to/selfie.jpg');

// Extract text from document
const ocrResult = await aiVerification.extractText('/path/to/document.jpg');
```

---

## Supported ID Types

| ID Type | Code | Format |
|---------|------|--------|
| Aadhaar | `AADHAAR` | 12-digit number |
| PAN Card | `PAN` | ABCDE1234F |
| Voter ID | `VOTER_ID` | ABC1234567 |
| Driving License | `DRIVING_LICENSE` | TN01 20140012345 |
| Passport | `PASSPORT` | J1234567 |

---

## Troubleshooting

### Common Issues

#### 1. AWS Rekognition Not Configured

**Error:** `AWS Rekognition not configured`

**Solution:**
```bash
# Check environment variables
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY

# Verify AWS credentials
aws sts get-caller-identity
```

#### 2. Tesseract OCR Slow

**Issue:** OCR takes too long

**Solution:**
- First run downloads language data (~50MB)
- Subsequent runs are faster
- Consider pre-loading languages:
```javascript
await aiVerification.initialize();
```

#### 3. Memory Issues

**Error:** `JavaScript heap out of memory`

**Solution:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm start
```

#### 4. Rate Limit Exceeded

**Error:** `Too many AI verification requests`

**Solution:**
- Wait 1 minute before retrying
- Adjust `AI_RATE_LIMIT` in `.env`
- Check rate limit middleware configuration

#### 5. Image Format Not Supported

**Error:** `Unsupported image format`

**Solution:**
- Convert image to JPEG, PNG, or WebP
- Ensure file extension matches content type
- Check file size is under 10MB

### Debug Mode

Enable detailed logging:

```env
NODE_ENV=development
DEBUG=ai-verification:*
```

### Health Check

```bash
# Check all AI services
curl http://localhost:5001/api/verification/ai/status

# Check specific service
curl http://localhost:5001/api/verification/ai/status/face-match
```

---

## Cost Estimation (AWS)

### Rekognition Pricing (ap-south-1)

| Service | Price per 1000 units |
|---------|---------------------|
| Face Detection | $0.001 |
| Face Comparison | $0.005 |
| Face Indexing | $0.005 |

### Estimated Monthly Cost

For 1000 verifications/month:
- Face Detection: ~$0.01
- Face Comparison: ~$5.00
- **Total: ~$5.01/month**

---

## Security Best Practices

1. **Never commit AWS credentials** to version control
2. **Use IAM roles** in production (not access keys)
3. **Enable AWS CloudTrail** for audit logging
4. **Rotate access keys** every 90 days
5. **Use rate limiting** to prevent abuse
6. **Encrypt sensitive data** at rest and in transit

---

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review AWS CloudWatch logs
- Contact: support@vijayalakshmiboyarmatrimony.com

---

**Last Updated:** February 2026
**Version:** 2.0.0
