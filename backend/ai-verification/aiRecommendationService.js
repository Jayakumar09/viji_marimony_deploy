/**
 * AI Recommendation Service - Production Implementation
 * Combines all verification analyses to generate final recommendation
 * Uses AWS Rekognition, Tesseract OCR, and Sharp-based tamper detection
 */

const documentValidation = require('./documentValidationService');
const faceMatch = require('./faceMatchService');
const tamperDetection = require('./tamperDetectionService');

// Recommendation types
const RECOMMENDATION_TYPES = {
  APPROVE: 'APPROVE',
  REVIEW: 'REVIEW',
  REJECT: 'REJECT'
};

// Confidence thresholds from environment
const CONFIDENCE_THRESHOLDS = {
  HIGH: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD) || 0.85,
  MEDIUM: 0.65,
  LOW: 0.45
};

// Risk weights for different factors
const RISK_WEIGHTS = {
  documentValidation: 0.20,
  faceMatch: 0.40,
  tamperDetection: 0.40
};

/**
 * Check if AI verification is enabled
 * @returns {boolean}
 */
const isEnabled = () => {
  return process.env.AI_VERIFICATION_ENABLED !== 'false';
};

/**
 * Generate comprehensive AI recommendation
 * @param {Object} params - Verification parameters
 * @param {Object} params.file - Uploaded ID file
 * @param {string} params.idNumber - ID number
 * @param {string} params.idType - ID type
 * @param {string} params.selfiePath - Path to selfie image
 * @param {string} params.idImagePath - Path to ID image
 * @returns {Promise<Object>} - Complete AI recommendation
 */
const generateRecommendation = async (params) => {
  const startTime = Date.now();
  const { file, idNumber, idType, selfiePath, idImagePath } = params;

  const result = {
    recommendation: RECOMMENDATION_TYPES.REVIEW,
    confidence: 0,
    riskScore: 0,
    flags: [],
    details: {
      documentValidation: null,
      faceMatch: null,
      tamperDetection: null
    },
    summary: '',
    timestamp: new Date().toISOString(),
    processingTime: 0,
    aiEnabled: isEnabled()
  };

  // If AI verification is disabled, return default review
  if (!isEnabled()) {
    result.flags.push('AI verification disabled - manual review required');
    result.summary = 'AI verification is currently disabled. Manual review required.';
    return result;
  }

  try {
    console.log('Starting AI verification process...');

    // Run all analyses in parallel for efficiency
    const analyses = await Promise.allSettled([
      // Document validation with OCR
      documentValidation.validateDocument({
        file,
        idNumber,
        idType,
        documentType: 'idProof'
      }),
      
      // Face match using AWS Rekognition
      selfiePath && idImagePath 
        ? faceMatch.compareFaces(idImagePath, selfiePath)
        : Promise.resolve({ 
            match: null, 
            confidence: 0, 
            recommendation: 'REVIEW',
            error: 'Missing selfie or ID image' 
          }),
      
      // Tamper detection using Sharp
      idImagePath 
        ? tamperDetection.analyzeDocument(idImagePath)
        : Promise.resolve({ 
            tamperScore: 0, 
            riskLevel: 'UNKNOWN',
            passed: true 
          })
    ]);

    // Extract results from settled promises
    const [docValidationResult, faceMatchResult, tamperResult] = analyses.map(a => 
      a.status === 'fulfilled' ? a.value : { error: a.reason?.message || 'Analysis failed' }
    );

    result.details.documentValidation = docValidationResult;
    result.details.faceMatch = faceMatchResult;
    result.details.tamperDetection = tamperResult;

    // Process document validation results
    if (docValidationResult.valid === false) {
      result.flags.push(...(docValidationResult.errors || []).map(e => `Document: ${e}`));
    }
    if (docValidationResult.warnings?.length > 0) {
      result.flags.push(...docValidationResult.warnings.map(w => `Warning: ${w}`));
    }
    if (docValidationResult.details?.ocrValidation?.extractedId) {
      result.details.extractedId = docValidationResult.details.ocrValidation.extractedId;
    }

    // Process face match results
    if (faceMatchResult.error) {
      result.flags.push(`Face match: ${faceMatchResult.error}`);
    } else if (faceMatchResult.match === false) {
      result.flags.push('Face match failed');
    } else if (faceMatchResult.match === true && faceMatchResult.confidence < CONFIDENCE_THRESHOLDS.HIGH) {
      result.flags.push('Face match confidence below threshold');
    }
    if (faceMatchResult.warnings?.length > 0) {
      result.flags.push(...faceMatchResult.warnings);
    }

    // Process tamper detection results
    if (tamperResult.riskLevel === 'HIGH') {
      result.flags.push('High tamper risk detected');
    } else if (tamperResult.riskLevel === 'MEDIUM') {
      result.flags.push('Medium tamper risk detected');
    }
    if (tamperResult.indicators?.length > 0) {
      result.flags.push(...tamperResult.indicators.slice(0, 5)); // Limit indicators
    }

    // Calculate individual scores
    const docScore = docValidationResult.valid ? 0 : 0.3;
    const faceScore = faceMatchResult.match === false ? 0.5 : 
                      faceMatchResult.match === true ? 0 : 0.25;
    const tamperScore = tamperResult.tamperScore || 0;

    // Calculate weighted risk score
    result.riskScore = (
      docScore * RISK_WEIGHTS.documentValidation +
      faceScore * RISK_WEIGHTS.faceMatch +
      tamperScore * RISK_WEIGHTS.tamperDetection
    );

    // Calculate overall confidence
    const confidenceFactors = [];

    if (docValidationResult.valid) {
      confidenceFactors.push(docValidationResult.confidence || 0.8);
    }

    if (faceMatchResult.match === true) {
      confidenceFactors.push(faceMatchResult.confidence || 0.8);
    } else if (faceMatchResult.match === false) {
      confidenceFactors.push(0.2);
    }

    if (tamperResult.riskLevel === 'MINIMAL' || tamperResult.riskLevel === 'LOW') {
      confidenceFactors.push(0.9);
    } else if (tamperResult.riskLevel === 'MEDIUM') {
      confidenceFactors.push(0.6);
    } else if (tamperResult.riskLevel === 'HIGH') {
      confidenceFactors.push(0.2);
    }

    // Average confidence
    result.confidence = confidenceFactors.length > 0
      ? confidenceFactors.reduce((a, b) => a + b, 0) / confidenceFactors.length
      : 0.5;

    // Determine final recommendation
    result.recommendation = determineRecommendation(result);

    // Generate human-readable summary
    result.summary = generateSummary(result);

    console.log(`AI verification completed: ${result.recommendation} (${Math.round(result.confidence * 100)}% confidence)`);

  } catch (error) {
    console.error('AI recommendation error:', error);
    result.recommendation = RECOMMENDATION_TYPES.REVIEW;
    result.confidence = 0;
    result.flags.push('Analysis error occurred');
    result.details.error = error.message;
    result.summary = 'An error occurred during AI analysis. Manual review required.';
  }

  result.processingTime = Date.now() - startTime;
  return result;
};

/**
 * Determine final recommendation based on analysis results
 * @param {Object} result - Analysis result
 * @returns {string} - Recommendation type
 */
const determineRecommendation = (result) => {
  const { riskScore, confidence, flags, details } = result;

  // Auto-reject conditions
  if (flags.includes('High tamper risk detected')) {
    return RECOMMENDATION_TYPES.REJECT;
  }
  
  if (details.tamperDetection?.riskLevel === 'HIGH') {
    return RECOMMENDATION_TYPES.REJECT;
  }
  
  if (details.faceMatch?.recommendation === 'REJECT') {
    return RECOMMENDATION_TYPES.REJECT;
  }
  
  if (details.faceMatch?.match === false && details.faceMatch?.confidence < 0.5) {
    return RECOMMENDATION_TYPES.REJECT;
  }

  // High risk score
  if (riskScore > 0.6) {
    return RECOMMENDATION_TYPES.REJECT;
  }

  // Review conditions
  if (riskScore > 0.3) {
    return RECOMMENDATION_TYPES.REVIEW;
  }
  
  if (confidence < CONFIDENCE_THRESHOLDS.MEDIUM) {
    return RECOMMENDATION_TYPES.REVIEW;
  }
  
  if (flags.length > 3) {
    return RECOMMENDATION_TYPES.REVIEW;
  }
  
  if (details.faceMatch?.confidence < CONFIDENCE_THRESHOLDS.HIGH) {
    return RECOMMENDATION_TYPES.REVIEW;
  }
  
  if (details.tamperDetection?.riskLevel === 'MEDIUM') {
    return RECOMMENDATION_TYPES.REVIEW;
  }
  
  if (details.documentValidation?.details?.ocrValidation && 
      !details.documentValidation.details.ocrValidation.valid) {
    return RECOMMENDATION_TYPES.REVIEW;
  }

  // Approve conditions
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH && flags.length <= 1) {
    return RECOMMENDATION_TYPES.APPROVE;
  }

  return RECOMMENDATION_TYPES.REVIEW;
};

/**
 * Generate human-readable summary
 * @param {Object} result - Analysis result
 * @returns {string} - Summary text
 */
const generateSummary = (result) => {
  const parts = [];

  // Document validation summary
  if (result.details.documentValidation?.valid) {
    if (result.details.extractedId) {
      parts.push(`Document validated (ID extracted: ****${result.details.extractedId.slice(-4)})`);
    } else {
      parts.push('Document format validated');
    }
  } else if (result.details.documentValidation?.errors?.length > 0) {
    parts.push('Document validation issues detected');
  }

  // Face match summary
  if (result.details.faceMatch?.match === true) {
    parts.push(`face match confirmed (${Math.round(result.details.faceMatch.confidence * 100)}% confidence)`);
  } else if (result.details.faceMatch?.match === false) {
    parts.push('face match failed');
  } else if (result.details.faceMatch?.error) {
    parts.push('face match unavailable');
  }

  // Tamper detection summary
  if (result.details.tamperDetection) {
    const riskLevel = result.details.tamperDetection.riskLevel;
    if (riskLevel === 'MINIMAL' || riskLevel === 'LOW') {
      parts.push('no tampering detected');
    } else if (riskLevel === 'MEDIUM') {
      parts.push('some tampering indicators found');
    } else if (riskLevel === 'HIGH') {
      parts.push('significant tampering detected');
    }
  }

  // Final recommendation
  const recText = {
    APPROVE: 'Recommended for approval',
    REVIEW: 'Requires manual review',
    REJECT: 'Recommended for rejection'
  };
  parts.push(`- ${recText[result.recommendation]}`);

  return parts.join(', ') + '.';
};

/**
 * Quick verification check (lightweight, fast)
 * @param {Object} params - Quick check parameters
 * @returns {Promise<Object>} - Quick check result
 */
const quickVerify = async (params) => {
  const { file, idNumber, idType } = params;

  const result = {
    passed: true,
    issues: [],
    recommendation: RECOMMENDATION_TYPES.REVIEW
  };

  try {
    // Quick document validation
    const docResult = await documentValidation.validateDocument({
      file,
      idNumber,
      idType,
      documentType: 'idProof'
    });

    if (!docResult.valid) {
      result.passed = false;
      result.issues.push(...docResult.errors);
    }

    // Quick tamper check
    if (file && (file.path || file)) {
      const tamperCheck = await tamperDetection.quickTamperCheck(file.path || file);
      if (!tamperCheck.passed) {
        result.passed = false;
        result.issues.push(...tamperCheck.warnings);
      }
    }

    result.recommendation = result.passed ? RECOMMENDATION_TYPES.APPROVE : RECOMMENDATION_TYPES.REVIEW;

  } catch (error) {
    result.passed = false;
    result.issues.push(error.message);
    result.recommendation = RECOMMENDATION_TYPES.REVIEW;
  }

  return result;
};

/**
 * Get recommendation badge color
 * @param {string} recommendation - Recommendation type
 * @returns {string} - Color code
 */
const getRecommendationColor = (recommendation) => {
  const colors = {
    APPROVE: 'green',
    REVIEW: 'yellow',
    REJECT: 'red'
  };
  return colors[recommendation] || 'gray';
};

/**
 * Get recommendation display text
 * @param {string} recommendation - Recommendation type
 * @returns {string} - Display text
 */
const getRecommendationText = (recommendation) => {
  const texts = {
    APPROVE: 'Recommended Approval',
    REVIEW: 'Needs Review',
    REJECT: 'High Risk'
  };
  return texts[recommendation] || 'Unknown';
};

/**
 * Get service status
 * @returns {Object} - Status of all AI services
 */
const getServiceStatus = () => {
  return {
    enabled: isEnabled(),
    faceMatch: {
      available: faceMatch.isConfigured(),
      provider: 'AWS Rekognition'
    },
    documentValidation: {
      available: documentValidation.isOcrAvailable(),
      provider: 'Tesseract.js'
    },
    tamperDetection: {
      available: true,
      provider: 'Sharp'
    },
    thresholds: CONFIDENCE_THRESHOLDS
  };
};

module.exports = {
  generateRecommendation,
  quickVerify,
  determineRecommendation,
  generateSummary,
  getRecommendationColor,
  getRecommendationText,
  getServiceStatus,
  isEnabled,
  RECOMMENDATION_TYPES,
  CONFIDENCE_THRESHOLDS,
  RISK_WEIGHTS
};
