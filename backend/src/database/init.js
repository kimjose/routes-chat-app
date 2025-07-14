const { query } = require('../config/database');
const { initializeRolesTables } = require('./roles-init');

const createUsersTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      profile_picture_url TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  try {
    await query(createTableQuery);
    console.log('Users table created successfully');
  } catch (error) {
    console.error('Error creating users table:', error);
    throw error;
  }
};

const createIndexes = async () => {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)'
  ];

  try {
    for (const indexQuery of indexes) {
      await query(indexQuery);
    }
    console.log('User indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
    throw error;
  }
};

const createUpdatedAtTrigger = async () => {
  // Create a function to update the updated_at timestamp
  const createFunctionQuery = `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `;

  // Create a trigger to automatically update the updated_at field
  const createTriggerQuery = `
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `;

  try {
    await query(createFunctionQuery);
    await query(createTriggerQuery);
    console.log('Updated_at trigger created successfully');
  } catch (error) {
    console.error('Error creating updated_at trigger:', error);
    throw error;
  }
};

const initializeUsersTable = async () => {
  try {
    await createUsersTable();
    await createIndexes();
    await createUpdatedAtTrigger();
    console.log('Users table initialization completed');
  } catch (error) {
    console.error('Error initializing users table:', error);
    throw error;
  }
};

const initializeAllTables = async () => {
  try {
    await initializeUsersTable();
    await initializeRolesTables();
    console.log('All database tables initialization completed');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  }
};

module.exports = {
  createUsersTable,
  createIndexes,
  createUpdatedAtTrigger,
  initializeUsersTable,
  initializeAllTables
};
