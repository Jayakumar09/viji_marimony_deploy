import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Grid, CircularProgress, Alert } from '@mui/material';
import api from '../services/api';

const PaymentVerificationModal = ({ paymentId, open, onClose }) => {
    const [paymentData, setPaymentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (paymentId && open) {
            fetchPaymentDetails();
        }
    }, [paymentId, open]);

    const fetchPaymentDetails = async () => {
        try {
            setLoading(true);
            setError(null);
            // Use the admin API endpoint for getting payment details
            const response = await api.get(`/payments/admin/${paymentId}`);
            setPaymentData(response.data);
            console.log('[PaymentVerificationModal] Payment data:', response.data);
        } catch (err) {
            console.error('[PaymentVerificationModal] Error fetching payment:', err);
            setError('Failed to load payment details. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Helper to get proper image URL
    const getProofImageUrl = (url) => {
        if (!url) return '';
        // If already a full URL (Cloudinary or external), return as-is
        if (url.startsWith('http')) {
            return url;
        }
        // If local path, prepend backend URL
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://viji-marimony-deploy-backend.onrender.com';
        return url.startsWith('/') ? `${backendUrl}${url}` : `${backendUrl}/${url}`;
    };

    if (!open) return null;

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Payment Verification</Typography>
                <Button onClick={onClose} color="inherit">✕</Button>
            </DialogTitle>
            
            <DialogContent>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : paymentData ? (
                    <Grid container spacing={3}>
                        {/* Left Side: Payment Details */}
                        <Grid item xs={12} md={5}>
                            <Typography variant="subtitle2" color="textSecondary">Order ID</Typography>
                            <Typography variant="body1" sx={{ fontFamily: 'monospace', mb: 2 }}>
                                {paymentData.orderId || paymentData.id}
                            </Typography>
                            
                            <Typography variant="subtitle2" color="textSecondary">Amount</Typography>
                            <Typography variant="h5" color="primary" sx={{ mb: 2 }}>
                                ₹{paymentData.amount || paymentData.amountINR}
                            </Typography>
                            
                            <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                            <Typography variant="body1" sx={{ mb: 2 }}>
                                {paymentData.status || paymentData.paymentStatus}
                            </Typography>
                            
                            <Typography variant="subtitle2" color="textSecondary">Transaction ID</Typography>
                            <Typography variant="body1" sx={{ fontFamily: 'monospace', mb: 2 }}>
                                {paymentData.transactionId || 'Not provided'}
                            </Typography>
                            
                            <Typography variant="subtitle2" color="textSecondary">Payment Method</Typography>
                            <Typography variant="body1" sx={{ mb: 2 }}>
                                {paymentData.method || paymentData.paymentMethod || 'N/A'}
                            </Typography>
                            
                            <Typography variant="subtitle2" color="textSecondary">Plan</Typography>
                            <Typography variant="body1" sx={{ mb: 2 }}>
                                {paymentData.planName || paymentData.planId || 'N/A'}
                            </Typography>
                        </Grid>
                        
                        {/* Right Side: Payment Proof Image */}
                        <Grid item xs={12} md={7}>
                            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                Payment Proof Image
                            </Typography>
                            
                            {paymentData.paymentProof ? (
                                <Box>
                                    {/* Debug info */}
                                    <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block', wordBreak: 'break-all' }}>
                                        URL: {paymentData.paymentProof}
                                    </Typography>
                                    
                                    <Box
                                        component="img"
                                        src={getProofImageUrl(paymentData.paymentProof)}
                                        alt="Payment Receipt"
                                        sx={{
                                            width: '100%',
                                            maxHeight: 400,
                                            objectFit: 'contain',
                                            border: '1px solid #e0e0e0',
                                            borderRadius: 2,
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => window.open(getProofImageUrl(paymentData.paymentProof), '_blank')}
                                        onError={(e) => {
                                            console.error('Image load error:', e);
                                            e.target.onerror = null;
                                            e.target.src = 'https://via.placeholder.com/400x300?text=Image+Load+Failed';
                                        }}
                                        onLoad={() => console.log('Image loaded successfully')}
                                    />
                                    <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                                        Click image to view full size
                                    </Typography>
                                </Box>
                            ) : (
                                <Alert severity="warning">No payment proof uploaded</Alert>
                            )}
                        </Grid>
                    </Grid>
                ) : (
                    <Alert severity="info">No payment data available</Alert>
                )}
            </DialogContent>
            
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose}>Close</Button>
                <Button 
                    variant="contained" 
                    color="error"
                    onClick={() => {
                        // Handle reject
                        handleReject(paymentId);
                    }}
                >
                    Reject
                </Button>
                <Button 
                    variant="contained" 
                    color="success"
                    onClick={() => {
                        // Handle approve
                        handleApprove(paymentId);
                    }}
                >
                    Approve & Activate
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// Approve payment function
const handleApprove = async (paymentId) => {
    try {
        await api.post(`/payments/admin/${paymentId}/approve`);
        alert('Payment approved successfully!');
    } catch (err) {
        console.error('Approve error:', err);
        alert('Failed to approve payment');
    }
};

// Reject payment function
const handleReject = async (paymentId) => {
    const reason = prompt('Enter rejection reason:');
    if (reason) {
        try {
            await api.post(`/payments/admin/${paymentId}/reject`, { reason });
            alert('Payment rejected');
        } catch (err) {
            console.error('Reject error:', err);
            alert('Failed to reject payment');
        }
    }
};

export default PaymentVerificationModal;