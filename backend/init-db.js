#!/usr/bin/env node

/**
 * Database initialization script
 * Run this script to initialize the database tables manually
 */

require('dotenv').config();
const { initializeUsersTable } = require('./src/database/init');
const { pool } = require('./src/config/database');

async function runInit() {
  try {
    console.log('Starting database initialization...');
    
    // Test database connection
    const client = await pool.connect();
    console.log('Database connection successful');
    client.release();
    
    // Initialize users table
    await initializeUsersTable();
    
    console.log('Database initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

runInit();
