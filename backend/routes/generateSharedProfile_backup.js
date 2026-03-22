/**
 * Generate Shared Profile PDF Route
 * Uses the exact same logic as frontend/test-admin-profile-pdf-watermark.js
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
const Database = require('better-sqlite3');
const axios = require('axios');

const WATERMARK_TEXT = 'Vijayalakshmi Boyar Matrimony';
const WATERMARK_FONT = 'Helvetica';

// Database path
const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');

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

function addHeader(doc, subtitle = '') {
  doc.fillColor('#8B5CF6').rect(0, 0, doc.page.width, 50).fill();
  doc.fillColor('#FFFFFF').fontSize(20).text(WATERMARK_TEXT, 0, 15, { align: 'center', width: doc.page.width });
  if (subtitle) {
    doc.fontSize(10).text(subtitle, 0, 38, { align: 'center', width: doc.page.width });
  }
  return 60;
}

function addField(doc, label, value, x, y, w = 130) {
  if (!value || value === 'Not provided') return y;
  doc.fontSize(10).fillColor('#64748b').text(label, x, y, { width: w });
  doc.fillColor('#1e293b').text(String(value), x + w, y, { width: 220 });
  return y + 14;
}

function addWatermark(doc, text = WATERMARK_TEXT, opacity = 0.15) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  
  doc.save();
  
  // Larger font size for better visibility
  const fontSize = 24;
  const angle = -45;
  // Increased spacing to avoid double lines
  const spacingX = 200;
  const spacingY = 200;
  
  // Purple color matching app theme
  doc.fillColor('#8B5CF6').opacity(opacity).font('Helvetica').fontSize(fontSize);
  
  // Cover full page with single line watermarks
  for (let row = -2; row < 12; row++) {
    const yOffset = row * spacingY;
    for (let col = -2; col < 8; col++) {
      const xOffset = col * spacingX + (row % 2) * (spacingX / 2);
      
      doc.save();
      doc.translate(xOffset, yOffset);
      doc.rotate(angle);
      doc.text(text, 0, 0, { align: 'center', lineBreak: false, width: 350 });
      doc.restore();
    }
  }
  
  doc.restore();
  doc.opacity(1);
}

/**
 * GET /api/shared-profile/:userId/pages
 * Get page count info without generating PDF
 */
router.get('/:userId/pages', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Connect to database
    const db = new Database(dbPath, { readonly: true });
    
    // Fetch user profile
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    
    console.log('Page count for userId:', userId, 'User found:', !!user, 'is_active:', user?.is_active);
    
    if (!user) {
      db.close();
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    if (!user.is_active) {
      db.close();
      return res.status(404).json({ error: 'Profile not available' });
    }
    
    // Get profile photo - use the profile_photo field from database
    // This is separate from gallery photos stored in user.photos
    let profilePhotoUrl = user.profile_photo;
    // DO NOT overwrite with photos array - profile photo is stored separately
    
    // Get gallery count - all photos in user.photos are gallery photos
    // Profile photo is stored separately in user.profile_photo
    let galleryCount = 0;
    if (user.photos) {
      try {
        const parsedPhotos = JSON.parse(user.photos);
        if (Array.isArray(parsedPhotos) && parsedPhotos.length > 0) {
          // Count all valid URLs (Cloudinary or local uploads)
          galleryCount = parsedPhotos.filter(p =>
            p && typeof p === 'string' && (p.includes('cloudinary') || p.startsWith('/') || p.startsWith('uploads'))
          ).length;
        }
      } catch {}
    }
    
    // Skip the old user_gallery_images table query since we only use Cloudinary now
    
    // Get documents count
    let docsCount = 0;
    try { 
      const docs = db.prepare('SELECT * FROM documents WHERE user_id = ?').all(userId);
      docsCount = docs.length;
    } catch {}
    
    console.log('Page count for userId:', userId, 'galleryCount:', galleryCount, 'docsCount:', docsCount);
    
    // Calculate total pages
    // Page 1: Profile details
    // Page 2: Professional & Family
    // Gallery: 1 page per photo
    // Documents: 1 page per document
    const profilePages = 2; // Always 2 pages for profile info
    const galleryPages = galleryCount;
    const documentPages = docsCount;
    const totalPages = profilePages + galleryPages + documentPages;
    
    db.close();
    
    res.json({
      userId: userId,
      userName: `${user.first_name} ${user.last_name}`.trim(),
      profilePages: profilePages,
      galleryCount: galleryCount,
      galleryPages: galleryPages,
      documentCount: docsCount,
      documentPages: documentPages,
      totalPages: totalPages
    });
    
  } catch (error) {
    console.error('Page count error:', error);
    res.status(500).json({ error: 'Failed to get page count' });
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
    
    // Connect to database
    const db = new Database(dbPath, { readonly: true });
    
    // Fetch user profile
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    
    if (!user) {
      db.close();
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    if (!user.is_active) {
      db.close();
      return res.status(404).json({ error: 'Profile not available' });
    }
    
    // Get profile photo and gallery - profile photo is stored separately in user.profile_photo
    // ALL photos in user.photos are gallery photos
    let profilePhotoUrl = user.profile_photo;
    let gallery = [];
    if (user.photos) {
      try {
        const parsedPhotos = JSON.parse(user.photos);
        if (Array.isArray(parsedPhotos) && parsedPhotos.length > 0) {
          // Get all Cloudinary URLs - these are ALL gallery photos
          gallery = parsedPhotos.filter(p =>
            p && typeof p === 'string' && (p.includes('cloudinary') || p.startsWith('/') || p.startsWith('uploads'))
          );
          
          // DO NOT overwrite profilePhotoUrl - keep using user.profile_photo
          // Profile photo is stored separately in the database
        }
      } catch {}
    }
    
    // Skip the old user_gallery_images table query since we only use Cloudinary now
    
    console.log('Gallery images for PDF:', userId, 'count:', gallery.length, 'images:', gallery);
    
    // Get documents - use the new documents table
    let docs = [];
    try { docs = db.prepare('SELECT * FROM documents WHERE user_id = ?').all(userId); } catch {}
    console.log('Documents for PDF:', userId, 'count:', docs.length);
    
    // Prepare filename - use customId as the main ID
    const customId = user.custom_id || '';
    const fullName = `${user.first_name}${user.last_name?.replace(/\s+/g, '') || ''}`;
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
    addWatermark(doc, WATERMARK_TEXT, 0.15);
    
    // Profile Photo - use Cloudinary URL
    const pBuf = await fetchImage(profilePhotoUrl);
    if (pBuf) { 
      try { doc.image(pBuf, 40, y, { width: 80, height: 80 }); } catch {} 
    }
    
    doc.fontSize(20).fillColor('#333').text(`${user.first_name} ${user.last_name}`.toUpperCase(), 130, y);
    doc.fontSize(10).fillColor('#666').text(`ID: ${displayId}`, 130, y + 22);
    doc.fillColor('#059669').text('✓ Verified', 130, y + 35);
    
    // Show subscription tier based on actual value
    const tier = user.subscription_tier || 'FREE';
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
      y = addField(doc, 'Email:', user.email || 'Not provided', 40, y);
      y = addField(doc, 'Phone:', user.phone || 'Not provided', 40, y);
    }
    y = addField(doc, 'DOB / Age:', `${formatDate(user.date_of_birth)} (${user.age} years)`, 40, y);
    
    y = addSectionHeader(doc, 'Location', y);
    y = addField(doc, 'City:', user.city, 40, y);
    y = addField(doc, 'State:', user.state, 40, y);
    y = addField(doc, 'Country:', user.country, 40, y);
    
    y = addSectionHeader(doc, 'Personal Details', y);
    y = addField(doc, 'Gender:', user.gender, 40, y);
    y = addField(doc, 'Marital Status:', user.marital_status, 40, y);
    y = addField(doc, 'Community:', user.community, 40, y);
    y = addField(doc, 'Sub Caste:', user.sub_caste || 'Not provided', 40, y);
    y = addField(doc, 'Height:', user.height || 'Not provided', 40, y);
    y = addField(doc, 'Weight:', user.weight || 'Not provided', 40, y);
    y = addField(doc, 'Complexion:', user.complexion || 'Not provided', 40, y);
    
    // ========== PAGE 2 ==========
    doc.addPage();
    pageNum++;
    
    y = addHeader(doc);
    addWatermark(doc, WATERMARK_TEXT, 0.12);
    
    y = addSectionHeader(doc, 'Professional Details', y);
    y = addField(doc, 'Education:', user.education || 'Not provided', 40, y);
    y = addField(doc, 'Profession:', user.profession || 'Not provided', 40, y);
    y = addField(doc, 'Income:', user.income || 'Not provided', 40, y);
    
    y = addSectionHeader(doc, 'Family Details', y);
    y = addField(doc, 'Father Name:', user.father_name || 'Not provided', 40, y);
    y = addField(doc, 'Father Occupation:', user.father_occupation || 'Not provided', 40, y);
    y = addField(doc, 'Mother Name:', user.mother_name || 'Not provided', 40, y);
    y = addField(doc, 'Mother Occupation:', user.mother_occupation || 'Not provided', 40, y);
    y = addField(doc, 'Family Values:', user.family_values || 'Not provided', 40, y);
    y = addField(doc, 'Family Type:', user.family_type || 'Not provided', 40, y);
    y = addField(doc, 'Family Status:', user.family_status || 'Not provided', 40, y);
    y = addField(doc, 'About Family:', user.about_family || 'Not provided', 40, y);
    
    y = addSectionHeader(doc, 'Horoscope Details', y);
    y = addField(doc, 'Raasi:', user.raasi || 'Not provided', 40, y);
    y = addField(doc, 'Natchathiram:', user.natchathiram || 'Not provided', 40, y);
    y = addField(doc, 'Dhosam:', user.dhosam || 'Not provided', 40, y);
    y = addField(doc, 'Birth Time:', user.birth_time || 'Not provided', 40, y);
    y = addField(doc, 'Birth Place:', user.birth_place || 'Not provided', 40, y);
    
    y = addSectionHeader(doc, 'About', y);
    doc.fontSize(10).fillColor('#444').text(user.bio || 'Not provided', 40, y, { width: 480 });
    
    // ========== GALLERY - ONE PHOTO PER PAGE ==========
    for (let i = 0; i < gallery.length; i++) {
      doc.addPage();
      pageNum++;
      
      y = addHeader(doc, `Gallery Photo ${i + 1} of ${gallery.length}`);
      
      const buf = await fetchImage(gallery[i]);
      if (buf) {
        try {
          const imgWidth = doc.page.width - 80;
          const imgHeight = doc.page.height - 110;
          doc.image(buf, 40, 70, { width: imgWidth, height: imgHeight });
          addWatermark(doc, WATERMARK_TEXT, 0.18);
        } catch (e) {
          doc.fontSize(12).fillColor('#666').text('Unable to display image', 40, 200);
        }
      } else {
        doc.fontSize(12).fillColor('#666').text('Image not found', 40, 200);
      }
      
      addWatermark(doc, WATERMARK_TEXT, 0.12);
    }
    
    // ========== DOCUMENTS - ONE PER PAGE ==========
    for (let i = 0; i < docs.length; i++) {
      doc.addPage();
      pageNum++;
      
      doc.fontSize(14).fillColor('#8B5CF6').text(`Document ${i + 1} of ${docs.length}`, 40, 30, { align: 'center' });
      addWatermark(doc, WATERMARK_TEXT, 0.12);
      
      y = 60;
      doc.fontSize(12).fillColor('#333').text(`Type: ${docs[i].document_type || 'N/A'}`, 40, y);
      doc.fontSize(12).fillColor('#333').text(`File Name: ${docs[i].file_name || 'N/A'}`, 40, y + 18);
      doc.fontSize(12).fillColor('#333').text(`Status: ${docs[i].status || 'N/A'}`, 40, y + 36);
      
      // Show document image if available
      if (docs[i].document_url) {
        const docBuf = await fetchImage(docs[i].document_url);
        if (docBuf) {
          try {
            y = 120;
            doc.image(docBuf, 40, y, { width: doc.page.width - 80, height: doc.page.height - 160 });
          } catch (e) {
            doc.fontSize(12).fillColor('#666').text('Unable to display document', 40, 150);
          }
        }
      }
    }
    
    doc.end();
    
    db.close();
    
    console.log(`Shared profile PDF generated for ${userId}, pages: ${pageNum}, sanitize: ${sanitize}`);
    
  } catch (error) {
    console.error('Shared profile PDF generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }
});

module.exports = router;
