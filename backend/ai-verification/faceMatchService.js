/**
 * AWS Rekognition Face Match Service
 * Production implementation for face comparison between ID and selfie
 * Uses AWS Rekognition for accurate face detection and comparison
 */

const { RekognitionClient, CompareFacesCommand, DetectFacesCommand, CreateCollectionCommand, IndexFacesCommand, SearchFacesCommand, DeleteFacesCommand } = require('@aws-sdk/client-rekognition');
const fs = require('fs');
const path = require('path');

// Initialize AWS Rekognition client
const getRekognitionClient = () => {
  return new RekognitionClient({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
};

// Face match thresholds from environment or defaults
const FACE_MATCH_THRESHOLDS = {
  HIGH_CONFIDENCE: parseFloat(process.env.AI_FACE_MATCH_THRESHOLD) || 0.90,
  MEDIUM_CONFIDENCE: 0.80,
  LOW_CONFIDENCE: 0.70
};

// Quality requirements for face images
const QUALITY_REQUIREMENTS = {
  minFaceSize: 50,          // Minimum face size in pixels
  minBrightness: 40,        // Minimum brightness
  maxBrightness: 220,       // Maximum brightness
  minSharpness: 50          // Minimum sharpness score
};

/**
 * Check if AWS Rekognition is configured
 * @returns {boolean}
 */
const isConfigured = () => {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
};

/**
 * Read image file as bytes for Rekognition
 * @param {string} imagePath - Path to image file
 * @returns {Promise<Buffer>} - Image bytes
 */
const readImageBytes = async (imagePath) => {
  try {
    if (!fs.existsSync(imagePath)) {
      throw new Error('Image file not found');
    }
    return fs.readFileSync(imagePath);
  } catch (error) {
    throw new Error(`Failed to read image: ${error.message}`);
  }
};

/**
 * Detect faces in an image using AWS Rekognition
 * @param {string} imagePath - Path to image file
 * @returns {Promise<Object>} - Face detection result
 */
const detectFaces = async (imagePath) => {
  const result = {
    detected: false,
    count: 0,
    faces: [],
    confidence: 0,
    quality: 'UNKNOWN',
    error: null
  };

  if (!isConfigured()) {
    result.error = 'AWS Rekognition not configured';
    result.quality = 'UNAVAILABLE';
    return result;
  }

  try {
    const client = getRekognitionClient();
    const imageBytes = await readImageBytes(imagePath);

    const command = new DetectFacesCommand({
      Image: { Bytes: imageBytes },
      Attributes: ['ALL']
    });

    const response = await client.send(command);

    if (response.FaceDetails && response.FaceDetails.length > 0) {
      result.detected = true;
      result.count = response.FaceDetails.length;
      result.faces = response.FaceDetails.map(face => ({
        confidence: face.Confidence / 100,
        boundingBox: face.BoundingBox,
        ageRange: face.AgeRange,
        gender: face.Gender,
        smile: face.Smile,
        eyeglasses: face.Eyeglasses,
        sunglasses: face.Sunglasses,
        eyesOpen: face.EyesOpen,
        mouthOpen: face.MouthOpen,
        emotions: face.Emotions,
        quality: face.Quality,
        pose: face.Pose
      }));

      // Use highest confidence face
      const bestFace = response.FaceDetails.reduce((best, face) => 
        face.Confidence > best.Confidence ? face : best
      );
      result.confidence = bestFace.Confidence / 100;

      // Determine quality based on sharpness and brightness
      if (bestFace.Quality) {
        const sharpness = bestFace.Quality.Sharpness || 0;
        const brightness = bestFace.Quality.Brightness || 0;
        
        if (sharpness > 80 && brightness > 40 && brightness < 220) {
          result.quality = 'HIGH';
        } else if (sharpness > 50 && brightness > 30 && brightness < 240) {
          result.quality = 'MEDIUM';
        } else {
          result.quality = 'LOW';
        }
      }
    }

  } catch (error) {
    console.error('Face detection error:', error);
    result.error = error.message;
    result.quality = 'ERROR';
  }

  return result;
};

/**
 * Compare two faces using AWS Rekognition
 * @param {string} idImagePath - Path to ID image
 * @param {string} selfiePath - Path to selfie image
 * @returns {Promise<Object>} - Face comparison result
 */
const compareFaces = async (idImagePath, selfiePath) => {
  const result = {
    match: false,
    confidence: 0,
    similarity: 0,
    recommendation: 'REVIEW',
    details: {
      idFaceDetected: false,
      selfieFaceDetected: false,
      idFaceQuality: null,
      selfieFaceQuality: null
    },
    warnings: [],
    error: null
  };

  if (!isConfigured()) {
    result.error = 'AWS Rekognition not configured - using fallback validation';
    result.recommendation = 'REVIEW';
    result.warnings.push('AI face matching unavailable - manual review required');
    return result;
  }

  try {
    const client = getRekognitionClient();

    // Read both images
    const [idImageBytes, selfieImageBytes] = await Promise.all([
      readImageBytes(idImagePath),
      readImageBytes(selfiePath)
    ]);

    // First, detect faces in both images
    const [idFaceResult, selfieFaceResult] = await Promise.all([
      detectFaces(idImagePath),
      detectFaces(selfiePath)
    ]);

    result.details.idFaceDetected = idFaceResult.detected;
    result.details.selfieFaceDetected = selfieFaceResult.detected;
    result.details.idFaceQuality = idFaceResult.quality;
    result.details.selfieFaceQuality = selfieFaceResult.quality;

    // Check if faces were detected in both images
    if (!idFaceResult.detected) {
      result.warnings.push('No face detected in ID image');
      result.recommendation = 'REVIEW';
      return result;
    }

    if (!selfieFaceResult.detected) {
      result.warnings.push('No face detected in selfie');
      result.recommendation = 'REVIEW';
      return result;
    }

    // Check for multiple faces in selfie (security concern)
    if (selfieFaceResult.count > 1) {
      result.warnings.push('Multiple faces detected in selfie');
      result.recommendation = 'REVIEW';
    }

    // Compare faces using Rekognition
    const command = new CompareFacesCommand({
      SourceImage: { Bytes: selfieImageBytes },  // Selfie as source
      TargetImage: { Bytes: idImageBytes },      // ID as target
      SimilarityThreshold: 70                    // Minimum similarity to return
    });

    const response = await client.send(command);

    if (response.FaceMatches && response.FaceMatches.length > 0) {
      // Get the best match
      const bestMatch = response.FaceMatches.reduce((best, match) => 
        match.Similarity > best.Similarity ? match : best
      );

      result.similarity = bestMatch.Similarity / 100;
      result.confidence = result.similarity;

      // Determine if it's a match based on threshold
      if (result.similarity >= FACE_MATCH_THRESHOLDS.HIGH_CONFIDENCE) {
        result.match = true;
        result.recommendation = 'APPROVE';
      } else if (result.similarity >= FACE_MATCH_THRESHOLDS.MEDIUM_CONFIDENCE) {
        result.match = true;
        result.recommendation = 'REVIEW';
        result.warnings.push('Face match confidence is moderate - manual review recommended');
      } else if (result.similarity >= FACE_MATCH_THRESHOLDS.LOW_CONFIDENCE) {
        result.match = false;
        result.recommendation = 'REVIEW';
        result.warnings.push('Low face match confidence - verify identity manually');
      } else {
        result.match = false;
        result.recommendation = 'REJECT';
        result.warnings.push('Face match failed - possible identity mismatch');
      }
    } else {
      // No face matches found
      result.match = false;
      result.recommendation = 'REJECT';
      result.warnings.push('No matching face found between selfie and ID');
    }

    // Add quality warnings
    if (idFaceResult.quality === 'LOW') {
      result.warnings.push('ID image quality is low');
    }
    if (selfieFaceResult.quality === 'LOW') {
      result.warnings.push('Selfie quality is low');
    }

  } catch (error) {
    console.error('Face comparison error:', error);
    result.error = error.message;
    result.recommendation = 'REVIEW';
    result.warnings.push('Face comparison failed - manual review required');
  }

  return result;
};

/**
 * Analyze image quality for face detection
 * @param {string} imagePath - Path to image file
 * @returns {Promise<Object>} - Quality analysis result
 */
const analyzeImageQuality = async (imagePath) => {
  const result = {
    valid: true,
    quality: 'GOOD',
    score: 1.0,
    issues: [],
    details: {}
  };

  try {
    // Use detectFaces to get quality metrics
    const faceResult = await detectFaces(imagePath);

    if (!faceResult.detected) {
      result.valid = false;
      result.quality = 'INVALID';
      result.issues.push('No face detected in image');
      result.score = 0;
      return result;
    }

    result.quality = faceResult.quality;
    result.details.faceCount = faceResult.count;
    result.details.confidence = faceResult.confidence;

    // Adjust score based on quality
    if (faceResult.quality === 'HIGH') {
      result.score = 1.0;
    } else if (faceResult.quality === 'MEDIUM') {
      result.score = 0.7;
      result.issues.push('Medium quality image - consider retaking');
    } else {
      result.score = 0.4;
      result.issues.push('Low quality image - retake recommended');
    }

    // Check for multiple faces
    if (faceResult.count > 1) {
      result.issues.push('Multiple faces detected');
      result.score *= 0.8;
    }

  } catch (error) {
    result.valid = false;
    result.quality = 'ERROR';
    result.issues.push(`Quality analysis failed: ${error.message}`);
    result.score = 0;
  }

  return result;
};

/**
 * Create Rekognition collection for storing face embeddings
 * @returns {Promise<Object>}
 */
const createCollection = async () => {
  if (!isConfigured()) {
    return { success: false, error: 'AWS Rekognition not configured' };
  }

  try {
    const client = getRekognitionClient();
    const collectionId = process.env.AWS_REKOGNITION_COLLECTION_ID || 'boyar-matrimony-faces';

    const command = new CreateCollectionCommand({
      CollectionId: collectionId
    });

    const response = await client.send(command);
    return { success: true, collectionArn: response.CollectionArn };
  } catch (error) {
    if (error.name === 'ResourceAlreadyExistsException') {
      return { success: true, message: 'Collection already exists' };
    }
    return { success: false, error: error.message };
  }
};

/**
 * Index a face for future searches
 * @param {string} userId - User ID
 * @param {string} imagePath - Path to face image
 * @returns {Promise<Object>}
 */
const indexFace = async (userId, imagePath) => {
  if (!isConfigured()) {
    return { success: false, error: 'AWS Rekognition not configured' };
  }

  try {
    const client = getRekognitionClient();
    const imageBytes = await readImageBytes(imagePath);
    const collectionId = process.env.AWS_REKOGNITION_COLLECTION_ID || 'boyar-matrimony-faces';

    const command = new IndexFacesCommand({
      CollectionId: collectionId,
      Image: { Bytes: imageBytes },
      ExternalImageId: userId,
      DetectionAttributes: ['ALL']
    });

    const response = await client.send(command);

    if (response.FaceRecords && response.FaceRecords.length > 0) {
      return {
        success: true,
        faceId: response.FaceRecords[0].Face.FaceId,
        confidence: response.FaceRecords[0].Face.Confidence / 100
      };
    }

    return { success: false, error: 'No face detected to index' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = {
  compareFaces,
  detectFaces,
  analyzeImageQuality,
  createCollection,
  indexFace,
  isConfigured,
  FACE_MATCH_THRESHOLDS,
  QUALITY_REQUIREMENTS
};
