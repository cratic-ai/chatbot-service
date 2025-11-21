// controllers/gemini.controller.js
const { GoogleGenAI } = require('@google/generative-ai');

function getAI() {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

async function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// List all RAG stores
exports.listRagStores = async (req, res) => {
    try {
        const ai = getAI();
        const response = await ai.fileSearchStores.list();
        const stores = [];

        for await (const store of response) {
            if (store.name && store.displayName) {
                stores.push({ name: store.name, displayName: store.displayName });
            }
        }

        res.json({ stores });
    } catch (error) {
        console.error('Error listing RAG stores:', error);
        res.status(500).json({ message: 'Failed to list RAG stores', error: error.message });
    }
};

// Create RAG store
exports.createRagStore = async (req, res) => {
    try {
        const { displayName } = req.body;

        if (!displayName) {
            return res.status(400).json({ message: 'Display name is required' });
        }

        const ai = getAI();
        const ragStore = await ai.fileSearchStores.create({ config: { displayName } });

        if (!ragStore.name) {
            throw new Error("Failed to create RAG store: name is missing.");
        }

        res.json({ name: ragStore.name });
    } catch (error) {
        console.error('Error creating RAG store:', error);
        res.status(500).json({ message: 'Failed to create RAG store', error: error.message });
    }
};

// Delete RAG store
exports.deleteRagStore = async (req, res) => {
    try {
        const { storeName } = req.params;
        const ai = getAI();

        await ai.fileSearchStores.delete({
            name: storeName,
            config: { force: true },
        });

        res.json({ message: 'RAG store deleted successfully' });
    } catch (error) {
        console.error('Error deleting RAG store:', error);
        res.status(500).json({ message: 'Failed to delete RAG store', error: error.message });
    }
};

// List all documents
exports.listAllDocuments = async (req, res) => {
    try {
        const ai = getAI();

        // Get all stores
        const storesResponse = await ai.fileSearchStores.list();
        const storeMap = new Map();

        for await (const store of storesResponse) {
            if (store.name && store.displayName) {
                storeMap.set(store.name, store.displayName);
            }
        }

        // Get all files
        const response = await ai.files.list();
        const documents = [];

        for await (const doc of response) {
            const docName = doc.name;
            if (docName) {
                const parts = docName.split('/');
                if (parts.length >= 3 && parts[0] === 'ragStores' && parts[2] === 'files') {
                    const storeName = `${parts[0]}/${parts[1]}`;
                    const storeDisplayName = storeMap.get(storeName) || parts[1];
                    documents.push({
                        ...doc,
                        storeName: storeName,
                        storeDisplayName: storeDisplayName,
                    });
                }
            }
        }

        res.json({ documents });
    } catch (error) {
        console.error('Error listing documents:', error);
        res.status(500).json({ message: 'Failed to list documents', error: error.message });
    }
};

// List documents in a specific store
exports.listDocumentsInStore = async (req, res) => {
    try {
        const { storeName } = req.params;
        const ai = getAI();

        const storesResponse = await ai.fileSearchStores.list();
        const storeMap = new Map();

        for await (const store of storesResponse) {
            if (store.name && store.displayName) {
                storeMap.set(store.name, store.displayName);
            }
        }

        const response = await ai.files.list();
        const documents = [];

        for await (const doc of response) {
            const docName = doc.name;
            if (docName) {
                const parts = docName.split('/');
                if (parts.length >= 3 && parts[0] === 'ragStores' && parts[2] === 'files') {
                    const docStoreName = `${parts[0]}/${parts[1]}`;
                    if (docStoreName === storeName) {
                        const storeDisplayName = storeMap.get(docStoreName) || parts[1];
                        documents.push({
                            ...doc,
                            storeName: docStoreName,
                            storeDisplayName: storeDisplayName,
                        });
                    }
                }
            }
        }

        res.json({ documents });
    } catch (error) {
        console.error('Error listing documents in store:', error);
        res.status(500).json({ message: 'Failed to list documents', error: error.message });
    }
};

// Upload to RAG store
exports.uploadToRagStore = async (req, res) => {
    try {
        const { storeName } = req.params;

        if (!req.file) {
            return res.status(400).json({ message: 'No file provided' });
        }

        const ai = getAI();

        let op = await ai.fileSearchStores.uploadToFileSearchStore({
            fileSearchStoreName: storeName,
            file: req.file,
            config: {
                mimeType: req.file.mimetype
            }
        });

        while (!op.done) {
            await delay(3000);
            op = await ai.operations.get({ operation: op });
        }

        res.json({ message: 'File uploaded successfully' });
    } catch (error) {
        console.error('Error uploading to RAG store:', error);
        res.status(500).json({ message: 'Failed to upload file', error: error.message });
    }
};

// Upload document with metadata
exports.uploadDocument = async (req, res) => {
    try {
        const { storeName } = req.params;
        const { metadata } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'No file provided' });
        }

        const ai = getAI();

        let op = await ai.fileSearchStores.uploadToFileSearchStore({
            fileSearchStoreName: storeName,
            file: req.file,
            config: {
                customMetadata: metadata || [],
                mimeType: req.file.mimetype,
            }
        });

        while (!op.done) {
            await delay(3000);
            op = await ai.operations.get({ operation: op });
        }

        res.json({ message: 'Document uploaded successfully' });
    } catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({ message: 'Failed to upload document', error: error.message });
    }
};

// Delete document
exports.deleteDocument = async (req, res) => {
    try {
        const { documentName } = req.params;
        const ai = getAI();

        await ai.files.delete({ name: documentName });

        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ message: 'Failed to delete document', error: error.message });
    }
};

// File search
exports.fileSearch = async (req, res) => {
    try {
        const { ragStoreName, query, language } = req.body;

        if (!ragStoreName || !query) {
            return res.status(400).json({ message: 'RAG store name and query are required' });
        }

        const supportedLanguages = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'zh': 'Chinese',
            'ja': 'Japanese',
            'ko': 'Korean',
        };

        const ai = getAI();
        const languageName = supportedLanguages[language] || 'the user\'s query language';

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `${query}\n\nIMPORTANT: Please respond in ${languageName}. DO NOT ASK THE USER TO READ THE MANUAL, pinpoint the relevant sections in the response itself.`,
            config: {
                tools: [
                    {
                        fileSearch: {
                            fileSearchStoreNames: [ragStoreName],
                        }
                    }
                ]
            }
        });

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

        res.json({
            text: response.text,
            groundingChunks: groundingChunks,
        });
    } catch (error) {
        console.error('Error performing file search:', error);
        res.status(500).json({ message: 'Failed to perform search', error: error.message });
    }
};

// Generate example questions
exports.generateExampleQuestions = async (req, res) => {
    try {
        const { ragStoreName, language } = req.body;

        if (!ragStoreName) {
            return res.status(400).json({ message: 'RAG store name is required' });
        }

        const supportedLanguages = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'zh': 'Chinese',
            'ja': 'Japanese',
            'ko': 'Korean',
        };

        const ai = getAI();
        const languageName = supportedLanguages[language] || 'English';

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are provided with Standard Operating Procedure (SOP) documents from a manufacturing environment. For each document, generate 4 short and practical example questions a user might ask about the procedures in ${languageName}. Return the questions as a JSON array of objects. Each object should have a 'product' key (representing the SOP topic, e.g., 'Machine Calibration') and a 'questions' key with an array of 4 question strings.`,
            config: {
                tools: [
                    {
                        fileSearch: {
                            fileSearchStoreNames: [ragStoreName],
                        }
                    }
                ]
            }
        });

        let jsonText = response.text.trim();
        const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);

        if (jsonMatch && jsonMatch[1]) {
            jsonText = jsonMatch[1];
        } else {
            const firstBracket = jsonText.indexOf('[');
            const lastBracket = jsonText.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
                jsonText = jsonText.substring(firstBracket, lastBracket + 1);
            }
        }

        const parsedData = JSON.parse(jsonText);
        let questions = [];

        if (Array.isArray(parsedData)) {
            if (parsedData.length > 0) {
                const firstItem = parsedData[0];
                if (typeof firstItem === 'object' && firstItem !== null && 'questions' in firstItem) {
                    questions = parsedData.flatMap(item => (item.questions || [])).filter(q => typeof q === 'string');
                } else if (typeof firstItem === 'string') {
                    questions = parsedData.filter(q => typeof q === 'string');
                }
            }
        }

        res.json({ questions });
    } catch (error) {
        console.error('Error generating example questions:', error);
        res.status(500).json({ message: 'Failed to generate questions', error: error.message, questions: [] });
    }
};

// Generate speech
exports.generateSpeech = async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ message: 'Text is required' });
        }

        const ai = getAI();

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Zephyr' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!base64Audio) {
            throw new Error("No audio data received from API.");
        }

        res.json({ audio: base64Audio });
    } catch (error) {
        console.error('Error generating speech:', error);
        res.status(500).json({ message: 'Failed to generate speech', error: error.message });
    }
};