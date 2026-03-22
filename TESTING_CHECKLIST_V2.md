# VijayaLakshmi Boyar Matrimony - Testing Checklist V2

## Project Status: TESTING IN PROGRESS
- **Last Updated:** 2026-03-07
- **Cloud Storage:** Cloudinary (do6o1xqs1) ✅
- **Database:** SQLite ✅
- **Key Rule:** ALL DATA MUST BE IN CLOUD/DATABASE - NO LOCAL FOLDER STORAGE

---

## CRITICAL VERIFICATION - Cloudinary Only Storage

| # | Check Item | Status | Notes |
|---|------------|--------|-------|
| 1 | No local uploads folder used for user data | [ ] | backend/uploads should NOT exist or be empty |
| 2 | All new photo uploads go to Cloudinary | [ ] | URL contains "cloudinary.com" |
| 3 | profile_photo field has Cloudinary URL | [ ] | Not local path like /uploads/... |
| 4 | photos field has Cloudinary URLs array | [ ] | All URLs contain "cloudinary" |
| 5 | documentUrl has Cloudinary URL | [ ] | For uploaded documents |
| 6 | Database stores Cloudinary URLs only | [ ] | No local file paths in DB |

---

## AUTHENTICATION MODULE

| # | Function | Test Status | PASS/FAIL | Tested By | Date |
|---|----------|--------------|-----------|-----------|------|
| 7 | POST /api/auth/register | [ ] | [ ] | __________ | ____ |
| 8 | POST /api/auth/login | [ ] | [ ] | __________ | ____ |
| 9 | POST /api/auth/admin/login | [ ] | [ ] | __________ | ____ |
| 10 | GET /api/auth/me | [ ] | [ ] | __________ | ____ |

---

## PROFILE MANAGEMENT MODULE

| # | Function | Test Status | PASS/FAIL | Tested By | Date |
|---|----------|--------------|-----------|-----------|------|
| 11 | GET /api/profile | [ ] | [ ] | __________ | ____ |
| 12 | PUT /api/profile | [ ] | [ ] | __________ | ____ |
| 13 | PUT /api/profile/horoscope | [ ] | [ ] | __________ | ____ |
| 14 | PUT /api/profile/family | [ ] | [ ] | __________ | ____ |
| 15 | PUT /api/profile/subscription | [ ] | [ ] | __________ | ____ |
| 16 | GET /api/profile/subscription/plans | [ ] | [ ] | __________ | ____ |

---

## PHOTO MANAGEMENT MODULE (CRITICAL - Cloudinary Check)

| # | Function | Test Status | PASS/FAIL | Cloudinary? | Tested By | Date |
|---|----------|--------------|-----------|-------------|-----------|------|
| 17 | POST /api/profile/photo | [ ] | [ ] | [ ] YES [ ] NO | __________ | ____ |
| 18 | POST /api/profile/photos | [ ] | [ ] | [ ] YES [ ] NO | __________ | ____ |
| 19 | PUT /api/profile/photo/adjustments | [ ] | [ ] | N/A | __________ | ____ |
| 20 | DELETE /api/profile/photo | [ ] | [ ] | [ ] YES [ ] NO | __________ | ____ |
| 21 | POST /api/profile/documents | [ ] | [ ] | [ ] YES [ ] NO | __________ | ____ |
| 22 | GET /api/profile/documents | [ ] | [ ] | [ ] YES [ ] NO | __________ | ____ |
| 23 | DELETE /api/profile/documents/:id | [ ] | [ ] | [ ] YES [ ] NO | __________ | ____ |

---

## SEARCH MODULE

| # | Function | Test Status | PASS/FAIL | Tested By | Date |
|---|----------|--------------|-----------|-----------|------|
| 24 | GET /api/search (basic) | [ ] | [ ] | __________ | ____ |
| 25 | GET /api/search?gender= | [ ] | [ ] | __________ | ____ |
| 26 | GET /api/search?minAge=&maxAge= | [ ] | [ ] | __________ | ____ |
| 27 | GET /api/search?city= | [ ] | [ ] | __________ | ____ |
| 28 | GET /api/search?state= | [ ] | [ ] | __________ | ____ |
| 29 | GET /api/search?community= | [ ] | [ ] | __________ | ____ |
| 30 | GET /api/search?subCaste= | [ ] | [ ] | __________ | ____ |
| 31 | GET /api/search?education= | [ ] | [ ] | __________ | ____ |
| 32 | GET /api/search?profession= | [ ] | [ ] | __________ | ____ |
| 33 | GET /api/search?maritalStatus= | [ ] | [ ] | __________ | ____ |
| 34 | GET /api/search?isVerified= | [ ] | [ ] | __________ | ____ |
| 35 | GET /api/search/:profileId | [ ] | [ ] | __________ | ____ |
| 36 | GET /api/search/recommended | [ ] | [ ] | __________ | ____ |
| 37 | GET /api/search/filters | [ ] | [ ] | __________ | ____ |

---

## INTEREST MODULE

| # | Function | Test Status | PASS/FAIL | Tested By | Date |
|---|----------|--------------|-----------|-----------|------|
| 38 | POST /api/interest/send | [ ] | [ ] | __________ | ____ |
| 39 | GET /api/interest/received | [ ] | [ ] | __________ | ____ |
| 40 | GET /api/interest/sent | [ ] | [ ] | __________ | ____ |
| 41 | PUT /api/interest/:id/accept | [ ] | [ ] | __________ | ____ |
| 42 | PUT /api/interest/:id/reject | [ ] | [ ] | __________ | ____ |

---

## MESSAGE MODULE

| # | Function | Test Status | PASS/FAIL | Tested By | Date |
|---|----------|--------------|-----------|-----------|------|
| 43 | POST /api/message/send | [ ] | [ ] | __________ | ____ |
| 44 | GET /api/message/:userId | [ ] | [ ] | __________ | ____ |
| 45 | PUT /api/message/read/:messageId | [ ] | [ ] | __________ | ____ |

---

## CHAT MODULE

| # | Function | Test Status | PASS/FAIL | Tested By | Date |
|---|----------|--------------|-----------|-----------|------|
| 46 | GET /api/chat/:userId | [ ] | [ ] | __________ | ____ |
| 47 | POST /api/chat/send | [ ] | [ ] | __________ | ____ |
| 48 | PUT /api/chat/read/:messageId | [ ] | [ ] | __________ | ____ |

---

## VERIFICATION MODULE

| # | Function | Test Status | PASS/FAIL | Tested By | Date |
|---|----------|--------------|-----------|-----------|------|
| 49 | POST /api/verification/submit | [ ] | [ ] | __________ | ____ |
| 50 | GET /api/verification/status | [ ] | [ ] | __________ | ____ |

---

## PAYMENT MODULE

| # | Function | Test Status | PASS/FAIL | Tested By | Date |
|---|----------|--------------|-----------|-----------|------|
| 51 | POST /api/payments/submit | [ ] | [ ] | __________ | ____ |
| 52 | GET /api/payments/status | [ ] | [ ] | __________ | ____ |
| 53 | GET /api/payments/history | [ ] | [ ] | __________ | ____ |

---

## ADMIN MODULE

| # | Function | Test Status | PASS/FAIL | Tested By | Date |
|---|----------|--------------|-----------|-----------|------|
| 54 | POST /api/auth/admin/login | [ ] | [ ] | __________ | ____ |
| 55 | GET /api/admin/users | [ ] | [ ] | __________ | ____ |
| 56 | GET /api/admin/users/:id | [ ] | [ ] | __________ | ____ |
| 57 | PUT /api/admin/users/:id | [ ] | [ ] | __________ | ____ |
| 58 | DELETE /api/admin/users/:id | [ ] | [ ] | __________ | ____ |
| 59 | GET /api/admin/photos | [ ] | [ ] | __________ | ____ |
| 60 | PUT /api/admin/photos/:id/approve | [ ] | [ ] | __________ | ____ |
| 61 | PUT /api/admin/photos/:id/reject | [ ] | [ ] | __________ | ____ |
| 62 | GET /api/admin/verifications | [ ] | [ ] | __________ | ____ |
| 63 | PUT /api/admin/verifications/:id/approve | [ ] | [ ] | __________ | ____ |
| 64 | PUT /api/admin/verifications/:id/reject | [ ] | [ ] | __________ | ____ |
| 65 | GET /api/admin/payments | [ ] | [ ] | __________ | ____ |
| 66 | PUT /api/admin/payments/:id/approve | [ ] | [ ] | __________ | ____ |
| 67 | PUT /api/admin/payments/:id/reject | [ ] | [ ] | __________ | ____ |
| 68 | GET /api/admin/dashboard/stats | [ ] | [ ] | __________ | ____ |

---

## PDF GENERATION MODULE

| # | Function | Test Status | PASS/FAIL | Cloudinary? | Tested By | Date |
|---|----------|--------------|-----------|-------------|-----------|------|
| 69 | POST /api/profile-pdf/generate | [ ] | [ ] | [ ] YES [ ] NO | __________ | ____ |
| 70 | POST /api/shared-profile/generate | [ ] | [ ] | [ ] YES [ ] NO | __________ | ____ |

---

## DATA STORAGE VERIFICATION

| # | Check Item | Status | PASS/FAIL | Notes |
|---|------------|--------|-----------|-------|
| 71 | All user profiles in database (not local files) | [ ] | [ ] | |
| 72 | All messages in database (not local files) | [ ] | [ ] | |
| 73 | All interests in database (not local files) | [ ] | [ ] | |
| 74 | All payments in database (not local files) | [ ] | [ ] | |
| 75 | No user data in backend/uploads folder | [ ] | [ ] | |
| 76 | No user photos in local folders | [ ] | [ ] | |

---

## PROFILE FIELDS VERIFICATION - Missing Fields from missing_fieldsname.md

### PERSONAL BASIC FIELDS

| # | Field | API Field | DB Field | Test Status | PASS/FAIL | Stored in DB? | Notes |
|---|-------|-----------|----------|--------------|-----------|---------------|-------|
| 77 | Age (calculated from DOB) | age | age | [ ] | [ ] | [ ] YES [ ] NO | Auto-calculate |
| 78 | Community | community | community | [ ] | [ ] | [ ] YES [ ] NO | Dropdown menu |
| 79 | SubCaste | subCaste | sub_caste | [ ] | [ ] | [ ] YES [ ] NO | Dropdown menu |
| 80 | Weight | weight | weight | [ ] | [ ] | [ ] YES [ ] NO | |
| 81 | Email | email | email | [ ] | [ ] | [ ] YES [ ] NO | |
| 82 | Custom ID | customId | custom_id | [ ] | [ ] | [ ] YES [ ] NO | Display below profile image |
| 83 | Profession | profession | profession | [ ] | [ ] | [ ] YES [ ] NO | Dropdown menu |

### FAMILY INFORMATION FIELDS

| # | Field | API Field | DB Field | Test Status | PASS/FAIL | Stored in DB? | Notes |
|---|-------|-----------|----------|--------------|-----------|---------------|-------|
| 84 | Father Name | fatherName | father_name | [ ] | [ ] | [ ] YES [ ] NO | |
| 85 | Father Occupation | fatherOccupation | father_occupation | [ ] | [ ] | [ ] YES [ ] NO | Dropdown menu |
| 86 | Father Caste | fatherCaste | father_caste | [ ] | [ ] | [ ] YES [ ] NO | Dropdown menu |
| 87 | Mother Name | motherName | mother_name | [ ] | [ ] | [ ] YES [ ] NO | |
| 88 | Mother Occupation | motherOccupation | mother_occupation | [ ] | [ ] | [ ] YES [ ] NO | Dropdown menu |
| 89 | Mother Caste | motherCaste | mother_caste | [ ] | [ ] | [ ] YES [ ] NO | Dropdown menu |

### SUBSCRIPTION FIELDS

| # | Field | API Field | DB Field | Test Status | PASS/FAIL | Stored in DB? | Notes |
|---|-------|-----------|----------|--------------|-----------|---------------|-------|
| 90 | Subscription Tier | subscriptionTier | subscription_tier | [ ] | [ ] | [ ] YES [ ] NO | Default FREE |
| 91 | Show in Profile Page | - | - | [ ] | [ ] | N/A | Proper menu display |

### DROPDOWN MENU VERIFICATION

| # | Check Item | Test Status | PASS/FAIL | Notes |
|---|------------|--------------|-----------|-------|
| 92 | Community dropdown shows existing DB values | [ ] | [ ] | |
| 93 | SubCaste dropdown shows existing DB values | [ ] | [ ] | |
| 94 | Profession dropdown shows existing DB values | [ ] | [ ] | |
| 95 | Father Occupation dropdown shows existing DB values | [ ] | [ ] | |
| 96 | Father Caste dropdown shows existing DB values | [ ] | [ ] | |
| 97 | Mother Occupation dropdown shows existing DB values | [ ] | [ ] | |
| 98 | Mother Caste dropdown shows existing DB values | [ ] | [ ] | |
| 99 | If value not in list, user can add new option | [ ] | [ ] | |
| 100 | New custom values saved to DB automatically | [ ] | [ ] | |

---

## SUMMARY

| Category | Total | Completed | Pass | Fail | Pending |
|----------|-------|-----------|------|------|---------|
| Authentication | 4 | ___ | ___ | ___ | ___ |
| Profile Management | 6 | ___ | ___ | ___ | ___ |
| Profile Fields (Missing) | 15 | ___ | ___ | ___ | ___ |
| Photo Management | 7 | ___ | ___ | ___ | ___ |
| Search | 14 | ___ | ___ | ___ | ___ |
| Interest | 5 | ___ | ___ | ___ | ___ |
| Message | 3 | ___ | ___ | ___ | ___ |
| Chat | 3 | ___ | ___ | ___ | ___ |
| Verification | 2 | ___ | ___ | ___ | ___ |
| Payment | 3 | ___ | ___ | ___ | ___ |
| Admin | 15 | ___ | ___ | ___ | ___ |
| PDF Generation | 2 | ___ | ___ | ___ | ___ |
| **TOTAL** | **100** | **___** | **___** | **___** | **___** |

---

## ISSUES FOUND

| # | Issue Description | Severity | Status | Resolved By | Date |
|---|-------------------|----------|--------|-------------|------|
| 1 | Missing Personal Fields: age, community, subCaste, weight, email, custom_id, profession | HIGH | [ ] Open [ ] Fixed | | |
| 2 | Missing Family Fields: fatherName, fatherOccupation, fatherCaste, motherName, motherOccupation, motherCaste | HIGH | [ ] Open [ ] Fixed | | |
| 3 | Subscription not showing in profile page - need proper menu | HIGH | [ ] Open [ ] Fixed | | |
| 4 | Dropdown menus need to fetch from DB and allow custom entries | MEDIUM | [ ] Open [ ] Fixed | | |

---

## COMPLETION SIGN-OFF

- [ ] All Authentication Tests Completed
- [ ] All Profile Tests Completed  
- [ ] All Profile Fields (Missing) Tests Completed
- [ ] All Photo Tests Completed (Cloudinary Verified)
- [ ] All Search Tests Completed
- [ ] All Interest/Message Tests Completed
- [ ] All Verification Tests Completed
- [ ] All Payment Tests Completed
- [ ] All Admin Tests Completed
- [ ] All PDF Tests Completed
- [ ] Cloudinary Storage Verified - No Local Files
- [ ] Database Only Storage Verified

**TESTING COMPLETED BY:** ________________________

**DATE:** ________________________

**OVERALL STATUS:** [ ] ALL PASS [ ] ISSUES FOUND

---

## NOTES

_Use this space for any additional notes or observations during testing._
