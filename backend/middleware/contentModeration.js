/**
 * AI Content Moderation Middleware
 * Detects abusive messages and flags suspicious profiles
 */

const BAD_WORDS = [
  // English
  'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'cunt', 'bastard',
  'whore', 'slut', 'nigger', 'nigga', 'fag', 'dyke', 'retard',
  // Hindi/Transliterated
  'मादरचोद', 'भोसड़ी', 'कुत्ते', 'गांड', 'लुच्ड', 'रंडी', 'भांड',
  'साले', 'भेंच', 'काली', 'चूत', 'लंड', 'रांड',
  // Tamil/Transliterated  
  'புட்டி', 'கார்க்களே', 'மாதிரி', 'சாதி',
  // Threats and harassment
  'kill', 'die', 'rape', 'murder', 'suicide', 'hate',
  // Contact info patterns
  'whatsapp', 'watsapp', 'watsap', 'wa.me', 'telegram',
  'phone number', 'contact me', 'call me', 'msg me'
];

const SUSPICIOUS_PATTERNS = [
  /\b\d{10}\b/, // 10 digit phone numbers
  /\+91\s*\d{10}/, // Indian phone with country code
  /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/, // US phone pattern
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // Email patterns
  /http[s]?:\/\/(?!vijayalakshmi|viji-marimony)[^\s]+/, // External URLs
  /instagram|facebook|snapchat|tiktok/gi,
  /money|loan|crypto|bitcoin|investment/gi,
  /meet|hotel|room|private|alone/gi,
  /sex|porn|nude|xxx/gi
];

/**
 * Check if text contains inappropriate content
 * @param {string} text - Text to check
 * @returns {Object} Moderation result
 */
function moderateContent(text) {
  if (!text || typeof text !== 'string') {
    return {
      isClean: true,
      flags: [],
      severity: 'none'
    };
  }

  const lowerText = text.toLowerCase();
  const flags = [];
  let severity = 'none';

  // Check for bad words
  for (const word of BAD_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(lowerText)) {
      flags.push({
        type: 'profanity',
        word: word,
        severity: 'high'
      });
      severity = 'high';
    }
  }

  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(text)) {
      flags.push({
        type: 'suspicious_pattern',
        pattern: pattern.toString(),
        severity: 'medium'
      });
      if (severity !== 'high') severity = 'medium';
    }
  }

  // Check message length
  if (text.length > 2000) {
    flags.push({
      type: 'excessive_length',
      severity: 'low'
    });
    if (severity === 'none') severity = 'low';
  }

  // Check for all caps (shouting)
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.7 && text.length > 20) {
    flags.push({
      type: 'excessive_caps',
      severity: 'low'
    });
    if (severity === 'none') severity = 'low';
  }

  return {
    isClean: flags.length === 0,
    flags,
    severity,
    flagsCount: flags.length
  };
}

/**
 * Flag suspicious profile for admin review
 * @param {string} userId - User ID
 * @param {string} reason - Reason for flagging
 * @param {string} content - Suspicious content
 */
async function flagProfile(userId, reason, content) {
  try {
    const { prisma } = require('../utils/database');
    
    const existingFlags = await prisma.user.count({
      where: {
        id: userId,
        isVerified: false,
        manualVerificationStatus: 'PENDING'
      }
    });

    if (existingFlags === 0) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          manualVerificationStatus: 'PENDING',
          profileVerificationStatus: 'Under Admin Review'
        }
      });
    }

    // Log moderation event
    console.log(`[MODERATION] Profile ${userId} flagged: ${reason}`);
    
    return {
      flagged: true,
      status: 'under_review'
    };
  } catch (error) {
    console.error('Profile flagging error:', error);
    return { flagged: false, error: error.message };
  }
}

/**
 * Content moderation middleware
 */
function contentModeration(req, res, next) {
  try {
    const textFields = ['message', 'content', 'aboutMe', 'bio'];
    const allText = [];

    // Collect text from request
    for (const field of textFields) {
      if (req.body[field]) {
        allText.push(req.body[field]);
      }
    }

    if (req.body.partnerPreferences && typeof req.body.partnerPreferences === 'string') {
      allText.push(req.body.partnerPreferences);
    }

    // Moderate each text field
    const moderationResults = allText.map(text => moderateContent(text));
    const hasViolation = moderationResults.some(r => !r.isClean && r.severity === 'high');

    if (hasViolation) {
      return res.status(400).json({
        error: 'Content violation detected',
        message: 'Your message contains inappropriate content. Please revise and try again.',
        details: moderationResults.filter(r => !r.isClean)
      });
    }

    // Attach moderation results to request
    req.moderationResults = moderationResults;
    
    // Auto-flag if medium/high severity
    const mediumHighViolations = moderationResults.filter(
      r => !r.isClean && (r.severity === 'medium' || r.severity === 'high')
    );

    if (mediumHighViolations.length > 2 && req.user) {
      flagProfile(req.user.id, 'Multiple content violations', mediumHighViolations.map(v => v.flags).flat().join(', '));
    }

    next();
  } catch (error) {
    console.error('Moderation middleware error:', error);
    next(); // Continue anyway if moderation fails
  }
}

module.exports = {
  moderateContent,
  flagProfile,
  contentModeration
};