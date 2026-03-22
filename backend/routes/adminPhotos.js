/**
 * Admin User Photos Route
 * 
 * Fetches user profile photo and gallery images
 * Route: /admin/users/:id/photos
 * Access: Admin only
 * 
 * Uses: UserPhoto, UserGalleryImage models
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { adminAuthMiddleware } = require('../middleware/auth');

const prisma = new PrismaClient();

// Get user photos (profile + gallery)
router.get('/users/:id/photos', adminAuthMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Fetch profile photo (isProfilePhoto = true)
    const profilePhoto = await prisma.userPhoto.findFirst({
      where: {
        userId: userId,
        isProfilePhoto: true
      }
    });

    // Fetch gallery images
    const gallery = await prisma.userGalleryImage.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    });

    res.json({
      success: true,
      profilePhoto: profilePhoto || null,
      gallery: gallery
    });

  } catch (error) {
    console.error('Admin Photo Fetch Error:', error);
    res.status(500).json({ message: 'Server error fetching photos' });
  }
});

module.exports = router;
