const crypto = require('crypto');

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();

// Generate a 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Set OTP for an email (expires in 10 minutes)
const setOTP = (email, type = 'email') => {
  const otp = generateOTP();
  const key = `${type}:${email}`;
  otpStore.set(key, {
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
  });
  return otp;
};

// Verify OTP
const verifyOTP = (email, otp, type = 'email') => {
  const key = `${type}:${email}`;
  const stored = otpStore.get(key);
  
  if (!stored) {
    return { valid: false, error: 'OTP not found or expired' };
  }
  
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(key);
    return { valid: false, error: 'OTP expired' };
  }
  
  if (stored.otp !== otp) {
    return { valid: false, error: 'Invalid OTP' };
  }
  
  otpStore.delete(key);
  return { valid: true };
};

// Clear OTP
const clearOTP = (email, type = 'email') => {
  const key = `${type}:${email}`;
  otpStore.delete(key);
};

module.exports = {
  generateOTP,
  setOTP,
  verifyOTP,
  clearOTP
};
