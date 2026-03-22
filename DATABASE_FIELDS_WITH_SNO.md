# Database Fields - User Entry Fields Only (With Serial Number)

**Date:** 2026-03-17

Source: [`backend/prisma/database_fields.js`](backend/prisma/database_fields.js)

---

| S.No | Field Name | Type | Description |
|:----:|------------|------|-------------|
| 1 | firstName | String | First name |
| 2 | lastName | String | Last name |
| 3 | email | String | Email address |
| 4 | password | String | Password (hashed) |
| 5 | phone | String | Phone number |
| 6 | gender | String | Gender (Male/Female) |
| 7 | dateOfBirth | Date | Date of birth |
| 8 | age | Number | Age |
| 9 | community | String | Community |
| 10 | subCaste | String | Sub-caste |
| 11 | city | String | City |
| 12 | state | String | State |
| 13 | country | String | Country |
| 14 | education | String | Education |
| 15 | profession | String | Profession |
| 16 | income | String | Income |
| 17 | maritalStatus | String | Marital status |
| 18 | height | Number | Height in cm |
| 19 | weight | Number | Weight in kg |
| 20 | complexion | String | Complexion |
| 21 | physicalStatus | String | Physical status (Normal/Physically Challenged) |
| 22 | drinkingHabit | String | Drinking habit (Never, Occasionally, Regularly) |
| 23 | smokingHabit | String | Smoking habit (Never, Occasionally, Regularly) |
| 24 | diet | String | Diet (Vegetarian, Non-Vegitarian, Eggetarian, Vegan) |
| 25 | profilePhoto | String | Profile photo URL |
| 26 | profilePhotoScale | Number | Profile photo scale |
| 27 | profilePhotoX | Number | Profile photo X position |
| 28 | profilePhotoY | Number | Profile photo Y position |
| 29 | photos | String | Gallery photos (JSON string) |
| 30 | bio | String | Bio/About |
| 31 | familyValues | String | Family values |
| 32 | familyType | String | Family type |
| 33 | familyStatus | String | Family status |
| 34 | aboutFamily | String | About family |
| 35 | raasi | String | Moon Sign (Raasi) |
| 36 | natchathiram | String | Star/Nakshatra |
| 37 | dhosam | String | Dhosam (Yes/No/details) |
| 38 | birthDate | Date | Birth date for horoscope |
| 39 | birthTime | String | Birth time for horoscope |
| 40 | birthPlace | String | Birth place for horoscope |
| 41 | fatherName | String | Father's name |
| 42 | fatherOccupation | String | Father's occupation |
| 43 | fatherCaste | String | Father's caste |
| 44 | motherName | String | Mother's name |
| 45 | motherOccupation | String | Mother's occupation |
| 46 | motherCaste | String | Mother's caste |

---

**Total User Entry Fields:** 46

*Note: Excludes system fields like id, customId, timestamps, verification status, subscription details, etc. Includes password field which is stored in database but should never be exposed in API responses.*

*Generated on: 2026-03-17*
