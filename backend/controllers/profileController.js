const { prisma } = require('../utils/database');
const { extractPublicId, deleteImage } = require('../utils/upload');
const sseService = require('../services/sseService');

// Subscription plans configuration
const SUBSCRIPTION_PLANS = [
  { id: 'FREE', name: 'Free', price: 0, successFee: 0 },
  { id: 'STANDARD', name: 'Standard', price: 999, successFee: 5000 },
  { id: 'PREMIUM', name: 'Premium', price: 2499, successFee: 10000 },
  { id: 'ELITE', name: 'Elite', price: 4999, successFee: 25000 }
];

const getProfile = async (req, res) => {
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
        lastLoginAt: true,
        // Horoscope fields
        raasi: true,
        natchathiram: true,
        dhosam: true,
        birthDate: true,
        birthTime: true,
        birthPlace: true,
        // Family background fields
        fatherName: true,
        fatherOccupation: true,
        fatherCaste: true,
        motherName: true,
        motherOccupation: true,
        motherCaste: true,
        // Subscription fields
        subscriptionTier: true,
        successFee: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        // Manual verification
        manualVerificationStatus: true,
        manualVerificationNotes: true,
        // Profile verification
        profileVerificationStatus: true,
        profileVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Normalize profile photo path
    if (user.profilePhoto && !user.profilePhoto.startsWith('http') && !user.profilePhoto.startsWith('/')) {
      user.profilePhoto = `/${user.profilePhoto}`;
    }

    // Normalize photos array paths
    let photosArray = [];
    if (user.photos) {
      try {
        photosArray = JSON.parse(user.photos);
      } catch (e) {
        photosArray = [];
      }
    }
    if (Array.isArray(photosArray)) {
      user.photos = photosArray.map(photo => {
        if (!photo.startsWith('http') && !photo.startsWith('/')) {
          return `/${photo}`;
        }
        return photo;
      });
    } else {
      user.photos = [];
    }

    // Get user documents
    const documents = await prisma.document.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        documentType: true,
        documentUrl: true,
        fileName: true,
        status: true,
        uploadedAt: true
      }
    });
    user.documents = documents;

    // Sync isPremium with subscription status
    // Check both user fields and Subscription table for active subscriptions
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
    
    let shouldBePremium = false;
    
    // Check if user has active subscription in Subscription table
    if (activeSubscription) {
      shouldBePremium = true;
      // Sync subscription tier from Subscription table to user if different
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
    } else if (user.subscriptionTier && user.subscriptionTier !== 'FREE') {
      // Check if user subscription has expired
      if (user.subscriptionEnd && new Date(user.subscriptionEnd) < new Date()) {
        // Subscription expired - update isPremium to false
        await prisma.user.update({
          where: { id: user.id },
          data: { isPremium: false }
        });
        user.isPremium = false;
      } else if (user.subscriptionEnd && new Date(user.subscriptionEnd) >= new Date()) {
        // Subscription is still valid based on user fields
        shouldBePremium = true;
      }
    }
    
    user.isPremium = shouldBePremium;

    res.json({ user });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      phone,
      gender,
      dateOfBirth,
      age,
      city,
      state,
      country,
      community,
      education,
      profession,
      income,
      maritalStatus,
      height,
      weight,
      complexion,
      physicalStatus,
      drinkingHabit,
      smokingHabit,
      diet,
      bio,
      familyValues,
      familyType,
      familyStatus,
      aboutFamily,
      subCaste
    } = req.body;

    const updateData = {};
    
    if (phone !== undefined) updateData.phone = phone;
    if (gender !== undefined) updateData.gender = gender;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = new Date(dateOfBirth);
    if (age !== undefined) updateData.age = parseInt(age);
    // Auto-calculate age if dateOfBirth is provided
    if (dateOfBirth !== undefined) {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      updateData.age = calculatedAge;
    } else if (age !== undefined) {
      updateData.age = parseInt(age);
    }
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (country !== undefined) updateData.country = country;
    if (community !== undefined) updateData.community = community;
    if (education !== undefined) updateData.education = education;
    if (profession !== undefined) updateData.profession = profession;
    if (income !== undefined) updateData.income = income;
    if (maritalStatus !== undefined) updateData.maritalStatus = maritalStatus;
    if (height !== undefined) updateData.height = height;
    if (weight !== undefined) updateData.weight = weight;
    if (complexion !== undefined) updateData.complexion = complexion;
    if (physicalStatus !== undefined) updateData.physicalStatus = physicalStatus;
    if (drinkingHabit !== undefined) updateData.drinkingHabit = drinkingHabit;
    if (smokingHabit !== undefined) updateData.smokingHabit = smokingHabit;
    if (diet !== undefined) updateData.diet = diet;
    if (bio !== undefined) updateData.bio = bio;
    if (familyValues !== undefined) updateData.familyValues = familyValues;
    if (familyType !== undefined) updateData.familyType = familyType;
    if (familyStatus !== undefined) updateData.familyStatus = familyStatus;
    if (aboutFamily !== undefined) updateData.aboutFamily = aboutFamily;
    if (subCaste !== undefined) updateData.subCaste = subCaste;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        customId: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        gender: true,
        dateOfBirth: true,
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
        bio: true,
        familyValues: true,
        familyType: true,
        familyStatus: true,
        aboutFamily: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

    // Broadcast profile update to all connected clients
    sseService.broadcastProfileUpdate(updatedUser.id, Object.keys(updateData));
    sseService.broadcastAdminUpdate('profile_updated', { userId: updatedUser.id, customId: updatedUser.customId });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error during profile update' });
  }
};

// ============ HOROSCOPE FIELDS ============
const updateHoroscope = async (req, res) => {
  try {
    const {
      raasi,
      natchathiram,
      dhosam,
      birthDate,
      birthTime,
      birthPlace
    } = req.body;

    const updateData = {};
    if (raasi !== undefined) updateData.raasi = raasi;
    if (natchathiram !== undefined) updateData.natchathiram = natchathiram;
    if (dhosam !== undefined) updateData.dhosam = dhosam;
    if (birthDate !== undefined) updateData.birthDate = birthDate;
    if (birthTime !== undefined) updateData.birthTime = birthTime;
    if (birthPlace !== undefined) updateData.birthPlace = birthPlace;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        raasi: true,
        natchathiram: true,
        dhosam: true,
        birthDate: true,
        birthTime: true,
        birthPlace: true
      }
    });

    res.json({
      message: 'Horoscope details updated successfully',
      user: updatedUser
    });

    // Broadcast profile update to all connected clients
    sseService.broadcastProfileUpdate(updatedUser.id, Object.keys(updateData));

  } catch (error) {
    console.error('Update horoscope error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============ FAMILY BACKGROUND FIELDS ============
const updateFamilyBackground = async (req, res) => {
  try {
    const {
      fatherName,
      fatherOccupation,
      fatherCaste,
      motherName,
      motherOccupation,
      motherCaste,
      familyValues,
      familyType,
      familyStatus,
      aboutFamily
    } = req.body;

    const updateData = {};
    if (fatherName !== undefined) updateData.fatherName = fatherName;
    if (fatherOccupation !== undefined) updateData.fatherOccupation = fatherOccupation;
    if (fatherCaste !== undefined) updateData.fatherCaste = fatherCaste;
    if (motherName !== undefined) updateData.motherName = motherName;
    if (motherOccupation !== undefined) updateData.motherOccupation = motherOccupation;
    if (motherCaste !== undefined) updateData.motherCaste = motherCaste;
    if (familyValues !== undefined) updateData.familyValues = familyValues;
    if (familyType !== undefined) updateData.familyType = familyType;
    if (familyStatus !== undefined) updateData.familyStatus = familyStatus;
    if (aboutFamily !== undefined) updateData.aboutFamily = aboutFamily;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        fatherName: true,
        fatherOccupation: true,
        fatherCaste: true,
        motherName: true,
        motherOccupation: true,
        motherCaste: true,
        familyValues: true,
        familyType: true,
        familyStatus: true,
        aboutFamily: true
      }
    });

    res.json({
      message: 'Family background updated successfully',
      user: updatedUser
    });

    // Broadcast profile update to all connected clients
    sseService.broadcastProfileUpdate(updatedUser.id, Object.keys(updateData));

  } catch (error) {
    console.error('Update family background error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============ SUBSCRIPTION FIELDS ============
const updateSubscription = async (req, res) => {
  try {
    const { subscriptionTier } = req.body;

    if (!subscriptionTier) {
      return res.status(400).json({ error: 'Subscription tier is required' });
    }

    // Find the plan
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === subscriptionTier);
    if (!plan) {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }

    // Calculate subscription dates
    const startDate = new Date();
    let endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // Default 1 year

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        subscriptionTier: subscriptionTier,
        successFee: plan.successFee,
        subscriptionStart: startDate,
        subscriptionEnd: endDate,
        isPremium: subscriptionTier !== 'FREE'
      },
      select: {
        id: true,
        subscriptionTier: true,
        successFee: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        isPremium: true
      }
    });

    res.json({
      message: 'Subscription updated successfully',
      user: updatedUser
    });

    // Broadcast subscription update to all connected clients
    sseService.broadcastProfileUpdate(updatedUser.id, ['subscriptionTier', 'isPremium']);
    sseService.broadcastAdminUpdate('subscription_updated', { userId: updatedUser.id, subscriptionTier: updatedUser.subscriptionTier });

  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getSubscriptionPlans = async (req, res) => {
  try {
    res.json({
      plans: SUBSCRIPTION_PLANS,
      note: 'Success fee is applicable only when marriage is fixed through our platform. This follows the guidelines set by the Government of India for matrimonial services.'
    });
  } catch (error) {
    console.error('Get subscription plans error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============ DOCUMENTS ============
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document uploaded' });
    }

    const { documentType } = req.body;
    if (!documentType) {
      return res.status(400).json({ error: 'Document type is required' });
    }

    // Normalize document URL
    let documentUrl;
    if (req.file.path && req.file.path.startsWith('http')) {
      documentUrl = req.file.path;
    } else {
      documentUrl = `/uploads/${req.file.filename}`;
    }

    // Create document record
    const document = await prisma.document.create({
      data: {
        userId: req.user.id,
        documentType: documentType,
        documentUrl: documentUrl,
        fileName: req.file.originalname,
        status: 'PENDING'
      }
    });

    res.json({
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        documentType: document.documentType,
        documentUrl: document.documentUrl,
        fileName: document.fileName,
        status: document.status,
        uploadedAt: document.uploadedAt
      }
    });

  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getDocuments = async (req, res) => {
  try {
    const documents = await prisma.document.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        documentType: true,
        documentUrl: true,
        fileName: true,
        status: true,
        rejectedReason: true,
        uploadedAt: true
      }
    });

    res.json({ documents });

  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Delete document request:', { id, userId: req.user?.id });

    // First check if document exists at all
    const existingDoc = await prisma.document.findUnique({
      where: { id: id }
    });
    
    console.log('Existing document:', existingDoc);

    if (!existingDoc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if user owns this document
    if (existingDoc.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this document' });
    }

    // Delete file from storage
    if (existingDoc.documentUrl) {
      const publicId = extractPublicId(existingDoc.documentUrl);
      if (publicId) {
        try {
          await deleteImage(publicId);
        } catch (deleteErr) {
          console.warn('Warning: Could not delete document file:', deleteErr);
        }
      }
    }

    // Delete from database
    await prisma.document.delete({
      where: { id: id }
    });

    res.json({ message: 'Document deleted successfully' });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin: Approve document
const approveDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;

    const document = await prisma.document.findUnique({
      where: { id: id }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const updated = await prisma.document.update({
      where: { id: id },
      data: {
        status: 'APPROVED',
        reviewedBy: adminId,
        reviewedAt: new Date()
      }
    });

    res.json({ message: 'Document approved successfully', document: updated });

  } catch (error) {
    console.error('Approve document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin: Reject document
const rejectDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, adminId } = req.body;

    const document = await prisma.document.findUnique({
      where: { id: id }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const updated = await prisma.document.update({
      where: { id: id },
      data: {
        status: 'REJECTED',
        rejectedReason: reason,
        reviewedBy: adminId,
        reviewedAt: new Date()
      }
    });

    res.json({ message: 'Document rejected', document: updated });

  } catch (error) {
    console.error('Reject document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      console.error('Upload profile photo: No file received');
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    if (!req.user || !req.user.id) {
      console.error('Upload profile photo: No user found in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { profilePhoto: true }
    });

    if (!currentUser) {
      console.error('Upload profile photo: User not found in database');
      return res.status(404).json({ error: 'User not found' });
    }

    if (currentUser.profilePhoto) {
      const oldPublicId = extractPublicId(currentUser.profilePhoto);
      if (oldPublicId) {
        try {
          await deleteImage(oldPublicId);
        } catch (deleteErr) {
          console.warn('Warning: Could not delete old profile photo:', deleteErr);
        }
      }
    }

    let photoUrl;
    if (req.file.path && req.file.path.startsWith('http')) {
      photoUrl = req.file.path;
    } else {
      photoUrl = `/uploads/${req.file.filename}`;
    }
    
    console.log('Upload profile photo - file info:', {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      photoUrl: photoUrl
    });
    
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { profilePhoto: photoUrl },
      select: {
        id: true,
        profilePhoto: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Profile photo uploaded successfully',
      profilePhoto: updatedUser.profilePhoto
    });
    
    console.log('Profile photo upload response:', {
      message: 'Profile photo uploaded successfully',
      profilePhoto: updatedUser.profilePhoto
    });

    // Broadcast profile photo update to all connected clients
    sseService.broadcastProfileUpdate(updatedUser.id, ['profilePhoto']);
    sseService.broadcastAdminUpdate('photo_uploaded', { userId: updatedUser.id });

  } catch (error) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({ error: 'Internal server error during photo upload', details: error.message });
  }
};

const uploadGalleryPhotos = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      console.error('Upload gallery photos: No files received');
      return res.status(400).json({ error: 'No photos uploaded' });
    }

    if (!req.user || !req.user.id) {
      console.error('Upload gallery photos: No user found in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { photos: true }
    });

    if (!currentUser) {
      console.error('Upload gallery photos: User not found in database');
      return res.status(404).json({ error: 'User not found' });
    }

    const newPhotos = req.files.map(file => {
      if (file.path && file.path.startsWith('http')) {
        return file.path;
      } else {
        return `/uploads/${file.filename}`;
      }
    });
    
    let currentPhotosArray = [];
    if (currentUser.photos) {
      try {
        currentPhotosArray = JSON.parse(currentUser.photos);
      } catch (e) {
        currentPhotosArray = [];
      }
    }
    
    const currentFilenames = currentPhotosArray.map(photo => {
      const parts = photo.split('/');
      return parts[parts.length - 1];
    });
    
    const uniqueNewPhotos = newPhotos.filter(newPhoto => {
      const parts = newPhoto.split('/');
      const filename = parts[parts.length - 1];
      return !currentFilenames.includes(filename);
    });
    
    let updatedPhotos = [];
    if (Array.isArray(currentPhotosArray) && currentPhotosArray.length > 0) {
      updatedPhotos = [...currentPhotosArray, ...uniqueNewPhotos].slice(0, 9);
    } else {
      updatedPhotos = uniqueNewPhotos.slice(0, 9);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { photos: JSON.stringify(updatedPhotos) },
      select: {
        id: true,
        photos: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Gallery photos uploaded successfully',
      photos: updatedPhotos
    });

  } catch (error) {
    console.error('Upload gallery photos error:', error);
    res.status(500).json({ error: 'Internal server error during photo upload', details: error.message });
  }
};

const deletePhoto = async (req, res) => {
  try {
    const { photoUrl } = req.body;

    if (!photoUrl) {
      return res.status(400).json({ error: 'Photo URL is required' });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { photos: true, profilePhoto: true }
    });

    let photosArray = [];
    if (currentUser.photos) {
      try {
        photosArray = JSON.parse(currentUser.photos);
      } catch (e) {
        photosArray = [];
      }
    }

    if (!Array.isArray(photosArray) || !photosArray.includes(photoUrl)) {
      return res.status(404).json({ error: 'Photo not found in your gallery' });
    }

    const publicId = extractPublicId(photoUrl);
    if (publicId) {
      await deleteImage(publicId);
    }

    const updatedPhotos = photosArray.filter(photo => photo !== photoUrl);

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { photos: JSON.stringify(updatedPhotos) },
      select: {
        id: true,
        photos: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Photo deleted successfully',
      photos: updatedPhotos
    });

  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ error: 'Internal server error during photo deletion' });
  }
};

// Helper function to sync user premium status from Subscription table
const syncUserPremiumStatus = async (userId) => {
  try {
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        endDate: { gte: new Date() }
      }
    });
    
    if (activeSubscription) {
      // User has active subscription - sync to user table
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: activeSubscription.plan.toUpperCase(),
          subscriptionStart: activeSubscription.startDate,
          subscriptionEnd: activeSubscription.endDate,
          isPremium: true
        }
      });
    } else {
      // No active subscription - check if user subscription has expired
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionTier: true, subscriptionEnd: true }
      });
      
      if (user && user.subscriptionTier && user.subscriptionTier !== 'FREE') {
        if (user.subscriptionEnd && new Date(user.subscriptionEnd) < new Date()) {
          // Expired - update isPremium to false
          await prisma.user.update({
            where: { id: userId },
            data: { isPremium: false }
          });
        }
      }
    }
  } catch (error) {
    console.error('Sync user premium status error:', error);
  }
};

// ============ PROFILE PHOTO ADJUSTMENTS ============
const saveProfilePhotoAdjustments = async (req, res) => {
  try {
    const { scale, x, y } = req.body;

    if (scale === undefined || x === undefined || y === undefined) {
      return res.status(400).json({ error: 'Scale, x, and y values are required' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        profilePhotoScale: parseFloat(scale),
        profilePhotoX: parseFloat(x),
        profilePhotoY: parseFloat(y)
      },
      select: {
        id: true,
        profilePhoto: true,
        profilePhotoScale: true,
        profilePhotoX: true,
        profilePhotoY: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Profile photo adjustments saved successfully',
      user: {
        profilePhoto: updatedUser.profilePhoto,
        profilePhotoScale: updatedUser.profilePhotoScale,
        profilePhotoX: updatedUser.profilePhotoX,
        profilePhotoY: updatedUser.profilePhotoY
      }
    });

    // Broadcast profile photo adjustments update
    sseService.broadcastProfileUpdate(updatedUser.id, ['profilePhotoScale', 'profilePhotoX', 'profilePhotoY']);

  } catch (error) {
    console.error('Save profile photo adjustments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updateHoroscope,
  updateFamilyBackground,
  updateSubscription,
  getSubscriptionPlans,
  uploadDocument,
  getDocuments,
  deleteDocument,
  approveDocument,
  rejectDocument,
  uploadProfilePhoto,
  uploadGalleryPhotos,
  deletePhoto,
  syncUserPremiumStatus,
  saveProfilePhotoAdjustments
};
