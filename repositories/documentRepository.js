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
 * Upload file to GCS and store link in Firestore
 */
exports.uploadDocument = async (userEmail, file, metadata) => {
  console.log('\n================================');
  console.log('📤 uploadDocument');
  console.log('================================');
  console.log('User:', userEmail);
  console.log('File:', file.originalname);
  console.log('Size:', file.size, 'bytes');

  try {
    const timestamp = Date.now();
    const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
    const gcsFileName = `${sanitizedEmail}/${timestamp}_${file.originalname}`;
    
    console.log('📁 GCS path:', gcsFileName);

    // Upload to GCS
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
await fileUpload.makePublic();
    // Generate signed URL (7 days validity)
    const [signedUrl] = await fileUpload.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000
    });

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFileName}`;

    // Save to Firestore
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

    const docRef = await db.collection('users')
      .doc(userEmail)
      .collection('documents')
      .add(docData);

    console.log('✅ Document saved to Firestore');
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
    console.error('================================\n');
    throw error;
  }
};

/**
 * List all documents for user
 */
// exports.listUserDocuments = async (userEmail) => {
//   console.log('\n================================');
//   console.log('📋 listUserDocuments');
//   console.log('================================');
//   console.log('User:', userEmail);

//   try {
//     const snapshot = await db.collection('users')
//       .doc(userEmail)
//       .collection('documents')
//       .where('status', '==', 'active')
//       .orderBy('uploadedAt', 'desc')
//       .get();

//     const documents = [];
//     snapshot.forEach(doc => {
//       documents.push({
//         id: doc.id,
//         ...doc.data()
//       });
//     });

//     console.log(`✅ Found ${documents.length} documents`);
//     console.log('================================\n');

//     return documents;
//   } catch (error) {
//     console.error('❌ Error listing documents:', error);
//     throw error;
//   }
// };

/**
 * List all documents for a user
 */

/**
 * List all active documents for a user
 */
exports.listUserDocuments = async (userEmail) => {  // ← ADD 'async' HERE!
  console.log('\n================================');
  console.log('📋 listUserDocuments');
  console.log('================================');
  console.log('User:', userEmail);
  
  try {
    // Query without orderBy to avoid index requirement
    const snapshot = await db.collection('users')
      .doc(userEmail)
      .collection('documents')
      .where('status', '==', 'active')
      .get();
    
    const documents = [];
    
    // Process each document with for...of loop
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      try {
        // Generate fresh signed URL (7-day validity)
        const file = bucket.file(data.gcsPath);
        const [signedUrl] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        
        documents.push({
          id: doc.id,
          fileName: data.fileName,
          gcsPath: data.gcsPath,
          gcsSignedUrl: signedUrl,
          gcsPublicUrl: data.gcsPublicUrl || null,
          mimeType: data.mimeType,
          fileSize: data.fileSize,
          version: data.version,
          notes: data.notes,
          department: data.department,
          documentType: data.documentType,
          uploadedAt: data.uploadedAt,
          status: data.status
        });

     
      } catch (urlError) {
        console.error(`⚠️ Error generating signed URL for ${data.fileName}:`, urlError.message);
        // Skip this document if URL generation fails
      }
    }
    
    // Sort in JavaScript (newest first)
    documents.sort((a, b) => {
      const dateA = new Date(a.uploadedAt || 0);
      const dateB = new Date(b.uploadedAt || 0);
      return dateB - dateA;
    });
    
    console.log(`✅ Found ${documents.length} documents`);
    console.log('================================\n');
    
    return documents;
    
  } catch (error) {
    console.error('❌ Error listing documents:', error);
    console.error('Stack:', error.stack);
    throw error;
  }
};
/**
 * Get single document
 */
exports.getDocument = async (userEmail, documentId) => {
  console.log('\n================================');
  console.log('📄 getDocument');
  console.log('================================');

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
    console.error('❌ Error getting document:', error);
    throw error;
  }
};

/**
 * Update document metadata
 */
exports.updateDocument = async (userEmail, documentId, updates) => {
  console.log('\n================================');
  console.log('📝 updateDocument');
  console.log('================================');

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
    console.error('❌ Error updating document:', error);
    throw error;
  }
};

/**
 * Delete document (soft delete)
 */
exports.deleteDocument = async (userEmail, documentId) => {
  console.log('\n================================');
  console.log('🗑️  deleteDocument');
  console.log('================================');

  try {
    const docRef = db.collection('users')
      .doc(userEmail)
      .collection('documents')
      .doc(documentId);

    const doc = await docRef.get();
    
    if (!doc.exists) {
      throw new Error('Document not found');
    }

    const docData = doc.data();

    // Delete from GCS
    try {
      await bucket.file(docData.gcsPath).delete();
      console.log('✅ File deleted from GCS');
    } catch (gcsError) {
      console.warn('⚠️  Could not delete from GCS:', gcsError.message);
    }

    // Soft delete in Firestore
    await docRef.update({
      status: 'deleted',
      deletedAt: new Date().toISOString()
    });

    console.log('✅ Document deleted');
    console.log('================================\n');

  } catch (error) {
    console.error('❌ Error deleting document:', error);
    throw error;
  }
};
