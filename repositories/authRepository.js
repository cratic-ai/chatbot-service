const { db } = require('../config/firebase');

console.log('================================');
console.log('🔥 authRepository.js (Firestore) LOADING');
console.log('================================');
console.log('Firestore client available:', !!db);
console.log('================================\n');

/**
 * Find user by email in Firestore
 * Collection: users
 * Document ID: email (for easy lookup)
 */
exports.findUserByEmail = async (email) => {
  console.log('\n================================');
  console.log('🔍 findUserByEmail (Firestore)');
  console.log('================================');
  console.log('Email:', email);

  try {
    // Get document with email as ID
    const userDoc = await db.collection('users').doc(email).get();

    if (!userDoc.exists) {
      console.log('User not found (OK for signup)');
      console.log('================================\n');
      return null;
    }

    const userData = userDoc.data();
    console.log('✅ User found in Firestore');
    console.log('User data:', JSON.stringify({ ...userData, password: '***hidden***' }, null, 2));
    console.log('================================\n');

    // Return user with id field
    return {
      id: userDoc.id,
      ...userData
    };

  } catch (error) {
    console.error('\n================================');
    console.error('❌ Error in findUserByEmail');
    console.error('Error:', error.message);
    console.error('Error stack:', error.stack);
    console.error('================================\n');
    throw error;
  }
};

/**
 * Create new user in Firestore
 * Uses email as document ID for easy lookup
 */
exports.createUser = async (email, password) => {
  console.log('\n================================');
  console.log('📝 createUser (Firestore)');
  console.log('================================');
  console.log('Email:', email);
  console.log('Password provided:', !!password);

  try {
    const userData = {
      email,
      password,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Use email as document ID
    await db.collection('users').doc(email).set(userData);

    console.log('✅ User created in Firestore');
    console.log('================================\n');

    return {
      id: email,
      ...userData
    };

  } catch (error) {
    console.error('\n================================');
    console.error('❌ Error in createUser');
    console.error('Error:', error.message);
    
    // Handle duplicate user error
    if (error.code === 6) { // ALREADY_EXISTS
      console.error('User already exists');
      const customError = new Error('User already exists');
      customError.status = 400;
      throw customError;
    }
    
    console.error('Error stack:', error.stack);
    console.error('================================\n');
    throw error;
  }
};
