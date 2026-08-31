import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Box,
  CircularProgress,
  Alert,
  Button,
  Tabs,
  Tab,
  Pagination,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Star as StarIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  Favorite as FavoriteIcon,
  DirectionsWalk as WalkIcon,
  VerifiedUser as VerifiedIcon,
  CompareArrows as CompareIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getImageUrl } from '../utils/imageUrl';
import { useAuth } from '../hooks/useAuth';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

// AI Suggestions Panel Component
const AISuggestionsPanel = ({ profile, suggestions }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
      <AccordionSummary
        expandIcon={<WalkIcon />}
        aria-controls="ai-suggestions-content"
        id="ai-suggestions-header"
      >
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          <StarIcon sx={{ mr: 1, color: '#FF6B6B' }} />
          AI Match Analysis
        </Typography>
        <Chip
          label={`${suggestions.matchScore}% Match`}
          sx={{ ml: 2, backgroundColor: suggestions.matchScore >= 80 ? '#4CAF50' : suggestions.matchScore >= 60 ? '#FF9800' : '#f44336', color: 'white' }}
        />
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, color: '#1976D2' }}>
                  Compatibility Breakdown
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><PersonIcon color="primary" /></ListItemIcon>
                    <ListItemText
                      primary="Age"
                      secondary={`You: ${suggestions.compatibility.age.user} | Match: ${suggestions.compatibility.age.target} (Diff: ${suggestions.compatibility.age.difference} years)`}
                    />
                  </ListItem>
                  {suggestions.compatibility.age.compatible && (
                    <Chip label="✓ Age compatible" size="small" color="success" sx={{ ml: 2 }} />
                  )}
                </List>
                <Divider sx={{ my: 2 }} />
                <List dense>
                  <ListItem>
                    <ListItemIcon><LocationIcon color="primary" /></ListItemIcon>
                    <ListItemText
                      primary="Location"
                      secondary={`You: ${suggestions.compatibility.location.user} | Match: ${suggestions.compatibility.location.target}`}
                    />
                  </ListItem>
                  {suggestions.compatibility.location.sameLocation && (
                    <Chip label="✓ Same city" size="small" color="success" sx={{ ml: 2 }} />
                  )}
                  {suggestions.compatibility.location.sameState && (
                    <Chip label="✓ Same state" size="small" color="success" sx={{ ml: 1 }} />
                  )}
                </List>
                <Divider sx={{ my: 2 }} />
                <List dense>
                  <ListItem>
                    <ListItemIcon><SchoolIcon color="primary" /></ListItemIcon>
                    <ListItemText
                      primary="Education"
                      secondary={`You: ${suggestions.compatibility.education.user} | Match: ${suggestions.compatibility.education.target}`}
                    />
                  </ListItem>
                </List>
                <Divider sx={{ my: 2 }} />
                <List dense>
                  <ListItem>
                    <ListItemIcon><StarIcon color="primary" /></ListItemIcon>
                    <ListItemText
                      primary="Religion/Caste"
                      secondary={`You: ${suggestions.compatibility.religion.user} | Match: ${suggestions.compatibility.religion.target}`}
                    />
                  </ListItem>
                  {suggestions.compatibility.religion.same && (
                    <Chip label="✓ Same religion" size="small" color="success" sx={{ ml: 2 }} />
                  )}
                  <ListItem>
                    <ListItemText
                      secondary={`Caste: You: ${suggestions.compatibility.caste.user} | Match: ${suggestions.compatibility.caste.target}`}
                    />
                  </ListItem>
                  {suggestions.compatibility.caste.same && (
                    <Chip label="✓ Same caste" size="small" color="success" sx={{ ml: 2 }} />
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, color: '#1976D2' }}>
                  <FavoriteIcon sx={{ mr: 1, color: '#E91E63' }} />
                  Match Strengths
                </Typography>
                {suggestions.strengths && suggestions.strengths.length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}}>
                    {suggestions.strengths.map((strength, idx) => (
                      <Chip
                        key={idx}
                        label={strength}
                        color="success"
                        variant="outlined"
                        icon={<StarIcon />}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography color="textSecondary">No specific strengths identified</Typography>
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" sx={{ mb: 2, color: '#1976D2' }}>
                  AI Recommendations
                </Typography>
                <List>
                  {suggestions.recommendations && suggestions.recommendations.length > 0 ? (
                    suggestions.recommendations.map((rec, idx) => (
                      <ListItem key={idx}>
                        <ListItemIcon><WalkIcon color="primary" /></ListItemIcon>
                        <ListItemText primary={rec} />
                      </ListItem>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemText primary="No specific recommendations" />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

const Matches = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState({
    minAge: '',
    maxAge: '',
    location: '',
    religion: '',
    caste: '',
    maritalStatus: '',
    education: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['ai-matches', tabValue, page, limit, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters.minAge && { minAge: filters.minAge }),
        ...(filters.maxAge && { maxAge: filters.maxAge }),
        ...(filters.location && { location: filters.location }),
        ...(filters.religion && { religion: filters.religion }),
        ...(filters.caste && { caste: filters.caste }),
        ...(filters.maritalStatus && { maritalStatus: filters.maritalStatus }),
        ...(filters.education && { education: filters.education })
      });
      const response = await axios.get(`${API_BASE}/ai/matches?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return response.data;
    },
    keepPreviousData: true
  });

  const { data: profileData } = useQuery({
    queryKey: ['ai-profile', user?.id],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/ai/profile`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return response.data;
    },
    enabled: !!user?.id
  });

  const handleFilterChange = (field) => (event) => {
    setFilters(prev => ({ ...prev, [field]: event.target.value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      minAge: '',
      maxAge: '',
      location: '',
      religion: '',
      caste: '',
      maritalStatus: '',
      education: ''
    });
    setPage(1);
  };

  const getMatchDetails = async (userId) => {
    try {
      const response = await axios.get(`${API_BASE}/ai/matches/${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSelectedMatch(response.data.data);
    } catch (err) {
      toast.error('Failed to fetch match details');
    }
  };

  if (isLoading && !data) {
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
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976D2' }}>
              <StarIcon sx={{ mr: 1, color: '#FF6B6B' }} />
              AI Match Suggestions
            </Typography>
          </Grid>
          {profileData?.data && (
            <Grid item>
              <Chip
                icon={<VerifiedIcon />}
                label="AI Profile Active"
                color="primary"
                variant="outlined"
              />
            </Grid>
          )}
        </Grid>
        <Typography color="textSecondary" sx={{ mt: 1, mb: 2 }}>
          Discover compatible matches based on AI-powered analysis of your profile and preferences
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Paper elevation={2} sx={{ p: 2, height: 'fit-content' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Filters
              </Typography>
              <IconButton
                onClick={() => setShowFilters(!showFilters)}
                size="small"
              >
                <FilterListIcon />
              </IconButton>
            </Box>
            <Box sx={{ display: showFilters ? 'block' : 'none' }}>
              <TextField
                fullWidth
                label="Min Age"
                type="number"
                value={filters.minAge}
                onChange={handleFilterChange('minAge')}
                size="small"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Max Age"
                type="number"
                value={filters.maxAge}
                onChange={handleFilterChange('maxAge')}
                size="small"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Location"
                value={filters.location}
                onChange={handleFilterChange('location')}
                size="small"
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Religion</InputLabel>
                <Select
                  value={filters.religion}
                  onChange={handleFilterChange('religion')}
                  label="Religion"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Hindu">Hindu</MenuItem>
                  <MenuItem value="Muslim">Muslim</MenuItem>
                  <MenuItem value="Christian">Christian</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Caste"
                value={filters.caste}
                onChange={handleFilterChange('caste')}
                size="small"
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Marital Status</InputLabel>
                <Select
                  value={filters.maritalStatus}
                  onChange={handleFilterChange('maritalStatus')}
                  label="Marital Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Never Married">Never Married</MenuItem>
                  <MenuItem value="Divorced">Divorced</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Education</InputLabel>
                <Select
                  value={filters.education}
                  onChange={handleFilterChange('education')}
                  label="Education"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Graduate">Graduate</MenuItem>
                  <MenuItem value="Post Graduate">Post Graduate</MenuItem>
                </Select>
              </FormControl>
              <Button
                fullWidth
                variant="outlined"
                onClick={resetFilters}
                size="small"
              >
                Reset Filters
              </Button>
            </Box>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Matching Criteria
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><PersonIcon sx={{ fontSize: 16 }} /></ListItemIcon>
                  <ListItemText primary="Age compatibility" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><LocationIcon sx={{ fontSize: 16 }} /></ListItemIcon>
                  <ListItemText primary="Location match" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><StarIcon sx={{ fontSize: 16 }} /></ListItemIcon>
                  <ListItemText primary="Religion/Caste" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><SchoolIcon sx={{ fontSize: 16 }} /></ListItemIcon>
                  <ListItemText primary="Education level" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><WorkIcon sx={{ fontSize: 16 }} /></ListItemIcon>
                  <ListItemText primary="Occupation" />
                </ListItem>
              </List>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={9}>
          <Paper elevation={2} sx={{ p: 3 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error.message || 'Failed to load matches'}
              </Alert>
            )}

            {!isFetching && data?.data?.matches?.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <FavoriteIcon sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
                <Typography variant="h6" color="textSecondary">
                  No matches found
                </Typography>
                <Typography color="textSecondary" sx={{ mt: 1 }}>
                  Try adjusting your filters or updating your profile
                </Typography>
              </Box>
            ) : (
              <>
                <Grid container spacing={3}>
                  {data?.data?.matches?.map((match) => (
                    <Grid item xs={12} key={match.user.id}>
                      <Card
                        sx={{
                          transition: 'transform 0.2s',
                          '&:hover': { transform: 'translateY(-2px)' },
                          borderLeft: '4px solid',
                          borderLeftColor: match.matchScore >= 80 ? 'success.main' : match.matchScore >= 60 ? 'warning.main' : 'error.main'
                        }}
                      >
                        <CardContent>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item>
                              <Avatar
                                src={getImageUrl(match.user.profilePhoto)}
                                alt={`${match.user.firstName} ${match.user.lastName}`}
                                sx={{ width: 80, height: 80 }}
                              >
                                {match.user.firstName?.[0]}{match.user.lastName?.[0]}
                              </Avatar>
                            </Grid>
                            <Grid item xs={12} sm={8}>
                              <Grid container spacing={1}>
                                <Grid item xs={12}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                      {match.user.firstName} {match.user.lastName}
                                    </Typography>
                                    {match.user.isVerified && (
                                      <VerifiedIcon color="primary" fontSize="small" />
                                    )}
                                    <Chip
                                      label={`${match.matchScore}%`}
                                      size="small"
                                      sx={{
                                        backgroundColor: match.matchScore >= 80 ? '#4CAF50' : match.matchScore >= 60 ? '#FF9800' : '#f44336',
                                        color: 'white',
                                        fontWeight: 'bold'
                                      }}
                                    />
                                  </Box>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                                    <PersonIcon sx={{ fontSize: 16, mr: 0.5 }} />
                                    <Typography variant="body2">
                                      {match.user.age} years, {match.profile.gender}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                                    <LocationIcon sx={{ fontSize: 16, mr: 0.5 }} />
                                    <Typography variant="body2">
                                      {match.user.city}, {match.user.state}
                                    </Typography>
                                  </Box>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                                    <SchoolIcon sx={{ fontSize: 16, mr: 0.5 }} />
                                    <Typography variant="body2">
                                      {match.profile.education}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                                    <WorkIcon sx={{ fontSize: 16, mr: 0.5 }} />
                                    <Typography variant="body2">
                                      {match.profile.occupation}
                                    </Typography>
                                  </Box>
                                </Grid>
                                {match.profile.aboutMe && (
                                  <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                      "{match.profile.aboutMe.substring(0, 100)}..."
                                    </Typography>
                                  </Grid>
                                )}
                              </Grid>
                            </Grid>
                            <Grid item xs={12} sm={12}>
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                                {match.compatibility?.sameLocation && (
                                  <Chip label="Same City" size="small" color="success" variant="outlined" />
                                )}
                                {match.compatibility?.sameState && (
                                  <Chip label="Same State" size="small" color="success" variant="outlined" />
                                )}
                                {match.compatibility?.sameReligion && (
                                  <Chip label="Same Religion" size="small" color="success" variant="outlined" />
                                )}
                                {match.compatibility?.sameCaste && (
                                  <Chip label="Same Caste" size="small" color="success" variant="outlined" />
                                )}
                              </Box>
                              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                                <Button
                                  variant="contained"
                                  size="small"
                                  onClick={() => getMatchDetails(match.user.id)}
                                  startIcon={<CompareIcon />}
                                >
                                  View Analysis
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<FavoriteIcon />}
                                >
                                  Send Interest
                                </Button>
                              </Box>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {isFetching && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                )}

                {data?.data?.pagination && data.data.pagination.totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={data.data.pagination.totalPages}
                      page={page}
                      onChange={(e, p) => setPage(p)}
                      color="primary"
                      size="large"
                    />
                  </Box>
                )}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      {selectedMatch && (
        <AISuggestionsPanel
          profile={selectedMatch.user}
          suggestions={selectedMatch}
        />
      )}
    </Container>
  );
};

export default Matches;