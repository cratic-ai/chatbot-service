const { db } = require('../config/firebase');

console.log('================================');
console.log('👥 subUserRepository.js LOADING');
console.log('================================\n');

/**
 * Create sub-user under a parent admin
 */
exports.createSubUser = async (parentEmail, subUserData) => {
  console.log('\n================================');
  console.log('📝 createSubUser');
  console.log('================================');
  console.log('Parent:', parentEmail);
  console.log('Sub-user email:', subUserData.email);
  
  try {
    const { email, password, name, status = 'active' } = subUserData;
    
    // 1. Create sub-user in subUsers collection
    const subUserDoc = {
      email,
      password, // Already hashed
      name,
      isAdmin: false,
      parentUser: parentEmail,
      status,
      permissions: ['view', 'download'],
      createdAt: new Date().toISOString(),
      createdBy: parentEmail,
      lastLogin: null
    };
    
    await db.collection('subUsers').doc(email).set(subUserDoc);
    console.log('✅ Sub-user created in subUsers collection');
    
    // 2. Add to parent's subUsers array
    const parentRef = db.collection('users').doc(parentEmail);
    const parentDoc = await parentRef.get();
    
    if (!parentDoc.exists) {
      throw new Error('Parent user not found');
    }
    
    const parentData = parentDoc.data();
    const currentSubUsers = parentData.subUsers || [];
    
    currentSubUsers.push({
      email,
      name,
      createdAt: subUserDoc.createdAt,
      status
    });
    
    await parentRef.update({
      subUsers: currentSubUsers,
      subUserCount: currentSubUsers.length,
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Added to parent\'s subUsers array');
    console.log('================================\n');
    
    return {
      id: email,
      ...subUserDoc
    };
    
  } catch (error) {
    console.error('❌ Error creating sub-user:', error.message);
    throw error;
  }
};

/**
 * List all sub-users for a parent
 */
// exports.listSubUsers = async (parentEmail) => {
//   console.log('\n================================');
//   console.log('📋 listSubUsers');
//   console.log('================================');
//   console.log('Parent:', parentEmail);
  
//   try {
//     const snapshot = await db.collection('subUsers')
//       .where('parentUser', '==', parentEmail)
//       .orderBy('createdAt', 'desc')
//       .get();
    
//     const subUsers = [];
//     snapshot.forEach(doc => {
//       const data = doc.data();
//       subUsers.push({
//         id: doc.id,
//         email: data.email,
//         name: data.name,
//         status: data.status,
//         createdAt: data.createdAt,
//         lastLogin: data.lastLogin
//       });
//     });
    
//     console.log(`✅ Found ${subUsers.length} sub-users`);
//     console.log('================================\n');
    
//     return subUsers;
    
//   } catch (error) {
//     console.error('❌ Error listing sub-users:', error.message);
//     throw error;
//   }
// };
/**
 * List all sub-users for a parent
 */
exports.listSubUsers = async (parentEmail) => {
  console.log('\n================================');
  console.log('📋 listSubUsers');
  console.log('================================');
  console.log('Parent:', parentEmail);
  
  try {
    // Remove .orderBy() to avoid index requirement
    const snapshot = await db.collection('subUsers')
      .where('parentUser', '==', parentEmail)
      .get(); // ← No .orderBy() here
    
    const subUsers = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      subUsers.push({
        id: doc.id,
        email: data.email,
        name: data.name,
        status: data.status,
        createdAt: data.createdAt,
        lastLogin: data.lastLogin
      });
    });
    
    // Sort in JavaScript instead (works without index)
    subUsers.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA; // Newest first
    });
    
    console.log(`✅ Found ${subUsers.length} sub-users`);
    console.log('================================\n');
    
    return subUsers;
    
  } catch (error) {
    console.error('❌ Error listing sub-users:', error.message);
    throw error;
  }
};

/**
 * Get single sub-user
 */
exports.getSubUser = async (parentEmail, subUserEmail) => {
  console.log('\n================================');
  console.log('👤 getSubUser');
  console.log('================================');
  
  try {
    const doc = await db.collection('subUsers').doc(subUserEmail).get();
    
    if (!doc.exists) {
      throw new Error('Sub-user not found');
    }
    
    const data = doc.data();
    
    // Verify this sub-user belongs to the requesting parent
    if (data.parentUser !== parentEmail) {
      throw new Error('Unauthorized access to sub-user');
    }
    
    console.log('✅ Sub-user found');
    console.log('================================\n');
    
    return {
      id: doc.id,
      ...data
    };
    
  } catch (error) {
    console.error('❌ Error getting sub-user:', error.message);
    throw error;
  }
};

/**
 * Update sub-user
 */
exports.updateSubUser = async (parentEmail, subUserEmail, updates) => {
  console.log('\n================================');
  console.log('📝 updateSubUser');
  console.log('================================');
  
  try {
    const subUserRef = db.collection('subUsers').doc(subUserEmail);
    const doc = await subUserRef.get();
    
    if (!doc.exists) {
      throw new Error('Sub-user not found');
    }
    
    const data = doc.data();
    
    // Verify ownership
    if (data.parentUser !== parentEmail) {
      throw new Error('Unauthorized');
    }
    
    // Update in subUsers collection
    await subUserRef.update({
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Sub-user updated in subUsers collection');
    
    // Update in parent's subUsers array
    const parentRef = db.collection('users').doc(parentEmail);
    const parentDoc = await parentRef.get();
    const parentData = parentDoc.data();
    
    const updatedSubUsers = parentData.subUsers.map(u => 
      u.email === subUserEmail 
        ? { ...u, ...updates, updatedAt: new Date().toISOString() }
        : u
    );
    
    await parentRef.update({
      subUsers: updatedSubUsers,
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Updated in parent\'s array');
    console.log('================================\n');
    
  } catch (error) {
    console.error('❌ Error updating sub-user:', error.message);
    throw error;
  }
};

/**
 * Delete sub-user
 */
exports.deleteSubUser = async (parentEmail, subUserEmail) => {
  console.log('\n================================');
  console.log('🗑️  deleteSubUser');
  console.log('================================');
  
  try {
    const subUserRef = db.collection('subUsers').doc(subUserEmail);
    const doc = await subUserRef.get();
    
    if (!doc.exists) {
      throw new Error('Sub-user not found');
    }
    
    const data = doc.data();
    
    // Verify ownership
    if (data.parentUser !== parentEmail) {
      throw new Error('Unauthorized');
    }
    
    // Delete from subUsers collection
    await subUserRef.delete();
    console.log('✅ Deleted from subUsers collection');
    
    // Remove from parent's subUsers array
    const parentRef = db.collection('users').doc(parentEmail);
    const parentDoc = await parentRef.get();
    const parentData = parentDoc.data();
    
    const filteredSubUsers = parentData.subUsers.filter(u => u.email !== subUserEmail);
    
    await parentRef.update({
      subUsers: filteredSubUsers,
      subUserCount: filteredSubUsers.length,
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Removed from parent\'s array');
    console.log('================================\n');
    
  } catch (error) {
    console.error('❌ Error deleting sub-user:', error.message);
    throw error;
  }
};

/**
 * Get sub-user count for parent
 */
exports.getSubUserCount = async (parentEmail) => {
  try {
    const snapshot = await db.collection('subUsers')
      .where('parentUser', '==', parentEmail)
      .get();
    
    return snapshot.size;
  } catch (error) {
    console.error('Error getting sub-user count:', error.message);
    return 0;
  }
};

/**
 * Get active sub-user count
 */
exports.getActiveSubUserCount = async (parentEmail) => {
  try {
    const snapshot = await db.collection('subUsers')
      .where('parentUser', '==', parentEmail)
      .where('status', '==', 'active')
      .get();
    
    return snapshot.size;
  } catch (error) {
    console.error('Error getting active sub-user count:', error.message);
    return 0;
  }
};
