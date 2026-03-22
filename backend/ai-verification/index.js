/**
 * AI Verification Module - Production Implementation
 * Main entry point for all AI verification services
 * 
 * This module provides comprehensive document verification including:
 * - Document format validation with Tesseract OCR
 * - Face matching using AWS Rekognition
 * - Tamper detection using Sharp
 * - AI-powered recommendations
 * 
 * @version 2.0.0
 * @author Vijayalakshmi Boyar Matrimony
 */

const documentValidationService = require('./documentValidationService');
const faceMatchService = require('./faceMatchService');
const tamperDetectionService = require('./tamperDetectionService');
const aiRecommendationService = require('./aiRecommendationService');

/**
 * Process complete ID verification
 * @param {Object} params - Verification parameters
 * @param {Object} params.file - Uploaded ID file
 * @param {string} params.idNumber - ID number
 * @param {string} params.idType - ID type (AADHAAR, PAN, etc.)
 * @param {string} params.selfiePath - Path to selfie image
 * @param {string} params.idImagePath - Path to ID image
 * @returns {Promise<Object>} - Complete verification result
 */
const processVerification = async (params) => {
  const startTime = Date.now();
  
  console.log('Starting AI verification process...');
  console.log('Parameters:', {
    idType: params.idType,
    hasFile: !!params.file,
    hasSelfie: !!params.selfiePath,
    hasIdImage: !!params.idImagePath
  });
  
  try {
    // Generate AI recommendation (includes all sub-analyses)
    const recommendation = await aiRecommendationService.generateRecommendation(params);
    
    const processingTime = Date.now() - startTime;
    
    return {
      success: true,
      ...recommendation,
      processingTime,
      version: '2.0.0'
    };
  } catch (error) {
    console.error('AI verification error:', error);
    
    return {
      success: false,
      recommendation: 'REVIEW',
      confidence: 0,
      flags: ['Processing error occurred'],
      error: error.message,
      processingTime: Date.now() - startTime
    };
  }
};

/**
 * Quick validation check (lightweight, fast)
 * @param {Object} params - Validation parameters
 * @returns {Promise<Object>} - Quick check result
 */
const quickValidation = async (params) => {
  return aiRecommendationService.quickVerify(params);
};

/**
 * Validate ID number format only
 * @param {string} idNumber - ID number
 * @param {string} idType - ID type
 * @returns {Object} - Validation result
 */
const validateIdFormat = (idNumber, idType) => {
  return documentValidationService.validateIdNumber(idNumber, idType);
};

/**
 * Check document for tampering
 * @param {string} filePath - Path to document
 * @returns {Promise<Object>} - Tamper analysis result
 */
const checkTampering = async (filePath) => {
  return tamperDetectionService.analyzeDocument(filePath);
};

/**
 * Compare faces between ID and selfie
 * @param {string} idImagePath - Path to ID image
 * @param {string} selfiePath - Path to selfie
 * @returns {Promise<Object>} - Face match result
 */
const compareFaces = async (idImagePath, selfiePath) => {
  return faceMatchService.compareFaces(idImagePath, selfiePath);
};

/**
 * Extract text from document using OCR
 * @param {string} imagePath - Path to document image
 * @returns {Promise<Object>} - OCR result
 */
const extractText = async (imagePath) => {
  return documentValidationService.extractText(imagePath);
};

/**
 * Get supported ID types
 * @returns {Array} - List of supported ID types
 */
const getSupportedIdTypes = () => {
  return documentValidationService.getSupportedIdTypes();
};

/**
 * Get module status
 * @returns {Object} - Module status information
 */
const getStatus = () => {
  return {
    status: 'operational',
    version: '2.0.0',
    aiEnabled: aiRecommendationService.isEnabled(),
    services: {
      documentValidation: {
        status: documentValidationService.isOcrAvailable() ? 'active' : 'unavailable',
        provider: 'Tesseract.js'
      },
      faceMatch: {
        status: faceMatchService.isConfigured() ? 'active' : 'unavailable',
        provider: 'AWS Rekognition'
      },
      tamperDetection: {
        status: 'active',
        provider: 'Sharp'
      },
      aiRecommendation: {
        status: aiRecommendationService.isEnabled() ? 'active' : 'disabled',
        provider: 'Internal'
      }
    },
    supportedIdTypes: getSupportedIdTypes().map(t => t.type),
    thresholds: aiRecommendationService.CONFIDENCE_THRESHOLDS
  };
};

/**
 * Initialize AI services (call on server startup)
 * @returns {Promise<Object>} - Initialization result
 */
const initialize = async () => {
  console.log('Initializing AI verification services...');
  
  const result = {
    success: true,
    services: {}
  };

  try {
    // Initialize Tesseract OCR
    if (documentValidationService.isOcrAvailable()) {
      console.log('Initializing Tesseract OCR...');
      await documentValidationService.initTesseract();
      result.services.tesseract = 'initialized';
    }

    // Check AWS Rekognition configuration
    if (faceMatchService.isConfigured()) {
      console.log('AWS Rekognition configured');
      result.services.rekognition = 'configured';
    } else {
      console.log('AWS Rekognition not configured - face matching will be limited');
      result.services.rekognition = 'not_configured';
    }

    console.log('AI verification services initialized successfully');
    
  } catch (error) {
    console.error('AI service initialization error:', error);
    result.success = false;
    result.error = error.message;
  }

  return result;
};

/**
 * Cleanup AI services (call on server shutdown)
 * @returns {Promise<void>}
 */
const cleanup = async () => {
  console.log('Cleaning up AI verification services...');
  
  try {
    await documentValidationService.terminateTesseract();
    console.log('AI verification services cleaned up');
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

module.exports = {
  // Main functions
  processVerification,
  quickValidation,
  initialize,
  cleanup,
  
  // Individual services
  documentValidation: documentValidationService,
  faceMatch: faceMatchService,
  tamperDetection: tamperDetectionService,
  aiRecommendation: aiRecommendationService,
  
  // Utility functions
  validateIdFormat,
  checkTampering,
  compareFaces,
  extractText,
  getSupportedIdTypes,
  getStatus,
  
  // Constants
  RECOMMENDATION_TYPES: aiRecommendationService.RECOMMENDATION_TYPES,
  ID_TYPE_VALIDATIONS: documentValidationService.ID_TYPE_VALIDATIONS,
  CONFIDENCE_THRESHOLDS: aiRecommendationService.CONFIDENCE_THRESHOLDS
};
