const { prisma } = require('../utils/database');
const { setOTP, verifyOTP } = require('../utils/otp');
const nodemailer = require('nodemailer');

// Create email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Configure Twilio (optional)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  } catch (err) {
    console.warn('Twilio not configured:', err.message);
  }
}

// Helper function to check if user should be marked for admin review
const checkAndSetVerification = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true, phoneVerified: true, profileVerificationStatus: true }
  });
  
  // When both email and phone are verified, set status to "Under Admin Review"
  if (user.emailVerified && user.phoneVerified) {
    // Only update if not already verified or under review
    if (user.profileVerificationStatus !== 'Profile Verified' && user.profileVerificationStatus !== 'Under Admin Review') {
      await prisma.user.update({
        where: { id: userId },
        data: { 
          profileVerificationStatus: 'Under Admin Review'
        }
      });
      
      // Log for admin notification
      console.log(`User ${userId} is now under admin review for profile verification`);
    }
    return { needsAdminReview: true, status: 'Under Admin Review' };
  }
  return { needsAdminReview: false, status: 'Pending' };
};

// ============ EMAIL VERIFICATION ============

// Send OTP email
const sendOTPEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found with this email' });
    }
    
    const otp = setOTP(email, 'email');
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@boyarmatrimony.com',
      to: email,
      subject: 'Email Verification OTP - Vijayalakshmi Boyar Matrimony',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B5CF6;">Email Verification</h2>
          <p>Your OTP for email verification is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP will expire in 10 minutes.</p>
        </div>
      `
    };
    
    try {
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Email send error:', emailError);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Email OTP for ${email}: ${otp}`);
      }
    }
    
    res.json({ 
      message: 'OTP sent to your email',
      ...(process.env.NODE_ENV === 'development' && { otp })
    });
    
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

// Verify Email OTP
const verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }
    
    const result = verifyOTP(email, otp, 'email');
    
    if (!result.valid) {
      return res.status(400).json({ error: result.error });
    }
    
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });
    
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true }
    });
    
    // Check if both email and phone are verified
    const verificationResult = await checkAndSetVerification(user.id);
    
    res.json({ 
      message: 'Email verified successfully',
      profileVerificationStatus: verificationResult.status,
      needsAdminReview: verificationResult.needsAdminReview
    });
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

// ============ PHONE VERIFICATION ============

// ============ PHONE VERIFICATION ============

// Send OTP to phone (or email fallback)
const sendPhoneOTP = async (req, res) => {
  try {
    const { phone, fallbackEmail } = req.body;
    
    if (!phone && !fallbackEmail) {
      return res.status(400).json({ error: 'Phone number or fallback email is required' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const otp = setOTP(phone || fallbackEmail, 'phone');
    
    // Try sending via Twilio SMS first
    let smsSent = false;
    if (twilioClient && phone) {
      try {
        await twilioClient.messages.create({
          body: `Your Vijayalakshmi Boyar Matrimony OTP is: ${otp}. Valid for 10 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone
        });
        smsSent = true;
      } catch (twilioError) {
        console.error('Twilio error:', twilioError.message);
      }
    }
    
    // Fallback to email if SMS not sent or phone not provided
    if (!smsSent) {
      const emailToUse = fallbackEmail || user.email;
      const mailOptions = {
        from: process.env.EMAIL_USER || 'noreply@boyarmatrimony.com',
        to: emailToUse,
        subject: 'Phone Verification OTP - Vijayalakshmi Boyar Matrimony',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8B5CF6;">Phone Verification</h2>
            <p>Your OTP for phone verification is:</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; margin: 20px 0;">
              ${otp}
            </div>
            <p>This OTP will expire in 10 minutes.</p>
            <p style="color: #666; font-size: 12px;">Sent as fallback because SMS was not delivered to your phone.</p>
          </div>
        `
      };
      
      try {
        await transporter.sendMail(mailOptions);
      } catch (emailError) {
        console.error('Email fallback error:', emailError);
      }
      
      // Development mode - log OTP
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Phone OTP (fallback email) for ${emailToUse}: ${otp}`);
      }
    } else {
      // Development mode - log SMS OTP
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Phone OTP (SMS) for ${phone}: ${otp}`);
      }
    }
    
    res.json({ 
      message: smsSent ? 'OTP sent to your phone' : 'OTP sent to your email (SMS unavailable)',
      sentVia: smsSent ? 'sms' : 'email',
      ...(process.env.NODE_ENV === 'development' && { otp })
    });
    
  } catch (error) {
    console.error('Send phone OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

// Verify Phone OTP
const verifyPhoneOTP = async (req, res) => {
  try {
    const { phone, otp, fallbackEmail } = req.body;
    
    if (!otp) {
      return res.status(400).json({ error: 'OTP is required' });
    }
    
    // Try phone first, fallback to email if phone not provided
    const identifier = phone || fallbackEmail;
    
    if (!identifier) {
      return res.status(400).json({ error: 'Phone or fallback email is required' });
    }
    
    const result = verifyOTP(identifier, otp, 'phone');
    
    if (!result.valid) {
      return res.status(400).json({ error: result.error });
    }
    
    await prisma.user.update({
      where: { id: req.user.id },
      data: { phoneVerified: true }
    });
    
    // Check if both email and phone are verified
    const verificationResult = await checkAndSetVerification(req.user.id);
    
    res.json({ 
      message: 'Phone verified successfully',
      profileVerificationStatus: verificationResult.status,
      needsAdminReview: verificationResult.needsAdminReview
    });
    
  } catch (error) {
    console.error('Verify phone OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

// ============ VERIFICATION STATUS ============

const getVerificationStatus = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { 
        emailVerified: true, 
        phoneVerified: true, 
        isVerified: true,
        email: true,
        phone: true,
        profileVerificationStatus: true,
        profileVerified: true
      }
    });
    
    // Pending verification message for users who haven't completed verification
    const pendingMessage = (!user.emailVerified || !user.phoneVerified) 
      ? `Dear Member,

Your Email and/or Phone verification is still pending.

Please complete verification to unlock profile visibility and start receiving matches.

Verification is required to ensure secure and trusted matchmaking.

Thank you,
Vijayalakshmi Boyar Matrimony Team`
      : null;
    
    res.json({ 
      email: user.email,
      emailVerified: user.emailVerified,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      profileVerificationStatus: user.profileVerificationStatus || 'Pending',
      profileVerified: user.profileVerified || user.isVerified,
      pendingMessage
    });
    
  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({ error: 'Failed to get verification status' });
  }
};

module.exports = {
  sendOTPEmail,
  verifyEmailOTP,
  sendPhoneOTP,
  verifyPhoneOTP,
  getVerificationStatus
};
