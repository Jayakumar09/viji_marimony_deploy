/**
 * AI Features Controller
 * Handles AI-generated profiles, chat suggestions, and moderation
 */

const { generateProfileContent, createOrUpdateAIProfile } = require('../services/aiService');
const { findMatches, getMatchAnalysis } = require('../services/matchService');
const { hasPremiumAccess } = require('../middleware/premiumAccess');
const { moderateContent } = require('../middleware/contentModeration');
const OpenAI = require('openai');

// Initialize OpenAI client for chat suggestions
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 2,
  timeout: 15000
}) : null;

/**
 * Generate AI profile from basic info
 */
async function generateProfile(req, res) {
  try {
    const { firstName, lastName, age, gender, education, occupation, city, state, country, maritalStatus, religion, caste, motherTongue, aboutFamily, interests } = req.body;

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userInfo = {
      firstName,
      lastName,
      age,
      gender,
      education,
      occupation,
      city,
      state,
      country,
      maritalStatus,
      religion,
      caste,
      motherTongue
    };

    const context = {
      fatherName: req.body.fatherName,
      motherName: req.body.motherName,
      familyType: req.body.familyType,
      familyValues: req.body.familyValues,
      aboutFamily,
      interests,
      partnerPreferences: req.body.partnerPreferences
    };

    // Generate AI content
    const generated = await generateProfileContent(userInfo, context);

    // Validate generated content
    const moderation = moderateContent(generated.aboutMe);
    if (!moderation.isClean && moderation.severity === 'high') {
      return res.status(400).json({
        error: 'Generated content failed safety checks',
        message: 'Please try generating again with different inputs'
      });
    }

    // Create/update profile in database
    const profile = await createOrUpdateAIProfile(req.user.id, {
      ...userInfo,
      aboutMe: generated.aboutMe,
      partnerPreferences: req.body.partnerPreferences,
      photoUrls: req.body.photoUrls || []
    });

    res.json({
      success: true,
      message: 'Profile generated successfully',
      data: {
        profile: {
          ...profile,
          partnerPreferences: typeof profile.partnerPreferences === 'string'
            ? JSON.parse(profile.partnerPreferences)
            : profile.partnerPreferences
        },
        generated: {
          aboutMe: generated.aboutMe,
          personalitySummary: generated.personalitySummary
        }
      }
    });
  } catch (error) {
    console.error('Generate profile error:', error);
    res.status(500).json({
      error: 'Failed to generate profile',
      message: error.message
    });
  }
}

/**
 * Get AI-powered match suggestions
 */
async function getAISuggestions(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      minAge,
      maxAge,
      location,
      religion,
      caste,
      maritalStatus,
      education,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      minAge,
      maxAge,
      location,
      religion,
      caste,
      maritalStatus,
      education
    };

    const matches = await findMatches(req.user.id, filters);

    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMatches = matches.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        matches: paginatedMatches,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: matches.length,
          totalPages: Math.ceil(matches.length / limit),
          hasNext: endIndex < matches.length,
          hasPrev: startIndex > 0
        }
      }
    });
  } catch (error) {
    console.error('Get AI suggestions error:', error);
    res.status(500).json({
      error: 'Failed to get suggestions',
      message: error.message
    });
  }
}

/**
 * Get detailed match analysis
 */
async function getMatchDetails(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { userId } = req.params;

    const analysis = await getMatchAnalysis(req.user.id, userId);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Get match details error:', error);
    res.status(500).json({
      error: 'Failed to get match details',
      message: error.message
    });
  }
}

/**
 * Generate AI chat suggestions
 */
async function generateChatSuggestions(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { conversationContext, message, targetUserId } = req.body;

    if (!openai) {
      return res.status(400).json({
        error: 'AI service not configured',
        message: 'Chat suggestions require OpenAI API key'
      });
    }

    // Get profiles for context
    const [userProfile, targetProfile] = await Promise.all([
      prisma.profile.findUnique({ where: { userId: req.user.id } }),
      prisma.profile.findUnique({ where: { userId: targetUserId } })
    ]);

    const systemPrompt = `You are a helpful matrimonial conversation assistant. 
Generate 3 polite, respectful, and culturally appropriate response suggestions 
for continuing a conversation between two people interested in marriage.

Keep suggestions:
- Respectful and family-oriented
- Culturally appropriate (South Asian context)
- Conversational and natural
- 10-30 words each
- Positive and engaging

Format as JSON: { suggestions: ["suggestion1", "suggestion2", "suggestion3"] }`;

    const userPrompt = `
Conversation context: ${conversationContext || 'Starting conversation'}

Latest message from other person: "${message || 'Hi, I saw your profile'}"

Your profile: ${userProfile ? `Age ${userProfile.age}, ${userProfile.occupation || 'Professional'}, ${userProfile.location}` : ''}

Their profile: ${targetProfile ? `Age ${targetProfile.age}, ${targetProfile.occupation || 'Professional'}, ${targetProfile.location}` : ''}

Generate response suggestions.`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);

    res.json({
      success: true,
      data: {
        suggestions: result.suggestions || [],
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Generate chat suggestions error:', error);
    res.status(500).json({
      error: 'Failed to generate suggestions',
      message: error.message
    });
  }
}

/**
 * Check chat access
 */
async function checkChatAccess(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { targetUserId } = req.params;

    const access = await hasPremiumAccess(req.user.id, targetUserId);

    res.json({
      success: true,
      data: {
        canChat: access.hasAccess,
        accessType: access.type || 'none',
        subscription: access.subscription || null,
        interest: access.interest || null
      }
    });
  } catch (error) {
    console.error('Check chat access error:', error);
    res.status(500).json({
      error: 'Failed to check access',
      message: error.message
    });
  }
}

/**
 * Get user's AI profile
 */
async function getAIProfile(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            gender: true,
            age: true,
            city: true,
            state: true,
            country: true,
            isVerified: true
          }
        }
      }
    });

    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found',
        message: 'No AI profile found for this user'
      });
    }

    res.json({
      success: true,
      data: {
        ...profile,
        partnerPreferences: typeof profile.partnerPreferences === 'string'
          ? JSON.parse(profile.partnerPreferences)
          : profile.partnerPreferences
      }
    });
  } catch (error) {
    console.error('Get AI profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: error.message
    });
  }
}

/**
 * Update AI profile
 */
async function updateAIProfile(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { aboutMe, partnerPreferences, photoUrls, isVerified } = req.body;

    const updateData = {};
    if (aboutMe !== undefined) updateData.aboutMe = aboutMe;
    if (partnerPreferences !== undefined) {
      updateData.partnerPreferences = typeof partnerPreferences === 'string'
        ? partnerPreferences
        : JSON.stringify(partnerPreferences);
    }
    if (photoUrls !== undefined) updateData.photoUrls = photoUrls;
    if (isVerified !== undefined) updateData.isVerified = isVerified;

    const profile = await prisma.profile.update({
      where: { userId: req.user.id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        ...profile,
        partnerPreferences: typeof profile.partnerPreferences === 'string'
          ? JSON.parse(profile.partnerPreferences)
          : profile.partnerPreferences
      }
    });
  } catch (error) {
    console.error('Update AI profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: error.message
    });
  }
}

module.exports = {
  generateProfile,
  getAISuggestions,
  getMatchDetails,
  generateChatSuggestions,
  checkChatAccess,
  getAIProfile,
  updateAIProfile
};