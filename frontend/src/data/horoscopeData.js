// Horoscope data for Indian astrology
// Rasi (Moon Sign) and Natchathiram (Star/Nakshatra) mapping
// Using Tamil star names with English equivalents

export const RAASI_CHOICES = [
  { value: 'Mesham', label: 'Mesham (Aries)', order: 1 },
  { value: 'Rishabam', label: 'Rishabam (Taurus)', order: 2 },
  { value: 'Mithunam', label: 'Mithunam (Gemini)', order: 3 },
  { value: 'Kadagam', label: 'Kadagam (Cancer)', order: 4 },
  { value: 'Simmam', label: 'Simmam (Leo)', order: 5 },
  { value: 'Kanni', label: 'Kanni (Virgo)', order: 6 },
  { value: 'Thulam', label: 'Thulam (Libra)', order: 7 },
  { value: 'Vrischikam', label: 'Vrischikam (Scorpio)', order: 8 },
  { value: 'Dhanusu', label: 'Dhanusu (Sagittarius)', order: 9 },
  { value: 'Makaram', label: 'Makaram (Capricorn)', order: 10 },
  { value: 'Kumbam', label: 'Kumbam (Aquarius)', order: 11 },
  { value: 'Meenam', label: 'Meenam (Pisces)', order: 12 }
];

export const NATCHATHIRAM_CHOICES = [
  // Mesham (Aries) - 1st Rasi
  { value: 'Ashwini', label: 'Ashwini', rasi: 'Mesham' },
  { value: 'Bharani', label: 'Bharani', rasi: 'Mesham' },
  { value: 'Karthigai', label: 'Karthigai', rasi: 'Mesham' },
  
  // Rishabam (Taurus) - 2nd Rasi
  { value: 'Karthigai', label: 'Karthigai', rasi: 'Rishabam' },
  { value: 'Rohini', label: 'Rohini', rasi: 'Rishabam' },
  { value: 'Mrigashirsham', label: 'Mrigashirsham', rasi: 'Rishabam' },
  
  // Mithunam (Gemini) - 3rd Rasi
  { value: 'Mrigashirsham', label: 'Mrigashirsham', rasi: 'Mithunam' },
  { value: 'Thiruvaathirai', label: 'Thiruvaathirai (Ardra)', rasi: 'Mithunam' },
  { value: 'Punarpusam', label: 'Punarpusam (Punarvasu)', rasi: 'Mithunam' },
  
  // Kadagam (Cancer) - 4th Rasi
  { value: 'Punarpusam', label: 'Punarpusam (Punarvasu)', rasi: 'Kadagam' },
  { value: 'Poosam', label: 'Poosam (Pushya)', rasi: 'Kadagam' },
  { value: 'Aayilyam', label: 'Aayilyam (Ashlesha)', rasi: 'Kadagam' },
  
  // Simmam (Leo) - 5th Rasi
  { value: 'Magam', label: 'Magam (Magha)', rasi: 'Simmam' },
  { value: 'Pooram', label: 'Pooram (Purva Phalguni)', rasi: 'Simmam' },
  { value: 'Uthiram', label: 'Uthiram (Uttara Phalguni)', rasi: 'Simmam' },
  
  // Kanni (Virgo) - 6th Rasi
  { value: 'Hastham', label: 'Hastham (Hasta)', rasi: 'Kanni' },
  { value: 'Chithirai', label: 'Chithirai (Chitra)', rasi: 'Kanni' },
  { value: 'Swathi', label: 'Swathi', rasi: 'Kanni' },
  
  // Thulam (Libra) - 7th Rasi
  { value: 'Vishakam', label: 'Vishakam (Vishaka)', rasi: 'Thulam' },
  { value: 'Anusham', label: 'Anusham (Anuradha)', rasi: 'Thulam' },
  { value: 'Kettai', label: 'Kettai (Jyeshta)', rasi: 'Thulam' },
  
  // Vrischikam (Scorpio) - 8th Rasi
  { value: 'Moolam', label: 'Moolam (Mula)', rasi: 'Vrischikam' },
  { value: 'Pooraadam', label: 'Pooraadam (Purva Ashadha)', rasi: 'Vrischikam' },
  { value: 'Uthiraadam', label: 'Uthiraadam (Uttara Ashadha)', rasi: 'Vrischikam' },
  
  // Dhanusu (Sagittarius) - 9th Rasi
  { value: 'Thiruvonam', label: 'Thiruvonam (Shravana)', rasi: 'Dhanusu' },
  { value: 'Avittam', label: 'Avittam (Dhanishta)', rasi: 'Dhanusu' },
  { value: 'Sathayam', label: 'Sathayam (Satabhisha)', rasi: 'Dhanusu' },
  
  // Makaram (Capricorn) - 10th Rasi
  { value: 'Poorattathi', label: 'Poorattathi (Purva Bhadrapada)', rasi: 'Makaram' },
  { value: 'Uthirattathi', label: 'Uthirattathi (Uttara Bhadrapada)', rasi: 'Makaram' },
  { value: 'Revathi', label: 'Revathi', rasi: 'Makaram' },
  
  // Kumbam (Aquarius) - 11th Rasi
  { value: 'Ashwini', label: 'Ashwini', rasi: 'Kumbam' },
  { value: 'Bharani', label: 'Bharani', rasi: 'Kumbam' },
  { value: 'Karthigai', label: 'Karthigai', rasi: 'Kumbam' },
  
  // Meenam (Pisces) - 12th Rasi
  { value: 'Rohini', label: 'Rohini', rasi: 'Meenam' },
  { value: 'Mrigashirsham', label: 'Mrigashirsham', rasi: 'Meenam' },
  { value: 'Thiruvaathirai', label: 'Thiruvaathirai (Ardra)', rasi: 'Meenam' }
];

export const DHOSAM_CHOICES = [
  { value: 'None', label: 'No Dhosam' },
  { value: 'Kuja Dhosam', label: 'Kuja Dhosam' },
  { value: 'Rahu Dhosam', label: 'Rahu Dhosam' },
  { value: 'Kethu Dhosam', label: 'Kethu Dhosam' },
  { value: 'Sani Dhosam', label: 'Sani Dhosam' },
  { value: 'Chandras Dhosam', label: 'Chandras Dhosam' },
  { value: 'Guru Dhosam', label: 'Guru Dhosam' },
  { value: 'Other', label: 'Other' }
];

// Get Natchathiram based on selected Rasi
export const getNatchathiramForRasi = (rasi) => {
  if (!rasi) return [];
  return NATCHATHIRAM_CHOICES.filter(n => n.rasi === rasi);
};

// Success fee by Indian marriage law guidelines
export const SUCCESS_FEE_NOTE = "Success fee is applicable only when marriage is fixed through our platform. This follows the guidelines set by the Government of India for matrimonial services.";

// Note: SUBSCRIPTION_TIERS has been moved to frontend/src/config/subscription.js
// Import from '../config/subscription' instead
