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

const ProfileShareModal = ({ open, onClose, userId, userName }) => {
  const [shareOption, setShareOption] = useState('myself');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
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

    setLoading(true);
    try {
      // Use backend PDF generation for better quality
      const isSanitized = shareOption === 'other';
      const pdfBlob = await profileService.downloadProfilePdf(userId, isSanitized);
      
      // DEBUG: Log what's being used for filename
      console.log('PDF download - customId:', profileData?.customId, 'firstName:', profileData?.firstName);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([pdfBlob]));
      const link = document.createElement('a');
      const name = profileData.customId || `${profileData.firstName || 'Profile'}_${profileData.lastName || ''}`.trim();
      link.href = url;
      link.setAttribute('download', `${name.replace(/\s+/g, '_')}_Profile.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF download error:', error);
      // Fallback to frontend PDF generation
      const isSanitized = shareOption === 'other';
      downloadProfilePDF(profileData, isSanitized);
      toast.success('PDF downloaded successfully!');
    } finally {
      setLoading(false);
    }
  };

  // Generate and copy shareable link
  const handleWhatsAppShare = async () => {
    const isSanitized = shareOption === 'other';
    
    // Use the deployed URL - always use production URL for sharing
    const baseUrl = 'https://vijayalakshmimarriage.com';
    const profileLink = `${baseUrl}/profile/${userId}?sanitize=${isSanitized}`;
    
    // Direct PDF link that can be downloaded
    const pdfLink = `${baseUrl}/api/shared-profile/${userId}?sanitize=${isSanitized}`;
    
    const name = `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim();
    let shareMessage = `💍 *${name}'s Profile - Vijayalakshmi Boyar Matrimony*\n\n`;
    
    if (profileData.age) shareMessage += `👤 Age: ${profileData.age} years\n`;
    if (profileData.gender) shareMessage += `⚥ Gender: ${profileData.gender}\n`;
    if (profileData.height) shareMessage += `📏 Height: ${profileData.height}\n`;
    if (profileData.complexion) shareMessage += `🎨 Complexion: ${profileData.complexion}\n`;
    if (profileData.community) shareMessage += `🕉️ Community: ${profileData.community}\n`;
    if (profileData.subCaste) shareMessage += `📿 Subcaste: ${profileData.subCaste}\n`;
    if (profileData.education) shareMessage += `🎓 Education: ${profileData.education}\n`;
    if (profileData.profession) shareMessage += `💼 Profession: ${profileData.profession}\n`;
    if (profileData.city || profileData.state) shareMessage += `📍 Location: ${[profileData.city, profileData.state].filter(Boolean).join(', ')}\n`;
    if (profileData.maritalStatus) shareMessage += `💍 Marital Status: ${profileData.maritalStatus}\n`;
    
    shareMessage += `\n✨ *Vijayalakshmi Boyar Matrimony*\n`;
    shareMessage += `\n🔗 View Profile: ${profileLink}\n`;
    shareMessage += `📄 *Download PDF:* ${pdfLink}\n\n`;
    shareMessage += `Click the PDF link above to download and share!\n\n`;
    shareMessage += `Regards,\nVijayalakshmi Boyar Matrimony`;
    
    // Try native share API first (works better on mobile), fallback to WhatsApp
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${name}'s Profile`,
          text: shareMessage,
          url: pdfLink
        });
        toast.success('Shared successfully!');
        return;
      } catch (err) {
        // User cancelled or error, continue to WhatsApp
      }
    }
    
    // Open WhatsApp with the share message
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(whatsappUrl, '_blank');
    
    toast.success('WhatsApp opened! To share PDF: Download first, then attach in WhatsApp chat.');
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

    setLoading(true);
    try {
      // Try backend PDF first
      let pdfBlob;
      try {
        const isSanitized = shareOption === 'other';
        pdfBlob = await profileService.downloadProfilePdf(userId, isSanitized);
      } catch (backendError) {
        // Fallback to frontend PDF
        const isSanitized = shareOption === 'other';
        pdfBlob = getProfilePDFBlob(profileData, isSanitized);
      }
      
      const name = profileData.customId || `${profileData.firstName || 'Profile'}_${profileData.lastName || ''}`.trim();
      
      // Create form data for email
      const formData = new FormData();
      formData.append('pdf', pdfBlob, `${name.replace(/\s+/g, '_')}_Profile.pdf`);
      formData.append('email', email);
      formData.append('profileName', name);
      formData.append('shareType', shareOption);

      // Send email via backend
      const response = await api.post('/admin/share-profile-email', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Check if backend returned fallback (SMTP not configured)
      if (response.data?.fallback) {
        // Use mailto link as fallback
        const subject = encodeURIComponent(`${userName}'s Profile - Vijayalakshmi Boyar Matrimony`);
        const body = encodeURIComponent(`Please find attached the profile of ${userName}.\n\nRegards,\nVijayalakshmi Boyar Matrimony`);
        window.open(`mailto:${email}?subject=${subject}&body=${body}`);
        
        // Also download PDF for user to attach
        try {
          const isSanitized = shareOption === 'other';
          const pdfBlob = await profileService.downloadProfilePdf(userId, isSanitized);
          const url = window.URL.createObjectURL(new Blob([pdfBlob]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `${name.replace(/\s+/g, '_')}_Profile.pdf`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
        } catch (downloadError) {
          downloadProfilePDF(profileData, shareOption === 'other');
        }
        
        toast('Email client opened. Please attach the downloaded PDF.', { icon: '📧' });
      } else {
        toast.success(`Profile sent to ${email}`);
      }
      setEmail('');
    } catch (error) {
      console.error('Email share error:', error);
      // Fallback: Open email client
      const subject = encodeURIComponent(`${userName}'s Profile - Vijayalakshmi Boyar Matrimony`);
      const body = encodeURIComponent(`Please find attached the profile of ${userName}.\n\nRegards,\nVijayalakshmi Boyar Matrimony`);
      window.open(`mailto:${email}?subject=${subject}&body=${body}`);
      toast('PDF downloaded. Please attach it to your email.', { icon: '📧' });
      
      // Download PDF as fallback
      try {
        const isSanitized = shareOption === 'other';
        const pdfBlob = await profileService.downloadProfilePdf(userId, isSanitized);
        const url = window.URL.createObjectURL(new Blob([pdfBlob]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${name.replace(/\s+/g, '_')}_Profile.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (downloadError) {
        downloadProfilePDF(profileData, shareOption === 'other');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShareOption('myself');
    setEmail('');
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
              {/* Download PDF & Share via WhatsApp */}
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <WhatsApp />}
                  onClick={async () => {
                    // First download the PDF
                    await handleDownloadPDF();
                    // Wait a moment then open WhatsApp
                    setTimeout(() => {
                      handleWhatsAppShare();
                    }, 1000);
                  }}
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    bgcolor: '#25D366',
                    color: 'white',
                    '&:hover': { bgcolor: '#128C7E' }
                  }}
                >
                  📎 Download PDF & Share via WhatsApp
                </Button>
                <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary', textAlign: 'center' }}>
                  Downloads PDF first, then opens WhatsApp to attach
                </Typography>
              </Grid>

              {/* Download PDF */}
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={loading ? <CircularProgress size={20} /> : <PictureAsPdf />}
                  onClick={handleDownloadPDF}
                  disabled={loading}
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

              {/* Email Share */}
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={loading ? <CircularProgress size={20} /> : <Email />}
                  onClick={() => document.getElementById('email-input')?.focus()}
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    borderColor: '#EA4335',
                    color: '#EA4335',
                    '&:hover': { borderColor: '#C5221F', bgcolor: 'rgba(234, 67, 53, 0.04)' }
                  }}
                >
                  Email
                </Button>
              </Grid>
            </Grid>

            {/* Email Input */}
            <Box sx={{ mt: 2 }}>
              <TextField
                id="email-input"
                fullWidth
                type="email"
                label="Enter email address to share"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: 2 }
                }}
                InputProps={{
                  endAdornment: (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleEmailShare}
                      disabled={loading || !email}
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
