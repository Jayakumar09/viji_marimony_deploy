/**
 * Test file for PDF Generator - Standalone version
 * Run this in browser console to test PDF generation
 */

// Test user data
const testUserData = {
  id: '12345',
  profileId: '12345',
  firstName: 'Jane',
  lastName: 'Doe',
  gender: 'Female',
  dateOfBirth: '1995-05-15',
  age: 29,
  bloodGroup: 'A+',
  maritalStatus: 'Unmarried',
  religion: 'Hindu',
  community: 'Boya',
  subCaste: 'Vijayalakshmi',
  email: 'jane.doe@email.com',
  phone: '+91 98765 43210',
  address: '123 Main Street',
  city: 'Coimbatore',
  state: 'Tamil Nadu',
  country: 'India',
  pincode: '641001',
  education: 'B.Tech Computer Science',
  occupation: 'Software Engineer',
  company: 'Tech Solutions',
  annualIncome: '₹12,00,000',
  fatherName: 'John Doe',
  fatherOccupation: 'Business',
  motherName: 'Mary Doe',
  motherOccupation: 'Housewife',
  brothers: 1,
  sisters: 1,
  familyType: 'Nuclear',
  familyStatus: 'Middle Class',
  height: '5\'6"',
  weight: '58 kg',
  complexion: 'Fair',
  bodyType: 'Slim',
  rashi: 'Vrishabha',
  nakshatra: 'Rohini',
  manglik: 'No',
  birthTime: '10:30 AM',
  birthPlace: 'Coimbatore',
  preferredAgeRange: '28-35',
  preferredHeightRange: '5\'8" - 6\'0"',
  preferredEducation: 'B.Tech',
  preferredOccupation: 'Engineer',
  preferredLocation: 'Tamil Nadu',
  aboutMe: 'I am a software engineer who loves traveling and cooking.',
  photos: []
};

// Dynamic filename generation
const generateDynamicFilename = (userData) => {
  const firstName = (userData.firstName || '').replace(/\s+/g, '');
  const lastName = (userData.lastName || '').replace(/\s+/g, '');
  const profileId = userData.id || userData.profileId || '';
  return `${firstName}${lastName}${profileId}__Profile.pdf`;
};

// Test function to run in browser
window.testPDFGeneration = async () => {
  try {
    // Dynamic import jsPDF and jspdf-autotable
    const [{ default: jsPDF }, jspdfAutoTable] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);
    
    // Register autotable plugin
    jsPDF.API.autoTable = jspdfAutoTable.default;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const data = testUserData;
    
    // Header
    doc.setFillColor(139, 92, 246);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Profile Details', 12, 14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Vijayalakshmi Boyar Matrimony', 12, 22);
    doc.setFontSize(14);
    doc.text(`${data.firstName} ${data.lastName}`, pageWidth - 12, 14, { align: 'right' });
    doc.setFontSize(8);
    doc.text(`ID: ${data.id}`, pageWidth - 12, 21, { align: 'right' });
    
    let y = 43;
    
    // Personal Information Table
    doc.setFillColor(139, 92, 246);
    doc.roundedRect(10, y, pageWidth - 20, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Personal Information', 13, y + 4.5);
    
    doc.autoTable({
      startY: y + 8,
      head: [],
      body: [
        ['Full Name', `${data.firstName} ${data.lastName}`],
        ['Gender', data.gender],
        ['Date of Birth', new Date(data.dateOfBirth).toLocaleDateString('en-IN')],
        ['Age', `${data.age} years`],
        ['Blood Group', data.bloodGroup],
        ['Marital Status', data.maritalStatus],
        ['Religion', data.religion],
        ['Sub Caste', data.subCaste]
      ],
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [100, 100, 100], cellWidth: 40 },
        1: { cellWidth: pageWidth - 60 }
      },
      margin: { left: 13, right: 13 }
    });
    
    y = doc.lastAutoTable.finalY + 10;
    
    // Education & Career Table
    doc.setFillColor(139, 92, 246);
    doc.roundedRect(10, y, pageWidth - 20, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('Education & Career', 13, y + 4.5);
    
    doc.autoTable({
      startY: y + 8,
      head: [],
      body: [
        ['Education', data.education],
        ['Occupation', data.occupation],
        ['Company', data.company],
        ['Annual Income', data.annualIncome]
      ],
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [100, 100, 100], cellWidth: 40 },
        1: { cellWidth: pageWidth - 60 }
      },
      margin: { left: 13, right: 13 }
    });
    
    y = doc.lastAutoTable.finalY + 10;
    
    // Family Details Table
    doc.setFillColor(139, 92, 246);
    doc.roundedRect(10, y, pageWidth - 20, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('Family Details', 13, y + 4.5);
    
    doc.autoTable({
      startY: y + 8,
      head: [],
      body: [
        ['Father Name', data.fatherName],
        ['Father Occupation', data.fatherOccupation],
        ['Mother Name', data.motherName],
        ['Mother Occupation', data.motherOccupation],
        ['Family Type', data.familyType],
        ['Family Status', data.familyStatus]
      ],
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [100, 100, 100], cellWidth: 40 },
        1: { cellWidth: pageWidth - 60 }
      },
      margin: { left: 13, right: 13 }
    });
    
    y = doc.lastAutoTable.finalY + 10;
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.getHeight();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(139, 92, 246);
      doc.setLineWidth(0.3);
      doc.line(13, pageHeight - 10, pageWidth - 13, pageHeight - 10);
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(7);
      doc.text('Generated by Vijayalakshmi Boyar Matrimony', 13, pageHeight - 5);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
      doc.text(new Date().toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), pageWidth - 13, pageHeight - 5, { align: 'right' });
    }
    
    // Save
    const filename = generateDynamicFilename(testUserData);
    doc.save(filename);
    
    console.log('PDF Generated Successfully:', filename);
    alert('PDF Generated: ' + filename);
    return filename;
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Error: ' + error.message);
    throw error;
  }
};

// Run test
console.log('PDF Test file loaded. Run: window.testPDFGeneration()');
