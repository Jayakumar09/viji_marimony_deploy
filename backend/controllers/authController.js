const { prisma } = require('../utils/database');
const { generateToken } = require('../utils/jwt');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateUserId, initCounter } = require('../utils/userIdGenerator');

// Initialize counter on first registration call
initCounter().catch(console.error);

const register = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      gender,
      dateOfBirth,
      city,
      state,
      country = 'India',
      community = 'Boyar',
      subCaste,
      maritalStatus
    } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          phone ? { phone } : {}
        ].filter(condition => Object.keys(condition).length > 0)
      }
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      if (existingUser.phone === phone) {
        return res.status(400).json({ error: 'Phone number already registered' });
      }
    }

    // Calculate age from date of birth
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Generate custom user ID
    const customId = generateUserId(firstName, lastName);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        phone,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        customId: customId,
        gender,
        dateOfBirth: birthDate,
        age,
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        community,
        subCaste: subCaste?.trim(),
        maritalStatus
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        gender: true,
        isVerified: false,
        isPremium: false
      }
    });

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt for email:', email.toLowerCase());

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
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
        education: true,
        profession: true,
        income: true,
        maritalStatus: true,
        height: true,
        weight: true,
        complexion: true,
        profilePhoto: true,
        photos: true,
        bio: true,
        familyValues: true,
        familyType: true,
        familyStatus: true,
        aboutFamily: true,
        isVerified: true,
        isPremium: true,
        subscriptionTier: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        isActive: true,
        lastLoginAt: true
      }
    });

    if (!user) {
      console.log('User not found');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('User found:', user.email, 'Password hash:', user.password.substring(0, 20) + '...');

    if (!user.isActive) {
      console.log('User account is deactivated');
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    console.log('Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('Invalid password');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate token
    const token = generateToken(user.id);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Normalize profile photo path
    if (userWithoutPassword.profilePhoto && !userWithoutPassword.profilePhoto.startsWith('http') && !userWithoutPassword.profilePhoto.startsWith('/')) {
      userWithoutPassword.profilePhoto = `/${userWithoutPassword.profilePhoto}`;
    }

    // Normalize photos array paths (photos is stored as JSON string in SQLite)
    if (userWithoutPassword.photos) {
      try {
        const photosArray = typeof userWithoutPassword.photos === 'string' 
          ? JSON.parse(userWithoutPassword.photos) 
          : userWithoutPassword.photos;
        if (Array.isArray(photosArray)) {
          userWithoutPassword.photos = photosArray.map(photo => {
            if (!photo.startsWith('http') && !photo.startsWith('/')) {
              return `/${photo}`;
            }
            return photo;
          });
        }
      } catch (e) {
        userWithoutPassword.photos = [];
      }
    }

    // Sync subscription status from Subscription table
    // Get the most recent active subscription (with furthest end date)
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
        endDate: { gte: new Date() }
      },
      orderBy: {
        endDate: 'desc'
      }
    });
    
    if (activeSubscription) {
      const planTier = activeSubscription.plan.toUpperCase();
      if (planTier !== userWithoutPassword.subscriptionTier) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionTier: planTier,
            isPremium: true,
            subscriptionStart: activeSubscription.startDate,
            subscriptionEnd: activeSubscription.endDate
          }
        });
        userWithoutPassword.subscriptionTier = planTier;
        userWithoutPassword.isPremium = true;
        userWithoutPassword.subscriptionStart = activeSubscription.startDate;
        userWithoutPassword.subscriptionEnd = activeSubscription.endDate;
      }
    } else if (userWithoutPassword.subscriptionEnd && new Date(userWithoutPassword.subscriptionEnd) < new Date()) {
      // Subscription expired
      await prisma.user.update({
        where: { id: user.id },
        data: { isPremium: false }
      });
      userWithoutPassword.isPremium = false;
    }

    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        customId: true,
        email: true,
        phone: true,
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
        education: true,
        profession: true,
        income: true,
        maritalStatus: true,
        height: true,
        weight: true,
        complexion: true,
        physicalStatus: true,
        drinkingHabit: true,
        smokingHabit: true,
        diet: true,
        profilePhoto: true,
        profilePhotoScale: true,
        profilePhotoX: true,
        profilePhotoY: true,
        photos: true,
        bio: true,
        familyValues: true,
        familyType: true,
        familyStatus: true,
        aboutFamily: true,
        isVerified: true,
        isPremium: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        photosVerified: true,
        // Family background fields
        fatherName: true,
        fatherOccupation: true,
        fatherCaste: true,
        motherName: true,
        motherOccupation: true,
        motherCaste: true,
        // Horoscope fields
        raasi: true,
        natchathiram: true,
        dhosam: true,
        birthDate: true,
        birthTime: true,
        birthPlace: true,
        // Subscription fields
        subscriptionTier: true,
        successFee: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        // Verification
        manualVerificationStatus: true,
        manualVerificationNotes: true,
        profileVerificationStatus: true,
        profileVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Normalize profile photo path if it's a local file path
    if (user.profilePhoto && !user.profilePhoto.startsWith('http') && !user.profilePhoto.startsWith('/')) {
      user.profilePhoto = `/${user.profilePhoto}`;
    }

    // Normalize photos array paths (photos is stored as JSON string in SQLite)
    if (user.photos) {
      try {
        const photosArray = typeof user.photos === 'string' 
          ? JSON.parse(user.photos) 
          : user.photos;
        if (Array.isArray(photosArray)) {
          user.photos = photosArray.map(photo => {
            if (!photo.startsWith('http') && !photo.startsWith('/')) {
              return `/${photo}`;
            }
            return photo;
          });
        }
      } catch (e) {
        user.photos = [];
      }
    }

    // Sync subscription status from Subscription table
    // Get the most recent active subscription (with furthest end date)
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
        endDate: { gte: new Date() }
      },
      orderBy: {
        endDate: 'desc'
      }
    });
    
    if (activeSubscription) {
      const planTier = activeSubscription.plan.toUpperCase();
      if (planTier !== user.subscriptionTier) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionTier: planTier,
            isPremium: true,
            subscriptionStart: activeSubscription.startDate,
            subscriptionEnd: activeSubscription.endDate
          }
        });
        user.subscriptionTier = planTier;
        user.isPremium = true;
        user.subscriptionStart = activeSubscription.startDate;
        user.subscriptionEnd = activeSubscription.endDate;
      }
    } else if (user.subscriptionEnd && new Date(user.subscriptionEnd) < new Date()) {
      // Subscription expired
      await prisma.user.update({
        where: { id: user.id },
        data: { isPremium: false }
      });
      user.isPremium = false;
    }

    res.json({ user });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      'phone', 'education', 'profession', 'income', 'height', 
      'weight', 'complexion', 'bio', 'familyValues', 'familyType', 'familyStatus', 'aboutFamily', 'subCaste'
    ];

    const updateData = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = req.body[key];
      }
    });

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        gender: true,
        education: true,
        profession: true,
        income: true,
        height: true,
        weight: true,
        complexion: true,
        bio: true,
        familyValues: true,
        familyType: true,
        familyStatus: true,
        aboutFamily: true,
        subCaste: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error during profile update' });
  }
};

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }
    
    if (!admin.isActive) {
      return res.status(401).json({ error: 'Admin account is deactivated' });
    }
    
    // Check password
    const isPasswordValid = await comparePassword(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }
    
    // Update last login
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() }
    });
    
    // Generate token
    const token = generateToken(admin.id);
    
    // Remove password from response
    const { password: _, ...adminWithoutPassword } = admin;
    
    res.json({
      message: 'Admin login successful',
      token,
      admin: adminWithoutPassword
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error during admin login' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  adminLogin
};