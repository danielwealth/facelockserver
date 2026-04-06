// server/services/ocr.js
const fs = require('fs');
const { TextractClient, AnalyzeDocumentCommand } = require('@aws-sdk/client-textract');
// Or use tesseract.js if you prefer local OCR: const Tesseract = require('tesseract.js');

const textractClient = new TextractClient({ region: process.env.AWS_REGION });

/**
 * Run OCR on a document image
 * @param {string} filePath - Path to the uploaded document image
 * @returns {Promise<Object>} Extracted text fields
 */
async function runOCR(filePath) {
  try {
    const fileBytes = fs.readFileSync(filePath);

    const params = {
      Document: { Bytes: fileBytes },
      FeatureTypes: ['TABLES', 'FORMS'], // optional, can just use raw text
    };

    const command = new AnalyzeDocumentCommand(params);
    const response = await textractClient.send(command);

    // Extract text blocks
    const textBlocks = response.Blocks
      .filter(b => b.BlockType === 'LINE')
      .map(b => b.Text);

    return {
      rawText: textBlocks.join(' '),
      lines: textBlocks,
    };
  } catch (err) {
    console.error('OCR error:', err);
    return { rawText: '', lines: [], error: 'OCR failed' };
  }
}

module.exports = { runOCR };
