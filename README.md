# Vijayalakshmi Boyar Matrimony App

A community-focused matrimony platform for the Boyar community.

## 📋 Project Status
- ✅ Backend API fully functional (Express.js on port 5001)
- ✅ Frontend UI operational (React.js on port 3000)
- ✅ Database configured (SQLite)
- ✅ User authentication working (JWT)
- ✅ Profile management with image handling
- ✅ Image compression (<50KB automatic)
- ✅ Indian state/city dropdowns (cascading)
- ✅ Gallery support (up to 9 images per user)
- ✅ Email & Phone OTP Verification
- ✅ Admin Photo Verification System
- ✅ Horoscope Details (Raasi, Natchathiram, Lagnam, Dhosam)
- ✅ Family Background (Father & Mother details)
- ✅ Subscription Plans with Success Fee
- ✅ Mandatory Documents Upload
- ✅ **Chat System** (User-Admin real-time chat with message deletion)

## Project Structure

```
├── backend/
│   ├── controllers/      # Business logic
│   ├── routes/          # API endpoints
│   ├── middleware/       # Auth, validation
│   ├── utils/           # Helpers (image upload, JWT, DB, OTP)
│   ├── prisma/          # Database schema & seeds
│   └── server.js        # Main server file
├── frontend/
│   ├── src/
│   │   ├── pages/       # Page components (Login, Profile, etc)
│   │   ├── components/  # Reusable components
│   │   ├── services/    # API calls
│   │   ├── contexts/    # React Context (Auth)
│   │   ├── hooks/       # Custom hooks (useAuth)
│   │   ├── data/        # Static data (Indian locations, Horoscope)
│   │   └── utils/       # Helpers (image compression)
│   └── public/          # Static assets
├── database/            # Database setup docs
├── PROFILE_UPDATES.md   # Profile features documentation
└── README.md           # This file
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
- **Horoscope Details** (New!):
  - Raasi (Moon Sign): 12 Indian zodiac signs
  - Natchathiram (Star/Nakshatra): Auto-selects based on Raasi
  - Lagnam (Ascendant): 12 ascendant signs
  - Dhosam: Dosh types (Kuja, Rahu, Kethu, etc.)
  - Birth Details: Date, Time, Place
- **Family Background** (New!):
  - Father's Name, Occupation, Caste
  - Mother's Name, Occupation, Caste
- **Subscription Plans** (New!):
  - Free: ₹0, Success Fee: ₹0
  - Standard: ₹999, Success Fee: ₹5,000
  - Premium: ₹2,499, Success Fee: ₹10,000
  - Elite: ₹4,999, Success Fee: ₹25,000
- **Mandatory Documents** (New!):
  - Government ID (Aadhaar, PAN)
  - Proof of Current Address
  - Financial Verification (Bank Statement/ITR)
  - Photo ID Proof
  - Birth Certificate (optional)
  - Education Certificate (optional)
- **Interest System**: Connect with other profiles
- **Messaging**: Direct messaging between matched users
- **Search/Matching**: Find compatible profiles
- **Chat System** (New!):
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
   
- **Database**: 
  - SQLite (development)
  - Prisma schema with migrations
   
- **Cloud Services**:
  - Cloudinary (image hosting)

## 🚀 Getting Started

### Prerequisites
- Node.js v16+ 
- npm or yarn
- Cloudinary account (for image upload) - [Sign up free](https://cloudinary.com)
- Twilio account (for SMS) - [Sign up free](https://twilio.com)

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd d:\VS_CODE\viji_marimony
   npm run install-deps  # Installs both backend & frontend deps
   ```

2. **Setup environment variables**

   Backend `.env` file:
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

### Horoscope Details (NEW!)
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

### Family Background (NEW!)
- **Father's Details**:
  - Father's Name
  - Father's Occupation
  - Father's Caste

- **Mother's Details**:
  - Mother's Name
  - Mother's Occupation
  - Mother's Caste

### Subscription Plans (NEW!)
Choose a subscription tier based on your needs:

| Plan | Price | Success Fee | Features |
|------|-------|-------------|----------|
| Free | ₹0 | ₹0 | Basic profile viewing, Limited interests |
| Standard | ₹999 | ₹5,000 | Priority search, More interests, View contacts |
| Premium | ₹2,499 | ₹10,000 | Top priority, Unlimited interests, All photos |
| Elite | ₹4,999 | ₹25,000 | Featured profile, Dedicated support |

**Note**: Success fee is applicable only when marriage is fixed through our platform. This follows the guidelines set by the Government of India for matrimonial services.

### Mandatory Documents (NEW!)
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
- **NEW**: Horoscope Details, Family Background

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
- `PUT /api/profile/horoscope` - Update horoscope details (NEW!)
- `PUT /api/profile/family` - Update family background (NEW!)
- `PUT /api/profile/subscription` - Update subscription tier (NEW!)
- `GET /api/profile/subscription/plans` - Get subscription plans (NEW!)
- `POST /api/profile/documents` - Upload document (NEW!)
- `GET /api/profile/documents` - Get uploaded documents (NEW!)
- `DELETE /api/profile/documents/:id` - Delete document (NEW!)

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

### Other
- `GET /` - Health check
- `GET /api/search` - Search profiles
- `GET /api/interests` - Manage interests
- `GET /api/messages` - Messaging system

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

### Test Profile Features
1. After login, click "Profile"
2. Click "Edit" button
3. Upload profile photo (auto-compresses)
4. Select a state from dropdown
5. Verify city dropdown updates with that state's cities
6. Edit fields (phone, education, bio, etc)
7. Click "Save" to submit
8. Upload gallery photos (up to 9)

### Test Horoscope Details (NEW!)
1. Go to Profile page
2. Click "Horoscope" tab
3. Click "Edit" button
4. Select Raasi (Moon Sign) from dropdown
5. Verify Natchathiram dropdown auto-populates with stars for that Raasi
6. Select Lagnam and Dhosam
7. Enter birth date, time, and place
8. Click "Save"

### Test Family Background (NEW!)
1. Go to Profile page
2. Click "Family" tab
3. Click "Edit" button
4. Enter Father's Name, Occupation, Caste
5. Enter Mother's Name, Occupation, Caste
6. Click "Save"

### Test Subscription Plans (NEW!)
1. Go to Profile page
2. Click "Subscription" tab
3. View all available plans with prices and success fees
4. Click "Select Plan" on desired tier
5. Confirm subscription update
6. See current plan highlighted

### Test Mandatory Documents (NEW!)
1. Go to Profile page
2. Click "Documents" tab
3. View required documents checklist
4. Click "Upload Document" button
5. Select document type from dropdown
6. Upload file (image or PDF)
7. View uploaded documents in table
8. Check status (Pending/Approved/Rejected)
9. Delete and re-upload if rejected

### Test Image Compression
1. Upload a large image (>50KB)
2. Open browser DevTools → Network tab
3. Check Cloudinary request → Image should be <50KB
4. Verify quality is acceptable

## 📝 Admin & Contact Information

### Admin Dashboard Access
- **Admin Email**: vijayalakshmijayakumar45@gmail.com
- **Admin Password**: Admin@2061979 (set in database seed)
- **Note**: Only this email has admin privileges. All other registered users are treated as clients.

### User Contact Support
- **Email**: info@vijayalakshmiboyarmatrimony.com (for user inquiries)
- **Phone**: +91 7639150271

## 🆕 RECENT UPDATES (February 2025)

### Profile Photo Zoom & Pan Adjustment (NEW!)
Users can now adjust their profile photo after uploading:
- **Zoom In/Out**: Use scroll wheel or +/- buttons (0.5x to 5x range)
- **Pan Image**: Click and drag to reposition photo within the circle
- **Save Button**: Only visible during "change photo" period
- **Reset**: Restores default position (center, 1x scale)
- **Cancel**: Discards unsaved changes

**Database Changes**:
- Added `profilePhotoScale`, `profilePhotoX`, `profilePhotoY` fields to users table
- New API endpoint: `PUT /api/profile/photo/adjustments`

### Subscription Page Improvements (NEW!)
Enhanced subscription plan visibility:
- **Plan Numbers**: Numbered circles (1, 2, 3, 4) for easy identification
- **Current Plan Badge**: Green "CURRENT PLAN" badge on active plan
- **Visual Highlighting**: Green border and scale animation for current plan
- **Clear Status**: Always visible current plan chip at top
- **FREE Plan Support**: Properly shows FREE as default current plan

### Bug Fixes
- Fixed console warnings for null values in Select components (raasi, natchathiram, dhosam)
- Normalized horoscope fields to prevent null value errors

## 🎯 Community Focus
Built specifically for the Boyar community with:
- Community-specific profile fields
- Cultural understanding (family values, marital status)
- Personalized matching preferences
- Trust and verification system
- Horoscope compatibility features
- Traditional family background collection
- Compliant success fee structure per Indian laws
