# Vijayalakshmi Boyar Matrimony App

A community-focused matrimony platform for the Boyar community.

## 📋 Project Status (As of April 7, 2026)

### 🚀 Live Deployment
- **Frontend**: https://vijayalakshmiboyarmatrimony.com (Cloudflare Pages)
- **Backend API**: https://viji-marimony-deploy-backend.onrender.com (Render)
- **Database**: AWS RDS PostgreSQL (Production)
- **Cloudinary**: Configured and working
- **Google Drive**: Configured and working (backups operational)

### ✅ Current System Status
- **Total Users**: 3 (Active)
- **Admin Dashboard**: Working correctly
- **User Management**: Displaying users successfully
- **Auto-Deploy**: GitHub Actions connected
- **Database Backup**: ✅ WORKING - Manual and scheduled backups to Google Drive successful

### 📊 Active Features
- User Registration & Authentication (JWT)
- Profile Management with photo upload
- Gallery (up to 9 images per user)
- Email & Phone OTP Verification
- Admin Photo Verification System
- Subscription Plans (Free/Basic/Premium)
- Chat System (User-Admin real-time)
- Payment Processing (UPI/Manual)
- Profile PDF Generation
- Shared Profile Links
- **Database Backup System** (NEW!)

### 🔧 Auto-Deployment Status
- **Backend**: Auto-deploys to Render on every push to master
- **Frontend**: Auto-deploys to Cloudflare Pages on every push to master
- Both deployments triggered by GitHub Actions

## 📋 Project Structure

```
├── backend/
│   ├── controllers/      # Business logic
│   ├── routes/           # API endpoints
│   ├── middleware/        # Auth, validation
│   ├── services/          # External services (Google Drive, backup scheduler)
│   ├── modules/           # Reusable modules (Activity Logs)
│   ├── utils/             # Helpers (image upload, JWT, DB, OTP)
│   ├── prisma/            # Database schema & seeds
│   └── server.js          # Main server file
├── frontend/
│   ├── src/
│   │   ├── pages/         # Page components (Login, Profile, etc)
│   │   ├── components/     # Reusable components
│   │   ├── services/       # API calls
│   │   ├── contexts/       # React Context (Auth)
│   │   ├── hooks/          # Custom hooks (useAuth)
│   │   ├── data/           # Static data (Indian locations, Horoscope)
│   │   ├── admin/          # Admin panel components
│   │   └── utils/          # Helpers (image compression)
│   └── public/             # Static assets
├── database/               # Database setup docs
├── PROFILE_UPDATES.md      # Profile features documentation
└── README.md                # This file
```

## ✨ Features

### Core Features
- **Authentication**: Register → Login with JWT tokens stored in localStorage
- **Profile Management**: Complete user profile with 20+ editable fields
- **Image Handling**: 
  - Profile photo (1 image, uploadable)
  - Photo gallery (up to 9 images)
  - Automatic client-side compression (<50KB)
  - Cloudinary cloud storage
- **User Information**:
  - Personal: Name, Gender, DOB, Age, Phone
  - Location: State (28 states) + City (cascading dropdown)
  - Professional: Education, Profession, Income range
  - Appearance: Height, Weight, Complexion
  - Personal: Bio, Marital Status, Family Values, About Family
- **Horoscope Details**:
  - Raasi (Moon Sign): 12 Indian zodiac signs
  - Natchathiram (Star/Nakshatra): Auto-selects based on Raasi
  - Lagnam (Ascendant): 12 ascendant signs
  - Dhosam: Dosh types (Kuja, Rahu, Kethu, etc.)
  - Birth Details: Date, Time, Place
- **Family Background**:
  - Father's Name, Occupation, Caste
  - Mother's Name, Occupation, Caste
- **Subscription Plans**:
  - Free: ₹0, Success Fee: ₹0
  - Standard: ₹999, Success Fee: ₹5,000
  - Premium: ₹2,499, Success Fee: ₹10,000
  - Elite: ₹4,999, Success Fee: ₹25,000
- **Mandatory Documents**:
  - Government ID (Aadhaar, PAN)
  - Proof of Current Address
  - Financial Verification (Bank Statement/ITR)
  - Photo ID Proof
  - Birth Certificate (optional)
  - Education Certificate (optional)
- **Interest System**: Connect with other profiles
- **Messaging**: Direct messaging between matched users
- **Search/Matching**: Find compatible profiles
- **Chat System**:
  - Real-time chat between users and admin
  - Message history stored in database
  - Delete messages functionality
  - Unread message count badges
  - 5-second polling for new messages
- **Verification System**:
  - Email OTP verification (via Gmail SMTP)
  - Phone OTP verification (via Twilio SMS)
  - **Fallback**: If SMS fails, OTP sent via email automatically
  - Admin photo verification and approval
  - Manual verification for complete profile
- **Admin Panel**:
  - Dashboard with statistics
  - Photo verification queue (approve/reject photos)
  - User management with verification status
  - Document verification
  - **Database Backup Management** (NEW!)

### Database Backup System (NEW!)
Automated database backups with Google Drive integration:
- **Automatic Daily Backups**: Cron scheduler runs at 2:00 AM IST daily
- **Google Drive Storage**: Backups stored in admin's Google Drive account
- **OAuth 2.0 Authentication**: Secure access using refresh token (NOT service account)
- **Retention Policy**: Keeps last 7 days of backups (configurable)
- **Manual Backup**: Admin can trigger backup anytime via "Backup Now" button
- **Backup History**: View all backups with download/delete options
- **Activity Logging**: All backup operations logged in Activity Logs

### Technology Stack
- **Frontend**: 
  - React.js 18.2 with React Router v6
  - Material-UI v5 (@mui/material)
  - React Hook Form (form management)
  - Axios (HTTP client)
  - React Hot Toast (notifications)
  - TanStack React Query (data fetching)
   
- **Backend**: 
  - Node.js with Express.js
  - Prisma ORM (database access)
  - JWT authentication
  - Multer + Cloudinary (file uploads)
  - Input validation middleware
  - Nodemailer (email OTP)
  - Twilio (SMS OTP)
  - node-cron (scheduled tasks)
  - googleapis (Google Drive integration)
   
- **Database**: 
  - PostgreSQL (Production via AWS RDS)
  - Prisma schema with migrations
   
- **Cloud Services**:
  - Cloudinary (image hosting)
  - Google Drive (backup storage)

## 🚀 Getting Started

### Prerequisites
- Node.js v16+ 
- npm or yarn
- Cloudinary account (for image upload) - [Sign up free](https://cloudinary.com)
- Twilio account (for SMS) - [Sign up free](https://twilio.com)
- Google Cloud project with Drive API (for backups) - [Setup guide below]

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd d:\VS_CODE\viji_marimony
   npm run install-deps  # Installs both backend & frontend deps
   ```

2. **Setup environment variables**

   Backend `.env` file (copy from `.env.example`):
   ```
   DATABASE_URL="file:./dev.db"
   JWT_SECRET=your-secret-key-here
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   TWILIO_ACCOUNT_SID=your-twilio-sid
   TWILIO_AUTH_TOKEN=your-twilio-token
   TWILIO_PHONE_NUMBER=+1234567890
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

3. **Initialize database:**
   ```bash
   cd backend
   npx prisma db push
   ```

### Development Mode

**Option 1: Run everything (from root)**
```bash
npm run dev
```

**Option 2: Run separately**

Terminal 1 - Backend:
```bash
cd backend
node server.js
```

Terminal 2 - Frontend:
```bash
cd frontend
npm start
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5001
- API Base: http://localhost:5001/api

### Production Build

```bash
cd frontend
npm run build  # Creates optimized build in build/ folder
```

## 📸 Profile Features

### Image Upload & Compression
- **Automatic Compression**: Images are compressed to <50KB before upload
- **Profile Photo**: Single image (primary profile picture)
- **Photo Gallery**: Up to 9 images (showcase multiple photos)
- **Cloudinary Storage**: Images hosted on cloud (not in database)
- **Error Handling**: Graceful fallbacks if compression fails

### Location Selection
- **28 Indian States**: Full list including all union territories
- **Cascading Dropdowns**: Select state → cities auto-load
- **City List**: 5-15 major cities per state
- **Examples**:
  - Select "Karnataka" → Shows: Bangalore, Mysore, Mangalore, etc
  - Select "Tamil Nadu" → Shows: Chennai, Coimbatore, Madurai, etc

### Horoscope Details
- **Raasi (Moon Sign)**: Select from 12 Indian zodiac signs
  - Mesham, Rishabam, Mithunam, Kadagam, Simmam, Kanni
  - Thulam, Vrischikam, Dhanusu, Makaram, Kumbam, Meenam

- **Natchathiram (Star)**: Auto-populates based on Raasi selection
  - 27 Nakshatras mapped to their respective Raasi
  - Example: Selecting "Mesham" shows Ashwini, Bharani, Krittika

- **Lagnam (Ascendant)**: Select ascendant sign
  - Same 12 signs as Raasi

- **Dhosam**: Select applicable dosham (if any)
  - None, Kuja Dhosam, Rahu Dhosam, Kethu Dhosam, etc.

- **Birth Details**:
  - Birth Date (date picker)
  - Birth Time (time picker)
  - Birth Place (text input)

### Family Background
- **Father's Details**:
  - Father's Name
  - Father's Occupation
  - Father's Caste

- **Mother's Details**:
  - Mother's Name
  - Mother's Occupation
  - Mother's Caste

### Subscription Plans
Choose a subscription tier based on your needs:

| Plan | Price | Success Fee | Features |
|------|-------|-------------|----------|
| Free | ₹0 | ₹0 | Basic profile viewing, Limited interests |
| Standard | ₹999 | ₹5,000 | Priority search, More interests, View contacts |
| Premium | ₹2,499 | ₹10,000 | Top priority, Unlimited interests, All photos |
| Elite | ₹4,999 | ₹25,000 | Featured profile, Dedicated support |

**Note**: Success fee is applicable only when marriage is fixed through our platform. This follows the guidelines set by the Government of India for matrimonial services.

### Mandatory Documents
Upload required documents for verification:

| Document Type | Required | Status Tracking |
|--------------|----------|-----------------|
| Government ID (Aadhaar, PAN) | ✅ Yes | Pending/Approved/Rejected |
| Proof of Current Address | ✅ Yes | Pending/Approved/Rejected |
| Financial Proof (ITR/Bank) | ✅ Yes | Pending/Approved/Rejected |
| Photo ID Proof | ✅ Yes | Pending/Approved/Rejected |
| Birth Certificate | ❌ Optional | Pending/Approved/Rejected |
| Education Certificate | ❌ Optional | Pending/Approved/Rejected |

**Document Status**:
- **Pending**: Uploaded, awaiting admin review
- **Approved**: Verified by admin
- **Rejected**: Please re-upload with valid document

### Profile Fields (Editable)
- Gender, Date of Birth, Age
- Phone, Country, State, City
- Marital Status
- Education, Profession, Income
- Height, Weight, Complexion
- Bio, Family Values, About Family
- Horoscope Details, Family Background

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - New user registration
- `POST /api/auth/login` - User login (returns JWT)

### Profile
- `GET /api/profile` - Get current user profile
- `PUT /api/profile` - Update profile fields
- `POST /api/profile/photo` - Upload profile photo
- `POST /api/profile/photos` - Upload gallery photos (up to 9)
- `DELETE /api/profile/photo` - Delete gallery photo
- `PUT /api/profile/horoscope` - Update horoscope details
- `PUT /api/profile/family` - Update family background
- `PUT /api/profile/subscription` - Update subscription tier
- `GET /api/profile/subscription/plans` - Get subscription plans
- `POST /api/profile/documents` - Upload document
- `GET /api/profile/documents` - Get uploaded documents
- `DELETE /api/profile/documents/:id` - Delete document

### Verification
- `POST /api/verification/email/send-otp` - Send email OTP
- `POST /api/verification/email/verify` - Verify email OTP
- `POST /api/verification/phone/send-otp` - Send phone OTP (with fallback email)
- `POST /api/verification/phone/verify` - Verify phone OTP
- `GET /api/verification/status` - Get verification status

### Admin (Admin users only)
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/photos/pending` - Pending photo verifications
- `PUT /api/admin/photos/:id/approve` - Approve photo
- `PUT /api/admin/photos/:id/reject` - Reject photo with reason
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id/verification` - Manual verification

### Database Backup (Admin only)
- `GET /api/admin/backup/status` - Get backup status and configuration
- `GET /api/admin/backup/list` - List all backups
- `POST /api/admin/backup/create` - Create manual backup
- `GET /api/admin/backup/download/:backupId` - Download backup file
- `DELETE /api/admin/backup/:backupId` - Delete a backup
- `POST /api/admin/backup/enforce-retention` - Run retention policy

### Other
- `GET /` - Health check
- `GET /api/search` - Search profiles
- `GET /api/interests` - Manage interests
- `GET /api/messages` - Messaging system

## 💾 Database Backup Setup

### Google Drive OAuth 2.0 Setup

**Important**: Service Accounts do NOT have storage quota in personal Google Drive. Use OAuth 2.0 with a real user account instead.

1. **Create OAuth 2.0 Client ID**:
   - Go to https://console.cloud.google.com/
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: Web application
   - Add redirect URI: `https://developers.google.com/oauthplayground`

2. **Enable Google Drive API**:
   - APIs & Services → Library → Search "Google Drive API" → Enable

3. **Get Refresh Token via OAuth Playground**:
   - Go to: https://developers.google.com/oauthplayground
   - Click Settings (⚙️) → Check "Use your own OAuth credentials"
   - Enter your Client ID and Client Secret
   - In Step 1, select `Drive API v3` with scope `https://www.googleapis.com/auth/drive`
   - Click "Authorize APIs" → Complete the OAuth flow with admin email
   - In Step 2, click "Exchange authorization code for tokens"
   - Copy the `refresh_token`

4. **Set Environment Variables**:
   ```env
   GOOGLE_DRIVE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret
   GOOGLE_DRIVE_REFRESH_TOKEN=your-refresh-token
   ```

### Backup Configuration Options

```env
# Enable/disable Google Drive backup (default: true)
USE_GOOGLE_DRIVE=true

# Enable local backup storage (default: false)
USE_LOCAL_BACKUP=false

# Local backup folder path
BACKUP_LOCAL_PATH=./backups

# Retention period in days (default: 7)
BACKUP_RETENTION_DAYS=7

# Cron schedule (default: 2:00 AM IST)
BACKUP_CRON_HOUR=2
BACKUP_CRON_MINUTE=0
```

## 🧪 Testing (Updated for New Features)

### Test Registration & Login
1. Open http://localhost:3000
2. Click "Register"
3. Fill form: Email, Password, Name, Phone, etc.
4. Submit → Get redirected to Login
5. Login with credentials
6. See Dashboard

### Test Verification
1. After login, go to "Verification" from menu
2. **Email Tab**: Click "Send OTP" → Check email → Enter OTP → Verify
3. **Phone Tab**: 
   - Click "Send OTP" → Check phone/SMS
   - If SMS fails, OTP auto-sent to email
   - Enter OTP → Verify
4. Once both verified, get "Verified" badge

### Test Admin Panel (Admin users only)
1. Login with admin email: vijayalakshmijayakumar45@gmail.com
2. Password: Admin@2024
3. "Admin Panel" link appears in menu
4. View dashboard stats
5. Review pending photo approvals
6. Approve/reject user photos

### Test DB Backup System (NEW!)
1. Login as admin
2. Go to Admin Panel → "DB Backup" in sidebar
3. View backup status cards (Google Drive connection, total backups, last backup)
4. Click "Backup Now" to create manual backup
5. Wait for backup to complete
6. View backup in history table
7. Download or delete backups as needed

## 📝 Admin & Contact Information

### Admin Dashboard Access
- **Admin Email**: vijayalakshmijayakumar45@gmail.com
- **Admin Password**: Admin@2061979 (set in database seed)
- **Note**: Only this email has admin privileges. All other registered users are treated as clients.

### User Contact Support
- **Email**: info@vijayalakshmiboyarmatrimony.com (for user inquiries)
- **Phone**: +91 7639150271

## 🆕 RECENT UPDATES (April 7, 2026)

### Database Backup System Fixes
Fixed critical bug causing backup to fail after successful Google Drive upload:
- **Bug**: ENOENT error after successful upload - code tried to stat the local backup file after it was deleted
- **Fix**: Capture `localFileSize` immediately after `pg_dump` and before file deletion
- **Improved diagnostics**: Added logging for target host, output file path, and backup folder existence
- **Validation**: Added explicit file existence and empty file checks after `pg_dump`
- **Result**: Backup now completes successfully with correct response payload

### Database Backup System (Full Feature)
Automated database backup system with Google Drive integration:
- **Backend Files**:
  - `backend/services/googleDriveService.js` - Google Drive OAuth integration
  - `backend/services/backupScheduler.js` - Cron scheduler for daily backups
  - `backend/controllers/backupController.js` - Backup logic (pg_dump, upload, retention)
  - `backend/routes/backup.js` - Admin-only API routes
- **Frontend**:
  - Added "DB Backup" menu in Admin Panel sidebar
  - New Backup page with status, history, download/delete options
- **Features**:
  - Automatic daily backups at 2:00 AM IST
  - OAuth 2.0 authentication (not service account - no storage quota issue)
  - Retention policy (keeps last 7 backups by default)
  - Manual backup trigger via "Backup Now" button
  - All operations logged in Activity Logs
- **Note**: Service Accounts don't have storage quota in personal Google Drive. OAuth 2.0 with refresh token is used instead.

## 🆕 RECENT UPDATES (April 6, 2026)

### Admin Chat - All Users Tab
Admin can now initiate chat with any registered user:
- **Two Tabs**: "Conversations" (existing chats) + "All Users" (new)
- **Start New Chat**: Admin can select any user from "All Users" tab
- **Use Case**: Contact users about payment issues, verification queries
- **Location**: Admin Panel → Client Chat

### Gallery Photos - View Button
Admin can now view images in full size before Approve/Reject:
- **View Button**: Added next to Approve/Reject in Gallery Photos
- **Full Size Preview**: Opens dialog with enlarged image
- **Better Review**: Small images can be clearly examined

### Production Deployment
**You now have 2 working URLs:**
- **Cloudflare default** (for testing): https://viji-marimony-deploy.pages.dev
- **Your custom domain** (main site): https://vijayalakshmiboyarmatrimony.com
- **Backend API**: https://viji-marimony-deploy-backend.onrender.com
- **Database**: AWS RDS PostgreSQL
- **Auto Deploy**: GitHub Actions linked to both Render (backend) and Cloudflare (frontend)

### GitHub Actions Auto-Deployment
- Added `.github/workflows/deploy.yml` for automatic deployment
- Backend auto-deploys to Render on every push to master
- Frontend auto-deploys to Cloudflare Pages on every push to master
- Required secrets: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, RENDER_API_TOKEN, RENDER_BACKEND_SERVICE_ID

## 🆕 RECENT UPDATES (February 2025)

### Profile Photo Zoom & Pan Adjustment
Users can now adjust their profile photo after uploading:
- **Zoom In/Out**: Use scroll wheel or +/- buttons (0.5x to 5x range)
- **Pan Image**: Click and drag to reposition photo within the circle
- **Save Button**: Only visible during "change photo" period
- **Reset**: Restores default position (center, 1x scale)
- **Cancel**: Discards unsaved changes

**Database Changes**:
- Added `profilePhotoScale`, `profilePhotoX`, `profilePhotoY` fields to users table
- New API endpoint: `PUT /api/profile/photo/adjustments`

### Subscription Page Improvements
Enhanced subscription plan visibility:
- **Plan Numbers**: Numbered circles (1, 2, 3, 4) for easy identification
- **Current Plan Badge**: Green "CURRENT PLAN" badge on active plan
- **Visual Highlighting**: Green border and scale animation for current plan
- **Clear Status**: Always visible current plan chip at top
- **FREE Plan Support**: Properly shows FREE as default current plan

## 🎯 Community Focus
Built specifically for the Boyar community with:
- Community-specific profile fields
- Cultural understanding (family values, marital status)
- Personalized matching preferences
- Trust and verification system
- Horoscope compatibility features
- Traditional family background collection
- Compliant success fee structure per Indian laws
