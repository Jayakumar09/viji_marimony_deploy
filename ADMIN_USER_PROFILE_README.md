# Admin User Profile Feature - Vijayalakshmi Boyar Matrimony

## Overview
This feature provides a comprehensive admin dashboard for viewing and managing user profiles, including personal details, photos, documents, verifications, and activity logs.

## Features Implemented

### 1. Full User Profile View
- **Personal Details**: Name, email, phone, gender, DOB, age, community, marital status
- **Location Details**: City, state, country
- **Professional Details**: Education, profession, income
- **Family Details**: Father/mother names, occupations, family values
- **Horoscope Details**: Raasi, natchathiram, dhosam, birth details

### 2. Photo Management
- **Profile Photo**: Primary profile picture display
- **Gallery Grid**: All uploaded gallery photos in a responsive grid layout
- **Photo Sources**: Supports both legacy (users table) and new models (user_photos, user_gallery_images)

### 3. Document Management
- Document type display
- Document preview with secure file serving
- Verification status tracking

### 4. Verification Details
- ID type (AADHAR, PAN, PASSPORT, etc.)
- Masked ID number (only last 4 digits visible for security)
- Face match score display
- Tamper suspicion flag
- Format validation flag
- Verification status badge (Pending/Approved/Rejected)

### 5. User Actions (with confirmation dialogs)
- **Block User**: Deactivate user account with reason
- **Unblock User**: Reactivate blocked account
- **Delete User**: Soft delete (anonymize) or permanent deletion
- **Manual Verify**: Approve/reject user verification
- **Update Subscription**: Change user tier (FREE/STANDARD/PREMIUM/ELITE)

### 6. Activity Logging
All admin actions are logged to `admin_activity_logs` table:
- VIEW_USER_PROFILE
- BLOCK_USER
- UNBLOCK_USER
- DELETE_USER
- MANUAL_VERIFY_USER
- UPDATE_SUBSCRIPTION

## API Endpoints

### Profile Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users/:id/profile` | Get complete user profile |
| PUT | `/api/admin/users/:id/block` | Block user account |
| PUT | `/api/admin/users/:id/unblock` | Unblock user account |
| DELETE | `/api/admin/users/:id` | Delete user (soft/permanent) |
| PUT | `/api/admin/users/:id/manual-verify` | Manual verification |
| PUT | `/api/admin/subscriptions/:id` | Update subscription |

### Activity Logs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users/:id/activity` | Get user activity logs |

### File Serving
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/file/:filename` | Secure file serving |

## Database Schema

### New Tables Added

```sql
-- User Photos (Profile + Gallery)
CREATE TABLE user_photos (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  photo_url TEXT,
  is_profile_photo BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  uploaded_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User Gallery Images
CREATE TABLE user_gallery_images (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  image_url TEXT,
  caption TEXT,
  is_private BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  uploaded_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User Documents
CREATE TABLE user_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  document_type TEXT,
  document_number TEXT,  -- Encrypted
  document_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  uploaded_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ID Verifications
CREATE TABLE verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  id_type TEXT,
  id_number TEXT,  -- Masked
  face_match_score REAL,
  is_tampered BOOLEAN DEFAULT false,
  format_valid BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'PENDING',
  verified_by TEXT,
  verified_at DATETIME,
  notes TEXT,
  created_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Admin Activity Logs
CREATE TABLE admin_activity_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT,
  action TEXT,
  target_user_id TEXT,
  details TEXT,  -- JSON
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME
);
```

## Security Features

1. **JWT Authentication**: All admin routes require valid JWT token
2. **Role-Based Access Control**: Only users with 'ADMIN' role can access
3. **Masked ID Numbers**: Only last 4 digits visible in UI
4. **Protected File Serving**: Files served through admin routes with authentication
5. **Activity Logging**: Complete audit trail of admin actions
6. **Parameterized Queries**: Uses Prisma ORM to prevent SQL injection

## Frontend Components

### AdminUserProfile.js
- Tab-based navigation (Personal, Photos, Documents, Verification, Activity)
- Dark theme consistent with admin panel
- Responsive design with Material-UI
- Confirmation dialogs for destructive actions
- Snackbar notifications for feedback

## Configuration

### Environment Variables
```env
JWT_SECRET=your-jwt-secret
PORT=5001
DATABASE_URL=file:./dev.db
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Testing

### Test User
- **Name**: Dharsini Yuvaraj A
- **Profile Photo**: 1 photo
- **Gallery Photos**: 4 photos

## Future Enhancements

1. Bulk user actions
2. Advanced search/filter
3. Export user data
4. Email notifications to users
5. Photo approval workflow
6. Document verification workflow

## Changelog

### v1.0.0 (2026-02-13)
- Initial implementation
- Full user profile view
- Photo management
- Document management
- Verification details
- Block/unblock/delete actions
- Activity logging
- Secure file serving

## License
MIT License
