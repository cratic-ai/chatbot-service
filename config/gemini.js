// config/gemini.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

let aiInstance = null;

function getAI() {
    if (!aiInstance) {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not set in environment variables');
        }

        console.log('🔧 Initializing Gemini AI...');
        aiInstance = new GoogleGenerativeAI(apiKey);
        console.log('✅ Gemini AI initialized successfully');
    }

    return aiInstance;
}

module.exports = { getAI };