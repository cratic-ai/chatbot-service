// const authService = require('../services/authService');

// console.log('✅ authController.js loaded');
// console.log('authService.signup:', typeof authService.signup);
// console.log('authService.login:', typeof authService.login);

// exports.signup = async (req, res) => {
//   console.log('================================');
//   console.log('📝 authController.signup called');
//   console.log('Request body:', JSON.stringify(req.body, null, 2));
//   console.log('Email:', req.body.email);
//   console.log('Password provided:', req.body.password ? 'YES' : 'NO');

//   try {
//     const { email, password } = req.body;

//     // Validate input
//     if (!email || !password) {
//       console.log('❌ Missing email or password');
//       return res.status(400).json({ message: 'Email and password are required' });
//     }

//     console.log('Calling authService.signup...');
//     await authService.signup(email, password);
//     console.log('✅ authService.signup completed successfully');

//     console.log('Sending success response...');
//     res.status(201).json({ message: 'User created successfully' });
//     console.log('✅ Response sent');
//     console.log('================================');
//   } catch (error) {
//     console.error('================================');
//     console.error('❌ authController.signup ERROR');
//     console.error('Error message:', error.message);
//     console.error('Error status:', error.status);
//     console.error('Error stack:', error.stack);
//     console.error('================================');

//     res.status(error.status || 500).json({ message: error.message });
//   }
// };

// exports.login = async (req, res) => {
//   console.log('================================');
//   console.log('🔐 authController.login called');
//   console.log('Request body:', JSON.stringify(req.body, null, 2));
//   console.log('Email:', req.body.email);
//   console.log('Password provided:', req.body.password ? 'YES' : 'NO');
//   console.log('Request headers:', JSON.stringify(req.headers, null, 2));

//   try {
//     const { email, password } = req.body;

//     // Validate input
//     if (!email || !password) {
//       console.log('❌ Missing email or password');
//       return res.status(400).json({ message: 'Email and password are required' });
//     }

//     console.log('Calling authService.login...');
//     const token = await authService.login(email, password);
//     console.log('✅ authService.login completed successfully');
//     console.log('Token received:', token ? 'YES' : 'NO');
//     console.log('Token length:', token ? token.length : 0);

//     console.log('Sending success response with token...');
//     res.status(200).json({ token });
//     console.log('✅ Response sent');
//     console.log('================================');
//   } catch (error) {
//     console.error('================================');
//     console.error('❌ authController.login ERROR');
//     console.error('Error message:', error.message);
//     console.error('Error status:', error.status);
//     console.error('Error stack:', error.stack);
//     console.error('================================');

//     res.status(error.status || 500).json({ message: error.message });
//   }
// };





const authRepository = require('../repositories/authRepository');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

console.log('================================');
console.log('🔐 authController.js LOADING');
console.log('================================\n');

/**
 * User login - handles both admin and sub-users
 * POST /api/auth/login
 */

// controllers/authController.js
exports.login = async (req, res) => {
  console.log('\n================================');
  console.log('🔑 POST /api/auth/login');
  console.log('================================');
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }
    
    console.log('Email:', email);
    
    // Find user (checks both admin and sub-user collections)
    const user = await authRepository.findUserByEmail(email);
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      console.log('❌ Invalid password');
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    console.log('✅ Password verified');
    console.log('User type:', user.isAdmin ? 'Admin' : 'Sub-user');
    
    // Update last login
    await authRepository.updateLastLogin(email, user.isAdmin);
    
    // Generate JWT token
    const tokenPayload = {
      userId: user.email,  // ✅ Add this for compatibility
      email: user.email,
      isAdmin: user.isAdmin
    };
    
    // Add parentUser for sub-users
    if (!user.isAdmin) {
      tokenPayload.parentUser = user.parentUser;
    }
    
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    console.log('✅ Login successful');
    console.log('================================\n');
    
    // ✅ Updated response structure
    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      email: user.email,  // ✅ Add this
      userId: user.email, // ✅ Add this
      user: {
        email: user.email,
        userId: user.email,  // ✅ Add this
        isAdmin: user.isAdmin,
        name: user.name || email.split('@')[0],
        parentUser: user.parentUser || null
      }
    });
    
  } catch (error) {
    console.error('❌ Login error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message
    });
  }
};


/**
 * User signup - creates admin user only
 * POST /api/auth/signup
 */
exports.signup = async (req, res) => {
  console.log('\n================================');
  console.log('📝 POST /api/auth/signup');
  console.log('================================');
  
  try {
    const { email, password} = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }
    
    console.log('Email:', email);
    
    // Check if user already exists
    const existingUser = await authRepository.findUserByEmail(email);
    
    if (existingUser) {
      console.log('❌ User already exists');
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create admin user
    const user = await authRepository.createUser(email, hashedPassword);
    
    // Generate token
    const token = jwt.sign(
      { email: user.email, isAdmin: true },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    console.log('✅ Signup successful');
    console.log('================================\n');
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token: token,
      user: {
        email: user.email,
        isAdmin: true,
      }
    });
    
  } catch (error) {
    console.error('❌ Signup error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Signup failed',
      message: error.message
    });
  }
};

// ✅ Update getCurrentUser (for /verify endpoint)
exports.getCurrentUser = async (req, res) => {
  console.log('\n================================');
  console.log('👤 GET /api/auth/me');
  console.log('================================');
  
  try {
    const email = req.user.email;
    
    const user = await authRepository.findUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    console.log('✅ User info retrieved');
    console.log('================================\n');
    
    // ✅ Updated response structure
    res.json({
      success: true,
      email: user.email,  // ✅ Add this
      userId: user.email, // ✅ Add this
      user: {
        email: user.email,
        userId: user.email,  // ✅ Add this
        isAdmin: user.isAdmin,
        parentUser: user.parentUser || null,
        subUserCount: user.subUserCount || 0,
        documentCount: user.documentCount || 0
      }
    });
    
  } catch (error) {
    console.error('❌ Get user error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get user info'
    });
  }
};


