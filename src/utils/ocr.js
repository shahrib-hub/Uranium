const Tesseract = require('tesseract.js');
const axios = require('axios');
const sharp = require('sharp');

async function extractTextFromAttachment(url) {
  try {
    // 1. Download image
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const imageBuffer = response.data;

    // 2. Preprocess image with sharp
    const processedBuffer = await sharp(imageBuffer)
      .resize({ width: 1280 })       // Upscale for better OCR
      .grayscale()                   // Convert to grayscale
      .normalize()                   // Normalize contrast
      .threshold(180)                // Binarize image
      .toBuffer();

    // 3. Run OCR with tesseract.js (no logger)
    const result = await Tesseract.recognize(processedBuffer, 'eng');

    return result.data.text;
  } catch (err) {
    console.error('OCR error:', err);
    throw new Error('Failed to process image for OCR.');
  }
}

module.exports = { extractTextFromAttachment };
