const azureOpenAI = require('../config/azureOpenai');
const { supabase } = require('../config/supabase');

/**
 * Generate embedding using Azure OpenAI text-embedding-3-small
 * @param {string} text - Text to embed
 * @returns {Promise<array>} - Embedding vector (1536 dimensions for text-embedding-3-small)
 */
const generateEmbedding = async (text) => {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    const deploymentName = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME || "text-embedding-3-small";

    const embeddings = await azureOpenAI.getEmbeddings(
      deploymentName,
      [text.trim()]
    );

    return embeddings.data[0].embedding;
  } catch (error) {
    console.error('Azure OpenAI embedding error:', error.message);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
};

/**
 * Store document chunks with embeddings
 * @param {string} documentId - Document UUID
 * @param {array} chunks - Array of {text, pageNumber, language}
 * @returns {Promise<number>} - Number of chunks stored
 */
const storeChunksWithEmbeddings = async (documentId, chunks) => {
  try {
    console.log(`Storing ${chunks.length} chunks for document ${documentId}...`);

    const chunksWithEmbeddings = [];
    let processedCount = 0;

    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      const batchPromises = batch.map(async (chunk, batchIndex) => {
        try {
          const embedding = await generateEmbedding(chunk.text);

          processedCount++;
          if (processedCount % 10 === 0) {
            console.log(`Processed ${processedCount}/${chunks.length} embeddings`);
          }

          return {
            document_id: documentId,
            text: chunk.text,
            page_number: chunk.pageNumber,
            chunk_index: i + batchIndex,
            embedding: JSON.stringify(embedding),
            language: chunk.language || 'en'
          };
        } catch (error) {
          console.error(`Error generating embedding for chunk ${i + batchIndex}:`, error.message);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      chunksWithEmbeddings.push(...batchResults.filter(r => r !== null));

      // Small delay between batches
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (chunksWithEmbeddings.length === 0) {
      throw new Error('Failed to generate any embeddings');
    }

    // Insert chunks into Supabase
    const { data, error } = await supabase
      .from('document_chunks')
      .insert(chunksWithEmbeddings);

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    console.log(`✅ Stored ${chunksWithEmbeddings.length} chunks with embeddings`);
    return chunksWithEmbeddings.length;

  } catch (error) {
    console.error('Error storing chunks:', error.message);
    throw error;
  }
};

/**
 * Search for similar chunks using vector similarity (pgvector)
 * @param {string} query - Search query
 * @param {array} documentIds - Array of document UUIDs to search within
 * @param {number} topK - Number of top results to return
 * @returns {Promise<array>} - Array of similar chunks with similarity scores
 */
const searchSimilarChunks = async (query, documentIds, topK = 5) => {
  try {
    console.log(`Searching for similar chunks in ${documentIds.length} documents...`);

    // Generate embedding for query using Azure OpenAI
    const queryEmbedding = await generateEmbedding(query);

    // Use Supabase RPC function for vector search
    const { data, error } = await supabase.rpc('search_similar_chunks', {
      query_embedding: JSON.stringify(queryEmbedding),
      document_ids: documentIds,
      result_limit: topK
    });

    if (error) {
      console.error('Vector search error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('No similar chunks found');
      return [];
    }

    console.log(`Found ${data.length} similar chunks`);

    // Format results
    return data.map(chunk => ({
      chunkId: chunk.chunk_id,
      documentId: chunk.document_id,
      text: chunk.text,
      pageNumber: chunk.page_number,
      similarity: chunk.similarity,
      language: chunk.language
    }));

  } catch (error) {
    console.error('Error searching similar chunks:', error.message);
    throw error;
  }
};

/**
 * Alternative: Manual cosine similarity search (if RPC function not available)
 * @param {string} query - Search query
 * @param {array} documentIds - Array of document UUIDs
 * @param {number} topK - Number of results
 * @returns {Promise<array>} - Similar chunks
 */
const searchSimilarChunksManual = async (query, documentIds, topK = 5) => {
  try {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Get all chunks from specified documents
    const { data: chunks, error } = await supabase
      .from('document_chunks')
      .select('*')
      .in('document_id', documentIds)
      .not('embedding', 'is', null);

    if (error) throw error;

    if (!chunks || chunks.length === 0) {
      return [];
    }

    // Calculate similarity for each chunk
    const chunksWithSimilarity = chunks.map(chunk => {
      const chunkEmbedding = JSON.parse(chunk.embedding);
      const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);

      return {
        chunkId: chunk.id,
        documentId: chunk.document_id,
        text: chunk.text,
        pageNumber: chunk.page_number,
        similarity,
        language: chunk.language
      };
    });

    // Sort by similarity (descending) and return top K
    chunksWithSimilarity.sort((a, b) => b.similarity - a.similarity);
    return chunksWithSimilarity.slice(0, topK);

  } catch (error) {
    console.error('Manual search error:', error.message);
    throw error;
  }
};

/**
 * Calculate cosine similarity between two vectors
 * @param {array} vecA - First vector
 * @param {array} vecB - Second vector
 * @returns {number} - Similarity score (0 to 1)
 */
const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
};

/**
 * Delete all chunks for a document
 * @param {string} documentId - Document UUID
 * @returns {Promise<void>}
 */
const deleteDocumentChunks = async (documentId) => {
  try {
    const { error } = await supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId);

    if (error) throw error;

    console.log(`✅ Deleted chunks for document ${documentId}`);
  } catch (error) {
    console.error('Error deleting chunks:', error.message);
    throw error;
  }
};

/**
 * Get chunk count for a document
 * @param {string} documentId - Document UUID
 * @returns {Promise<number>} - Number of chunks
 */
const getChunkCount = async (documentId) => {
  try {
    const { count, error } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', documentId);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Error getting chunk count:', error.message);
    return 0;
  }
};

module.exports = {
  generateEmbedding,
  storeChunksWithEmbeddings,
  searchSimilarChunks,
  searchSimilarChunksManual,
  cosineSimilarity,
  deleteDocumentChunks,
  getChunkCount
};