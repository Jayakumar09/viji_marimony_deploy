// Backend URL for image serving
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

// Helper to construct full image URLs via backend
export const getImageUrl = (imagePath) => {
  // Handle null, undefined, or empty string
  if (!imagePath || typeof imagePath !== 'string') {
    console.warn('getImageUrl: Invalid imagePath:', imagePath);
    return '';
  }
  
  const trimmedPath = imagePath.trim();
  if (!trimmedPath) {
    return '';
  }
  
  // If already a full URL (Cloudinary or external), return as-is
  if (trimmedPath.startsWith('http')) {
    return trimmedPath;
  }
  
  // If it's a file:// URL, extract the filename and use relative path
  if (trimmedPath.startsWith('file://')) {
    const filename = trimmedPath.split('/').pop();
    return `${BACKEND_URL}/uploads/${filename}`;
  }
  
  // If it contains an absolute Windows path (D:/...), extract the filename
  if (trimmedPath.includes('D:/') || trimmedPath.includes('D:\\')) {
    const filename = trimmedPath.split(/[\\/]/).pop();
    return `${BACKEND_URL}/uploads/${filename}`;
  }
  
  // Normalize path - ensure it starts with / for local uploads
  let normalizedPath = trimmedPath;
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = '/' + normalizedPath;
  }
  
  // If local path starting with /uploads, prepend backend domain
  if (normalizedPath.startsWith('/uploads/')) {
    return `${BACKEND_URL}${normalizedPath}`;
  }
  
  // If local path starting with /, prepend backend domain
  if (normalizedPath.startsWith('/')) {
    return `${BACKEND_URL}${normalizedPath}`;
  }
  
  // Otherwise assume it's a relative path in uploads folder
  return `${BACKEND_URL}/uploads/${normalizedPath}`;
};

export default getImageUrl;
