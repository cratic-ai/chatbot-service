const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepository = require('../repositories/authRepository');


const SALT_ROUNDS = 8;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

console.log('✅ authService.js loaded');
console.log('JWT_SECRET exists:', JWT_SECRET ? 'YES' : 'NO');
console.log('JWT_SECRET value:', JWT_SECRET ? '***hidden***' : 'MISSING');

exports.signup = async (email, password) => {
  console.log('================================');
  console.log('📝 authService.signup called');
  console.log('Email:', email);
  console.log('Password length:', password ? password.length : 0);

  try {
    console.log('Checking if user exists...');
    const existingUser = await authRepository.findUserByEmail(email);
    console.log('Existing user found:', existingUser ? 'YES' : 'NO');

    if (existingUser) {
      console.log('❌ User already exists');
      const error = new Error('User already exists');
      error.status = 400;
      throw error;
    }

    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    console.log('✅ Password hashed');

    console.log('Creating user in database...');
    await authRepository.createUser(email, hashedPassword);
    console.log('✅ User created successfully');
    console.log('================================');
  } catch (error) {
    console.error('================================');
    console.error('❌ authService.signup ERROR');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('================================');
    throw error;
  }
};

exports.login = async (email, password) => {
  console.log('================================');
  console.log('🔐 authService.login called');
  console.log('Email:', email);
  console.log('Password provided:', password ? 'YES' : 'NO');

  try {
    console.log('Finding user by email...');
    const user = await authRepository.findUserByEmail(email);
    console.log('User found:', user ? 'YES' : 'NO');

    if (!user) {
      console.log('❌ User not found');
      const error = new Error('Invalid credentials');
      error.status = 401;
      throw error;
    }

    console.log('User details:', {
      id: user.id,
      email: user.email,
      hasPassword: user.password ? 'YES' : 'NO'
    });

    console.log('Comparing passwords...');
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch ? 'YES' : 'NO');

    if (!isMatch) {
      console.log('❌ Password mismatch');
      const error = new Error('Invalid credentials');
      error.status = 401;
      throw error;
    }

    console.log('Generating JWT token...');
    console.log('Token payload:', { userId: user.id, email: user.email });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('✅ Token generated successfully');
    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 20) + '...');
    console.log('================================');

    return token;
  } catch (error) {
    console.error('================================');
    console.error('❌ authService.login ERROR');
    console.error('Error message:', error.message);
    console.error('Error status:', error.status);
    console.error('Error stack:', error.stack);
    console.error('================================');
    throw error;
  }
};

/**
 * Handle SAML authentication
 * Returns JWT token just like regular login
 */
exports.samlLogin = async (samlData) => {
  console.log('================================');
  console.log('🔐 authService.samlLogin called');
  console.log('Email:', samlData.email);

  try {
    // Find or create user
    const user = await authRepository.findOrCreateSamlUser(samlData);
    
    console.log('Generating JWT token for SAML user...');
    
    // Generate same JWT token format as regular login
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        authType: 'saml' // Optional: track auth method
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('✅ SAML login successful, token generated');
    console.log('================================');
    
    return { token, user };
  } catch (error) {
    console.error('❌ authService.samlLogin ERROR:', error);
    throw error;
  }
};




