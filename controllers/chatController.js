const chatRepository = require('../repositories/chatRepository');
const documentRepository = require('../repositories/documentRepository');
const { searchSimilarChunks } = require('../services/embeddingService');
const { detectLanguage, getSystemPrompt, formatResponse } = require('../services/languageService');
const azureOpenAI = require('../config/azureOpenai');

/**
 * Send message and get RAG response with multilingual support
 * Documents are optional - can chat with or without document context
 */
exports.sendMessage = async (req, res) => {
  try {
    const { documentIds, message, language } = req.body;
    const userId = req.user?.id;

    console.log('User ID:', userId);
    console.log('Request body:', req.body);

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validation
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Please provide a message' });
    }

    console.log(`Chat request from user ${userId}`);
    console.log(`Documents: ${documentIds?.length || 0}, Message length: ${message.length}`);

    // Detect or use provided language
    const detectedLanguage = language || detectLanguage(message);
    console.log('Language:', detectedLanguage);

    let documents = [];
    let relevantChunks = [];
    let context = '';
    let citations = [];

    // Check if documents are provided
    const hasDocuments = documentIds && Array.isArray(documentIds) && documentIds.length > 0;

    if (hasDocuments) {
      // === WITH DOCUMENTS MODE (RAG) ===
      documents = await documentRepository.findDocumentsByIds(documentIds, userId);

      if (documents.length === 0) {
        return res.status(404).json({ error: 'No accessible documents found' });
      }

      // Check if documents are processed
      const unprocessedDocs = documents.filter(doc => doc.processing_status !== 'completed');
      if (unprocessedDocs.length > 0) {
        return res.status(400).json({
          error: 'Some documents are still processing. Please wait.',
          unprocessedDocuments: unprocessedDocs.map(d => ({
            id: d.id,
            title: d.title,
            status: d.processing_status
          }))
        });
      }

      // Retrieve relevant chunks using RAG
      console.log('Searching for similar chunks...');
      relevantChunks = await searchSimilarChunks(message, documentIds, 5);

      if (relevantChunks.length === 0) {
        return res.status(404).json({ error: 'No relevant content found in the selected documents' });
      }

      console.log(`Found ${relevantChunks.length} relevant chunks`);

      // Build context from relevant chunks
      context = relevantChunks
        .map((chunk, index) => {
          const docTitle = documents.find(d => d.id === chunk.documentId)?.title || 'Unknown';
          return `[${index + 1}] From "${docTitle}", page ${chunk.pageNumber}: "${chunk.text}"`;
        })
        .join('\n\n');

      // Extract citations
      citations = relevantChunks.map(chunk => {
        const doc = documents.find(d => d.id === chunk.documentId);
        return {
          documentId: chunk.documentId,
          documentTitle: doc?.title || 'Unknown',
          pageNumber: chunk.pageNumber,
          snippet: chunk.text.slice(0, 200) + (chunk.text.length > 200 ? '...' : ''),
          similarity: Math.round(chunk.similarity * 100) / 100
        };
      });
    }

    // Get system prompt in appropriate language
    const systemPrompt = getSystemPrompt(detectedLanguage);

    // Prepare user prompt
const systemPrompt = getSystemPrompt(detectedLanguage);

// Prepare user prompt
let userPrompt;

if (hasDocuments) {
  userPrompt = `
You are an AI assistant specialized ONLY in manufacturing, factory operations, quality control, compliance, and industrial standards.

Behavior rules:



1. If the user sends a greeting such as:

"hi", "hello", "hey", "good morning", "good evening", "good night", "good afternoon", "good noon", etc.

Then respond softly and naturally, just like you're chatting with another person.

Examples:
User: hi
Assistant: Hey! How are you doing today? How can I help you with your manufacturing questions?

User: good morning
Assistant: Good morning! Hope your day’s going well so far. What would you like to explore in manufacturing?

User: hello
Assistant: Hello! Nice to hear from you. How can I support you with manufacturing topics today?

User: good evening
Assistant: Good evening! I’m here if you need help with anything related to manufacturing.

Your tone must:
- Feel warm, friendly, and human
- Not sound robotic or formal unless the context requires it
- Keep the conversation soft and pleasant
2. If the question is outside manufacturing/compliance, gently reject it.
3. If the question is within manufacturing, answer fully based on the documents.


Context from compliance documents:
${context}

User's question: ${message}

Important:
1. Answer in ${detectedLanguage} language.
2. Always cite page numbers using: "According to page X from [Document Title]..."
3. If information spans multiple documents, cite all relevant sources.
4. Focus strictly on manufacturing compliance, safety, quality standards, and regulations.
5. Politely decline out-of-domain questions.
`;
} else {
  userPrompt = `
You are an AI assistant specialized ONLY in manufacturing, factory operations, quality control, compliance, and industrial standards.

Behavior rules:
1. If the user greets ("hi", "hello", etc.), respond softly and politely.
2. If the question is outside manufacturing/compliance, gently reject it.
3. If the question is within manufacturing, answer clearly and concisely.

User's question: ${message}

Important:
1. Answer in ${detectedLanguage} language.
2. Provide accurate and helpful manufacturing-related information.
3. If the topic is outside manufacturing, softly decline and guide user back.
`;


    }

    // ========================================================================
    // 🧩 Azure OpenAI Configuration Fixes
    // ========================================================================
    const deploymentName = "gpt-5-mini-craticai"; // ✅ Your Azure deployment name
    console.log('🔍 DEBUG INFO:');
    console.log('Deployment Name:', deploymentName);
    console.log('Using Azure OpenAI endpoint...');

    try {
      // ✅ Use deployment name as the model parameter
      const completion = await azureOpenAI.chat.completions.create({
        model: deploymentName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        
        max_completion_tokens: 2000,
       
      });

      const assistantMessage = completion.choices?.[0]?.message?.content || "No response generated.";
      const formattedResponse = formatResponse(assistantMessage, detectedLanguage);

      // Save to chat history
      const messagesToSave = [
        {
          user_id: userId,
          document_id: hasDocuments ? documentIds[0] : null,
          role: 'user',
          content: message,
          language: detectedLanguage,
          citations: JSON.stringify([]),
          metadata: JSON.stringify({
            documentIds: documentIds || [],
            allDocuments: documents.map(d => ({ id: d.id, title: d.title })),
            hasDocuments
          })
        },
        {
          user_id: userId,
          document_id: hasDocuments ? documentIds[0] : null,
          role: 'assistant',
          content: formattedResponse,
          language: detectedLanguage,
          citations: JSON.stringify(citations),
          metadata: JSON.stringify({
            model: deploymentName,
            chunkCount: relevantChunks.length,
            hasDocuments,
            tokensUsed: completion.usage?.total_tokens || 0
          })
        }
      ];

      const savedMessages = await chatRepository.createMessages(messagesToSave);

      console.log('✅ Chat completed successfully');
      console.log('📊 Tokens used:', completion.usage?.total_tokens || 0);

      return res.json({
        response: formattedResponse,
        language: detectedLanguage,
        citations,
        messageId: savedMessages[1]?.id || null,
        metadata: {
          documentsSearched: documents.length,
          chunksFound: relevantChunks.length,
          hasDocuments,
          tokensUsed: completion.usage?.total_tokens || 0,
          deploymentUsed: deploymentName
        }
      });

    } catch (azureError) {
      console.error('❌ Azure OpenAI Error Details:');
      console.error('Message:', azureError.message);
      console.error('Code:', azureError.code);
      console.error('Status:', azureError.status);

      if (azureError.message?.includes('DeploymentNotFound')) {
        return res.status(500).json({
          error: 'Azure OpenAI deployment not found',
          details: `Deployment "${deploymentName}" does not exist`,
          solution: 'Check your Azure Portal -> OpenAI Deployments and verify the name.'
        });
      }

      if (azureError.message?.includes('InvalidModel')) {
        return res.status(500).json({
          error: 'Invalid Azure OpenAI model',
          details: 'You must use the deployment name, not the model base name.',
          solution: 'Update your model field to use the deployment name.'
        });
      }

      if (azureError.code === 'InvalidAPIKey') {
        return res.status(401).json({
          error: 'Azure OpenAI authentication failed',
          details: 'Invalid or expired API key',
          solution: 'Verify your Azure OpenAI API key'
        });
      }

      if (azureError.code === 'RateLimitReached') {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          details: 'Too many requests to Azure OpenAI',
          solution: 'Wait a moment and try again'
        });
      }

      throw azureError;
    }

  } catch (error) {
    console.error('❌ Chat error:', error);
    res.status(500).json({ error: error.message, type: error.constructor.name });
  }
};

/**
 * Get chat history for a document
 */
exports.getChatHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });

    const { documentId } = req.params;
    if (!documentId) return res.status(400).json({ error: 'Document ID is required' });

    const { messages = [], document } = await chatRepository.getChatHistoryWithDocument(userId, documentId);

    const formattedMessages = messages.map(msg => ({
      id: msg?.id || null,
      role: msg?.role || 'unknown',
      content: msg?.content || '',
      language: msg?.language || 'en',
      citations: typeof msg?.citations === 'string' ? JSON.parse(msg.citations) : msg?.citations || [],
      metadata: typeof msg?.metadata === 'string' ? JSON.parse(msg.metadata) : msg?.metadata || {},
      createdAt: msg?.created_at || null
    }));

    res.json({
      messages: formattedMessages,
      document: document ? { id: document.id, title: document.title, fileType: document.file_type } : null,
      totalMessages: formattedMessages.length
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get recent chats across all documents
 */
exports.getRecentChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const recentChats = await chatRepository.getRecentChats(userId, limit);

    const formattedChats = recentChats.map(chat => ({
      id: chat.id,
      role: chat.role,
      content: chat.content.substring(0, 200) + (chat.content.length > 200 ? '...' : ''),
      language: chat.language,
      documentId: chat.document_id,
      documentTitle: chat.document_title,
      fileType: chat.file_type,
      createdAt: chat.created_at
    }));

    res.json({ chats: formattedChats, total: formattedChats.length });
  } catch (error) {
    console.error('Get recent chats error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Clear chat history for a document
 */
exports.clearChatHistory = async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;
    await chatRepository.deleteChatHistory(userId, documentId);
    res.json({ message: 'Chat history cleared successfully' });
  } catch (error) {
    console.error('Clear chat history error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete specific message
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    await chatRepository.deleteMessage(messageId, userId);
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Search chat history
 */
exports.searchChatHistory = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const results = await chatRepository.searchChatHistory(userId, query, limit);

    const formattedResults = results.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      language: msg.language,
      documentId: msg.document_id,
      createdAt: msg.created_at
    }));

    res.json({ results: formattedResults, total: formattedResults.length, query });
  } catch (error) {
    console.error('Search chat error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get chat statistics
 */
exports.getChatStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await chatRepository.getChatStats(userId);

    res.json({
      stats: {
        totalMessages: stats.totalMessages,
        uniqueDocuments: stats.uniqueDocuments,
        languageBreakdown: stats.languageBreakdown,
        mostUsedLanguage:
          Object.entries(stats.languageBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || 'en'
      }
    });
  } catch (error) {
    console.error('Get chat stats error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get supported languages
 */
exports.getSupportedLanguages = async (req, res) => {
  try {
    const { getSupportedLanguages } = require('../services/languageService');
    const languages = getSupportedLanguages();
    res.json({ languages });
  } catch (error) {
    console.error('Get languages error:', error);
    res.status(500).json({ error: error.message });
  }
};

