import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Box,
  Avatar,
  Chip,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Tab,
  Tabs,
  Card,
  CardMedia,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  Person,
  LocationOn,
  School,
  Work,
  Star,
  VerifiedUser,
  ArrowBack,
  FavoriteBorder,
  Favorite,
  Message,
  Cake,
  Height,
  Scale,
  Wc,
  FamilyRestroom,
  Description,
  Close,
  KeyboardArrowDown,
  KeyboardArrowUp
} from '@mui/icons-material';
import searchService from '../services/searchService';
import interestService from '../services/interestService';
import toast from 'react-hot-toast';
import { getImageUrl } from '../utils/imageUrl';

const ProfileView = () => {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sanitize = searchParams.get('sanitize') === 'true';
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [showFullProfile, setShowFullProfile] = useState(false);

  // Fetch profile data
  const { 
    data: response, 
    isLoading, 
    error,
    refetch 
  } = useQuery(
    ['profile', profileId],
    () => searchService.getProfileById(profileId),
    {
      enabled: !!profileId,
      retry: 1,
    }
  );

  const profile = response?.profile;
  const [interestDialog, setInterestDialog] = useState(false);
  const [interestMessage, setInterestMessage] = useState('');

  // Send interest mutation
  const sendInterestMutation = useMutation(
    ({ receiverId, message }) => interestService.sendInterest(receiverId, message),
    {
      onSuccess: (data) => {
        toast.success(data.message || 'Interest sent successfully!');
        setInterestDialog(false);
        setInterestMessage('');
        queryClient.invalidateQueries(['profile', profileId]);
        queryClient.invalidateQueries(['interestStats']);
      },
      onError: (error) => {
        const errorMessage = error?.response?.data?.error || error?.message || 'Failed to send interest';
        toast.error(errorMessage);
      }
    }
  );

  const handleSendInterest = () => {
    setInterestDialog(true);
  };

  const confirmSendInterest = () => {
    sendInterestMutation.mutate({ receiverId: profileId, message: interestMessage.trim() });
  };

  const handleSendMessage = () => {
    navigate(`/messages?user=${profileId}`);
  };

  const handleBack = () => {
    navigate('/search');
  };

  const toggleFullProfile = () => {
    setShowFullProfile(!showFullProfile);
    if (!showFullProfile) {
      setActiveTab(0);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !profile) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          {error?.message || 'Profile not found or unavailable'}
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to Search
        </Button>
      </Container>
    );
  }

  const InfoItem = ({ icon, label, value }) => (
    <Box display="flex" alignItems="center" gap={1} mb={1}>
      <IconButton size="small" color="primary">{icon}</IconButton>
      <Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body1">{value || 'Not specified'}</Typography>
      </Box>
    </Box>
  );

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Back button */}
      <Button 
        startIcon={<ArrowBack />} 
        onClick={handleBack}
        sx={{ mb: 2 }}
      >
        Back to Search
      </Button>

      {/* Profile Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          {/* Profile Photo */}
          <Grid item xs={12} sm={4}>
            <Box display="flex" justifyContent="center">
              {profile.profilePhoto ? (
                <Avatar
                  src={getImageUrl(profile.profilePhoto)}
                  alt={`${profile.firstName} ${profile.lastName}`}
                  sx={{ width: 200, height: 200 }}
                />
              ) : (
                <Avatar sx={{ width: 200, height: 200, bgcolor: 'primary.main' }}>
                  <Person sx={{ fontSize: 100 }} />
                </Avatar>
              )}
            </Box>
            
            {/* Name and Verification */}
            <Box display="flex" justifyContent="center" alignItems="center" gap={1} mt={2}>
              <Typography variant="h5">
                {profile.firstName} {profile.lastName}
              </Typography>
              {profile.isVerified && (
                <Chip 
                  icon={<VerifiedUser sx={{ fontSize: 16 }} />}
                  label="Verified"
                  size="small"
                  color="success"
                />
              )}
            </Box>
            
            {/* Action Buttons */}
            <Box display="flex" justifyContent="center" gap={2} mt={3}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={profile.interestStatus ? <Favorite /> : <FavoriteBorder />}
                onClick={handleSendInterest}
                disabled={!!profile.interestStatus || sendInterestMutation.isLoading}
              >
                {sendInterestMutation.isLoading ? 'Sending...' : profile.interestStatus ? 'Interest Sent' : 'Send Interest'}
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Message />}
                onClick={handleSendMessage}
              >
                Message
              </Button>
            </Box>

            {/* Interest Status */}
            {profile.interestStatus && (
              <Box display="flex" justifyContent="center" mt={2}>
                <Chip 
                  label={`Interest ${profile.interestStatus}`}
                  color={profile.interestStatus === 'ACCEPTED' ? 'success' : 'warning'}
                />
              </Box>
            )}
          </Grid>

          {/* 4 Key Fields - Age, Height, Profession, Location */}
          <Grid item xs={12} sm={8}>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <Typography variant="h5">
                Profile Details
              </Typography>
              {profile.isPremium && (
                <Chip 
                  icon={<Star sx={{ fontSize: 16 }} />}
                  label="Premium"
                  size="small"
                  sx={{ backgroundColor: '#FFD700', color: '#000' }}
                />
              )}
            </Box>

            <Grid container spacing={3}>
              {/* Field 1: Age */}
              <Grid item xs={6}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'primary.light', width: 50, height: 50 }}>
                    <Cake />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Age</Typography>
                    <Typography variant="h6">{profile.age} years</Typography>
                  </Box>
                </Box>
              </Grid>

              {/* Field 2: Height */}
              <Grid item xs={6}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'secondary.light', width: 50, height: 50 }}>
                    <Height />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Height</Typography>
                    <Typography variant="h6">{profile.height ? `${profile.height} cm` : 'Not specified'}</Typography>
                  </Box>
                </Box>
              </Grid>

              {/* Field 3: Profession */}
              <Grid item xs={6}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'success.light', width: 50, height: 50 }}>
                    <Work />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Profession</Typography>
                    <Typography variant="h6">{profile.profession || 'Not specified'}</Typography>
                  </Box>
                </Box>
              </Grid>

              {/* Field 4: Location */}
              <Grid item xs={6}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'warning.light', width: 50, height: 50 }}>
                    <LocationOn />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Location</Typography>
                    <Typography variant="h6">{profile.city}, {profile.state}</Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>

            {/* View Full Profile Toggle Button */}
            <Box display="flex" justifyContent="center" mt={3}>
              <Button
                variant="outlined"
                color="primary"
                onClick={toggleFullProfile}
                endIcon={showFullProfile ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
              >
                {showFullProfile ? 'View Less' : 'View Full Profile'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Full Profile Details - Conditionally Rendered */}
      {showFullProfile && (
        <>
          {/* Tabs for detailed information */}
          <Paper elevation={3}>
            <Tabs 
              value={activeTab} 
              onChange={(e, v) => setActiveTab(v)}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
            >
              <Tab label="About" />
              <Tab label="Physical" />
              <Tab label="Family" />
            </Tabs>

            {/* About Tab */}
            {activeTab === 0 && (
              <Box p={3}>
                <Typography variant="h6" gutterBottom>About</Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1" paragraph>
                  {profile.bio || 'No bio available'}
                </Typography>
                
                <Grid container spacing={2} mt={1}>
                  <Grid item xs={12} sm={6}>
                    <InfoItem 
                      icon={<School />} 
                      label="Education Details" 
                      value={profile.education} 
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoItem 
                      icon={<Work />} 
                      label="Profession" 
                      value={profile.profession} 
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoItem 
                      icon={<Description />} 
                      label="Income" 
                      value={profile.income} 
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Physical Tab */}
            {activeTab === 1 && (
              <Box p={3}>
                <Typography variant="h6" gutterBottom>Physical Attributes</Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <InfoItem 
                      icon={<Height />} 
                      label="Height" 
                      value={profile.height ? `${profile.height} cm` : null} 
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <InfoItem 
                      icon={<Scale />} 
                      label="Weight" 
                      value={profile.weight ? `${profile.weight} kg` : null} 
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <InfoItem 
                      icon={<Wc />} 
                      label="Complexion" 
                      value={profile.complexion} 
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Family Tab */}
            {activeTab === 2 && (
              <Box p={3}>
                <Typography variant="h6" gutterBottom>Family Details</Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1" paragraph>
                  <strong>Family Values:</strong> {profile.familyValues || 'Not specified'}
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>Family Type:</strong> {profile.familyType || 'Not specified'}
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>Family Status:</strong> {profile.familyStatus || 'Not specified'}
                </Typography>
                <Typography variant="body1">
                  <strong>About Family:</strong> {profile.aboutFamily || 'No family information available'}
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Photos Gallery */}
          {profile.photos && Array.isArray(profile.photos) && profile.photos.length > 0 && (
            <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>Photos</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {profile.photos.map((photo, index) => (
                  <Grid item xs={6} sm={4} md={3} key={index}>
                    <Card>
                      <CardMedia
                        component="img"
                        height="150"
                        image={getImageUrl(photo)}
                        alt={`Photo ${index + 1}`}
                        style={{ objectFit: 'cover' }}
                      />
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

          {/* Collapse Button */}
          <Box display="flex" justifyContent="center" mt={3}>
            <Button
              variant="outlined"
              color="primary"
              onClick={toggleFullProfile}
              endIcon={<KeyboardArrowUp />}
            >
              View Less
            </Button>
          </Box>
        </>
      )}

      {/* Send Interest Dialog */}
      <Dialog 
        open={interestDialog} 
        onClose={() => setInterestDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Send Interest to {profile?.firstName}</Typography>
            <IconButton onClick={() => setInterestDialog(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" paragraph>
            Adding a personal message increases your chances of getting a response!
          </Typography>
          <TextField
            fullWidth
            label="Message (Optional)"
            multiline
            rows={4}
            value={interestMessage}
            onChange={(e) => setInterestMessage(e.target.value)}
            placeholder="Write a personal message..."
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInterestDialog(false)} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={confirmSendInterest} 
            color="primary" 
            variant="contained"
            disabled={sendInterestMutation.isLoading}
          >
            {sendInterestMutation.isLoading ? 'Sending...' : 'Send Interest'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProfileView;
