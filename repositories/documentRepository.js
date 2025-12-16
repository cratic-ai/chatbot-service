// const { supabase } = require('../config/supabase');

// /**
//  * Create a new document record
//  * @param {object} documentData - Document data
//  * @returns {Promise<object>} - Created document
//  */

// exports.createDocument = async (documentData) => {
//   try {
//     console.log("📤 Inserting document to Supabase:", documentData);

//     const { data, error } = await supabase
//       .from('documents')
//       .insert([documentData])
//       .select()
//       .single();

//     if (error) {
//       console.error('Create document error:', error);
//       throw error;
//     }

//     return data;
//   } catch (error) {
//     console.error('❌ Error in createDocument:', error);
//     throw error;
//   }
// };
// // repositories/documentRepository.js

// exports.getPendingDocuments = async () => {
//   const { data, error } = await supabase
//     .from('documents')
//     .select('*')
//     .eq('processing_status', 'pending')
//     .order('uploaded_at', { ascending: true })
//     .limit(10);

//   if (error) throw error;
//   return data || [];
// };
// /**
//  * Get all documents for a user
//  * @param {string} userId - User UUID
//  * @returns {Promise<array>} - Array of documents
//  */
// exports.getAllDocuments = async (userId) => {
//   try {
//     const { data, error } = await supabase
//       .from('documents')
//       .select('*')
//       .or(`user_id.eq.${userId},is_seeded.eq.true`)
//       .order('uploaded_at', { ascending: false });

//     if (error) {
//       console.error('Get documents error:', error);
//       throw error;
//     }

//     return data || [];
//   } catch (error) {
//     console.error('Error in getAllDocuments:', error.message);
//     throw error;
//   }
// };

// /**
//  * Get document by ID
//  * @param {string} documentId - Document UUID
//  * @param {string} userId - User UUID (for permission check)
//  * @returns {Promise<object>} - Document or null
//  */
// exports.getDocumentById = async (documentId, userId) => {
//   try {
//     const { data, error } = await supabase
//       .from('documents')
//       .select('*')
//       .eq('id', documentId)
//       .or(`user_id.eq.${userId},is_seeded.eq.true`)
//       .single();

//     if (error) {
//       if (error.code === 'PGRST116') {
//         // No rows found
//         return null;
//       }
//       console.error('Get document error:', error);
//       throw error;
//     }

//     return data;
//   } catch (error) {
//     console.error('Error in getDocumentById:', error.message);
//     throw error;
//   }
// };

// /**
//  * Update document
//  * @param {string} documentId - Document UUID
//  * @param {object} updates - Fields to update
//  * @returns {Promise<object>} - Updated document
//  */
// exports.updateDocument = async (documentId, updates) => {
//   try {
//     const { data, error } = await supabase
//       .from('documents')
//       .update(updates)
//       .eq('id', documentId)
//       .select()
//       .single();

//     if (error) {
//       console.error('Update document error:', error);
//       throw error;
//     }

//     return data;
//   } catch (error) {
//     console.error('Error in updateDocument:', error.message);
//     throw error;
//   }
// };

// /**
//  * Delete document
//  * @param {string} documentId - Document UUID
//  * @param {string} userId - User UUID (for permission check)
//  * @returns {Promise<boolean>} - Success
//  */
// exports.deleteDocument = async (documentId, userId) => {
//   try {
//     const { error } = await supabase
//       .from('documents')
//       .delete()
//       .eq('id', documentId)
//       .eq('user_id', userId);

//     if (error) {
//       console.error('Delete document error:', error);
//       throw error;
//     }

//     return true;
//   } catch (error) {
//     console.error('Error in deleteDocument:', error.message);
//     throw error;
//   }
// };

// /**
//  * Find documents by IDs (for batch operations)
//  * @param {array} documentIds - Array of document UUIDs
//  * @param {string} userId - User UUID
//  * @returns {Promise<array>} - Array of documents
//  */
// exports.findDocumentsByIds = async (documentIds, userId) => {
//   try {
//     const { data, error } = await supabase
//       .from('documents')
//       .select('*')
//       .in('id', documentIds)
//       .or(`user_id.eq.${userId},is_seeded.eq.true`);

//     if (error) {
//       console.error('Find documents error:', error);
//       throw error;
//     }

//     return data || [];
//   } catch (error) {
//     console.error('Error in findDocumentsByIds:', error.message);
//     throw error;
//   }
// };

// /**
//  * Update processing status
//  * @param {string} documentId - Document UUID
//  * @param {string} status - Status: 'pending', 'processing', 'completed', 'failed'
//  * @param {string} error - Error message (if failed)
//  * @returns {Promise<object>} - Updated document
//  */
// exports.updateProcessingStatus = async (documentId, status, error = null) => {
//   try {
//     const updates = {
//       processing_status: status,
//       processing_error: error
//     };

//     if (status === 'completed') {
//       updates.processed_at = new Date().toISOString();
//     }

//     return await exports.updateDocument(documentId, updates);
//   } catch (error) {
//     console.error('Error updating processing status:', error.message);
//     throw error;
//   }
// };

// /**
//  * Get documents with chunk statistics
//  * @param {string} userId - User UUID
//  * @returns {Promise<array>} - Documents with chunk counts
//  */
// exports.getDocumentsWithStats = async (userId) => {
//   try {
//     const { data, error } = await supabase
//       .from('documents_with_stats')
//       .select('*')
//       .or(`user_id.eq.${userId},is_seeded.eq.true`)
//       .order('uploaded_at', { ascending: false });

//     if (error) {
//       console.error('Get documents with stats error:', error);
//       throw error;
//     }

//     return data || [];
//   } catch (error) {
//     console.error('Error in getDocumentsWithStats:', error.message);
//     throw error;
//   }
// };




const { db, bucket } = require('../config/firebase');

console.log('================================');
console.log('📄 documentRepository.js LOADING');
console.log('================================');
console.log('Storage bucket available:', !!bucket);
console.log('================================\n');

/**
 * Upload file to GCS and store link in Firestore under user
 * @param {string} userEmail - User's email
 * @param {Object} file - File object with buffer
 * @param {Object} metadata - Document metadata
 * @returns {Object} Document data with GCS link
 */
exports.uploadDocument = async (userEmail, file, metadata) => {
  console.log('\n================================');
  console.log('📤 uploadDocument');
  console.log('================================');
  console.log('User:', userEmail);
  console.log('File:', file.originalname);
  console.log('Size:', file.size, 'bytes');
  console.log('Metadata:', metadata);

  try {
    // Create unique filename with timestamp
    const timestamp = Date.now();
    const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
    const gcsFileName = `${sanitizedEmail}/${timestamp}_${file.originalname}`;
    
    console.log('📁 GCS path:', gcsFileName);

    // Upload file to GCS
    const fileUpload = bucket.file(gcsFileName);
    
    await fileUpload.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        metadata: {
          uploadedBy: userEmail,
          originalName: file.originalname,
          uploadTimestamp: timestamp.toString(),
          ...metadata
        }
      }
    });

    console.log('✅ File uploaded to GCS');

    // Generate signed URL (valid for 7 days)
    const [signedUrl] = await fileUpload.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Public URL (if bucket is public)
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFileName}`;

    console.log('📎 File URL generated');

    // Store document metadata in Firestore under user
    const docData = {
      fileName: file.originalname,
      gcsPath: gcsFileName,
      gcsSignedUrl: signedUrl,
      gcsPublicUrl: publicUrl,
      mimeType: file.mimetype,
      fileSize: file.size,
      userEmail: userEmail,
      version: metadata.version || 'N/A',
      notes: metadata.notes || '',
      department: metadata.department || '',
      documentType: metadata.documentType || '',
      uploadedAt: new Date().toISOString(),
      status: 'active'
    };

    // Add custom metadata if provided
    if (metadata.customMetadata) {
      docData.customMetadata = metadata.customMetadata;
    }

    const docRef = await db.collection('users')
      .doc(userEmail)
      .collection('documents')
      .add(docData);

    console.log('✅ Document metadata saved to Firestore');
    console.log('Document ID:', docRef.id);
    console.log('================================\n');

    return {
      id: docRef.id,
      ...docData
    };

  } catch (error) {
    console.error('\n================================');
    console.error('❌ Error in uploadDocument');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('================================\n');
    throw error;
  }
};

/**
 * List all documents for a user
 * @param {string} userEmail - User's email
 * @returns {Array} List of documents
 */
exports.listUserDocuments = async (userEmail) => {
  console.log('\n================================');
  console.log('📋 listUserDocuments');
  console.log('================================');
  console.log('User:', userEmail);

  try {
    const snapshot = await db.collection('users')
      .doc(userEmail)
      .collection('documents')
      .where('status', '==', 'active')
      .orderBy('uploadedAt', 'desc')
      .get();

    const documents = [];
    snapshot.forEach(doc => {
      documents.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`✅ Found ${documents.length} documents`);
    console.log('================================\n');

    return documents;
  } catch (error) {
    console.error('\n================================');
    console.error('❌ Error in listUserDocuments');
    console.error('Error:', error.message);
    console.error('================================\n');
    throw error;
  }
};

/**
 * Get single document
 * @param {string} userEmail - User's email
 * @param {string} documentId - Document ID
 * @returns {Object} Document data
 */
exports.getDocument = async (userEmail, documentId) => {
  console.log('\n================================');
  console.log('📄 getDocument');
  console.log('================================');
  console.log('User:', userEmail);
  console.log('Document ID:', documentId);

  try {
    const doc = await db.collection('users')
      .doc(userEmail)
      .collection('documents')
      .doc(documentId)
      .get();

    if (!doc.exists) {
      throw new Error('Document not found');
    }

    console.log('✅ Document found');
    console.log('================================\n');

    return {
      id: doc.id,
      ...doc.data()
    };
  } catch (error) {
    console.error('\n================================');
    console.error('❌ Error in getDocument');
    console.error('Error:', error.message);
    console.error('================================\n');
    throw error;
  }
};

/**
 * Update document metadata
 * @param {string} userEmail - User's email
 * @param {string} documentId - Document ID
 * @param {Object} updates - Fields to update
 */
exports.updateDocument = async (userEmail, documentId, updates) => {
  console.log('\n================================');
  console.log('📝 updateDocument');
  console.log('================================');
  console.log('User:', userEmail);
  console.log('Document ID:', documentId);
  console.log('Updates:', updates);

  try {
    await db.collection('users')
      .doc(userEmail)
      .collection('documents')
      .doc(documentId)
      .update({
        ...updates,
        updatedAt: new Date().toISOString()
      });

    console.log('✅ Document updated');
    console.log('================================\n');
  } catch (error) {
    console.error('\n================================');
    console.error('❌ Error in updateDocument');
    console.error('Error:', error.message);
    console.error('================================\n');
    throw error;
  }
};

/**
 * Delete document from GCS and Firestore
 * @param {string} userEmail - User's email
 * @param {string} documentId - Document ID
 */
exports.deleteDocument = async (userEmail, documentId) => {
  console.log('\n================================');
  console.log('🗑️  deleteDocument');
  console.log('================================');
  console.log('User:', userEmail);
  console.log('Document ID:', documentId);

  try {
    // Get document metadata
    const docRef = db.collection('users')
      .doc(userEmail)
      .collection('documents')
      .doc(documentId);

    const doc = await docRef.get();
    
    if (!doc.exists) {
      throw new Error('Document not found');
    }

    const docData = doc.data();

    // Delete file from GCS
    try {
      await bucket.file(docData.gcsPath).delete();
      console.log('✅ File deleted from GCS');
    } catch (gcsError) {
      console.warn('⚠️  Could not delete from GCS:', gcsError.message);
      // Continue anyway - file might already be deleted
    }

    // Mark as deleted in Firestore (soft delete)
    await docRef.update({
      status: 'deleted',
      deletedAt: new Date().toISOString()
    });

    console.log('✅ Document marked as deleted in Firestore');
    console.log('================================\n');

  } catch (error) {
    console.error('\n================================');
    console.error('❌ Error in deleteDocument');
    console.error('Error:', error.message);
    console.error('================================\n');
    throw error;
  }
};
