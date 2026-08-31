const { prisma } = require('../utils/database');

/**
 * Calculate match score between two profiles
 * @param {Object} profile1 
 * @param {Object} profile2 
 * @returns {number} Match score 0-100
 */
function calculateMatchScore(profile1, profile2) {
  let score = 0;
  const maxScore = 100;

  // Age compatibility (20 points)
  const ageDiff = Math.abs(profile1.age - profile2.age);
  if (ageDiff <= 2) score += 20;
  else if (ageDiff <= 5) score += 15;
  else if (ageDiff <= 8) score += 10;
  else if (ageDiff <= 10) score += 5;

  // Location match (15 points)
  if (profile1.location === profile2.location) score += 15;
  else {
    // Parse location
    const loc1 = profile1.location.toLowerCase();
    const loc2 = profile2.location.toLowerCase();
    
    // Same state
    if (profile1.state && profile2.state && profile1.state === profile2.state) {
      score += 10;
    } else if (loc1.includes(loc2) || loc2.includes(loc1)) {
      score += 8;
    } else {
      score += 5; // Different locations but still possible
    }
  }

  // Religion match (15 points)
  if (profile1.religion && profile2.religion) {
    if (profile1.religion.toLowerCase() === profile2.religion.toLowerCase()) {
      score += 15;
    } else {
      score += 5; // Different religions, lower compatibility
    }
  }

  // Caste/community match (15 points)
  if (profile1.caste && profile2.caste) {
    if (profile1.caste.toLowerCase() === profile2.caste.toLowerCase()) {
      score += 15;
    } else {
      score += 8; // Different castes but still possible
    }
  }

  // Education level compatibility (10 points)
  const eduLevels = {
    'highschool': 1, 'diploma': 2, 'bachelor': 3, 'master': 4, 'phd': 5, 'professional': 4
  };
  const edu1 = eduLevels[profile1.education?.toLowerCase()] || 0;
  const edu2 = eduLevels[profile2.education?.toLowerCase()] || 0;
  if (edu1 > 0 && edu2 > 0) {
    const eduDiff = Math.abs(edu1 - edu2);
    if (eduDiff === 0) score += 10;
    else if (eduDiff === 1) score += 8;
    else if (eduDiff === 2) score += 5;
  }

  // Marital status (10 points)
  if (profile1.maritalStatus && profile2.maritalStatus) {
    if (profile1.maritalStatus.toLowerCase() === profile2.maritalStatus.toLowerCase()) {
      score += 10;
    }
  }

  // Occupation compatibility (10 points)
  if (profile1.occupation && profile2.occupation) {
    // Professional occupations tend to match well
    const professionalJobs = ['engineer', 'doctor', 'lawyer', 'manager', 'consultant', 'scientist', 'professor'];
    const isProf1 = professionalJobs.some(job => profile1.occupation.toLowerCase().includes(job));
    const isProf2 = professionalJobs.some(job => profile2.occupation.toLowerCase().includes(job));
    
    if (isProf1 && isProf2) score += 8;
    else if (isProf1 || isProf2) score += 5;
    else score += 5; // Other occupations still compatible
  }

  // Language/culture match - mother tongue (5 points)
  if (profile1.motherTongue && profile2.motherTongue) {
    if (profile1.motherTongue.toLowerCase() === profile2.motherTongue.toLowerCase()) {
      score += 5;
    } else {
      score += 2;
    }
  }

  return Math.min(maxScore, Math.max(0, score));
}

/**
 * Filter and score potential matches for a user
 * @param {string} userId - User ID
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Sorted matches with scores
 */
async function findMatches(userId, filters = {}) {
  const userProfile = await prisma.profile.findUnique({
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
          country: true,
          isVerified: true,
          isActive: true,
          profilePhoto: true
        }
      }
    }
  });

  if (!userProfile) {
    throw new Error('User profile not found. Please create a profile first.');
  }

  const user = userProfile.user;

  // Build where clause for filtering
  const whereClause = {
    AND: [
      { id: { not: userId } }, // Exclude self
      { isActive: true }, // Only active users
      { emailVerified: true }, // Must have verified email
      {
        OR: [
          // Gender-based filtering - opposite gender matches
          {
            AND: [
              { gender: user.gender === 'Male' ? 'Female' : 'Male' },
              { profile: { is: { maritalStatus: userProfile.maritalStatus || 'Never Married' } } }
            ]
          }
        ]
      }
    ]
  };

  // Apply age filter
  if (filters.minAge || filters.maxAge) {
    whereClause.AND.push({
      age: {
        ...(filters.minAge && { gte: parseInt(filters.minAge) }),
        ...(filters.maxAge && { lte: parseInt(filters.maxAge) })
      }
    });
  }

  // Apply location filter
  if (filters.location) {
    whereClause.AND.push({
      OR: [
        { city: { contains: filters.location, mode: 'insensitive' } },
        { state: { contains: filters.location, mode: 'insensitive' } },
        { country: { contains: filters.location, mode: 'insensitive' } }
      ]
    });
  }

  // Apply caste/religion filter
  if (filters.religion) {
    whereClause.AND.push({ religion: { contains: filters.religion, mode: 'insensitive' } });
  }
  if (filters.caste) {
    whereClause.AND.push({ caste: { contains: filters.caste, mode: 'insensitive' } });
  }

  // Apply marital status filter
  if (filters.maritalStatus) {
    whereClause.AND.push({ maritalStatus: filters.maritalStatus });
  }

  // Apply education filter
  if (filters.education) {
    whereClause.AND.push({ education: { contains: filters.education, mode: 'insensitive' } });
  }

  // Fetch potential matches with their profiles
  const potentialMatches = await prisma.user.findMany({
    where: whereClause,
    include: {
      profile: {
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
              isVerified: true,
              profilePhoto: true
            }
          }
        }
      },
      sentInterests: {
        where: {
          receiverId: userId,
          status: 'ACCEPTED'
        },
        select: { id: true }
      },
      receivedInterests: {
        where: {
          senderId: userId,
          status: 'ACCEPTED'
        },
        select: { id: true }
      }
    }
  });

  // Calculate match scores and enrich data
  const matches = await Promise.all(potentialMatches.map(async (match) => {
    if (!match.profile) return null;

    const matchProfile = match.profile;
    const score = calculateMatchScore(userProfile, matchProfile);

    // Check if there's already an interest connection
    const existingInterest = await prisma.interest.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: match.id },
          { senderId: match.id, receiverId: userId }
        ]
      }
    });

    // Check for mutual interest
    const hasExpressedInterest = await prisma.interest.findFirst({
      where: {
        senderId: userId,
        receiverId: match.id
      }
    });

    return {
      user: {
        id: match.id,
        firstName: match.firstName,
        lastName: match.lastName,
        email: match.email,
        gender: match.gender,
        age: match.age,
        city: match.city,
        state: match.state,
        country: match.country,
        isVerified: match.isVerified,
        profilePhoto: match.profilePhoto
      },
      profile: {
        ...matchProfile,
        partnerPreferences: typeof matchProfile.partnerPreferences === 'string'
          ? JSON.parse(matchProfile.partnerPreferences)
          : matchProfile.partnerPreferences
      },
      matchScore: score,
      compatibility: {
        ageDiff: Math.abs(user.age - match.age),
        sameLocation: user.city === match.city,
        sameState: user.state === match.state,
        sameReligion: userProfile.religion?.toLowerCase() === matchProfile.religion?.toLowerCase(),
        sameCaste: userProfile.caste?.toLowerCase() === matchProfile.caste?.toLowerCase()
      },
      connectionStatus: {
        hasExpressedInterest: !!hasExpressedInterest,
        interestStatus: existingInterest?.status || null,
        canMessage: existingInterest?.status === 'ACCEPTED'
      },
      strengths: getMatchStrengths(userProfile, matchProfile)
    };
  }));

  // Filter out nulls and sort by match score
  return matches
    .filter(m => m !== null)
    .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Get match strengths summary
 */
function getMatchStrengths(profile1, profile2) {
  const strengths = [];

  if (Math.abs(profile1.age - profile2.age) <= 2) {
    strengths.push('Age compatibility');
  }
  if (profile1.location === profile2.location) {
    strengths.push('Same location');
  } else if (profile1.state === profile2.state) {
    strengths.push('Same state');
  }
  if (profile1.religion?.toLowerCase() === profile2.religion?.toLowerCase()) {
    strengths.push('Same religion');
  }
  if (profile1.caste?.toLowerCase() === profile2.caste?.toLowerCase()) {
    strengths.push('Same caste/community');
  }
  if (profile1.education && profile2.education && 
      profile1.education.toLowerCase() === profile2.education.toLowerCase()) {
    strengths.push('Similar education');
  }

  return strengths;
}

/**
 * Get detailed match analysis
 */
async function getMatchAnalysis(userId, targetUserId) {
  const userProfile = await prisma.profile.findUnique({
    where: { userId }
  });

  const targetProfile = await prisma.profile.findUnique({
    where: { userId: targetUserId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          age: true,
          city: true,
          state: true,
          country: true
        }
      }
    }
  });

  if (!userProfile || !targetProfile) {
    throw new Error('Profile not found');
  }

  const score = calculateMatchScore(userProfile, targetProfile);

  return {
    user: targetProfile.user,
    matchScore: score,
    compatibility: {
      age: {
        user: userProfile.age,
        target: targetProfile.age,
        difference: Math.abs(userProfile.age - targetProfile.age),
        compatible: Math.abs(userProfile.age - targetProfile.age) <= 5
      },
      location: {
        user: userProfile.location,
        target: targetProfile.location,
        sameLocation: userProfile.location === targetProfile.location,
        sameState: userProfile.state === targetProfile.state
      },
      religion: {
        user: userProfile.religion,
        target: targetProfile.religion,
        same: userProfile.religion?.toLowerCase() === targetProfile.religion?.toLowerCase()
      },
      caste: {
        user: userProfile.caste,
        target: targetProfile.caste,
        same: userProfile.caste?.toLowerCase() === targetProfile.caste?.toLowerCase()
      },
      education: {
        user: userProfile.education,
        target: targetProfile.education
      },
      occupation: {
        user: userProfile.occupation,
        target: targetProfile.occupation
      },
      maritalStatus: {
        user: userProfile.maritalStatus,
        target: targetProfile.maritalStatus,
        same: userProfile.maritalStatus === targetProfile.maritalStatus
      }
    },
    strengths: getMatchStrengths(userProfile, targetProfile),
    recommendations: getMatchRecommendations(userProfile, targetProfile, score)
  };
}

/**
 * Generate match recommendations
 */
function getMatchRecommendations(profile1, profile2, score) {
  const recommendations = [];

  if (score >= 80) {
    recommendations.push('Excellent match! Strong compatibility across all factors.');
  } else if (score >= 60) {
    recommendations.push('Good match with solid compatibility. Worth exploring further.');
  } else if (score >= 40) {
    recommendations.push('Moderate compatibility. Consider meeting to see personal chemistry.');
  } else {
    recommendations.push('Low compatibility. You may want to explore other matches.');
  }

  if (Math.abs(profile1.age - profile2.age) > 10) {
    recommendations.push('Note: Significant age difference. Ensure life stage alignment.');
  }
  if (profile1.location !== profile2.location && profile1.state !== profile2.state) {
    recommendations.push('Note: Different locations. Discuss relocation preferences.');
  }

  return recommendations;
}

module.exports = {
  calculateMatchScore,
  findMatches,
  getMatchAnalysis
};