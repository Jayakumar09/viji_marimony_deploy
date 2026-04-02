/**
 * Generate Shared Profile PDF Route
 * Uses Prisma (PostgreSQL) for production database
 * Professional PDF Layout based on successful implementation
 * 
 * Web Link Format:
 * - Full Profile: /api/shared-profile/:userId
 * - Sanitized: /api/shared-profile/:userId?sanitize=true
 * - Page Info: /api/shared-profile/:userId/pages (GET)
 */

const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Use Prisma for database
const { prisma } = require('../utils/database');

const WATERMARK_TEXT = 'Vijayalakshmi Boyar Matrimony';

// Color constants
const PRIMARY_COLOR = '#8B5CF6';
const SECONDARY_COLOR = '#6B7280';
const TEXT_COLOR = '#1F2937';

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
    const parts = cloudinaryUrl.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    
    let publicId = parts.slice(uploadIndex + 1).join('/');
    publicId = publicId.replace(/^v\d+\//, '');
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

/**
 * Add diagonal watermark across all pages
 */
function addWatermark(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.08 }));
    doc.setTextColor(139, 92, 246);
    doc.fontSize(30);
    
    // Diagonal watermark pattern
    const spacing = 80;
    const numWatermarks = Math.ceil(pageHeight / spacing) + 2;
    
    for (let j = 0; j < numWatermarks; j++) {
      const x = -100 + (j * spacing);
      const y = pageHeight - (j * spacing * 0.8);
      
      if (y > -50 && y < pageHeight + 50) {
        doc.text(WATERMARK_TEXT, x, y, {
          lineBreak: false
        });
      }
    }
    
    doc.restoreGraphicsState();
  }
}

/**
 * Add professional header with profile info
 */
function addProfessionalHeader(doc, user, displayId, isSanitized) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header background - Purple gradient effect
  doc.fillColor(PRIMARY_COLOR);
  doc.rect(0, 0, pageWidth, 70).fill();
  
  // Title
  doc.fillColor('#FFFFFF');
  doc.fontSize(20);
  doc.font('Helvetica-Bold');
  doc.text('Profile Details', 20, 15);
  
  // Subtitle
  doc.fontSize(10);
  doc.font('Helvetica');
  doc.text('Vijayalakshmi Boyar Matrimony', 20, 32);
  
  // Profile Name on right
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toUpperCase();
  doc.fontSize(16);
  doc.font('Helvetica-Bold');
  doc.text(fullName, pageWidth - 20, 15, { align: 'right', width: 150 });
  
  // Profile ID
  doc.fontSize(10);
  doc.font('Helvetica');
  doc.text(`ID: ${displayId}`, pageWidth - 20, 32, { align: 'right', width: 150 });
  
  // Verification badge
  if (user.isVerified) {
    doc.fillColor('#10B981'); // Green
    doc.text('✓ Verified', pageWidth - 20, 44, { align: 'right', width: 150 });
  }
  
  // Subscription tier
  const tier = user.subscriptionTier || 'FREE';
  if (tier !== 'FREE') {
    doc.fillColor('#F59E0B'); // Amber
    const tierLabel = tier === 'PREMIUM' ? '★ Premium' : tier === 'PRO' ? '★ Pro' : `★ ${tier}`;
    doc.text(tierLabel, pageWidth - 20, isSanitized ? 44 : 56, { align: 'right', width: 150 });
  }
  
  // Profile Photo placeholder on right
  const photoX = pageWidth - 65;
  const photoY = 75;
  const photoSize = 55;
  
  // White background for photo
  doc.fillColor('#FFFFFF');
  doc.roundedRect(photoX, photoY, photoSize, photoSize, 3, 3).fill();
  doc.strokeColor('#E5E7EB');
  doc.lineWidth(1);
  doc.roundedRect(photoX, photoY, photoSize, photoSize, 3, 3).stroke();
  
  // Person silhouette
  doc.fillColor('#D1D5DB');
  doc.circle(photoX + photoSize/2, photoY + 18, 8, 'F'); // Head
  doc.circle(photoX + photoSize/2, photoY + 35, 12, 'F'); // Body
  
  // Photo label
  doc.fillColor('#9CA3AF');
  doc.fontSize(6);
  doc.text('Photo', photoX + photoSize/2, photoY + photoSize - 5, { align: 'center' });
  
  return 140; // Return next Y position
}

/**
 * Add a section with title bar
 */
function addSection(doc, title, startY) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Section title bar
  doc.fillColor(PRIMARY_COLOR);
  doc.roundedRect(15, startY, pageWidth - 30, 8, 2, 2).fill();
  
  doc.fillColor('#FFFFFF');
  doc.fontSize(10);
  doc.font('Helvetica-Bold');
  doc.text(title, 20, startY + 2);
  
  return startY + 15;
}

/**
 * Add field with label and value
 */
function addField(doc, label, value, x, y) {
  doc.fontSize(9);
  doc.fillColor(SECONDARY_COLOR);
  doc.font('Helvetica-Bold');
  doc.text(label, x, y);
  
  doc.fillColor(TEXT_COLOR);
  doc.font('Helvetica');
  doc.text(String(value || 'N/A'), x + 60, y);
  
  return y + 12;
}

/**
 * Add footer
 */
function addFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.strokeColor(PRIMARY_COLOR);
    doc.lineWidth(0.5);
    doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);
    
    // Footer text
    doc.fillColor('#9CA3AF');
    doc.fontSize(8);
    doc.font('Helvetica');
    doc.text('Generated by Vijayalakshmi Boyar Matrimony', 15, pageHeight - 14);
    
    // Page number
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 14, { align: 'center' });
    
    // Timestamp
    const timestamp = new Date().toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(timestamp, pageWidth - 15, pageHeight - 14, { align: 'right' });
  }
}

/**
 * Add gallery page with grid layout
 */
async function addGalleryPage(doc, gallery, startY) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Add section header
  const sectionY = addSection(doc, 'Photo Gallery', startY);
  
  const galleryY = sectionY + 10;
  const cols = 2;
  const photoWidth = (pageWidth - 60) / cols;
  const photoHeight = 100;
  const gap = 10;
  
  for (let i = 0; i < gallery.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    
    const x = 20 + (col * (photoWidth + gap));
    const y = galleryY + (row * (photoHeight + gap));
    
    // Check if we need a new page
    if (y + photoHeight > pageHeight - 40) {
      doc.addPage();
      const newSectionY = addSection(doc, 'Photo Gallery (Continued)', 20);
      return newSectionY + photoHeight + 20;
    }
    
    // Photo background
    doc.fillColor('#F3F4F6');
    doc.roundedRect(x, y, photoWidth, photoHeight, 3, 3).fill();
    doc.strokeColor('#E5E7EB');
    doc.roundedRect(x, y, photoWidth, photoHeight, 3, 3).stroke();
    
    // Try to load image
    const imgBuf = await fetchImage(gallery[i]);
    if (imgBuf) {
      try {
        doc.image(imgBuf, x, y, { width: photoWidth, height: photoHeight, fit: [photoWidth, photoHeight] });
      } catch (e) {
        // Keep placeholder
        doc.fillColor('#D1D5DB');
        doc.text(`Photo ${i + 1}`, x + photoWidth/2, y + photoHeight/2, { align: 'center' });
      }
    } else {
      doc.fillColor('#D1D5DB');
      doc.text(`Photo ${i + 1}`, x + photoWidth/2, y + photoHeight/2, { align: 'center' });
    }
  }
  
  return galleryY + (Math.ceil(gallery.length / cols) * (photoHeight + gap)) + 10;
}

/**
 * GET /api/shared-profile/:userId/pages
 * Get page count info without generating PDF
 */
router.get('/:userId/pages', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (!user.isActive) {
      return res.status(404).json({ error: 'Profile not available' });
    }

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
    
    // Estimate pages needed
    let estimatedPages = 2; // Base pages
    if (galleryCount > 0) {
      estimatedPages += Math.ceil(galleryCount / 2); // 2 photos per page
    }
    
    return res.json({
      success: true,
      pages: estimatedPages,
      profilePhoto: !!user.profilePhoto,
      galleryCount
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
    
    // Debug log
    console.log('Generating PDF for userId:', userId, 'sanitize:', sanitize);
    
    // Fetch user profile using Prisma
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.log('User not found:', userId);
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (!user.isActive) {
      console.log('User not active:', userId);
      return res.status(404).json({ error: 'Profile not available' });
    }

    console.log('User found:', user.firstName, user.lastName);

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
      } catch (err) {
        console.log('Error parsing photos:', err.message);
      }
    }

    // Get documents
    let docs = [];
    try {
      docs = await prisma.userDocument.findMany({
        where: { userId: userId }
      });
    } catch (err) {
      console.log('Error fetching documents:', err.message);
    }
    
    // Prepare filename
    const customId = user.customId || '';
    const fullName = `${user.firstName}${user.lastName?.replace(/\s+/g, '') || ''}`;
    const displayId = customId || user.id.slice(-8).toUpperCase();
    const fileName = sanitize 
      ? `${fullName}${displayId}_Sanitized__Profile.pdf`
      : `${fullName}${displayId}_Profile.pdf`;
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    
    // Create PDF with A4 size
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });
    
    doc.pipe(res);
    
    let y = 0;
    
    // ========== PAGE 1 ==========
    y = addProfessionalHeader(doc, user, displayId, sanitize);
    
    // Add spacing after header
    y += 20;
    
    // ========== PERSONAL INFORMATION SECTION ==========
    // Check if we need a new page
    if (y > 600) {
      doc.addPage();
      y = 40;
    }
    
    y = addSection(doc, 'Personal Information', y);
    
    y = addField(doc, 'Full Name:', `${user.firstName || ''} ${user.lastName || ''}`.trim(), 20, y);
    y = addField(doc, 'Gender:', user.gender || 'Not provided', 20, y);
    y = addField(doc, 'Date of Birth:', formatDate(user.dateOfBirth), 20, y);
    y = addField(doc, 'Age:', user.age ? `${user.age} years` : 'Not provided', 20, y);
    y = addField(doc, 'Blood Group:', user.bloodGroup || 'Not provided', 20, y);
    y = addField(doc, 'Marital Status:', user.maritalStatus || 'Not provided', 20, y);
    y = addField(doc, 'Religion:', user.religion || user.community || 'Not provided', 20, y);
    y = addField(doc, 'Mother Tongue:', user.motherTongue || 'Not provided', 20, y);
    y = addField(doc, 'Sub Caste:', user.subCaste || 'Not provided', 20, y);
    y = addField(doc, 'Height:', user.height || 'Not provided', 20, y);
    y = addField(doc, 'Weight:', user.weight ? `${user.weight} kg` : 'Not provided', 20, y);
    y = addField(doc, 'Complexion:', user.complexion || 'Not provided', 20, y);
    
    // Check if we need a new page for next section
    if (y > 600) {
      doc.addPage();
      y = 40;
    }
    
    // ========== CONTACT INFORMATION SECTION ==========
    y = addSection(doc, 'Contact Information', y);
    
    if (sanitize) {
      y = addField(doc, 'Email:', 'Hidden for privacy', 20, y);
      y = addField(doc, 'Phone:', 'Hidden for privacy', 20, y);
    } else {
      y = addField(doc, 'Email:', user.email || 'Not provided', 20, y);
      y = addField(doc, 'Phone:', user.phone || 'Not provided', 20, y);
    }
    y = addField(doc, 'City:', user.city || 'Not provided', 20, y);
    y = addField(doc, 'State:', user.state || 'Not provided', 20, y);
    y = addField(doc, 'Country:', user.country || 'India', 20, y);
    
    // Check if we need a new page for family section
    if (y > 650) {
      doc.addPage();
      y = 40;
    }
    
    // ========== FAMILY DETAILS SECTION ==========
    y = addSection(doc, 'Family Details', y);
    
    if (sanitize) {
      y = addField(doc, 'Family Details:', 'Hidden for privacy', 20, y);
    } else {
      y = addField(doc, 'Father Name:', user.fatherName || 'Not provided', 20, y);
      y = addField(doc, 'Mother Name:', user.motherName || 'Not provided', 20, y);
      y = addField(doc, 'Siblings:', user.siblings || 'Not provided', 20, y);
      y = addField(doc, 'Family Type:', user.familyType || 'Not provided', 20, y);
      y = addField(doc, 'Family Values:', user.familyValues || 'Not provided', 20, y);
    }
    
    // Add watermark on page 1
    if (!sanitize) {
      addWatermark(doc);
    }
    
    // ========== PAGE 2 ==========
    doc.addPage();
    y = 20;
    
    // ========== EDUCATION & CAREER SECTION ==========
    y = addSection(doc, 'Education & Career', y);
    
    y = addField(doc, 'Education:', user.education || 'Not provided', 20, y);
    y = addField(doc, 'Occupation:', user.occupation || 'Not provided', 20, y);
    y = addField(doc, 'Employer:', user.employer || 'Not provided', 20, y);
    y = addField(doc, 'Annual Income:', user.annualIncome || 'Not provided', 20, y);
    y = addField(doc, 'Work Location:', user.workLocation || 'Not provided', 20, y);
    y = addField(doc, 'Job Type:', user.jobType || 'Not provided', 20, y);
    
    // ========== HOROSCOPE DETAILS SECTION ==========
    y = addSection(doc, 'Horoscope Details', y);
    
    y = addField(doc, 'Rashi:', user.rasi || 'Not provided', 20, y);
    y = addField(doc, 'Natchathiram:', user.natchathiram || 'Not provided', 20, y);
    y = addField(doc, 'Manglik/Dosham:', user.dosham || 'None', 20, y);
    y = addField(doc, 'Birth Time:', user.birthTime || 'Not provided', 20, y);
    y = addField(doc, 'Birth Place:', user.birthPlace || 'Not provided', 20, y);
    
    // ========== PARTNER PREFERENCES SECTION ==========
    y = addSection(doc, 'Partner Preferences', y);
    
    y = addField(doc, 'Preferred Age:', user.preferredAge || 'Not specified', 20, y);
    y = addField(doc, 'Preferred Height:', user.preferredHeight || 'Not specified', 20, y);
    y = addField(doc, 'Preferred Education:', user.preferredEducation || 'Not specified', 20, y);
    y = addField(doc, 'Preferred Occupation:', user.preferredOccupation || 'Not specified', 20, y);
    y = addField(doc, 'Preferred Location:', user.preferredLocation || 'Not specified', 20, y);
    
    // ========== ABOUT ME SECTION ==========
    if (user.aboutMe || user.bio) {
      y = addSection(doc, 'About Me', y);
      
      const aboutText = user.aboutMe || user.bio;
      doc.fontSize(9);
      doc.fillColor(TEXT_COLOR);
      const aboutY = doc.text(aboutText, 20, y, {
        width: doc.internal.pageSize.getWidth() - 40,
        align: 'justify'
      });
      y = aboutY + 15;
    }
    
    // Add watermark on page 2
    if (!sanitize) {
      addWatermark(doc);
    }
    
    // ========== GALLERY PAGES ==========
    if (gallery.length > 0) {
      doc.addPage();
      y = 20;
      y = await addGalleryPage(doc, gallery, y);
    }
    
    // ========== DOCUMENTS PAGE ==========
    if (docs.length > 0 && !sanitize) {
      doc.addPage();
      y = addSection(doc, 'Documents', 20);
      
      for (const docItem of docs) {
        y = addField(doc, 'Document:', docItem.documentType || 'Document', 20, y);
        if (y > 700) {
          doc.addPage();
          y = addSection(doc, 'Documents (Continued)', 20);
        }
      }
      
      addWatermark(doc);
    }
    
    // Add footer to all pages
    addFooter(doc);
    
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
