# VijayaLakshmi Boyar Matrimony - Testing Checklist V3

## Project Status: TESTING IN PROGRESS
- **Last Updated:** 2026-03-07
- **Cloud Storage:** Cloudinary (do6o1xqs1) ✅
- **Database:** SQLite ✅
- **Key Rule:** ALL DATA MUST BE IN CLOUD/DATABASE - NO LOCAL FOLDER STORAGE

---

## CRITICAL VERIFICATION - Cloudinary Only Storage

- [ ] 1. No local uploads folder used for user data
- [ ] 2. All new photo uploads go to Cloudinary
- [ ] 3. profile_photo field has Cloudinary URL
- [ ] 4. photos field has Cloudinary URLs array
- [ ] 5. documentUrl has Cloudinary URL
- [ ] 6. Database stores Cloudinary URLs only

---

## AUTHENTICATION MODULE

- [ ] 7. POST /api/auth/register
- [ ] 8. POST /api/auth/login
- [ ] 9. POST /api/auth/admin/login
- [ ] 10. GET /api/auth/me

---

## PROFILE MANAGEMENT MODULE

- [ ] 11. GET /api/profile
- [ ] 12. PUT /api/profile
- [ ] 13. PUT /api/profile/horoscope
- [ ] 14. PUT /api/profile/family
- [ ] 15. PUT /api/profile/subscription
- [ ] 16. GET /api/profile/subscription/plans

---

## PHOTO MANAGEMENT MODULE

- [ ] 17. POST /api/profile/photo (Cloudinary?)
- [ ] 18. POST /api/profile/photos (Cloudinary?)
- [ ] 19. PUT /api/profile/photo/adjustments
- [ ] 20. DELETE /api/profile/photo (Cloudinary?)
- [ ] 21. POST /api/profile/documents (Cloudinary?)
- [ ] 22. GET /api/profile/documents (Cloudinary?)
- [ ] 23. DELETE /api/profile/documents/:id (Cloudinary?)

---

## SEARCH MODULE

- [ ] 24. GET /api/search (basic)
- [ ] 25. GET /api/search?gender=
- [ ] 26. GET /api/search?minAge=&maxAge=
- [ ] 27. GET /api/search?city=
- [ ] 28. GET /api/search?state=
- [ ] 29. GET /api/search?community=
- [ ] 30. GET /api/search?subCaste=
- [ ] 31. GET /api/search?education=
- [ ] 32. GET /api/search?profession=
- [ ] 33. GET /api/search?maritalStatus=
- [ ] 34. GET /api/search?isVerified=
- [ ] 35. GET /api/search/:profileId
- [ ] 36. GET /api/search/recommended
- [ ] 37. GET /api/search/filters

---

## INTEREST MODULE

- [ ] 38. POST /api/interest/send
- [ ] 39. GET /api/interest/received
- [ ] 40. GET /api/interest/sent
- [ ] 41. PUT /api/interest/:id/accept
- [ ] 42. PUT /api/interest/:id/reject

---

## MESSAGE MODULE

- [ ] 43. POST /api/message/send
- [ ] 44. GET /api/message/:userId
- [ ] 45. PUT /api/message/read/:messageId

---

## CHAT MODULE

- [ ] 46. GET /api/chat/:userId
- [ ] 47. POST /api/chat/send
- [ ] 48. PUT /api/chat/read/:messageId

---

## VERIFICATION MODULE

- [ ] 49. POST /api/verification/submit
- [ ] 50. GET /api/verification/status

---

## PAYMENT MODULE

- [ ] 51. POST /api/payments/submit
- [ ] 52. GET /api/payments/status
- [ ] 53. GET /api/payments/history

---

## ADMIN MODULE

- [ ] 54. POST /api/auth/admin/login
- [ ] 55. GET /api/admin/users
- [ ] 56. GET /api/admin/users/:id
- [ ] 57. PUT /api/admin/users/:id
- [ ] 58. DELETE /api/admin/users/:id
- [ ] 59. GET /api/admin/photos
- [ ] 60. PUT /api/admin/photos/:id/approve
- [ ] 61. PUT /api/admin/photos/:id/reject
- [ ] 62. GET /api/admin/verifications
- [ ] 63. PUT /api/admin/verifications/:id/approve
- [ ] 64. PUT /api/admin/verifications/:id/reject
- [ ] 65. GET /api/admin/payments
- [ ] 66. PUT /api/admin/payments/:id/approve
- [ ] 67. PUT /api/admin/payments/:id/reject
- [ ] 68. GET /api/admin/dashboard/stats

---

## PDF GENERATION MODULE

- [ ] 69. POST /api/profile-pdf/generate (Cloudinary?)
- [ ] 70. POST /api/shared-profile/generate (Cloudinary?)

---

## DATA STORAGE VERIFICATION

- [ ] 71. All user profiles in database (not local files)
- [ ] 72. All messages in database (not local files)
- [ ] 73. All interests in database (not local files)
- [ ] 74. All payments in database (not local files)
- [ ] 75. No user data in backend/uploads folder
- [ ] 76. No user photos in local folders

---

## PROFILE FIELDS VERIFICATION

### PERSONAL BASIC FIELDS

- [ ] 77. Age (calculated from DOB)
- [ ] 78. Community
- [ ] 79. SubCaste
- [ ] 80. Weight
- [ ] 81. Email
- [ ] 82. Custom ID
- [ ] 83. Profession

### FAMILY INFORMATION FIELDS

- [ ] 84. Father Name
- [ ] 85. Father Occupation
- [ ] 86. Father Caste
- [ ] 87. Mother Name
- [ ] 88. Mother Occupation
- [ ] 89. Mother Caste

### SUBSCRIPTION FIELDS

- [ ] 90. Subscription Tier
- [ ] 91. Show in Profile Page

### DROPDOWN MENU VERIFICATION

- [ ] 92. Community dropdown shows existing DB values
- [ ] 93. SubCaste dropdown shows existing DB values
- [ ] 94. Profession dropdown shows existing DB values
- [ ] 95. Father Occupation dropdown shows existing DB values
- [ ] 96. Father Caste dropdown shows existing DB values
- [ ] 97. Mother Occupation dropdown shows existing DB values
- [ ] 98. Mother Caste dropdown shows existing DB values
- [ ] 99. If value not in list, user can add new option
- [ ] 100. New custom values saved to DB automatically

---

## TESTING PROGRESS

| Category | Total | Completed |
|----------|-------|-----------|
| Cloudinary Storage | 6 | ___ |
| Authentication | 4 | ___ |
| Profile Management | 6 | ___ |
| Photo Management | 7 | ___ |
| Search | 14 | ___ |
| Interest | 5 | ___ |
| Message | 3 | ___ |
| Chat | 3 | ___ |
| Verification | 2 | ___ |
| Payment | 3 | ___ |
| Admin | 15 | ___ |
| PDF Generation | 2 | ___ |
| Data Storage | 6 | ___ |
| Profile Fields | 24 | ___ |
| **TOTAL** | **100** | **___** |

---

## HOW TO MARK COMPLETION

Simply replace `[ ]` with `[x]` for each test when completed.

Example:
- Before: `- [ ] 7. POST /api/auth/register`
- After: `- [x] 7. POST /api/auth/register`
