// utils/geminiClient.js
const { GoogleGenAI } = require('@google/generative-ai');

let aiInstance = null;

/**
 * Get singleton Gemini AI client
 * Reuses the same instance across all requests for better performance
 */
function getAI() {
    if (!aiInstance) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not configured');
        }
        aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        console.log('✅ Gemini AI client initialized');
    }
    return aiInstance;
}

module.exports = { getAI };