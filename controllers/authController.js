const authService = require('../services/authService');

console.log('✅ authController.js loaded');
console.log('authService.signup:', typeof authService.signup);
console.log('authService.login:', typeof authService.login);

exports.signup = async (req, res) => {
  console.log('================================');
  console.log('📝 authController.signup called');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Email:', req.body.email);
  console.log('Password provided:', req.body.password ? 'YES' : 'NO');

  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    console.log('Calling authService.signup...');
    await authService.signup(email, password);
    console.log('✅ authService.signup completed successfully');

    console.log('Sending success response...');
    res.status(201).json({ message: 'User created successfully' });
    console.log('✅ Response sent');
    console.log('================================');
  } catch (error) {
    console.error('================================');
    console.error('❌ authController.signup ERROR');
    console.error('Error message:', error.message);
    console.error('Error status:', error.status);
    console.error('Error stack:', error.stack);
    console.error('================================');

    res.status(error.status || 500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  console.log('================================');
  console.log('🔐 authController.login called');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Email:', req.body.email);
  console.log('Password provided:', req.body.password ? 'YES' : 'NO');
  console.log('Request headers:', JSON.stringify(req.headers, null, 2));

  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    console.log('Calling authService.login...');
    const token = await authService.login(email, password);
    console.log('✅ authService.login completed successfully');
    console.log('Token received:', token ? 'YES' : 'NO');
    console.log('Token length:', token ? token.length : 0);

    console.log('Sending success response with token...');
    res.status(200).json({ token });
    console.log('✅ Response sent');
    console.log('================================');
  } catch (error) {
    console.error('================================');
    console.error('❌ authController.login ERROR');
    console.error('Error message:', error.message);
    console.error('Error status:', error.status);
    console.error('Error stack:', error.stack);
    console.error('================================');

    res.status(error.status || 500).json({ message: error.message });
  }
};