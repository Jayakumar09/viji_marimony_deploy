/**
 * Payment Verification Test Page
 * Temporary page to test payment proof image display
 * URL: /admin/payment-test
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, CircularProgress } from '@mui/material';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { getImageUrl } from '../../utils/imageUrl';

const PaymentVerificationTest = () => {
  const { paymentId } = useParams();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/payments/admin/${paymentId}`);
        setPayment(response.data.data);
      } catch (err) {
        console.error('Error fetching payment:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (paymentId) {
      fetchPayment();
    }
  }, [paymentId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">Error: {error}</Typography>
        <Button onClick={() => window.history.back()} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  if (!payment) {
    return (
      <Box p={3}>
        <Typography>Payment not found</Typography>
        <Button onClick={() => window.history.back()} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  // Debug info
  const rawProof = payment.paymentProof;
  const processedUrl = getImageUrl(rawProof);

  console.log('[PaymentTest] Raw paymentProof:', rawProof);
  console.log('[PaymentTest] Processed URL:', processedUrl);

  return (
    <Box p={3} maxWidth={800} mx="auto">
      <Typography variant="h4" gutterBottom>
        Payment Verification Test
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">Payment Details</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="subtitle2">Order ID:</Typography>
              <Typography>{payment.orderId}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2">Amount:</Typography>
              <Typography>₹{payment.amount}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2">Status:</Typography>
              <Typography>{payment.status}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2">Method:</Typography>
              <Typography>{payment.method}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Debug Info</Typography>
          <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, fontFamily: 'monospace' }}>
            <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
{`Raw paymentProof: ${rawProof || 'NULL'}

getImageUrl() result: ${processedUrl}

Image loading: ${rawProof ? 'Attempting to load...' : 'No proof available'}`}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Payment Proof Image</Typography>
          
          {rawProof ? (
            <Box>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Using getImageUrl():
              </Typography>
              <Box
                component="img"
                src={processedUrl}
                alt="Payment Proof"
                sx={{
                  width: '100%',
                  maxHeight: 400,
                  objectFit: 'contain',
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  mb: 2
                }}
                onLoad={() => console.log('[PaymentTest] Image loaded successfully')}
                onError={(e) => {
                  console.error('[PaymentTest] Image load error:', e);
                  e.target.style.display = 'none';
                }}
              />
              
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Direct URL (if Cloudinary):
              </Typography>
              {rawProof.startsWith('http') && (
                <Box
                  component="img"
                  src={rawProof}
                  alt="Payment Proof (Direct)"
                  sx={{
                    width: '100%',
                    maxHeight: 400,
                    objectFit: 'contain',
                    border: '1px solid #e0e0e0',
                    borderRadius: 2
                  }}
                />
              )}
            </Box>
          ) : (
            <Typography color="warning.main">No payment proof uploaded</Typography>
          )}
        </CardContent>
      </Card>

      <Button variant="contained" onClick={() => window.history.back()}>
        Go Back
      </Button>
    </Box>
  );
};

export default PaymentVerificationTest;