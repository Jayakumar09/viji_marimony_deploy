/**
 * Tamper Detection Service with Sharp
 * Production implementation for document tampering detection
 * Uses Sharp for image analysis and metadata inspection
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');

// Tamper detection thresholds
const TAMPER_THRESHOLDS = {
  LOW_RISK: parseFloat(process.env.AI_TAMPER_THRESHOLD) || 0.20,
  MEDIUM_RISK: 0.45,
  HIGH_RISK: 0.70
};

// Common tampering indicators
const TAMPER_INDICATORS = {
  METADATA_INCONSISTENCY: 'metadata_inconsistency',
  COMPRESSION_ARTIFACTS: 'compression_artifacts',
  EDGE_ANOMALIES: 'edge_anomalies',
  COLOR_INCONSISTENCIES: 'color_inconsistencies',
  TEXT_ANOMALIES: 'text_anomalies',
  CLONING_DETECTED: 'cloning_detected',
  RESAMPLING_ARTIFACTS: 'resampling_artifacts',
  NOISE_INCONSISTENCY: 'noise_inconsistency',
  EXIF_MISSING: 'exif_missing',
  SUSPICIOUS_EDITING: 'suspicious_editing'
};

/**
 * Analyze image metadata for tampering signs
 * @param {string} filePath - Path to file
 * @returns {Promise<Object>} - Metadata analysis result
 */
const analyzeMetadata = async (filePath) => {
  const result = {
    valid: true,
    suspicious: false,
    score: 0,
    indicators: [],
    details: {}
  };

  try {
    if (!fs.existsSync(filePath)) {
      result.valid = false;
      return result;
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    result.details.fileSize = stats.size;
    result.details.modifiedTime = stats.mtime;

    // Check for suspicious file size
    if (stats.size < 50 * 1024) {
      result.suspicious = true;
      result.score += 0.15;
      result.indicators.push('File size unusually small');
    }

    // Get file extension
    const ext = path.extname(filePath).toLowerCase();
    result.details.extension = ext;

    // Read and validate file header
    const fd = fs.openSync(filePath, 'r');
    const header = Buffer.alloc(24);
    fs.readSync(fd, header, 0, 24, 0);
    fs.closeSync(fd);

    // Validate file signature matches extension
    const signatures = {
      '.jpg': [0xFF, 0xD8, 0xFF],
      '.jpeg': [0xFF, 0xD8, 0xFF],
      '.png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
      '.webp': [0x52, 0x49, 0x46, 0x46]
    };

    const expectedSig = signatures[ext];
    if (expectedSig) {
      const matches = expectedSig.every((byte, i) => header[i] === byte);
      if (!matches) {
        result.suspicious = true;
        result.score += 0.35;
        result.indicators.push(TAMPER_INDICATORS.METADATA_INCONSISTENCY);
        result.indicators.push('File signature does not match extension');
      }
    }

    result.details.headerValid = !result.suspicious;

  } catch (error) {
    console.error('Metadata analysis error:', error);
    result.valid = false;
    result.details.error = error.message;
  }

  return result;
};

/**
 * Analyze image using Sharp for tampering detection
 * @param {string} imagePath - Path to image
 * @returns {Promise<Object>} - Image analysis result
 */
const analyzeImageContent = async (imagePath) => {
  const result = {
    valid: true,
    suspicious: false,
    score: 0,
    indicators: [],
    details: {}
  };

  try {
    if (!fs.existsSync(imagePath)) {
      result.valid = false;
      return result;
    }

    // Load image with Sharp
    const image = sharp(imagePath);
    const metadata = await image.metadata();

    result.details.format = metadata.format;
    result.details.width = metadata.width;
    result.details.height = metadata.height;
    result.details.channels = metadata.channels;
    result.details.hasAlpha = metadata.hasAlpha;
    result.details.space = metadata.space;

    // Check for EXIF data presence
    if (metadata.exif) {
      result.details.hasExif = true;
      // Parse EXIF for editing software signatures
      const exifBuffer = Buffer.isBuffer(metadata.exif) ? metadata.exif : Buffer.from(metadata.exif);
      const exifString = exifBuffer.toString('utf8').toLowerCase();
      
      const editingSoftware = ['photoshop', 'lightroom', 'gimp', 'snapseed', 'pixlr', 'canva'];
      for (const software of editingSoftware) {
        if (exifString.includes(software)) {
          result.suspicious = true;
          result.score += 0.25;
          result.indicators.push(TAMPER_INDICATORS.SUSPICIOUS_EDITING);
          result.indicators.push(`Editing software detected: ${software}`);
          break;
        }
      }
    } else {
      result.details.hasExif = false;
      // Missing EXIF is slightly suspicious for ID documents
      result.score += 0.10;
      result.indicators.push(TAMPER_INDICATORS.EXIF_MISSING);
    }

    // Check for unusual dimensions (possible cropping)
    const aspectRatio = metadata.width / metadata.height;
    if (aspectRatio < 0.5 || aspectRatio > 2.5) {
      result.suspicious = true;
      result.score += 0.15;
      result.indicators.push('Unusual aspect ratio detected');
    }

    // Check for very small images (low quality = suspicious)
    if (metadata.width < 500 || metadata.height < 500) {
      result.score += 0.10;
      result.indicators.push('Low resolution image');
    }

    // Check for compression level
    if (metadata.format === 'jpeg') {
      // JPEG quality estimation based on file size vs dimensions
      const pixelCount = metadata.width * metadata.height;
      const bytesPerPixel = fs.statSync(imagePath).size / pixelCount;
      
      if (bytesPerPixel < 0.5) {
        result.score += 0.15;
        result.indicators.push(TAMPER_INDICATORS.COMPRESSION_ARTIFACTS);
        result.indicators.push('High compression detected');
      }
    }

  } catch (error) {
    console.error('Image content analysis error:', error);
    result.valid = false;
    result.details.error = error.message;
  }

  return result;
};

/**
 * Analyze image noise patterns for tampering
 * @param {string} imagePath - Path to image
 * @returns {Promise<Object>} - Noise analysis result
 */
const analyzeNoisePattern = async (imagePath) => {
  const result = {
    valid: true,
    suspicious: false,
    score: 0,
    indicators: [],
    details: {}
  };

  try {
    if (!fs.existsSync(imagePath)) {
      result.valid = false;
      return result;
    }

    // Get raw pixel data
    const image = sharp(imagePath);
    const { data, info } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;

    // Sample noise at different regions
    const regionSize = Math.min(50, Math.floor(width / 4), Math.floor(height / 4));
    const regions = [
      { x: 0, y: 0, name: 'top-left' },
      { x: width - regionSize, y: 0, name: 'top-right' },
      { x: 0, y: height - regionSize, name: 'bottom-left' },
      { x: width - regionSize, y: height - regionSize, name: 'bottom-right' },
      { x: Math.floor(width / 2) - Math.floor(regionSize / 2), y: Math.floor(height / 2) - Math.floor(regionSize / 2), name: 'center' }
    ];

    const noiseLevels = [];

    for (const region of regions) {
      let noiseSum = 0;
      let count = 0;

      for (let y = region.y; y < region.y + regionSize && y < height - 1; y++) {
        for (let x = region.x; x < region.x + regionSize && x < width - 1; x++) {
          const idx = (y * width + x) * channels;
          
          // Calculate local gradient (simple edge detection)
          const rightIdx = idx + channels;
          const bottomIdx = ((y + 1) * width + x) * channels;

          if (rightIdx < data.length && bottomIdx < data.length) {
            const gradientX = Math.abs(data[idx] - data[rightIdx]);
            const gradientY = Math.abs(data[idx] - data[bottomIdx]);
            noiseSum += gradientX + gradientY;
            count++;
          }
        }
      }

      const avgNoise = count > 0 ? noiseSum / count : 0;
      noiseLevels.push({ region: region.name, noise: avgNoise });
    }

    result.details.noiseLevels = noiseLevels;

    // Check for noise inconsistency across regions
    const noiseValues = noiseLevels.map(r => r.noise);
    const avgNoise = noiseValues.reduce((a, b) => a + b, 0) / noiseValues.length;
    const maxDeviation = Math.max(...noiseValues.map(n => Math.abs(n - avgNoise)));

    // High deviation indicates possible localized editing
    const deviationRatio = avgNoise > 0 ? maxDeviation / avgNoise : 0;
    
    if (deviationRatio > 0.5) {
      result.suspicious = true;
      result.score += 0.30;
      result.indicators.push(TAMPER_INDICATORS.NOISE_INCONSISTENCY);
      result.indicators.push('Inconsistent noise pattern detected');
    }

    result.details.noiseDeviation = deviationRatio;

  } catch (error) {
    console.error('Noise analysis error:', error);
    result.valid = false;
    result.details.error = error.message;
  }

  return result;
};

/**
 * Analyze color consistency for tampering detection
 * @param {string} imagePath - Path to image
 * @returns {Promise<Object>} - Color analysis result
 */
const analyzeColorConsistency = async (imagePath) => {
  const result = {
    valid: true,
    suspicious: false,
    score: 0,
    indicators: [],
    details: {}
  };

  try {
    if (!fs.existsSync(imagePath)) {
      result.valid = false;
      return result;
    }

    // Get image stats
    const image = sharp(imagePath);
    const stats = await image.stats();

    result.details.channels = stats.channels.map(ch => ({
      mean: ch.mean,
      stdev: ch.stdev,
      min: ch.min,
      max: ch.max
    }));

    // Check for unusual color distribution
    for (const ch of stats.channels) {
      // Very low standard deviation could indicate artificial uniformity
      if (ch.stdev < 10) {
        result.score += 0.10;
        result.indicators.push(TAMPER_INDICATORS.COLOR_INCONSISTENCIES);
        result.indicators.push('Unusually uniform color distribution');
        break;
      }
    }

    // Check for clipped highlights/shadows (common in edited images)
    const { data, info } = await sharp(imagePath)
      .raw()
      .toBuffer({ resolveWithObject: true });

    let clippedHighlights = 0;
    let clippedShadows = 0;
    const totalPixels = info.width * info.height;

    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1] || 0;
      const b = data[i + 2] || 0;

      // Check for pure white or pure black pixels
      if (r >= 250 && g >= 250 && b >= 250) clippedHighlights++;
      if (r <= 5 && g <= 5 && b <= 5) clippedShadows++;
    }

    const highlightRatio = clippedHighlights / totalPixels;
    const shadowRatio = clippedShadows / totalPixels;

    result.details.clippedHighlights = highlightRatio;
    result.details.clippedShadows = shadowRatio;

    // High clipping ratio can indicate editing
    if (highlightRatio > 0.05 || shadowRatio > 0.05) {
      result.score += 0.15;
      result.indicators.push('High clipping in highlights or shadows');
    }

  } catch (error) {
    console.error('Color analysis error:', error);
    result.valid = false;
    result.details.error = error.message;
  }

  return result;
};

/**
 * Comprehensive document tamper analysis
 * @param {string} filePath - Path to document
 * @returns {Promise<Object>} - Complete tamper analysis result
 */
const analyzeDocument = async (filePath) => {
  const startTime = Date.now();
  
  const result = {
    tamperScore: 0,
    riskLevel: 'LOW',
    indicators: [],
    details: {
      metadata: null,
      imageContent: null,
      noisePattern: null,
      colorConsistency: null
    },
    passed: true,
    recommendation: 'APPROVE',
    processingTime: 0
  };

  try {
    // Run all analyses in parallel
    const [metadataResult, imageResult, noiseResult, colorResult] = await Promise.all([
      analyzeMetadata(filePath),
      analyzeImageContent(filePath),
      analyzeNoisePattern(filePath),
      analyzeColorConsistency(filePath)
    ]);

    result.details.metadata = metadataResult;
    result.details.imageContent = imageResult;
    result.details.noisePattern = noiseResult;
    result.details.colorConsistency = colorResult;

    // Aggregate scores
    const scores = [
      metadataResult.score,
      imageResult.score,
      noiseResult.score,
      colorResult.score
    ].filter(s => s > 0);

    // Calculate weighted average
    if (scores.length > 0) {
      result.tamperScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    // Collect all indicators
    const allIndicators = [
      ...metadataResult.indicators,
      ...imageResult.indicators,
      ...noiseResult.indicators,
      ...colorResult.indicators
    ];
    result.indicators = allIndicators;

    // Determine risk level
    if (result.tamperScore >= TAMPER_THRESHOLDS.HIGH_RISK) {
      result.riskLevel = 'HIGH';
      result.passed = false;
      result.recommendation = 'REJECT';
    } else if (result.tamperScore >= TAMPER_THRESHOLDS.MEDIUM_RISK) {
      result.riskLevel = 'MEDIUM';
      result.recommendation = 'REVIEW';
    } else if (result.tamperScore >= TAMPER_THRESHOLDS.LOW_RISK) {
      result.riskLevel = 'LOW';
      result.recommendation = 'REVIEW';
    } else {
      result.riskLevel = 'MINIMAL';
      result.recommendation = 'APPROVE';
    }

    // Check for any critical indicators
    const criticalIndicators = [
      TAMPER_INDICATORS.METADATA_INCONSISTENCY,
      TAMPER_INDICATORS.CLONING_DETECTED,
      TAMPER_INDICATORS.SUSPICIOUS_EDITING
    ];

    if (allIndicators.some(ind => criticalIndicators.includes(ind))) {
      if (result.riskLevel !== 'HIGH') {
        result.riskLevel = 'MEDIUM';
        result.recommendation = 'REVIEW';
      }
    }

  } catch (error) {
    console.error('Tamper analysis error:', error);
    result.tamperScore = 0.5;
    result.riskLevel = 'MEDIUM';
    result.passed = false;
    result.recommendation = 'REVIEW';
    result.indicators.push('Analysis error occurred');
    result.details.error = error.message;
  }

  result.processingTime = Date.now() - startTime;
  return result;
};

/**
 * Quick tamper check for fast validation
 * @param {string} filePath - Path to file
 * @returns {Promise<Object>} - Quick check result
 */
const quickTamperCheck = async (filePath) => {
  const result = {
    passed: true,
    warnings: [],
    score: 0
  };

  try {
    // Quick metadata check
    const metadataResult = await analyzeMetadata(filePath);
    
    if (metadataResult.suspicious) {
      result.passed = false;
      result.warnings.push(...metadataResult.indicators);
      result.score = metadataResult.score;
    }

    // Quick file size check
    const stats = fs.statSync(filePath);
    if (stats.size < 30 * 1024) {
      result.warnings.push('File size very small - may be low quality');
    }

  } catch (error) {
    result.passed = false;
    result.warnings.push(`Quick check failed: ${error.message}`);
  }

  return result;
};

/**
 * Calculate perceptual hash for image comparison
 * @param {string} imagePath - Path to image
 * @returns {Promise<string>} - Perceptual hash
 */
const calculatePerceptualHash = async (imagePath) => {
  try {
    // Resize to small size and convert to grayscale
    const { data } = await sharp(imagePath)
      .resize(9, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Calculate difference hash
    let hash = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const left = data[row * 9 + col];
        const right = data[row * 9 + col + 1];
        hash += left < right ? '1' : '0';
      }
    }

    return hash;
  } catch (error) {
    console.error('Hash calculation error:', error);
    return null;
  }
};

/**
 * Compare two images for similarity
 * @param {string} image1Path - First image path
 * @param {string} image2Path - Second image path
 * @returns {Promise<Object>} - Similarity result
 */
const compareImages = async (image1Path, image2Path) => {
  const result = {
    similar: false,
    similarity: 0,
    hash1: null,
    hash2: null
  };

  try {
    const [hash1, hash2] = await Promise.all([
      calculatePerceptualHash(image1Path),
      calculatePerceptualHash(image2Path)
    ]);

    result.hash1 = hash1;
    result.hash2 = hash2;

    if (hash1 && hash2) {
      // Calculate Hamming distance
      let distance = 0;
      for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) distance++;
      }

      result.similarity = 1 - (distance / hash1.length);
      result.similar = result.similarity > 0.9;
    }

  } catch (error) {
    console.error('Image comparison error:', error);
  }

  return result;
};

module.exports = {
  analyzeDocument,
  analyzeMetadata,
  analyzeImageContent,
  analyzeNoisePattern,
  analyzeColorConsistency,
  quickTamperCheck,
  calculatePerceptualHash,
  compareImages,
  TAMPER_THRESHOLDS,
  TAMPER_INDICATORS
};
