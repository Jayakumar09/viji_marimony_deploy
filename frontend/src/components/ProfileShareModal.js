/**
 * Profile Share Modal Component
 * 
 * Provides options to share user profile:
 * - Myself: Full profile with all details
 * - To Other: Sanitized profile (phone/email removed)
 * 
 * Features:
 * - PDF generation with watermark
 * - WhatsApp sharing
 * - Email sharing
 * 
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  TextField,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Collapse
} from '@mui/material';
import {
  Person,
  Share,
  WhatsApp,
  Email,
  PictureAsPdf,
  Close,
  Info,
  CheckCircle,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import {
  downloadProfilePDF,
  getProfilePDFBlob,
  shareViaWhatsApp,
  sanitizeUserData
} from '../utils/profilePDFGenerator';
import api from '../services/api';
import profileService from '../services/profileService';
import toast from 'react-hot-toast';

// Activity logging helper function
const logActivity = async (action, details) => {
  try {
    const adminToken = localStorage.getItem('adminToken');
    await api.post('/activity-logs', {
      actor_type: 'ADMIN',
      actor_id: 'admin',
      action: action,
      status: 'Success',
      details: JSON.stringify(details),
      resource_type: 'USER',
      resource_id: details.userId || details.userCustomId || null,
    }, {
      headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {}
    });
  } catch (error) {
    console.error('Activity log error:', error);
  }
};

// Helper function to open mailto and download PDF
const openMailtoWithPdf = async (email, profileName, pdfBlob) => {
  const subject = encodeURIComponent(`${profileName}'s Profile - Vijayalakshmi Boyar Matrimony`);
  const body = encodeURIComponent(`Please find attached the profile of ${profileName}.\n\nRegards,\nVijayalakshmi Boyar Matrimony\n\nNote: A PDF profile has been downloaded. Please attach it to your email.`);
  
  // Download the PDF
  const url = window.URL.createObjectURL(new Blob([pdfBlob]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${profileName.replace(/\s+/g, '_')}_Profile.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  
  // Open mailto after a short delay
  setTimeout(() => {
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  }, 500);
};

const ProfileShareModal = ({ open, onClose, userId, userName }) => {
  const [shareOption, setShareOption] = useState('myself');
  const [email, setEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [sanitizedPreview, setSanitizedPreview] = useState(null);
  const [pageCount, setPageCount] = useState(null);

  // Fetch full profile data when modal opens
  useEffect(() => {
    if (open && userId) {
      fetchProfileData();
      fetchPageCount();
    }
  }, [open, userId]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      // First try admin API for full profile data (includes phone/email)
      const response = await api.get(`/admin/users/${userId}/profile`).catch(() => null);
      
      if (response?.data) {
        // Admin API returns: { success: true, data: { personalDetails: {...}, ... } }
        // Extract the actual data object
        const responseData = response.data.data || response.data;
        const adminData = responseData.personalDetails ? responseData : (response.data.profile || responseData);
        
        if (adminData && (adminData.personalDetails || adminData.firstName)) {
          // DEBUG: Log what we're receiving
          console.log('Admin API response - adminData:', adminData);
          console.log('Has customId in personalDetails?', adminData.personalDetails?.customId);
          
          // Flatten the nested structure from admin API
          const flatData = {
            ...adminData, // Include top-level fields
            ...(adminData.personalDetails || {}),
            ...(adminData.locationDetails || {}),
            ...(adminData.professionalDetails || {}),
            ...(adminData.familyDetails || {}),
            ...(adminData.horoscopeDetails || {}),
            profilePhoto: adminData.profilePhoto,
            isVerified: adminData.verificationDetails?.isVerified,
            isPremium: adminData.accountStatus?.isPremium,
          };
          
          // DEBUG: Log flattened data
          console.log('Flat data - customId:', flatData.customId, 'firstName:', flatData.firstName);
          
          // Map field name differences
          flatData.dateOfBirth = flatData.birthDate || flatData.dateOfBirth;
          flatData.rashi = flatData.raasi || flatData.rashi;
          flatData.nakshatra = flatData.natchathiram || flatData.nakshatra;
          flatData.manglik = flatData.dhosam || flatData.manglik;
          flatData.aboutMe = flatData.bio || flatData.aboutMe;
          flatData.annualIncome = flatData.income;
          
          setProfileData(flatData);
        } else {
          // Handle direct user data response
          setProfileData(adminData);
        }
      } else {
        // Fallback: Try search API for profile data
        try {
          const searchResponse = await api.get(`/search/${userId}`);
          if (searchResponse.data?.profile) {
            setProfileData(searchResponse.data.profile);
          } else {
            toast.error('Unable to fetch full profile data');
          }
        } catch (searchError) {
          console.error('Fallback search API failed:', searchError);
          toast.error('Failed to load profile data');
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch page count for PDF preview
  const fetchPageCount = async () => {
    try {
      const pageInfo = await profileService.getPageCount(userId);
      setPageCount(pageInfo);
    } catch (error) {
      console.error('Failed to fetch page count:', error);
      setPageCount(null);
    }
  };

  // Update sanitized preview when share option changes
  useEffect(() => {
    if (profileData && shareOption === 'other') {
      setSanitizedPreview(sanitizeUserData(profileData));
    } else {
      setSanitizedPreview(null);
    }
  }, [shareOption, profileData]);

  const handleShareOptionChange = (event) => {
    setShareOption(event.target.value);
  };

  const handleDownloadPDF = async () => {
    if (!profileData) {
      toast.error('Profile data not loaded');
      return;
    }

    setDownloadLoading(true);
    try {
      const isSanitized = shareOption === 'other';
      const pdfBlob = await profileService.downloadProfilePdf(userId, isSanitized);
      
      const firstName = profileData.firstName || '';
      const lastName = profileData.lastName || '';
      const customId = profileData.customId;
      
      let filename;
      if (customId && customId.length > 0 && customId.length < 30) {
        filename = `${customId}_Profile.pdf`;
      } else {
        const cleanName = `${firstName}${lastName ? lastName.charAt(0).toUpperCase() + lastName.slice(1) : ''}`.replace(/\s+/g, '');
        filename = cleanName ? `${cleanName}_Profile.pdf` : `Profile_${userId.slice(-8).toUpperCase()}_Profile.pdf`;
      }
      
      const url = window.URL.createObjectURL(new Blob([pdfBlob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF download error:', error);
      const isSanitized = shareOption === 'other';
      downloadProfilePDF(profileData, isSanitized);
      toast.success('PDF downloaded successfully!');
    } finally {
      setDownloadLoading(false);
      
      await logActivity('DOWNLOAD_PROFILE_PDF', {
        userId: userId,
        userCustomId: profileData?.customId,
        userName: profileData?.firstName,
        shareType: shareOption,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Send WhatsApp direct message with PDF link
  const handleWhatsAppShare = async () => {
    if (!whatsappNumber) {
      toast.error('Please enter WhatsApp number');
      return;
    }

    // Clean the WhatsApp number
    let cleanNumber = whatsappNumber.replace(/[\s\-\(\)]/g, '');
    if (cleanNumber.startsWith('+')) {
      cleanNumber = cleanNumber.substring(1);
    }
    if (cleanNumber.startsWith('91') && cleanNumber.length > 10) {
      cleanNumber = cleanNumber.substring(2);
    }

    if (cleanNumber.length < 10) {
      toast.error('Please enter a valid WhatsApp number');
      return;
    }

    if (!profileData) {
      toast.error('Profile data not loaded');
      return;
    }

    setWhatsappLoading(true);
    const isSanitized = shareOption === 'other';

    try {
      const baseUrl = 'https://vijayalakshmimarriage.com';
      const pdfLink = `${baseUrl}/api/shared-profile/${userId}?sanitize=${isSanitized}`;
      const profileLink = `${baseUrl}/profile/${userId}?sanitize=${isSanitized}`;

      const firstName = profileData.firstName || '';
      const lastName = profileData.lastName || '';
      const name = `${firstName} ${lastName}`.trim();

      // Build message without emojis to avoid encoding issues
      let shareMessage = `${name}'s Profile - Vijayalakshmi Boyar Matrimony\n\n`;
      shareMessage += `-----------------------------\n`;

      if (profileData.age) shareMessage += `Age: ${profileData.age} years\n`;
      if (profileData.gender) shareMessage += `Gender: ${profileData.gender}\n`;
      if (profileData.height) shareMessage += `Height: ${profileData.height}\n`;
      if (profileData.complexion) shareMessage += `Complexion: ${profileData.complexion}\n`;
      if (profileData.community) shareMessage += `Community: ${profileData.community}\n`;
      if (profileData.subCaste) shareMessage += `Sub Caste: ${profileData.subCaste}\n`;
      if (profileData.education) shareMessage += `Education: ${profileData.education}\n`;
      if (profileData.profession) shareMessage += `Profession: ${profileData.profession}\n`;
      if (profileData.city || profileData.state) shareMessage += `Location: ${[profileData.city, profileData.state].filter(Boolean).join(', ')}\n`;
      if (profileData.maritalStatus) shareMessage += `Marital Status: ${profileData.maritalStatus}\n`;

      shareMessage += `-----------------------------\n\n`;
      shareMessage += `Vijayalakshmi Boyar Matrimony\n`;
      shareMessage += `View Profile: ${profileLink}\n`;
      shareMessage += `Download PDF: ${pdfLink}\n\n`;
      shareMessage += `Regards,\nVijayalakshmi Boyar Matrimony`;

      // Open WhatsApp with direct message
      const whatsappUrl = `https://wa.me/91${cleanNumber}?text=${encodeURIComponent(shareMessage)}`;
      window.open(whatsappUrl, '_blank');

      // Log activity
      await logActivity('SHARE_PROFILE_WHATSAPP', {
        userId: userId,
        userCustomId: profileData?.customId,
        userName: profileData?.firstName,
        shareType: shareOption,
        recipientType: 'whatsapp',
        recipientNumber: `91${cleanNumber}`,
        timestamp: new Date().toISOString()
      });

      toast.success('WhatsApp opened with profile message!');
      setWhatsappNumber('');
    } catch (error) {
      console.error('WhatsApp share error:', error);
      toast.error('Failed to share. Please try again.');
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleEmailShare = async () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!profileData) {
      toast.error('Profile data not loaded');
      return;
    }

    setEmailLoading(true);
    
    const firstName = profileData.firstName || '';
    const lastName = profileData.lastName || '';
    const customId = profileData.customId;
    let profileName;
    if (customId && customId.length > 0 && customId.length < 30) {
      profileName = customId;
    } else {
      profileName = `${firstName}${lastName ? lastName.charAt(0).toUpperCase() + lastName.slice(1) : ''}`.replace(/\s+/g, '') || 'Profile';
    }
    
    try {
      const isSanitized = shareOption === 'other';
      
      // Download PDF
      let pdfBlob;
      try {
        pdfBlob = await profileService.downloadProfilePdf(userId, isSanitized);
      } catch {
        pdfBlob = getProfilePDFBlob(profileData, isSanitized);
      }
      
      // Use mailto + download PDF fallback (skip slow SMTP API)
      await openMailtoWithPdf(email, profileName, pdfBlob);
      
      await logActivity('SHARE_PROFILE_EMAIL', {
        userId: userId,
        userCustomId: profileData?.customId,
        userName: profileData?.firstName,
        shareType: shareOption,
        recipientEmail: email,
        method: 'mailto_with_pdf',
        timestamp: new Date().toISOString()
      });
      
      setEmail('');
      toast.success('Email ready! PDF downloaded. Please send email.');
    } catch (error) {
      console.error('Email share error:', error);
      toast.error('Failed to share. Please try again.');
      setEmailLoading(false);
    }
  };

  const handleClose = () => {
    setShareOption('myself');
    setEmail('');
    setWhatsappNumber('');
    setPreviewMode(false);
    onClose();
  };

  const getShareOptionDescription = () => {
    if (shareOption === 'myself') {
      return {
        title: 'Full Profile (For Myself)',
        description: 'Includes all profile details including phone number and email address.',
        icon: <Visibility color="primary" />,
        color: 'primary'
      };
    }
    return {
      title: 'Sanitized Profile (For Others)',
      description: 'Phone number and email will be removed for privacy. Suitable for sharing with potential matches.',
      icon: <VisibilityOff color="warning" />,
      color: 'warning'
    };
  };

  const optionInfo = getShareOptionDescription();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: '#8B5CF6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Share sx={{ color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Share Profile
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {userName || 'User Profile'}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 3 }}>
        {loading && !profileData ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Share Option Selection */}
            <FormControl component="fieldset" sx={{ width: '100%', mb: 3 }}>
              <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
                Who are you sharing with?
              </FormLabel>
              <RadioGroup
                value={shareOption}
                onChange={handleShareOptionChange}
                sx={{ gap: 2 }}
              >
                <Card
                  sx={{
                    border: shareOption === 'myself' ? '2px solid #8B5CF6' : '1px solid #e0e0e0',
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: '#8B5CF6' }
                  }}
                  onClick={() => setShareOption('myself')}
                >
                  <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, py: 2 }}>
                    <Radio value="myself" checked={shareOption === 'myself'} />
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Person color="primary" />
                        <Typography fontWeight={600}>Myself</Typography>
                      </Box>
                      <Typography variant="body2" color="textSecondary">
                        Full profile with all contact details (phone, email included)
                      </Typography>
                    </Box>
                    {shareOption === 'myself' && (
                      <CheckCircle color="primary" sx={{ mt: 0.5 }} />
                    )}
                  </CardContent>
                </Card>

                <Card
                  sx={{
                    border: shareOption === 'other' ? '2px solid #8B5CF6' : '1px solid #e0e0e0',
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: '#8B5CF6' }
                  }}
                  onClick={() => setShareOption('other')}
                >
                  <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, py: 2 }}>
                    <Radio value="other" checked={shareOption === 'other'} />
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Share color="warning" />
                        <Typography fontWeight={600}>To Other</Typography>
                        <Chip label="Privacy Protected" size="small" color="warning" sx={{ height: 20, fontSize: 10 }} />
                      </Box>
                      <Typography variant="body2" color="textSecondary">
                        Sanitized profile - phone and email will be removed
                      </Typography>
                    </Box>
                    {shareOption === 'other' && (
                      <CheckCircle color="primary" sx={{ mt: 0.5 }} />
                    )}
                  </CardContent>
                </Card>
              </RadioGroup>
            </FormControl>

            {/* Info Alert */}
            <Alert 
              severity={shareOption === 'other' ? 'warning' : 'info'} 
              icon={optionInfo.icon}
              sx={{ mb: 3, borderRadius: 2 }}
            >
              <Typography variant="body2">
                <strong>{optionInfo.title}</strong>
                <br />
                {optionInfo.description}
              </Typography>
            </Alert>

            {/* Preview Toggle for 'To Other' */}
            <Collapse in={shareOption === 'other' && sanitizedPreview}>
              <Box sx={{ mb: 3 }}>
                <Button
                  size="small"
                  startIcon={previewMode ? <VisibilityOff /> : <Visibility />}
                  onClick={() => setPreviewMode(!previewMode)}
                  sx={{ mb: 1 }}
                >
                  {previewMode ? 'Hide Preview' : 'Show What Will Be Removed'}
                </Button>
                
                {previewMode && sanitizedPreview && (
                  <Card variant="outlined" sx={{ p: 2, bgcolor: '#fff8e1', borderRadius: 2 }}>
                    <Typography variant="caption" color="textSecondary" gutterBottom>
                      Data that will be REMOVED from the PDF:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                      {profileData?.phone && (
                        <Chip 
                          icon={<Close sx={{ fontSize: 16 }} />}
                          label={`Phone: ${profileData.phone}`}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      )}
                      {profileData?.email && (
                        <Chip 
                          icon={<Close sx={{ fontSize: 16 }} />}
                          label={`Email: ${profileData.email}`}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Card>
                )}
              </Box>
            </Collapse>

            <Divider sx={{ my: 2 }}>
              <Chip label="Share Options" size="small" />
            </Divider>

            {/* Page Count Preview */}
            {pageCount && (
              <Alert 
                severity="info" 
                icon={<PictureAsPdf />}
                sx={{ mb: 2, borderRadius: 2, bgcolor: '#f0f9ff' }}
              >
                <Typography variant="body2" fontWeight={600}>
                  📄 PDF will have {pageCount.totalPages} pages
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  • {pageCount.profilePages} page(s) for profile details
                  {pageCount.galleryPages > 0 && ` • ${pageCount.galleryPages} page(s) for ${pageCount.galleryCount} photo(s)`}
                  {pageCount.documentPages > 0 && ` • ${pageCount.documentPages} page(s) for ${pageCount.documentCount} document(s)`}
                </Typography>
              </Alert>
            )}

            {/* Share Actions */}
            <Grid container spacing={2}>
              {/* Download PDF */}
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={downloadLoading ? <CircularProgress size={20} /> : <PictureAsPdf />}
                  onClick={handleDownloadPDF}
                  disabled={downloadLoading || !profileData}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    borderColor: '#8B5CF6',
                    color: '#8B5CF6',
                    '&:hover': { borderColor: '#7C3AED', bgcolor: 'rgba(139, 92, 246, 0.04)' }
                  }}
                >
                  Download PDF
                </Button>
              </Grid>

              {/* WhatsApp Share */}
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={whatsappLoading ? <CircularProgress size={20} /> : <WhatsApp />}
                  onClick={handleWhatsAppShare}
                  disabled={whatsappLoading || !profileData}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    borderColor: '#25D366',
                    color: '#25D366',
                    '&:hover': { borderColor: '#128C7E', bgcolor: 'rgba(37, 211, 102, 0.04)' }
                  }}
                >
                  Share via WhatsApp
                </Button>
              </Grid>

              {/* Email Share */}
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={emailLoading ? <CircularProgress size={20} /> : <Email />}
                  onClick={handleEmailShare}
                  disabled={emailLoading || !profileData}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    borderColor: '#EA4335',
                    color: '#EA4335',
                    '&:hover': { borderColor: '#C5221F', bgcolor: 'rgba(234, 67, 53, 0.04)' }
                  }}
                >
                  Share via Email
                </Button>
              </Grid>
            </Grid>

            {/* WhatsApp Number Input */}
            <Box sx={{ mt: 2 }}>
              <TextField
                id="whatsapp-input"
                fullWidth
                type="tel"
                label="Enter WhatsApp number to share directly"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                disabled={whatsappLoading}
                size="small"
                placeholder="Enter 10-digit mobile number"
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: 2 }
                }}
                InputProps={{
                  startAdornment: (
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, color: '#25D366' }}>
                      <WhatsApp />
                    </Box>
                  ),
                  endAdornment: (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleWhatsAppShare}
                      disabled={whatsappLoading || !whatsappNumber}
                      sx={{
                        bgcolor: '#25D366',
                        '&:hover': { bgcolor: '#128C7E' },
                        borderRadius: 1,
                        minWidth: 'auto',
                        px: 2
                      }}
                    >
                      Send
                    </Button>
                  )
                }}
              />
              <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'text.secondary' }}>
                Enter mobile number with country code (e.g., 9876543210)
              </Typography>
            </Box>

            {/* Email Input */}
            <Box sx={{ mt: 2 }}>
              <TextField
                id="email-input"
                fullWidth
                type="email"
                label="Enter email address to share"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={emailLoading}
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: 2 }
                }}
                InputProps={{
                  startAdornment: (
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, color: '#EA4335' }}>
                      <Email />
                    </Box>
                  ),
                  endAdornment: (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleEmailShare}
                      disabled={emailLoading || !email}
                      sx={{
                        bgcolor: '#8B5CF6',
                        '&:hover': { bgcolor: '#7C3AED' },
                        borderRadius: 1
                      }}
                    >
                      Send
                    </Button>
                  )
                }}
              />
            </Box>

            {/* Watermark Info */}
            <Alert 
              severity="info" 
              icon={<Info />}
              sx={{ mt: 3, borderRadius: 2 }}
            >
              <Typography variant="caption">
                All generated PDFs include a semi-transparent "Vijayalakshmi Boyar Matrimony" watermark for branding and security.
              </Typography>
            </Alert>
          </>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfileShareModal;
