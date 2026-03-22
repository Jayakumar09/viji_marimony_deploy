import React from 'react';
import { Box, Typography, Container, Paper, Link } from '@mui/material';

const Footer = () => {
  return (
    <Box component="footer" py={4} bgcolor="#8B5CF6" color="white">
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="space-between" flexWrap="wrap" gap={4}>
          <Box flex="1" minWidth="250px">
            <Typography variant="h6" gutterBottom>
              💍 Vijayalakshmi Boyar Matrimony
            </Typography>
            <Typography variant="body2">
              A trusted platform for the Boyar community to find their perfect life partners.
              Built with understanding of our traditions and cultural values.
            </Typography>
          </Box>

          <Box flex="1" minWidth="200px">
            <Typography variant="h6" gutterBottom>
              Quick Links
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Link href="/" color="inherit" underline="hover">Home</Link>
              <Link href="/search" color="inherit" underline="hover">Search Profiles</Link>
              <Link href="/about" color="inherit" underline="hover">About Us</Link>
              <Link href="/contact" color="inherit" underline="hover">Contact</Link>
              <Link href="/terms" color="inherit" underline="hover">Terms & Conditions</Link>
            </Box>
          </Box>

          <Box flex="1" minWidth="250px">
            <Typography variant="h6" gutterBottom>
              Contact Information
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Email:</strong> info@vijayalakshmiboyarmatrimony.com
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Phone:</strong> +91 7639150271
            </Typography>
            <Typography variant="body2">
              <strong>Address:</strong> Tiruchirappalli, Tamilnadu, India
            </Typography>
          </Box>
        </Box>

        <Box mt={4} pt={3} borderTop="1px solid rgba(255,255,255,0.2)" textAlign="center">
          <Typography variant="body2">
            © 2024 Vijayalakshmi Boyar Matrimony. All rights reserved.
          </Typography>
          <Typography variant="caption" display="block" mt={1}>
            Made with ❤️ for the Boyar community
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;