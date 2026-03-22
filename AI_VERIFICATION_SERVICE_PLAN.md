# AI Verification Service Plan

## Overview
The AI Verification module provides **automated identity verification** for the Vijayalakshmi Boyar Matrimony platform to ensure users are genuine and their submitted documents are authentic.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER SUBMISSION                              │
│  ┌──────────────────┐     ┌──────────────────┐                  │
│  │   ID Proof       │     │    Selfie        │                  │
│  │  (Aadhaar/PAN)   │     │   (Live Photo)   │                  │
│  └────────┬─────────┘     └────────┬─────────┘                  │
└───────────┼────────────────────────┼────────────────────────────┘
            │                        │
            ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AI VERIFICATION MODULE                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              AI Recommendation Service                    │   │
│  │            (Decision Engine - Coordinator)                │   │
│  └─────────────────────┬────────────────────────────────────┘   │
│                        │                                         │
│      ┌─────────────────┼─────────────────┐                      │
│      │                 │                 │                      │
│      ▼                 ▼                 ▼                      │
│  ┌───────────┐   ┌───────────┐   ┌───────────────┐             │
│  │ Document  │   │   Face    │   │    Tamper     │             │
│  │Validation │   │   Match   │   │  Detection    │             │
│  │ Service   │   │ Service   │   │   Service     │             │
│  └─────┬─────┘   └─────┬─────┘   └───────┬───────┘             │
│        │               │                 │                      │
│        ▼               ▼                 ▼                      │
│  ┌───────────┐   ┌───────────┐   ┌───────────────┐             │
│  │ Tesseract │   │   AWS     │   │    Sharp      │             │
│  │    OCR    │   │Rekognition│   │  Image Lib    │             │
│  └───────────┘   └───────────┘   └───────────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     RECOMMENDATION OUTPUT                        │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                   │
│  │ APPROVE  │    │  REVIEW  │    │  REJECT  │                   │
│  │    ✅    │    │    ⚠️    │    │    ❌    │                   │
│  │  Auto-   │    │  Manual  │    │  Ask for │                   │
│  │ Verify   │    │  Review  │    │ Re-upload│                   │
│  └──────────┘    └──────────┘    └──────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Services Implemented

### 1. Document Validation Service
**File:** `backend/ai-verification/documentValidationService.js`
**Technology:** Tesseract.js (OCR - Optical Character Recognition)

#### Supported ID Types

| ID Type | Format | Pattern | Example |
|---------|--------|---------|---------|
| Aadhaar | 12 digits | `^\d{4}\s?\d{4}\s?\d{4}$` | `1234 5678 9012` |
| PAN Card | 10 chars | `^[A-Z]{5}\d{4}[A-Z]{1}$` | `ABCDE1234F` |
| Voter ID | 10 chars | `^[A-Z]{3}\d{7}$` | `ABC1234567` |
| Driving License | 8-20 chars | `^[A-Z]{2}\d{2}\s?\d{11}$` | `TN01 20140012345` |
| Passport | 8-9 chars | `^[A-Z]{1}\d{7}$` | `J1234567` |

#### Operations
- **Text Extraction:** Uses OCR to read text from ID card images
- **Format Validation:** Validates ID number against regex patterns
- **Keyword Detection:** Checks for document-specific keywords (e.g., "AADHAAR", "PAN")
- **File Validation:** Checks file type, size, and format

#### File Constraints
```javascript
MAX_FILE_SIZES = {
  idProof: 10MB,
  selfie: 5MB,
  document: 10MB
}

ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
```

---

### 2. Face Match Service
**File:** `backend/ai-verification/faceMatchService.js`
**Technology:** AWS Rekognition (Cloud AI Service)

#### Operations
- **Face Detection:** Detects faces in selfie and ID card
- **Face Comparison:** Compares facial features using AI
- **Quality Check:** Analyzes brightness, sharpness, face size
- **Confidence Scoring:** Returns match confidence (0-100%)

#### Confidence Thresholds

| Score | Result | Action |
|-------|--------|--------|
| ≥90% | HIGH_CONFIDENCE | Auto-approve |
| 80-90% | MEDIUM_CONFIDENCE | Manual review recommended |
| <80% | LOW_CONFIDENCE | Likely rejection |

#### Quality Requirements
```javascript
QUALITY_REQUIREMENTS = {
  minFaceSize: 50,      // pixels
  minBrightness: 40,
  maxBrightness: 220,
  minSharpness: 50
}
```

#### AWS Configuration Required
```env
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

---

### 3. Tamper Detection Service
**File:** `backend/ai-verification/tamperDetectionService.js`
**Technology:** Sharp (Node.js Image Processing)

#### Detection Methods

| Method | Description | Weight |
|--------|-------------|--------|
| Metadata Analysis | Checks file headers, EXIF data | High |
| File Signature Validation | Ensures extension matches format | Critical |
| Compression Analysis | Detects unusual artifacts | Medium |
| Edge Detection | Finds manipulation edges | High |
| Noise Analysis | Identifies inconsistent patterns | Medium |
| Color Consistency | Checks unnatural variations | Medium |

#### Risk Levels

| Score | Risk Level | Action |
|-------|------------|--------|
| <20% | LOW | Accept document |
| 20-45% | MEDIUM | Flag for review |
| 45-70% | HIGH | Likely reject |
| >70% | CRITICAL | Auto-reject |

#### Tamper Indicators
```javascript
TAMPER_INDICATORS = {
  METADATA_INCONSISTENCY,
  COMPRESSION_ARTIFACTS,
  EDGE_ANOMALIES,
  COLOR_INCONSISTENCIES,
  TEXT_ANOMALIES,
  CLONING_DETECTED,
  RESAMPLING_ARTIFACTS,
  NOISE_INCONSISTENCY,
  EXIF_MISSING,
  SUSPICIOUS_EDITING
}
```

---

### 4. AI Recommendation Service
**File:** `backend/ai-verification/aiRecommendationService.js`
**Technology:** Internal Decision Engine

#### Risk Weights
```javascript
RISK_WEIGHTS = {
  documentValidation: 0.20,  // 20% weight
  faceMatch: 0.40,           // 40% weight (most important)
  tamperDetection: 0.40      // 40% weight
}
```

#### Confidence Thresholds
```javascript
CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,    // ≥85% → APPROVE
  MEDIUM: 0.65,  // 65-85% → REVIEW
  LOW: 0.45      // <65% → REJECT
}
```

#### Output Recommendations

| Recommendation | Confidence | Meaning | Action |
|----------------|------------|---------|--------|
| `APPROVE` | ≥85% | High confidence genuine | Auto-verify user |
| `REVIEW` | 65-85% | Uncertain result | Send to admin for manual review |
| `REJECT` | <65% | High fraud risk | Reject document, ask for re-upload |

---

## API Endpoints

### Submit Verification
```
POST /api/verification/submit
Content-Type: multipart/form-data

Body:
- idProof: File (ID card image)
- selfie: File (Live selfie)
- idType: String (AADHAAR|PAN|VOTER_ID|DRIVING_LICENSE|PASSPORT)
- idNumber: String

Response:
{
  "success": true,
  "verificationId": "verify_xxx",
  "status": "PENDING|APPROVED|REJECTED|REVIEW",
  "recommendation": {
    "recommendation": "APPROVE|REVIEW|REJECT",
    "confidence": 0.92,
    "riskScore": 0.08,
    "flags": [],
    "details": {
      "documentValidation": {...},
      "faceMatch": {...},
      "tamperDetection": {...}
    }
  }
}
```

### Get Verification Status
```
GET /api/verification/status/:id

Response:
{
  "id": "verify_xxx",
  "status": "APPROVED",
  "recommendation": "APPROVE",
  "confidence": 0.92,
  "processedAt": "2026-02-24T10:00:00Z"
}
```

---

## Workflow Sequence

```
User                Frontend             Backend              AI Module           AWS
  │                    │                    │                    │                 │
  │ Upload ID + Selfie │                    │                    │                 │
  ├───────────────────>│                    │                    │                 │
  │                    │ POST /verification │                    │                 │
  │                    ├───────────────────>│                    │                 │
  │                    │                    │ processVerification│                 │
  │                    │                    ├───────────────────>│                 │
  │                    │                    │                    │ OCR Extract     │
  │                    │                    │                    ├────────────────>│
  │                    │                    │                    │ Face Compare    │
  │                    │                    │                    ├────────────────>│
  │                    │                    │                    │ Tamper Analyze  │
  │                    │                    │                    ├────────────────>│
  │                    │                    │                    │                 │
  │                    │                    │ Recommendation     │                 │
  │                    │                    │<───────────────────┤                 │
  │                    │ Result             │                    │                 │
  │                    │<───────────────────┤                    │                 │
  │ Verification Result│                    │                    │                 │
  │<───────────────────┤                    │                    │                 │
  │                    │                    │                    │                 │
```

---

## Environment Configuration

```env
# AI Verification Settings
AI_VERIFICATION_ENABLED=true
AI_CONFIDENCE_THRESHOLD=0.85
AI_FACE_MATCH_THRESHOLD=0.90
AI_TAMPER_THRESHOLD=0.20

# AWS Rekognition (for Face Match)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# OCR Language Support
TESSERACT_LANGUAGE=eng+hin

# Rate Limiting
AI_RATE_LIMIT_MAX=10
AI_RATE_LIMIT_WINDOW=60000
```

---

## Current Implementation Status

| Service | Status | Provider | Notes |
|---------|--------|----------|-------|
| Document Validation | ✅ Active | Tesseract.js | English + Hindi OCR |
| Face Match | ⚠️ Not Configured | AWS Rekognition | Requires AWS credentials |
| Tamper Detection | ✅ Active | Sharp | Fully functional |
| AI Recommendation | ✅ Active | Internal | Decision engine working |

---

## Future Enhancements

### Phase 1 (Current)
- [x] Document validation with OCR
- [x] Tamper detection
- [x] AI recommendation engine
- [ ] AWS Rekognition integration (needs credentials)

### Phase 2 (Planned)
- [ ] Liveness detection (prevent photo spoofing)
- [ ] Video KYC support
- [ ] Multi-document verification
- [ ] Background check integration

### Phase 3 (Future)
- [ ] Blockchain-based verification records
- [ ] AI-powered profile matching
- [ ] Fraud pattern detection

---

## Admin Panel Integration

The verification results are displayed in the Admin Panel under the "Verification" section:

1. **Pending Verifications:** List of users awaiting verification
2. **Verification Details:** Shows all analysis results
3. **Manual Override:** Admin can approve/reject regardless of AI recommendation
4. **Audit Trail:** All verification decisions are logged

---

## Security Considerations

1. **Data Privacy:** ID documents are stored securely and deleted after verification
2. **Rate Limiting:** Prevents abuse of verification API
3. **Encryption:** Sensitive data encrypted at rest
4. **Access Control:** Only authorized admins can view verification details
5. **Audit Logging:** All verification actions are logged

---

## Cost Estimation (AWS Rekognition)

| Operation | Cost per 1000 requests |
|-----------|------------------------|
| Face Detection | $0.001 |
| Face Comparison | $0.005 |
| Face Indexing | $0.005 |

**Estimated Monthly Cost:** ~$5-10 for 1000 verifications

---

## Support & Documentation

- **API Documentation:** `/api/docs` (when running server)
- **Health Check:** `GET /api/verification/health`
- **Service Status:** `GET /api/verification/status`

---

*Last Updated: February 24, 2026*
*Version: 2.0.0*
