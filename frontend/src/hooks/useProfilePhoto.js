import { useState, useCallback } from 'react';
import profileService from '../services/profileService';
import toast from 'react-hot-toast';
import { compressImage, blobToFile } from '../utils/imageCompression';

/**
 * Custom hook for handling profile photo operations
 * Separated from Profile.js for better maintainability
 */
export const useProfilePhoto = (user, updateUser, setProfileData) => {
  const [uploading, setUploading] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  
  // Cropper states
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // Photo adjustment states
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [photoScale, setPhotoScale] = useState(1);
  const [photoPosX, setPhotoPosX] = useState(0);
  const [photoPosY, setPhotoPosY] = useState(0);
  
  // Photo element refs
  const [photoWrapper, setPhotoWrapper] = useState(null);
  const [photoImg, setPhotoImg] = useState(null);

  // Cropper helpers
  const getCroppedImg = useCallback(async (imageSrc, pixelCrop) => {
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
  }, []);

  const onCropComplete = useCallback((_area, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  // Handle photo selection from file input
  const handlePhotoSelect = useCallback((file) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageToCrop(e.target.result);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setIsCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Confirm crop and upload photo
  const handleConfirmCrop = useCallback(async (getCroppedImgFn) => {
    if (!croppedAreaPixels) {
      toast.error('Please adjust the crop area');
      return;
    }

    if (!imageToCrop) {
      toast.error('No image to crop');
      return;
    }

    try {
      setUploading(true);
      const croppedImageBlob = await getCroppedImgFn(imageToCrop, croppedAreaPixels);
      const compressedBlob = await compressImage(croppedImageBlob, 500 * 1024);
      const compressedFile = blobToFile(compressedBlob, 'profile.jpg');
      
      const response = await profileService.uploadProfilePhoto(compressedFile);
      
      // Debug: Log the response to verify photo path
      console.log('Profile photo upload response:', response);
      
      // Ensure we have a valid profilePhoto in the response
      if (response.profilePhoto) {
        // Create a timestamp to force re-render
        const timestamp = Date.now();
        
        setProfileData(prev => prev ? ({ 
          ...prev, 
          profilePhoto: response.profilePhoto,
          profilePhotoScale: 1,
          profilePhotoX: 0,
          profilePhotoY: 0,
          _refresh: timestamp
        }) : null);
        
        // Update user context with null check
        if (user) {
          updateUser({ ...user, profilePhoto: response.profilePhoto });
        } else {
          updateUser({ profilePhoto: response.profilePhoto });
        }
        
        // Reset zoom and position for the new image
        setPhotoScale(1);
        setPhotoPosX(0);
        setPhotoPosY(0);
        setIsEditingPhoto(true);
        
        toast.success('Profile photo updated! Adjust zoom and position as needed.');
      } else {
        console.error('No profilePhoto in upload response:', response);
        toast.error('Photo uploaded but path not received. Please refresh the page.');
      }
      
      setIsCropDialogOpen(false);
      setImageToCrop(null);
    } catch (error) {
      console.error('Photo upload error:', error);
      toast.error(error.response?.data?.error || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  }, [croppedAreaPixels, imageToCrop, getCroppedImg, setProfileData, user, updateUser]);

  // Save photo adjustments (scale, position)
  const handleSavePhotoAdjustments = useCallback(async () => {
    try {
      setUploading(true);
      const response = await profileService.saveProfilePhotoAdjustments({
        scale: photoScale,
        x: photoPosX,
        y: photoPosY
      });
      
      if (response && response.user) {
        setProfileData(prev => prev ? ({
          ...prev,
          profilePhotoScale: response.user.profilePhotoScale,
          profilePhotoX: response.user.profilePhotoX,
          profilePhotoY: response.user.profilePhotoY
        }) : null);
      }
      
      setIsEditingPhoto(false);
      toast.success('Photo adjustments saved successfully!');
    } catch (error) {
      console.error('Save adjustments error:', error);
      toast.error(error.response?.data?.error || 'Failed to save adjustments');
    } finally {
      setUploading(false);
    }
  }, [photoScale, photoPosX, photoPosY, setProfileData]);

  // Initialize photo adjustments from profile data
  const initializePhotoAdjustments = useCallback((profileData) => {
    if (profileData?.profilePhotoScale !== undefined) {
      setPhotoScale(profileData.profilePhotoScale || 1);
    }
    if (profileData?.profilePhotoX !== undefined) {
      setPhotoPosX(profileData.profilePhotoX || 0);
    }
    if (profileData?.profilePhotoY !== undefined) {
      setPhotoPosY(profileData.profilePhotoY || 0);
    }
  }, []);

  // Reset photo adjustments to saved values
  const resetPhotoAdjustments = useCallback((profileData) => {
    if (profileData?.profilePhotoScale !== undefined) {
      setPhotoScale(profileData.profilePhotoScale || 1);
    }
    if (profileData?.profilePhotoX !== undefined) {
      setPhotoPosX(profileData.profilePhotoX || 0);
    }
    if (profileData?.profilePhotoY !== undefined) {
      setPhotoPosY(profileData.profilePhotoY || 0);
    }
    setIsEditingPhoto(false);
  }, []);

  return {
    // State
    uploading,
    croppedAreaPixels,
    isCropDialogOpen,
    imageToCrop,
    crop,
    zoom,
    isEditingPhoto,
    photoScale,
    photoPosX,
    photoPosY,
    photoWrapper,
    photoImg,
    
    // Setters
    setCroppedAreaPixels,
    setIsCropDialogOpen,
    setImageToCrop,
    setCrop,
    setZoom,
    setIsEditingPhoto,
    setPhotoScale,
    setPhotoPosX,
    setPhotoPosY,
    setPhotoWrapper,
    setPhotoImg,
    
    // Functions
    getCroppedImg,
    onCropComplete,
    handlePhotoSelect,
    handleConfirmCrop,
    handleSavePhotoAdjustments,
    initializePhotoAdjustments,
    resetPhotoAdjustments
  };
};

export default useProfilePhoto;
