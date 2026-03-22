/**
 * Payment Success Page
 * 
 * Displayed after successful manual payment proof submission
 * Shows transaction details and subscription info
 * 
 * @version 2.0.0 - Manual Payments
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Paper
} from '@mui/material';
import {
  CheckCircle,
  Error,
  HourglassEmpty,
  Receipt
} from '@mui/icons-material';
import paymentService from '../services/paymentService';

// Payment mode display names
const paymentModeNames = {
  "UPI": "UPI Payment",
  "BANK_TRANSFER": "Direct Bank Transfer",
};

const getPaymentModeName = (mode) => {
  return paymentModeNames[mode] || mode || "Manual Payment";
};

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasFetched = useRef(false);

  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Prevent duplicate fetches
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchPaymentDetails = async () => {
      // Get payment ID from URL
      const paymentId = searchParams.get('paymentId');
      const orderId = searchParams.get('orderId');

      // Get stored order details
      const storedOrderDetails = sessionStorage.getItem('orderDetails');
      const orderData = storedOrderDetails ? JSON.parse(storedOrderDetails) : {};

      // If we have paymentId, fetch details from backend
      if (paymentId || orderData.paymentId) {
        try {
          const response = await paymentService.getPaymentDetails(paymentId || orderData.paymentId);
          
          if (response.payment) {
            const payment = response.payment;
            setPaymentDetails({
              orderId: payment.orderId || orderData.orderId || 'N/A',
              transactionId: payment.transactionId || 'Pending Verification',
              amount: `₹ ${payment.amount || orderData.amount || 'N/A'}`,
              planName: payment.planName || orderData.planName || 'Subscription',
              paymentMode: getPaymentModeName(payment.method || orderData.paymentMethod),
              state: payment.status === 'PENDING_VERIFICATION' ? 'PENDING' : payment.status,
              code: payment.status === 'PENDING_VERIFICATION' ? 'PENDING' : 'SUCCESS',
              message: payment.status === 'PENDING_VERIFICATION' 
                ? 'Payment proof submitted. Awaiting admin verification.' 
                : 'Payment successful',
              transactionStatus: payment.status || 'PENDING_VERIFICATION',
              date: new Date().toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
            });
          }
        } catch (err) {
          console.error('Failed to fetch payment details:', err);
          // Fallback to stored data
          setPaymentDetails({
            orderId: orderData.orderId || 'N/A',
            transactionId: 'Pending Verification',
            amount: orderData.amount ? `₹ ${orderData.amount}` : 'N/A',
            planName: orderData.planName || 'Subscription',
            state: 'PENDING',
            code: 'PENDING',
            message: 'Payment proof submitted. Admin will verify within 24-48 hours.',
            paymentMode: getPaymentModeName(orderData.paymentMethod),
            transactionStatus: 'PENDING_VERIFICATION',
            date: new Date().toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
          });
        }
        setLoading(false);
        return;
      }

      // Default: Show a generic success with current date
      setPaymentDetails({
        orderId: 'ORD_' + Date.now(),
        transactionId: 'TXN_' + Date.now(),
        amount: 'N/A',
        planName: 'Subscription',
        state: 'INITIATED',
        code: 'PENDING',
        message: 'Payment initiated. Awaiting confirmation.',
        paymentMode: getPaymentModeName(orderData.paymentMode) || 'Online',
        transactionStatus: 'PENDING',
        date: new Date().toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
      setLoading(false);
    };

    fetchPaymentDetails();
  }, [searchParams]);

  const handleBackToPlans = () => {
    sessionStorage.removeItem('orderDetails');
    navigate('/subscription');
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#FAF7FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ color: '#8B5CF6', mb: 2 }} />
          <Typography color="text.secondary">Verifying payment details...</Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>Please wait while we confirm your payment</Typography>
        </Box>
      </Box>
    );
  }

  const isSuccess = paymentDetails?.state === 'COMPLETED' ||
                    paymentDetails?.code === 'SUCCESS' ||
                    paymentDetails?.transactionStatus === 'SUCCESS';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FAF7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Card sx={{ maxWidth: 400, width: '100%', overflow: 'hidden' }}>
        {/* Status Header */}
        <Box sx={{ bgcolor: isSuccess ? '#22C55E' : '#EAB308', p: 3, textAlign: 'center' }}>
          <Box sx={{ width: 80, height: 80, bgcolor: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            {isSuccess ? (
              <CheckCircle sx={{ fontSize: 40, color: 'success.main' }} />
            ) : (
              <HourglassEmpty sx={{ fontSize: 40, color: 'warning.main' }} />
            )}
          </Box>
          <Typography variant="h5" fontWeight="bold" color="white">
            {isSuccess ? 'Payment Successful!' : 'Payment Status'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>
            {isSuccess ? 'Your subscription is now active' : paymentDetails?.message || 'Processing'}
          </Typography>
        </Box>

        {/* Payment Details */}
        <CardContent sx={{ p: 3 }}>
          {paymentDetails ? (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid #f0f0f0' }}>
                <Typography variant="body2" color="text.secondary">Order ID</Typography>
                <Typography variant="body2" fontWeight="medium" sx={{ fontFamily: 'monospace' }}>
                  {paymentDetails.orderId}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid #f0f0f0' }}>
                <Typography variant="body2" color="text.secondary">Transaction ID</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {paymentDetails.transactionId}
                </Typography>
              </Box>
              {paymentDetails.planName && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid #f0f0f0' }}>
                  <Typography variant="body2" color="text.secondary">Plan</Typography>
                  <Typography variant="body2" fontWeight="medium">{paymentDetails.planName}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid #f0f0f0' }}>
                <Typography variant="body2" color="text.secondary">Amount Paid</Typography>
                <Typography variant="h6" fontWeight="bold" color="success.main">{paymentDetails.amount}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid #f0f0f0' }}>
                <Typography variant="body2" color="text.secondary">Payment Mode</Typography>
                <Typography variant="body2" fontWeight="medium">{paymentDetails.paymentMode}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid #f0f0f0' }}>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Chip
                  label={paymentDetails.state || paymentDetails.transactionStatus}
                  size="small"
                  color={isSuccess ? 'success' : 'warning'}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5 }}>
                <Typography variant="body2" color="text.secondary">Date & Time</Typography>
                <Typography variant="body2" fontWeight="medium">{paymentDetails.date}</Typography>
              </Box>
              {paymentDetails.message && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">Message</Typography>
                  <Typography variant="body2" fontWeight="medium">{paymentDetails.message}</Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography color="text.secondary">No payment details available</Typography>
            </Box>
          )}
        </CardContent>

        {/* Actions */}
        <Box sx={{ px: 3, pb: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button variant="contained" fullWidth onClick={() => navigate('/dashboard')} sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}>
            Go to Dashboard
          </Button>
          <Button variant="outlined" fullWidth onClick={handleBackToPlans}>
            Back to Plans
          </Button>
        </Box>

        {/* Support Info */}
        <Paper sx={{ bgcolor: '#f5f5f5', p: 2, textAlign: 'center', borderRadius: 0 }}>
          <Typography variant="caption" color="text.secondary">
            🎉 Thank you for your subscription! A confirmation will be sent to your registered email.
          </Typography>
        </Paper>
      </Card>
    </Box>
  );
};

export default PaymentSuccess;
