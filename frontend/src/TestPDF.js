import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { generateProfilePDF, downloadProfilePDF, getProfilePDFBlob, generateDynamicFilename } from './utils/profilePDFGenerator';

// Test user data
const testUserData = {
  id: '98765',
  profileId: '98765',
  firstName: 'Dharsini',
  lastName: 'Yuvaraj',
  gender: 'Female',
  dateOfBirth: '1998-12-25',
  age: 27,
  bloodGroup: 'O+',
  maritalStatus: 'Unmarried',
  religion: 'Hindu',
  community: 'Boya',
  subCaste: 'Vijayalakshmi',
  email: 'dharsini.yuvaraj@email.com',
  phone: '+91 98432 10567',
  address: '45 South Street, Gandhipuram',
  city: 'Coimbatore',
  state: 'Tamil Nadu',
  country: 'India',
  pincode: '641012',
  education: 'B.Com (CA)',
  occupation: 'Chartered Accountant',
  company: 'Deloitte India',
  annualIncome: '₹9,00,000',
  fatherName: 'Yuvaraj Kumar',
  fatherOccupation: 'Civil Engineer',
  motherName: 'Lakshmi Priya',
  motherOccupation: 'Housewife',
  brothers: 0,
  sisters: 1,
  familyType: 'Nuclear',
  familyStatus: 'Upper Middle Class',
  height: '5\'4"',
  weight: '52 kg',
  complexion: 'Fair',
  bodyType: 'Slim',
  rashi: 'Makara',
  nakshatra: 'Uttara Ashada',
  manglik: 'No',
  birthTime: '08:45 AM',
  birthPlace: 'Coimbatore',
  preferredAgeRange: '28-32',
  preferredHeightRange: '5\'7" - 5\'10"',
  preferredEducation: 'CA/CS/MBA',
  preferredOccupation: 'Chartered Accountant/Engineer',
  preferredLocation: 'Coimbatore',
  aboutMe: 'I am a Chartered Accountant working at Deloitte. I enjoy classical music and cooking. Looking for a well-educated partner from a respected family.',
  photos: []
};

const TestPDF = () => {
  const [loading, setLoading] = useState(false);
  const [filename, setFilename] = useState('');
  const [testStatus, setTestStatus] = useState(null);

  const handleGeneratePDF = async (isSanitized = false) => {
    setLoading(true);
    setTestStatus(null);
    
    try {
      const doc = generateProfilePDF(testUserData, isSanitized);
      const file = generateDynamicFilename(testUserData);
      setFilename(file);
      
      downloadProfilePDF(testUserData, isSanitized, file);
      
      setTestStatus({
        success: true,
        message: `PDF Generated Successfully! Filename: ${file}`
      });
    } catch (error) {
      setTestStatus({
        success: false,
        message: `Error generating PDF: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGetBlob = async () => {
    setLoading(true);
    setTestStatus(null);
    
    try {
      const blob = await getProfilePDFBlob(testUserData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = generateDynamicFilename(testUserData);
      a.click();
      URL.revokeObjectURL(url);
      
      setTestStatus({
        success: true,
        message: 'PDF Blob Created Successfully!'
      });
    } catch (error) {
      setTestStatus({
        success: false,
        message: `Error creating blob: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          PDF Generation Test
        </Typography>
        
        <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
          Testing <strong>profilePDFGenerator.js</strong> functionality with demo user data
        </Typography>

        {testStatus && (
          <Alert severity={testStatus.success ? 'success' : 'error'} sx={{ mb: 2 }}>
            {testStatus.message}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleGeneratePDF(false)}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              Generate Full PDF
            </Button>
            
            <Button
              variant="contained"
              color="secondary"
              onClick={() => handleGeneratePDF(true)}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              Generate Sanitized PDF
            </Button>
          </Box>

          <Button
            variant="outlined"
            onClick={handleGetBlob}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            Get PDF as Blob (Advanced)
          </Button>
        </Box>

        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom>
            Demo Data
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Name: {testUserData.firstName} {testUserData.lastName}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary">
                ID: {testUserData.id}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary">
                Age: {testUserData.age} years
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary">
                Location: {testUserData.city}, {testUserData.state}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default TestPDF;
