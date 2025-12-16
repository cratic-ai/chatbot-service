const subUserRepository = require('../repositories/subUserRepository');
const bcrypt = require('bcrypjs');

console.log('================================');
console.log('👥 subUserController.js LOADING');
console.log('================================\n');

/**
 * Create new sub-user
 * POST /api/sub-users
 */
exports.createSubUser = async (req, res) => {
  console.log('\n================================');
  console.log('📝 POST /api/sub-users');
  console.log('================================');
  
  try {
    const parentEmail = req.user.email; // From auth middleware
    const { email, password, name, status = 'active' } = req.body;
    
    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and name are required'
      });
    }
    
    // Validate parent is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only admin users can create sub-users'
      });
    }
    
    console.log('Parent:', parentEmail);
    console.log('Creating sub-user:', email);
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create sub-user
    const subUser = await subUserRepository.createSubUser(parentEmail, {
      email,
      password: hashedPassword,
      name,
      status
    });
    
    console.log('✅ Sub-user created successfully');
    console.log('================================\n');
    
    res.status(201).json({
      success: true,
      message: 'Sub-user created successfully',
      subUser: {
        id: subUser.id,
        email: subUser.email,
        name: subUser.name,
        status: subUser.status,
        createdAt: subUser.createdAt
      },
      credentials: {
        email: email,
        password: password // Send back plain password for parent to share
      }
    });
    
  } catch (error) {
    console.error('❌ Create sub-user error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to create sub-user',
      message: error.message
    });
  }
};

/**
 * List all sub-users for current admin
 * GET /api/sub-users
 */
exports.listSubUsers = async (req, res) => {
  console.log('\n================================');
  console.log('📋 GET /api/sub-users');
  console.log('================================');
  
  try {
    const parentEmail = req.user.email;
    
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const subUsers = await subUserRepository.listSubUsers(parentEmail);
    
    console.log(`✅ Returning ${subUsers.length} sub-users`);
    console.log('================================\n');
    
    res.json({
      success: true,
      count: subUsers.length,
      subUsers: subUsers
    });
    
  } catch (error) {
    console.error('❌ List sub-users error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to list sub-users',
      message: error.message
    });
  }
};

/**
 * Get single sub-user
 * GET /api/sub-users/:email
 */
exports.getSubUser = async (req, res) => {
  console.log('\n================================');
  console.log('👤 GET /api/sub-users/:email');
  console.log('================================');
  
  try {
    const parentEmail = req.user.email;
    const subUserEmail = req.params.email;
    
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const subUser = await subUserRepository.getSubUser(parentEmail, subUserEmail);
    
    console.log('✅ Sub-user retrieved');
    console.log('================================\n');
    
    res.json({
      success: true,
      subUser: {
        id: subUser.id,
        email: subUser.email,
        name: subUser.name,
        status: subUser.status,
        createdAt: subUser.createdAt,
        lastLogin: subUser.lastLogin
      }
    });
    
  } catch (error) {
    console.error('❌ Get sub-user error:', error.message);
    
    const status = error.message === 'Sub-user not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update sub-user
 * PUT /api/sub-users/:email
 */
exports.updateSubUser = async (req, res) => {
  console.log('\n================================');
  console.log('📝 PUT /api/sub-users/:email');
  console.log('================================');
  
  try {
    const parentEmail = req.user.email;
    const subUserEmail = req.params.email;
    const { name, status, password } = req.body;
    
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const updates = {};
    if (name) updates.name = name;
    if (status) updates.status = status;
    
    // If password is being reset
    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }
    
    await subUserRepository.updateSubUser(parentEmail, subUserEmail, updates);
    
    console.log('✅ Sub-user updated');
    console.log('================================\n');
    
    const response = {
      success: true,
      message: 'Sub-user updated successfully'
    };
    
    // If password was reset, return it so parent can share
    if (password) {
      response.newPassword = password;
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Update sub-user error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to update sub-user',
      message: error.message
    });
  }
};

/**
 * Delete sub-user
 * DELETE /api/sub-users/:email
 */
exports.deleteSubUser = async (req, res) => {
  console.log('\n================================');
  console.log('🗑️  DELETE /api/sub-users/:email');
  console.log('================================');
  
  try {
    const parentEmail = req.user.email;
    const subUserEmail = req.params.email;
    
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    await subUserRepository.deleteSubUser(parentEmail, subUserEmail);
    
    console.log('✅ Sub-user deleted');
    console.log('================================\n');
    
    res.json({
      success: true,
      message: 'Sub-user deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Delete sub-user error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete sub-user',
      message: error.message
    });
  }
};

/**
 * Get sub-user statistics
 * GET /api/sub-users/stats
 */
exports.getSubUserStats = async (req, res) => {
  console.log('\n================================');
  console.log('📊 GET /api/sub-users/stats');
  console.log('================================');
  
  try {
    const parentEmail = req.user.email;
    
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const totalCount = await subUserRepository.getSubUserCount(parentEmail);
    const activeCount = await subUserRepository.getActiveSubUserCount(parentEmail);
    
    console.log('✅ Stats retrieved');
    console.log('================================\n');
    
    res.json({
      success: true,
      stats: {
        total: totalCount,
        active: activeCount,
        inactive: totalCount - activeCount
      }
    });
    
  } catch (error) {
    console.error('❌ Get stats error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
};
