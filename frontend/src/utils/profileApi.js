// Profile API functions - extracted from Profile.js for better organization
import profileService from '../services/profileService';

// Format date to input format (YYYY-MM-DD)
export const formatDateToInput = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Normalize user data from API
export const normalizeUserData = (apiUser) => {
  const GENDER_MAP = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other', male: 'Male', female: 'Female' };
  const MARITAL_MAP = { SINGLE: 'Never Married', NEVER_MARRIED: 'Never Married', DIVORCED: 'Divorced', WIDOWED: 'Widowed', SEPARATED: 'Separated' };

  const normalized = { ...apiUser };
  normalized.gender = GENDER_MAP[apiUser.gender] || (apiUser.gender || '');
  normalized.maritalStatus = MARITAL_MAP[apiUser.maritalStatus] || (apiUser.maritalStatus || '');
  normalized.dateOfBirth = formatDateToInput(apiUser.dateOfBirth);
  
  // Ensure subscriptionTier defaults to FREE if null/undefined
  normalized.subscriptionTier = apiUser.subscriptionTier || 'FREE';

  ['income', 'complexion', 'familyValues', 'education', 'profession', 'country', 'city', 'state', 'bio', 'aboutFamily', 'raasi', 'natchathiram', 'dhosam', 'birthDate', 'birthTime', 'birthPlace'].forEach(key => {
    if (normalized[key] === null || typeof normalized[key] === 'undefined') normalized[key] = '';
  });

  return normalized;
};

// Fetch profile data from API
export const fetchProfile = async (setLoading, setError, reset, setProfileData, setAvailableCities, getCitiesForState) => {
  try {
    setLoading(true);
    const response = await profileService.getProfile();
    const apiUser = response.user || {};
    
    const normalized = normalizeUserData(apiUser);

    const stateForCities = normalized.state || apiUser.state || '';
    const citiesForState = stateForCities ? getCitiesForState(stateForCities) : [];
    if (apiUser.city && apiUser.city !== '' && !citiesForState.includes(apiUser.city)) {
      citiesForState.unshift(apiUser.city);
    }
    setAvailableCities(citiesForState);

    setProfileData(normalized);
    reset(normalized);
  } catch (error) {
    setError('Failed to load profile data');
  } finally {
    setLoading(false);
  }
};

// Update main profile
export const updateProfile = async (data, updateUser, setUploading, setError, setProfileData, setSuccess, setEditing, reset, toast) => {
  try {
    setUploading(true);
    setError('');
    setSuccess('');

    const response = await profileService.updateProfile(data);
    updateUser(response.user);
    
    const normalized = normalizeUserData(response.user);
    ['income', 'complexion', 'familyValues', 'education', 'profession', 'country', 'city', 'state', 'bio', 'aboutFamily', 'maritalStatus', 'gender'].forEach(key => {
      if (normalized[key] === null || typeof normalized[key] === 'undefined') normalized[key] = '';
    });
    setProfileData(normalized);
    setEditing(false);
    setSuccess('Profile updated successfully!');
    toast.success('Profile updated successfully!');
  } catch (error) {
    setError(error.response?.data?.error || 'Failed to update profile');
  } finally {
    setUploading(false);
  }
};

// Update horoscope
export const updateHoroscope = async (data, setUploading, setError, setProfileData, setEditingHoroscope, setSuccess, toast) => {
  try {
    setUploading(true);
    setError('');
    const response = await profileService.updateHoroscope(data);
    const updatedUser = response.user;
    setProfileData(prev => ({ ...prev, ...updatedUser }));
    setEditingHoroscope(false);
    setSuccess('Horoscope details updated successfully!');
    toast.success('Horoscope details updated!');
  } catch (error) {
    setError(error.response?.data?.error || 'Failed to update horoscope');
  } finally {
    setUploading(false);
  }
};

// Update family background
export const updateFamily = async (data, setUploading, setError, setProfileData, setEditingFamily, setSuccess, toast) => {
  try {
    setUploading(true);
    setError('');
    const response = await profileService.updateFamilyBackground(data);
    const updatedUser = response.user;
    setProfileData(prev => ({ ...prev, ...updatedUser }));
    setEditingFamily(false);
    setSuccess('Family background updated successfully!');
    toast.success('Family background updated!');
  } catch (error) {
    setError(error.response?.data?.error || 'Failed to update family background');
  } finally {
    setUploading(false);
  }
};

// Update subscription
export const updateSubscription = async (tier, setUploading, setError, setProfileData, setSuccess, toast, navigate, profileService) => {
  // Free tier doesn't require payment
  if (tier === 'FREE') {
    try {
      setUploading(true);
      setError('');
      const response = await profileService.updateSubscription({ subscriptionTier: tier });
      const updatedUser = response.user;
      setProfileData(prev => ({ ...prev, ...updatedUser }));
      setSuccess(`Subscription updated to ${tier} successfully!`);
      toast.success(`Subscription updated to ${tier}!`);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update subscription');
    } finally {
      setUploading(false);
    }
    return;
  }

  // For paid plans, redirect to manual payment page
  navigate(`/subscription?plan=${tier}`);
};

// Upload document
export const uploadDocument = async (file, selectedDocType, setDocumentUploading, setProfileData, setDocumentDialog, setSelectedDocType, toast) => {
  try {
    setDocumentUploading(true);
    const response = await profileService.uploadDocument(file, selectedDocType);
    setProfileData(prev => ({
      ...prev,
      documents: [...(prev.documents || []), response.document]
    }));
    setDocumentDialog(false);
    setSelectedDocType('');
    toast.success('Document uploaded successfully!');
  } catch (error) {
    throw error;
  } finally {
    setDocumentUploading(false);
  }
};

// Delete document
export const deleteDocument = async (docId, setProfileData, toast) => {
  try {
    await profileService.deleteDocument(docId);
    setProfileData(prev => ({
      ...prev,
      documents: prev.documents.filter(d => d.id !== docId)
    }));
    toast.success('Document deleted successfully!');
  } catch (error) {
    throw error;
  }
};

// Upload profile photo
export const uploadProfilePhoto = async (compressedFile, setUploading, setProfileData, updateUser, user, setImageToCrop, setIsCropDialogOpen, setPhotoScale, setPhotoPosX, setPhotoPosY, setIsEditingPhoto, toast) => {
  try {
    setUploading(true);
    const response = await profileService.uploadProfilePhoto(compressedFile);
    
    // Debug: Log the response to verify photo path
    console.log('Profile photo upload response:', response);
    
    // Ensure we have a valid profilePhoto in the response
    if (response.profilePhoto) {
      // Create a timestamp to force re-render
      const timestamp = Date.now();
      
      setProfileData(prev => ({ 
        ...prev, 
        profilePhoto: response.profilePhoto,
        profilePhotoScale: 1,
        profilePhotoX: 0,
        profilePhotoY: 0,
        _refresh: timestamp
      }));
      updateUser(user ? { ...user, profilePhoto: response.profilePhoto } : { profilePhoto: response.profilePhoto });
      
      // Reset zoom and position for the new image
      setPhotoScale(1);
      setPhotoPosX(0);
      setPhotoPosY(0);
      setIsEditingPhoto(true);
    } else {
      console.error('No profilePhoto in upload response:', response);
      toast.error('Photo uploaded but path not received. Please refresh the page.');
    }
    
    setIsCropDialogOpen(false);
    setImageToCrop(null);
    setIsEditingPhoto(true);
    setPhotoScale(1);
    setPhotoPosX(0);
    setPhotoPosY(0);
    toast.success('Profile photo updated! Adjust zoom and position as needed.');
  } catch (error) {
    throw error;
  } finally {
    setUploading(false);
  }
};

// Save photo adjustments
export const savePhotoAdjustments = async (photoScale, photoPosX, photoPosY, setUploading, setProfileData, setIsEditingPhoto, setError, toast) => {
  try {
    setUploading(true);
    const response = await profileService.saveProfilePhotoAdjustments({
      scale: photoScale,
      x: photoPosX,
      y: photoPosY
    });
    
    setProfileData(prev => ({
      ...prev,
      profilePhotoScale: response.user.profilePhotoScale,
      profilePhotoX: response.user.profilePhotoX,
      profilePhotoY: response.user.profilePhotoY
    }));
    
    setIsEditingPhoto(false);
    toast.success('Photo adjustments saved successfully!');
  } catch (error) {
    setError(error.response?.data?.error || 'Failed to save adjustments');
    toast.error('Failed to save adjustments');
  } finally {
    setUploading(false);
  }
};
