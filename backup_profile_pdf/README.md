# Profile PDF Generation & Sharing - Backup Files

This folder contains all files related to profile PDF generation and sharing functionality.

## Files Included

### Backend Files
1. **generateSharedProfile.js** - Main PDF generator used for profile sharing
   - Generates professional PDF with all profile details
   - Handles sanitized mode (hidden sensitive info)
   - Uses PDFKit library
   
2. **profilePdf.js** - Alternative PDF generator
   - Profile photo on right side (X=440)
   - Different layout structure

3. **admin.js** - Email sending functionality
   - SMTP email sending with nodemailer
   - Handles email attachments

### Frontend Files
4. **ProfileShareModal.js** - Share modal component
   - Download PDF button
   - Email share button
   - WhatsApp share button
   - Sanitized mode toggle
   - Separate loading states for each button

5. **profilePDFGenerator.js** - Frontend PDF utility
   - Client-side PDF generation
   - Used as fallback if backend fails

## Features

### PDF Layout
- Header with "Vijayalakshmi Boyar Matrimony" branding
- Profile photo (70x70) on left
- Profile Name (X=130, Y=48)
- Profile ID (X=130, Y=70)
- Verification badge (X=130, Y=92)
- Subscription plan (X=130, Y=112)
- Contact Information section
- Personal Details section
- Professional Details section
- Family Details section (hidden in sanitize mode)
- Horoscope Details section
- Semi-transparent watermark

### Sharing Options
1. **Download PDF**: Direct download to device
2. **Email**: Send via SMTP with PDF attachment
3. **WhatsApp**: Opens WhatsApp Web with message + PDF link
4. **Sanitized Mode**: Hides Email, Phone, Family Details

### API Endpoints
- `GET /api/shared-profile/:userId` - Generate PDF
- `GET /api/shared-profile/:userId?sanitize=true` - Sanitized PDF
- `POST /api/admin/share-profile-email` - Send email with PDF

## Environment Variables
Add to backend/.env:
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
FROM_EMAIL=your-email@gmail.com
```

## Usage in Other Projects
1. Copy the relevant files to your project
2. Install dependencies: `npm install pdfkit nodemailer`
3. Configure SMTP in environment
4. Implement the API endpoints
5. Create share modal UI in frontend