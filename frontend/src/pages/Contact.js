import React, { useState } from 'react';
import { Container, Typography, Box, Paper, Grid, TextField, Button, Avatar, Divider } from '@mui/material';
import { Email, Phone, LocationOn, Send, AccessTime } from '@mui/icons-material';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real app, this would send the data to the backend
    console.log('Contact form submitted:', formData);
    setSubmitted(true);
  };

  const contactInfo = [
    {
      icon: <Email sx={{ fontSize: 30, color: '#8B5CF6' }} />,
      title: 'Email Us',
      details: 'info@vijayalakshmiboyarmatrimony.com',
      description: 'We respond within 24 hours'
    },
    {
      icon: <Phone sx={{ fontSize: 30, color: '#8B5CF6' }} />,
      title: 'Call Us',
      details: '+91 7639150271',
      description: 'Mon - Sat, 9AM - 7PM'
    },
    {
      icon: <LocationOn sx={{ fontSize: 30, color: '#8B5CF6' }} />,
      title: 'Visit Us',
      details: 'Tamil Nadu, India',
      description: 'We operate online across India'
    },
    {
      icon: <AccessTime sx={{ fontSize: 30, color: '#8B5CF6' }} />,
      title: 'Working Hours',
      details: 'Monday - Saturday',
      description: '9:00 AM - 7:00 PM'
    }
  ];

  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
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
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'white' }}>
            Contact Us
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)', maxWidth: 600, mx: 'auto' }}>
            Have questions? We'd love to hear from you. Get in touch with our team.
          </Typography>
        </Paper>

        {/* Contact Info Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {contactInfo.map((info, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Paper sx={{ p: 3, height: '100%', borderRadius: 2, textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: '#f3e8ff', width: 60, height: 60, mx: 'auto', mb: 2 }}>
                  {info.icon}
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {info.title}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#8B5CF6', mb: 0.5 }}>
                  {info.details}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {info.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Contact Form */}
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 4, borderRadius: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
                Send us a Message
              </Typography>
              
              {submitted ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" sx={{ color: 'green', mb: 2 }}>
                    Thank you for contacting us!
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    We have received your message and will get back to you within 24 hours.
                  </Typography>
                  <Button 
                    variant="outlined" 
                    sx={{ mt: 3 }}
                    onClick={() => setSubmitted(false)}
                  >
                    Send Another Message
                  </Button>
                </Box>
              ) : (
                <form onSubmit={handleSubmit}>
                  <TextField
                    fullWidth
                    label="Your Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Phone Number"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Your Message"
                    name="message"
                    multiline
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    required
                    sx={{ mb: 3 }}
                  />
                  <Button 
                    type="submit" 
                    variant="contained" 
                    size="large"
                    fullWidth
                    startIcon={<Send />}
                    sx={{ 
                      bgcolor: '#8B5CF6', 
                      '&:hover': { bgcolor: '#7C3AED' },
                      py: 1.5
                    }}
                  >
                    Send Message
                  </Button>
                </form>
              )}
            </Paper>
          </Grid>

          {/* Additional Info */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 4, borderRadius: 2, mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
                Frequently Asked Questions
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#8B5CF6', mb: 1 }}>
                  How do I register?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Click the "Register" button in the navigation menu and fill out the registration form with your details.
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#8B5CF6', mb: 1 }}>
                  Is it free to join?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Yes, basic registration is completely free. We also offer premium plans with additional features.
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#8B5CF6', mb: 1 }}>
                  How does AI verification work?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Our AI system verifies your profile by matching your selfie with your profile photo and validating your documents.
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#8B5CF6', mb: 1 }}>
                  What payment methods do you accept?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  We accept bank transfers (NEFT/RTGS/IMPS) and UPI payments (Google Pay, PhonePe, Paytm, etc.).
                </Typography>
              </Box>
            </Paper>

            {/* Emergency Contact */}
            <Paper sx={{ p: 3, borderRadius: 2, bgcolor: '#fff3e0', borderLeft: '4px solid #ff9800' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                Need urgent assistance?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                For urgent queries, you can call us directly at <strong>+91 7639150271</strong> during working hours.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Contact;
