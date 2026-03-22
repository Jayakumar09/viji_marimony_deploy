/**
 * Compress image to reasonable size for profile photos
 * @param {File} file - Image file to compress
 * @param {number} maxSize - Maximum size in bytes (default: 500KB for profile photos)
 * @returns {Promise<Blob>} - Compressed image blob
 */
export const compressImage = (file, maxSize = 500 * 1024) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions while maintaining aspect ratio
        const maxDimension = 800;
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress by reducing quality progressively with max iterations
        let quality = 0.9;
        const maxIterations = 10;
        let iterations = 0;
        
        const tryCompress = (currentCanvas, currentQuality) => {
          iterations++;
          currentCanvas.toBlob(
            (blob) => {
              if (blob.size > maxSize && currentQuality > 0.1 && iterations < maxIterations) {
                tryCompress(currentCanvas, currentQuality - 0.1);
              } else {
                resolve(blob);
              }
            },
            file.type || 'image/jpeg',
            currentQuality
          );
        };
        
        tryCompress(canvas, quality);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };
      
      img.src = event.target.result;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Convert blob to File object
 */
export const blobToFile = (blob, filename) => {
  return new File([blob], filename, { type: blob.type });
};
