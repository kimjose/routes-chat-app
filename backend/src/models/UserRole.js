const { query } = require('../config/database');

class UserRole {
  constructor(userRoleData) {
    this.id = userRoleData.id;
    this.user_id = userRoleData.user_id;
    this.role_id = userRoleData.role_id;
    this.assigned_by = userRoleData.assigned_by;
    this.assigned_at = userRoleData.assigned_at;
    this.expires_at = userRoleData.expires_at;
    this.is_active = userRoleData.is_active;
  }

  // Assign role to user
  static async assignRole(userId, roleId, assignedBy = null, expiresAt = null) {
    const insertQuery = `
      INSERT INTO user_roles (user_id, role_id, assigned_by, expires_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, role_id) 
      DO UPDATE SET 
        is_active = true,
        assigned_by = $3,
        assigned_at = CURRENT_TIMESTAMP,
        expires_at = $4
      RETURNING *
    `;

    try {
      const result = await query(insertQuery, [userId, roleId, assignedBy, expiresAt]);
      return new UserRole(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Remove role from user
  static async removeRole(userId, roleId) {
    const updateQuery = `
      UPDATE user_roles 
      SET is_active = false
      WHERE user_id = $1 AND role_id = $2
      RETURNING *
    `;

    try {
      const result = await query(updateQuery, [userId, roleId]);
      
      if (result.rows.length === 0) {
        throw new Error('User role assignment not found');
      }

      return new UserRole(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Get user's roles
  static async getUserRoles(userId, includeExpired = false) {
    let selectQuery = `
      SELECT r.*, ur.assigned_at, ur.expires_at, ur.assigned_by
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1 AND ur.is_active = true AND r.is_active = true
    `;

    if (!includeExpired) {
      selectQuery += ` AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)`;
    }

    selectQuery += ` ORDER BY ur.assigned_at DESC`;

    try {
      const result = await query(selectQuery, [userId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get users with specific role
  static async getUsersWithRole(roleId, includeExpired = false) {
    let selectQuery = `
      SELECT u.*, ur.assigned_at, ur.expires_at, ur.assigned_by
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      WHERE ur.role_id = $1 AND ur.is_active = true AND u.is_active = true
    `;

    if (!includeExpired) {
      selectQuery += ` AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)`;
    }

    selectQuery += ` ORDER BY ur.assigned_at DESC`;

    try {
      const result = await query(selectQuery, [roleId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Check if user has specific role
  static async userHasRole(userId, roleId) {
    const selectQuery = `
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1 AND ur.role_id = $2 
      AND ur.is_active = true AND r.is_active = true
      AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
    `;

    try {
      const result = await query(selectQuery, [userId, roleId]);
      return result.rows.length > 0;
    } catch (error) {
      throw error;
    }
  }

  // Check if user has specific role by name
  static async userHasRoleName(userId, roleName) {
    const selectQuery = `
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1 AND r.name = $2 
      AND ur.is_active = true AND r.is_active = true
      AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
    `;

    try {
      const result = await query(selectQuery, [userId, roleName]);
      return result.rows.length > 0;
    } catch (error) {
      throw error;
    }
  }

  // Get user's permissions (combined from all roles)
  static async getUserPermissions(userId) {
    const selectQuery = `
      SELECT r.permissions
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1 AND ur.is_active = true AND r.is_active = true
      AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
    `;

    try {
      const result = await query(selectQuery, [userId]);
      
      // Combine all permissions from all roles
      const allPermissions = new Set();
      
      result.rows.forEach(row => {
        const permissions = Array.isArray(row.permissions) 
          ? row.permissions 
          : JSON.parse(row.permissions || '[]');
        
        permissions.forEach(permission => allPermissions.add(permission));
      });

      return Array.from(allPermissions);
    } catch (error) {
      throw error;
    }
  }

  // Check if user has specific permission
  static async userHasPermission(userId, permission) {
    const selectQuery = `
      SELECT 1 FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1 AND ur.is_active = true AND r.is_active = true
      AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
      AND r.permissions ? $2
    `;

    try {
      const result = await query(selectQuery, [userId, permission]);
      return result.rows.length > 0;
    } catch (error) {
      throw error;
    }
  }

  // Bulk assign roles to user
  static async assignMultipleRoles(userId, roleIds, assignedBy = null, expiresAt = null) {
    const assignments = [];
    
    try {
      for (const roleId of roleIds) {
        const assignment = await UserRole.assignRole(userId, roleId, assignedBy, expiresAt);
        assignments.push(assignment);
      }
      
      return assignments;
    } catch (error) {
      throw error;
    }
  }

  // Remove all roles from user
  static async removeAllUserRoles(userId) {
    const updateQuery = `
      UPDATE user_roles 
      SET is_active = false
      WHERE user_id = $1
      RETURNING *
    `;

    try {
      const result = await query(updateQuery, [userId]);
      return result.rows.map(row => new UserRole(row));
    } catch (error) {
      throw error;
    }
  }

  // Clean up expired roles
  static async cleanupExpiredRoles() {
    const updateQuery = `
      UPDATE user_roles 
      SET is_active = false
      WHERE expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP AND is_active = true
      RETURNING *
    `;

    try {
      const result = await query(updateQuery);
      console.log(`Cleaned up ${result.rowCount} expired role assignments`);
      return result.rows.map(row => new UserRole(row));
    } catch (error) {
      throw error;
    }
  }

  // Get role assignment details
  static async getRoleAssignment(userId, roleId) {
    const selectQuery = `
      SELECT * FROM user_roles
      WHERE user_id = $1 AND role_id = $2
    `;

    try {
      const result = await query(selectQuery, [userId, roleId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new UserRole(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Update role assignment (e.g., extend expiry)
  async update(updateData) {
    const allowedFields = ['expires_at', 'is_active'];
    const updates = [];
    const values = [];
    let valueIndex = 1;

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updates.push(`${field} = $${valueIndex}`);
        values.push(updateData[field]);
        valueIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(this.id);
    const updateQuery = `
      UPDATE user_roles 
      SET ${updates.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING *
    `;

    try {
      const result = await query(updateQuery, values);
      
      if (result.rows.length === 0) {
        throw new Error('User role assignment not found');
      }

      Object.assign(this, new UserRole(result.rows[0]));
      return this;
    } catch (error) {
      throw error;
    }
  }

  // Return user role data as JSON
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      role_id: this.role_id,
      assigned_by: this.assigned_by,
      assigned_at: this.assigned_at,
      expires_at: this.expires_at,
      is_active: this.is_active
    };
  }
}

module.exports = UserRole;
