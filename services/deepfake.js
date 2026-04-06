// server/services/deepfake.js
const axios = require('axios');

/**
 * Run deepfake detection on an image
 * @param {string} filePath - Path to the uploaded image
 * @returns {Promise<Object>} Detection result with score and verdict
 */
async function detectDeepfake(filePath) {
  try {
    // Example: send image to an external API
    // Replace with your chosen provider (e.g., Hive, Sensity, Microsoft Video Authenticator)
    const response = await axios.post(
      process.env.DEEPFAKE_API_URL,
      {
        file: filePath,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPFAKE_API_KEY}`,
        },
      }
    );

    // Assume API returns { score: 0.85, verdict: "fake" }
    return {
      score: response.data.score,
      verdict: response.data.verdict,
    };
  } catch (err) {
    console.error('Deepfake detection error:', err);
    return { score: null, verdict: 'error', error: 'Detection failed' };
  }
}

module.exports = { detectDeepfake };
