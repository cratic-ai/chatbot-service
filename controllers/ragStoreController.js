const { db } = require('../config/firebase');

console.log('================================');
console.log('🗄️  ragStoreController.js LOADING');
console.log('================================\n');

/**
 * Get RAG store name for authenticated user
 * GET /api/ragstore
 */
exports.getRagStore = async (req, res) => {
  console.log('\n================================');
  console.log('📋 GET /api/ragstore');
  console.log('================================');
  console.log('User:', req.user.email);
  console.log('Is Admin:', req.user.isAdmin);
  
  try {
    const collection = req.user.isAdmin ? 'users' : 'subUsers';
    const userDoc = await db.collection(collection).doc(req.user.email).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const userData = userDoc.data();
    const ragStoreName = userData.ragStoreName || null;
    
    console.log('✅ RAG store name:', ragStoreName);
    console.log('================================\n');
    
    res.json({
      success: true,
      ragStore: {
        name: ragStoreName
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting RAG store:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get RAG store',
      message: error.message
    });
  }
};
