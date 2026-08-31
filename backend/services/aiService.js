const { prisma } = require('../utils/database');
const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE_URL || undefined,
  maxRetries: 3,
  timeout: 30000,
});

const CULTURAL_GUIDELINES = `You are an expert matrimonial matchmaker specializing in South Asian (particularly Boyar community) cultural values. 
Generate culturally appropriate, respectful, and family-oriented profiles. Focus on traditional values, 
family background, compatibility factors, and positive attributes. Avoid controversial topics, 
use respectful language, and emphasize commitment to marriage and family.`;

/**
 * Generate AI-powered profile content
 * @param {Object} userInfo - Basic user information
 * @param {Object} context - Additional context (family, preferences, etc.)
 * @returns {Promise<Object>} Generated profile content
 */
async function generateProfileContent(userInfo, context = {}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  const prompt = `
${CULTURAL_GUIDELINES}

Generate a matrimonial profile for the following person:

Basic Information:
- Name: ${userInfo.firstName || 'N/A'} ${userInfo.lastName || 'N/A'}
- Age: ${userInfo.age || 'N/A'}
- Gender: ${userInfo.gender || 'N/A'}
- Education: ${userInfo.education || 'N/A'}
- Occupation: ${userInfo.profession || userInfo.occupation || 'N/A'}
- Location: ${userInfo.city || 'N/A'}, ${userInfo.state || 'N/A'}, ${userInfo.country || 'India'}
- Marital Status: ${userInfo.maritalStatus || 'N/A'}
- Community: ${userInfo.community || 'Boyar'}

Family Background:
${context.fatherName ? `- Father: ${context.fatherName}` : ''}
${context.motherName ? `- Mother: ${context.motherName}` : ''}
${context.familyType ? `- Family Type: ${context.familyType}` : ''}
${context.familyValues ? `- Family Values: ${context.familyValues}` : ''}

About Family:
${context.aboutFamily || 'Traditional family values'}

Hobbies & Interests:
${context.interests || 'Family-oriented activities'}

Partner Preferences (if provided):
${context.partnerPreferences || 'Looking for a compatible life partner'}

Instructions:
1. Write a warm, respectful "About Me" section (150-250 words)
2. Write a summary of personality and values (100-150 words)
3. Emphasize family values, commitment, and cultural compatibility
4. Keep tone positive, humble, and marriage-focused
5. Use appropriate cultural references and family-oriented language
6. Highlight strengths without exaggeration

Format response as JSON with fields: aboutMe, personalitySummary`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: CULTURAL_GUIDELINES
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    return {
      aboutMe: result.aboutMe || '',
      personalitySummary: result.personalitySummary || '',
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('OpenAI API Error:', error.message);
    throw new Error(`Failed to generate profile: ${error.message}`);
  }
}

/**
 * Create or update AI profile for a user
 * @param {string} userId - User ID
 * @param {Object} profileData - Profile data
 * @returns {Promise<Object>} Created/updated profile
 */
async function createOrUpdateAIProfile(userId, profileData) {
  try {
    const existingProfile = await prisma.profile.findUnique({
      where: { userId }
    });

    const profileInput = {
      gender: profileData.gender || '',
      dob: profileData.dob || new Date(),
      age: profileData.age || 0,
      religion: profileData.religion || '',
      caste: profileData.caste || '',
      motherTongue: profileData.motherTongue || '',
      maritalStatus: profileData.maritalStatus || '',
      education: profileData.education || '',
      occupation: profileData.occupation || '',
      income: profileData.income || '',
      location: profileData.location || '',
      aboutMe: profileData.aboutMe || '',
      partnerPreferences: profileData.partnerPreferences ? JSON.stringify(profileData.partnerPreferences) : null,
      photoUrls: profileData.photoUrls || [],
      isVerified: profileData.isVerified || false,
      userId: userId
    };

    let profile;
    if (existingProfile) {
      profile = await prisma.profile.update({
        where: { id: existingProfile.id },
        data: profileInput
      });
    } else {
      profile = await prisma.profile.create({
        data: profileInput
      });
    }

    return profile;
  } catch (error) {
    console.error('Profile creation/update error:', error);
    throw error;
  }
}

/**
 * Get AI profile with match recommendations
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Profile with recommendations
 */
async function getAIProfileWithRecommendations(userId) {
  const profile = await prisma.profile.findUnique({
    where: { userId },
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
          country: true
        }
      }
    }
  });

  if (!profile) {
    throw new Error('Profile not found');
  }

  return {
    ...profile,
    partnerPreferences: typeof profile.partnerPreferences === 'string' 
      ? JSON.parse(profile.partnerPreferences) 
      : profile.partnerPreferences
  };
}

module.exports = {
  generateProfileContent,
  createOrUpdateAIProfile,
  getAIProfileWithRecommendations
};