/**
 * Masking Utility for Sensitive Data
 * Used to mask ID numbers, showing only last 4 digits
 */

/**
 * Mask a string to show only last N characters
 * @param {string} value - The value to mask
 * @param {number} visibleChars - Number of characters to show at end (default 4)
 * @param {string} maskChar - Character to use for masking (default 'X')
 * @returns {string} - Masked value
 */
const maskString = (value, visibleChars = 4, maskChar = 'X') => {
  if (!value) return '';
  
  const strValue = String(value);
  
  if (strValue.length <= visibleChars) {
    return strValue; // Don't mask if string is too short
  }
  
  const visiblePart = strValue.slice(-visibleChars);
  const maskedPart = maskChar.repeat(strValue.length - visibleChars);
  
  return maskedPart + visiblePart;
};

/**
 * Mask Aadhaar number (show last 4 digits)
 * Format: XXXX-XXXX-1234
 * @param {string} aadhaar - Aadhaar number
 * @returns {string} - Masked Aadhaar
 */
const maskAadhaar = (aadhaar) => {
  if (!aadhaar) return '';
  
  // Remove any existing dashes or spaces
  const cleanAadhaar = String(aadhaar).replace(/[-\s]/g, '');
  
  if (cleanAadhaar.length !== 12) {
    return maskString(cleanAadhaar, 4);
  }
  
  const last4 = cleanAadhaar.slice(-4);
  return `XXXX-XXXX-${last4}`;
};

/**
 * Mask PAN number (show last 4 characters)
 * Format: XXXXX1234X
 * @param {string} pan - PAN number
 * @returns {string} - Masked PAN
 */
const maskPAN = (pan) => {
  if (!pan) return '';
  
  const cleanPAN = String(pan).toUpperCase().replace(/[-\s]/g, '');
  
  if (cleanPAN.length !== 10) {
    return maskString(cleanPAN, 4);
  }
  
  // PAN format: ABCDE1234F - show last 4 chars
  return `XXXXX${cleanPAN.slice(-4)}`;
};

/**
 * Mask Voter ID (show last 4 characters)
 * @param {string} voterId - Voter ID
 * @returns {string} - Masked Voter ID
 */
const maskVoterId = (voterId) => {
  if (!voterId) return '';
  
  const cleanId = String(voterId).toUpperCase().replace(/[-\s]/g, '');
  return maskString(cleanId, 4);
};

/**
 * Mask Driving License (show last 4 characters)
 * @param {string} dl - Driving License number
 * @returns {string} - Masked DL
 */
const maskDrivingLicense = (dl) => {
  if (!dl) return '';
  
  const cleanDL = String(dl).toUpperCase().replace(/[-\s]/g, '');
  return maskString(cleanDL, 4);
};

/**
 * Mask phone number (show last 4 digits)
 * Format: XXX-XXX-1234
 * @param {string} phone - Phone number
 * @returns {string} - Masked phone
 */
const maskPhone = (phone) => {
  if (!phone) return '';
  
  const cleanPhone = String(phone).replace(/\D/g, '');
  
  if (cleanPhone.length < 10) {
    return maskString(cleanPhone, 4);
  }
  
  const last4 = cleanPhone.slice(-4);
  return `XXX-XXX-${last4}`;
};

/**
 * Mask email (show first 2 chars and domain)
 * Format: ab***@domain.com
 * @param {string} email - Email address
 * @returns {string} - Masked email
 */
const maskEmail = (email) => {
  if (!email) return '';
  
  const parts = String(email).split('@');
  if (parts.length !== 2) {
    return maskString(email, 4);
  }
  
  const [localPart, domain] = parts;
  
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  
  return `${localPart.slice(0, 2)}***@${domain}`;
};

/**
 * Get masking function based on ID type
 * @param {string} idType - Type of ID (AADHAAR, PAN, VOTER_ID, DRIVING_LICENSE)
 * @returns {Function} - Masking function for the ID type
 */
const getMaskFunction = (idType) => {
  const maskFunctions = {
    AADHAAR: maskAadhaar,
    PAN: maskPAN,
    VOTER_ID: maskVoterId,
    DRIVING_LICENSE: maskDrivingLicense,
    PASSPORT: (val) => maskString(val, 4)
  };
  
  return maskFunctions[idType?.toUpperCase()] || maskString;
};

/**
 * Mask ID number based on ID type
 * @param {string} idNumber - The ID number to mask
 * @param {string} idType - Type of ID
 * @returns {string} - Masked ID number
 */
const maskIdNumber = (idNumber, idType) => {
  const maskFn = getMaskFunction(idType);
  return maskFn(idNumber);
};

/**
 * Extract last N digits from a number/string
 * @param {string} value - The value
 * @param {number} count - Number of digits to extract (default 4)
 * @returns {string} - Last N digits
 */
const getLastDigits = (value, count = 4) => {
  if (!value) return '';
  const cleanValue = String(value).replace(/\D/g, '');
  return cleanValue.slice(-count);
};

module.exports = {
  maskString,
  maskAadhaar,
  maskPAN,
  maskVoterId,
  maskDrivingLicense,
  maskPhone,
  maskEmail,
  maskIdNumber,
  getLastDigits,
  getMaskFunction
};
