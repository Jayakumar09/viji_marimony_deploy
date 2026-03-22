// =====================================================
// PROFILE CONTROLLER FIELDS
// File 2: Fields returned by profile controller (getProfile, getMe)
// =====================================================

module.exports = {
  // Basic Info
  id: true,
  customId: true,           // Custom ID like DHARSHINI_VBM26ID000001
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  gender: true,
  dateOfBirth: true,
  age: true,
  community: true,
  subCaste: true,
  
  // Location
  city: true,
  state: true,
  country: true,
  
  // Education & Work
  education: true,
  profession: true,
  income: true,
  
  // Personal Details
  maritalStatus: true,
  height: true,             // in cm
  weight: true,             // in kg
  complexion: true,
  physicalStatus: true,     // Normal or Physically Challenged
  
  // Habits
  drinkingHabit: true,      // Never, Occasionally, Regularly
  smokingHabit: true,       // Never, Occasionally, Regularly
  diet: true,              // Vegetarian, Non-Vegitarian, Eggetarian, Vegan
  
  // Photos
  profilePhoto: true,
  profilePhotoScale: true,
  profilePhotoX: true,
  profilePhotoY: true,
  photos: true,             // JSON string for gallery
  
  // About
  bio: true,
  
  // Family
  familyValues: true,
  familyType: true,
  familyStatus: true,
  aboutFamily: true,
  
  // Verification Status
  isVerified: true,
  isPremium: true,
  isActive: true,
  emailVerified: true,
  phoneVerified: true,
  photosVerified: true,
  lastLoginAt: true,
  
  // Timestamps
  createdAt: true,
  updatedAt: true,
  
  // Horoscope Fields
  raasi: true,              // Moon Sign (Raasi)
  natchathiram: true,      // Star/Nakshatra
  dhosam: true,            // Dhosam (Yes/No/details)
  birthDate: true,         // Birth date for horoscope
  birthTime: true,        // Birth time for horoscope
  birthPlace: true,        // Birth place for horoscope
  
  // Family Background
  fatherName: true,
  fatherOccupation: true,
  fatherCaste: true,
  motherName: true,
  motherOccupation: true,
  motherCaste: true,
  
  // Subscription
  subscriptionTier: true,   // FREE, STANDARD, PREMIUM, ELITE
  successFee: true,
  subscriptionStart: true,
  subscriptionEnd: true,
  
  // Manual Verification
  manualVerificationStatus: true,   // PENDING, APPROVED, REJECTED
  manualVerificationNotes: true,
  
  // Profile Verification
  profileVerificationStatus: true, // Pending, Under Admin Review, Profile Verified, Rejected
  profileVerified: true             // Set by admin after review
};
