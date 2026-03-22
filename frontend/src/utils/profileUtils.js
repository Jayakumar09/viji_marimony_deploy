// Profile utility functions - extracted from Profile.js for better organization

// Cropper helper to get cropped image
export const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = await new Promise((resolve) => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => resolve(img);
  });

  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg');
  });
};

// Handle profile photo selection
export const handleProfilePhotoSelect = (event, setImageToCrop, setCrop, setIsCropDialogOpen) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setImageToCrop(reader.result);
      setCrop({ x: 0, y: 0 });
      setIsCropDialogOpen(true);
    };
  }
};

// Initialize photo adjustments from profile data
export const initializePhotoAdjustments = (profileData, setPhotoScale, setPhotoPosX, setPhotoPosY) => {
  if (profileData?.profilePhotoScale !== undefined) {
    setPhotoScale(profileData.profilePhotoScale || 1);
  }
  if (profileData?.profilePhotoX !== undefined) {
    setPhotoPosX(profileData.profilePhotoX || 0);
  }
  if (profileData?.profilePhotoY !== undefined) {
    setPhotoPosY(profileData.profilePhotoY || 0);
  }
};

// Photo pan/drag handlers
export const createPhotoDragHandlers = (isEditingPhoto, photoPosX, photoPosY) => {
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  const handleMouseDown = (e) => {
    if (!isEditingPhoto) return;
    isDragging = true;
    startX = e.clientX - photoPosX;
    startY = e.clientY - photoPosY;
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !isEditingPhoto) return;
    // This needs to update state, so return the values
    return {
      x: e.clientX - startX,
      y: e.clientY - startY
    };
  };

  const handleMouseUp = () => {
    isDragging = false;
  };

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    isDragging: () => isDragging
  };
};

// Reset photo adjustments
export const resetPhotoAdjustments = (setPhotoScale, setPhotoPosX, setPhotoPosY) => {
  setPhotoScale(1);
  setPhotoPosX(0);
  setPhotoPosY(0);
};

// Add/remove event listeners for photo editing
export const setupPhotoEventListeners = (isEditingPhoto, handleMouseMove, handleMouseUp, photoWrapper) => {
  if (photoWrapper) {
    if (isEditingPhoto) {
      // Enable drag to reposition
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
  }

  return () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
};
