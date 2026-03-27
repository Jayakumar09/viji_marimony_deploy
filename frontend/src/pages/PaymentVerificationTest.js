/**
 * Payment Verification Test Page
 * Temporary page to test payment proof image display
 * URL: /admin/subscriptions/payment-test
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, CircularProgress, List, ListItem, ListItemButton, ListItemText, Divider } from '@mui/material';
import api from '../services/api';
import { getImageUrl } from '../utils/imageUrl';

const PaymentVerificationTest = () => {
  const [payments, setPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const response = await api.get('/payments/admin/all');
        const paymentList = response.data.payments || [];
        setPayments(paymentList);
        
        // Auto-select payment with transaction ID PAYTM12346
        const targetPayment = paymentList.find(p => p.transactionId === 'PAYTM12346');
        if (targetPayment) {
          setSelectedPayment(targetPayment);
        }
      } catch (err) {
        console.error('Error fetching payments:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

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

  // Debug for selected payment
  const rawProof = selectedPayment?.paymentProof;
  const processedUrl = rawProof ? getImageUrl(rawProof) : '';

  console.log('[PaymentTest] Raw paymentProof:', rawProof);
  console.log('[PaymentTest] Processed URL:', processedUrl);

  return (
    <Box p={3} maxWidth={1200} mx="auto">
      <Typography variant="h4" gutterBottom>
        Payment Verification Test
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Click on a payment to see the payment proof image display
      </Typography>

      <Grid container spacing={3}>
        {/* Payment List */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payments ({payments.length})
              </Typography>
              <List>
                {payments.slice(0, 20).map((payment) => (
                  <React.Fragment key={payment.id}>
                    <ListItem disablePadding>
                      <ListItemButton
                        selected={selectedPayment?.id === payment.id}
                        onClick={() => setSelectedPayment(payment)}
                      >
                        <ListItemText
                          primary={`₹${payment.amount} - ${payment.status}`}
                          secondary={`${payment.planName || 'N/A'} | ${payment.orderId || payment.id}`}
                        />
                      </ListItemButton>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Details & Image */}
        <Grid item xs={12} md={8}>
          {selectedPayment ? (
            <>
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6">Payment Details</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2">Order ID:</Typography>
                      <Typography>{selectedPayment.orderId || selectedPayment.id}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2">Amount:</Typography>
                      <Typography>₹{selectedPayment.amount}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2">Status:</Typography>
                      <Typography>{selectedPayment.status}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2">Method:</Typography>
                      <Typography>{selectedPayment.method || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2">Plan:</Typography>
                      <Typography>{selectedPayment.planName || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2">Transaction ID:</Typography>
                      <Typography>{selectedPayment.transactionId || 'N/A'}</Typography>
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

getImageUrl() result: ${processedUrl || 'NULL'}

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
                      
                      {rawProof.startsWith('http') && (
                        <>
                          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                            Direct URL (Cloudinary):
                          </Typography>
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
                        </>
                      )}
                    </Box>
                  ) : (
                    <Typography color="warning.main">No payment proof uploaded</Typography>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
              <Typography color="textSecondary">
                Select a payment from the list to see details
              </Typography>
            </Box>
          )}
        </Grid>
      </Grid>

      <Button variant="contained" onClick={() => window.history.back()} sx={{ mt: 2 }}>
        Go Back
      </Button>
    </Box>
  );
};

export default PaymentVerificationTest;