/**
 * AES-256-CBC Encryption Utility
 * Used for encrypting sensitive ID numbers (Aadhaar, PAN, etc.)
 */

const crypto = require('crypto');

// Get encryption key from environment variable
// Key must be 32 bytes (256 bits) for AES-256
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY not found in environment variables');
  }
  // Derive a 32-byte key using SHA-256
  return crypto.createHash('sha256').update(key).digest();
};

// Get IV length (16 bytes for AES-CBC)
const IV_LENGTH = 16;

/**
 * Encrypt sensitive data using AES-256-CBC
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted data in format: iv:encryptedData (hex encoded)
 */
const encrypt = (text) => {
  try {
    if (!text) return null;
    
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(text.toString(), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return IV and encrypted data together
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt data encrypted with AES-256-CBC
 * @param {string} encryptedData - Encrypted data in format: iv:encryptedData
 * @returns {string} - Decrypted plain text
 */
const decrypt = (encryptedData) => {
  try {
    if (!encryptedData) return null;
    
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');
    
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Verify if a value matches the encrypted data
 * @param {string} plainValue - Plain text value to verify
 * @param {string} encryptedData - Encrypted data to compare against
 * @returns {boolean} - True if values match
 */
const verify = (plainValue, encryptedData) => {
  try {
    const decrypted = decrypt(encryptedData);
    return decrypted === plainValue;
  } catch (error) {
    return false;
  }
};

/**
 * Generate a secure random token
 * @param {number} length - Length of token in bytes (default 32)
 * @returns {string} - Random hex string
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a value using SHA-256 (one-way, for comparison only)
 * @param {string} value - Value to hash
 * @returns {string} - SHA-256 hash
 */
const hashValue = (value) => {
  return crypto.createHash('sha256').update(value).digest('hex');
};

module.exports = {
  encrypt,
  decrypt,
  verify,
  generateSecureToken,
  hashValue
};
