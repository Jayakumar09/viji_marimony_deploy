/**
 * Profile PDF Generation Route
 * 
 * Uses PDFKit to generate professional-looking profile PDFs
 * with multi-column layout, profile photo, gallery, watermark, and proper branding
 * 
 * @version 2.0.0 - Updated with improved layout
 */

const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { prisma } = require('../utils/database');
const { authMiddleware } = require('../middleware/auth');

/**
 * Helper function to fetch image as buffer
 */
const fetchImageAsBuffer = async (imageUrl) => {
  try {
    if (!imageUrl) return null;
    
    // Handle relative URLs - prepend server URL
    let url = imageUrl;
    if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('uploads/')) {
      const serverUrl = process.env.SERVER_URL || 'http://localhost:5001';
      url = `${serverUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    }
    
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.log('Failed to fetch image:', imageUrl, error.message);
    return null;
  }
};

/**
 * Helper function to format field label and value
 */
const formatField = (doc, label, value, x, y, labelWidth = 130) => {
  if (!value && value !== 0) return y;
  
  doc.fontSize(10)
     .fillColor('#666666')
     .text(label, x, y, { width: labelWidth, continued: false });
  
  doc.fillColor('#1a1a1a')
     .text(String(value), x + labelWidth, y, { width: 220 });
  
  return y + 16;
};

/**
 * Generate Profile PDF - Main Route
 */
router.get('/download-profile/:id', authMiddleware, async (req, res) => {
  try {
    const profileId = req.params.id;
    const currentUserId = req.user.id;

    // Fetch complete profile data from database
    const profile = await prisma.user.findUnique({
      where: { id: profileId }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (!profile.isActive) {
      return res.status(404).json({ error: 'Profile not available' });
    }

    // Normalize profile photo path (same as profileController)
    if (profile.profilePhoto && !profile.profilePhoto.startsWith('http') && !profile.profilePhoto.startsWith('/')) {
      profile.profilePhoto = `/${profile.profilePhoto}`;
    }

    // Normalize photos array paths (same as profileController)
    let photosArray = [];
    if (profile.photos) {
      try {
        photosArray = JSON.parse(profile.photos);
      } catch (e) {
        photosArray = [];
      }
    }
    if (Array.isArray(photosArray)) {
      profile.photos = photosArray.map(photo => {
        if (!photo.startsWith('http') && !photo.startsWith('/')) {
          return `/${photo}`;
        }
        return photo;
      });
    } else {
      profile.photos = [];
    }

    // Prepare profile name and ID for filename
    const fullName = `${profile.firstName || ''}${profile.lastName || ''}`.replace(/\s+/g, '');
    const profileIdShort = profile.id.slice(-6).toUpperCase();
    const fileName = `${fullName}${profileIdShort}__Profile.pdf`;

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: `${fullName} Profile`,
        Author: 'Vijayalakshmi Boyar Matrimony',
        Subject: 'Matrimony Profile'
      }
    });

    doc.pipe(res);

    // ========== BACKGROUND & BORDER ==========
    doc.rect(0, 0, doc.page.width, doc.page.height)
       .fillColor('#faf5ff')
       .fill();

    doc.rect(15, 15, doc.page.width - 30, doc.page.height - 30)
       .strokeColor('#8B5CF6')
       .lineWidth(3)
       .stroke();

    // ========== HEADER ==========
    doc.rect(15, 15, doc.page.width - 30, 65)
       .fillColor('#8B5CF6');
    
    doc.fontSize(24)
       .fillColor('white')
       .text('Vijayalakshmi Boyar Matrimony', 40, 32, { align: 'center' });
    
    doc.fontSize(12)
       .fillColor('#e9d5ff')
       .text('Matrimony Profile', 40, 55, { align: 'center' });

    // ========== PROFILE PHOTO ==========
    const photoX = 440;
    const photoY = 100;
    const photoSize = 110;
    
    const profilePhotoBuffer = await fetchImageAsBuffer(profile.profilePhoto);
    
    if (profilePhotoBuffer) {
      try {
        doc.image(profilePhotoBuffer, photoX, photoY, {
          width: photoSize,
          height: photoSize,
          fit: [photoSize, photoSize]
        });
      } catch (e) {
        doc.rect(photoX, photoY, photoSize, photoSize)
           .fillColor('#ffffff')
           .strokeColor('#d1d5db')
           .lineWidth(2)
           .fillAndStroke();
        doc.fontSize(11)
           .fillColor('#9ca3af')
           .text('Photo', photoX + 35, photoY + 45, { align: 'center' });
      }
    } else {
      doc.rect(photoX, photoY, photoSize, photoSize)
         .fillColor('#ffffff')
         .strokeColor('#d1d5db')
         .lineWidth(2)
         .fillAndStroke();
      doc.fontSize(11)
         .fillColor('#9ca3af')
         .text('Photo', photoX + 35, photoY + 45, { align: 'center' });
    }

    // ========== PROFILE NAME SECTION ==========
    let yPos = 100;
    
    const profileName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
    doc.fontSize(22)
       .fillColor('#1f2937')
       .text(profileName || 'Profile', 40, yPos);
    
    yPos += 28;
    
    // Profile ID
    doc.fontSize(10)
       .fillColor('#6b7280')
       .text(`Profile ID: ${profileIdShort}`, 40, yPos);
    
    yPos += 16;
    
    // Verification badges
    let badgeX = 40;
    if (profile.isVerified) {
      doc.fontSize(9)
         .fillColor('#059669')
         .text('Verified', badgeX, yPos);
      badgeX += 60;
    }
    if (profile.isPremium) {
      const tier = profile.subscriptionTier || 'PREMIUM';
      const tierLabel = tier === 'PREMIUM' ? 'Premium Member' : tier === 'PRO' ? 'Pro Member' : tier === 'BASIC' ? 'Basic Member' : `${tier} Member`;
      doc.fontSize(9)
         .fillColor('#d97706')
         .text(tierLabel, badgeX, yPos);
    }

    yPos = 180;

    // ========== PERSONAL INFORMATION ==========
    doc.fontSize(14)
       .fillColor('#8B5CF6')
       .text('Personal Information', 40, yPos);
    
    doc.moveTo(40, yPos + 14)
       .lineTo(180, yPos + 14)
       .strokeColor('#8B5CF6')
       .lineWidth(2)
       .stroke();
    
    yPos = 205;
    
    yPos = formatField(doc, 'Full Name:', `${profile.firstName || ''} ${profile.lastName || ''}`.trim(), 40, yPos);
    yPos = formatField(doc, 'Gender:', profile.gender, 40, yPos);
    yPos = formatField(doc, 'Age:', profile.age ? `${profile.age} years` : '', 40, yPos);
    yPos = formatField(doc, 'Date of Birth:', profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('en-IN') : '', 40, yPos);
    yPos = formatField(doc, 'Marital Status:', profile.maritalStatus, 40, yPos);
    yPos = formatField(doc, 'Height:', profile.height ? `${profile.height} cm` : '', 280, yPos - 16);
    yPos = formatField(doc, 'Weight:', profile.weight ? `${profile.weight} kg` : '', 280, yPos);
    yPos = formatField(doc, 'Complexion:', profile.complexion, 40, yPos);

    // ========== COMMUNITY ==========
    yPos += 20;
    doc.fontSize(14)
       .fillColor('#8B5CF6')
       .text('Community & Religion', 40, yPos);
    
    doc.moveTo(40, yPos + 14)
       .lineTo(200, yPos + 14)
       .strokeColor('#8B5CF6')
       .lineWidth(2)
       .stroke();
    
    yPos += 30;
    yPos = formatField(doc, 'Community:', profile.community, 40, yPos);
    yPos = formatField(doc, 'Sub Caste:', profile.subCaste || 'Not specified', 280, yPos - 16);

    // ========== LOCATION ==========
    yPos += 20;
    doc.fontSize(14)
       .fillColor('#8B5CF6')
       .text('Location Details', 40, yPos);
    
    doc.moveTo(40, yPos + 14)
       .lineTo(150, yPos + 14)
       .strokeColor('#8B5CF6')
       .lineWidth(2)
       .stroke();
    
    yPos += 30;
    yPos = formatField(doc, 'City:', profile.city, 40, yPos);
    yPos = formatField(doc, 'State:', profile.state, 280, yPos - 16);
    yPos = formatField(doc, 'Country:', profile.country || 'India', 40, yPos);

    // ========== EDUCATION & CAREER ==========
    yPos += 20;
    doc.fontSize(14)
       .fillColor('#8B5CF6')
       .text('Education & Career', 40, yPos);
    
    doc.moveTo(40, yPos + 14)
       .lineTo(170, yPos + 14)
       .strokeColor('#8B5CF6')
       .lineWidth(2)
       .stroke();
    
    yPos += 30;
    yPos = formatField(doc, 'Education:', profile.education || 'Not specified', 40, yPos);
    yPos = formatField(doc, 'Profession:', profile.profession || 'Not specified', 280, yPos - 16);
    yPos = formatField(doc, 'Annual Income:', profile.income || 'Not specified', 40, yPos);

    // ========== FAMILY DETAILS ==========
    yPos += 20;
    doc.fontSize(14)
       .fillColor('#8B5CF6')
       .text('Family Details', 40, yPos);
    
    doc.moveTo(40, yPos + 14)
       .lineTo(130, yPos + 14)
       .strokeColor('#8B5CF6')
       .lineWidth(2)
       .stroke();
    
    yPos += 30;
    yPos = formatField(doc, 'Father Name:', profile.fatherName || 'Not specified', 40, yPos);
    yPos = formatField(doc, 'Father Occupation:', profile.fatherOccupation || 'Not specified', 280, yPos - 16);
    yPos = formatField(doc, 'Mother Name:', profile.motherName || 'Not specified', 40, yPos);
    yPos = formatField(doc, 'Mother Occupation:', profile.motherOccupation || 'Not specified', 280, yPos - 16);
    yPos = formatField(doc, 'Family Values:', profile.familyValues || 'Not specified', 40, yPos);

    // ========== HOROSCOPE ==========
    yPos += 20;
    doc.fontSize(14)
       .fillColor('#8B5CF6')
       .text('Horoscope Details', 40, yPos);
    
    doc.moveTo(40, yPos + 14)
       .lineTo(150, yPos + 14)
       .strokeColor('#8B5CF6')
       .lineWidth(2)
       .stroke();
    
    yPos += 30;
    yPos = formatField(doc, 'Raasi:', profile.raasi || 'Not specified', 40, yPos);
    yPos = formatField(doc, 'Nakshatra:', profile.natchathiram || 'Not specified', 280, yPos - 16);
    yPos = formatField(doc, 'Dhosam:', profile.dhosam || 'None', 40, yPos);
    yPos = formatField(doc, 'Birth Time:', profile.birthTime || 'Not specified', 280, yPos - 16);
    yPos = formatField(doc, 'Birth Place:', profile.birthPlace || 'Not specified', 40, yPos);

    // ========== ABOUT ==========
    yPos += 20;
    doc.fontSize(14)
       .fillColor('#8B5CF6')
       .text('About', 40, yPos);
    
    doc.moveTo(40, yPos + 14)
       .lineTo(80, yPos + 14)
       .strokeColor('#8B5CF6')
       .lineWidth(2)
       .stroke();
    
    yPos += 30;
    
    const bioText = profile.bio || 'Not provided';
    doc.fontSize(10)
       .fillColor('#4b5563')
       .text(bioText, 40, yPos, {
         width: 480,
         align: 'left'
       });

    // ========== GALLERY SECTION ==========
    let galleryPhotos = [];
    try {
      if (profile.photos) {
        galleryPhotos = typeof profile.photos === 'string' 
          ? JSON.parse(profile.photos) 
          : profile.photos;
      }
    } catch (e) {
      console.log('Failed to parse photos:', e);
    }

    if (galleryPhotos.length > 0) {
      yPos = doc.y + 30;
      
      doc.fontSize(14)
         .fillColor('#8B5CF6')
         .text('Gallery Photos', 40, yPos);
      
      doc.moveTo(40, yPos + 14)
         .lineTo(140, yPos + 14)
         .strokeColor('#8B5CF6')
         .lineWidth(2)
         .stroke();
      
      yPos += 30;
      
      // Draw gallery grid
      let xPos = 40;
      const imgWidth = 80;
      const imgHeight = 80;
      const spacing = 25;
      
      for (let i = 0; i < Math.min(galleryPhotos.length, 6); i++) {
        const photoBuffer = await fetchImageAsBuffer(galleryPhotos[i]);
        
        if (photoBuffer) {
          try {
            doc.image(photoBuffer, xPos, yPos, {
              width: imgWidth,
              height: imgHeight,
              fit: [imgWidth, imgHeight]
            });
          } catch (e) {
            doc.rect(xPos, yPos, imgWidth, imgHeight)
               .fillColor('#f3f4f6')
               .strokeColor('#d1d5db')
               .lineWidth(1)
               .fillAndStroke();
            doc.fontSize(9)
               .fillColor('#9ca3af')
               .text(`Photo ${i + 1}`, xPos + 20, yPos + 35, { align: 'center' });
          }
        } else {
          doc.rect(xPos, yPos, imgWidth, imgHeight)
             .fillColor('#f3f4f6')
             .strokeColor('#d1d5db')
             .lineWidth(1)
             .fillAndStroke();
          doc.fontSize(9)
             .fillColor('#9ca3af')
             .text(`Photo ${i + 1}`, xPos + 20, yPos + 35, { align: 'center' });
        }
        
        xPos += imgWidth + spacing;
        
        if ((i + 1) % 4 === 0) {
          xPos = 40;
          yPos += imgHeight + spacing;
        }
      }
    }

    // ========== WATERMARK ==========
    doc.fontSize(55)
       .fillColor('#E5E7EB')
       .opacity(0.08)
       .rotate(45, { origin: [300, 400] })
       .text('VIJAYALAKSHMI BOYAR MATRIMONY', 50, 250)
       .rotate(-45)
       .opacity(1);

    // ========== FOOTER ==========
    const footerY = doc.page.height - 50;
    
    doc.moveTo(40, footerY - 10)
       .lineTo(doc.page.width - 40, footerY - 10)
       .strokeColor('#e5e7eb')
       .lineWidth(1)
       .stroke();
    
    doc.fontSize(9)
       .fillColor('#9ca3af')
       .text(
         `Generated by Vijayalakshmi Boyar Matrimony | ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`,
         40,
         footerY,
         { align: 'center', width: doc.page.width - 80 }
       );
    
    doc.fontSize(8)
       .fillColor('#d1d5db')
       .text(
         'This is a computer-generated document. No signature required.',
         40,
         footerY + 12,
         { align: 'center', width: doc.page.width - 80 }
       );

    // End the PDF
    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }
});

/**
 * Generate PDF for own profile (for sharing)
 */
router.get('/my-profile-pdf', authMiddleware, async (req, res) => {
  try {
    res.redirect(`/api/profile-pdf/download-profile/${req.user.id}`);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

/**
 * Public shareable profile link - generates realistic watermark PDF
 * Accessible without authentication using profile ID
 * This creates a web link for sharing profiles with watermarks
 * 
 * Web link format: /api/profile-pdf/share/:id
 */
router.get('/share/:id', async (req, res) => {
  try {
    const profileId = req.params.id;
    const sanitize = req.query.sanitize === 'true'; // Remove contact info
    
    // Fetch profile from database
    const profile = await prisma.user.findUnique({
      where: { id: profileId }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (!profile.isActive) {
      return res.status(404).json({ error: 'Profile not available' });
    }

    // Normalize profile photo path
    if (profile.profilePhoto && !profile.profilePhoto.startsWith('http') && !profile.profilePhoto.startsWith('/')) {
      profile.profilePhoto = `/${profile.profilePhoto}`;
    }

    // Normalize photos array paths
    let photosArray = [];
    if (profile.photos) {
      try {
        photosArray = JSON.parse(profile.photos);
      } catch (e) {
        photosArray = [];
      }
    }
    if (Array.isArray(photosArray)) {
      profile.photos = photosArray.map(photo => {
        if (!photo.startsWith('http') && !photo.startsWith('/')) {
          return `/${photo}`;
        }
        return photo;
      });
    } else {
      profile.photos = [];
    }

    // Prepare profile name and ID for filename
    const fullName = `${profile.firstName || ''}${profile.lastName || ''}`.replace(/\s+/g, '');
    const profileIdShort = profile.id.slice(-6).toUpperCase();
    const fileName = sanitize 
      ? `${fullName}${profileIdShort}_Shared__Profile.pdf`
      : `${fullName}${profileIdShort}_Profile.pdf`;

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=${fileName}`);

    // Watermark configuration - same as test file
    const WATERMARK_TEXT = 'Vijayalakshmi Boyar Matrimony';
    const WATERMARK_FONT = 'Helvetica';

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: `${fullName} Profile`,
        Author: 'Vijayalakshmi Boyar Matrimony',
        Subject: 'Matrimony Profile'
      }
    });

    doc.pipe(res);

    // ========== HEADER FUNCTION ==========
    const addHeader = (doc, subtitle = '') => {
      // Purple banner rectangle
      doc.fillColor('#8B5CF6').rect(0, 0, doc.page.width, 50).fill();
      // White text
      doc.fillColor('#FFFFFF').fontSize(20).text(WATERMARK_TEXT, 0, 15, { align: 'center', width: doc.page.width });
      if (subtitle) {
        doc.fontSize(10).text(subtitle, 0, 38, { align: 'center', width: doc.page.width });
      }
      return 60;
    };

    // ========== WATERMARK FUNCTION ==========
    const addWatermark = (doc, text = WATERMARK_TEXT, opacity = 0.15) => {
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      
      doc.save();
      
      // Watermark configuration - diagonal tile pattern at 45 degrees
      const fontSize = 20;
      const angle = -45;
      const spacingX = 200;
      const spacingY = 200;
      
      // Set watermark properties - dark green color for better visibility
      doc.fillColor('#632704').opacity(opacity).font(WATERMARK_FONT).fontSize(fontSize);
      
      const diagonal = Math.sqrt(pageWidth * pageWidth + pageHeight * pageHeight);
      
      // Create multiple rows of diagonal watermarks
      for (let row = -3; row < 10; row++) {
        const yOffset = row * spacingY;
        for (let col = -3; col < 12; col++) {
          const xOffset = col * spacingX + (row % 2) * (spacingX / 2);
          
          doc.save();
          doc.translate(xOffset, yOffset);
          doc.rotate(angle);
          doc.text(text, 0, 0, { align: 'center', lineBreak: false });
          doc.restore();
        }
      }
      
      doc.restore();
      doc.opacity(1);
    };

    // ========== FIELD FORMATTER ==========
    const addField = (doc, label, value, x, y, w = 130) => {
      if (!value || value === 'Not provided') return y;
      doc.fontSize(10).fillColor('#64748b').text(label, x, y, { width: w });
      doc.fillColor('#1e293b').text(String(value), x + w, y, { width: 220 });
      return y + 14;
    };

    // ========== SECTION HEADER ==========
    const addSectionHeader = (doc, title, y) => {
      doc.fontSize(14).fillColor('#8B5CF6').text(title, 40, y);
      return y + 18;
    };

    // ========== FORMAT DATE ==========
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // ========== FETCH IMAGE ==========
    const fetchImage = async (imagePath) => {
      try {
        if (!imagePath || imagePath === 'null') return null;
        
        // If it's a Cloudinary URL, try to fetch it
        if (imagePath.includes('cloudinary') || imagePath.startsWith('http')) {
          try {
            const response = await axios.get(imagePath, { 
              responseType: 'arraybuffer',
              timeout: 10000
            });
            return Buffer.from(response.data);
          } catch (e) {
            console.log('Failed to fetch Cloudinary image:', imagePath, e.message);
            return null;
          }
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
    };

    let y = 0;
    let pageNum = 1;

    // ========== PAGE 1 ==========
    y = addHeader(doc, 'User Profile Details');
    
    // Add watermark to first page
    addWatermark(doc, WATERMARK_TEXT, 0.15);

    // Profile Photo
    const pBuf = await fetchImage(profile.profilePhoto);
    if (pBuf) { 
      try { 
        doc.image(pBuf, 40, y, { width: 80, height: 80 }); 
      } catch {} 
    }

    doc.fontSize(20).fillColor('#333').text(`${profile.firstName || ''} ${profile.lastName || ''}`.toUpperCase(), 130, y);
    doc.fontSize(10).fillColor('#666').text(`ID: ${profile.id?.slice(-8)}`, 130, y + 22);
    doc.fillColor('#059669').text('✓ Verified', 130, y + 35);
    
    // Show actual subscription tier
    const tier = profile.subscriptionTier || 'FREE';
    if (tier !== 'FREE') {
      const tierLabel = tier === 'PREMIUM' ? '★ Premium' : tier === 'PRO' ? '★ Pro' : tier === 'BASIC' ? '★ Basic' : `★ ${tier}`;
      doc.fillColor('#d97706').text(tierLabel, 130, y + 48);
    }

    y = 200;
    y = addSectionHeader(doc, 'Contact Information', y);
    
    if (sanitize) {
      y = addField(doc, 'Email:', 'Hidden for privacy', 40, y);
      y = addField(doc, 'Phone:', 'Hidden for privacy', 40, y);
    } else {
      y = addField(doc, 'Email:', profile.email || 'Not provided', 40, y);
      y = addField(doc, 'Phone:', profile.phone || 'Not provided', 40, y);
    }
    y = addField(doc, 'DOB / Age:', `${formatDate(profile.dateOfBirth)} (${profile.age} years)`, 40, y);
    
    y = addSectionHeader(doc, 'Location', y);
    y = addField(doc, 'City:', profile.city, 40, y);
    y = addField(doc, 'State:', profile.state, 40, y);
    y = addField(doc, 'Country:', profile.country, 40, y);
    
    y = addSectionHeader(doc, 'Personal Details', y);
    y = addField(doc, 'Gender:', profile.gender, 40, y);
    y = addField(doc, 'Marital Status:', profile.maritalStatus, 40, y);
    y = addField(doc, 'Community:', profile.community, 40, y);
    y = addField(doc, 'Sub Caste:', profile.subCaste || 'Not provided', 40, y);
    y = addField(doc, 'Height:', profile.height || 'Not provided', 40, y);
    y = addField(doc, 'Weight:', profile.weight || 'Not provided', 40, y);
    y = addField(doc, 'Complexion:', profile.complexion || 'Not provided', 40, y);

    // ========== PAGE 2 ==========
    doc.addPage();
    pageNum++;
    
    y = addHeader(doc);
    
    // Add watermark to second page
    addWatermark(doc, WATERMARK_TEXT, 0.12);
    
    y = addSectionHeader(doc, 'Professional Details', y);
    y = addField(doc, 'Education:', profile.education || 'Not provided', 40, y);
    y = addField(doc, 'Profession:', profile.profession || 'Not provided', 40, y);
    y = addField(doc, 'Income:', profile.income || 'Not provided', 40, y);
    
    y = addSectionHeader(doc, 'Family Details', y);
    y = addField(doc, 'Father Name:', profile.fatherName || 'Not provided', 40, y);
    y = addField(doc, 'Father Occupation:', profile.fatherOccupation || 'Not provided', 40, y);
    y = addField(doc, 'Mother Name:', profile.motherName || 'Not provided', 40, y);
    y = addField(doc, 'Mother Occupation:', profile.motherOccupation || 'Not provided', 40, y);
    y = addField(doc, 'Family Values:', profile.familyValues || 'Not provided', 40, y);
    y = addField(doc, 'About Family:', profile.aboutFamily || 'Not provided', 40, y);
    
    y = addSectionHeader(doc, 'Horoscope Details', y);
    y = addField(doc, 'Raasi:', profile.raasi || 'Not provided', 40, y);
    y = addField(doc, 'Natchathiram:', profile.natchathiram || 'Not provided', 40, y);
    y = addField(doc, 'Dhosam:', profile.dhosam || 'Not provided', 40, y);
    y = addField(doc, 'Birth Time:', profile.birthTime || 'Not provided', 40, y);
    y = addField(doc, 'Birth Place:', profile.birthPlace || 'Not provided', 40, y);
    
    y = addSectionHeader(doc, 'About', y);
    doc.fontSize(10).fillColor('#444').text(profile.bio || 'Not provided', 40, y, { width: 480 });

    // ========== GALLERY - ONE PHOTO PER PAGE ==========
    const gallery = profile.photos || [];
    for (let i = 0; i < gallery.length; i++) {
      doc.addPage();
      pageNum++;
      
      // Purple banner header
      y = addHeader(doc, `Gallery Photo ${i + 1} of ${gallery.length}`);
      
      const buf = await fetchImage(gallery[i]);
      if (buf) {
        try {
          const imgWidth = doc.page.width - 80;
          const imgHeight = doc.page.height - 110;
          doc.image(buf, 40, 70, { width: imgWidth, height: imgHeight });
          
          // Add diagonal tile watermark to gallery image
          addWatermark(doc, WATERMARK_TEXT, 0.18);
        } catch (e) {
          doc.fontSize(12).fillColor('#666').text('Unable to display image', 40, 200);
        }
      } else {
        doc.fontSize(12).fillColor('#666').text('Image not found', 40, 200);
      }
      
      // Add watermark to gallery pages
      addWatermark(doc, WATERMARK_TEXT, 0.12);
    }

    // ========== DOCUMENTS ==========
    const docs = await prisma.userDocument.findMany({
      where: { userId: profileId }
    });

    for (let i = 0; i < docs.length; i++) {
      doc.addPage();
      pageNum++;
      
      doc.fontSize(14).fillColor('#8B5CF6').text(`Document ${i + 1} of ${docs.length}`, 40, 30, { align: 'center' });
      
      // Add watermark to document pages
      addWatermark(doc, WATERMARK_TEXT, 0.12);
      
      y = 60;
      doc.fontSize(12).fillColor('#333').text(`Type: ${docs[i].documentType || 'N/A'}`, 40, y);
      doc.fontSize(12).fillColor('#333').text(`Number: ${docs[i].documentNumber || 'N/A'}`, 40, y + 18);
      if (docs[i].isVerified) {
        doc.fontSize(12).fillColor('#059669').text('✓ Verified', 40, y + 36);
      }
    }

    // ========== FOOTER ON LAST PAGE ==========
    const footerY = doc.page.height - 30;
    doc.moveTo(40, footerY - 10)
       .lineTo(doc.page.width - 40, footerY - 10)
       .strokeColor('#e5e7eb')
       .lineWidth(1)
       .stroke();
    
    doc.fontSize(9)
       .fillColor('#9ca3af')
       .text(
         `Generated by Vijayalakshmi Boyar Matrimony | ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`,
         40,
         footerY,
         { align: 'center', width: doc.page.width - 80 }
       );

    doc.end();
    
    console.log(`Shared profile PDF generated for ${profileId}, pages: ${pageNum}, sanitize: ${sanitize}`);

  } catch (error) {
    console.error('Share PDF generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate shared profile PDF' });
    }
  }
});

module.exports = router;
