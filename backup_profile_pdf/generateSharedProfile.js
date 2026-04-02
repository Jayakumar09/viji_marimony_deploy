/**
 * Generate Shared Profile PDF
 * Uses Prisma to fetch from PostgreSQL database
 * 
 * Web Link Format:
 * - Full Profile: /api/shared-profile/:userId
 * - Sanitized: /api/shared-profile/:userId?sanitize=true
 * - Page Info: /api/shared-profile/:userId/pages (GET)
 */

const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const path = require('path');
const axios = require('axios');
const { prisma } = require('../utils/database');

const WATERMARK_TEXT = 'Vijayalakshmi Boyar Matrimony';

async function fetchImage(imagePath) {
  try {
    if (!imagePath || imagePath === 'null' || imagePath === 'undefined') return null;
    
    if (imagePath.includes('cloudinary')) {
      const publicId = extractCloudinaryPublicId(imagePath);
      if (publicId) {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'do6o1xqs1';
        const optimizedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/c_pad,w_500,h_500,b_white,q_70,f_jpg/${publicId}.jpg`;
        const response = await axios.get(optimizedUrl, { 
          responseType: 'arraybuffer',
          maxContentLength: 600 * 1024,
          timeout: 10000
        });
        return Buffer.from(response.data);
      }
    }
    
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      const response = await axios.get(imagePath, { 
        responseType: 'arraybuffer',
        maxContentLength: 600 * 1024,
        timeout: 10000
      });
      return Buffer.from(response.data);
    }
    
    return null;
  } catch (e) {
    console.log('Error loading image:', e.message);
    return null;
  }
}

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

function addSectionHeader(doc, title, y) {
  doc.fontSize(12).fillColor('#8B5CF6').text(title, 40, y);
  return y + 14;
}

function addHeader(doc, subtitle = '') {
  doc.fillColor('#8B5CF6').rect(0, 0, doc.page.width, 40).fill();
  doc.fillColor('#FFFFFF').fontSize(16).text(WATERMARK_TEXT, 0, 12, { align: 'center', width: doc.page.width });
  if (subtitle) {
    doc.fontSize(9).text(subtitle, 0, 28, { align: 'center', width: doc.page.width });
  }
  return 48;
}

function addField(doc, label, value, x, y, w = 120) {
  if (!value || value === 'Not provided') return y;
  doc.fontSize(9).fillColor('#64748b').text(label, x, y, { width: w });
  doc.fillColor('#1e293b').text(String(value), x + w, y, { width: 230 });
  return y + 16;
}

function addWatermark(doc, text = WATERMARK_TEXT, opacity = 0.20) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  
  doc.save();
  
  const fontSize = 25;
  const angle = -45;
  const spacingX = 300;
  const spacingY = 300;
  
  doc.fillColor('#8B5CF6').opacity(opacity).font('Helvetica').fontSize(fontSize);
  
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
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    if (!user.isActive) {
      return res.status(404).json({ error: 'Profile not available' });
    }
    
    let galleryCount = 0;
    if (user.photos) {
      try {
        const photos = JSON.parse(user.photos);
        if (Array.isArray(photos)) {
          galleryCount = photos.filter(p => p && typeof p === 'string').length;
        }
      } catch {}
    }
    
    const docsCount = 
      await prisma.userDocument.count({ where: { userId: userId } }) +
      await prisma.document.count({ where: { userId: userId } });
    
    const profilePages = 1;
    const galleryPages = galleryCount;
    const documentPages = docsCount;
    const totalPages = profilePages + galleryPages + documentPages;
    
    res.json({
      userId: userId,
      userName: `${user.firstName} ${user.lastName}`.trim(),
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
 * Layout matches sample: Two-page format
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const sanitize = req.query.sanitize === 'true';
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    if (!user.isActive) {
      return res.status(404).json({ error: 'Profile not available' });
    }
    
    let profilePhotoUrl = user.profilePhoto;
    let gallery = [];
    if (user.photos) {
      try {
        const parsedPhotos = JSON.parse(user.photos);
        if (Array.isArray(parsedPhotos)) {
          gallery = parsedPhotos.filter(p => p && typeof p === 'string');
        }
      } catch {}
    }
    
    const docs1 = await prisma.userDocument.findMany({
      where: { userId: userId }
    });
    
    const docs2 = await prisma.document.findMany({
      where: { userId: userId }
    });
    
    const docs = [
      ...docs1.map(d => ({ 
        documentType: d.documentType, 
        documentNumber: d.documentNumber, 
        isVerified: d.isVerified, 
        documentUrl: d.documentUrl 
      })),
      ...docs2.map(d => ({ 
        documentType: d.documentType, 
        documentNumber: null, 
        isVerified: d.status === 'APPROVED', 
        documentUrl: d.documentUrl 
      }))
    ];
    
    const customId = user.customId || '';
    const displayId = customId || user.id.slice(-8).toUpperCase();
    const fileName = `${displayId}_Profile.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=${fileName}`);
    
    const doc = new PDFDocument();
    doc.pipe(res);
    
    let y = 0;
    let pageNum = 1;
    
    y = addHeader(doc, 'User Profile Details');
    
    const pBuf = await fetchImage(profilePhotoUrl);
    if (pBuf) { 
      try { doc.image(pBuf, 40, y, { width: 70, height: 70 }); } catch {} 
    }
    
    // Profile name and ID at new positions
    doc.fontSize(18).fillColor('#333').text(`${user.firstName} ${user.lastName}`.toUpperCase(), 130, 48);
    doc.fontSize(9).fillColor('#666').text(`ID: ${displayId}`, 130, 70);
    // Line 3: Verification status
    if (user.isVerified) {
      doc.fontSize(9).fillColor('#059669').text('✓ Verified', 130, 92);
    }
    // Line 4: Subscription plan (to be added below)

    const subscription = await prisma.subscription.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' }
    });
    const tier = subscription?.plan || 'FREE';
    if (tier !== 'FREE') {
      const tierLabel = tier === 'PREMIUM' ? '★ Premium' : tier === 'PRO' ? '★ Pro' : tier === 'BASIC' ? '★ Basic' : `★ ${tier}`;
      doc.fontSize(9).fillColor('#d97706').text(tierLabel, 130, 112);
    }
    
    y = y + 100;
    y = addSectionHeader(doc, 'Contact Information', y);
    if (sanitize) {
      y = addField(doc, 'Email:', 'Hidden for privacy', 40, y);
      y = addField(doc, 'Phone:', 'Hidden for privacy', 40, y);
    } else {
      y = addField(doc, 'Email:', user.email || 'Not provided', 40, y);
      y = addField(doc, 'Phone:', user.phone || 'Not provided', 40, y);
    }
    y = addField(doc, 'Age:', `${user.age || 'N/A'} years`, 40, y);
    y = addField(doc, 'City:', user.city || 'Not provided', 40, y);
    y = addField(doc, 'State:', user.state || 'Not provided', 40, y);
    y = addField(doc, 'Country:', user.country || 'Not provided', 40, y);
    
    y = addSectionHeader(doc, 'Personal Details', y);
    y = addField(doc, 'Gender:', user.gender || 'Not provided', 40, y);
    y = addField(doc, 'Marital Status:', user.maritalStatus || 'Not provided', 40, y);
    y = addField(doc, 'Community:', user.community || 'Not provided', 40, y);
    y = addField(doc, 'Sub Caste:', user.subCaste || 'Not provided', 40, y);
    y = addField(doc, 'Height:', user.height || 'Not provided', 40, y);
    y = addField(doc, 'Weight:', user.weight || 'Not provided', 40, y);
    y = addField(doc, 'Complexion:', user.complexion || 'Not provided', 40, y);
    
    y = addSectionHeader(doc, 'Professional Details', y);
    y = addField(doc, 'Education:', user.education || 'Not provided', 40, y);
    y = addField(doc, 'Profession:', user.profession || 'Not provided', 40, y);
    y = addField(doc, 'Income:', user.income || 'Not provided', 40, y);
    
    // Family Details - hide in sanitized version
    if (!sanitize) {
      y = addSectionHeader(doc, 'Family Details', y);
      y = addField(doc, 'Father Name:', user.fatherName || 'Not provided', 40, y);
      y = addField(doc, 'Father Occupation:', user.fatherOccupation || 'Not provided', 40, y);
      y = addField(doc, 'Mother Name:', user.motherName || 'Not provided', 40, y);
      y = addField(doc, 'Mother Occupation:', user.motherOccupation || 'Not provided', 40, y);
      y = addField(doc, 'Family Values:', user.familyValues || 'Not provided', 40, y);
      y = addField(doc, 'Family Type:', user.familyType || 'Not provided', 40, y);
      y = addField(doc, 'Family Status:', user.familyStatus || 'Not provided', 40, y);
      y = addField(doc, 'About Family:', user.aboutFamily || 'Not provided', 40, y);
    }
    
    y = addSectionHeader(doc, 'Horoscope Details', y);
    y = addField(doc, 'Raasi:', user.raasi || 'Not provided', 40, y);
    y = addField(doc, 'Natchathiram:', user.natchathiram || 'Not provided', 40, y);
    y = addField(doc, 'Dhosam:', user.dhosam || 'Not provided', 40, y);
    y = addField(doc, 'Birth Time:', user.birthTime || 'Not provided', 40, y);
    y = addField(doc, 'Birth Place:', user.birthPlace || 'Not provided', 40, y);
    
    y = addSectionHeader(doc, 'About', y);
    const aboutText = user.bio || 'Not provided';
    const maxBioHeight = 60;
    doc.fontSize(9).fillColor('#444').text(aboutText, 40, y, { width: 500, height: maxBioHeight });
    
    addWatermark(doc, WATERMARK_TEXT, 0.20);
    
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
          addWatermark(doc, WATERMARK_TEXT, 0.2);
        } catch (e) {
          doc.fontSize(12).fillColor('#666').text('Unable to display image', 40, 200);
        }
      } else {
        doc.fontSize(12).fillColor('#666').text('Image not found', 40, 200);
      }
    }
    
    for (let i = 0; i < docs.length; i++) {
      doc.addPage();
      pageNum++;
      
      doc.fillColor('#8B5CF6').rect(30, 20, doc.page.width - 60, 35).fill();
      doc.fillColor('#FFFFFF').fontSize(14).text(`Document ${i + 1} of ${docs.length}`, 40, 30, { align: 'center' });
      
      y = 70;
      const docType = docs[i].documentType || 'N/A';
      const docTypeLabel = docType === 'GOVERNMENT_ID' ? 'Government ID (Aadhaar / PAN / Passport / Driving License)' :
                           docType === 'PHOTO_ID' ? 'Selfie / Live Photo Verification' :
                           docType === 'AGE_PROOF' ? 'Age Proof (Birth Certificate / 10th / 12th Certificate / Passport / Aadhaar)' :
                           docType === 'EDUCATION_CERTIFICATE' ? 'Education Certificate (Degree / Diploma / School Certificate)' :
                           docType === 'EMPLOYMENT_PROOF' ? 'Employment Proof (Offer Letter / Company ID / Experience Letter)' :
                           docType === 'FINANCIAL_PROOF' ? 'Financial Verification (Salary Slip / ITR / Bank Statement)' :
                           docType === 'MARITAL_STATUS_PROOF' ? 'Marital Status Proof (Divorce Decree / Death Certificate)' :
                           docType === 'CASTE_CERTIFICATE' ? 'Caste Certificate (Optional)' :
                           docType === 'OTHER' ? 'Other Supporting Documents' : docType;
      
      doc.fontSize(12).fillColor('#333').text(`Type: ${docTypeLabel}`, 40, y);
      const fileName = docs[i].fileName || docs[i].documentUrl?.split('/').pop() || 'N/A';
      doc.fontSize(12).fillColor('#333').text(`File Name: ${fileName}`, 40, y + 18);
      if (docs[i].isVerified) {
        doc.fontSize(12).fillColor('#059669').text('✓ Verified', 40, y + 36);
      }
      
      if (docs[i].documentUrl) {
        const docBuf = await fetchImage(docs[i].documentUrl);
        if (docBuf) {
          try {
            y = 120;
            doc.image(docBuf, 40, y, { width: doc.page.width - 80, height: doc.page.height - 160 });
          } catch (e) {
            doc.fontSize(12).fillColor('#666').text('Unable to display document', 40, 150);
          }
        }
      }
      
      addWatermark(doc, WATERMARK_TEXT, 0.2);
    }
    
    doc.end();
    
    console.log(`Shared profile PDF generated for ${userId}, pages: ${pageNum}, sanitize: ${sanitize}`);
    
  } catch (error) {
    console.error('Shared profile PDF generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }
});

/**
 * POST /api/shared-profile/:userId/cloud-upload
 * Generate PDF on server, upload to Cloudinary, return shareable URL
 */
router.post('/:userId/cloud-upload', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name } = req.body;
    
    const { isCloudinaryConfigured, uploadBuffer } = require('../utils/upload');
    
    if (!isCloudinaryConfigured()) {
      return res.status(500).json({ error: 'Cloudinary not configured' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    if (!user.isActive) {
      return res.status(404).json({ error: 'Profile not available' });
    }
    
    let profilePhoto = null;
    if (user.profilePhoto) {
      profilePhoto = await fetchImage(user.profilePhoto);
    }
    
    const galleryImages = [];
    if (user.photos) {
      try {
        const photos = JSON.parse(user.photos);
        for (const photo of photos.slice(0, 5)) {
          if (photo && typeof photo === 'string') {
            const img = await fetchImage(photo);
            if (img) galleryImages.push(img);
          }
        }
      } catch {}
    }
    
    const documents = await prisma.userDocument.findMany({
      where: { userId: userId },
      take: 3
    });
    
    const docImages = [];
    for (const doc of documents) {
      if (doc.fileUrl) {
        const docImg = await fetchImage(doc.fileUrl);
        if (docImg) docImages.push(docImg);
      }
    }
    
    const customId = user.customId || '';
    const displayId = customId || user.id.slice(-8).toUpperCase();
    const fileName = name ? `${name.replace(/\s+/g, '_')}_Profile` : `Profile_${displayId}`;
    const timestamp = Date.now();
    
    const pdfBuffer = await generatePDFBuffer(user, profilePhoto, galleryImages, docImages, WATERMARK_TEXT);
    
    const uploadResult = await uploadBuffer(pdfBuffer, {
      folder: 'matrimony-profiles',
      publicId: `${fileName}_${timestamp}`,
      resource_type: 'raw',
      format: 'pdf'
    });
    
    res.json({
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      format: 'pdf',
      message: 'PDF uploaded. Use URL to share via WhatsApp.'
    });
    
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ error: 'Failed to upload PDF: ' + error.message });
  }
});

module.exports = router;
