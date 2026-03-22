import React from 'react';
import { Container, Typography, Box, Paper, Grid, Avatar, Chip } from '@mui/material';
import { EmojiObjects, Verified, Search, Favorite, Support } from '@mui/icons-material';

const About = () => {
  const features = [
    {
      icon: <Search sx={{ fontSize: 40, color: '#8B5CF6' }} />,
      title: 'Smart Matching',
      description: 'Our AI-powered algorithm matches you with compatible partners based on preferences, compatibility, and profile completeness.'
    },
    {
      icon: <Verified sx={{ fontSize: 40, color: '#8B5CF6' }} />,
      title: 'AI Verification',
      description: 'Every profile is verified using advanced AI technology to ensure authenticity and reduce fake profiles.'
    },
    {
      icon: <Favorite sx={{ fontSize: 40, color: '#8B5CF6' }} />,
      title: 'Genuine Connections',
      description: 'We focus on quality over quantity, helping you find meaningful relationships within the Boyar community.'
    },
    {
      icon: <Support sx={{ fontSize: 40, color: '#8B5CF6' }} />,
      title: 'Dedicated Support',
      description: 'Our team is here to assist you throughout your journey to find your perfect life partner.'
    }
  ];

  const stats = [
    { value: '5000+', label: 'Active Profiles' },
    { value: '1000+', label: 'Happy Couples' },
    { value: '50+', label: 'Communities' },
    { value: '24/7', label: 'Support' }
  ];

  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Hero Section */}
        <Paper 
          elevation={3} 
          sx={{ 
            p: 6, 
            mb: 4, 
            textAlign: 'center', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 2
          }}
        >
          <EmojiObjects sx={{ fontSize: 60, color: 'white', mb: 2 }} />
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'white' }}>
            About Vijayalakshmi Boyar Matrimony
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)', maxWidth: 800, mx: 'auto' }}>
            Connecting hearts within the Boyar community since 2020. We help thousands find their perfect life partners through technology and tradition.
          </Typography>
        </Paper>

        {/* Stats Section */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {stats.map((stat, index) => (
            <Grid item xs={6} md={3} key={index}>
              <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#8B5CF6' }}>
                  {stat.value}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {stat.label}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Mission Section */}
        <Paper sx={{ p: 4, mb: 4, borderRadius: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3, color: '#333' }}>
            Our Mission
          </Typography>
          <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.8 }}>
            Vijayalakshmi Boyar Matrimony was established with a simple mission: to help individuals from the Boyar community find their perfect life partners in a secure, trustworthy, and respectful environment.
          </Typography>
          <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.8 }}>
            We understand the importance of cultural compatibility and traditional values in Indian marriages. Our platform bridges the gap between tradition and technology, making it easier for community members to connect and find meaningful relationships.
          </Typography>
        </Paper>

        {/* Features Section */}
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3, textAlign: 'center', color: '#333' }}>
          Why Choose Us
        </Typography>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Paper sx={{ p: 4, height: '100%', borderRadius: 2, textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: '#f3e8ff', width: 80, height: 80, mx: 'auto', mb: 2 }}>
                  {feature.icon}
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Community Section */}
        <Paper sx={{ p: 4, mb: 4, borderRadius: 2, bgcolor: '#f3e8ff' }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3, color: '#333' }}>
            Our Community
          </Typography>
          <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.8 }}>
            We serve members from various sub-communities within the Boyar community, including:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 2 }}>
            <Chip label="Boyas" sx={{ bgcolor: 'white' }} />
            <Chip label="Kal Oddars" sx={{ bgcolor: 'white' }} />
            <Chip label="Sooramari Oddars" sx={{ bgcolor: 'white' }} />
            <Chip label="Nellorepet Oddars" sx={{ bgcolor: 'white' }} />
            <Chip label="Mannu Oddars" sx={{ bgcolor: 'white' }} />
          </Box>
          <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.8, mt: 3 }}>
            We welcome members from all backgrounds and are committed to helping everyone find their perfect match within our community.
          </Typography>
        </Paper>

        {/* Values Section */}
        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3, color: '#333' }}>
            Our Values
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#8B5CF6', mb: 1 }}>
                Trust & Safety
              </Typography>
              <Typography variant="body2" color="text.secondary">
                We prioritize the safety and security of our members through AI verification and strict community guidelines.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#8B5CF6', mb: 1 }}>
                Respect & Dignity
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Every member is treated with respect. We maintain a harassment-free environment for all.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#8B5CF6', mb: 1 }}>
                Transparency
              </Typography>
              <Typography variant="body2" color="text.secondary">
                We believe in honest communication and clear policies. No hidden fees or surprises.
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Contact CTA */}
        <Box sx={{ mt: 4, textAlign: 'center', pb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2, color: '#333' }}>
            Ready to Find Your Perfect Match?
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Join thousands of happy members who found their life partners through Vijayalakshmi Boyar Matrimony.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default About;
