const { Pool } = require('pg');
require('dotenv').config();

// Create a new pool instance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test the connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

// Helper function to execute queries
const query = (text, params) => {
  return pool.query(text, params);
};

// Helper function to get a client from the pool
const getClient = () => {
  return pool.connect();
};

module.exports = {
  pool,
  query,
  getClient
};
