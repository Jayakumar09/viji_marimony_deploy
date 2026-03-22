/**
 * Profile PDF Generation Test File - Using Real Data from Backend Database
 * 
 * This generates a PDF with profile data from the main project's SQLite database
 * Run with: cd frontend && node test-profile-pdf.js
 * 
 * Features:
 * - Multi-column layout
 * - All profile sections
 * - Profile photo display
 * - Gallery photos
 * - Watermark
 * - Proper branding
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'backend', 'prisma', 'dev.db');
const db = new Database(dbPath);

// Helper function to fetch image from local backend uploads
async function fetchImage(imagePath) {
  try {
    if (!imagePath) return null;
    
    let fullPath;
    if (imagePath.startsWith('/')) {
      fullPath = path.join(__dirname, '..', 'backend', 'uploads', path.basename(imagePath));
    } else {
      fullPath = path.join(__dirname, '..', 'backend', 'uploads', path.basename(imagePath));
    }
    
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath);
    }
    console.log('Image not found:', fullPath);
    return null;
  } catch (error) {
    console.log('Failed to fetch image:', imagePath, error.message);
    return null;
  }
}

// Helper function to format field
const formatField = (doc, label, value, x, y, labelWidth = 130) => {
  if (!value && value !== 0) return y;
  
  doc.fontSize(10)
     .fillColor('#666666')
     .text(label, x, y, { width: labelWidth, continued: false });
  
  doc.fillColor('#1a1a1a')
     .text(String(value), x + labelWidth, y, { width: 220 });
  
  return y + 16;
};

function generateTestPDF() {
  console.log('Connecting to database...');
  
  // Fetch profile from database
  const profile = db.prepare('SELECT * FROM users WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1').get();
  
  if (!profile) {
    console.log('No profile found in database!');
    return;
  }
  
  console.log('Found profile:', profile.first_name, profile.last_name);
  
  // Map database fields to profile object
  const sampleProfile = {
    id: profile.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    fullName: `${profile.first_name} ${profile.last_name}`.trim(),
    gender: profile.gender,
    dateOfBirth: profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-IN') : '',
    age: profile.age,
    community: profile.community,
    subCaste: profile.sub_caste,
    city: profile.city,
    state: profile.state,
    country: profile.country,
    education: profile.education,
    profession: profile.profession,
    income: profile.income,
    maritalStatus: profile.marital_status,
    height: profile.height,
    weight: profile.weight,
    complexion: profile.complexion,
    profilePhoto: profile.profile_photo,
    photos: profile.photos,
    bio: profile.bio,
    familyValues: profile.family_values,
    aboutFamily: profile.about_family,
    raasi: profile.raasi,
    natchathiram: profile.natchathiram,
    dhosam: profile.dhosam,
    birthDate: profile.birth_date,
    birthTime: profile.birth_time,
    birthPlace: profile.birth_place,
    fatherName: profile.father_name,
    fatherOccupation: profile.father_occupation,
    motherName: profile.mother_name,
    motherOccupation: profile.mother_occupation,
    isVerified: profile.is_verified,
    isPremium: profile.is_premium
  };

  // Normalize photos
  if (sampleProfile.profilePhoto && !sampleProfile.profilePhoto.startsWith('http') && !sampleProfile.profilePhoto.startsWith('/')) {
    sampleProfile.profilePhoto = `/${sampleProfile.profilePhoto}`;
  }
  
  let photosArray = [];
  if (sampleProfile.photos) {
    try {
      photosArray = typeof sampleProfile.photos === 'string' 
        ? JSON.parse(sampleProfile.photos) 
        : sampleProfile.photos;
    } catch (e) {
      photosArray = [];
    }
  }
  if (Array.isArray(photosArray)) {
    sampleProfile.photos = photosArray.map(photo => {
      if (!photo) return null;
      if (!photo.startsWith('http') && !photo.startsWith('/')) {
        return `/${photo}`;
      }
      return photo;
    }).filter(Boolean);
  } else {
    sampleProfile.photos = [];
  }

  console.log('Generating PDF...');

  // Create PDF document
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    info: {
      Title: `${sampleProfile.firstName} Profile`,
      Author: 'Vijayalakshmi Boyar Matrimony',
      Subject: 'Matrimony Profile'
    }
  });

  // Output filename
  const fileName = `${sampleProfile.firstName}${sampleProfile.lastName.replace(/\s+/g, '')}${sampleProfile.id.slice(-6).toUpperCase()}__Profile.pdf`;
  const outputPath = path.join(__dirname, fileName);
  
  doc.pipe(fs.createWriteStream(outputPath));

  console.log('Generating PDF at:', outputPath);

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
  
  // Try to load profile photo
  const profilePhotoBuffer = fetchImage(sampleProfile.profilePhoto);
  
  if (profilePhotoBuffer) {
    try {
      doc.image(profilePhotoBuffer, photoX, photoY, {
        width: photoSize,
        height: photoSize,
        align: 'center',
        valign: 'center'
      });
    } catch (e) {
      // Draw placeholder
      doc.rect(photoX, photoY, photoSize, photoSize)
         .fillColor('#e5e7eb')
         .fill();
      doc.fontSize(40)
         .fillColor('#9ca3af')
         .text('📷', photoX + 35, photoY + 35);
    }
  } else {
    // Draw placeholder
    doc.rect(photoX, photoY, photoSize, photoSize)
       .fillColor('#e5e7eb')
       .fill();
    doc.fontSize(40)
       .fillColor('#9ca3af')
       .text('📷', photoX + 35, photoY + 35);
  }

  // ========== NAME & BASIC INFO ==========
  let yPos = 100;
  
  doc.fontSize(28)
     .fillColor('#1f2937')
     .text(sampleProfile.fullName.toUpperCase(), 40, yPos);
   
  yPos += 28;
  
  doc.fontSize(10)
     .fillColor('#6b7280')
     .text(`Profile ID: ${sampleProfile.id.slice(-6).toUpperCase()}`, 40, yPos);
   
  yPos += 16;

  // Verification badges
  let badgeX = 40;
  if (sampleProfile.isVerified) {
    doc.fontSize(9)
       .fillColor('#059669')
       .text('✓ Verified', badgeX, yPos);
    badgeX += 70;
  }
  if (sampleProfile.isPremium) {
    doc.fontSize(9)
       .fillColor('#fbbf24')
       .text('⭐ Premium', badgeX, yPos);
  }

  // ========== PERSONAL INFO ==========
  yPos += 28;
  
  doc.fontSize(14)
     .fillColor('#8B5CF6')
     .text('Personal Information', 40, yPos);
   
  doc.moveTo(40, yPos + 14)
     .lineTo(180, yPos + 14)
     .strokeColor('#8B5CF6')
     .lineWidth(2)
     .stroke();
   
  yPos = 205;
  
  yPos = formatField(doc, 'Full Name:', sampleProfile.fullName, 40, yPos);
  yPos = formatField(doc, 'Gender:', sampleProfile.gender, 40, yPos);
  yPos = formatField(doc, 'Age:', `${sampleProfile.age} years`, 40, yPos);
  yPos = formatField(doc, 'Date of Birth:', sampleProfile.dateOfBirth, 40, yPos);
  yPos = formatField(doc, 'Marital Status:', sampleProfile.maritalStatus, 40, yPos);
  yPos = formatField(doc, 'Height:', sampleProfile.height ? `${sampleProfile.height} cm` : 'Not specified', 280, yPos - 16);
  yPos = formatField(doc, 'Weight:', sampleProfile.weight ? `${sampleProfile.weight} kg` : 'Not specified', 280, yPos);
  yPos = formatField(doc, 'Complexion:', sampleProfile.complexion || 'Not specified', 40, yPos);

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
  yPos = formatField(doc, 'Community:', sampleProfile.community, 40, yPos);
  yPos = formatField(doc, 'Sub Caste:', sampleProfile.subCaste || 'Not specified', 280, yPos - 16);

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
  yPos = formatField(doc, 'City:', sampleProfile.city, 40, yPos);
  yPos = formatField(doc, 'State:', sampleProfile.state, 280, yPos - 16);
  yPos = formatField(doc, 'Country:', sampleProfile.country || 'India', 40, yPos);

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
  yPos = formatField(doc, 'Education:', sampleProfile.education || 'Not specified', 40, yPos);
  yPos = formatField(doc, 'Profession:', sampleProfile.profession || 'Not specified', 280, yPos - 16);
  yPos = formatField(doc, 'Annual Income:', sampleProfile.income || 'Not specified', 40, yPos);

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
  yPos = formatField(doc, 'Father Name:', sampleProfile.fatherName || 'Not specified', 40, yPos);
  yPos = formatField(doc, 'Father Occupation:', sampleProfile.fatherOccupation || 'Not specified', 280, yPos - 16);
  yPos = formatField(doc, 'Mother Name:', sampleProfile.motherName || 'Not specified', 40, yPos);
  yPos = formatField(doc, 'Mother Occupation:', sampleProfile.motherOccupation || 'Not specified', 280, yPos - 16);
  yPos = formatField(doc, 'Family Values:', sampleProfile.familyValues || 'Not specified', 40, yPos);

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
  yPos = formatField(doc, 'Raasi:', sampleProfile.raasi || 'Not specified', 40, yPos);
  yPos = formatField(doc, 'Nakshatra:', sampleProfile.natchathiram || 'Not specified', 280, yPos - 16);
  yPos = formatField(doc, 'Dhosam:', sampleProfile.dhosam || 'Not specified', 40, yPos);
  yPos = formatField(doc, 'Birth Time:', sampleProfile.birthTime || 'Not specified', 280, yPos - 16);
  yPos = formatField(doc, 'Birth Place:', sampleProfile.birthPlace || 'Not specified', 40, yPos);

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
   
  // Format bio text
  const bioText = sampleProfile.bio || 'Not provided';
  doc.fontSize(10)
     .fillColor('#4b5563')
     .text(bioText, 40, yPos, {
       width: 480,
       align: 'left'
     });

  // ========== GALLERY SECTION ==========
  if (sampleProfile.photos && sampleProfile.photos.length > 0) {
    yPos += 40;
    
    doc.fontSize(14)
       .fillColor('#8B5CF6')
       .text('Gallery', 40, yPos);
     
    doc.moveTo(40, yPos + 14)
       .lineTo(100, yPos + 14)
       .strokeColor('#8B5CF6')
       .lineWidth(2)
       .stroke();
     
    yPos += 30;
    
    const photoSize = 80;
    const photoGap = 15;
    let photoCol = 0;
    
    for (const photo of sampleProfile.photos.slice(0, 4)) {
      const photoBuffer = fetchImage(photo);
      const xPos = 40 + (photoCol * (photoSize + photoGap));
      
      if (photoBuffer) {
        try {
          doc.image(photoBuffer, xPos, yPos, {
            width: photoSize,
            height: photoSize,
            fit: [photoSize, photoSize]
          });
        } catch (e) {
          doc.rect(xPos, yPos, photoSize, photoSize)
             .fillColor('#e5e7eb')
             .fill();
        }
      } else {
        doc.rect(xPos, yPos, photoSize, photoSize)
           .fillColor('#e5e7eb')
           .fill();
      }
      
      photoCol++;
      if (photoCol >= 4) {
        photoCol = 0;
        yPos += photoSize + photoGap;
      }
    }
  }

  // ========== FOOTER ==========
  const footerY = doc.page.height - 50;
  doc.rect(15, footerY - 10, doc.page.width - 30, 35)
     .fillColor('#f3f4f6');
  
  doc.fontSize(9)
     .fillColor('#6b7280')
     .text('Generated by Vijayalakshmi Boyar Matrimony', 40, footerY, { align: 'center' });
  
  const dateStr = new Date().toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
  const timeStr = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  doc.text(`Page 1 of 1 | ${dateStr}, ${timeStr}`, 40, footerY + 12, { align: 'center' });

  // Finalize PDF
  doc.end();
  
  doc.on('finish', () => {
    console.log('PDF generated successfully!');
    console.log('Output file:', outputPath);
    console.log('Filename:', fileName);
    db.close();
  });
  
  doc.on('error', (err) => {
    console.error('PDF error:', err);
    db.close();
  });
}

generateTestPDF();
