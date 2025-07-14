const { query } = require('../config/database');

const createRolesTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      display_name VARCHAR(100) NOT NULL,
      description TEXT,
      permissions JSONB DEFAULT '[]'::jsonb,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  try {
    await query(createTableQuery);
    console.log('Roles table created successfully');
  } catch (error) {
    console.error('Error creating roles table:', error);
    throw error;
  }
};

const createUserRolesTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS user_roles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      assigned_by INTEGER,
      assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP WITH TIME ZONE,
      is_active BOOLEAN DEFAULT true,
      
      CONSTRAINT fk_user_roles_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
        
      CONSTRAINT fk_user_roles_role_id 
        FOREIGN KEY (role_id) 
        REFERENCES roles(id) 
        ON DELETE CASCADE,
        
      CONSTRAINT fk_user_roles_assigned_by 
        FOREIGN KEY (assigned_by) 
        REFERENCES users(id) 
        ON DELETE SET NULL,
        
      CONSTRAINT unique_user_role 
        UNIQUE(user_id, role_id)
    )
  `;

  try {
    await query(createTableQuery);
    console.log('User roles table created successfully');
  } catch (error) {
    console.error('Error creating user_roles table:', error);
    throw error;
  }
};

const createRoleIndexes = async () => {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name)',
    'CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_roles_is_active ON user_roles(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_user_roles_expires_at ON user_roles(expires_at)'
  ];

  try {
    for (const indexQuery of indexes) {
      await query(indexQuery);
    }
    console.log('Role indexes created successfully');
  } catch (error) {
    console.error('Error creating role indexes:', error);
    throw error;
  }
};

const createRolesTriggers = async () => {
  // Trigger for roles table
  const createRolesTriggerQuery = `
    DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
    CREATE TRIGGER update_roles_updated_at
        BEFORE UPDATE ON roles
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `;

  try {
    await query(createRolesTriggerQuery);
    console.log('Roles updated_at trigger created successfully');
  } catch (error) {
    console.error('Error creating roles trigger:', error);
    throw error;
  }
};

const insertDefaultRoles = async () => {
  const defaultRoles = [
    {
      name: 'admin',
      display_name: 'Administrator',
      description: 'Full system access with all permissions',
      permissions: ['user.read', 'user.write', 'user.delete', 'role.read', 'role.write', 'role.delete', 'chat.moderate', 'route.manage']
    },
    {
      name: 'driver',
      display_name: 'Driver',
      description: 'Can manage basic user interactions. Create trips and manage routes',
      permissions: ['user.read', 'chat.moderate', 'route.read']
    },
    {
      name: 'user',
      display_name: 'Regular User',
      description: 'Standard user with basic permissions',
      permissions: ['user.read.own', 'chat.participate', 'route.read']
    },
    {
      name: 'guest',
      display_name: 'Guest User',
      description: 'Limited access for unregistered users',
      permissions: ['route.read']
    }
  ];

  try {
    for (const role of defaultRoles) {
      const insertQuery = `
        INSERT INTO roles (name, display_name, description, permissions)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (name) DO NOTHING
      `;
      
      await query(insertQuery, [
        role.name,
        role.display_name,
        role.description,
        JSON.stringify(role.permissions)
      ]);
    }
    console.log('Default roles inserted successfully');
  } catch (error) {
    console.error('Error inserting default roles:', error);
    throw error;
  }
};

const assignDefaultUserRole = async () => {
  // This function will be called to assign default 'user' role to existing users
  const assignQuery = `
    INSERT INTO user_roles (user_id, role_id)
    SELECT u.id, r.id
    FROM users u
    CROSS JOIN roles r
    WHERE r.name = 'user'
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = u.id AND ur.role_id = r.id
    )
  `;

  try {
    const result = await query(assignQuery);
    console.log(`Default user role assigned to ${result.rowCount} users`);
  } catch (error) {
    console.error('Error assigning default user roles:', error);
    throw error;
  }
};

const initializeRolesTables = async () => {
  try {
    await createRolesTable();
    await createUserRolesTable();
    await createRoleIndexes();
    await createRolesTriggers();
    await insertDefaultRoles();
    await assignDefaultUserRole();
    console.log('Roles tables initialization completed');
  } catch (error) {
    console.error('Error initializing roles tables:', error);
    throw error;
  }
};

module.exports = {
  createRolesTable,
  createUserRolesTable,
  createRoleIndexes,
  createRolesTriggers,
  insertDefaultRoles,
  assignDefaultUserRole,
  initializeRolesTables
};
