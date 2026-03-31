/**
 * Generate Shared Profile PDF Route
 * Uses Prisma (PostgreSQL) for production database
 * 
 * Web Link Format:
 * - Full Profile: /api/shared-profile/:userId
 * - Sanitized: /api/shared-profile/:userId?sanitize=true
 * - Page Info: /api/shared-profile/:userId/pages (GET)
 * 
 * Watermark: Tile pattern with parameters from working profile_app:
 * - Text: VIJAYALAKSHMI BOYAR MATRIMONY
 * - Font Size: 24px (scaled to 24 * 0.7 = 16.8px effective)
 * - Opacity: 25%
 * - Scale: 0.7
 * - Rotation: -45°
 * - Pattern Spacing: 290px
 */

const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Use Prisma for database
const { prisma } = require('../utils/database');

// Watermark parameters from working profile_app
const WATERMARK_TEXT = 'VIJAYALAKSHMI BOYAR MATRIMONY';
const WATERMARK_FONT_SIZE = 24;
const WATERMARK_OPACITY = 0.25;
const WATERMARK_SCALE = 0.7;
const WATERMARK_ROTATION = -45;
const WATERMARK_SPACING = 290;

// Function to add TILE PATTERN watermark (from working profile_app)
const addTilePatternWatermark = (doc, text, opacity = WATERMARK_OPACITY) => {
    doc.save();
    
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    
    for (let y = -100; y < pageHeight + 200; y += WATERMARK_SPACING) {
        for (let x = -100; x < pageWidth + 200; x += WATERMARK_SPACING) {
            doc.save();
            
            doc.translate(x + 100, y + 50);
            doc.scale(WATERMARK_SCALE);
            doc.rotate(WATERMARK_ROTATION);
            
            doc.fontSize(WATERMARK_FONT_SIZE * WATERMARK_SCALE)
               .font('Helvetica-Bold');
            
            const textWidth = doc.widthOfString(text);
            
            doc.fillColor('#9e9e9e')
               .fillOpacity(opacity)
               .text(text, 0, 0, {
                   align: 'center',
                   width: textWidth + 20,
                   lineBreak: false,
                   ellipsis: false
               });
            
            doc.restore();
        }
    }
    
    doc.restore();
};

async function fetchImage(imagePath) {
  try {
    if (!imagePath || imagePath === 'null') return null;
    
    // If it's a Cloudinary URL, use optimized transformation for PDF (A4, under 500KB)
    if (imagePath.includes('cloudinary')) {
      // Extract public ID from Cloudinary URL
      const publicId = extractCloudinaryPublicId(imagePath);
      if (publicId) {
        // A4 optimized URL: 2480x3508, quality 60, JPG
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'do6o1xqs1';
        const optimizedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/c_pad,w_2480,h_3508,b_white,q_60,f_jpg/${publicId}.jpg`;
        const response = await axios.get(optimizedUrl, { 
          responseType: 'arraybuffer',
          maxContentLength: 600 * 1024 // 600KB max
        });
        return Buffer.from(response.data);
      }
    }
    
    // If it's a regular HTTP URL, try to fetch it
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      const response = await axios.get(imagePath, { 
        responseType: 'arraybuffer',
        maxContentLength: 600 * 1024
      });
      return Buffer.from(response.data);
    }
    
    // Otherwise, try local file
    let filename = imagePath.split('/').pop().split('\\').pop();
    const paths = [
      path.join(__dirname, '..', 'uploads', filename),
      path.join(__dirname, '..', 'uploads', 'user_' + filename)
    ];
    for (const fullPath of paths) {
      if (fs.existsSync(fullPath)) return fs.readFileSync(fullPath);
    }
    return null;
  } catch { return null; }
}

// Extract public ID from Cloudinary URL
function extractCloudinaryPublicId(cloudinaryUrl) {
  try {
    // Handle various Cloudinary URL formats
    // Example: https://res.cloudinary.com/do6o1xqs1/image/upload/v1234567890/user_abc.jpg
    const parts = cloudinaryUrl.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    
    // Get everything after 'upload'
    let publicId = parts.slice(uploadIndex + 1).join('/');
    
    // Remove version number if present (v1234567890)
    publicId = publicId.replace(/^v\d+\//, '');
    
    // Remove file extension - include all common image formats
    publicId = publicId.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
    
    return publicId;
  } catch {
    return null;
  }
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function addSectionHeader(doc, title, y) {
  doc.fontSize(14).fillColor('#8B5CF6').text(title, 40, y);
  return y + 18;
}

function addField(doc, label, value, x, y) {
  doc.fontSize(10).fillColor('#666').text(label, x, y);
  doc.fillColor('#333').text(value || 'N/A', x + 80, y);
  return y + 14;
}

function addHeader(doc, title) {
  doc.fontSize(16).fillColor('#8B5CF6').text(title, 40, 40);
  return 80;
}

/**
 * GET /api/shared-profile/:userId/pages
 * Get page count info without generating PDF
 */
router.get('/:userId/pages', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Fetch user profile using Prisma (PostgreSQL)
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    console.log('Page count for userId:', userId, 'User found:', !!user, 'isActive:', user?.isActive);
    
    if (!user) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (!user.isActive) {
      return res.status(404).json({ error: 'Profile not available' });
    }

    // Get profile photo 
    let profilePhotoUrl = user.profilePhoto;
    
    // Get gallery count
    let galleryCount = 0;
    if (user.photos) {
      try {
        const parsedPhotos = JSON.parse(user.photos);
        if (Array.isArray(parsedPhotos) && parsedPhotos.length > 0) {
          galleryCount = parsedPhotos.filter(p =>
            p && typeof p === 'string' && (p.includes('cloudinary') || p.startsWith('/') || p.startsWith('uploads'))
          ).length;
        }
      } catch {}
    }
    
    // Get documents count
    let docsCount = 0;
    try {
      const docs = await prisma.userDocument.findMany({
        where: { userId: userId }
      });
      docsCount = docs.length;
    } catch {}
    
    // Estimate pages needed
    // Page 1: Profile + Contact + Personal + Family
    // Page 2: Professional + Education + Horoscope
    // Page 3+: Gallery (2-3 photos per page)
    // Last page: Documents
    let estimatedPages = 3; // Base pages
    if (galleryCount > 6) {
      estimatedPages += Math.ceil((galleryCount - 6) / 3);
    }
    if (docsCount > 0) {
      estimatedPages += 1;
    }
    
    return res.json({
      success: true,
      pages: estimatedPages,
      profilePhoto: !!profilePhotoUrl,
      galleryCount,
      docsCount
    });
    
  } catch (error) {
    console.error('Error getting page count:', error);
    return res.status(500).json({ error: 'Failed to get page count' });
  }
});

/**
 * GET /api/shared-profile/:userId
 * Generate and download shared profile PDF with watermark
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const sanitize = req.query.sanitize === 'true';
    
    // Fetch user profile using Prisma
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (!user.isActive) {
      return res.status(404).json({ error: 'Profile not available' });
    }

    // Get profile photo and gallery
    let profilePhotoUrl = user.profilePhoto;
    let gallery = [];
    if (user.photos) {
      try {
        const parsedPhotos = JSON.parse(user.photos);
        if (Array.isArray(parsedPhotos) && parsedPhotos.length > 0) {
          gallery = parsedPhotos.filter(p =>
            p && typeof p === 'string' && (p.includes('cloudinary') || p.startsWith('/') || p.startsWith('uploads'))
          );
        }
      } catch {}
    }

    // Get documents
    let docs = [];
    try {
      docs = await prisma.userDocument.findMany({
        where: { userId: userId }
      });
    } catch {}
    
    // Prepare filename
    const customId = user.customId || '';
    const fullName = `${user.firstName}${user.lastName?.replace(/\s+/g, '') || ''}`;
    const displayId = customId || user.id.slice(-8).toUpperCase();
    const fileName = sanitize 
      ? `${fullName}${displayId}_Shared__Profile.pdf`
      : `${fullName}${displayId}_Watermarked__Profile.pdf`;
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=${fileName}`);
    
    // Create PDF
    const doc = new PDFDocument();
    doc.pipe(res);
    
    let y = 0;
    let pageNum = 1;
    
    // ========== PAGE 1 ==========
    y = addHeader(doc, 'User Profile Details');
    
    // Profile Photo
    const pBuf = await fetchImage(profilePhotoUrl);
    if (pBuf) { 
      try { doc.image(pBuf, 40, y, { width: 80, height: 80 }); } catch {}
    }
    
    doc.fontSize(20).fillColor('#333').text(`${user.firstName} ${user.lastName}`.toUpperCase(), 130, y);
    doc.fontSize(10).fillColor('#666').text(`ID: ${displayId}`, 130, y + 22);
    doc.fillColor('#059669').text('✓ Verified', 130, y + 35);
    
    // Show subscription tier
    const tier = user.subscriptionTier || 'FREE';
    if (tier !== 'FREE') {
      const tierLabel = tier === 'PREMIUM' ? '★ Premium' : tier === 'PRO' ? '★ Pro' : tier === 'BASIC' ? '★ Basic' : `★ ${tier}`;
      doc.fillColor('#d97706').text(tierLabel, 130, y + 48);
    }
    
    y = 200;
    
    // Contact Information
    y = addSectionHeader(doc, 'Contact Information', y);
    if (sanitize) {
      y = addField(doc, 'Email:', 'Hidden for privacy', 40, y);
      y = addField(doc, 'Phone:', 'Hidden for privacy', 40, y);
    } else {
      y = addField(doc, 'Email:', user.email || 'Not provided', 40, y);
      y = addField(doc, 'Phone:', user.phone || 'Not provided', 40, y);
    }
    y = addField(doc, 'DOB / Age:', `${formatDate(user.dateOfBirth)} (${user.age} years)`, 40, y);
    y = addField(doc, 'City:', user.city || 'Not provided', 40, y);
    y = addField(doc, 'State:', user.state || 'Not provided', 40, y);
    y = addField(doc, 'Country:', user.country || 'Not provided', 40, y);
    
    // Personal Details
    y = addSectionHeader(doc, 'Personal Details', y);
    y = addField(doc, 'Gender:', user.gender || 'Not provided', 40, y);
    y = addField(doc, 'Marital Status:', user.maritalStatus || 'Not provided', 40, y);
    y = addField(doc, 'Community:', user.community || 'Not provided', 40, y);
    y = addField(doc, 'Mother Tongue:', user.motherTongue || 'Not provided', 40, y);
    y = addField(doc, 'Height:', user.height || 'Not provided', 40, y);
    y = addField(doc, 'Health:', user.health || 'Not provided', 40, y);
    
    // Family Details
    y = addSectionHeader(doc, 'Family Details', y);
    y = addField(doc, 'Father Name:', user.fatherName || 'Not provided', 40, y);
    y = addField(doc, 'Mother Name:', user.motherName || 'Not provided', 40, y);
    y = addField(doc, 'Siblings:', user.siblings || 'Not provided', 40, y);
    y = addField(doc, 'Family Type:', user.familyType || 'Not provided', 40, y);
    y = addField(doc, 'Family Values:', user.familyValues || 'Not provided', 40, y);
    
    // Add watermark on page 1 if not sanitized
    if (!sanitize) {
      addTilePatternWatermark(doc, WATERMARK_TEXT, WATERMARK_OPACITY);
    }
    
    // ========== PAGE 2 ==========
    doc.addPage();
    y = 40;
    
    // Professional Details
    y = addSectionHeader(doc, 'Professional Details', y);
    y = addField(doc, 'Occupation:', user.occupation || 'Not provided', 40, y);
    y = addField(doc, 'Employer:', user.employer || 'Not provided', 40, y);
    y = addField(doc, 'Annual Income:', user.annualIncome || 'Not provided', 40, y);
    y = addField(doc, 'Work Location:', user.workLocation || 'Not provided', 40, y);
    
    // Education
    y = addSectionHeader(doc, 'Education Details', y);
    y = addField(doc, 'Education:', user.education || 'Not provided', 40, y);
    y = addField(doc, 'College:', user.college || 'Not provided', 40, y);
    y = addField(doc, 'School:', user.school || 'Not provided', 40, y);
    
    // Horoscope
    y = addSectionHeader(doc, 'Horoscope Details', y);
    y = addField(doc, 'Rasi:', user.rasi || 'Not provided', 40, y);
    y = addField(doc, 'Natchathiram:', user.natchathiram || 'Not provided', 40, y);
    y = addField(doc, 'Dosham:', user.dosham || 'None', 40, y);
    
    // Add watermark on page 2
    if (!sanitize) {
      addTilePatternWatermark(doc, WATERMARK_TEXT, WATERMARK_OPACITY);
    }
    
    // ========== GALLERY PAGES ==========
    if (gallery.length > 0) {
      for (let i = 0; i < gallery.length; i += 3) {
        doc.addPage();
        y = 40;
        
        const pagePhotos = gallery.slice(i, i + 3);
        y = addSectionHeader(doc, `Gallery Photos (${i + 1}-${Math.min(i + 3, gallery.length)})`, y);
        
        for (let j = 0; j < pagePhotos.length; j++) {
          const imgBuf = await fetchImage(pagePhotos[j]);
          if (imgBuf) {
            try {
              doc.image(imgBuf, 40 + (j * 180), y, { width: 160, height: 180 });
            } catch {}
          }
        }
        
        y += 200;
        
        // Add watermark
        if (!sanitize) {
          addTilePatternWatermark(doc, WATERMARK_TEXT, WATERMARK_OPACITY);
        }
      }
    }
    
    // ========== DOCUMENTS PAGE ==========
    if (docs.length > 0) {
      doc.addPage();
      y = 40;
      
      y = addSectionHeader(doc, 'Documents', y);
      
      for (const docItem of docs) {
        y = addField(doc, 'Document:', docItem.documentType || 'Document', 40, y);
        if (y > 700) {
          doc.addPage();
          y = 40;
        }
      }
      
      // Add watermark
      // Add watermark
      if (!sanitize) {
        addTilePatternWatermark(doc, WATERMARK_TEXT, WATERMARK_OPACITY);
      }
    }
    
    // Finalize PDF
    doc.end();
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }
});

module.exports = router;
