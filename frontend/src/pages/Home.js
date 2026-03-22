import React from 'react';
import { Box, Typography, Button, Container, Paper, Grid } from '@mui/material';
import { Search, People, Security, Favorite } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    {
      icon: <Search style={{ fontSize: 40, color: '#8B5CF6' }} />,
      title: 'Advanced Search',
      description: 'Find your perfect match with our advanced search filters tailored for the Boyar community.'
    },
    {
      icon: <People style={{ fontSize: 40, color: '#8B5CF6' }} />,
      title: 'Community Focus',
      description: 'Exclusively for the Boyar community with deep understanding of our traditions and values.'
    },
    {
      icon: <Security style={{ fontSize: 40, color: '#8B5CF6' }} />,
      title: 'Verified Profiles',
      description: 'All profiles are verified to ensure authenticity and trustworthiness.'
    },
    {
      icon: <Favorite style={{ fontSize: 40, color: '#8B5CF6' }} />,
      title: 'Privacy First',
      description: 'Your privacy is our priority. Connect with confidence and safety.'
    }
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box 
        py={8} 
        textAlign="center" 
        style={{ 
          background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
          color: 'white'
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h2" gutterBottom style={{ fontWeight: 'bold' }}>
            💍 Vijayalakshmi Boyar Matrimony
          </Typography>
          <Typography variant="h5" paragraph>
            Find Your Perfect Life Partner Within the Boyar Community
          </Typography>
          <Typography variant="body1" paragraph style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
            A trusted platform built exclusively for the Boyar community, understanding our unique traditions,
            cultural values, and matching preferences.
          </Typography>
          
          {!user && (
            <Box display="flex" gap={2} justifyContent="center">
              <Button 
                variant="contained" 
                size="large" 
                onClick={() => navigate('/register')}
                style={{ backgroundColor: 'white', color: '#8B5CF6', padding: '12px 32px' }}
              >
                Get Started
              </Button>
              <Button 
                variant="outlined" 
                size="large" 
                onClick={() => navigate('/search')}
                style={{ borderColor: 'white', color: 'white', padding: '12px 32px' }}
              >
                Browse Profiles
              </Button>
            </Box>
          )}

          {user && (
            <Button 
              variant="contained" 
              size="large" 
              onClick={() => navigate('/dashboard')}
              style={{ backgroundColor: 'white', color: '#8B5CF6', padding: '12px 32px' }}
            >
              Go to Dashboard
            </Button>
          )}
        </Container>
      </Box>

      {/* Features Section */}
      <Box py={8} bgcolor="#FAF7FF">
        <Container maxWidth="lg">
          <Typography variant="h4" textAlign="center" gutterBottom style={{ fontWeight: 'bold' }}>
            Why Choose Us?
          </Typography>
          <Typography variant="body1" textAlign="center" paragraph style={{ maxWidth: '600px', margin: '0 auto 3rem' }}>
            We combine traditional values with modern technology to help you find your perfect life partner.
          </Typography>
          
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Paper 
                  elevation={3} 
                  style={{ 
                    padding: '2rem', 
                    textAlign: 'center', 
                    height: '100%',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(139, 92, 246, 0.2)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <Box mb={2}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" gutterBottom style={{ color: '#8B5CF6' }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {feature.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box py={8} textAlign="center">
        <Container maxWidth="md">
          <Typography variant="h4" gutterBottom style={{ fontWeight: 'bold' }}>
            Growing Community
          </Typography>
          <Grid container spacing={4} style={{ marginTop: '2rem' }}>
            <Grid item xs={12} sm={4}>
              <Typography variant="h3" style={{ color: '#8B5CF6', fontWeight: 'bold' }}>
                1000+
              </Typography>
              <Typography variant="h6">
                Verified Profiles
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="h3" style={{ color: '#8B5CF6', fontWeight: 'bold' }}>
                500+
              </Typography>
              <Typography variant="h6">
                Successful Matches
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="h3" style={{ color: '#8B5CF6', fontWeight: 'bold' }}>
                50+
              </Typography>
              <Typography variant="h6">
                Daily New Members
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default Home;