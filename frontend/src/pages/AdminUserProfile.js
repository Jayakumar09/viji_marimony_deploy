/**
 * Admin User Profile Component
 * 
 * Full detailed user profile view for admin panel
 * Displays all user data including personal details, photos, documents, verifications
 * Supports block/unblock/delete actions with confirmation dialogs
 * 
 * Features:
 * - Comprehensive personal details display
 * - Profile photo and gallery grid
 * - Document preview with secure file serving
 * - Verification details with status badges
 * - Block/unblock/delete user actions
 * - Activity logging display
 * - Dark theme consistent with admin panel
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, CardMedia, Typography, Avatar, Chip, Grid, Button,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Divider, LinearProgress, Alert, Snackbar, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, List, ListItem, ListItemText, ListItemIcon, Badge,
  Tooltip, Switch, FormControlLabel
} from '@mui/material';
import {
  ArrowBack, Person, Email, Phone, LocationOn, CalendarToday,
  Work, FamilyRestroom, Visibility, VisibilityOff, CheckCircle,
  Cancel, Block, Delete, VerifiedUser, PhotoCamera, Description,
  Star, Warning, Check, Close, Refresh, Edit, History, Badge as BadgeIcon
} from '@mui/icons-material';
import api from '../services/api';

// Tab panel component for organizing content
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

/**
 * AdminUserProfile Component
 * Displays complete user profile for admin verification
 */
const AdminUserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // State management
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState(null);

  // Dialog states
  const [blockDialog, setBlockDialog] = useState({ open: false, reason: '' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, reason: '', permanent: false });
  const [verifyDialog, setVerifyDialog] = useState({ open: false, status: '', notes: '' });
  const [subscriptionDialog, setSubscriptionDialog] = useState({ open: false, plan: 'FREE' });
  const [photoRejectDialog, setPhotoRejectDialog] = useState({ open: false, photoId: null, reason: '' });

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Fetch user profile on component mount
  useEffect(() => {
    if (id) {
      fetchUserProfile();
    }
  }, [id]);

  // Auto-refresh profile when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log('[AdminUserProfile] Visibility changed:', document.visibilityState);
      if (document.visibilityState === 'visible' && id) {
        // Refresh profile data when user switches back to this tab
        fetchUserProfile();
      }
    };

    // Also handle window focus event as backup
    const handleFocus = () => {
      console.log('[AdminUserProfile] Window focused');
      if (id) {
        fetchUserProfile();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [id]);

  const fetchUserProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching user profile for ID:', id);
      const response = await api.get(`/admin/users/${id}/profile`);
      console.log('Profile API response:', response.data);
      if (response.data.success) {
        console.log('Profile data received:', response.data.data);
        setProfile(response.data.data);
      } else {
        console.error('API returned error:', response.data.error);
        setError(response.data.error || 'Failed to fetch user profile');
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to fetch user profile');
    } finally {
      setLoading(false);
    }
  };

  // Block user handler
  const handleBlockUser = async () => {
    try {
      const response = await api.put(`/admin/users/${id}/block`, {
        reason: blockDialog.reason
      });
      if (response.data.success) {
        setSnackbar({ open: true, message: 'User blocked successfully', severity: 'success' });
        fetchUserProfile();
        setBlockDialog({ open: false, reason: '' });
      } else {
        setSnackbar({ open: true, message: response.data.error, severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to block user', severity: 'error' });
    }
  };

  // Unblock user handler
  const handleUnblockUser = async () => {
    try {
      const response = await api.put(`/admin/users/${id}/unblock`);
      if (response.data.success) {
        setSnackbar({ open: true, message: 'User unblocked successfully', severity: 'success' });
        fetchUserProfile();
      } else {
        setSnackbar({ open: true, message: response.data.error, severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to unblock user', severity: 'error' });
    }
  };

  // Delete user handler
  const handleDeleteUser = async () => {
    try {
      const response = await api.delete(`/admin/users/${id}`, {
        data: {
          reason: deleteDialog.reason,
          permanent: deleteDialog.permanent
        }
      });
      if (response.data.success) {
        setSnackbar({ open: true, message: 'User deleted successfully', severity: 'success' });
        setDeleteDialog({ open: false, reason: '', permanent: false });
        setTimeout(() => navigate('/admin/users'), 1500);
      } else {
        setSnackbar({ open: true, message: response.data.error, severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to delete user', severity: 'error' });
    }
  };

  // Manual verify user handler
  const handleManualVerify = async () => {
    try {
      const response = await api.put(`/admin/users/${id}/manual-verify`, {
        status: verifyDialog.status,
        notes: verifyDialog.notes
      });
      if (response.data.success) {
        setSnackbar({ open: true, message: `User verification ${verifyDialog.status.toLowerCase()}`, severity: 'success' });
        fetchUserProfile();
        setVerifyDialog({ open: false, status: '', notes: '' });
      } else {
        setSnackbar({ open: true, message: response.data.error, severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to verify user', severity: 'error' });
    }
  };

  // Update subscription handler
  const handleUpdateSubscription = async () => {
    try {
      const response = await api.put(`/admin/subscriptions/${id}`, {
        plan: subscriptionDialog.plan
      });
      if (response.data.success) {
        setSnackbar({ open: true, message: 'Subscription updated successfully', severity: 'success' });
        fetchUserProfile();
        setSubscriptionDialog({ open: false, plan: 'FREE' });
      } else {
        setSnackbar({ open: true, message: response.data.error, severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to update subscription', severity: 'error' });
    }
  };

  // Approve photo handler - supports both PhotoVerification ID and direct photo URL
  const handleApprovePhoto = async (photoId, photoUrl, photoType) => {
    try {
      let response;
      
      // If photoId looks like a cuid (from PhotoVerification table), use the old endpoint
      if (photoId && photoId.startsWith('cm') && photoId.length > 20) {
        response = await api.put(`/admin/photos/${photoId}/approve`);
      } else {
        // Otherwise use the new endpoint that creates PhotoVerification record
        response = await api.post(`/admin/users/${id}/photos/verify`, {
          photoUrl,
          photoType: photoType || 'PROFILE',
          action: 'approve'
        });
      }
      
      if (response.data.message || response.data.success) {
        setSnackbar({ open: true, message: 'Photo approved successfully', severity: 'success' });
        fetchUserProfile();
      } else {
        setSnackbar({ open: true, message: response.data.error || 'Failed to approve photo', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to approve photo', severity: 'error' });
    }
  };

  // Reject photo handler - supports both PhotoVerification ID and direct photo URL
  const handleRejectPhoto = async () => {
    try {
      const { photoId, photoUrl, photoType } = photoRejectDialog;
      let response;
      
      // If photoId looks like a cuid (from PhotoVerification table), use the old endpoint
      if (photoId && photoId.startsWith('cm') && photoId.length > 20) {
        response = await api.put(`/admin/photos/${photoId}/reject`, {
          reason: photoRejectDialog.reason
        });
      } else {
        // Otherwise use the new endpoint that creates PhotoVerification record
        response = await api.post(`/admin/users/${id}/photos/verify`, {
          photoUrl,
          photoType: photoType || 'PROFILE',
          action: 'reject',
          reason: photoRejectDialog.reason
        });
      }
      
      if (response.data.message || response.data.success) {
        setSnackbar({ open: true, message: 'Photo rejected', severity: 'warning' });
        fetchUserProfile();
        setPhotoRejectDialog({ open: false, photoId: null, reason: '', photoUrl: null, photoType: null });
      } else {
        setSnackbar({ open: true, message: response.data.error || 'Failed to reject photo', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to reject photo', severity: 'error' });
    }
  };

  // Approve document handler
  const handleApproveDocument = async (docId) => {
    try {
      await api.put(`/admin/documents/${docId}/approve`);
      setSnackbar({ open: true, message: 'Document approved successfully!', severity: 'success' });
      fetchUserProfile();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to approve document', severity: 'error' });
    }
  };

  // Reject document handler
  const handleRejectDocument = async (docId) => {
    const reason = prompt('Please enter reason for rejection:');
    if (!reason) return;
    try {
      await api.put(`/admin/documents/${docId}/reject`, { reason });
      setSnackbar({ open: true, message: 'Document rejected', severity: 'warning' });
      fetchUserProfile();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to reject document', severity: 'error' });
    }
  };

  // Helper to get verification badge color
  const getVerificationBadgeColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'error';
      case 'PENDING': return 'warning';
      default: return 'default';
    }
  };

  // Helper to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function to get full image URL
  const getFullImageUrl = (url) => {
    if (!url) return '';
    
    // If already a full URL (Cloudinary or external), return as-is
    if (url.startsWith('http')) return url;
    
    // If it's a file:// URL, extract the filename
    if (url.startsWith('file://')) {
      const filename = url.split('/').pop();
      return `http://localhost:5001/uploads/${filename}`;
    }
    
    // If contains Windows path
    if (url.includes('D:/') || url.includes('D:\\')) {
      const filename = url.split(/[\\/]/).pop();
      return `http://localhost:5001/uploads/${filename}`;
    }
    
    // If it's a path starting with /uploads/
    if (url.startsWith('/uploads/')) {
      return `http://localhost:5001${url}`;
    }
    
    // If it's just a filename
    if (!url.includes('/') && !url.includes('\\')) {
      return `http://localhost:5001/uploads/${url}`;
    }
    
    // Otherwise use as-is
    return url;
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center', color: 'white' }}>Loading user profile...</Typography>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin/users')} sx={{ mt: 2, color: 'white' }}>
          Back to Users
        </Button>
      </Box>
    );
  }

  // No profile state
  if (!profile) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">User profile not found</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin/users')} sx={{ mt: 2, color: 'white' }}>
          Back to Users
        </Button>
      </Box>
    );
  }

  const { personalDetails, locationDetails, professionalDetails, familyDetails,
    horoscopeDetails, profilePhoto, galleryPhotos, documents, verificationDetails,
    subscriptionDetails, accountStatus, activityStats } = profile;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#1e293b', color: 'white', p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <IconButton onClick={() => navigate('/admin/users')} sx={{ color: 'white' }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h5" fontWeight="bold" sx={{ flex: 1, color: 'white' }}>
          User Profile Details
        </Typography>
        <Chip
          label={accountStatus.isActive ? 'Active' : 'Blocked'}
          color={accountStatus.isActive ? 'success' : 'error'}
          sx={{ mr: 1 }}
        />
        {accountStatus.subscriptionTier && accountStatus.subscriptionTier !== 'FREE' && (
          <Chip 
            label={accountStatus.subscriptionTier === 'PREMIUM' ? 'Premium' : accountStatus.subscriptionTier === 'PRO' ? 'Pro' : accountStatus.subscriptionTier === 'BASIC' ? 'Basic' : accountStatus.subscriptionTier} 
            sx={{ bgcolor: accountStatus.subscriptionTier === 'PREMIUM' ? '#fef3c7' : accountStatus.subscriptionTier === 'PRO' ? '#ede9fe' : accountStatus.subscriptionTier === 'BASIC' ? '#dcfce7' : '#e5e7eb', color: '#000', fontWeight: 600 }} 
            icon={<Star />} 
          />
        )}
        <IconButton onClick={fetchUserProfile} sx={{ color: 'white' }}>
          <Refresh />
        </IconButton>
      </Box>

      {/* Profile Header Card */}
      <Card sx={{ mb: 3, bgcolor: '#334155', color: 'white', borderRadius: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3} sx={{ textAlign: 'center' }}>
              <Avatar
                src={getFullImageUrl(profilePhoto?.url) || undefined}
                sx={{ width: 120, height: 120, mx: 'auto', mb: 2, bgcolor: '#8B5CF6', fontSize: 48 }}
              >
                {personalDetails.firstName?.charAt(0)}
              </Avatar>
              <Typography variant="h5" fontWeight="bold" sx={{ color: 'white' }}>
                {personalDetails.firstName} {personalDetails.lastName}
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                ID: {personalDetails.customId || personalDetails.id?.slice(-8)}
              </Typography>
              <Chip
                label={verificationDetails.isVerified ? 'Verified' : 'Unverified'}
                color={verificationDetails.isVerified ? 'success' : 'default'}
                size="small"
                sx={{ mt: 1 }}
              />
            </Grid>

            <Grid item xs={12} md={9}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Email sx={{ color: '#a78bfa', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: '#cbd5e1' }}>Email</Typography>
                  </Box>
                  <Typography sx={{ color: 'white' }}>{personalDetails.email}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Phone sx={{ color: '#a78bfa', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: '#cbd5e1' }}>Phone</Typography>
                  </Box>
                  <Typography sx={{ color: 'white' }}>{personalDetails.phone}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarToday sx={{ color: '#a78bfa', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: '#cbd5e1' }}>DOB / Age</Typography>
                  </Box>
                  <Typography sx={{ color: 'white' }}>{formatDate(personalDetails.dateOfBirth)} ({personalDetails.age} years)</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LocationOn sx={{ color: '#a78bfa', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: '#cbd5e1' }}>Location</Typography>
                  </Box>
                  <Typography sx={{ color: 'white' }}>{locationDetails.fullLocation}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Person sx={{ color: '#a78bfa', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: '#cbd5e1' }}>Gender / Marital</Typography>
                  </Box>
                  <Typography sx={{ color: 'white' }}>{personalDetails.gender} / {personalDetails.maritalStatus}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <BadgeIcon sx={{ color: '#a78bfa', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: '#cbd5e1' }}>Community</Typography>
                  </Box>
                  <Typography sx={{ color: 'white' }}>{personalDetails.community} {personalDetails.subCaste && `/ ${personalDetails.subCaste}`}</Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card sx={{ mb: 3, bgcolor: '#334155', color: 'white', borderRadius: 3 }}>
        <CardContent sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {accountStatus.isActive ? (
            <Button
              variant="contained"
              color="error"
              startIcon={<Block />}
              onClick={() => setBlockDialog({ open: true, reason: '' })}
            >
              Block User
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              startIcon={<Check />}
              onClick={handleUnblockUser}
            >
              Unblock User
            </Button>
          )}
          {!verificationDetails.isVerified && (
            <Button
              variant="contained"
              color="success"
              startIcon={<VerifiedUser />}
              onClick={() => setVerifyDialog({ open: true, status: 'APPROVED', notes: '' })}
            >
              Verify User
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<Star />}
            onClick={() => setSubscriptionDialog({ open: true, plan: subscriptionDetails.tier })}
          >
            Update Subscription
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={() => setDeleteDialog({ open: true, reason: '', permanent: false })}
          >
            Delete User
          </Button>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card sx={{ bgcolor: '#334155', color: 'white', borderRadius: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          sx={{
            borderBottom: '1px solid #475569',
            '& .MuiTab-root': { color: '#94a3b8' },
            '& .Mui-selected': { color: '#8B5CF6' },
            '& .MuiTabs-indicator': { bgcolor: '#8B5CF6' }
          }}
        >
          <Tab label="Personal Details" />
          <Tab label="Photos" />
          <Tab label="Documents" />
          <Tab label="Verification" />
          <Tab label="Activity" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Personal Details Tab */}
          <TabPanel value={activeTab} index={0}>
            <Grid container spacing={3}>
              {/* Professional Details */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'white' }}>
                  <Work sx={{ color: '#8B5CF6' }} /> Professional Details
                </Typography>
                <TableContainer component={Paper} sx={{ bgcolor: '#1e293b' }}>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ color: '#94a3b8' }}>Education</TableCell>
                        <TableCell sx={{ color: 'white' }}>{professionalDetails.education}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: '#94a3b8' }}>Profession</TableCell>
                        <TableCell sx={{ color: 'white' }}>{professionalDetails.profession}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: '#94a3b8' }}>Income</TableCell>
                        <TableCell sx={{ color: 'white' }}>{professionalDetails.income}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {/* Physical Attributes */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'white' }}>
                  <Person sx={{ color: '#8B5CF6' }} /> Physical Attributes
                </Typography>
                <TableContainer component={Paper} sx={{ bgcolor: '#1e293b' }}>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ color: '#94a3b8' }}>Height</TableCell>
                        <TableCell sx={{ color: 'white' }}>{personalDetails.height}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: '#94a3b8' }}>Weight</TableCell>
                        <TableCell sx={{ color: 'white' }}>{personalDetails.weight}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: '#94a3b8' }}>Complexion</TableCell>
                        <TableCell sx={{ color: 'white' }}>{personalDetails.complexion}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {/* Family Details */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'white' }}>
                  <FamilyRestroom sx={{ color: '#8B5CF6' }} /> Family Details
                </Typography>
                <TableContainer component={Paper} sx={{ bgcolor: '#1e293b' }}>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ color: '#94a3b8' }}>Father Name</TableCell>
                        <TableCell sx={{ color: 'white' }}>{familyDetails.fatherName}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: '#94a3b8' }}>Father Occupation</TableCell>
                        <TableCell sx={{ color: 'white' }}>{familyDetails.fatherOccupation}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: '#94a3b8' }}>Mother Name</TableCell>
                        <TableCell sx={{ color: 'white' }}>{familyDetails.motherName}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: '#94a3b8' }}>Family Values</TableCell>
                        <TableCell sx={{ color: 'white' }}>{familyDetails.familyValues}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: '#94a3b8' }}>Family Type</TableCell>
                        <TableCell sx={{ color: 'white' }}>{familyDetails.familyType}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: '#94a3b8' }}>Family Status</TableCell>
                        <TableCell sx={{ color: 'white' }}>{familyDetails.familyStatus}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: '#94a3b8' }}>About Family</TableCell>
                        <TableCell sx={{ color: 'white' }}>{familyDetails.aboutFamily}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {/* Horoscope Details */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'white' }}>
                  <Star sx={{ color: '#8B5CF6' }} /> Horoscope Details
                </Typography>
                <TableContainer component={Paper} sx={{ bgcolor: '#1e293b' }}>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ color: '#94a3b8' }}>Raasi</TableCell>
                        <TableCell sx={{ color: 'white' }}>{horoscopeDetails.raasi}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: '#94a3b8' }}>Natchathiram</TableCell>
                        <TableCell sx={{ color: 'white' }}>{horoscopeDetails.natchathiram}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: '#94a3b8' }}>Dhosam</TableCell>
                        <TableCell sx={{ color: 'white' }}>{horoscopeDetails.dhosam}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: '#94a3b8' }}>Birth Time</TableCell>
                        <TableCell sx={{ color: 'white' }}>{horoscopeDetails.birthTime}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: '#94a3b8' }}>Birth Place</TableCell>
                        <TableCell sx={{ color: 'white' }}>{horoscopeDetails.birthPlace}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {/* Bio */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>Bio</Typography>
                <Paper sx={{ p: 2, bgcolor: '#1e293b' }}>
                  <Typography sx={{ color: 'white' }}>{personalDetails.bio || 'No bio provided'}</Typography>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Photos Tab */}
          <TabPanel value={activeTab} index={1}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'white' }}>
              <PhotoCamera sx={{ color: '#a78bfa' }} /> Profile Photo
            </Typography>
            {profilePhoto ? (
              <Card sx={{ maxWidth: 400, mb: 4, bgcolor: '#334155', borderRadius: 2 }}>
                <CardMedia
                  component="img"
                  image={getFullImageUrl(profilePhoto.url)}
                  alt="Profile photo"
                  sx={{ height: 300, objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23666"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';
                  }}
                />
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={profilePhoto.status || 'PENDING'} color={getVerificationBadgeColor(profilePhoto.status)} size="small" sx={{ color: 'white' }} />
                      <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
                        Uploaded: {formatDate(profilePhoto.createdAt)}
                      </Typography>
                    </Box>
                    {profilePhoto.url && (!profilePhoto.status || profilePhoto.status === 'PENDING') && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<Check />}
                          onClick={() => handleApprovePhoto(profilePhoto.id, profilePhoto.url, 'PROFILE')}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          startIcon={<Close />}
                          onClick={() => setPhotoRejectDialog({ open: true, photoId: profilePhoto.id, photoUrl: profilePhoto.url, photoType: 'PROFILE', reason: '' })}
                        >
                          Reject
                        </Button>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ) : (
              <Alert severity="warning" sx={{ mb: 4, bgcolor: '#334155', color: '#fbbf24' }}>No profile photo uploaded</Alert>
            )}

            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'white' }}>
              <PhotoCamera sx={{ color: '#a78bfa' }} /> Gallery Photos ({galleryPhotos?.length || 0})
            </Typography>
            {galleryPhotos && galleryPhotos.length > 0 ? (
              <Grid container spacing={2}>
                {galleryPhotos.map((photo) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={photo.id}>
                    <Card sx={{ bgcolor: '#334155', borderRadius: 2, overflow: 'hidden' }}>
                      <CardMedia
                        component="img"
                        image={getFullImageUrl(photo.url)}
                        alt="Gallery photo"
                        sx={{ height: 200, objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23666"%3E%3Cpath d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/%3E%3C/svg%3E';
                        }}
                      />
                      <CardContent sx={{ p: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Chip label={photo.status || 'PENDING'} color={getVerificationBadgeColor(photo.status)} size="small" sx={{ color: 'white' }} />
                          <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
                            {formatDate(photo.createdAt)}
                          </Typography>
                        </Box>
                        {photo.url && (!photo.status || photo.status === 'PENDING') && (
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              fullWidth
                              startIcon={<Check />}
                              onClick={() => handleApprovePhoto(photo.id, photo.url, 'PHOTO_GALLERY')}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              fullWidth
                              startIcon={<Close />}
                              onClick={() => setPhotoRejectDialog({ open: true, photoId: photo.id, photoUrl: photo.url, photoType: 'PHOTO_GALLERY', reason: '' })}
                            >
                              Reject
                            </Button>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Alert severity="info" sx={{ bgcolor: '#334155', color: '#60a5fa' }}>No gallery photos uploaded</Alert>
            )}
          </TabPanel>

          {/* Documents Tab */}
          <TabPanel value={activeTab} index={2}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'white' }}>
              <Description sx={{ color: '#a78bfa' }} /> Uploaded Documents ({documents?.length || 0})
            </Typography>
            {documents && documents.length > 0 ? (
              <TableContainer component={Paper} sx={{ bgcolor: '#334155', borderRadius: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Type</TableCell>
                      <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>File Name</TableCell>
                      <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Uploaded</TableCell>
                      <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell sx={{ color: 'white' }}>{doc.documentType}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{doc.fileName || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={doc.status} 
                            color={getVerificationBadgeColor(doc.status)} 
                            size="small" 
                            sx={{ color: 'white' }} 
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>{formatDate(doc.uploadedAt)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {doc.documentUrl && (
                              <Button
                                size="small"
                                variant="outlined"
                                href={getFullImageUrl(doc.documentUrl)}
                                target="_blank"
                                sx={{ color: '#a78bfa', borderColor: '#a78bfa' }}
                              >
                                Preview
                              </Button>
                            )}
                            {doc.status === 'PENDING' && (
                              <>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  onClick={() => handleApproveDocument(doc.id)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="error"
                                  onClick={() => handleRejectDocument(doc.id)}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info" sx={{ bgcolor: '#334155', color: '#60a5fa' }}>No documents uploaded</Alert>
            )}
          </TabPanel>

          {/* Verification Tab */}
          <TabPanel value={activeTab} index={3}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>Verification Status</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Card sx={{ bgcolor: '#334155', p: 2, textAlign: 'center', borderRadius: 2 }}>
                      <Typography variant="h4" color={verificationDetails.emailVerified ? 'success' : 'error'}>
                        {verificationDetails.emailVerified ? <Check /> : <Close />}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#cbd5e1' }}>Email Verified</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card sx={{ bgcolor: '#334155', p: 2, textAlign: 'center', borderRadius: 2 }}>
                      <Typography variant="h4" color={verificationDetails.phoneVerified ? 'success' : 'error'}>
                        {verificationDetails.phoneVerified ? <Check /> : <Close />}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#cbd5e1' }}>Phone Verified</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card sx={{ bgcolor: '#334155', p: 2, textAlign: 'center', borderRadius: 2 }}>
                      <Typography variant="h4" color={verificationDetails.photosVerified ? 'success' : 'error'}>
                        {verificationDetails.photosVerified ? <Check /> : <Close />}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#cbd5e1' }}>Photos Verified</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card sx={{ bgcolor: '#334155', p: 2, textAlign: 'center', borderRadius: 2 }}>
                      <Typography variant="h4" color={verificationDetails.isVerified ? 'success' : 'warning'}>
                        {verificationDetails.isVerified ? <VerifiedUser /> : <Warning />}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#cbd5e1' }}>Overall Status</Typography>
                    </Card>
                  </Grid>
                </Grid>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>Photo Verification History</Typography>
                {verificationDetails.photoVerifications && verificationDetails.photoVerifications.length > 0 ? (
                  <TableContainer component={Paper} sx={{ bgcolor: '#334155', borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Photo</TableCell>
                          <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Type</TableCell>
                          <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Status</TableCell>
                          <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Reviewed By</TableCell>
                          <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {verificationDetails.photoVerifications.map((pv) => (
                          <TableRow key={pv.id}>
                            <TableCell>
                              {pv.photoUrl && (
                                <Avatar
                                  src={getFullImageUrl(pv.photoUrl)}
                                  variant="rounded"
                                  sx={{ width: 50, height: 50 }}
                                  onError={(e) => {
                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23666"%3E%3Cpath d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/%3E%3C/svg%3E';
                                  }}
                                />
                              )}
                            </TableCell>
                            <TableCell sx={{ color: 'white' }}>{pv.photoType}</TableCell>
                            <TableCell>
                              <Chip label={pv.status} color={getVerificationBadgeColor(pv.status)} size="small" sx={{ color: 'white' }} />
                            </TableCell>
                            <TableCell sx={{ color: 'white' }}>{pv.reviewedBy || 'N/A'}</TableCell>
                            <TableCell sx={{ color: 'white' }}>{pv.reviewedAt ? formatDate(pv.reviewedAt) : 'Pending'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info" sx={{ bgcolor: '#334155', color: '#60a5fa' }}>No photo verification records</Alert>
                )}
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>Subscription Details</Typography>
                <Card sx={{ bgcolor: '#334155', p: 2, borderRadius: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: '#cbd5e1' }}>Plan</Typography>
                      <Typography variant="h6" sx={{ color: 'white' }}>{subscriptionDetails.tier}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: '#cbd5e1' }}>Amount</Typography>
                      <Typography variant="h6" sx={{ color: 'white' }}>₹{subscriptionDetails.amount}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: '#cbd5e1' }}>Start Date</Typography>
                      <Typography sx={{ color: 'white' }}>{subscriptionDetails.startDate ? formatDate(subscriptionDetails.startDate) : 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: '#cbd5e1' }}>End Date</Typography>
                      <Typography sx={{ color: 'white' }}>{subscriptionDetails.endDate ? formatDate(subscriptionDetails.endDate) : 'N/A'}</Typography>
                    </Grid>
                  </Grid>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Activity Tab */}
          <TabPanel value={activeTab} index={4}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'white' }}>
              <History sx={{ color: '#a78bfa' }} /> Activity Statistics
            </Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
              <Grid item xs={6} sm={3}>
                <Card sx={{ bgcolor: '#334155', p: 2, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="h4" sx={{ color: '#a78bfa' }}>{activityStats.interestsSent}</Typography>
                  <Typography variant="body2" sx={{ color: '#cbd5e1' }}>Interests Sent</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ bgcolor: '#334155', p: 2, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="h4" sx={{ color: '#a78bfa' }}>{activityStats.interestsReceived}</Typography>
                  <Typography variant="body2" sx={{ color: '#cbd5e1' }}>Interests Received</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ bgcolor: '#334155', p: 2, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="h4" sx={{ color: '#a78bfa' }}>{activityStats.messagesSent}</Typography>
                  <Typography variant="body2" sx={{ color: '#cbd5e1' }}>Messages Sent</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ bgcolor: '#334155', p: 2, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="h4" sx={{ color: '#a78bfa' }}>{activityStats.messagesReceived}</Typography>
                  <Typography variant="body2" sx={{ color: '#cbd5e1' }}>Messages Received</Typography>
                </Card>
              </Grid>
            </Grid>

            {/* Interests Sent Details */}
            <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>Interests Sent ({activityStats.sentInterestsList?.length || 0})</Typography>
            {activityStats.sentInterestsList && activityStats.sentInterestsList.length > 0 ? (
              <TableContainer component={Paper} sx={{ bgcolor: '#334155', borderRadius: 2, mb: 4 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Profile</TableCell>
                      <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Email</TableCell>
                      <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Phone</TableCell>
                      <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Location</TableCell>
                      <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Sent On</TableCell>
                      <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activityStats.sentInterestsList.map((interest) => (
                      <TableRow key={interest.id}>
                        <TableCell>
                          <Avatar
                            src={getFullImageUrl(interest.receiver?.profilePhoto) || undefined}
                            sx={{ width: 40, height: 40, bgcolor: '#8B5CF6' }}
                          >
                            {interest.receiver?.name?.charAt(0)}
                          </Avatar>
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          {interest.receiver?.name || 'N/A'}
                          {!interest.receiver?.isActive && (
                            <Chip label="Inactive" size="small" color="error" sx={{ ml: 1 }} />
                          )}
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>{interest.receiver?.email || 'N/A'}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{interest.receiver?.phone || 'N/A'}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{interest.receiver?.location || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={interest.status} 
                            color={interest.status === 'ACCEPTED' ? 'success' : interest.status === 'REJECTED' ? 'error' : 'warning'} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>{formatDate(interest.createdAt)}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => navigate(`/admin/users/${interest.receiver?.id}`)}
                            sx={{ color: '#a78bfa', borderColor: '#a78bfa' }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info" sx={{ bgcolor: '#334155', color: '#60a5fa', mb: 4 }}>No interests sent</Alert>
            )}

            {/* Interests Received Details */}
            <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>Interests Received ({activityStats.receivedInterestsList?.length || 0})</Typography>
            {activityStats.receivedInterestsList && activityStats.receivedInterestsList.length > 0 ? (
              <TableContainer component={Paper} sx={{ bgcolor: '#334155', borderRadius: 2, mb: 4 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Profile</TableCell>
                      <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Email</TableCell>
                      <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Phone</TableCell>
                      <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Location</TableCell>
                      <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Received On</TableCell>
                      <TableCell sx={{ color: '#cbd5e1', fontWeight: 600 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activityStats.receivedInterestsList.map((interest) => (
                      <TableRow key={interest.id}>
                        <TableCell>
                          <Avatar
                            src={getFullImageUrl(interest.sender?.profilePhoto) || undefined}
                            sx={{ width: 40, height: 40, bgcolor: '#8B5CF6' }}
                          >
                            {interest.sender?.name?.charAt(0)}
                          </Avatar>
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          {interest.sender?.name || 'N/A'}
                          {!interest.sender?.isActive && (
                            <Chip label="Inactive" size="small" color="error" sx={{ ml: 1 }} />
                          )}
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>{interest.sender?.email || 'N/A'}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{interest.sender?.phone || 'N/A'}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{interest.sender?.location || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={interest.status} 
                            color={interest.status === 'ACCEPTED' ? 'success' : interest.status === 'REJECTED' ? 'error' : 'warning'} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>{formatDate(interest.createdAt)}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => navigate(`/admin/users/${interest.sender?.id}`)}
                            sx={{ color: '#a78bfa', borderColor: '#a78bfa' }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info" sx={{ bgcolor: '#334155', color: '#60a5fa', mb: 4 }}>No interests received</Alert>
            )}

            <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>Account Timeline</Typography>
            <TableContainer component={Paper} sx={{ bgcolor: '#334155', borderRadius: 2 }}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ color: '#cbd5e1' }}>Account Created</TableCell>
                    <TableCell sx={{ color: 'white' }}>{formatDate(accountStatus.createdAt)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ color: '#cbd5e1' }}>Last Login</TableCell>
                    <TableCell sx={{ color: 'white' }}>{accountStatus.lastLoginAt ? formatDate(accountStatus.lastLoginAt) : 'Never'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ color: '#cbd5e1' }}>Last Updated</TableCell>
                    <TableCell sx={{ color: 'white' }}>{formatDate(accountStatus.updatedAt)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        </Box>
      </Card>

      {/* Block User Dialog */}
      <Dialog open={blockDialog.open} onClose={() => setBlockDialog({ open: false, reason: '' })}>
        <DialogTitle sx={{ bgcolor: '#1e293b', color: 'white' }}>Block User</DialogTitle>
        <DialogContent sx={{ bgcolor: '#1e293b' }}>
          <Typography sx={{ color: '#94a3b8', mb: 2 }}>
            Are you sure you want to block this user? They will no longer be able to access the platform.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason for blocking"
            value={blockDialog.reason}
            onChange={(e) => setBlockDialog({ ...blockDialog, reason: e.target.value })}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#334155' } }}
            InputLabelProps={{ sx: { color: '#94a3b8' } }}
            InputProps={{ sx: { color: 'white' } }}
          />
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1e293b' }}>
          <Button onClick={() => setBlockDialog({ open: false, reason: '' })} sx={{ color: 'white' }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleBlockUser}>Block User</Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, reason: '', permanent: false })}>
        <DialogTitle sx={{ bgcolor: '#1e293b', color: 'white' }}>Delete User</DialogTitle>
        <DialogContent sx={{ bgcolor: '#1e293b' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            This action cannot be undone. Please confirm.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason for deletion"
            value={deleteDialog.reason}
            onChange={(e) => setDeleteDialog({ ...deleteDialog, reason: e.target.value })}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { bgcolor: '#334155' } }}
            InputLabelProps={{ sx: { color: '#94a3b8' } }}
            InputProps={{ sx: { color: 'white' } }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={deleteDialog.permanent}
                onChange={(e) => setDeleteDialog({ ...deleteDialog, permanent: e.target.checked })}
              />
            }
            label="Permanent deletion (remove from database)"
            sx={{ color: 'white' }}
          />
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1e293b' }}>
          <Button onClick={() => setDeleteDialog({ open: false, reason: '', permanent: false })} sx={{ color: 'white' }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteUser}>
            {deleteDialog.permanent ? 'Permanently Delete' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Verify User Dialog */}
      <Dialog open={verifyDialog.open} onClose={() => setVerifyDialog({ open: false, status: '', notes: '' })}>
        <DialogTitle sx={{ bgcolor: '#1e293b', color: 'white' }}>Manual Verification</DialogTitle>
        <DialogContent sx={{ bgcolor: '#1e293b' }}>
          <Typography sx={{ color: '#94a3b8', mb: 2 }}>
            Set the user's verification status manually.
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={verifyDialog.status === 'APPROVED'}
                onChange={(e) => setVerifyDialog({ ...verifyDialog, status: e.target.checked ? 'APPROVED' : 'REJECTED' })}
              />
            }
            label={verifyDialog.status === 'APPROVED' ? 'Approve' : 'Reject'}
            sx={{ color: 'white', mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes (optional)"
            value={verifyDialog.notes}
            onChange={(e) => setVerifyDialog({ ...verifyDialog, notes: e.target.value })}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#334155' } }}
            InputLabelProps={{ sx: { color: '#94a3b8' } }}
            InputProps={{ sx: { color: 'white' } }}
          />
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1e293b' }}>
          <Button onClick={() => setVerifyDialog({ open: false, status: '', notes: '' })} sx={{ color: 'white' }}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleManualVerify}>
            {verifyDialog.status === 'APPROVED' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Subscription Dialog */}
      <Dialog open={subscriptionDialog.open} onClose={() => setSubscriptionDialog({ open: false, plan: 'FREE' })}>
        <DialogTitle sx={{ bgcolor: '#1e293b', color: 'white' }}>Update Subscription</DialogTitle>
        <DialogContent sx={{ bgcolor: '#1e293b' }}>
          <Typography sx={{ color: '#94a3b8', mb: 2 }}>
            Select a new subscription plan for this user.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {['FREE', 'STANDARD', 'PREMIUM', 'ELITE'].map((plan) => (
              <Chip
                key={plan}
                label={plan}
                onClick={() => setSubscriptionDialog({ ...subscriptionDialog, plan })}
                color={subscriptionDialog.plan === plan ? 'primary' : 'default'}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1e293b' }}>
          <Button onClick={() => setSubscriptionDialog({ open: false, plan: 'FREE' })} sx={{ color: 'white' }}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleUpdateSubscription}>
            Update to {subscriptionDialog.plan}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Photo Reject Dialog */}
      <Dialog open={photoRejectDialog.open} onClose={() => setPhotoRejectDialog({ open: false, photoId: null, photoUrl: null, photoType: null, reason: '' })}>
        <DialogTitle sx={{ bgcolor: '#1e293b', color: 'white' }}>Reject Photo</DialogTitle>
        <DialogContent sx={{ bgcolor: '#1e293b' }}>
          <Typography sx={{ color: '#94a3b8', mb: 2 }}>
            Please provide a reason for rejecting this photo.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Rejection reason"
            value={photoRejectDialog.reason}
            onChange={(e) => setPhotoRejectDialog({ ...photoRejectDialog, reason: e.target.value })}
            placeholder="e.g., Photo is blurry, inappropriate content, face not visible..."
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#334155' } }}
            InputLabelProps={{ sx: { color: '#94a3b8' } }}
            InputProps={{ sx: { color: 'white' } }}
          />
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1e293b' }}>
          <Button onClick={() => setPhotoRejectDialog({ open: false, photoId: null, photoUrl: null, photoType: null, reason: '' })} sx={{ color: 'white' }}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleRejectPhoto}
            disabled={!photoRejectDialog.reason.trim()}
          >
            Reject Photo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminUserProfile;
