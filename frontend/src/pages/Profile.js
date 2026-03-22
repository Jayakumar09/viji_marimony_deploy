// Profile Page - Main Component
// Refactored to use modular components for better maintainability

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import Cropper from 'react-easy-crop';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress,
  Avatar,
  IconButton,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Edit,
  Person,
  Save,
  CameraAlt,
  Add,
  Verified,
  Star,
  Description,
  CheckCircle,
  Refresh
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import profileService from '../services/profileService';
import toast from 'react-hot-toast';
import { compressImage, blobToFile } from '../utils/imageCompression';
import { STATES, getCitiesForState, MAX_GALLERY_IMAGES } from '../data/indianLocations';
import { getImageUrl } from '../utils/imageUrl';
import {
  RAASI_CHOICES,
  NATCHATHIRAM_CHOICES,
  DHOSAM_CHOICES,
  getNatchathiramForRasi
} from '../data/horoscopeData';
import { SUBSCRIPTION_TIERS } from '../config/subscription';

// Import from modular files
import { getCroppedImg } from '../utils/profileUtils';
import {
  ProfilePhotoSection,
  BasicInfoSection,
  HoroscopeSection,
  FamilySection,
  DocumentsSection,
  GallerySection
} from './ProfileSections';

const DOCUMENT_TYPES = [
  { id: 'GOVERNMENT_ID', label: 'Government ID (Aadhaar, PAN, etc.)', required: true },
  { id: 'ADDRESS_PROOF', label: 'Proof of Current Address', required: true },
  { id: 'FINANCIAL_PROOF', label: 'Financial Verification (Bank Statement/ITR)', required: true },
  { id: 'PHOTO_ID', label: 'Photo ID Proof', required: true },
  { id: 'BIRTH_CERTIFICATE', label: 'Birth Certificate', required: false },
  { id: 'EDUCATION_CERTIFICATE', label: 'Education Certificate', required: false },
  { id: 'OTHER', label: 'Other Documents', required: false }
];

const PROFESSION_OPTIONS = [
  'Emgineer', // Keep misspelled option for legacy data
  'Accountant', 'Actor', 'Actuary', 'Admin Professional', 'Advocate', 'Agricultural Professional', 
  'Airline', 'Architect', 'Artisan', 'Artist', 'Auditor', 'Author', 'Banker', 'Beautician', 
  'Blogger', 'Business', 'Business Owner', 'Cabin Crew', 'Chef', 'Chartered Accountant', 
  'Civil Engineer', 'Coach', 'Consultant', 'Contractor', 'Corporate Professional', 'Cost Accountant', 
  'Creative Director', 'Customer Support', 'Cyclist', 'Dancer', 'Data Analyst', 'Data Scientist', 
  'Defense Employee', 'Dentist', 'Designer', 'Doctor', 'Economist', 'Engineer', 'Entrepreneur', 
  'Event Manager', 'Executive', 'Farmer', 'Fashion Designer', 'Film Director', 'Finance Professional', 
  'Financial Analyst', 'Fitness Trainer', 'Flight Attendant', 'Food Scientist', 'Freelancer', 
  'Government Employee', 'Graphic Designer', 'Hardware Engineer', 'Health Care Professional', 
  'Home Maker', 'Hotel Manager', 'HR Professional', 'Import/Export', 'Indian Police Service', 
  'Information Technology', 'Interior Designer', 'Investment Banker', 'IT Professional', 'Journalist', 
  'Lawyer', 'Lecturer', 'Legal Professional', 'Librarian', 'Logistics', 'Marketing Professional', 
  'Mechanical Engineer', 'Media Professional', 'Medical Professional', 'Merchant Navy', 'Model', 
  'Nurse', 'Nutritionist', 'Operations Manager', 'Optometrist', 'Pharmacist', 'Photographer', 
  'Physician', 'Physiotherapist', 'Pilot', 'Plant Manager', 'Plumber', 'Political', 'Politician', 
  'President', 'Private Sector', 'Professor', 'Programmer', 'Project Manager', 'Proprietor', 
  'Psychologist', 'Public Relations', 'Quality Assurance', 'Radiologist', 'Real Estate', 
  'Researcher', 'Retail Professional', 'Sales Professional', 'Scientist', 'Social Worker', 
  'Software Developer', 'Software Engineer', 'Sports Person', 'Student', 'Surgeon', 'Surveyor', 
  'System Administrator', 'System Analyst', 'Teacher', 'Technical Staff', 'Telecommunication', 
  'Therapist', 'Top Executive', 'Training', 'Transportation', 'Travel Agent', 'Travel Professional', 
  'Treasurer', 'Tuition', 'Veterinary Doctor', 'Video Editor', 'Visual Merchandiser', 'Volunteer', 
  'Web Designer', 'Writer', 'Other'
];

const Profile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState('');
  const [availableCities, setAvailableCities] = useState([]);
  const galleryInputRef = useRef(null);
  const isUploadingRef = useRef(false);

  // Tab state for profile sections
  const [activeTab, setActiveTab] = useState(0);

  // Editing states for different sections
  const [editingHoroscope, setEditingHoroscope] = useState(false);
  const [editingFamily, setEditingFamily] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(false);
  const [editingDocuments, setEditingDocuments] = useState(false);

  // Document upload dialog
  const [documentDialog, setDocumentDialog] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [documentUploading, setDocumentUploading] = useState(false);
  const documentInputRef = useRef(null);

  // Cropper states
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);

  // Profile photo zoom/pan adjustment states
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [photoScale, setPhotoScale] = useState(1);
  const [photoPosX, setPhotoPosX] = useState(0);
  const [photoPosY, setPhotoPosY] = useState(0);
  const [photoWrapper, setPhotoWrapper] = useState(null);
  const [photoImg, setPhotoImg] = useState(null);

  const { register, handleSubmit, reset, watch, control, formState: { errors }, setValue } = useForm();
  
  // Watch state and rasi fields for dependent dropdowns
  const selectedState = watch('state');
  const selectedRasi = watch('raasi');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchProfile();
  }, [user, navigate]);

  // Auto-refresh profile when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log('[Profile] Visibility changed:', document.visibilityState);
      if (document.visibilityState === 'visible') {
        // Refresh profile data when user switches back to this tab
        fetchProfile();
      }
    };

    // Also handle window focus event as backup
    const handleFocus = () => {
      console.log('[Profile] Window focused');
      fetchProfile();
    };

    // Polling fallback - check every 30 seconds as backup
    const pollingInterval = setInterval(() => {
      console.log('[Profile] Polling refresh');
      fetchProfile();
    }, 30000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(pollingInterval);
    };
  }, []);

  // Update available cities when state changes
  useEffect(() => {
    if (selectedState) {
      setAvailableCities(getCitiesForState(selectedState));
    }
  }, [selectedState]);

  // Update natchathiram when rasi changes
  useEffect(() => {
    if (selectedRasi) {
      const currentNatchathiram = watch('natchathiram');
      const availableNatchathiram = getNatchathiramForRasi(selectedRasi);
      const isValidNatchathiram = availableNatchathiram.some(n => n.value === currentNatchathiram);
      if (!isValidNatchathiram) {
        setValue('natchathiram', '');
      }
    }
  }, [selectedRasi, setValue, watch]);

  // Format date helper
  const formatDateToInput = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await profileService.getProfile();
      const apiUser = response.user || {};

      const GENDER_MAP = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other', male: 'Male', female: 'Female' };
      const MARITAL_MAP = { SINGLE: 'Never Married', NEVER_MARRIED: 'Never Married', DIVORCED: 'Divorced', WIDOWED: 'Widowed', SEPARATED: 'Separated' };

      const normalized = { ...apiUser };
      normalized.gender = GENDER_MAP[apiUser.gender] || (apiUser.gender || '');
      normalized.maritalStatus = MARITAL_MAP[apiUser.maritalStatus] || (apiUser.maritalStatus || '');
      normalized.dateOfBirth = formatDateToInput(apiUser.dateOfBirth);
      
      // Ensure subscriptionTier defaults to FREE if null/undefined
      normalized.subscriptionTier = apiUser.subscriptionTier || 'FREE';

      ['income', 'complexion', 'familyValues', 'familyType', 'familyStatus', 'education', 'profession', 'country', 'city', 'state', 'bio', 'aboutFamily', 'raasi', 'natchathiram', 'dhosam', 'birthDate', 'birthTime', 'birthPlace', 'fatherName', 'fatherOccupation', 'fatherCaste', 'motherName', 'motherOccupation', 'motherCaste', 'physicalStatus', 'drinkingHabit', 'smokingHabit', 'diet'].forEach(key => {
        if (normalized[key] === null || typeof normalized[key] === 'undefined') normalized[key] = '';
      });

      // Ensure email and phone are available (they come from auth user, not profile)
      normalized.email = apiUser.email || user?.email || '';
      normalized.phone = apiUser.phone || apiUser.mobile || user?.phone || user?.mobile || '';
      normalized.customId = apiUser.customId || user?.customId || apiUser.userId || user?.id || '';

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

  const handleUpdateProfile = async (data) => {
    try {
      setUploading(true);
      setError('');
      setSuccess('');

      const response = await profileService.updateProfile(data);
      updateUser(response.user);
      
      const normalized = { 
        ...profileData, // Preserve existing photo fields and other data
        ...response.user, // Override with updated data
      };
      normalized.dateOfBirth = formatDateToInput(response.user.dateOfBirth);
      ['income', 'complexion', 'familyValues', 'familyType', 'familyStatus', 'education', 'profession', 'country', 'city', 'state', 'bio', 'aboutFamily', 'maritalStatus', 'gender'].forEach(key => {
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

  // ============ HOROSCOPE ============
  const handleUpdateHoroscope = async (data) => {
    try {
      setUploading(true);
      setError('');
      const response = await profileService.updateHoroscope(data);
      const updatedUser = response.user;
      setProfileData(prev => ({ ...prev, ...updatedUser }));
      updateUser(updatedUser); // Update AuthContext for Dashboard
      setEditingHoroscope(false);
      setSuccess('Horoscope details updated successfully!');
      toast.success('Horoscope details updated!');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update horoscope');
    } finally {
      setUploading(false);
    }
  };

  // ============ FAMILY BACKGROUND ============
  const handleUpdateFamily = async (data) => {
    try {
      setUploading(true);
      setError('');
      const response = await profileService.updateFamilyBackground(data);
      const updatedUser = response.user;
      setProfileData(prev => ({ ...prev, ...updatedUser }));
      updateUser(updatedUser); // Update AuthContext for Dashboard
      setEditingFamily(false);
      setSuccess('Family background updated successfully!');
      toast.success('Family background updated!');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update family background');
    } finally {
      setUploading(false);
    }
  };

  // ============ SUBSCRIPTION ============
  const handleUpdateSubscription = async (tier) => {
    if (tier === 'FREE') {
      try {
        setUploading(true);
        setError('');
        const response = await profileService.updateSubscription({ subscriptionTier: tier });
        const updatedUser = response.user;
        setProfileData(prev => ({ ...prev, ...updatedUser }));
        updateUser(updatedUser); // Update AuthContext for Dashboard
        setSuccess(`Subscription updated to ${tier} successfully!`);
        toast.success(`Subscription updated to ${tier}!`);
      } catch (error) {
        setError(error.response?.data?.error || 'Failed to update subscription');
      } finally {
        setUploading(false);
      }
      return;
    }
    navigate(`/subscription?plan=${tier}`);
  };

  // ============ DOCUMENTS ============
  const handleDocumentUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedDocType) return;

    try {
      setDocumentUploading(true);
      const response = await profileService.uploadDocument(file, selectedDocType);
      
      // Update documents in profile data - replace existing doc of same type or add new
      setProfileData(prev => {
        const existingDocs = prev.documents || [];
        const filteredDocs = existingDocs.filter(d => d.documentType !== selectedDocType);
        return {
          ...prev,
          documents: [...filteredDocs, response.document]
        };
      });
      
      setDocumentDialog(false);
      setSelectedDocType('');
      toast.success('Document uploaded successfully!');
      
      // Refresh profile to get latest data
      fetchProfile();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to upload document');
    } finally {
      setDocumentUploading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    try {
      await profileService.deleteDocument(docId);
      setProfileData(prev => ({
        ...prev,
        documents: prev.documents.filter(d => d.id !== docId)
      }));
      toast.success('Document deleted successfully!');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to delete document');
    }
  };

  // Cropper handlers
  const onCropComplete = useCallback((_area, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleProfilePhotoSelect = (event) => {
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

  const handleConfirmCrop = async () => {
    if (!croppedAreaPixels) {
      toast.error('Please adjust the crop area');
      return;
    }

    try {
      setUploading(true);
      const croppedImageBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      const compressedBlob = await compressImage(croppedImageBlob, 500 * 1024);
      const compressedFile = blobToFile(compressedBlob, 'profile.jpg');
      
      const response = await profileService.uploadProfilePhoto(compressedFile);
      
      console.log('Profile photo upload response:', response);
      
      if (response.profilePhoto) {
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
      setError(error.response?.data?.error || 'Failed to upload photo');
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  // ============ PROFILE PHOTO PAN ADJUSTMENTS ============
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
    setPhotoPosX(e.clientX - startX);
    setPhotoPosY(e.clientY - startY);
  };

  const handleMouseUp = () => {
    isDragging = false;
  };

  const resetPhotoAdjustments = () => {
    setPhotoScale(1);
    setPhotoPosX(0);
    setPhotoPosY(0);
  };

  const savePhotoAdjustments = async () => {
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

  // Initialize photo adjustments from profile data
  useEffect(() => {
    if (profileData?.profilePhotoScale !== undefined) {
      setPhotoScale(profileData.profilePhotoScale || 1);
    }
    if (profileData?.profilePhotoX !== undefined) {
      setPhotoPosX(profileData.profilePhotoX || 0);
    }
    if (profileData?.profilePhotoY !== undefined) {
      setPhotoPosY(profileData.profilePhotoY || 0);
    }
  }, [profileData]);

  // Add/remove event listeners for photo editing
  useEffect(() => {
    if (photoWrapper) {
      if (isEditingPhoto) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      } else {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }
    }
    
    return () => {
      if (photoWrapper) {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }
    };
  }, [isEditingPhoto, photoWrapper]);

  // Handle photo upload - enable editing mode
  const handleNewPhotoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageToCrop(e.target.result);
        setCrop({ x: 0, y: 0 });
        setIsCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    if (isUploadingRef.current) return;

    const currentPhotos = profileData?.photos || [];
    if (currentPhotos.length + files.length > MAX_GALLERY_IMAGES) {
      setError(`Maximum ${MAX_GALLERY_IMAGES} photos allowed in gallery.`);
      return;
    }

    try {
      isUploadingRef.current = true;
      setUploading(true);
      setError('');
      
      const compressedFiles = [];
      for (const file of files) {
        const compressedBlob = await compressImage(file, 500 * 1024);
        const compressedFile = blobToFile(compressedBlob, file.name);
        compressedFiles.push(compressedFile);
      }
      
      const response = await profileService.uploadGalleryPhotos(compressedFiles);
      setProfileData(prev => ({ ...prev, photos: response.photos }));
      updateUser(user ? { ...user, photos: response.photos } : { photos: response.photos });
      toast.success('Gallery photos uploaded successfully!');
      
      if (galleryInputRef.current) {
        galleryInputRef.current.value = '';
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to upload photos');
      toast.error('Failed to upload photos');
    } finally {
      isUploadingRef.current = false;
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoUrl) => {
    setPhotoToDelete(photoUrl);
    setDeleteDialog(true);
  };

  const confirmDeletePhoto = async () => {
    try {
      await profileService.deletePhoto(photoToDelete);
      const updatedPhotos = profileData.photos.filter(photo => photo !== photoToDelete);
      setProfileData(prev => ({ ...prev, photos: updatedPhotos }));
      updateUser(user ? { ...user, photos: updatedPhotos } : { photos: updatedPhotos });
      toast.success('Photo deleted successfully!');
      setDeleteDialog(false);
      setPhotoToDelete('');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to delete photo');
    }
  };

  if (loading && !profileData) {
    return (
      <Container maxWidth="md" style={{ marginTop: '2rem' }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" style={{ marginTop: '2rem', paddingBottom: '2rem' }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" fontWeight="bold" color="#8B5CF6">
            My Profile
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchProfile}
              disabled={loading}
              sx={{ borderColor: '#8B5CF6', color: '#8B5CF6', mr: 1 }}
            >
              Refresh
            </Button>
            {!editing && (
              <Button
                variant="contained"
                startIcon={<Edit />}
                onClick={() => setEditing(true)}
                sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' }, mr: 1 }}
              >
                Edit Profile
              </Button>
            )}
            {profileData?.subscriptionTier === 'FREE' && (
              <Button
                variant="outlined"
                onClick={() => navigate('/subscription')}
                sx={{ borderColor: '#8B5CF6', color: '#8B5CF6' }}
              >
                Upgrade
              </Button>
            )}
          </Box>
        </Box>

        {/* Profile Photo Section using modular component */}
        <ProfilePhotoSection
          profileData={profileData}
          isEditingPhoto={isEditingPhoto}
          photoScale={photoScale}
          photoPosX={photoPosX}
          photoPosY={photoPosY}
          photoWrapper={photoWrapper}
          photoImg={photoImg}
          uploading={uploading}
          isCropDialogOpen={isCropDialogOpen}
          imageToCrop={imageToCrop}
          crop={crop}
          croppedAreaPixels={croppedAreaPixels}
          onPhotoSelect={handleProfilePhotoSelect}
          onConfirmCrop={handleConfirmCrop}
          onCancelCrop={() => { setIsCropDialogOpen(false); setImageToCrop(null); }}
          onCropComplete={onCropComplete}
          setCrop={setCrop}
          setImageToCrop={setImageToCrop}
          setIsCropDialogOpen={setIsCropDialogOpen}
          setPhotoScale={setPhotoScale}
          setPhotoPosX={setPhotoPosX}
          setPhotoPosY={setPhotoPosY}
          resetPhotoAdjustments={resetPhotoAdjustments}
          savePhotoAdjustments={savePhotoAdjustments}
          setIsEditingPhoto={setIsEditingPhoto}
          handleMouseDown={handleMouseDown}
          handleMouseUp={handleMouseUp}
        />

        {/* Customer ID below profile photo */}
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Customer ID: <strong>{profileData?.customId || user?.customId || profileData?.userId || user?.id || 'N/A'}</strong>
          </Typography>
        </Box>

        {/* Tabs */}
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ mt: 3, borderBottom: 1, borderColor: 'divider' }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Basic Info" />
          <Tab label="Horoscope" />
          <Tab label="Family" />
          <Tab label="Gallery" />
          <Tab label="Documents" />
        </Tabs>

        {/* Tab Panels */}
        {activeTab === 0 && (
          <Box sx={{ pt: 3 }}>
            {/* Basic Info using modular component */}
            <BasicInfoSection
              register={register}
              errors={errors}
              editing={editing}
              control={control}
              profileData={profileData}
            />
            
            {/* Additional Basic Info Fields */}
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="state"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>State</InputLabel>
                      <Select
                        {...field}
                        label="State"
                        disabled={!editing}
                        value={field.value || ''}
                        onChange={(e) => {
                          field.onChange(e);
                          setValue('state', e.target.value);
                          setValue('city', '');
                        }}
                      >
                        {STATES.map(state => (
                          <MenuItem key={state} value={state}>{state}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="city"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>City</InputLabel>
                      <Select
                        {...field}
                        label="City"
                        disabled={!editing}
                        value={field.value || ''}
                      >
                        {availableCities.map(city => (
                          <MenuItem key={city} value={city}>{city}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Country"
                  {...register('country')}
                  disabled={!editing}
                  defaultValue="India"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="education"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Education</InputLabel>
                      <Select
                        {...field}
                        label="Education"
                        disabled={!editing}
                        value={field.value || ''}
                      >
                        <MenuItem value="High School">High School</MenuItem>
                        <MenuItem value="Intermediate">Intermediate</MenuItem>
                        <MenuItem value="Diploma">Diploma</MenuItem>
                        <MenuItem value="Bachelor's Degree">Bachelor's Degree</MenuItem>
                        <MenuItem value="Master's Degree">Master's Degree</MenuItem>
                        <MenuItem value="Doctorate">Doctorate</MenuItem>
                        <MenuItem value="Other">Other</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="profession"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Profession</InputLabel>
                      <Select
                        {...field}
                        label="Profession"
                        disabled={!editing}
                        value={field.value || ''}
                      >
                        {PROFESSION_OPTIONS.map(prof => (
                          <MenuItem key={prof} value={prof}>{prof}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="income"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Annual Income</InputLabel>
                      <Select
                        {...field}
                        label="Annual Income"
                        disabled={!editing}
                        value={field.value || ''}
                      >
                        <MenuItem value="Below 1 Lakh">Below 1 Lakh</MenuItem>
                        <MenuItem value="1-3 Lakhs">1-3 Lakhs</MenuItem>
                        <MenuItem value="3-5 Lakhs">3-5 Lakhs</MenuItem>
                        <MenuItem value="5-10 Lakhs">5-10 Lakhs</MenuItem>
                        <MenuItem value="10-20 Lakhs">10-20 Lakhs</MenuItem>
                        <MenuItem value="Above 20 Lakhs">Above 20 Lakhs</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="About Me"
                  {...register('bio')}
                  disabled={!editing}
                />
              </Grid>
            </Grid>

            {/* Save/Cancel buttons */}
            {editing && (
              <Box display="flex" gap={2} justifyContent="flex-end" sx={{ mt: 3 }}>
                <Button onClick={() => { setEditing(false); reset(profileData); }}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  onClick={handleSubmit(handleUpdateProfile)}
                  disabled={uploading}
                  sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}
                >
                  {uploading ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}
                </Button>
              </Box>
            )}
          </Box>
        )}

        {activeTab === 1 && (
          <Box sx={{ pt: 3 }}>
            {/* Horoscope using modular component */}
            <HoroscopeSection
              profileData={profileData}
              editingHoroscope={editingHoroscope}
              setEditingHoroscope={setEditingHoroscope}
              register={register}
              control={control}
              errors={errors}
              watch={watch}
              onSave={handleSubmit(handleUpdateHoroscope)}
            />
          </Box>
        )}

        {activeTab === 2 && (
          <Box sx={{ pt: 3 }}>
            {/* Family using modular component */}
            <FamilySection
              profileData={profileData}
              editingFamily={editingFamily}
              setEditingFamily={setEditingFamily}
              register={register}
              errors={errors}
              control={control}
              onSave={handleSubmit(handleUpdateFamily)}
            />
          </Box>
        )}

        {activeTab === 3 && (
          <Box sx={{ pt: 3 }}>
            {/* Gallery using modular component */}
            <GallerySection
              profileData={profileData}
              editing={editing}
              uploading={uploading}
              galleryInputRef={galleryInputRef}
              onUpload={handleGalleryUpload}
              onDelete={handleDeletePhoto}
              MAX_GALLERY_IMAGES={MAX_GALLERY_IMAGES}
            />
          </Box>
        )}

        {activeTab === 4 && (
          <Box sx={{ pt: 3 }}>
            {/* Documents using modular component */}
            <DocumentsSection
              profileData={profileData}
              documentDialog={documentDialog}
              setDocumentDialog={setDocumentDialog}
              selectedDocType={selectedDocType}
              setSelectedDocType={setSelectedDocType}
              documentUploading={documentUploading}
              documentInputRef={documentInputRef}
              onUpload={handleDocumentUpload}
              onDelete={handleDeleteDocument}
              DOCUMENT_TYPES={DOCUMENT_TYPES}
            />
          </Box>
        )}
      </Paper>

      {/* Delete Photo Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete Photo</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this photo?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={confirmDeletePhoto} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Document Upload Dialog */}
      <Dialog open={documentDialog} onClose={() => setDocumentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Document Type</InputLabel>
            <Select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              label="Document Type"
            >
              {DOCUMENT_TYPES.map((doc) => (
                <MenuItem key={doc.id} value={doc.id}>{doc.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              component="label"
              disabled={!selectedDocType || documentUploading}
            >
              {documentUploading ? <CircularProgress size={24} /> : 'Select File'}
              <input
                type="file"
                ref={documentInputRef}
                onChange={handleDocumentUpload}
                accept=".pdf,.jpg,.jpeg,.png"
                hidden
              />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocumentDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Photo Cropper Dialog */}
      <Dialog open={isCropDialogOpen} onClose={() => setIsCropDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adjust Profile Photo</DialogTitle>
        <DialogContent>
          <Box sx={{ position: 'relative', height: 400, bgcolor: '#1a1a1a', borderRadius: 1, overflow: 'hidden' }}>
            <Cropper image={imageToCrop} crop={crop} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} cropShape="round" showGrid={false} />
          </Box>
          
          <Box sx={{ px: 2, mt: 2 }}>
            <Typography variant="caption" color="textSecondary" display="block" textAlign="center">Drag to reposition, then crop</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setIsCropDialogOpen(false); setImageToCrop(null); }}>Cancel</Button>
          <Button onClick={handleConfirmCrop} variant="contained" disabled={uploading} sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}>
            {uploading ? <CircularProgress size={24} color="inherit" /> : 'Save & Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Profile;
