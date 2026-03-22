import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, Paper, Grid, Button, Avatar, CircularProgress } from '@mui/material';
import { Person, Search, Message, FavoriteBorder, SupportAgent, Refresh } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getImageUrl } from '../utils/imageUrl';
import { normalizeTier, getTierDisplayName, canUpgrade, isPaidTier } from '../utils/subscription';
import api from '../services/api';

const Dashboard = () => {
  const { user, loading, updateUser } = useAuth();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState(null);

  // Fetch fresh profile data for accurate completion calculation
  const fetchProfileData = async () => {
    try {
      const response = await api.get('/profile');
      setProfileData(response.data.user);
    } catch (error) {
      console.error('[Dashboard] Failed to fetch profile data:', error);
    }
  };

  // Auto-refresh user data when tab becomes visible again
  useEffect(() => {
    let isRefreshing = false;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isRefreshing) {
        isRefreshing = true;
        setRefreshing(true);
        // Add small delay to ensure state update
        setTimeout(() => {
          Promise.all([
            updateUser(),
            fetchProfileData()
          ]).finally(() => {
            isRefreshing = false;
            setRefreshing(false);
          });
        }, 100);
      }
    };

    // Also refresh on window focus
    const handleFocus = () => {
      if (!isRefreshing) {
        isRefreshing = true;
        setRefreshing(true);
        setTimeout(() => {
          Promise.all([
            updateUser(),
            fetchProfileData()
          ]).finally(() => {
            isRefreshing = false;
            setRefreshing(false);
          });
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [updateUser]);

  // Fetch fresh profile data on mount and when refreshing
  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleRefresh = async () => {
    console.log('[Dashboard] Manual refresh triggered');
    setRefreshing(true);
    await updateUser();
    // Also fetch fresh profile data
    await fetchProfileData();
    setRefreshing(false);
    console.log('[Dashboard] Refresh completed');
  };

  if (loading) {
    return (
      <Container maxWidth="lg" style={{ marginTop: '2rem' }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="lg" style={{ marginTop: '2rem' }}>
        <Typography variant="h5" align="center">Please login to view your dashboard</Typography>
      </Container>
    );
  }

  const quickActions = [
    {
      icon: <Search style={{ fontSize: 40, color: '#8B5CF6' }} />,
      title: 'Search Profiles',
      description: 'Find compatible matches',
      action: () => navigate('/search')
    },
    {
      icon: <Person style={{ fontSize: 40, color: '#8B5CF6' }} />,
      title: 'My Profile',
      description: 'Update your profile',
      action: () => navigate('/profile')
    },
    {
      icon: <FavoriteBorder style={{ fontSize: 40, color: '#8B5CF6' }} />,
      title: 'Interests',
      description: 'View received interests',
      action: () => navigate('/interests')
    },
    {
      icon: <Message style={{ fontSize: 40, color: '#8B5CF6' }} />,
      title: 'Messages',
      description: 'Chat with matches',
      action: () => navigate('/messages')
    },
    {
      icon: <SupportAgent style={{ fontSize: 40, color: '#8B5CF6' }} />,
      title: 'Chat with Admin',
      description: 'Get support & assistance',
      action: () => navigate('/chat')
    }
  ];

  const profileCompletion = () => {
    // Use profileData from /profile API for accurate calculation, fallback to user
    const data = profileData || user;
    
    // Debug log
    console.log('[Dashboard] Calculating profile completion, using data from:', profileData ? '/profile API' : 'auth/me');
    console.log('[Dashboard] Fields - profilePhoto:', !!data?.profilePhoto, ', photos:', !!data?.photos, ', education:', !!data?.education);
    
    const fields = [
      'profilePhoto',
      'photos',
      'education',
      'profession',
      'bio',
      'height',
      'weight',
      'complexion',
      'physicalStatus',
      'city',
      'state',
      'maritalStatus',
      'familyValues',
      'familyType',
      'familyStatus',
      'aboutFamily',
      'fatherName',
      'fatherOccupation',
      'motherName',
      'motherOccupation',
      'raasi',
      'natchathiram'
    ];
    
    const completedFields = fields.filter(field => {
      let value = data?.[field];
      
      // Handle photos field - could be JSON string or array
      if (field === 'photos' && value) {
        try {
          const photosArray = typeof value === 'string' ? JSON.parse(value) : value;
          return Array.isArray(photosArray) && photosArray.length > 0;
        } catch (e) {
          return false;
        }
      }
      
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      
      // Check if value exists and is not empty (treat empty string, null, undefined as missing)
      return value !== null && value !== undefined && value !== '';
    });
    
    return Math.round((completedFields.length / fields.length) * 100);
  };

  const getPendingFields = () => {
    // Use profileData from /profile API for accurate calculation, fallback to user
    const data = profileData || user;
    
    const fields = [
      { key: 'profilePhoto', label: 'Profile Photo' },
      { key: 'photos', label: 'Gallery Photos' },
      { key: 'education', label: 'Education' },
      { key: 'profession', label: 'Profession' },
      { key: 'bio', label: 'About Me' },
      { key: 'height', label: 'Height' },
      { key: 'weight', label: 'Weight' },
      { key: 'complexion', label: 'Complexion' },
      { key: 'physicalStatus', label: 'Physical Status' },
      { key: 'drinkingHabit', label: 'Drinking Habit' },
      { key: 'smokingHabit', label: 'Smoking Habit' },
      { key: 'diet', label: 'Diet' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'maritalStatus', label: 'Marital Status' },
      { key: 'familyValues', label: 'Family Values' },
      { key: 'familyType', label: 'Family Type' },
      { key: 'familyStatus', label: 'Family Status' },
      { key: 'aboutFamily', label: 'About Family' },
      { key: 'fatherName', label: 'Father Name' },
      { key: 'fatherOccupation', label: 'Father Occupation' },
      { key: 'motherName', label: 'Mother Name' },
      { key: 'motherOccupation', label: 'Mother Occupation' },
      { key: 'raasi', label: 'Raasi' },
      { key: 'natchathiram', label: 'Natchathiram' }
    ];
    
    return fields.filter(field => {
      let value = data?.[field.key];
      if (field.key === 'photos' && value) {
        try {
          const photosArray = typeof value === 'string' ? JSON.parse(value) : value;
          return !Array.isArray(photosArray) || photosArray.length === 0;
        } catch (e) {
          return true;
        }
      }
      if (Array.isArray(value)) {
        return value.length === 0;
      }
      return !value;
    });
  };

  return (
    <Container maxWidth="lg" style={{ marginTop: '2rem' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" style={{ color: '#8B5CF6', fontWeight: 'bold' }}>
          Welcome back, {user?.firstName}! 👋
        </Typography>
        <Button 
          variant="outlined" 
          size="small" 
          startIcon={<Refresh />}
          onClick={handleRefresh}
          sx={{ borderColor: '#8B5CF6', color: '#8B5CF6' }}
        >
          Refresh
        </Button>
      </Box>

      <Grid container spacing={4}>
        {/* Profile Summary */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} style={{ padding: '2rem', textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Profile Summary
            </Typography>
            <Box 
              width={120}
              height={120}
              borderRadius="50%"
              overflow="hidden"
              bgcolor="#FAF7FF"
              display="flex"
              alignItems="center"
              justifyContent="center"
              margin="0 auto 1rem"
              border="3px solid #8B5CF6"
            >
              {user?.profilePhoto ? (
                <Avatar
                  src={getImageUrl(user.profilePhoto)}
                  alt={`${user.firstName} ${user.lastName}`}
                  sx={{ width: '100%', height: '100%' }}
                />
              ) : (
                <Person style={{ fontSize: 60, color: '#8B5CF6' }} />
              )}
            </Box>
            <Typography variant="h5" gutterBottom>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {user?.city}, {user?.state}
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {user?.age} years • {user?.gender === 'MALE' ? 'Male' : 'Female'}
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Community: {user?.community}
            </Typography>
            {user?.customId && (
              <Typography variant="body2" sx={{ 
                color: '#8B5CF6', 
                fontWeight: 'bold',
                fontSize: '0.9rem',
                mb: 1 
              }}>
                ID: {user.customId}
              </Typography>
            )}
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/profile')}
              fullWidth
            >
              View Profile
            </Button>
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} style={{ padding: '2rem' }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={3}>
              {quickActions.map((action, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Paper
                    elevation={2}
                    style={{
                      padding: '1.5rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onClick={action.action}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 8px 16px rgba(139, 92, 246, 0.2)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    <Box mb={1}>{action.icon}</Box>
                    <Typography variant="h6" gutterBottom>
                      {action.title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {action.description}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Profile Completion */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} style={{ padding: '2rem' }}>
            <Typography variant="h6" gutterBottom>
              Profile Completion
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Complete your profile to get better matches
            </Typography>
            <Box 
              height={20}
              borderRadius={10}
              bgcolor="#E0E0E0"
              overflow="hidden"
              mb={1}
            >
              <Box 
                height="100%"
                width={`${profileCompletion()}%`}
                bgcolor="#8B5CF6"
                transition="width 0.3s ease"
              />
            </Box>
            <Typography variant="body2" align="center">
              {profileCompletion()}% Complete
            </Typography>
            {profileCompletion() < 100 && (
              <Box mt={2} textAlign="left">
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Missing fields:
                </Typography>
                {getPendingFields().slice(0, 5).map((field, index) => (
                  <Typography key={index} variant="caption" display="block" color="error">
                    • {field.label}
                  </Typography>
                ))}
                {getPendingFields().length > 5 && (
                  <Typography variant="caption" color="textSecondary">
                    +{getPendingFields().length - 5} more
                  </Typography>
                )}
              </Box>
            )}
            <Button
              variant="text"
              color="primary"
              onClick={() => navigate('/profile')}
              style={{ marginTop: '1rem' }}
            >
              Complete Profile
            </Button>
          </Paper>
        </Grid>

        {/* Status */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} style={{ padding: '2rem' }}>
            <Typography variant="h6" gutterBottom>
              Account Status
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Email Verified:</Typography>
                <Typography 
                  variant="body2" 
                  style={{ color: user?.emailVerified ? '#4CAF50' : '#FF9800' }}
                >
                  {user?.emailVerified ? '✅ Verified' : '⏳ Pending'}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Phone Verified:</Typography>
                <Typography 
                  variant="body2" 
                  style={{ color: user?.phoneVerified ? '#4CAF50' : '#FF9800' }}
                >
                  {user?.phoneVerified ? '✅ Verified' : '⏳ Pending'}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Profile Verified:</Typography>
                <Typography 
                  variant="body2" 
                  style={{ color: user?.isVerified ? '#4CAF50' : '#FF9800' }}
                >
                  {user?.isVerified ? '✅ Verified' : '⏳ Pending'}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Premium Member:</Typography>
                <Typography 
                  variant="body2" 
                  style={{ color: isPaidTier(user?.subscriptionTier) ? '#4CAF50' : '#757575' }}
                >
                  {isPaidTier(user?.subscriptionTier) ? `👑 ${getTierDisplayName(user.subscriptionTier)}` : 'Free'}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;