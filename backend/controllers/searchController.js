const { prisma } = require('../utils/database');

const searchProfiles = async (req, res) => {
  try {
    const {
      gender,
      minAge,
      maxAge,
      community,
      subCaste,
      city,
      state,
      education,
      profession,
      maritalStatus,
      page = 1,
      limit = 20
    } = req.query;

    console.log('Search request received:', { gender, minAge, maxAge, community, subCaste, city, state, education, profession, maritalStatus, page, limit });

    const currentUserId = req.user?.id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause - normalize gender to title case for SQLite
    const normalizedGender = gender ? (gender.toLowerCase() === 'female' ? 'Female' : 'Male') : undefined;
    
    const where = {
      isActive: true,
      gender: normalizedGender,
      community: community ? { equals: community } : undefined,
      subCaste: subCaste ? { contains: subCaste } : undefined,
      city: city ? { contains: city, mode: 'insensitive' } : undefined,
      state: state ? { contains: state, mode: 'insensitive' } : undefined,
      education: education ? { contains: education, mode: 'insensitive' } : undefined,
      profession: profession ? { contains: profession, mode: 'insensitive' } : undefined,
      maritalStatus: maritalStatus ? { equals: maritalStatus } : undefined
    };

    // Handle age filter separately
    if (minAge || maxAge) {
      where.age = {
        gte: minAge ? parseInt(minAge) : undefined,
        lte: maxAge ? parseInt(maxAge) : undefined
      };
    }

    // Remove undefined values
    Object.keys(where).forEach(key => {
      if (where[key] === undefined) {
        delete where[key];
      }
    });

    console.log('Final where clause:', JSON.stringify(where, null, 2));

    // Get total count for pagination
    const totalCount = await prisma.user.count({ where });
    console.log('Total count:', totalCount);

    // Get profiles with pagination
    const profiles = await prisma.user.findMany({
      where,
      select: {
        id: true,
        customId: true,
        firstName: true,
        lastName: true,
        gender: true,
        age: true,
        community: true,
        subCaste: true,
        city: true,
        state: true,
        education: true,
        profession: true,
        income: true,
        maritalStatus: true,
        height: true,
        weight: true,
        complexion: true,
        profilePhoto: true,
        bio: true,
        isVerified: true,
        isPremium: true,
        createdAt: true
      },
      orderBy: [
        { isPremium: 'desc' },
        { isVerified: 'desc' },
        { createdAt: 'desc' }
      ],
      skip,
      take: parseInt(limit)
    });

    // Get existing interests for current user (only if logged in)
    let interestMap = {};
    if (currentUserId) {
      const existingInterests = await prisma.interest.findMany({
        where: {
          senderId: currentUserId,
          receiverId: { in: profiles.map(p => p.id) }
        },
        select: {
          receiverId: true,
          status: true
        }
      });

      // Map interests to profiles
      interestMap = existingInterests.reduce((acc, interest) => {
        acc[interest.receiverId] = interest.status;
        return acc;
      }, {});
    }

    // Add interest status to each profile
    const profilesWithInterestStatus = profiles.map(profile => ({
      ...profile,
      interestStatus: interestMap[profile.id] || null
    }));

    res.json({
      profiles: profilesWithInterestStatus,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalProfiles: totalCount,
        hasNext: skip + profiles.length < totalCount,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Search profiles error:', error);
    res.status(500).json({ error: 'Internal server error during search' });
  }
};

const getProfileById = async (req, res) => {
  try {
    const { profileId } = req.params;
    const currentUserId = req.user.id;

    const profile = await prisma.user.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        customId: true,
        firstName: true,
        lastName: true,
        gender: true,
        dateOfBirth: true,
        age: true,
        community: true,
        subCaste: true,
        city: true,
        state: true,
        country: true,
        pincode: true,
        address: true,
        education: true,
        profession: true,
        company: true,
        annualIncome: true,
        income: true,
        maritalStatus: true,
        height: true,
        weight: true,
        complexion: true,
        bodyType: true,
        bloodGroup: true,
        profilePhoto: true,
        photos: true,
        bio: true,
        aboutMe: true,
        // Family details
        fatherName: true,
        fatherOccupation: true,
        motherName: true,
        motherOccupation: true,
        brothers: true,
        sisters: true,
        brothersMarried: true,
        sistersMarried: true,
        familyType: true,
        familyStatus: true,
        familyValues: true,
        aboutFamily: true,
        // Horoscope details
        rashi: true,
        nakshatra: true,
        manglik: true,
        birthTime: true,
        birthPlace: true,
        birthDate: true,
        // Additional legacy fields
        raasi: true,
        natchathiram: true,
        dhosam: true,
        // Preferences
        preferredAgeRange: true,
        preferredHeightRange: true,
        preferredEducation: true,
        preferredOccupation: true,
        preferredLocation: true,
        // Status
        isActive: true,
        isVerified: true,
        isPremium: true,
        createdAt: true
      }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (!profile.isActive) {
      return res.status(404).json({ error: 'Profile not available' });
    }

    // Check if current user has sent interest to this profile
    const existingInterest = await prisma.interest.findUnique({
      where: {
        senderId_receiverId: {
          senderId: currentUserId,
          receiverId: profileId
        }
      },
      select: {
        status: true,
        createdAt: true
      }
    });

    // Add interest status to profile
    const profileWithInterestStatus = {
      ...profile,
      interestStatus: existingInterest?.status || null,
      interestSentAt: existingInterest?.createdAt || null
    };

    res.json({ profile: profileWithInterestStatus });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getSearchFilters = async (req, res) => {
  try {
    // Get unique values for filter dropdowns
    const [
      communities,
      subCastes,
      cities,
      states,
      educations,
      professions
    ] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true },
        select: { community: true },
        distinct: ['community']
      }),
      prisma.user.findMany({
        where: { isActive: true, subCaste: { not: null } },
        select: { subCaste: true },
        distinct: ['subCaste']
      }),
      prisma.user.findMany({
        where: { isActive: true },
        select: { city: true },
        distinct: ['city']
      }),
      prisma.user.findMany({
        where: { isActive: true },
        select: { state: true },
        distinct: ['state']
      }),
      prisma.user.findMany({
        where: { isActive: true, education: { not: null } },
        select: { education: true },
        distinct: ['education']
      }),
      prisma.user.findMany({
        where: { isActive: true, profession: { not: null } },
        select: { profession: true },
        distinct: ['profession']
      })
    ]);

    res.json({
      filters: {
        communities: communities.map(c => c.community).filter(Boolean),
        subCastes: subCastes.map(s => s.subCaste).filter(Boolean),
        cities: cities.map(c => c.city).filter(Boolean).sort(),
        states: states.map(s => s.state).filter(Boolean).sort(),
        educations: educations.map(e => e.education).filter(Boolean).sort(),
        professions: professions.map(p => p.profession).filter(Boolean).sort()
      }
    });

  } catch (error) {
    console.error('Get search filters error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getRecommendedProfiles = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { limit = 10 } = req.query;

    // Get current user's profile
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        gender: true,
        age: true,
        community: true,
        subCaste: true,
        city: true,
        state: true,
        education: true,
        profession: true,
        maritalStatus: true
      }
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build recommendation criteria
    const oppositeGender = currentUser.gender === 'MALE' ? 'FEMALE' : 'MALE';
    const ageRange = {
      gte: Math.max(18, currentUser.age - 10),
      lte: Math.min(100, currentUser.age + 10)
    };

    const where = {
      id: { not: currentUserId },
      gender: oppositeGender,
      age: ageRange,
      community: currentUser.community,
      isActive: true,
      isVerified: true // Only show verified profiles in recommendations
    };

    // Get recommended profiles
    const profiles = await prisma.user.findMany({
      where,
      select: {
        id: true,
        customId: true,
        firstName: true,
        lastName: true,
        gender: true,
        age: true,
        community: true,
        subCaste: true,
        city: true,
        state: true,
        education: true,
        profession: true,
        maritalStatus: true,
        height: true,
        profilePhoto: true,
        bio: true,
        isVerified: true,
        isPremium: true,
        createdAt: true
      },
      orderBy: [
        { isPremium: 'desc' },
        { isVerified: 'desc' },
        { createdAt: 'desc' }
      ],
      take: parseInt(limit)
    });

    // Get existing interests
    const existingInterests = await prisma.interest.findMany({
      where: {
        senderId: currentUserId,
        receiverId: { in: profiles.map(p => p.id) }
      },
      select: {
        receiverId: true,
        status: true
      }
    });

    const interestMap = existingInterests.reduce((acc, interest) => {
      acc[interest.receiverId] = interest.status;
      return acc;
    }, {});

    const profilesWithInterestStatus = profiles.map(profile => ({
      ...profile,
      interestStatus: interestMap[profile.id] || null
    }));

    res.json({ profiles: profilesWithInterestStatus });

  } catch (error) {
    console.error('Get recommended profiles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  searchProfiles,
  getProfileById,
  getSearchFilters,
  getRecommendedProfiles
};