/**
 * Document Validation Service with Tesseract OCR
 * Production implementation for document validation and text extraction
 * Uses Tesseract.js for OCR and document verification
 */

const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');

// Allowed document types and their MIME types
const ALLOWED_DOCUMENT_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf']
};

// Maximum file sizes (in bytes)
const MAX_FILE_SIZES = {
  idProof: 10 * 1024 * 1024, // 10MB
  selfie: 5 * 1024 * 1024,   // 5MB
  document: 10 * 1024 * 1024 // 10MB
};

// ID type specific validations with patterns
const ID_TYPE_VALIDATIONS = {
  AADHAAR: {
    minLength: 12,
    maxLength: 12,
    pattern: /^\d{4}\s?\d{4}\s?\d{4}$|^\d{12}$/,
    formatDescription: '12-digit number (e.g., 1234 5678 9012)',
    keywords: ['aadhaar', 'aadhar', 'uid', 'unique identification'],
    ocrPatterns: [/\d{4}\s?\d{4}\s?\d{4}/g, /\b\d{12}\b/g]
  },
  PAN: {
    minLength: 10,
    maxLength: 10,
    pattern: /^[A-Z]{5}\d{4}[A-Z]{1}$/,
    formatDescription: 'ABCDE1234F format (5 letters, 4 digits, 1 letter)',
    keywords: ['pan', 'permanent account', 'income tax'],
    ocrPatterns: [/[A-Z]{5}\d{4}[A-Z]{1}/g]
  },
  VOTER_ID: {
    minLength: 10,
    maxLength: 10,
    pattern: /^[A-Z]{3}\d{7}$/,
    formatDescription: 'ABC1234567 format (3 letters, 7 digits)',
    keywords: ['voter', 'election', 'epic'],
    ocrPatterns: [/[A-Z]{3}\d{7}/g]
  },
  DRIVING_LICENSE: {
    minLength: 8,
    maxLength: 20,
    pattern: /^[A-Z]{2}\d{2}\s?\d{11}$|^[A-Z]{2}-\d{13}$/,
    formatDescription: 'State code followed by numbers (e.g., TN01 20140012345)',
    keywords: ['driving', 'licence', 'license', 'dl'],
    ocrPatterns: [/[A-Z]{2}\d{2}\s?\d{11}/g, /[A-Z]{2}-\d{13}/g]
  },
  PASSPORT: {
    minLength: 8,
    maxLength: 9,
    pattern: /^[A-Z]{1}\d{7}$/,
    formatDescription: 'Letter followed by 7 digits (e.g., J1234567)',
    keywords: ['passport', 'republic of india'],
    ocrPatterns: [/[A-Z]\d{7}/g]
  }
};

// Tesseract worker instance (lazy loaded)
let tesseractWorker = null;

/**
 * Initialize Tesseract worker
 * @returns {Promise<Object>}
 */
const initTesseract = async () => {
  if (!tesseractWorker) {
    const lang = process.env.TESSERACT_LANGUAGE || 'eng+hin';
    tesseractWorker = await Tesseract.createWorker(lang, 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
  }
  return tesseractWorker;
};

/**
 * Terminate Tesseract worker (cleanup)
 */
const terminateTesseract = async () => {
  if (tesseractWorker) {
    await tesseractWorker.terminate();
    tesseractWorker = null;
  }
};

/**
 * Preprocess image for better OCR results
 * @param {string} imagePath - Path to image
 * @returns {Promise<Buffer>} - Preprocessed image buffer
 */
const preprocessImage = async (imagePath) => {
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();

    // Apply preprocessing for better OCR
    const processedBuffer = await image
      .resize({ width: Math.max(metadata.width, 1500) }) // Ensure minimum width
      .grayscale() // Convert to grayscale
      .normalize() // Normalize contrast
      .sharpen() // Sharpen edges
      .toBuffer();

    return processedBuffer;
  } catch (error) {
    console.error('Image preprocessing error:', error);
    // Return original if preprocessing fails
    return fs.readFileSync(imagePath);
  }
};

/**
 * Extract text from image using Tesseract OCR
 * @param {string} imagePath - Path to image file
 * @returns {Promise<Object>} - OCR result with extracted text
 */
const extractText = async (imagePath) => {
  const result = {
    success: false,
    text: '',
    confidence: 0,
    words: [],
    lines: [],
    error: null
  };

  try {
    if (!fs.existsSync(imagePath)) {
      result.error = 'Image file not found';
      return result;
    }

    // Preprocess image for better OCR
    const processedImage = await preprocessImage(imagePath);

    // Initialize Tesseract and perform OCR
    const worker = await initTesseract();
    const ocrResult = await worker.recognize(processedImage);

    result.success = true;
    result.text = ocrResult.data.text;
    result.confidence = ocrResult.data.confidence / 100;
    result.words = ocrResult.data.words?.map(w => ({
      text: w.text,
      confidence: w.confidence / 100,
      bbox: w.bbox
    })) || [];
    result.lines = ocrResult.data.lines?.map(l => ({
      text: l.text,
      confidence: l.confidence / 100
    })) || [];

  } catch (error) {
    console.error('OCR extraction error:', error);
    result.error = error.message;
  }

  return result;
};

/**
 * Validate file type and extension
 * @param {Object} file - Uploaded file object
 * @param {string} documentType - Type of document (idProof, selfie, document)
 * @returns {Object} - Validation result
 */
const validateFileType = (file, documentType = 'document') => {
  const result = {
    valid: true,
    errors: [],
    warnings: []
  };

  if (!file) {
    result.valid = false;
    result.errors.push('No file provided');
    return result;
  }

  // Check MIME type
  const allowedMimeTypes = Object.keys(ALLOWED_DOCUMENT_TYPES);
  if (!allowedMimeTypes.includes(file.mimetype)) {
    result.valid = false;
    result.errors.push(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`);
  }

  // Check file extension
  const ext = path.extname(file.originalname || file.filename || '').toLowerCase();
  const allowedExtensions = ALLOWED_DOCUMENT_TYPES[file.mimetype] || [];
  if (!allowedExtensions.includes(ext)) {
    result.warnings.push(`File extension ${ext} may not match content type ${file.mimetype}`);
  }

  // Check file size
  const maxSize = MAX_FILE_SIZES[documentType] || MAX_FILE_SIZES.document;
  if (file.size > maxSize) {
    result.valid = false;
    result.errors.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
  }

  return result;
};

/**
 * Validate ID number format
 * @param {string} idNumber - ID number to validate
 * @param {string} idType - Type of ID (AADHAAR, PAN, etc.)
 * @returns {Object} - Validation result
 */
const validateIdNumber = (idNumber, idType) => {
  const result = {
    valid: false,
    errors: [],
    warnings: [],
    details: {
      type: idType,
      formatValid: false,
      lengthValid: false,
      patternMatch: false
    }
  };

  const validation = ID_TYPE_VALIDATIONS[idType];
  if (!validation) {
    result.errors.push(`Unknown ID type: ${idType}`);
    return result;
  }

  // Clean the ID number (remove spaces)
  const cleanId = idNumber.replace(/\s/g, '');

  // Check length
  if (cleanId.length >= validation.minLength && cleanId.length <= validation.maxLength) {
    result.details.lengthValid = true;
  } else {
    result.errors.push(`Invalid length. Expected ${validation.minLength}-${validation.maxLength} characters, got ${cleanId.length}`);
  }

  // Check pattern
  if (validation.pattern.test(cleanId)) {
    result.details.patternMatch = true;
    result.details.formatValid = true;
  } else {
    result.errors.push(`Invalid format. Expected: ${validation.formatDescription}`);
  }

  // Overall validity
  result.valid = result.details.lengthValid && result.details.patternMatch;

  return result;
};

/**
 * Extract and validate ID number from document image
 * @param {string} imagePath - Path to document image
 * @param {string} idType - Type of ID
 * @returns {Promise<Object>} - Extraction and validation result
 */
const extractAndValidateId = async (imagePath, idType) => {
  const result = {
    valid: false,
    extractedId: null,
    confidence: 0,
    matchedPatterns: [],
    ocrText: '',
    errors: [],
    warnings: []
  };

  try {
    // Extract text from image
    const ocrResult = await extractText(imagePath);

    if (!ocrResult.success) {
      result.errors.push(`OCR failed: ${ocrResult.error}`);
      return result;
    }

    result.ocrText = ocrResult.text;
    result.confidence = ocrResult.confidence;

    const validation = ID_TYPE_VALIDATIONS[idType];
    if (!validation) {
      result.errors.push(`Unknown ID type: ${idType}`);
      return result;
    }

    // Search for ID patterns in extracted text
    const text = ocrResult.text.toUpperCase().replace(/\s+/g, ' ');
    
    for (const pattern of validation.ocrPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const cleanMatch = match.replace(/\s/g, '');
          const validation = validateIdNumber(cleanMatch, idType);
          if (validation.valid) {
            result.matchedPatterns.push({
              value: cleanMatch,
              original: match,
              confidence: ocrResult.confidence
            });
          }
        }
      }
    }

    // Check for document keywords
    const keywordMatches = validation.keywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );

    if (keywordMatches.length > 0) {
      result.warnings.push(`Document keywords found: ${keywordMatches.join(', ')}`);
    }

    // Select best match
    if (result.matchedPatterns.length > 0) {
      const bestMatch = result.matchedPatterns.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      result.extractedId = bestMatch.value;
      result.valid = true;
    } else {
      result.warnings.push('No valid ID number pattern found in document');
    }

  } catch (error) {
    result.errors.push(`Extraction error: ${error.message}`);
  }

  return result;
};

/**
 * Comprehensive document validation
 * @param {Object} params - Validation parameters
 * @param {Object} params.file - Uploaded file
 * @param {string} params.idNumber - ID number to validate
 * @param {string} params.idType - Type of ID
 * @param {string} params.documentType - Document type
 * @returns {Promise<Object>} - Complete validation result
 */
const validateDocument = async (params) => {
  const { file, idNumber, idType, documentType = 'idProof' } = params;

  const result = {
    valid: true,
    errors: [],
    warnings: [],
    confidence: 1,
    details: {
      fileValidation: null,
      idValidation: null,
      ocrValidation: null
    }
  };

  try {
    // Step 1: Validate file type and size
    if (file) {
      result.details.fileValidation = validateFileType(file, documentType);
      if (!result.details.fileValidation.valid) {
        result.valid = false;
        result.errors.push(...result.details.fileValidation.errors);
      }
      result.warnings.push(...result.details.fileValidation.warnings);
    }

    // Step 2: Validate ID number format
    if (idNumber && idType) {
      result.details.idValidation = validateIdNumber(idNumber, idType);
      if (!result.details.idValidation.valid) {
        result.valid = false;
        result.errors.push(...result.details.idValidation.errors);
      }
      result.warnings.push(...result.details.idValidation.warnings);
    }

    // Step 3: OCR validation if file path provided
    if (file && file.path && idType) {
      result.details.ocrValidation = await extractAndValidateId(file.path || file, idType);
      
      if (result.details.ocrValidation.valid) {
        // Verify OCR extracted ID matches provided ID
        if (idNumber && result.details.ocrValidation.extractedId) {
          const providedClean = idNumber.replace(/\s/g, '');
          const extractedClean = result.details.ocrValidation.extractedId.replace(/\s/g, '');
          
          if (providedClean !== extractedClean) {
            result.warnings.push('Provided ID number does not match extracted ID from document');
            result.confidence *= 0.7;
          }
        }
        result.confidence *= result.details.ocrValidation.confidence;
      } else {
        result.warnings.push(...result.details.ocrValidation.warnings);
        result.confidence *= 0.8;
      }
    }

  } catch (error) {
    result.valid = false;
    result.errors.push(`Validation error: ${error.message}`);
  }

  return result;
};

/**
 * Get supported ID types
 * @returns {Array}
 */
const getSupportedIdTypes = () => {
  return Object.entries(ID_TYPE_VALIDATIONS).map(([type, config]) => ({
    type,
    formatDescription: config.formatDescription,
    minLength: config.minLength,
    maxLength: config.maxLength
  }));
};

/**
 * Check if OCR is available
 * @returns {boolean}
 */
const isOcrAvailable = () => {
  return true; // Tesseract.js is always available
};

module.exports = {
  validateFileType,
  validateIdNumber,
  validateDocument,
  extractText,
  extractAndValidateId,
  preprocessImage,
  getSupportedIdTypes,
  isOcrAvailable,
  initTesseract,
  terminateTesseract,
  ALLOWED_DOCUMENT_TYPES,
  MAX_FILE_SIZES,
  ID_TYPE_VALIDATIONS
};
