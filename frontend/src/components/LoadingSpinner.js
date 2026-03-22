import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingSpinner = ({ message = 'Loading...' }) => {
  return (
    <Box 
      display="flex" 
      flexDirection="column" 
      justifyContent="center" 
      alignItems="center" 
      height="100vh"
    >
      <CircularProgress size={60} thickness={4} style={{ color: '#8B5CF6' }} />
      <Typography variant="h6" style={{ marginTop: 16, color: '#666' }}>
        {message}
      </Typography>
    </Box>
  );
};

export default LoadingSpinner;