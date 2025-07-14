const express = require('express');
const Role = require('../models/Role');
const UserRole = require('../models/UserRole');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Apply authentication to all role routes
router.use(authenticateToken);

// Middleware to check if user has permission
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const hasPermission = await user.hasPermission(permission);
      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permission
        });
      }

      req.currentUser = user;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Failed to check permissions' });
    }
  };
};

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isAdmin = await user.isAdmin();
    if (!isAdmin) {
      return res.status(403).json({ 
        error: 'Admin access required'
      });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Failed to check admin status' });
  }
};

// Get all roles
router.get('/', requirePermission('role.read'), async (req, res) => {
  try {
    const includeInactive = req.query.include_inactive === 'true';
    const roles = await Role.findAll(includeInactive);

    res.json({
      success: true,
      roles: roles.map(role => role.toJSON())
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Get specific role
router.get('/:id', requirePermission('role.read'), async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json({
      success: true,
      role: role.toJSON()
    });
  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

// Create new role
router.post('/', requirePermission('role.write'), async (req, res) => {
  try {
    const { name, display_name, description, permissions = [] } = req.body;

    if (!name || !display_name) {
      return res.status(400).json({
        error: 'Role name and display name are required'
      });
    }

    // Check if role already exists
    const existingRole = await Role.findByName(name);
    if (existingRole) {
      return res.status(400).json({
        error: 'Role with this name already exists'
      });
    }

    const newRole = await Role.create({
      name,
      display_name,
      description,
      permissions
    });

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      role: newRole.toJSON()
    });
  } catch (error) {
    console.error('Create role error:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        error: 'Role with this name already exists'
      });
    }
    
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Update role
router.put('/:id', requirePermission('role.write'), async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const { display_name, description, permissions, is_active } = req.body;
    const updateData = {};

    if (display_name !== undefined) updateData.display_name = display_name;
    if (description !== undefined) updateData.description = description;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (is_active !== undefined) updateData.is_active = is_active;

    const updatedRole = await role.update(updateData);

    res.json({
      success: true,
      message: 'Role updated successfully',
      role: updatedRole.toJSON()
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Delete role
router.delete('/:id', requirePermission('role.delete'), async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Prevent deletion of system roles
    if (['admin', 'user', 'guest'].includes(role.name)) {
      return res.status(400).json({
        error: 'Cannot delete system roles'
      });
    }

    await role.delete();

    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// Get users with specific role
router.get('/:id/users', requirePermission('role.read'), async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const includeExpired = req.query.include_expired === 'true';
    const users = await UserRole.getUsersWithRole(req.params.id, includeExpired);

    res.json({
      success: true,
      role: role.toJSON(),
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        assigned_at: user.assigned_at,
        expires_at: user.expires_at,
        assigned_by: user.assigned_by
      }))
    });
  } catch (error) {
    console.error('Get role users error:', error);
    res.status(500).json({ error: 'Failed to fetch role users' });
  }
});

// Assign role to user
router.post('/:roleId/assign/:userId', requirePermission('role.write'), async (req, res) => {
  try {
    const { roleId, userId } = req.params;
    const { expires_at } = req.body;

    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Assign role
    const assignment = await UserRole.assignRole(
      userId,
      roleId,
      req.user.userId,
      expires_at
    );

    res.json({
      success: true,
      message: 'Role assigned successfully',
      assignment: assignment.toJSON()
    });
  } catch (error) {
    console.error('Assign role error:', error);
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

// Remove role from user
router.delete('/:roleId/remove/:userId', requirePermission('role.write'), async (req, res) => {
  try {
    const { roleId, userId } = req.params;

    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove role
    const assignment = await UserRole.removeRole(userId, roleId);

    res.json({
      success: true,
      message: 'Role removed successfully',
      assignment: assignment.toJSON()
    });
  } catch (error) {
    console.error('Remove role error:', error);
    res.status(500).json({ error: 'Failed to remove role' });
  }
});

// Cleanup expired roles
router.post('/cleanup-expired', requireAdmin, async (req, res) => {
  try {
    const expiredAssignments = await UserRole.cleanupExpiredRoles();

    res.json({
      success: true,
      message: `Cleaned up ${expiredAssignments.length} expired role assignments`,
      cleaned_assignments: expiredAssignments.length
    });
  } catch (error) {
    console.error('Cleanup expired roles error:', error);
    res.status(500).json({ error: 'Failed to cleanup expired roles' });
  }
});

module.exports = { router, requirePermission, requireAdmin };
