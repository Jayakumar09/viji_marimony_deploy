/**
 * Profile PDF Generator Utility - Professional Layout
 * @version 4.0.1 - Fixed autoTable registration
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Sanitize user data
 */
export const sanitizeUserData = (userData) => {
  const sanitized = { ...userData };
  delete sanitized.phone;
  delete sanitized.email;
  delete sanitized.phoneNumber;
  delete sanitized.emailAddress;
  return sanitized;
};

/**
 * Generate dynamic filename
 */
export const generateDynamicFilename = (userData) => {
  const firstName = (userData.firstName || '').replace(/\s+/g, '');
  const lastName = (userData.lastName || '').replace(/\s+/g, '');
  const profileId = userData.id || userData.profileId || userData.profileID || '';
  const profileName = `${firstName}${lastName}`;
  
  if (profileId) {
    return `${profileName}${profileId}__Profile.pdf`;
  }
  return `${profileName || 'Profile'}__Profile.pdf`;
};

/**
 * Add diagonal watermark corner-to-corner from bottom-left to top-right of each page
 */
const addWatermark = (doc, text = 'Vijayalakshmi Boyar Matrimony') => {
  const pageCount = doc.internal.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.12 }));
    doc.setTextColor(139, 92, 246); // Purple
    doc.setFontSize(35);
    doc.setFont('helvetica', 'bold');
    
    // Draw multiple watermarks diagonally across the page
    // From bottom-left to top-right
    const spacing = 60;
    const numWatermarks = Math.ceil(pageHeight / spacing) + 2;
    
    for (let j = 0; j < numWatermarks; j++) {
      const x = -80 + (j * spacing);
      const y = pageHeight - (j * spacing * 0.7);
      
      if (y > -50 && y < pageHeight + 50) {
        doc.text(text, x, y, {
          angle: 35,
          align: 'left'
        });
      }
    }
    
    doc.restoreGraphicsState();
  }
};

/**
 * Add header
 */
const addHeader = (doc, userData) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header background
  doc.setFillColor(139, 92, 246);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Profile Details', 12, 14);
  
  // Subtitle
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Vijayalakshmi Boyar Matrimony', 12, 22);
  
  // Profile name
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Profile';
  doc.text(fullName, pageWidth - 12, 14, { align: 'right' });
  
  // Profile ID
  const profileId = userData.id || userData.profileId || userData.profileID || '';
  if (profileId) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`ID: ${profileId}`, pageWidth - 12, 21, { align: 'right' });
  }
  
  // Photo placeholder - Larger and more visible
  const photoX = pageWidth - 40;
  const photoY = 3;
  const photoSize = 32;
  
  // White background with border
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(photoX, photoY, photoSize, photoSize, 3, 3, 'F');
  
  // Border
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(1);
  doc.roundedRect(photoX, photoY, photoSize, photoSize, 3, 3, 'S');
  
  // Person silhouette - larger
  doc.setFillColor(220, 220, 220);
  doc.circle(photoX + photoSize/2, photoY + 11, 6, 'F'); // Head
  doc.circle(photoX + photoSize/2, photoY + 22, 8, 'F'); // Body
  
  // Label
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(6);
  doc.text('Photo', photoX + photoSize/2, photoY + photoSize - 2, { align: 'center' });
};

/**
 * Add section using autoTable
 */
const addSectionTable = (doc, title, data, startY) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Section title bar
  doc.setFillColor(139, 92, 246);
  doc.roundedRect(10, startY, pageWidth - 20, 6, 1, 1, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 13, startY + 4.5);
  
  // Create table data
  const tableData = Object.entries(data)
    .filter(([key, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [key, String(value)]);
  
  if (tableData.length === 0) return startY + 10;
  
  // Use autoTable directly
  autoTable(doc, {
    startY: startY + 8,
    head: [],
    body: tableData,
    theme: 'plain',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [50, 50, 50],
    },
    columnStyles: {
      0: { 
        fontStyle: 'bold', 
        textColor: [100, 100, 100],
        cellWidth: 40 
      },
      1: { 
        cellWidth: pageWidth - 60 
      }
    },
    margin: { left: 13, right: 13 },
    tableWidth: 'wrap',
  });
  
  return doc.lastAutoTable.finalY + 5;
};

/**
 * Add gallery with grid
 */
const addGallery = (doc, photos, startY) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  if (startY > pageHeight - 60) {
    doc.addPage();
    startY = 20;
  }
  
  // Title
  doc.setFillColor(139, 92, 246);
  doc.roundedRect(10, startY, pageWidth - 20, 6, 1, 1, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Photo Gallery', 13, startY + 4.5);
  
  const galleryY = startY + 10;
  const cols = 3;
  const rows = 2;
  const photoWidth = (pageWidth - 40) / cols;
  const photoHeight = 22;
  const gap = 4;
  
  const photosToShow = photos?.length > 0 ? photos.slice(0, cols * rows) : Array.from({ length: cols * rows }, (_, i) => i + 1);
  
  photosToShow.forEach((_, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    const x = 13 + (col * (photoWidth + gap));
    const y = galleryY + (row * (photoHeight + gap));
    
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(x, y, photoWidth, photoHeight, 2, 2, 'F');
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, photoWidth, photoHeight, 2, 2, 'S');
    
    doc.setFillColor(220, 220, 220);
    doc.rect(x + photoWidth/2 - 4, y + 5, 8, 6, 'F');
    doc.setFillColor(180, 180, 180);
    doc.triangle(x + photoWidth/2 - 5, y + 5, x + photoWidth/2, y + 2, x + photoWidth/2 + 5, y + 5, 'F');
    
    doc.setTextColor(160, 160, 160);
    doc.setFontSize(6);
    doc.text(`Photo ${index + 1}`, x + photoWidth/2, y + photoHeight - 3, { align: 'center' });
  });
  
  return galleryY + (rows * (photoHeight + gap)) + 5;
};

/**
 * Add footer
 */
const addFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    doc.setDrawColor(139, 92, 246);
    doc.setLineWidth(0.3);
    doc.line(13, pageHeight - 10, pageWidth - 13, pageHeight - 10);
    
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Generated by Vijayalakshmi Boyar Matrimony', 13, pageHeight - 5);
    
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
    
    const timestamp = new Date().toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(timestamp, pageWidth - 13, pageHeight - 5, { align: 'right' });
  }
};

/**
 * Generate profile PDF
 */
export const generateProfilePDF = (userData, isSanitized = false) => {
  const doc = new jsPDF();
  const data = isSanitized ? sanitizeUserData(userData) : userData;
  
  addHeader(doc, data);
  
  let y = 43;
  
  // Personal Information
  const personalInfo = {
    'Full Name': `${data.firstName || ''} ${data.lastName || ''}`.trim(),
    'Gender': data.gender,
    'Date of Birth': data.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString('en-IN') : (data.birthDate ? new Date(data.birthDate).toLocaleDateString('en-IN') : ''),
    'Age': data.age ? `${data.age} years` : '',
    'Blood Group': data.bloodGroup,
    'Marital Status': data.maritalStatus,
    'Religion': data.religion || data.community,
    'Sub Caste': data.subCaste || data.subcaste
  };
  y = addSectionTable(doc, 'Personal Information', personalInfo, y);
  
  // Contact Information
  if (!isSanitized) {
    const contactInfo = {
      'Email': data.email || data.emailAddress,
      'Phone': data.phone || data.phoneNumber,
      'Address': data.address,
      'City': data.city,
      'State': data.state,
      'Country': data.country || 'India',
      'Pincode': data.pincode
    };
    y = addSectionTable(doc, 'Contact Information', contactInfo, y);
  } else {
    const locationInfo = {
      'City': data.city,
      'State': data.state,
      'Country': data.country || 'India'
    };
    y = addSectionTable(doc, 'Location', locationInfo, y);
  }
  
  // Education & Career
  const educationInfo = {
    'Education': data.education,
    'Occupation': data.occupation || data.profession,
    'Company': data.company,
    'Annual Income': data.annualIncome || data.income,
    'Job Location': data.jobLocation,
    'Work Experience': data.workExperience ? `${data.workExperience} years` : ''
  };
  y = addSectionTable(doc, 'Education & Career', educationInfo, y);
  
  // Family Details
  const familyInfo = {
    'Father Name': data.fatherName,
    'Father Occupation': data.fatherOccupation,
    'Mother Name': data.motherName,
    'Mother Occupation': data.motherOccupation,
    'Brothers': data.brothers ? `${data.brothers} (Married: ${data.brothersMarried || 0})` : '',
    'Sisters': data.sisters ? `${data.sisters} (Married: ${data.sistersMarried || 0})` : '',
    'Family Type': data.familyType,
    'Family Status': data.familyStatus
  };
  y = addSectionTable(doc, 'Family Details', familyInfo, y);
  
  // Physical Details
  const physicalInfo = {
    'Height': data.height,
    'Weight': data.weight ? `${data.weight} kg` : '',
    'Complexion': data.complexion,
    'Body Type': data.bodyType,
    'Physical Disability': data.physicalDisability || 'None'
  };
  y = addSectionTable(doc, 'Physical Details', physicalInfo, y);
  
  // Horoscope Details
  const horoscopeInfo = {
    'Rashi': data.rashi || data.raasi,
    'Nakshatra': data.nakshatra || data.natchathiram,
    'Manglik': data.manglik || data.dhosam || 'No',
    'Birth Time': data.birthTime,
    'Birth Place': data.birthPlace,
    'Horoscope Match': data.horoscopeMatch || 'Not Required'
  };
  y = addSectionTable(doc, 'Horoscope Details', horoscopeInfo, y);
  
  // Partner Preferences
  const partnerInfo = {
    'Preferred Age': data.preferredAgeRange || data.preferredAge,
    'Preferred Height': data.preferredHeightRange || data.preferredHeight,
    'Preferred Education': data.preferredEducation,
    'Preferred Occupation': data.preferredOccupation,
    'Preferred Location': data.preferredLocation,
    'Preferred Religion': data.preferredReligion,
    'Preferred Marital Status': data.preferredMaritalStatus
  };
  y = addSectionTable(doc, 'Partner Preferences', partnerInfo, y);
  
  // About Me
  if (data.aboutMe || data.bio) {
    const aboutInfo = {
      'About Me': data.aboutMe || data.bio
    };
    y = addSectionTable(doc, 'About Me', aboutInfo, y);
  }
  
  // Photo Gallery
  const photos = data.photos || data.gallery || data.profilePhotos || [];
  y = addGallery(doc, photos, y);
  
  // Watermark and Footer
  addWatermark(doc);
  addFooter(doc);
  
  return doc;
};

/**
 * Download PDF
 */
export const downloadProfilePDF = (userData, isSanitized = false, filename = null) => {
  const doc = generateProfilePDF(userData, isSanitized);
  const dynamicFilename = filename || generateDynamicFilename(userData);
  doc.save(dynamicFilename);
};

/**
 * Get PDF blob
 */
export const getProfilePDFBlob = (userData, isSanitized = false) => {
  const doc = generateProfilePDF(userData, isSanitized);
  return doc.output('blob');
};

/**
 * Get PDF with filename
 */
export const getProfilePDFWithFilename = (userData, isSanitized = false) => {
  const doc = generateProfilePDF(userData, isSanitized);
  const filename = generateDynamicFilename(userData);
  return {
    blob: doc.output('blob'),
    filename
  };
};

/**
 * Share via WhatsApp
 */
export const shareViaWhatsApp = async (userData, isSanitized = false) => {
  try {
    const data = isSanitized ? sanitizeUserData(userData) : userData;
    const name = `${userData.firstName || 'Profile'}_${userData.lastName || ''}`.trim();
    
    let shareMessage = `📋 *${name}'s Profile*\n\n`;
    
    if (data.age) shareMessage += `👤 Age: ${data.age} years\n`;
    if (data.gender) shareMessage += `⚥ Gender: ${data.gender}\n`;
    if (data.height) shareMessage += `📏 Height: ${data.height}\n`;
    if (data.education) shareMessage += `🎓 Education: ${data.education}\n`;
    if (data.profession) shareMessage += `💼 Profession: ${data.profession}\n`;
    if (data.city || data.state) shareMessage += `📍 Location: ${[data.city, data.state].filter(Boolean).join(', ')}\n`;
    
    shareMessage += `\n✨ *Vijayalakshmi Boyar Matrimony*\n`;
    shareMessage += `View full profile in attached PDF.`;
    
    const { blob, filename } = getProfilePDFWithFilename(userData, isSanitized);
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    window.open(whatsappUrl, '_blank');
    
    return true;
  } catch (error) {
    console.error('Error sharing via WhatsApp:', error);
    throw error;
  }
};

export default {
  generateProfilePDF,
  downloadProfilePDF,
  getProfilePDFBlob,
  getProfilePDFWithFilename,
  sanitizeUserData,
  generateDynamicFilename,
  shareViaWhatsApp
};
