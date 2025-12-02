// controllers/gemini.controller.optimized.js
const { getAI } = require('../config/gemini');
const cache = require('../utils/cache');
const asyncHandler = require('../middlewares/asyncHandler');

// ============================================
// OPTIMIZED: List RAG Stores with Caching
// ============================================
exports.listRagStores = asyncHandler(async (req, res) => {
    const cacheKey = 'rag_stores_list';

    const stores = await cache.wrap(cacheKey, async () => {
        const ai = getAI();
        const response = await ai.fileSearchStores.list();
        const storesList = [];

        for await (const store of response) {
            if (store.name && store.displayName) {
                storesList.push({ name: store.name, displayName: store.displayName });
            }
        }

        return storesList;
    }, 300); // Cache for 5 minutes

    res.json({ stores });
});

// ============================================
// OPTIMIZED: Create RAG Store
// ============================================
// controllers/geminiController.js




exports.createRagStore = async (req, res, next) => {
    try {
        const { displayName } = req.body;

        if (!displayName) {
            return res.status(400).json({ message: 'Display name is required' });
        }

        console.log('🔍 Getting AI instance...');
        const ai = getAI();

        console.log('🔍 AI instance:', {
            hasFileSearchStores: !!ai.fileSearchStores,
            aiType: typeof ai,
            aiKeys: Object.keys(ai)
        });

        if (!ai.fileSearchStores) {
            throw new Error('fileSearchStores is not available on AI instance');
        }

        console.log('📝 Creating RAG store with displayName:', displayName);
        const ragStore = await ai.fileSearchStores.create({
            config: { displayName }
        });

        if (!ragStore.name) {
            throw new Error("Failed to create RAG store: name is missing.");
        }

        console.log('✅ RAG store created:', ragStore.name);
        res.json({ name: ragStore.name });

    } catch (error) {
        console.error('❌ Error in createRagStore:', error);
        next(error);
    }
};

// ============================================
// OPTIMIZED: Delete RAG Store
// ============================================
exports.deleteRagStore = asyncHandler(async (req, res) => {
    const { storeName } = req.params;
    const ai = getAI();

    await ai.fileSearchStores.delete({
        name: storeName,
        config: { force: true },
    });

    // Invalidate cache
    await cache.del('rag_stores_list');
    await cache.del(`documents_${storeName}`);

    res.json({ message: 'RAG store deleted successfully' });
});

// ============================================
// OPTIMIZED: List All Documents with Caching
// ============================================
exports.listAllDocuments = asyncHandler(async (req, res) => {
    const cacheKey = 'all_documents_list';

    const documents = await cache.wrap(cacheKey, async () => {
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
        const documentsList = [];

        for await (const doc of response) {
            const docName = doc.name;
            if (docName) {
                const parts = docName.split('/');
                if (parts.length >= 3 && parts[0] === 'ragStores' && parts[2] === 'files') {
                    const storeName = `${parts[0]}/${parts[1]}`;
                    const storeDisplayName = storeMap.get(storeName) || parts[1];
                    documentsList.push({
                        ...doc,
                        storeName: storeName,
                        storeDisplayName: storeDisplayName,
                    });
                }
            }
        }

        return documentsList;
    }, 180); // Cache for 3 minutes

    res.json({ documents });
});

// ============================================
// OPTIMIZED: List Documents in Store with Caching
// ============================================
exports.listDocumentsInStore = asyncHandler(async (req, res) => {
    const { storeName } = req.params;
    const cacheKey = `documents_${storeName}`;

    const documents = await cache.wrap(cacheKey, async () => {
        const ai = getAI();

        const storesResponse = await ai.fileSearchStores.list();
        const storeMap = new Map();

        for await (const store of storesResponse) {
            if (store.name && store.displayName) {
                storeMap.set(store.name, store.displayName);
            }
        }

        const response = await ai.files.list();
        const documentsList = [];

        for await (const doc of response) {
            const docName = doc.name;
            if (docName) {
                const parts = docName.split('/');
                if (parts.length >= 3 && parts[0] === 'ragStores' && parts[2] === 'files') {
                    const docStoreName = `${parts[0]}/${parts[1]}`;
                    if (docStoreName === storeName) {
                        const storeDisplayName = storeMap.get(docStoreName) || parts[1];
                        documentsList.push({
                            ...doc,
                            storeName: docStoreName,
                            storeDisplayName: storeDisplayName,
                        });
                    }
                }
            }
        }

        return documentsList;
    }, 180); // Cache for 3 minutes

    res.json({ documents });
});

// ============================================
// 🔥 CRITICAL FIX: ASYNC Upload (No Blocking!)
// ============================================
exports.uploadToRagStore = asyncHandler(async (req, res) => {
    const { storeName } = req.params;

    if (!req.file) {
        return res.status(400).json({ message: 'No file provided' });
    }

    const ai = getAI();

    // Start upload operation (don't wait!)
    const op = await ai.fileSearchStores.uploadToFileSearchStore({
        fileSearchStoreName: storeName,
        file: req.file,
        config: {
            mimeType: req.file.mimetype
        }
    });

    // Invalidate cache immediately
    await cache.del(`documents_${storeName}`);
    await cache.del('all_documents_list');

    // Return immediately with operation ID
    // Let the upload continue in background
    res.json({
        message: 'File upload started successfully',
        operationId: op.name,
        status: 'processing',
        info: 'File is being processed. Check back in a few moments.'
    });

    // Optional: Poll in background (non-blocking for user)
    pollOperation(op, storeName).catch(err => {
        console.error('Background upload failed:', err);
    });
});

// ============================================
// 🔥 CRITICAL FIX: ASYNC Upload with Metadata
// ============================================
exports.uploadDocument = asyncHandler(async (req, res) => {
    const { storeName } = req.params;
    const { metadata } = req.body;

    if (!req.file) {
        return res.status(400).json({ message: 'No file provided' });
    }

    const ai = getAI();

    const op = await ai.fileSearchStores.uploadToFileSearchStore({
        fileSearchStoreName: storeName,
        file: req.file,
        config: {
            customMetadata: metadata || [],
            mimeType: req.file.mimetype,
        }
    });

    // Invalidate cache
    await cache.del(`documents_${storeName}`);
    await cache.del('all_documents_list');

    res.json({
        message: 'Document upload started successfully',
        operationId: op.name,
        status: 'processing'
    });

    // Poll in background
    pollOperation(op, storeName).catch(err => {
        console.error('Background upload failed:', err);
    });
});

// ============================================
// Background Polling Helper (Non-blocking)
// ============================================
async function pollOperation(operation, storeName, maxRetries = 20) {
    const ai = getAI();
    let op = operation;
    let retries = 0;

    while (!op.done && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        try {
            op = await ai.operations.get({ operation: op });
            retries++;
        } catch (error) {
            console.error('Polling error:', error);
            break;
        }
    }

    if (op.done) {
        console.log(`✅ Upload completed for store: ${storeName}`);
        // Invalidate cache after completion
        await cache.del(`documents_${storeName}`);
        await cache.del('all_documents_list');
    } else {
        console.log(`⚠️  Upload may still be processing for store: ${storeName}`);
    }
}

// ============================================
// OPTIMIZED: Delete Document
// ============================================
exports.deleteDocument = asyncHandler(async (req, res) => {
    const { documentName } = req.params;
    const ai = getAI();

    await ai.files.delete({ name: documentName });

    // Invalidate cache
    await cache.del('all_documents_list');
    const parts = documentName.split('/');
    if (parts.length >= 3) {
        const storeName = `${parts[0]}/${parts[1]}`;
        await cache.del(`documents_${storeName}`);
    }

    res.json({ message: 'Document deleted successfully' });
});

// ============================================
// OPTIMIZED: File Search with Caching
// ============================================
exports.fileSearch = asyncHandler(async (req, res) => {
    const { ragStoreName, query, language } = req.body;

    if (!ragStoreName || !query) {
        return res.status(400).json({ message: 'RAG store name and query are required' });
    }

    // Cache search results for identical queries
    const cacheKey = `search_${ragStoreName}_${query}_${language || 'en'}`;

    const result = await cache.wrap(cacheKey, async () => {
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

        return {
            text: response.text,
            groundingChunks: groundingChunks,
        };
    }, 600); // Cache searches for 10 minutes

    res.json(result);
});

// ============================================
// OPTIMIZED: Generate Example Questions with Caching
// ============================================
exports.generateExampleQuestions = asyncHandler(async (req, res) => {
    const { ragStoreName, language } = req.body;

    if (!ragStoreName) {
        return res.status(400).json({ message: 'RAG store name is required' });
    }

    const cacheKey = `questions_${ragStoreName}_${language || 'en'}`;

    const questions = await cache.wrap(cacheKey, async () => {
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
        let questionsList = [];

        if (Array.isArray(parsedData)) {
            if (parsedData.length > 0) {
                const firstItem = parsedData[0];
                if (typeof firstItem === 'object' && firstItem !== null && 'questions' in firstItem) {
                    questionsList = parsedData.flatMap(item => (item.questions || [])).filter(q => typeof q === 'string');
                } else if (typeof firstItem === 'string') {
                    questionsList = parsedData.filter(q => typeof q === 'string');
                }
            }
        }

        return questionsList;
    }, 1800); // Cache for 30 minutes

    res.json({ questions });
});

// ============================================
// Text-to-Speech (No caching - audio is unique)
// ============================================
exports.generateSpeech = asyncHandler(async (req, res) => {
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
});