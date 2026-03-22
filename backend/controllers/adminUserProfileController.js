/**
 * Admin User Profile Controller
 * 
 * Comprehensive user profile management for admin panel
 * Handles full user details, photos, gallery, documents, verifications
 * Includes block/unblock and delete user actions with activity logging
 * 
 * Security: JWT authenticated, Admin role required
 */

const { prisma } = require('../utils/database');

/**
 * Get complete user profile for admin view
 * Fetches all user data including photos, gallery, documents, verifications
 */
const getAdminUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Validate user ID
    if (!id || id === 'undefined') {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Fetch complete user profile with all related data
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        // Profile photos and gallery (legacy PhotoVerification model)
        photoVerifications: {
          orderBy: { createdAt: 'desc' }
        },
        // New UserPhoto model for profile photos
        userPhotos: {
          where: { isProfilePhoto: true },
          orderBy: { uploadedAt: 'desc' },
          take: 1
        },
        // New UserGalleryImage model for gallery photos
        userGallery: {
          orderBy: { uploadedAt: 'desc' }
        },
        // Legacy documents
        documents: {
          orderBy: { uploadedAt: 'desc' }
        },
        // New UserDocument model
        userDocuments: {
          orderBy: { uploadedAt: 'desc' }
        },
        // New Verification model for ID verification details
        verifications: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        // Subscription
        subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        // Activity counts
        _count: {
          select: {
            sentInterests: true,
            receivedInterests: true,
            sentMessages: true,
            receivedMessages: true
          }
        },
        // Sent interests with receiver details
        sentInterests: {
          include: {
            receiver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                gender: true,
                profilePhoto: true,
                city: true,
                state: true,
                isActive: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        // Received interests with sender details
        receivedInterests: {
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                gender: true,
                profilePhoto: true,
                city: true,
                state: true,
                isActive: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Parse photos from users table (stored as JSON string)
    let userGalleryPhotos = [];
    try {
      if (user.photos) {
        const parsedPhotos = typeof user.photos === 'string' 
          ? JSON.parse(user.photos) 
          : user.photos;
        // Look up verification status for each gallery photo
        userGalleryPhotos = parsedPhotos.map((url, index) => {
          // Find matching photo verification record
          const verification = user.photoVerifications.find(pv => pv.photoUrl === url && pv.photoType === 'PHOTO_GALLERY');
          return {
            id: verification?.id || `gallery_${index}`,
            url: url,
            status: verification?.status || 'PENDING',
            createdAt: verification?.createdAt,
            isFromUsersTable: true
          };
        });
      }
    } catch (e) {
      console.error('Error parsing photos JSON:', e);
    }

    // Get profile photo from users table profilePhoto field
    // Look up verification status
    const profileVerification = user.photoVerifications.find(pv => pv.photoUrl === user.profilePhoto && pv.photoType === 'PROFILE');
    const usersProfilePhoto = user.profilePhoto ? {
      id: profileVerification?.id || 'profile_from_users',
      url: user.profilePhoto,
      status: profileVerification?.status || 'PENDING',
      createdAt: profileVerification?.createdAt,
      isFromUsersTable: true
    } : null;

    // Separate profile photo and gallery photos from photoVerifications (legacy)
    const profilePhoto = user.photoVerifications.find(photo => photo.photoType === 'PROFILE') || null;
    const galleryPhotos = user.photoVerifications.filter(photo => photo.photoType === 'PHOTO_GALLERY');

    // Get profile photo from new UserPhoto model
    const newProfilePhoto = user.userPhotos.length > 0 ? user.userPhotos[0] : null;
    
    // Get gallery from new UserGalleryImage model
    const newGalleryPhotos = user.userGallery.map(photo => ({
      id: photo.id,
      url: photo.imageUrl,
      caption: photo.caption,
      isPrivate: photo.isPrivate,
      isApproved: photo.isApproved,
      status: photo.isApproved ? 'APPROVED' : 'PENDING', // Convert isApproved to status
      uploadedAt: photo.uploadedAt
    }));

    // Combine all sources: prefer users table data, then new models, then legacy
    const finalProfilePhoto = usersProfilePhoto || (newProfilePhoto ? {
      id: newProfilePhoto.id,
      url: newProfilePhoto.photoUrl,
      isProfilePhoto: newProfilePhoto.isProfilePhoto,
      isApproved: newProfilePhoto.isApproved,
      status: newProfilePhoto.isApproved ? 'APPROVED' : 'PENDING', // Convert isApproved to status
      uploadedAt: newProfilePhoto.uploadedAt
    } : profilePhoto);

    const finalGalleryPhotos = userGalleryPhotos.length > 0 
      ? userGalleryPhotos // Already has status from verification lookup
      : (newGalleryPhotos.length > 0 
          ? newGalleryPhotos 
          : galleryPhotos.map(photo => ({
              id: photo.id,
              url: photo.photoUrl,
              status: photo.status || 'PENDING',
              createdAt: photo.createdAt
            })));

    // Transform photo verifications for display
    const photoVerifications = user.photoVerifications.map(pv => ({
      id: pv.id,
      photoUrl: pv.photoUrl,
      photoType: pv.photoType,
      status: pv.status,
      rejectedReason: pv.rejectedReason,
      reviewedBy: pv.reviewedBy,
      reviewedAt: pv.reviewedAt,
      createdAt: pv.createdAt
    }));

    // Transform user documents for display (new UserDocument model)
    const userDocuments = user.userDocuments.map(doc => ({
      id: doc.id,
      documentType: doc.documentType,
      documentNumber: doc.documentNumber, // Already masked - only last 4 digits
      documentUrl: doc.documentUrl,
      isVerified: doc.isVerified,
      uploadedAt: doc.uploadedAt
    }));

    // Transform verification details for display (new Verification model)
    const verification = user.verifications.length > 0 ? user.verifications[0] : null;
    const verificationDetails = {
      isVerified: user.isVerified || false,
      emailVerified: user.emailVerified || false,
      phoneVerified: user.phoneVerified || false,
      photosVerified: user.photosVerified || false,
      manualVerificationStatus: user.manualVerificationStatus || null,
      manualVerificationNotes: user.manualVerificationNotes || null,
      photoVerifications: photoVerifications,
      // New Verification model data
      idType: verification?.idType || null,
      idNumber: verification?.idNumber || null, // Masked - only last 4 digits visible
      faceMatchScore: verification?.faceMatchScore || null,
      isTampered: verification?.isTampered || false,
      formatValid: verification?.formatValid !== undefined ? verification.formatValid : true,
      verificationStatus: verification?.status || 'PENDING',
      verifiedBy: verification?.verifiedBy || null,
      verifiedAt: verification?.verifiedAt || null,
      verificationNotes: verification?.notes || null
    };

    // Build comprehensive response
    const responseData = {
      personalDetails: {
        id: user.id,
        customId: user.customId || null,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || 'Not provided',
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        age: user.age,
        community: user.community,
        subCaste: user.subCaste || 'Not provided',
        maritalStatus: user.maritalStatus,
        height: user.height || 'Not provided',
        weight: user.weight || 'Not provided',
        complexion: user.complexion || 'Not provided',
        bio: user.bio || 'Not provided'
      },
      locationDetails: {
        city: user.city || 'Not provided',
        state: user.state || 'Not provided',
        country: user.country || 'Not provided',
        fullLocation: [user.city, user.state, user.country].filter(Boolean).join(', ') || 'Not provided'
      },
      professionalDetails: {
        education: user.education || 'Not provided',
        profession: user.profession || 'Not provided',
        income: user.income || 'Not provided'
      },
      familyDetails: {
        fatherName: user.fatherName || 'Not provided',
        fatherOccupation: user.fatherOccupation || 'Not provided',
        fatherCaste: user.fatherCaste || 'Not provided',
        motherName: user.motherName || 'Not provided',
        motherOccupation: user.motherOccupation || 'Not provided',
        motherCaste: user.motherCaste || 'Not provided',
        familyValues: user.familyValues || 'Not provided',
        familyType: user.familyType || 'Not provided',
        familyStatus: user.familyStatus || 'Not provided',
        aboutFamily: user.aboutFamily || 'Not provided'
      },
      horoscopeDetails: {
        raasi: user.raasi || 'Not provided',
        natchathiram: user.natchathiram || 'Not provided',
        dhosam: user.dhosam || 'Not provided',
        birthDate: user.birthDate || 'Not provided',
        birthTime: user.birthTime || 'Not provided',
        birthPlace: user.birthPlace || 'Not provided'
      },
      profilePhoto: finalProfilePhoto,
      galleryPhotos: finalGalleryPhotos,
      documents: user.documents.map(doc => ({
        id: doc.id,
        documentType: doc.documentType,
        documentUrl: doc.documentUrl,
        fileName: doc.fileName,
        status: doc.status,
        uploadedAt: doc.uploadedAt
      })),
      userDocuments: userDocuments,
      verificationDetails: verificationDetails,
      subscriptionDetails: user.subscriptions.length > 0 ? {
        tier: user.subscriptions[0].plan,
        amount: user.subscriptions[0].amount,
        startDate: user.subscriptions[0].startDate,
        endDate: user.subscriptions[0].endDate,
        status: user.subscriptions[0].status,
        paymentId: user.subscriptions[0].paymentId
      } : {
        tier: 'FREE',
        amount: 0,
        startDate: null,
        endDate: null,
        status: null,
        paymentId: null
      },
      accountStatus: {
        isActive: user.isActive,
        isPremium: user.isPremium,
        subscriptionTier: user.subscriptionTier || 'FREE',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt
      },
      activityStats: {
        interestsSent: user._count.sentInterests,
        interestsReceived: user._count.receivedInterests,
        messagesSent: user._count.sentMessages,
        messagesReceived: user._count.receivedMessages,
        // Detailed interests sent
        sentInterestsList: user.sentInterests.map(interest => ({
          id: interest.id,
          status: interest.status,
          message: interest.message,
          createdAt: interest.createdAt,
          receiver: {
            id: interest.receiver.id,
            name: `${interest.receiver.firstName} ${interest.receiver.lastName}`,
            email: interest.receiver.email,
            phone: interest.receiver.phone,
            gender: interest.receiver.gender,
            profilePhoto: interest.receiver.profilePhoto,
            location: `${interest.receiver.city}, ${interest.receiver.state}`,
            isActive: interest.receiver.isActive
          }
        })),
        // Detailed interests received
        receivedInterestsList: user.receivedInterests.map(interest => ({
          id: interest.id,
          status: interest.status,
          message: interest.message,
          createdAt: interest.createdAt,
          sender: {
            id: interest.sender.id,
            name: `${interest.sender.firstName} ${interest.sender.lastName}`,
            email: interest.sender.email,
            phone: interest.sender.phone,
            gender: interest.sender.gender,
            profilePhoto: interest.sender.profilePhoto,
            location: `${interest.sender.city}, ${interest.sender.state}`,
            isActive: interest.sender.isActive
          }
        }))
      }
    };

    // Log admin access
    await logAdminActivity({
      adminId,
      action: 'VIEW_USER_PROFILE',
      targetUserId: id,
      details: { viewedAt: new Date() }
    });

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Get admin user profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

/**
 * Block user account
 */
const blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.admin.id;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(400).json({ error: 'User is already blocked' });
    }

    // Update user status
    await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        isVerified: false
      }
    });

    // Log the blocking activity
    await logAdminActivity({
      adminId,
      action: 'BLOCK_USER',
      targetUserId: id,
      details: {
        reason: reason || 'No reason provided',
        blockedAt: new Date(),
        userEmail: user.email
      }
    });

    res.json({
      success: true,
      message: 'User blocked successfully',
      blockedUser: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
};

/**
 * Unblock user account
 */
const unblockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isActive) {
      return res.status(400).json({ error: 'User is already active' });
    }

    // Update user status
    await prisma.user.update({
      where: { id },
      data: {
        isActive: true
      }
    });

    // Log the unblocking activity
    await logAdminActivity({
      adminId,
      action: 'UNBLOCK_USER',
      targetUserId: id,
      details: {
        unblockedAt: new Date(),
        userEmail: user.email
      }
    });

    res.json({
      success: true,
      message: 'User unblocked successfully',
      unblockedUser: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
};

/**
 * Delete user account
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, permanent } = req.body;
    const adminId = req.admin.id;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (permanent === true) {
      // Permanent deletion
      await logAdminActivity({
        adminId,
        action: 'PERMANENT_DELETE_USER',
        targetUserId: id,
        details: {
          deletedAt: new Date(),
          reason: reason || 'No reason provided',
          userEmail: user.email,
          userName: `${user.firstName} ${user.lastName}`
        }
      });

      await prisma.user.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'User permanently deleted'
      });
    } else {
      // Soft delete
      await prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          email: `deleted_${Date.now()}_${user.id}@anonymized.com`
        }
      });

      await logAdminActivity({
        adminId,
        action: 'DELETE_USER',
        targetUserId: id,
        details: {
          deletedAt: new Date(),
          reason: reason || 'No reason provided',
          userEmail: user.email,
          userName: `${user.firstName} ${user.lastName}`,
          isPermanent: false
        }
      });

      res.json({
        success: true,
        message: 'User deleted successfully (soft delete)'
      });
    }

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

/**
 * Get user activity logs
 */
const getUserActivityLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const logs = await prisma.adminActivityLog.findMany({
      where: {
        targetUserId: id
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.adminActivityLog.count({
      where: { targetUserId: id }
    });

    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get user activity logs error:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
};

/**
 * Verify user manually
 */
const manualVerifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const adminId = req.admin.id;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    await prisma.user.update({
      where: { id },
      data: {
        isVerified: status === 'APPROVED',
        manualVerificationStatus: status,
        manualVerificationNotes: notes,
        reviewedBy: adminId,
        reviewedAt: new Date()
      }
    });

    await logAdminActivity({
      adminId,
      action: 'MANUAL_VERIFY_USER',
      targetUserId: id,
      details: {
        status: status,
        notes: notes,
        verifiedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: `User verification ${status.toLowerCase()} successfully`
    });

  } catch (error) {
    console.error('Manual verify user error:', error);
    res.status(500).json({ error: 'Failed to verify user' });
  }
};

/**
 * Update user subscription
 */
const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan } = req.body;
    const adminId = req.admin.id;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const planAmounts = {
      'FREE': 0,
      'STANDARD': 999,
      'PREMIUM': 1999,
      'ELITE': 3999
    };

    const amount = planAmounts[plan] || 0;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (plan === 'FREE' ? 0 : 3));

    // Deactivate old subscription
    await prisma.subscription.updateMany({
      where: { userId: id, status: 'ACTIVE' },
      data: { status: 'INACTIVE' }
    });

    // Create new subscription
    await prisma.subscription.create({
      data: {
        userId: id,
        plan: plan,
        amount: amount,
        startDate: startDate,
        endDate: endDate,
        status: 'ACTIVE',
        paymentId: `ADMIN_${Date.now()}`
      }
    });

    // Update user subscription tier
    const isPremium = plan !== 'FREE';
    await prisma.user.update({
      where: { id },
      data: {
        isPremium: isPremium,
        subscriptionTier: plan
      }
    });

    await logAdminActivity({
      adminId,
      action: 'UPDATE_SUBSCRIPTION',
      targetUserId: id,
      details: {
        plan: plan,
        amount: amount,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      subscription: {
        plan: plan,
        amount: amount,
        startDate: startDate,
        endDate: endDate
      }
    });

  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
};

/**
 * Verify user photo (profile or gallery)
 * Creates a PhotoVerification record if not exists, then approves it
 */
const verifyUserPhoto = async (req, res) => {
  try {
    const { userId } = req.params;
    const { photoUrl, photoType, action, reason } = req.body;
    const adminId = req.admin.id;

    if (!userId || !photoUrl) {
      return res.status(400).json({ error: 'User ID and photo URL are required' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "approve" or "reject"' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if PhotoVerification record exists for this photo
    let photoVerification = await prisma.photoVerification.findFirst({
      where: {
        userId,
        photoUrl
      }
    });

    if (!photoVerification) {
      // Create a new PhotoVerification record
      photoVerification = await prisma.photoVerification.create({
        data: {
          userId,
          photoUrl,
          photoType: photoType || 'PROFILE',
          status: 'PENDING'
        }
      });
    }

    // Update the PhotoVerification status
    const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
    await prisma.photoVerification.update({
      where: { id: photoVerification.id },
      data: {
        status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectedReason: action === 'reject' ? reason : null
      }
    });

    // Check if all photos are verified and update user's photosVerified status
    await checkAllPhotosVerified(userId);

    // Log the action
    await logAdminActivity({
      adminId,
      action: action === 'approve' ? 'APPROVE_PHOTO' : 'REJECT_PHOTO',
      targetUserId: userId,
      details: {
        photoId: photoVerification.id,
        photoUrl,
        photoType: photoType || 'PROFILE',
        reason: action === 'reject' ? reason : null,
        reviewedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: action === 'approve' ? 'Photo approved successfully' : 'Photo rejected',
      photoVerification: {
        id: photoVerification.id,
        status
      }
    });

  } catch (error) {
    console.error('Verify user photo error:', error);
    res.status(500).json({ error: 'Failed to verify photo' });
  }
};

/**
 * Check if all user photos are verified and update photosVerified status
 * Also updates overall isVerified status if all verifications are complete
 */
const checkAllPhotosVerified = async (userId) => {
  try {
    // Count photos by status
    const pendingPhotos = await prisma.photoVerification.count({
      where: { userId, status: 'PENDING' }
    });

    const approvedPhotos = await prisma.photoVerification.count({
      where: { userId, status: 'APPROVED' }
    });

    const totalPhotos = await prisma.photoVerification.count({
      where: { userId }
    });

    // If there's at least one approved photo and no pending photos, mark photos as verified
    if (approvedPhotos > 0 && pendingPhotos === 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { photosVerified: true }
      });
      
      // Check if all verifications are complete to mark user as fully verified
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          emailVerified: true,
          phoneVerified: true,
          photosVerified: true
        }
      });
      
      // If email, phone, and photos are all verified, mark user as verified
      if (user && user.emailVerified && user.phoneVerified && user.photosVerified) {
        await prisma.user.update({
          where: { id: userId },
          data: { isVerified: true }
        });
        console.log(`User ${userId} is now fully verified`);
      }
    } else if (pendingPhotos > 0 || totalPhotos === 0) {
      // If there are pending photos or no photos, mark as not verified
      await prisma.user.update({
        where: { id: userId },
        data: { 
          photosVerified: false,
          isVerified: false // Also mark user as not verified
        }
      });
    }
  } catch (error) {
    console.error('Check all photos verified error:', error);
  }
};

/**
 * Log admin activity
 */
const logAdminActivity = async ({ adminId, action, targetUserId, details }) => {
  try {
    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action,
        targetUserId,
        details: JSON.stringify(details)
      }
    });
  } catch (error) {
    console.error('Log admin activity error:', error);
  }
};

module.exports = {
  getAdminUserProfile,
  blockUser,
  unblockUser,
  deleteUser,
  getUserActivityLogs,
  manualVerifyUser,
  updateSubscription,
  verifyUserPhoto
};
