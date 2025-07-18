const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  constructor(userData) {
    this.id = userData.id;
    this.username = userData.username;
    this.email = userData.email;
    this.password_hash = userData.password_hash;
    this.first_name = userData.first_name;
    this.last_name = userData.last_name;
    this.profile_picture_url = userData.profile_picture_url;
    this.is_active = userData.is_active;
    this.created_at = userData.created_at;
    this.updated_at = userData.updated_at;
  }

  // Create a new user
  static async create(userData) {
    const { username, email, password, first_name, last_name, profile_picture_url } = userData;
    
    // Hash the password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const insertQuery = `
      INSERT INTO users (username, email, password_hash, first_name, last_name, profile_picture_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, username, email, first_name, last_name, profile_picture_url, is_active, created_at, updated_at
    `;

    try {
      const result = await query(insertQuery, [
        username,
        email,
        password_hash,
        first_name,
        last_name,
        profile_picture_url
      ]);

      const newUser = new User(result.rows[0]);
      
      // Assign default 'user' role to new user
      try {
        const Role = require('./Role');
        const defaultRole = await Role.findByName('user');
        if (defaultRole) {
          await newUser.assignRole(defaultRole.id);
        }
      } catch (roleError) {
        console.warn('Could not assign default role to new user:', roleError.message);
        // Don't fail user creation if role assignment fails
      }

      return newUser;
    } catch (error) {
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    const selectQuery = 'SELECT * FROM users WHERE id = $1 AND is_active = true';
    
    try {
      const result = await query(selectQuery, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new User(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Find user by username
  static async findByUsername(username) {
    const selectQuery = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
    
    try {
      const result = await query(selectQuery, [username]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new User(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    const selectQuery = 'SELECT * FROM users WHERE email = $1 AND is_active = true';
    
    try {
      const result = await query(selectQuery, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new User(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Verify password
  async verifyPassword(password) {
    return await bcrypt.compare(password, this.password_hash);
  }

  // Update user
  async update(updateData) {
    const allowedFields = ['username', 'email', 'first_name', 'last_name', 'profile_picture_url'];
    const updates = [];
    const values = [];
    let valueIndex = 1;

    // Build dynamic update query
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
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING id, username, email, first_name, last_name, profile_picture_url, is_active, created_at, updated_at
    `;

    try {
      const result = await query(updateQuery, values);
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      // Update current instance
      Object.assign(this, result.rows[0]);
      return this;
    } catch (error) {
      throw error;
    }
  }

  // Change password
  async changePassword(newPassword) {
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    const updateQuery = `
      UPDATE users 
      SET password_hash = $1
      WHERE id = $2
      RETURNING id
    `;

    try {
      const result = await query(updateQuery, [password_hash, this.id]);
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      this.password_hash = password_hash;
      return this;
    } catch (error) {
      throw error;
    }
  }

  // Soft delete user
  async delete() {
    const deleteQuery = `
      UPDATE users 
      SET is_active = false
      WHERE id = $1
      RETURNING id
    `;

    try {
      const result = await query(deleteQuery, [this.id]);
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      this.is_active = false;
      return this;
    } catch (error) {
      throw error;
    }
  }

  // Get all users (admin function)
  static async findAll(limit = 50, offset = 0) {
    const selectQuery = `
      SELECT id, username, email, first_name, last_name, profile_picture_url, is_active, created_at, updated_at
      FROM users 
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    try {
      const result = await query(selectQuery, [limit, offset]);
      return result.rows.map(row => new User(row));
    } catch (error) {
      throw error;
    }
  }

  // Get user count
  static async count() {
    const countQuery = 'SELECT COUNT(*) as count FROM users WHERE is_active = true';
    
    try {
      const result = await query(countQuery);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw error;
    }
  }

  // Role management methods
  
  // Get user's roles
  async getRoles(includeExpired = false) {
    const UserRole = require('./UserRole');
    return await UserRole.getUserRoles(this.id, includeExpired);
  }

  // Check if user has specific role
  async hasRole(roleId) {
    const UserRole = require('./UserRole');
    return await UserRole.userHasRole(this.id, roleId);
  }

  // Check if user has specific role by name
  async hasRoleName(roleName) {
    const UserRole = require('./UserRole');
    return await UserRole.userHasRoleName(this.id, roleName);
  }

  // Get user's permissions
  async getPermissions() {
    const UserRole = require('./UserRole');
    return await UserRole.getUserPermissions(this.id);
  }

  // Check if user has specific permission
  async hasPermission(permission) {
    const UserRole = require('./UserRole');
    return await UserRole.userHasPermission(this.id, permission);
  }

  // Assign role to user
  async assignRole(roleId, assignedBy = null, expiresAt = null) {
    const UserRole = require('./UserRole');
    return await UserRole.assignRole(this.id, roleId, assignedBy, expiresAt);
  }

  // Remove role from user
  async removeRole(roleId) {
    const UserRole = require('./UserRole');
    return await UserRole.removeRole(this.id, roleId);
  }

  // Assign multiple roles to user
  async assignRoles(roleIds, assignedBy = null, expiresAt = null) {
    const UserRole = require('./UserRole');
    return await UserRole.assignMultipleRoles(this.id, roleIds, assignedBy, expiresAt);
  }

  // Remove all roles from user
  async removeAllRoles() {
    const UserRole = require('./UserRole');
    return await UserRole.removeAllUserRoles(this.id);
  }

  // Check if user is admin
  async isAdmin() {
    return await this.hasRoleName('admin');
  }

  // Check if user is moderator
  async isModerator() {
    return await this.hasRoleName('moderator');
  }

  // Check if user can moderate (admin or moderator)
  async canModerate() {
    return await this.isAdmin() || await this.isModerator();
  }

  // Return user data without sensitive information, including roles
  async toJSONWithRoles() {
    const { password_hash, ...userWithoutPassword } = this;
    const roles = await this.getRoles();
    const permissions = await this.getPermissions();
    
    return {
      ...userWithoutPassword,
      roles,
      permissions
    };
  }

  // Return user data without sensitive information
  toJSON() {
    const { password_hash, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

module.exports = User;
