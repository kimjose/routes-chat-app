# Database Setup Instructions

This guide will help you set up PostgreSQL for the Routes Chat App backend.

## Prerequisites

1. **PostgreSQL installed** on your system
   - Ubuntu/Debian: `sudo apt-get install postgresql postgresql-contrib`
   - macOS: `brew install postgresql`
   - Windows: Download from [postgresql.org](https://www.postgresql.org/download/)

2. **Node.js dependencies** installed
   ```bash
   npm install
   ```

## Database Setup

### 1. Create PostgreSQL Database

Connect to PostgreSQL as the postgres user:
```bash
sudo -u postgres psql
```

Create a new database and user:
```sql
-- Create database
CREATE DATABASE routes_chat_db;

-- Create user (replace with your preferred username/password)
CREATE USER your_username WITH PASSWORD 'your_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE routes_chat_db TO your_username;

-- Exit
\q
```

### 2. Configure Environment Variables

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and update the database URL:
   ```env
   DATABASE_URL=postgresql://your_username:your_password@localhost:5432/routes_chat_db
   ```

3. Update other environment variables as needed (JWT_SECRET, API keys, etc.)

### 3. Initialize Database Tables

You can initialize the database tables in two ways:

#### Option A: Automatic initialization (when starting the server)
```bash
npm run dev
```
The server will automatically create the users table when it starts.

#### Option B: Manual initialization
```bash
npm run init-db
```
This will create the users table without starting the server.

## Database Schema

### Users Table

The `users` table includes the following columns:

- `id` (SERIAL PRIMARY KEY): Unique user identifier
- `username` (VARCHAR): Unique username
- `email` (VARCHAR): Unique email address
- `password_hash` (VARCHAR): Bcrypt hashed password
- `first_name` (VARCHAR): User's first name (optional)
- `last_name` (VARCHAR): User's last name (optional)
- `profile_picture_url` (TEXT): URL to profile picture (optional)
- `is_active` (BOOLEAN): Soft delete flag (default: true)
- `created_at` (TIMESTAMP): Account creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp (auto-updated)

### Indexes

The following indexes are created for optimal performance:
- `idx_users_username` on `username`
- `idx_users_email` on `email`
- `idx_users_created_at` on `created_at`

### Triggers

- `update_users_updated_at`: Automatically updates the `updated_at` field when a user record is modified

## API Endpoints

### Authentication Endpoints

#### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword",
  "first_name": "John",
  "last_name": "Doe"
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword"
}
```

#### Get Profile
```
GET /api/auth/profile
Authorization: Bearer <your_jwt_token>
```

#### Update Profile
```
PUT /api/auth/profile
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "first_name": "Jane",
  "last_name": "Smith",
  "profile_picture_url": "https://example.com/avatar.jpg"
}
```

#### Change Password
```
PUT /api/auth/change-password
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

## Testing the Setup

1. Start the server:
   ```bash
   npm run dev
   ```

2. Test database connection by checking the server logs. You should see:
   ```
   Connected to PostgreSQL database
   Users table created successfully
   User indexes created successfully
   Updated_at trigger created successfully
   Database initialization completed
   Server running on port 5000
   ```

3. Test user registration:
   ```bash
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "username": "testuser",
       "email": "test@example.com",
       "password": "password123",
       "first_name": "Test",
       "last_name": "User"
     }'
   ```

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Check if PostgreSQL is running: `sudo systemctl status postgresql`
   - Verify database credentials in `.env` file
   - Ensure the database exists and user has proper permissions

2. **Permission denied for database**
   - Make sure you granted privileges to your user:
     ```sql
     GRANT ALL PRIVILEGES ON DATABASE routes_chat_db TO your_username;
     ```

3. **Port already in use**
   - Change the PORT in `.env` file or stop the process using port 5000

4. **JWT token issues**
   - Make sure JWT_SECRET is set in `.env` file
   - For production, use a strong, randomly generated secret

### Database Commands

Connect to your database:
```bash
psql -h localhost -U your_username -d routes_chat_db
```

View tables:
```sql
\dt
```

Describe users table:
```sql
\d users
```

View all users:
```sql
SELECT id, username, email, first_name, last_name, created_at FROM users;
```

## Security Notes

1. **Never commit `.env` file** to version control
2. **Use strong passwords** for database users
3. **Generate a secure JWT_SECRET** for production
4. **Enable SSL** for database connections in production
5. **Regularly update dependencies** to patch security vulnerabilities

## Next Steps

- Implement password reset functionality
- Add email verification
- Create additional tables for chat messages, rooms, etc.
- Add database migrations for schema changes
- Implement database backup strategies
