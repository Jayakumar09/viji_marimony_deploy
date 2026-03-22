/**
 * Admin File Serving Route
 * 
 * Secure file serving for admin panel
 * Only accessible by authenticated admin users
 * Protects file paths from direct exposure
 * Supports images and documents
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Admin middleware for file routes
const adminFileMiddleware = async (req, res, next) => {
  try {
    const jwt = require('jsonwebtoken');
    const { prisma } = require('../utils/database');
    
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'boyar-matrimony-super-secret-key-change-in-production-2024');
    } catch (err) {
      // Try fallback secret
      try {
        decoded = jwt.verify(token, 'admin-secret-key');
      } catch (err2) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }
    
    // Get admin ID
    const adminId = decoded.id || decoded.adminId;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    // Verify admin exists and is active
    const admin = await prisma.admin.findUnique({
      where: { id: adminId }
    });
    
    if (!admin || !admin.isActive) {
      return res.status(403).json({ error: 'Access denied' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin file middleware error:', error);
    res.status(500).json({ error: 'Server error in file authentication' });
  }
};

/**
 * Sanitize filename to prevent path traversal
 */
const sanitizeFilename = (filename) => {
  // Remove any path components
  const basename = path.basename(filename);
  
  // Remove null bytes, control characters
  const sanitized = basename.replace(/[\x00-\x1f\x7f]/g, '');
  
  // Only allow alphanumeric, underscore, hyphen, dot
  if (!/^[a-zA-Z0-9_.-]+$/.test(sanitized)) {
    return null;
  }
  
  return sanitized;
};

/**
 * Get file type category
 */
const getFileCategory = (filepath) => {
  const lowerPath = filepath.toLowerCase();
  
  if (lowerPath.includes('/documents/') || lowerPath.includes('/docs/')) {
    return 'document';
  }
  if (lowerPath.includes('/photos/') || lowerPath.includes('/images/') || lowerPath.includes('/uploads/')) {
    return 'image';
  }
  
  return 'general';
};

/**
 * Serve file securely
 * GET /api/admin/files/:encodedPath
 */
router.get('/files/:encodedPath(*)', adminFileMiddleware, async (req, res) => {
  try {
    const { encodedPath } = req.params;
    
    if (!encodedPath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    // Decode the URL-encoded path
    let filepath;
    try {
      filepath = decodeURIComponent(encodedPath);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid file path encoding' });
    }

    // Sanitize filename
    const filename = sanitizeFilename(path.basename(filepath));
    if (!filename) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Determine the base uploads directory
    const uploadsDir = path.join(__dirname, '../uploads');
    
    // Construct full path - only allow paths within uploads directory
    let fullPath;
    
    // Handle different path formats
    if (filepath.startsWith('uploads/')) {
      fullPath = path.join(uploadsDir, filepath.replace('uploads/', ''));
    } else if (filepath.startsWith('/')) {
      fullPath = path.join(uploadsDir, filepath.substring(1));
    } else {
      fullPath = path.join(uploadsDir, filepath);
    }

    // Normalize and resolve path to prevent path traversal
    const normalizedPath = path.normalize(fullPath);
    const resolvedPath = path.resolve(uploadsDir, path.basename(filepath));

    // Ensure the resolved path is within uploads directory
    if (!resolvedPath.startsWith(uploadsDir)) {
      console.error('Path traversal attempt:', filepath);
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      // Return placeholder image for missing files
      return res.status(404).json({ 
        error: 'File not found',
        path: filename
      });
    }

    // Get file stats
    const stats = fs.statSync(resolvedPath);
    
    // Check if it's a directory
    if (stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is a directory' });
    }

    // Get file extension for content type
    const ext = path.extname(filename).toLowerCase();
    const contentType = getContentType(ext);

    // Set cache headers for performance
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Content-Type', contentType);

    // Stream file to response
    const fileStream = fs.createReadStream(resolvedPath);
    
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file' });
      }
    });

    fileStream.pipe(res);

    // Log file access
    console.log(`[ADMIN FILE] Admin ${req.admin.id} accessed: ${filename}`);

  } catch (error) {
    console.error('File serve error:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

/**
 * Get content type based on file extension
 */
function getContentType(ext) {
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain'
  };

  return contentTypes[ext] || 'application/octet-stream';
}

/**
 * Serve document preview
 * GET /api/admin/documents/:encodedPath
 */
router.get('/documents/:encodedPath(*)', adminFileMiddleware, async (req, res) => {
  try {
    const { encodedPath } = req.params;
    
    if (!encodedPath) {
      return res.status(400).json({ error: 'Document path is required' });
    }

    let filepath;
    try {
      filepath = decodeURIComponent(encodedPath);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid document path encoding' });
    }

    // Check if it's a Cloudinary URL - redirect to Cloudinary for streaming
    if (filepath.includes('cloudinary.com') || filepath.startsWith('http')) {
      // Redirect to Cloudinary URL for the document
      return res.redirect(filepath);
    }

    // Local file handling (fallback)
    const filename = sanitizeFilename(path.basename(filepath));
    if (!filename) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const uploadsDir = path.join(__dirname, '../uploads');
    const fullPath = path.join(uploadsDir, filename);
    const resolvedPath = path.resolve(fullPath);

    if (!resolvedPath.startsWith(uploadsDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const ext = path.extname(filename).toLowerCase();
    const contentType = getContentType(ext);

    // For PDFs, set inline disposition for preview
    if (ext === '.pdf') {
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const fileStream = fs.createReadStream(resolvedPath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Document serve error:', error);
    res.status(500).json({ error: 'Failed to serve document' });
  }
});

/**
 * Serve profile photo
 * GET /api/admin/photos/profile/:userId
 */
router.get('/photos/profile/:userId', adminFileMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { prisma } = require('../utils/database');

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get user's profile photo
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePhoto: true }
    });

    if (!user || !user.profilePhoto) {
      return res.status(404).json({ error: 'Profile photo not found' });
    }

    // Redirect to file serve endpoint
    const photoPath = encodeURIComponent(user.profilePhoto);
    return res.redirect(`/api/admin/files/${photoPath}`);

  } catch (error) {
    console.error('Profile photo serve error:', error);
    res.status(500).json({ error: 'Failed to serve profile photo' });
  }
});

/**
 * Serve gallery photo
 * GET /api/admin/photos/gallery/:photoId
 */
router.get('/photos/gallery/:photoId', adminFileMiddleware, async (req, res) => {
  try {
    const { photoId } = req.params;
    const { prisma } = require('../utils/database');

    if (!photoId) {
      return res.status(400).json({ error: 'Photo ID is required' });
    }

    // Get photo URL from database
    const photo = await prisma.photoVerification.findUnique({
      where: { id: photoId },
      select: { photoUrl: true }
    });

    if (!photo || !photo.photoUrl) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Redirect to file serve endpoint
    const photoPath = encodeURIComponent(photo.photoUrl);
    return res.redirect(`/api/admin/files/${photoPath}`);

  } catch (error) {
    console.error('Gallery photo serve error:', error);
    res.status(500).json({ error: 'Failed to serve photo' });
  }
});

module.exports = router;
