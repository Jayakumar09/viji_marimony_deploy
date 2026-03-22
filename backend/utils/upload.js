const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Check if Cloudinary is properly configured
const isCloudinaryConfigured = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  // Check if all required variables exist and have valid values (not placeholders)
  if (!cloudName || !apiKey || !apiSecret) return false;
  
  // Check for common placeholder patterns
  const isPlaceholder = apiSecret.includes('your_') || 
                       apiSecret.includes('_here') ||
                       apiSecret.length < 10 ||
                       cloudName.includes('your_') ||
                       cloudName.includes('_here');
  
  return !isPlaceholder;
};

// Use Cloudinary storage (no local uploads)
let storage;
if (isCloudinaryConfigured()) {
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'boyar-matrimony',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'],
      transformation: [
        { width: 1500, height: 1500, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ],
    },
  });
} else {
  // Use local uploads folder when Cloudinary not configured
  const uploadDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  console.log('Note: Using local uploads folder for file storage');
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const userId = req.user?.id || 'unknown';
      const timestamp = Date.now();
      const ext = path.extname(file.originalname);
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      cb(null, `user_${userId}_${timestamp}_${randomSuffix}${ext}`);
    },
  });
}

// Multer upload middleware - 5MB limit for documents
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image files and PDFs are allowed!'), false);
    }
  },
});

// Upload single file (profile photo) - expects 'photo' field
const uploadSingle = upload.single('photo');

// Upload multiple files (gallery photos) - maximum 9 images
const uploadMultiple = upload.array('photos', 9);

// Delete image from Cloudinary
const deleteImage = async (publicIdOrPath) => {
  try {
    if (isCloudinaryConfigured()) {
      // Extract public ID from Cloudinary URL
      let publicId = publicIdOrPath;
      if (publicIdOrPath.includes('cloudinary')) {
        // Extract public_id from URL
        const parts = publicIdOrPath.split('/');
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex !== -1) {
          publicId = parts.slice(uploadIndex + 1).join('/');
          // Remove file extension
          publicId = publicId.replace(/\.[^/.]+$/, '');
        }
      }
      const result = await cloudinary.uploader.destroy(publicId);
      console.log('Deleted from Cloudinary:', result);
      return result;
    } else {
      // Delete from local storage
      const filePath = path.join(__dirname, '../uploads', publicIdOrPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Deleted local file:', publicIdOrPath);
        return { result: 'ok' };
      }
      return { result: 'file_not_found' };
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

// Extract public ID from URL
const extractPublicId = (url) => {
  if (!url) return null;
  
  // If it's a local file path, extract just the filename
  if (url.startsWith('/uploads/') || !url.includes('cloudinary')) {
    return path.basename(url);
  }
  
  // For Cloudinary URLs, extract the public ID
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  return filename.split('.')[0];
};

// Error handler for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  deleteImage,
  extractPublicId,
  handleMulterError,
  cloudinary,
  isCloudinaryConfigured
};
