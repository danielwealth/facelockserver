// services/ocr.js

/**
 * Parse OCR text lines into structured fields
 * @param {string[]} lines - Array of text lines from OCR
 * @returns {Object} Parsed fields { name, dob, idNumber }
 */
function parseOCRText(lines) {
  const result = {};
  const text = lines.join(' ').toLowerCase();

  // Simple regex-based parsing (can be improved)
  const nameMatch = text.match(/name[:\s]+([a-z\s]+)/i);
  const dobMatch = text.match(/date of birth[:\s]+(\d{2}[-/]\d{2}[-/]\d{4})/i);
  const idMatch = text.match(/id[:\s]+([a-z0-9]+)/i);

  if (nameMatch) result.name = nameMatch[1].trim();
  if (dobMatch) result.dob = dobMatch[1].trim();
  if (idMatch) result.idNumber = idMatch[1].trim();

  return result;
}

/**
 * Run OCR on a file path using AWS Textract (or another OCR provider)
 * @param {string} filePath - Path to the uploaded image/document
 * @returns {Promise<Object>} OCR result with raw text, lines, and parsed fields
 */
async function runOCR(filePath) {
  // Example placeholder: integrate AWS Textract or another OCR provider here
  // const response = await textract.analyzeDocument(...);

  // For now, assume `response.Blocks` is available
  const textBlocks = response.Blocks
    .filter(b => b.BlockType === 'LINE')
    .map(b => b.Text);

  return {
    rawText: textBlocks.join(' '),
    lines: textBlocks,
    parsed: parseOCRText(textBlocks),
  };
}

module.exports = {
  parseOCRText,
  runOCR,
};
