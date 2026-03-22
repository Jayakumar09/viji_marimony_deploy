/**
 * Manual Payment Page
 * 
 * Subscription payment page with manual payment options:
 * - Direct Bank Transfer
 * - UPI Payment
 * 
 * User pays manually, uploads screenshot, admin verifies
 * 
 * @version 2.0.0 - Simplified Manual Payments
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper
} from '@mui/material';
import {
  CheckCircle,
  AccountBalance,
  PhoneIphone,
  Star,
  Upload,
  Close,
  ContentCopy,
  QrCode,
  Receipt,
  Schedule,
  Verified
} from '@mui/icons-material';
import paymentService, { PAYMENT_METHODS, PAYMENT_STATUS } from '../services/paymentService';
import { SUBSCRIPTION_TIERS } from '../config/subscription';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

// Use SUBSCRIPTION_TIERS as SUBSCRIPTION_PLANS for compatibility
const SUBSCRIPTION_PLANS = SUBSCRIPTION_TIERS;

const ManualPayment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState('PRO');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(PAYMENT_METHODS.BANK_TRANSFER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  
  // Payment state
  const [paymentData, setPaymentData] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);
  const [upiDetails, setUPIDetails] = useState(null);
  
  // Proof upload state
  const [proofDialog, setProofDialog] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Check for plan selection from URL
  useEffect(() => {
    const planFromUrl = searchParams.get('plan');
    if (planFromUrl && ['BASIC', 'PRO', 'PREMIUM'].includes(planFromUrl)) {
      setSelectedPlan(planFromUrl);
    }
  }, [searchParams]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { state: { from: '/subscription', plan: selectedPlan } });
    }
  }, [authLoading, isAuthenticated, navigate, selectedPlan]);

  // Load bank and UPI details
  useEffect(() => {
    const loadDetails = async () => {
      try {
        const [bankRes, upiRes] = await Promise.all([
          paymentService.getBankDetails(),
          paymentService.getUPIDetails()
        ]);
        if (bankRes.success) setBankDetails(bankRes.bankDetails);
        if (upiRes.success) {
          // Build full URL for QR code
          const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
          const qrCodeUrl = upiRes.upiDetails.qrCodeUrl.startsWith('http') 
            ? upiRes.upiDetails.qrCodeUrl 
            : `${apiBaseUrl.replace('/api', '')}${upiRes.upiDetails.qrCodeUrl}`;
          setUPIDetails({
            ...upiRes.upiDetails,
            qrCodeUrl
          });
        }
      } catch (err) {
        console.error('Failed to load payment details:', err);
      }
    };
    loadDetails();
  }, []);

  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan);

  const steps = ['Select Plan', 'Choose Payment Method', 'Make Payment', 'Upload Proof'];

  // Handle payment initiation
  const handleInitiatePayment = async () => {
    if (!isAuthenticated) {
      setError('Please login to continue with payment');
      navigate('/login', { state: { from: '/subscription', plan: selectedPlan } });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await paymentService.initiatePayment(selectedPlan, selectedPaymentMethod);
      
      if (result.success) {
        setPaymentData(result);
        setActiveStep(2);
      } else if (result.existingPayment) {
        // Handle existing pending payment - allow user to proceed
        setPaymentData(result);
        // Set the payment method from existing payment
        if (result.existingPayment.paymentMethod) {
          setSelectedPaymentMethod(result.existingPayment.paymentMethod);
        }
        setActiveStep(2);
        toast('You have a pending payment. You can upload proof or cancel it.', { 
          icon: 'ℹ️',
          duration: 5000 
        });
      }
    } catch (err) {
      console.error('Payment initiation error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel payment
  const handleCancelPayment = async () => {
    const paymentId = paymentData?.payment?.id || paymentData?.existingPayment?.id;
    if (!paymentId) {
      toast.error('Payment ID not found');
      return;
    }

    if (!window.confirm('Are you sure you want to cancel this payment?\n\nThis action cannot be undone. You will need to start a new payment if you wish to subscribe.')) {
      return;
    }

    setLoading(true);
    try {
      const result = await paymentService.cancelPayment(paymentId);
      if (result.success) {
        toast.success('Payment cancelled successfully! You can now start a new payment.');
        setPaymentData(null);
        setActiveStep(0);
        // Reset form state
        setTransactionId('');
        setPaymentDate('');
        setProofFile(null);
        setProofPreview(null);
      }
    } catch (err) {
      console.error('Cancel payment error:', err);
      toast.error(err.response?.data?.error || 'Failed to cancel payment');
    } finally {
      setLoading(false);
    }
  };

  // Handle proof upload
  const handleProofUpload = async () => {
    if (!transactionId.trim()) {
      toast.error('Please enter the transaction ID');
      return;
    }
    if (!proofFile) {
      toast.error('Please upload payment proof');
      return;
    }

    // Get payment ID from either payment or existingPayment
    const paymentId = paymentData?.payment?.id || paymentData?.existingPayment?.id;
    if (!paymentId) {
      toast.error('Payment ID not found. Please try initiating payment again.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('paymentId', paymentId);
      formData.append('transactionId', transactionId);
      formData.append('proof', proofFile);
      if (paymentDate) {
        formData.append('paymentDate', paymentDate);
      }

      const result = await paymentService.submitPaymentProof(formData);
      
      if (result.success) {
        toast.success('Payment proof submitted successfully!');
        setProofDialog(false);
        setActiveStep(3);
        setPaymentData(prev => ({
          ...prev,
          payment: {
            ...prev.payment,
            status: PAYMENT_STATUS.PENDING_VERIFICATION
          }
        }));
      }
    } catch (err) {
      console.error('Proof upload error:', err);
      toast.error(err.response?.data?.error || 'Failed to upload proof');
    } finally {
      setUploading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should be less than 5MB');
        return;
      }
      setProofFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setProofPreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setProofPreview(null);
      }
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #5f259f 0%, #7c3aed 50%, #a855f7 100%)'
      }}>
        <CircularProgress sx={{ color: 'white' }} />
      </Box>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #5f259f 0%, #7c3aed 50%, #a855f7 100%)'
      }}>
        <Typography sx={{ color: 'white' }}>Redirecting to login...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: 'calc(100vh - 80px)', 
      background: 'linear-gradient(135deg, #5f259f 0%, #7c3aed 50%, #a855f7 100%)',
      py: 4,
      px: 2,
      mt: -8,
      mx: -2,
      mb: -4
    }}>
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
            Subscribe to Premium
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', mt: 1 }}>
            Choose a plan and pay via Bank Transfer or UPI
          </Typography>
        </Box>

        {/* Stepper */}
        <Card sx={{ mb: 3, borderRadius: 2 }}>
          <CardContent sx={{ py: 2 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Step 0: Plan Selection */}
        {activeStep === 0 && (
          <>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
              Select a Plan
            </Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
              {SUBSCRIPTION_PLANS.filter(p => p.id !== 'FREE').map((plan) => (
                <Grid item xs={12} sm={4} key={plan.id} sx={{ display: 'flex' }}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      border: selectedPlan === plan.id ? 4 : 2,
                      borderColor: selectedPlan === plan.id ? 'primary.main' : 'grey.300',
                      transform: selectedPlan === plan.id ? 'scale(1.02)' : 'scale(1)',
                      transition: 'all 0.3s ease',
                      bgcolor: selectedPlan === plan.id ? 'primary.50' : 'white',
                      boxShadow: selectedPlan === plan.id ? '0 8px 24px rgba(139, 92, 246, 0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
                      position: 'relative',
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      '&:hover': { 
                        transform: 'scale(1.02)', 
                        borderColor: 'primary.light',
                        boxShadow: '0 4px 16px rgba(139, 92, 246, 0.2)'
                      }
                    }}
                    onClick={() => {
                      console.log('Selected plan:', plan.id);
                      setSelectedPlan(plan.id);
                    }}
                  >
                    {/* Selected indicator */}
                    {selectedPlan === plan.id && (
                      <Box sx={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        bgcolor: 'primary.main',
                        borderRadius: '50%',
                        width: 28,
                        height: 28,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <CheckCircle sx={{ color: 'white', fontSize: 20 }} />
                      </Box>
                    )}
                    <CardContent sx={{ textAlign: 'center', py: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      {plan.id === 'PRO' && (
                        <Chip 
                          label="Popular" 
                          color="secondary" 
                          size="small" 
                          sx={{ mb: 1 }}
                        />
                      )}
                      <Typography variant="h5" fontWeight="bold" color={selectedPlan === plan.id ? 'primary.main' : 'text.primary'}>
                        {plan.name}
                      </Typography>
                      <Typography variant="h4" color="primary" sx={{ my: 1, fontWeight: selectedPlan === plan.id ? 'bold' : 'normal' }}>
                        ₹{plan.price}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {plan.duration} days
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Box sx={{ textAlign: 'left', flexGrow: 1 }}>
                        {plan.features.map((feature, idx) => (
                          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <CheckCircle sx={{ fontSize: 16, color: 'success.main', mr: 1 }} />
                            <Typography variant="body2">{feature}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            <Box sx={{ textAlign: 'center' }}>
              <Button 
                variant="contained" 
                size="large"
                onClick={() => setActiveStep(1)}
                sx={{ px: 6, py: 1.5 }}
              >
                Continue
              </Button>
            </Box>
          </>
        )}

        {/* Step 1: Payment Method Selection */}
        {activeStep === 1 && (
          <>
            <Card sx={{ mb: 3, borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Selected Plan: {currentPlan?.name} - ₹{currentPlan?.price}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <FormControl component="fieldset">
                  <FormLabel component="legend">Choose Payment Method</FormLabel>
                  <RadioGroup
                    value={selectedPaymentMethod}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    sx={{ mt: 2 }}
                  >
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Card 
                          sx={{ 
                            cursor: 'pointer',
                            border: selectedPaymentMethod === PAYMENT_METHODS.BANK_TRANSFER ? 2 : 0,
                            borderColor: 'primary.main',
                          }}
                          onClick={() => setSelectedPaymentMethod(PAYMENT_METHODS.BANK_TRANSFER)}
                        >
                          <CardContent sx={{ textAlign: 'center' }}>
                            <FormControlLabel 
                              value={PAYMENT_METHODS.BANK_TRANSFER}
                              control={<Radio />}
                              label=""
                              sx={{ m: 0 }}
                            />
                            <AccountBalance sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                            <Typography variant="h6">Bank Transfer</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Transfer directly to bank account
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Card 
                          sx={{ 
                            cursor: 'pointer',
                            border: selectedPaymentMethod === PAYMENT_METHODS.UPI ? 2 : 0,
                            borderColor: 'primary.main',
                          }}
                          onClick={() => setSelectedPaymentMethod(PAYMENT_METHODS.UPI)}
                        >
                          <CardContent sx={{ textAlign: 'center' }}>
                            <FormControlLabel 
                              value={PAYMENT_METHODS.UPI}
                              control={<Radio />}
                              label=""
                              sx={{ m: 0 }}
                            />
                            <PhoneIphone sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                            <Typography variant="h6">UPI Payment</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Pay using any UPI app
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </RadioGroup>
                </FormControl>
              </CardContent>
            </Card>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button 
                variant="outlined"
                onClick={() => setActiveStep(0)}
              >
                Back
              </Button>
              <Button 
                variant="contained" 
                size="large"
                onClick={handleInitiatePayment}
                disabled={loading}
                sx={{ px: 6, py: 1.5 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Proceed to Payment'}
              </Button>
            </Box>
          </>
        )}

        {/* Step 2: Payment Instructions */}
        {activeStep === 2 && paymentData && (
          <>
            <Card sx={{ mb: 3, borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Receipt sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">
                    Order ID: {paymentData.payment?.orderId || paymentData.existingPayment?.orderId}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => copyToClipboard(paymentData.payment?.orderId || paymentData.existingPayment?.orderId, 'Order ID')}
                    sx={{ ml: 1 }}
                  >
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Amount to pay: <strong>₹{paymentData.payment?.amount || paymentData.existingPayment?.amount}</strong> for {paymentData.payment?.planName || paymentData.existingPayment?.planName} plan
                </Alert>
              </CardContent>
            </Card>

            {/* Bank Transfer Instructions */}
            {selectedPaymentMethod === PAYMENT_METHODS.BANK_TRANSFER && bankDetails && (
              <Card sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <AccountBalance sx={{ mr: 1 }} />
                    Bank Transfer Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell><strong>Account Holder</strong></TableCell>
                          <TableCell>{bankDetails.accountHolderName}</TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={() => copyToClipboard(bankDetails.accountHolderName, 'Account Holder')}>
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>Bank Name</strong></TableCell>
                          <TableCell>{bankDetails.bankName}</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>Account Number</strong></TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>{bankDetails.accountNumber}</TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={() => copyToClipboard(bankDetails.accountNumber, 'Account Number')}>
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>IFSC Code</strong></TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>{bankDetails.ifscCode}</TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={() => copyToClipboard(bankDetails.ifscCode, 'IFSC Code')}>
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>Branch</strong></TableCell>
                          <TableCell>{bankDetails.branchName}</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>PIN Code</strong></TableCell>
                          <TableCell>{bankDetails.pinCode}</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}

            {/* UPI Instructions */}
            {selectedPaymentMethod === PAYMENT_METHODS.UPI && upiDetails && (
              <Card sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <PhoneIphone sx={{ mr: 1 }} />
                    UPI Payment Details
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  {/* QR Code Section */}
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                      Scan QR Code to Pay
                    </Typography>
                    <Box 
                      sx={{ 
                        display: 'inline-block',
                        borderRadius: 2,
                        overflow: 'hidden',
                        border: '2px solid #e0e0e0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        bgcolor: 'white'
                      }}
                    >
                      <img 
                        src={upiDetails.qrCodeUrl} 
                        alt="UPI QR Code" 
                        style={{ 
                          width: 250, 
                          height: 250,
                          display: 'block',
                          objectFit: 'contain'
                        }}
                      />
                    </Box>
                  </Box>
                  
                  <Divider sx={{ my: 2 }}>
                    <Chip label="OR" size="small" />
                  </Divider>
                  
                  {/* UPI ID Section */}
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Pay using UPI ID
                    </Typography>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      bgcolor: '#f0f7ff',
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid #90caf9'
                    }}>
                      <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'primary.main' }}>
                        {upiDetails.upiId}
                      </Typography>
                      <IconButton 
                        onClick={() => copyToClipboard(upiDetails.upiId, 'UPI ID')}
                        size="small"
                        sx={{ ml: 1 }}
                      >
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Payee: {upiDetails.payeeName}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            <Card sx={{ mb: 3, borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <Schedule sx={{ mr: 1 }} />
                  Instructions
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box component="ol" sx={{ pl: 2 }}>
                  {paymentData.instructions?.map((instruction, idx) => (
                    <Typography key={idx} component="li" variant="body2" sx={{ mb: 1 }}>
                      {instruction}
                    </Typography>
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* Existing Payment Warning */}
            {paymentData.existingPayment && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  You have an existing pending payment
                </Typography>
                <Typography variant="body2">
                  Order ID: {paymentData.existingPayment.orderId} | Amount: ₹{paymentData.existingPayment.amount} | Status: {paymentData.existingPayment.status}
                </Typography>
              </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mt: 3 }}>
              <Button 
                variant="outlined"
                onClick={() => setActiveStep(1)}
                sx={{ px: 3, py: 1 }}
              >
                Back
              </Button>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button 
                  variant="contained"
                  color="error"
                  onClick={handleCancelPayment}
                  disabled={loading}
                  sx={{ px: 3, py: 1.5, fontWeight: 'bold', minWidth: 150 }}
                >
                  {loading ? <CircularProgress size={20} color="inherit" /> : 'Cancel Payment'}
                </Button>
                <Button 
                  variant="contained" 
                  color="success"
                  size="large"
                  startIcon={<Upload />}
                  onClick={() => setProofDialog(true)}
                  sx={{ px: 4, py: 1.5, fontWeight: 'bold', minWidth: 200 }}
                >
                  Upload Payment Proof
                </Button>
              </Box>
            </Box>
          </>
        )}

        {/* Step 3: Proof Submitted */}
        {activeStep === 3 && paymentData && (
          <Card sx={{ borderRadius: 2 }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Verified sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Payment Proof Submitted!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Your payment is being verified by our team. This usually takes 24-48 hours.
              </Typography>
              <Alert severity="info" sx={{ textAlign: 'left', mb: 3 }}>
                <Typography variant="body2">
                  <strong>Order ID:</strong> {paymentData.payment?.orderId}<br />
                  <strong>Amount:</strong> ₹{paymentData.payment?.amount}<br />
                  <strong>Plan:</strong> {paymentData.payment?.planName}<br />
                  <strong>Status:</strong> Pending Verification
                </Typography>
              </Alert>
              
              {/* Payment Messages Section */}
              <Box sx={{ mt: 3, textAlign: 'left' }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Messages from Admin
                </Typography>
                <UserPaymentMessages paymentId={paymentData.payment?.id} />
              </Box>
              
              <Button 
                variant="contained" 
                size="large"
                onClick={() => navigate('/dashboard')}
                sx={{ px: 6, mt: 3 }}
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Proof Upload Dialog */}
        <Dialog 
          open={proofDialog} 
          onClose={() => setProofDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Upload Payment Proof
            <IconButton
              onClick={() => setProofDialog(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Please ensure the payment proof clearly shows the transaction details.
            </Alert>
            <TextField
              fullWidth
              label="Transaction ID / UTR Number"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              margin="normal"
              required
              helperText="Enter the transaction ID from your payment receipt"
            />
            <TextField
              fullWidth
              label="Payment Date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              helperText="Select the date when you made the payment"
            />
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Upload Payment Screenshot/Receipt *
              </Typography>
              <Button
                variant="outlined"
                component="label"
                startIcon={<Upload />}
                fullWidth
                sx={{ py: 2 }}
              >
                {proofFile ? proofFile.name : 'Choose File (JPG, PNG, PDF - Max 5MB)'}
                <input
                  type="file"
                  hidden
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={handleFileSelect}
                />
              </Button>
              {proofPreview && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <img 
                    src={proofPreview} 
                    alt="Proof Preview" 
                    style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }}
                  />
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setProofDialog(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={handleProofUpload}
              disabled={uploading || !transactionId.trim() || !proofFile}
            >
              {uploading ? <CircularProgress size={24} /> : 'Submit Proof'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

// User Payment Messages Component
const UserPaymentMessages = ({ paymentId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (paymentId) {
      fetchMessages();
      // Poll for new messages every 30 seconds
      const interval = setInterval(fetchMessages, 30000);
      return () => clearInterval(interval);
    }
  }, [paymentId]);

  const fetchMessages = async () => {
    try {
      const response = await paymentService.getPaymentMessages(paymentId);
      setMessages(response.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      await paymentService.sendPaymentMessage(paymentId, newMessage.trim());
      setNewMessage('');
      fetchMessages();
      toast.success('Message sent to admin');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  if (loading) {
    return <Typography variant="body2" color="textSecondary">Loading messages...</Typography>;
  }

  return (
    <Paper sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
      {messages.length === 0 ? (
        <Typography variant="body2" color="textSecondary" textAlign="center">
          No messages yet. Admin will respond to your payment submission.
        </Typography>
      ) : (
        <Box sx={{ maxHeight: 200, overflow: 'auto', mb: 2 }}>
          {messages.map((msg) => (
            <Box
              key={msg.id}
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: msg.senderType === 'ADMIN' ? '#dbeafe' : '#dcfce7',
                mb: 1,
                ml: msg.senderType === 'USER' ? 4 : 0,
                mr: msg.senderType === 'ADMIN' ? 4 : 0,
              }}
            >
              <Typography variant="caption" color="textSecondary" fontWeight="bold">
                {msg.senderType === 'ADMIN' ? 'Admin' : 'You'}
              </Typography>
              <Typography variant="body2">{msg.message}</Typography>
              <Typography variant="caption" color="textSecondary" display="block">
                {new Date(msg.createdAt).toLocaleString()}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Send a message to admin..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <Button variant="contained" size="small" onClick={handleSendMessage}>
          Send
        </Button>
      </Box>
    </Paper>
  );
};

export default ManualPayment;
