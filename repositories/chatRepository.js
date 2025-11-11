const { supabase } = require('../config/supabase');

/**
 * Create chat message
 * @param {object} messageData - Message data
 * @returns {Promise<object>} - Created message
 */
exports.createMessage = async (messageData) => {
  try {
    const { data, error } = await supabase
      .from('chat_history')
      .insert([messageData])
      .select()
      .single();

    if (error) {
      console.error('Create message error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createMessage:', error.message);
    throw error;
  }
};

/**
 * Create multiple messages (batch insert)
 * @param {array} messages - Array of message objects
 * @returns {Promise<array>} - Created messages
 */
exports.createMessages = async (messages) => {
  try {
    const { data, error } = await supabase
      .from('chat_history')
      .insert(messages)
      .select();

    if (error) {
      console.error('Create messages error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createMessages:', error.message);
    throw error;
  }
};

/**
 * Get chat history for a document
 * @param {string} userId - User UUID
 * @param {string} documentId - Document UUID
 * @param {number} limit - Number of messages to retrieve
 * @returns {Promise<array>} - Array of messages
 */
exports.getChatHistory = async (userId, documentId, limit = 100) => {
  try {
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .eq('document_id', documentId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Get chat history error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getChatHistory:', error.message);
    throw error;
  }
};

/**
 * Get chat history with document info
 * @param {string} userId - User UUID
 * @param {string} documentId - Document UUID
 * @returns {Promise<object>} - { messages, document }
 */
exports.getChatHistoryWithDocument = async (userId, documentId) => {
  try {
    // Get messages
    const messages = await exports.getChatHistory(userId, documentId);

    // Get document info
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, file_type')
      .eq('id', documentId)
      .single();

    if (docError && docError.code !== 'PGRST116') {
      console.error('Get document error:', docError);
    }

    return {
      messages,
      document: document || null
    };
  } catch (error) {
    console.error('Error in getChatHistoryWithDocument:', error.message);
    throw error;
  }
};

/**
 * Get recent chats across all documents for a user
 * @param {string} userId - User UUID
 * @param {number} limit - Number of recent chats
 * @returns {Promise<array>} - Recent chat messages with document info
 */
exports.getRecentChats = async (userId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('recent_chats')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Get recent chats error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getRecentChats:', error.message);
    throw error;
  }
};

/**
 * Delete chat history for a document
 * @param {string} userId - User UUID
 * @param {string} documentId - Document UUID
 * @returns {Promise<boolean>} - Success
 */
exports.deleteChatHistory = async (userId, documentId) => {
  try {
    const { error } = await supabase
      .from('chat_history')
      .delete()
      .eq('user_id', userId)
      .eq('document_id', documentId);

    if (error) {
      console.error('Delete chat history error:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteChatHistory:', error.message);
    throw error;
  }
};

/**
 * Delete specific message
 * @param {string} messageId - Message UUID
 * @param {string} userId - User UUID (for permission check)
 * @returns {Promise<boolean>} - Success
 */
exports.deleteMessage = async (messageId, userId) => {
  try {
    const { error } = await supabase
      .from('chat_history')
      .delete()
      .eq('id', messageId)
      .eq('user_id', userId);

    if (error) {
      console.error('Delete message error:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteMessage:', error.message);
    throw error;
  }
};

/**
 * Get message count for a document
 * @param {string} userId - User UUID
 * @param {string} documentId - Document UUID
 * @returns {Promise<number>} - Message count
 */
exports.getMessageCount = async (userId, documentId) => {
  try {
    const { count, error } = await supabase
      .from('chat_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('document_id', documentId);

    if (error) {
      console.error('Get message count error:', error);
      throw error;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getMessageCount:', error.message);
    return 0;
  }
};

/**
 * Search chat history by content
 * @param {string} userId - User UUID
 * @param {string} searchQuery - Search text
 * @param {number} limit - Results limit
 * @returns {Promise<array>} - Matching messages
 */
exports.searchChatHistory = async (userId, searchQuery, limit = 20) => {
  try {
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .textSearch('content', searchQuery)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Search chat history error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in searchChatHistory:', error.message);
    throw error;
  }
};

/**
 * Get chat statistics for a user
 * @param {string} userId - User UUID
 * @returns {Promise<object>} - Statistics
 */
exports.getChatStats = async (userId) => {
  try {
    // Total messages
    const { count: totalMessages, error: countError } = await supabase
      .from('chat_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) throw countError;

    // Messages by language
    const { data: byLanguage, error: langError } = await supabase
      .from('chat_history')
      .select('language')
      .eq('user_id', userId);

    if (langError) throw langError;

    const languageCount = {};
    byLanguage?.forEach(msg => {
      languageCount[msg.language] = (languageCount[msg.language] || 0) + 1;
    });

    // Unique documents
    const { data: uniqueDocs, error: docsError } = await supabase
      .from('chat_history')
      .select('document_id')
      .eq('user_id', userId);

    if (docsError) throw docsError;

    const uniqueDocumentIds = [...new Set(uniqueDocs?.map(m => m.document_id))];

    return {
      totalMessages: totalMessages || 0,
      uniqueDocuments: uniqueDocumentIds.length,
      languageBreakdown: languageCount
    };
  } catch (error) {
    console.error('Error in getChatStats:', error.message);
    throw error;
  }
};

// ========================================
// Session Management (if using sessions)
// ========================================

/**
 * Create chat session
 * @param {object} sessionData - Session data
 * @returns {Promise<object>} - Created session
 */
exports.createSession = async (sessionData) => {
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) {
      console.error('Create session error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createSession:', error.message);
    throw error;
  }
};

/**
 * Get user sessions
 * @param {string} userId - User UUID
 * @returns {Promise<array>} - Array of sessions
 */
exports.getUserSessions = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Get sessions error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserSessions:', error.message);
    throw error;
  }
};

/**
 * Update session
 * @param {string} sessionId - Session UUID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} - Updated session
 */
exports.updateSession = async (sessionId, updates) => {
  try {
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('chat_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Update session error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateSession:', error.message);
    throw error;
  }
};

/**
 * Delete session
 * @param {string} sessionId - Session UUID
 * @param {string} userId - User UUID
 * @returns {Promise<boolean>} - Success
 */
exports.deleteSession = async (sessionId, userId) => {
  try {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('Delete session error:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteSession:', error.message);
    throw error;
  }
};