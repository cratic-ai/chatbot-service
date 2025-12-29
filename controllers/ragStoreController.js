const { db } = require('../config/firebase');

console.log('================================');
console.log('🗄️  ragStoreController.js LOADING');
console.log('================================\n');

/**
 * Get RAG store information for authenticated user
 * GET /api/ragstore
 */
exports.getRagStore = async (req, res) => {
  console.log('\n================================');
  console.log('📋 GET /api/ragstore');
  console.log('================================');
  console.log('User:', req.user?.email);
  console.log('Is Admin:', req.user?.isAdmin);
  
  try {
    // Check authentication
    if (!req.user || !req.user.email) {
      console.log('❌ User not authenticated');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const collection = req.user.isAdmin ? 'users' : 'subUsers';
    const userDoc = await db.collection(collection).doc(req.user.email).get();
    
    if (!userDoc.exists) {
      console.log('❌ User document not found');
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const userData = userDoc.data();
    const displayName = userData.ragStoreDisplayName || null;
    const geminiName = userData.ragStoreGeminiName || null;
    
    console.log('📝 Display Name:', displayName);
    console.log('🔑 Gemini Name:', geminiName);
    console.log('✅ RAG store info retrieved');
    console.log('================================\n');
    
    res.json({
      success: true,
      ragStore: {
        displayName: displayName,           // User-friendly (e.g., "johnsragstore")
        geminiName: geminiName,             // Actual Gemini name (e.g., "fileSearchStores/abc-123")
        needsCreation: !geminiName          // True if Gemini store not created yet
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting RAG store:', error.message);
    console.error(error.stack);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get RAG store',
      message: error.message
    });
  }
};

/**
 * Save RAG store Gemini name after creation
 * POST /api/ragstore
 */
exports.saveRagStore = async (req, res) => {
  console.log('\n================================');
  console.log('💾 POST /api/ragstore (Save Gemini Name)');
  console.log('================================');
  console.log('User:', req.user?.email);
  
  try {
    // Check authentication
    if (!req.user || !req.user.email) {
      console.log('❌ User not authenticated');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const { geminiName, displayName } = req.body;
    
    if (!geminiName) {
      return res.status(400).json({
        success: false,
        error: 'geminiName is required'
      });
    }
    
    console.log('📝 Display Name:', displayName);
    console.log('🔑 Gemini Name:', geminiName);
    
    const collection = req.user.isAdmin ? 'users' : 'subUsers';
    
    const updateData = {
      ragStoreGeminiName: geminiName,
      updatedAt: new Date().toISOString()
    };
    
    // Update display name if provided
    if (displayName) {
      updateData.ragStoreDisplayName = displayName;
    }
    
    await db.collection(collection).doc(req.user.email).update(updateData);
    
    console.log('✅ RAG store mapping saved');
    console.log('================================\n');
    
    res.json({
      success: true,
      message: 'RAG store mapping saved successfully'
    });
    
  } catch (error) {
    console.error('❌ Error saving RAG store:', error.message);
    console.error(error.stack);
    
    res.status(500).json({
      success: false,
      error: 'Failed to save RAG store',
      message: error.message
    });
  }
};
