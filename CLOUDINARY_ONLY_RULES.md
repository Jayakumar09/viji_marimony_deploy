# Cloudinary Only - Development Rules

## Important: ONLY use Cloudinary for image storage

After deleting the local uploads folder, all images must be stored and accessed via Cloudinary only.

### Rules:
1. **NO local uploads folder** - Do not create or use `backend/uploads/` folder
2. **All images from Cloudinary** - User photos, gallery images, profile photos must use Cloudinary URLs
3. **Database fields affected**:
   - `user.profile_photo` - Should contain Cloudinary URL (not local path)
   - `user.photos` - JSON array of Cloudinary URLs (not local paths)

### How to handle legacy local paths:
When generating PDFs or displaying images, filter for Cloudinary URLs only:
```javascript
// Only use Cloudinary URLs
const cloudinaryPhotos = parsedPhotos.filter(p => 
  p && typeof p === 'string' && p.includes('cloudinary')
);
```

### Quick fix for existing local paths:
If user has local paths in database but Cloudinary URLs in user.photos:
- Use first Cloudinary URL from user.photos as profile photo
- Use remaining Cloudinary URLs from user.photos as gallery

### Reference:
- Cloudinary config is in `backend/config/cloudinary.js` or `.env`
- Cloud name: `do6o1xqs1`
