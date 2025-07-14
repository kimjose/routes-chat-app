const express = require('express');
const User = require('../models/User');
const Role = require('../models/Role');
const UserRole = require('../models/UserRole');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, requireAdmin } = require('./roles');
const router = express.Router();

// Apply authentication to all user routes
router.use(authenticateToken);

// Get all users (admin only)
router.get('/', requirePermission('user.read'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const users = await User.findAll(limit, offset);
    const totalUsers = await User.count();

    res.json({
      success: true,
      users: users.map(user => user.toJSON()),
      pagination: {
        page,
        limit,
        total: totalUsers,
        pages: Math.ceil(totalUsers / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get specific user
router.get('/:id', requirePermission('user.read'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if requesting own profile or has admin permissions
    const isOwnProfile = req.user.userId == req.params.id;
    const currentUser = await User.findById(req.user.userId);
    const canViewOthers = await currentUser.hasPermission('user.read');

    if (!isOwnProfile && !canViewOthers) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const userWithRoles = await user.toJSONWithRoles();

    res.json({
      success: true,
      user: userWithRoles
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get user's roles
router.get('/:id/roles', requirePermission('user.read'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check permissions
    const isOwnProfile = req.user.userId == req.params.id;
    const currentUser = await User.findById(req.user.userId);
    const canViewOthers = await currentUser.hasPermission('user.read');

    if (!isOwnProfile && !canViewOthers) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const includeExpired = req.query.include_expired === 'true';
    const roles = await user.getRoles(includeExpired);
    const permissions = await user.getPermissions();

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      roles,
      permissions
    });
  } catch (error) {
    console.error('Get user roles error:', error);
    res.status(500).json({ error: 'Failed to fetch user roles' });
  }
});

// Assign role to user
router.post('/:userId/roles/:roleId', requirePermission('user.write'), async (req, res) => {
  try {
    const { userId, roleId } = req.params;
    const { expires_at } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Assign role
    const assignment = await user.assignRole(roleId, req.user.userId, expires_at);

    res.json({
      success: true,
      message: 'Role assigned successfully',
      assignment: assignment.toJSON()
    });
  } catch (error) {
    console.error('Assign user role error:', error);
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

// Remove role from user
router.delete('/:userId/roles/:roleId', requirePermission('user.write'), async (req, res) => {
  try {
    const { userId, roleId } = req.params;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Prevent removing admin role from the last admin
    if (role.name === 'admin') {
      const admins = await UserRole.getUsersWithRole(roleId);
      if (admins.length <= 1) {
        return res.status(400).json({
          error: 'Cannot remove admin role from the last administrator'
        });
      }
    }

    // Remove role
    const assignment = await user.removeRole(roleId);

    res.json({
      success: true,
      message: 'Role removed successfully',
      assignment: assignment.toJSON()
    });
  } catch (error) {
    console.error('Remove user role error:', error);
    res.status(500).json({ error: 'Failed to remove role' });
  }
});

// Assign multiple roles to user
router.post('/:userId/roles', requirePermission('user.write'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role_ids, expires_at } = req.body;

    if (!Array.isArray(role_ids) || role_ids.length === 0) {
      return res.status(400).json({
        error: 'role_ids must be a non-empty array'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate all roles exist
    for (const roleId of role_ids) {
      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(404).json({ 
          error: `Role with ID ${roleId} not found` 
        });
      }
    }

    // Assign roles
    const assignments = await user.assignRoles(role_ids, req.user.userId, expires_at);

    res.json({
      success: true,
      message: 'Roles assigned successfully',
      assignments: assignments.map(a => a.toJSON())
    });
  } catch (error) {
    console.error('Assign user roles error:', error);
    res.status(500).json({ error: 'Failed to assign roles' });
  }
});

// Remove all roles from user
router.delete('/:userId/roles', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent removing all roles from the last admin
    const isAdmin = await user.isAdmin();
    if (isAdmin) {
      const adminRole = await Role.findByName('admin');
      if (adminRole) {
        const admins = await UserRole.getUsersWithRole(adminRole.id);
        if (admins.length <= 1) {
          return res.status(400).json({
            error: 'Cannot remove all roles from the last administrator'
          });
        }
      }
    }

    // Remove all roles
    const removedAssignments = await user.removeAllRoles();

    res.json({
      success: true,
      message: 'All roles removed successfully',
      removed_assignments: removedAssignments.length
    });
  } catch (error) {
    console.error('Remove all user roles error:', error);
    res.status(500).json({ error: 'Failed to remove all roles' });
  }
});

// Update user (admin function)
router.put('/:id', requirePermission('user.write'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check permissions - can update own profile or has user.write permission
    const isOwnProfile = req.user.userId == req.params.id;
    const currentUser = await User.findById(req.user.userId);
    const canUpdateOthers = await currentUser.hasPermission('user.write');

    if (!isOwnProfile && !canUpdateOthers) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { username, email, first_name, last_name, profile_picture_url, is_active } = req.body;
    const updateData = {};

    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (profile_picture_url) updateData.profile_picture_url = profile_picture_url;
    
    // Only allow admins to change is_active status
    if (is_active !== undefined && canUpdateOthers) {
      updateData.is_active = is_active;
    }

    const updatedUser = await user.update(updateData);

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser.toJSON()
    });
  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        error: 'Username or email already exists'
      });
    }
    
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting the last admin
    const isAdmin = await user.isAdmin();
    if (isAdmin) {
      const adminRole = await Role.findByName('admin');
      if (adminRole) {
        const admins = await UserRole.getUsersWithRole(adminRole.id);
        if (admins.length <= 1) {
          return res.status(400).json({
            error: 'Cannot delete the last administrator'
          });
        }
      }
    }

    await user.delete();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Check user permissions
router.get('/:id/permissions/:permission', requirePermission('user.read'), async (req, res) => {
  try {
    const { id, permission } = req.params;

    // Check permissions
    const isOwnProfile = req.user.userId == id;
    const currentUser = await User.findById(req.user.userId);
    const canViewOthers = await currentUser.hasPermission('user.read');

    if (!isOwnProfile && !canViewOthers) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hasPermission = await user.hasPermission(permission);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username
      },
      permission,
      has_permission: hasPermission
    });
  } catch (error) {
    console.error('Check user permission error:', error);
    res.status(500).json({ error: 'Failed to check user permission' });
  }
});

module.exports = router;
