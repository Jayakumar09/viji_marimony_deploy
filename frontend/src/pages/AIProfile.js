import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  AutoFixHigh as AutoFixIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Star as StarIcon
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const AIProfile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState('');

  const defaultFormData = {
    firstName: '',
    lastName: '',
    age: '',
    gender: '',
    education: '',
    occupation: '',
    city: '',
    state: '',
    country: 'India',
    maritalStatus: '',
    religion: '',
    caste: '',
    motherTongue: '',
    fatherName: '',
    motherName: '',
    familyType: '',
    familyValues: '',
    aboutFamily: '',
    interests: '',
    partnerPreferences: '',
    photoUrls: ''
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [generatedProfile, setGeneratedProfile] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchAIProfile();
    }
  }, [user?.id]);

  const fetchAIProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/ai/profile`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setProfile(response.data.data);
      // Pre-fill form with existing data
      const p = response.data.data;
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        age: p.age || '',
        gender: p.gender || '',
        education: p.education || '',
        occupation: p.occupation || '',
        city: user.city || '',
        state: user.state || '',
        country: user.country || 'India',
        maritalStatus: p.maritalStatus || '',
        religion: p.religion || '',
        caste: p.caste || '',
        motherTongue: p.motherTongue || '',
        fatherName: user.fatherName || '',
        motherName: user.motherName || '',
        familyType: user.familyType || '',
        familyValues: user.familyValues || '',
        aboutFamily: user.aboutFamily || '',
        interests: '',
        partnerPreferences: p.partnerPreferences ? 
          (typeof p.partnerPreferences === 'string' ? p.partnerPreferences : JSON.stringify(p.partnerPreferences)) : '',
        photoUrls: p.photoUrls ? JSON.stringify(p.photoUrls) : ''
      });
    } catch (err) {
      setError('Failed to load profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateProfile = async () => {
    if (!user?.id) {
      toast.error('Please login first');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        age: parseInt(formData.age) || 25
      };

      const response = await axios.post(`${API_BASE}/ai/generate-profile`, submitData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setGeneratedProfile(response.data.data.generated);
      setProfile(response.data.data.profile);
      setEditMode(false);
      toast.success('Profile generated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate profile');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updateData = {
        aboutMe: formData.aboutMe || profile?.aboutMe,
        partnerPreferences: formData.partnerPreferences,
        photoUrls: formData.photoUrls ? JSON.parse(formData.photoUrls) : profile?.photoUrls || [],
        isVerified: profile?.isVerified || false
      };

      const response = await axios.put(`${API_BASE}/ai/profile`, updateData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setProfile(response.data.data);
      setEditMode(false);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error('Failed to update profile');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976D2', display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoFixIcon sx={{ color: '#FF6B6B' }} />
              AI Profile Assistant
            </Typography>
          </Grid>
          {profile?.isVerified && (
            <Grid item>
              <Chip icon={<StarIcon />} label="AI Verified" color="primary" />
            </Grid>
          )}
        </Grid>
        <Typography color="textSecondary" sx={{ mt: 1 }}>
          Let AI help you create an attractive matrimonial profile with culturally appropriate content
        </Typography>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {generatedProfile && (
        <Accordion defaultExpanded sx={{ mb: 3 }}>
          <AccordionSummary expandIcon={<InfoIcon />}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              <StarIcon sx={{ mr: 1, color: '#FF6B6B' }} />
              AI Generated Content
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="primary" gutterBottom>
                      About Me
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                      {generatedProfile.aboutMe}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Personality Summary
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                      {generatedProfile.personalitySummary}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Profile Information
          </Typography>
          <Box>
            {!editMode && profile ? (
              <Tooltip title="Edit Profile">
                <IconButton onClick={() => setEditMode(true)} color="primary">
                  <EditIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={saveProfile}
                disabled={saving}
                sx={{ mr: 1 }}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<AutoFixIcon />}
              onClick={generateProfile}
              disabled={generating}
              color="secondary"
            >
              {generating ? 'Generating...' : 'AI Generate'}
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              disabled={!editMode}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              disabled={!editMode}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Age"
              name="age"
              type="number"
              value={formData.age}
              onChange={handleInputChange}
              disabled={!editMode}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Gender"
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              disabled={!editMode}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Marital Status"
              name="maritalStatus"
              value={formData.maritalStatus}
              onChange={handleInputChange}
              disabled={!editMode}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Education"
              name="education"
              value={formData.education}
              onChange={handleInputChange}
              disabled={!editMode}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Occupation"
              name="occupation"
              value={formData.occupation}
              onChange={handleInputChange}
              disabled={!editMode}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="City"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              disabled={!editMode}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="State"
              name="state"
              value={formData.state}
              onChange={handleInputChange}
              disabled={!editMode}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Country"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              disabled={!editMode}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Religion"
              name="religion"
              value={formData.religion}
              onChange={handleInputChange}
              disabled={!editMode}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Caste"
              name="caste"
              value={formData.caste}
              onChange={handleInputChange}
              disabled={!editMode}
              size="small"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="About Me"
              name="aboutMe"
              multiline
              rows={4}
              value={formData.aboutMe || profile?.aboutMe || ''}
              onChange={handleInputChange}
              disabled={!editMode}
              helperText="Describe yourself for your profile"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Partner Preferences"
              name="partnerPreferences"
              multiline
              rows={3}
              value={formData.partnerPreferences}
              onChange={handleInputChange}
              disabled={!editMode}
              helperText="Describe what you're looking for in a partner (JSON format or plain text)"
            />
          </Grid>

          {editMode && (
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<InfoIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    Additional Family Information (Optional)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Mother Tongue"
                        name="motherTongue"
                        value={formData.motherTongue}
                        onChange={handleInputChange}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Father Name"
                        name="fatherName"
                        value={formData.fatherName}
                        onChange={handleInputChange}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Mother Name"
                        name="motherName"
                        value={formData.motherName}
                        onChange={handleInputChange}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Family Type"
                        name="familyType"
                        value={formData.familyType}
                        onChange={handleInputChange}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Family Values"
                        name="familyValues"
                        value={formData.familyValues}
                        onChange={handleInputChange}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Container>
  );
};

export default AIProfile;