/**
 * Admin Profile PDF Generation with Watermark
 * Run with: cd frontend && node test-admin-profile-pdf-watermark.js
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'backend', 'prisma', 'dev.db');
const db = new Database(dbPath);

const USER_ID = 'cmldjmdfv0000xmu9tn15fvfy';

// Watermark text configuration
const WATERMARK_TEXT = 'Vijayalakshmi Boyar Matrimony';

// Font configuration - Helvetica is similar to Arial
const WATERMARK_FONT = 'Helvetica';
const WATERMARK_FONT_BOLD = 'Helvetica-Bold';

async function fetchImage(imagePath) {
  try {
    if (!imagePath || imagePath === 'null') return null;
    let filename = imagePath.split('/').pop().split('\\').pop();
    const paths = [
      path.join(__dirname, '..', 'backend', 'uploads', filename),
      path.join(__dirname, '..', 'backend', 'uploads', 'user_' + filename)
    ];
    for (const fullPath of paths) {
      if (fs.existsSync(fullPath)) return fs.readFileSync(fullPath);
    }
    return null;
  } catch { return null; }
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
  // Purple banner rectangle
  doc.fillColor('#8B5CF6').rect(0, 0, doc.page.width, 50).fill();
  // White text
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

/**
 * Add diagonal tile pattern watermark to the current page
 * Multiple lines of text placed diagonally at 45 degrees in a repeating pattern
 * @param {Object} doc - PDFDocument instance
 * @param {string} text - Watermark text
 * @param {number} opacity - Opacity level (0-1)
 */
function addWatermark(doc, text = WATERMARK_TEXT, opacity = 0.5) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  
  // Save current state
  doc.save();
  
  // Watermark configuration - diagonal tile pattern at 45 degrees
  const fontSize = 20;
  const angle = -45; // 45 degrees diagonal
  const spacingX = 200; // Horizontal spacing between text
  const spacingY = 200; // Vertical spacing between text rows
  
  // Set watermark properties - dark green color for better visibility
  doc.fillColor('#632704').opacity(opacity).font(WATERMARK_FONT).fontSize(fontSize);
  
  // Calculate diagonal offset for covering the rotated area
  const diagonal = Math.sqrt(pageWidth * pageWidth + pageHeight * pageHeight);
  
  // Create multiple rows of diagonal watermarks
  for (let row = -3; row < 10; row++) {
    const yOffset = row * spacingY;
    for (let col = -3; col < 12; col++) {
      const xOffset = col * spacingX + (row % 2) * (spacingX / 2); // Offset alternate rows
      
      doc.save();
      doc.translate(xOffset, yOffset);
      doc.rotate(angle);
      doc.text(text, 0, 0, { align: 'center', lineBreak: false });
      doc.restore();
    }
  }
  
  // Restore state
  doc.restore();
  doc.opacity(1);
}

/**
 * Add watermark with image parameters
 * This function adds watermark with custom image-like parameters
 * @param {Object} doc - PDFDocument instance
 * @param {Object} options - Watermark options
 */
function addWatermarkWithOptions(doc, options = {}) {
  const {
    text = WATERMARK_TEXT,
    fontSize = 45,
    color = '#047857',
    opacity = 0.12,
    angle = -45,
    x = null,
    y = null,
    width = null,
    height = null,
    align = 'center'
  } = options;
  
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  
  // Save current state
  doc.save();
  
  // Set watermark properties
  doc.fillColor(color)
     .opacity(opacity)
     .font(WATERMARK_FONT)
     .fontSize(fontSize);
  
  // Calculate text width
  const textWidth = doc.widthOfString(text);
  const textHeight = fontSize; // Approximate height
  
  // Calculate position
  const posX = x !== null ? x : (pageWidth - (width || textWidth)) / 2;
  const posY = y !== null ? y : (pageHeight - (height || textHeight)) / 2;
  
  // Add rotated watermark
  const angleRad = angle * (Math.PI / 180);
  doc.translate(posX + (width || textWidth) / 2, posY + (height || textHeight) / 2);
  doc.rotate(angle);
  doc.text(text, -(width || textWidth) / 2, -(height || textHeight) / 2, {
    width: width || textWidth,
    height: height || textHeight,
    align: align,
    lineBreak: false
  });
  
  // Restore state
  doc.restore();
  doc.opacity(1);
}

/**
 * Add multiple watermarks in a grid pattern
 * @param {Object} doc - PDFDocument instance
 * @param {number} rows - Number of rows
 * @param {number} cols - Number of columns
 */
function addGridWatermarks(doc, rows = 3, cols = 2) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  
  const cellWidth = pageWidth / cols;
  const cellHeight = pageHeight / rows;
  
  doc.save();
  doc.fillColor('#047857').opacity(0.08).font(WATERMARK_FONT).fontSize(30);
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cellWidth + cellWidth / 2;
      const y = row * cellHeight + cellHeight / 2;
      
      doc.translate(x, y);
      doc.rotate(-30);
      doc.text(WATERMARK_TEXT, -80, -10, { width: 160, align: 'center' });
      doc.rotate(30);
      doc.translate(-x, -y);
    }
  }
  
  doc.restore();
  doc.opacity(1);
}

/**
 * Add watermark to a specific image area (like image parameters)
 * @param {Object} doc - PDFDocument instance
 * @param {number} imageX - X position of image
 * @param {number} imageY - Y position of image
 * @param {number} imageWidth - Width of image area
 * @param {number} imageHeight - Height of image area
 */
function addWatermarkToImageArea(doc, imageX, imageY, imageWidth, imageHeight) {
  const text = WATERMARK_TEXT;
  
  doc.save();
  doc.fillColor('#047857').opacity(0.2).font(WATERMARK_FONT).fontSize(20);
  
  // Add watermark in the center of image area
  const centerX = imageX + imageWidth / 2;
  const centerY = imageY + imageHeight / 2;
  
  doc.translate(centerX, centerY);
  doc.rotate(-15);
  doc.text(text, -50, -5, { width: 100, align: 'center' });
  
  doc.restore();
  doc.opacity(1);
}

async function generatePDF() {
  console.log('Fetching profile...');
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(USER_ID);
  if (!user) { console.error('User not found'); return; }
  
  console.log('Profile:', user.first_name, user.last_name);
  
  // Get gallery
  let gallery = [];
  try { gallery = db.prepare('SELECT image_url FROM user_gallery_images WHERE user_id = ?').all(USER_ID).map(r => r.image_url); } catch {}
  if (gallery.length === 0 && user.photos) { try { gallery = JSON.parse(user.photos); } catch {} }
  console.log('Gallery:', gallery.length);
  
  // Get documents
  let docs = [];
  try { docs = db.prepare('SELECT * FROM user_documents WHERE user_id = ?').all(USER_ID); } catch {}
  console.log('Documents:', docs.length);
  
  // Use simpler page settings
  const doc = new PDFDocument();
  const fileName = `${user.first_name}${user.last_name.replace(/\s+/g, '')}_Watermarked__Profile.pdf`;
  doc.pipe(fs.createWriteStream(path.join(__dirname, fileName)));
  
  let pageNum = 1;
  
  // ========== PAGE 1 ==========
  y = addHeader(doc, 'User Profile Details');
  
  // Add watermark to first page
  addWatermark(doc, WATERMARK_TEXT, 0.15);
  
  // Profile Photo
  const pBuf = await fetchImage(user.profile_photo);
  if (pBuf) { 
    try { 
      doc.image(pBuf, 40, y, { width: 80, height: 80 }); 
    } catch {} 
  }
  
  doc.fontSize(20).fillColor('#333').text(`${user.first_name} ${user.last_name}`.toUpperCase(), 130, y);
  doc.fontSize(10).fillColor('#666').text(`ID: ${user.id?.slice(-8)}`, 130, y + 22);
  doc.fillColor('#059669').text('✓ Verified', 130, y + 35);
  doc.fillColor('#d97706').text('★ Premium', 130, y + 48);
  
  y = 200;
  y = addSectionHeader(doc, 'Contact Information', y);
  y = addField(doc, 'Email:', user.email, 40, y);
  y = addField(doc, 'Phone:', user.phone || 'Not provided', 40, y);
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
  
  // Add watermark to second page
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
  
  // ========== DOCUMENTS - ONE PER PAGE ==========
  for (let i = 0; i < docs.length; i++) {
    doc.addPage();
    pageNum++;
    
    doc.fontSize(14).fillColor('#8B5CF6').text(`Document ${i + 1} of ${docs.length}`, 40, 30, { align: 'center' });
    
    // Add watermark to document pages
    addWatermark(doc, WATERMARK_TEXT, 0.12);
    
    y = 60;
    doc.fontSize(12).fillColor('#333').text(`Type: ${docs[i].document_type || 'N/A'}`, 40, y);
    doc.fontSize(12).fillColor('#333').text(`Number: ${docs[i].document_number || 'N/A'}`, 40, y + 18);
    if (docs[i].is_verified) {
      doc.fontSize(12).fillColor('#059669').text('✓ Verified', 40, y + 36);
    }
  }
  
  doc.end();
  doc.on('finish', () => { 
    console.log('PDF generated with watermark! Total pages:', pageNum); 
    console.log('Watermark text:', WATERMARK_TEXT);
    db.close(); 
  });
}

generatePDF();
