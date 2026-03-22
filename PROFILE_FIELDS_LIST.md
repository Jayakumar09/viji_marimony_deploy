# Profile Fields List - Single API Endpoint

## All Fields to be saved via PUT /api/profile

This file contains ALL user profile fields that should be saved in a single API call to `/api/profile`

---

## 1. BASIC PERSONAL INFORMATION (Fields 1-22)

| # | API Field Name | DB Field Name | Type | Required | Description |
|---|----------------|---------------|------|----------|-------------|
| 1 | phone | phone | String | No | Phone number |
| 2 | firstName | firstName | String | No | First name (registered separately) |
| 3 | lastName | lastName | String | No | Last name (registered separately) |
| 4 | gender | gender | String | No | MALE, FEMALE, OTHER |
| 5 | dateOfBirth | dateOfBirth | DateTime | No | Date of birth |
| 6 | age | age | Int | No | Age (calculated from DOB) |
| 7 | community | community | String | No | Community (default: "Boyar") |
| 8 | subCaste | subCaste | String | No | Sub-caste |
| 9 | city | city | String | No | City |
| 10 | state | state | String | No | State |
| 11 | country | country | String | No | Country (default: "India") |
| 12 | education | education | String | No | Education |
| 13 | profession | profession | String | No | Profession |
| 14 | income | income | String | No | Annual income |
| 15 | maritalStatus | maritalStatus | String | No | SINGLE, DIVORCED, WIDOWED, SEPARATED |
| 16 | height | height | String | No | Height in cm |
| 17 | weight | weight | String | No | Weight in kg |
| 18 | complexion | complexion | String | No | Complexion |
| 19 | bio | bio | String | No | About self (max 500 chars) |
| 20 | profilePhoto | profilePhoto | String | No | Profile photo URL (Cloudinary) |
| 21 | photos | photos | JSON String | No | Gallery photos (JSON array of Cloudinary URLs) |
| 22 | email | email | String | No | Email (registered separately) |

---

## 2. FAMILY INFORMATION (Fields 23-33)

| # | API Field Name | DB Field Name | Type | Required | Description |
|---|----------------|---------------|------|----------|-------------|
| 23 | familyValues | familyValues | String | No | Family values (Traditional, Liberal, etc.) |
| 24 | familyType | familyType | String | No | Family type (Nuclear, Joint, etc.) |
| 25 | familyStatus | familyStatus | String | No | Family status (Middle Class, Upper Middle, etc.) |
| 26 | aboutFamily | aboutFamily | String | No | About family description |
| 27 | fatherName | fatherName | String | No | Father's name |
| 28 | fatherOccupation | fatherOccupation | String | No | Father's occupation |
| 29 | fatherCaste | fatherCaste | String | No | Father's caste |
| 30 | motherName | motherName | String | No | Mother's name |
| 31 | motherOccupation | motherOccupation | String | No | Mother's occupation |
| 32 | motherCaste | motherCaste | String | No | Mother's caste |

---

## 3. HOROSCOPE INFORMATION (Fields 33-38)

| # | API Field Name | DB Field Name | Type | Required | Description |
|---|----------------|---------------|------|----------|-------------|
| 33 | raasi | raasi | String | No | Moon sign (Raasi) |
| 34 | natchathiram | natchathiram | String | No | Star/Nakshatra |
| 35 | dhosam | dhosam | String | No | Dhosam (Yes/No/Details) |
| 36 | birthDate | birthDate | String | No | Birth date for horoscope |
| 37 | birthTime | birthTime | String | No | Birth time for horoscope |
| 38 | birthPlace | birthPlace | String | No | Birth place for horoscope |

---

## 4. SUBSCRIPTION INFORMATION (Fields 39-42)

| # | API Field Name | DB Field Name | Type | Required | Description |
|---|----------------|---------------|------|----------|-------------|
| 39 | subscriptionTier | subscriptionTier | String | No | FREE, STANDARD, PREMIUM, ELITE |
| 40 | successFee | successFee | Float | No | Success fee amount |
| 41 | subscriptionStart | subscriptionStart | DateTime | No | Subscription start date |
| 42 | subscriptionEnd | subscriptionEnd | DateTime | No | Subscription end date |

---

## 5. PHOTO ADJUSTMENTS (Fields 43-45)

| # | API Field Name | DB Field Name | Type | Required | Description |
|---|----------------|---------------|------|----------|-------------|
| 43 | profilePhotoScale | profilePhotoScale | Float | No | Photo scale factor |
| 44 | profilePhotoX | profilePhotoX | Float | No | Photo X offset |
| 45 | profilePhotoY | profilePhotoY | Float | No | Photo Y offset |

---

## SUMMARY - Total Fields: 45

### Quick Reference by Category:

**Personal (22 fields):** phone, firstName, lastName, gender, dateOfBirth, age, community, subCaste, city, state, country, education, profession, income, maritalStatus, height, weight, complexion, bio, profilePhoto, photos, email

**Family (10 fields):** familyValues, familyType, familyStatus, aboutFamily, fatherName, fatherOccupation, fatherCaste, motherName, motherOccupation, motherCaste

**Horoscope (6 fields):** raasi, natchathiram, dhosam, birthDate, birthTime, birthPlace

**Subscription (4 fields):** subscriptionTier, successFee, subscriptionStart, subscriptionEnd

**Photo Adjustments (3 fields):** profilePhotoScale, profilePhotoX, profilePhotoY

---

## Current Backend Endpoints:

| Endpoint | Fields | Status |
|----------|--------|--------|
| PUT /api/profile | Basic + Family | ✅ Has community now |
| PUT /api/profile/horoscope | Horoscope | Separate endpoint |
| PUT /api/profile/family | Family (duplicated) | Separate endpoint |
| PUT /api/profile/subscription | Subscription | Separate endpoint |

## Recommended Action:
Merge fields 33-42 (Horoscope + Subscription) into `/api/profile` endpoint.
Keep photo adjustments (43-45) in separate endpoint `/api/profile/photo/adjustments`
