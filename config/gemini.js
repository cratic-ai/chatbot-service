// utils/geminiClient.js
const { GoogleGenAI } = require('@google/generative-ai');

let aiInstance = null;

/**
 * Get singleton Gemini AI client
 * Reuses the same instance across all requests for better performance
 */
// config/gemini.js

// ✅ CORRECT: Use the proper import for @google/generative-ai
const { GoogleGenerativeAI } = require('@google/generative-ai');

let aiInstance = null;

/**
 * Initialize and return a singleton instance of GoogleGenerativeAI
 */
function getAI() {
    if (!aiInstance) {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not set in environment variables');
        }

        // ✅ Correct instantiation
        aiInstance = new GoogleGenerativeAI(apiKey);
    }

    return aiInstance;
}

module.exports = { getAI };