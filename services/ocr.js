// server/services/ocr.js
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

async function runOCR(filePath) {
  // ...existing Textract logic...
  const textBlocks = response.Blocks
    .filter(b => b.BlockType === 'LINE')
    .map(b => b.Text);

  return {
    rawText: textBlocks.join(' '),
    lines: textBlocks,
    parsed: parseOCRText(textBlocks),
  };
}
