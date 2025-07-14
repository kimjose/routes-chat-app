const { query } = require('../config/database');

class Role {
  constructor(roleData) {
    this.id = roleData.id;
    this.name = roleData.name;
    this.display_name = roleData.display_name;
    this.description = roleData.description;
    this.permissions = Array.isArray(roleData.permissions) 
      ? roleData.permissions 
      : (roleData.permissions ? JSON.parse(roleData.permissions) : []);
    this.is_active = roleData.is_active;
    this.created_at = roleData.created_at;
    this.updated_at = roleData.updated_at;
  }

  // Create a new role
  static async create(roleData) {
    const { name, display_name, description, permissions = [] } = roleData;
    
    const insertQuery = `
      INSERT INTO roles (name, display_name, description, permissions)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    try {
      const result = await query(insertQuery, [
        name,
        display_name,
        description,
        JSON.stringify(permissions)
      ]);

      return new Role(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Find role by ID
  static async findById(id) {
    const selectQuery = 'SELECT * FROM roles WHERE id = $1 AND is_active = true';
    
    try {
      const result = await query(selectQuery, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new Role(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Find role by name
  static async findByName(name) {
    const selectQuery = 'SELECT * FROM roles WHERE name = $1 AND is_active = true';
    
    try {
      const result = await query(selectQuery, [name]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new Role(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Get all roles
  static async findAll(includeInactive = false) {
    const selectQuery = includeInactive 
      ? 'SELECT * FROM roles ORDER BY name'
      : 'SELECT * FROM roles WHERE is_active = true ORDER BY name';
    
    try {
      const result = await query(selectQuery);
      return result.rows.map(row => new Role(row));
    } catch (error) {
      throw error;
    }
  }

  // Update role
  async update(updateData) {
    const allowedFields = ['display_name', 'description', 'permissions', 'is_active'];
    const updates = [];
    const values = [];
    let valueIndex = 1;

    // Build dynamic update query
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        if (field === 'permissions') {
          updates.push(`${field} = $${valueIndex}`);
          values.push(JSON.stringify(updateData[field]));
        } else {
          updates.push(`${field} = $${valueIndex}`);
          values.push(updateData[field]);
        }
        valueIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(this.id);
    const updateQuery = `
      UPDATE roles 
      SET ${updates.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING *
    `;

    try {
      const result = await query(updateQuery, values);
      
      if (result.rows.length === 0) {
        throw new Error('Role not found');
      }

      // Update current instance
      Object.assign(this, new Role(result.rows[0]));
      return this;
    } catch (error) {
      throw error;
    }
  }

  // Soft delete role
  async delete() {
    const deleteQuery = `
      UPDATE roles 
      SET is_active = false
      WHERE id = $1
      RETURNING id
    `;

    try {
      const result = await query(deleteQuery, [this.id]);
      
      if (result.rows.length === 0) {
        throw new Error('Role not found');
      }

      this.is_active = false;
      return this;
    } catch (error) {
      throw error;
    }
  }

  // Check if role has specific permission
  hasPermission(permission) {
    return this.permissions.includes(permission);
  }

  // Add permission to role
  async addPermission(permission) {
    if (!this.permissions.includes(permission)) {
      this.permissions.push(permission);
      await this.update({ permissions: this.permissions });
    }
    return this;
  }

  // Remove permission from role
  async removePermission(permission) {
    this.permissions = this.permissions.filter(p => p !== permission);
    await this.update({ permissions: this.permissions });
    return this;
  }

  // Get users with this role
  async getUsers() {
    const selectQuery = `
      SELECT u.*, ur.assigned_at, ur.expires_at, ur.assigned_by
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      WHERE ur.role_id = $1 AND ur.is_active = true AND u.is_active = true
      ORDER BY ur.assigned_at DESC
    `;

    try {
      const result = await query(selectQuery, [this.id]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Return role data as JSON
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      display_name: this.display_name,
      description: this.description,
      permissions: this.permissions,
      is_active: this.is_active,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Role;
