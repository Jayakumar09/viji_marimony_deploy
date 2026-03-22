// =====================================================
// COMPLETE USER PROFILE FIELDS LIST
// This file contains ALL fields that exist in the User model
// Used as reference to ensure consistency across Prisma, Controllers, and Frontend
// =====================================================

// DATABASE FIELDS (Prisma Schema - backend/prisma/schema.prisma)
const DATABASE_FIELDS = [
  // Basic Info
  'id',
  'customId',           // Custom ID like DHARSHINI_VBM26ID000001
  'email',
  'password',
  'phone',
  'firstName',
  'lastName',
  'gender',
  'dateOfBirth',
  'age',
  'community',
  'subCaste',
  
  // Location
  'city',
  'state',
  'country',
  
  // Education & Work
  'education',
  'profession',
  'income',
  
  // Personal Details
  'maritalStatus',
  'height',            // in cm
  'weight',            // in kg
  'complexion',
  'physicalStatus',    // Normal or Physically Challenged
  
  // Habits
  'drinkingHabit',    // Never, Occasionally, Regularly
  'smokingHabit',     // Never, Occasionally, Regularly
  'diet',             // Vegetarian, Non-Vegitarian, Eggetarian, Vegan
  
  // Photos
  'profilePhoto',
  'profilePhotoScale',
  'profilePhotoX',
  'profilePhotoY',
  'photos',           // JSON string for gallery
  
  // About
  'bio',
  
  // Family
  'familyValues',
  'familyType',
  'familyStatus',
  'aboutFamily',
  
  // Verification Status
  'isVerified',
  'isPremium',
  'isActive',
  'emailVerified',
  'phoneVerified',
  'photosVerified',
  'lastLoginAt',
  
  // Timestamps
  'createdAt',
  'updatedAt',
  
  // Horoscope Fields
  'raasi',            // Moon Sign (Raasi)
  'natchathiram',     // Star/Nakshatra
  'dhosam',           // Dhosam (Yes/No/details)
  'birthDate',        // Birth date for horoscope
  'birthTime',        // Birth time for horoscope
  'birthPlace',       // Birth place for horoscope
  
  // Family Background
  'fatherName',
  'fatherOccupation',
  'fatherCaste',
  'motherName',
  'motherOccupation',
  'motherCaste',
  
  // Subscription
  'subscriptionTier',    // FREE, STANDARD, PREMIUM, ELITE
  'successFee',
  'subscriptionStart',
  'subscriptionEnd',
  
  // Manual Verification
  'manualVerificationStatus',  // PENDING, APPROVED, REJECTED
  'manualVerificationNotes',
  
  // Profile Verification
  'profileVerificationStatus',  // Pending, Under Admin Review, Profile Verified, Rejected
  'profileVerified'              // Set by admin after review
];

// PROFILE CONTROLLER - getProfile function returns these fields
const PROFILE_CONTROLLER_FIELDS = [
  'id',
  'customId',
  'email',
  'phone',
  'firstName',
  'lastName',
  'gender',
  'dateOfBirth',
  'age',
  'community',
  'subCaste',
  'city',
  'state',
  'country',
  'education',
  'profession',
  'income',
  'maritalStatus',
  'height',
  'weight',
  'complexion',
  'physicalStatus',
  'drinkingHabit',
  'smokingHabit',
  'diet',
  'profilePhoto',
  'profilePhotoScale',
  'profilePhotoX',
  'profilePhotoY',
  'photos',
  'bio',
  'familyValues',
  'familyType',
  'familyStatus',
  'aboutFamily',
  'isVerified',
  'isPremium',
  'emailVerified',
  'phoneVerified',
  'raasi',
  'natchathiram',
  'dhosam',
  'birthDate',
  'birthTime',
  'birthPlace',
  'fatherName',
  'fatherOccupation',
  'fatherCaste',
  'motherName',
  'motherOccupation',
  'motherCaste',
  'subscriptionTier',
  'successFee',
  'subscriptionStart',
  'subscriptionEnd',
  'manualVerificationStatus',
  'createdAt',
  'updatedAt'
];

// ADMIN CONTROLLER - getAllUsers function returns these fields
const ADMIN_CONTROLLER_FIELDS = [
  'id',
  'customId',
  'firstName',
  'lastName',
  'email',
  'phone',
  'city',
  'state',
  'isVerified',
  'photosVerified',
  'emailVerified',
  'phoneVerified',
  'isActive',
  'isPremium',
  'subscriptionTier',
  'subscriptionStart',
  'createdAt'
];

// MISSING FIELDS ANALYSIS:
// -----------------------
// Fields in Database but NOT in Profile Controller:
// - password (intentionally excluded for security)
// - isActive
// - photosVerified
// - lastLoginAt
// - profileVerificationStatus
// - profileVerified
// - manualVerificationNotes

// Fields in Database but NOT in Admin Controller:
// - password
// - dateOfBirth
// - age
// - community
// - subCaste
// - country
// - education
// - profession
// - income
// - maritalStatus
// - height
// - weight
// - complexion
// - physicalStatus
// - drinkingHabit
// - smokingHabit
// - diet
// - profilePhoto
// - profilePhotoScale
// - profilePhotoX
// - profilePhotoY
// - photos
// - bio
// - familyValues
// - familyType
// - familyStatus
// - aboutFamily
// - raasi
// - natchathiram
// - dhosam
// - birthDate
// - birthTime
// - birthPlace
// - fatherName
// - fatherOccupation
// - fatherCaste
// - motherName
// - motherOccupation
// - motherCaste
// - successFee
// - subscriptionEnd
// - manualVerificationStatus
// - manualVerificationNotes
// - profileVerificationStatus
// - profileVerified
// - updatedAt

module.exports = {
  DATABASE_FIELDS,
  PROFILE_CONTROLLER_FIELDS,
  ADMIN_CONTROLLER_FIELDS
};
