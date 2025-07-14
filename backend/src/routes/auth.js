const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, first_name, last_name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Username, email, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters'
      });
    }

    // Check if user already exists
    const existingUserByEmail = await User.findByEmail(email);
    const existingUserByUsername = await User.findByUsername(username);

    if (existingUserByEmail) {
      return res.status(400).json({
        error: 'User with this email already exists'
      });
    }

    if (existingUserByUsername) {
      return res.status(400).json({
        error: 'User with this username already exists'
      });
    }

    // Create user
    const newUser = await User.create({
      username,
      email,
      password,
      first_name,
      last_name
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username, email: newUser.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: newUser.toJSON()
    });

  } catch (error) {
    console.error('Registration error:', error.message);
    
    // Handle specific database errors
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(400).json({
        error: 'User with this email or username already exists'
      });
    }
    
    res.status(500).json({
      error: 'Failed to register user'
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Check password
    const isValidPassword = await user.verifyPassword(password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({
      error: 'Failed to login'
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Profile error:', error.message);
    res.status(500).json({
      error: 'Failed to get user profile'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const { username, email, first_name, last_name, profile_picture_url } = req.body;
    const updateData = {};

    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (profile_picture_url) updateData.profile_picture_url = profile_picture_url;

    const updatedUser = await user.update(updateData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser.toJSON()
    });

  } catch (error) {
    console.error('Profile update error:', error.message);
    
    // Handle specific database errors
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(400).json({
        error: 'Username or email already exists'
      });
    }
    
    res.status(500).json({
      error: 'Failed to update profile'
    });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'New password must be at least 6 characters'
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Verify current password
    const isValidPassword = await user.verifyPassword(currentPassword);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Current password is incorrect'
      });
    }

    // Change password
    await user.changePassword(newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error.message);
    res.status(500).json({
      error: 'Failed to change password'
    });
  }
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Access token required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({
        error: 'Invalid or expired token'
      });
    }

    req.user = user;
    next();
  });
}

module.exports = router;

