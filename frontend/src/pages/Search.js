import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Avatar,
  Chip,
  IconButton,
  Pagination,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import {
  Search,
  FilterList,
  ExpandMore,
  FavoriteBorder,
  Favorite,
  Person,
  VerifiedUser,
  Star,
  LocationOn,
  School,
  Work
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import searchService from '../services/searchService';
import toast from 'react-hot-toast';
import { getImageUrl } from '../utils/imageUrl';
import { useAuth } from '../hooks/useAuth';

const SearchProfiles = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Determine default gender based on logged-in user's gender
  const getDefaultGender = () => {
    if (user?.gender === 'Male') return 'Female';
    if (user?.gender === 'Female') return 'Male';
    return ''; // Default to all if gender not found
  };

  const [filters, setFilters] = useState({
    gender: getDefaultGender(),
    minAge: '',
    maxAge: '',
    community: '',
    subCaste: '',
    city: '',
    state: '',
    education: '',
    profession: '',
    maritalStatus: '',
    page: 1
  });
  const [showFilters, setShowFilters] = useState(true);

  // Update gender filter when user data becomes available
  useEffect(() => {
    if (user?.gender) {
      const oppositeGender = user.gender === 'Male' ? 'Female' : user.gender === 'Female' ? 'Male' : '';
      setFilters(prev => ({
        ...prev,
        gender: oppositeGender
      }));
    }
  }, [user]);

  // Fetch search filters
  const { data: filterOptions } = useQuery(
    ['searchFilters'],
    searchService.getSearchFilters,
    {
      staleTime: 30 * 60 * 1000, // 30 minutes
    }
  );

  // Fetch profiles based on filters
  const { 
    data: searchResults, 
    isLoading, 
    error, 
    refetch 
  } = useQuery(
    ['searchProfiles', filters],
    () => searchService.searchProfiles(filters),
    {
      enabled: true,
      keepPreviousData: true,
    }
  );

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset to first page on filter change
    }));
  };

  const handleSearch = () => {
    refetch();
  };

  const handlePageChange = (event, value) => {
    setFilters(prev => ({
      ...prev,
      page: value
    }));
  };

  const handleViewProfile = (profileId) => {
    navigate(`/profile/${profileId}`);
  };

  const handleSendInterest = async (profileId) => {
    // This will be implemented when we create the interest service
    toast.success('Interest system coming soon!');
  };

  const ProfileCard = ({ profile }) => (
    <Card className="profile-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box position="relative">
        {profile.profilePhoto ? (
          <CardMedia
            component="img"
            height="200"
            image={getImageUrl(profile.profilePhoto)}
            alt={`${profile.firstName} ${profile.lastName}`}
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <Box height={200} display="flex" alignItems="center" justifyContent="center" bgcolor="#f5f5f5">
            <Avatar style={{ width: 80, height: 80 }}>
              <Person style={{ fontSize: 40 }} />
            </Avatar>
          </Box>
        )}
        
        {/* Status badges */}
        <Box position="absolute" top={8} right={8} display="flex" gap={1}>
          {profile.isPremium && (
            <Chip 
              icon={<Star style={{ fontSize: 16 }} />}
              label="Premium" 
              size="small" 
              style={{ 
                backgroundColor: '#FFD700', 
                color: '#000',
                fontWeight: 'bold'
              }} 
            />
          )}
          {profile.isVerified && (
            <Chip 
              icon={<VerifiedUser style={{ fontSize: 16 }} />}
              label="Verified" 
              size="small" 
              color="primary"
            />
          )}
        </Box>
      </Box>

      <CardContent style={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom>
          {profile.firstName} {profile.lastName}, {profile.age}
        </Typography>

        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <LocationOn style={{ fontSize: 16, color: '#666' }} />
          <Typography variant="body2" color="textSecondary">
            {profile.city}, {profile.state}
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Work style={{ fontSize: 16, color: '#666' }} />
          <Typography variant="body2" color="textSecondary">
            {profile.profession || 'Not specified'}
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <School style={{ fontSize: 16, color: '#666' }} />
          <Typography variant="body2" color="textSecondary">
            {profile.education || 'Not specified'}
          </Typography>
        </Box>

        <Box display="flex" flexWrap="wrap" gap={0.5}>
          {profile.height && (
            <Chip label={`Height: ${profile.height}cm`} size="small" variant="outlined" />
          )}
          {profile.maritalStatus && (
            <Chip 
              label={profile.maritalStatus.replace('_', ' ')} 
              size="small" 
              variant="outlined" 
            />
          )}
          {profile.community && (
            <Chip label={profile.community} size="small" variant="outlined" />
          )}
        </Box>

        {profile.bio && (
          <Typography variant="body2" color="textSecondary" style={{ 
            marginTop: '1rem', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}>
            {profile.bio}
          </Typography>
        )}
      </CardContent>

      <Divider />

      <CardActions>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => handleViewProfile(profile.id)}
          style={{ flexGrow: 1 }}
        >
          View Profile
        </Button>
        
        <IconButton 
          color="secondary"
          onClick={() => handleSendInterest(profile.id)}
          disabled={profile.interestStatus === 'PENDING' || profile.interestStatus === 'ACCEPTED'}
        >
          {profile.interestStatus === 'PENDING' || profile.interestStatus === 'ACCEPTED' ? (
            <Favorite color="disabled" />
          ) : (
            <FavoriteBorder />
          )}
        </IconButton>
      </CardActions>
    </Card>
  );

  if (error) {
    return (
      <Container maxWidth="lg" style={{ marginTop: '2rem' }}>
        <Alert severity="error">
          Failed to load profiles. Please try again later.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" style={{ marginTop: '2rem' }}>
      <Typography variant="h4" gutterBottom style={{ color: '#8B5CF6', fontWeight: 'bold' }}>
        Search Profiles
      </Typography>

      {/* Search Filters */}
      <Paper elevation={3} style={{ marginBottom: '2rem' }}>
        <Accordion expanded={showFilters} onChange={() => setShowFilters(!showFilters)}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" gap={1}>
              <FilterList />
              <Typography variant="h6">Search Filters</Typography>
            </Box>
          </AccordionSummary>
          
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Looking For</InputLabel>
                  <Select
                    value={filters.gender}
                    onChange={(e) => handleFilterChange('gender', e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="FEMALE">Bride</MenuItem>
                    <MenuItem value="MALE">Groom</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Min Age"
                  type="number"
                  value={filters.minAge}
                  onChange={(e) => handleFilterChange('minAge', e.target.value)}
                  inputProps={{ min: 18, max: 100 }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Max Age"
                  type="number"
                  value={filters.maxAge}
                  onChange={(e) => handleFilterChange('maxAge', e.target.value)}
                  inputProps={{ min: 18, max: 100 }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Marital Status</InputLabel>
                  <Select
                    value={filters.maritalStatus}
                    onChange={(e) => handleFilterChange('maritalStatus', e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="SINGLE">Single</MenuItem>
                    <MenuItem value="DIVORCED">Divorced</MenuItem>
                    <MenuItem value="WIDOWED">Widowed</MenuItem>
                    <MenuItem value="SEPARATED">Separated</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="City"
                  value={filters.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="State"
                  value={filters.state}
                  onChange={(e) => handleFilterChange('state', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Education"
                  value={filters.education}
                  onChange={(e) => handleFilterChange('education', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Profession"
                  value={filters.profession}
                  onChange={(e) => handleFilterChange('profession', e.target.value)}
                />
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" gap={2} justifyContent="center">
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Search />}
                    onClick={handleSearch}
                    disabled={isLoading}
                  >
                    {isLoading ? <CircularProgress size={20} /> : 'Search'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    onClick={() => setFilters({
                      gender: '',
                      minAge: '',
                      maxAge: '',
                      community: '',
                      subCaste: '',
                      city: '',
                      state: '',
                      education: '',
                      profession: '',
                      maritalStatus: '',
                      page: 1
                    })}
                  >
                    Clear Filters
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Paper>

      {/* Search Results */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        <>
          {searchResults?.profiles?.length > 0 ? (
            <>
              <Box mb={2}>
                <Typography variant="h6">
                  Found {searchResults.pagination.totalProfiles} profiles
                </Typography>
              </Box>

              <Grid container spacing={3}>
                {searchResults.profiles.map((profile) => (
                  <Grid item xs={12} sm={6} md={4} key={profile.id}>
                    <ProfileCard profile={profile} />
                  </Grid>
                ))}
              </Grid>

              {/* Pagination */}
              {searchResults.pagination.totalPages > 1 && (
                <Box display="flex" justifyContent="center" mt={4}>
                  <Pagination
                    count={searchResults.pagination.totalPages}
                    page={searchResults.pagination.currentPage}
                    onChange={handlePageChange}
                    color="primary"
                    size="large"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
            </>
          ) : (
            <Box textAlign="center" py={8}>
              <Search style={{ fontSize: 80, color: '#E0E0E0' }} />
              <Typography variant="h5" color="textSecondary" gutterBottom>
                No profiles found
              </Typography>
              <Typography variant="body1" color="textSecondary">
                Try adjusting your search filters to find more profiles
              </Typography>
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default SearchProfiles;