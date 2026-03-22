// Initialize counter - will be set on first call
let userCounter = null;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Initialize counter from database
 * Finds the highest existing ID number and sets counter to that value
 */
async function initializeCounter() {
  if (userCounter !== null) return; // Already initialized
  
  try {
    const users = await prisma.user.findMany({
      where: {
        customId: { not: null }
      },
      select: {
        customId: true
      }
    });
    
    let maxNumber = 0;
    for (const user of users) {
      const match = user.customId.match(/ID(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
    
    userCounter = maxNumber;
    console.log(`UserIdGenerator initialized with counter: ${userCounter}`);
  } catch (error) {
    console.error('Error initializing user counter:', error);
    userCounter = 0;
  }
}

/**
 * Generate custom user ID with sequential numbers
 * Format: {NAME}_VBM{YY}ID{000001}
 * Example: DHARSINI_VBM26ID000001
 */

/**
 * Generate custom user ID
 * Uses only firstName for the name part
 * @param {string} firstName - User's first name (used in ID)
 * @param {string} lastName - User's last name (optional, not used in ID)
 * @returns {string} Custom ID in format: NAME_VBMYYID000001
 */
function generateCustomUserId(firstName, lastName = '') {
  // Initialize counter if not done yet
  if (userCounter === null) {
    // Synchronous initialization not possible with async, so just start at 0
    // The counter will be correct for new users after first DB query
    userCounter = 0;
  }
  
  // Increment counter
  userCounter++;
  
  // 1. Current Year last 2 digits
  const year = new Date().getFullYear().toString().slice(-2);
  
  // 2. Clean FirstName only (only alphanumeric, uppercase, max 10 chars)
  const cleanName = firstName
    .replace(/[^a-zA-Z0-9]/g, '')  // Remove special chars
    .toUpperCase()
    .substring(0, 10);  // Max 10 chars
  
  // 3. Pad to 6 digits
  const serial = userCounter.toString().padStart(6, '0');
  
  // 4. Combine: NAME_VBMYYID000001
  return `${cleanName}_VBM${year}ID${serial}`;
}

/**
 * Generate custom ID for a new user during registration
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name (optional)
 * @returns {string} Custom ID
 */
function generateUserId(firstName, lastName = '') {
  return generateCustomUserId(firstName, lastName);
}

/**
 * Get current counter value
 * @returns {number} Current counter
 */
function getCounter() {
  return userCounter;
}

/**
 * Set counter value (for resuming from last number)
 * @param {number} value - New counter value
 */
function setCounter(value) {
  userCounter = value;
}

/**
 * Initialize counter from database (async version)
 * Call this once at server startup
 */
async function initCounter() {
  await initializeCounter();
}

module.exports = {
  generateCustomUserId,
  generateUserId,
  getCounter,
  setCounter,
  initCounter
};
