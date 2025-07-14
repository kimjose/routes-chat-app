# Roles and Permissions System

This document describes the roles and permissions system implemented in the Routes Chat App backend.

## Database Schema

### Tables

#### 1. `roles` Table
Defines application roles with their permissions.

```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. `user_roles` Table
Junction table for many-to-many relationship between users and roles.

```sql
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  assigned_by INTEGER,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  
  CONSTRAINT fk_user_roles_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role_id 
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_assigned_by 
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT unique_user_role UNIQUE(user_id, role_id)
);
```

## Default Roles

The system comes with four predefined roles:

### 1. Admin (`admin`)
- **Description**: Full system access with all permissions
- **Permissions**: 
  - `user.read`, `user.write`, `user.delete`
  - `role.read`, `role.write`, `role.delete`
  - `chat.moderate`, `route.manage`

### 2. Moderator (`moderator`)
- **Description**: Can moderate chats and manage basic user interactions
- **Permissions**: 
  - `user.read`, `chat.moderate`, `route.read`

### 3. Regular User (`user`)
- **Description**: Standard user with basic permissions
- **Permissions**: 
  - `user.read.own`, `chat.participate`, `route.read`, `route.create`

### 4. Guest (`guest`)
- **Description**: Limited access for unregistered users
- **Permissions**: 
  - `route.read`

## Permission System

### Available Permissions

#### User Permissions
- `user.read` - View all user profiles
- `user.read.own` - View own profile only
- `user.write` - Create/update user profiles
- `user.delete` - Delete user accounts

#### Role Permissions
- `role.read` - View roles and assignments
- `role.write` - Create/update roles and assign them
- `role.delete` - Delete roles

#### Chat Permissions
- `chat.participate` - Participate in chats
- `chat.moderate` - Moderate chat conversations

#### Route Permissions
- `route.read` - View routes
- `route.create` - Create new routes
- `route.manage` - Full route management

## API Endpoints

### Role Management

#### Get All Roles
```http
GET /api/roles
Authorization: Bearer <token>
```

#### Get Specific Role
```http
GET /api/roles/:id
Authorization: Bearer <token>
```

#### Create New Role
```http
POST /api/roles
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "custom_role",
  "display_name": "Custom Role",
  "description": "A custom role for specific purposes",
  "permissions": ["user.read", "chat.participate"]
}
```

#### Update Role
```http
PUT /api/roles/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "display_name": "Updated Role Name",
  "description": "Updated description",
  "permissions": ["user.read", "chat.participate", "route.read"]
}
```

#### Delete Role
```http
DELETE /api/roles/:id
Authorization: Bearer <token>
```

#### Assign Role to User
```http
POST /api/roles/:roleId/assign/:userId
Authorization: Bearer <token>
Content-Type: application/json

{
  "expires_at": "2025-12-31T23:59:59Z"  // Optional
}
```

#### Remove Role from User
```http
DELETE /api/roles/:roleId/remove/:userId
Authorization: Bearer <token>
```

### User Management

#### Get All Users
```http
GET /api/users?page=1&limit=50
Authorization: Bearer <token>
```

#### Get User with Roles
```http
GET /api/users/:id
Authorization: Bearer <token>
```

#### Get User's Roles
```http
GET /api/users/:id/roles?include_expired=false
Authorization: Bearer <token>
```

#### Assign Role to User
```http
POST /api/users/:userId/roles/:roleId
Authorization: Bearer <token>
Content-Type: application/json

{
  "expires_at": "2025-12-31T23:59:59Z"  // Optional
}
```

#### Assign Multiple Roles to User
```http
POST /api/users/:userId/roles
Authorization: Bearer <token>
Content-Type: application/json

{
  "role_ids": [1, 2, 3],
  "expires_at": "2025-12-31T23:59:59Z"  // Optional
}
```

#### Remove Role from User
```http
DELETE /api/users/:userId/roles/:roleId
Authorization: Bearer <token>
```

#### Check User Permission
```http
GET /api/users/:id/permissions/:permission
Authorization: Bearer <token>
```

## Model Usage Examples

### Using the User Model

```javascript
const User = require('./models/User');

// Get user with roles
const user = await User.findById(1);
const roles = await user.getRoles();
const permissions = await user.getPermissions();

// Check permissions
const canModerate = await user.hasPermission('chat.moderate');
const isAdmin = await user.isAdmin();

// Assign roles
await user.assignRole(2); // Assign role ID 2
await user.assignRoles([2, 3]); // Assign multiple roles

// Get user with roles in JSON
const userWithRoles = await user.toJSONWithRoles();
```

### Using the Role Model

```javascript
const Role = require('./models/Role');

// Create new role
const newRole = await Role.create({
  name: 'content_manager',
  display_name: 'Content Manager',
  description: 'Can manage content',
  permissions: ['content.read', 'content.write']
});

// Find role and check permissions
const role = await Role.findByName('admin');
const hasPermission = role.hasPermission('user.delete');

// Add permission to role
await role.addPermission('new.permission');
```

### Using the UserRole Model

```javascript
const UserRole = require('./models/UserRole');

// Check if user has role
const hasRole = await UserRole.userHasRole(userId, roleId);

// Get all users with specific role
const admins = await UserRole.getUsersWithRole(adminRoleId);

// Clean up expired roles
await UserRole.cleanupExpiredRoles();
```

## Middleware Usage

### Permission-based Access Control

```javascript
const { requirePermission, requireAdmin } = require('./routes/roles');

// Require specific permission
router.get('/admin-data', requirePermission('admin.read'), (req, res) => {
  // Only users with 'admin.read' permission can access this
});

// Require admin role
router.delete('/sensitive-data', requireAdmin, (req, res) => {
  // Only admins can access this
});
```

## Security Considerations

### 1. Role Assignment Protection
- Only users with `user.write` permission can assign roles
- Prevents removal of admin role from the last administrator
- System roles (`admin`, `user`, `guest`) cannot be deleted

### 2. Permission Validation
- All role-based routes require authentication
- Permissions are checked on every request
- Expired role assignments are automatically disabled

### 3. Data Integrity
- Foreign key constraints ensure data consistency
- Soft delete for users and roles preserves historical data
- Unique constraints prevent duplicate role assignments

## Common Operations

### Setup First Admin User

1. Create a user through normal registration
2. Manually assign admin role via database:

```sql
-- Find the user ID and admin role ID
SELECT u.id as user_id, r.id as role_id 
FROM users u, roles r 
WHERE u.email = 'admin@example.com' AND r.name = 'admin';

-- Assign admin role
INSERT INTO user_roles (user_id, role_id) VALUES (user_id, role_id);
```

### Clean Up Expired Roles

```javascript
// Run periodically to clean up expired role assignments
await UserRole.cleanupExpiredRoles();
```

### Check User Permissions

```javascript
// Check if current user can perform an action
const currentUser = await User.findById(req.user.userId);
const canDelete = await currentUser.hasPermission('user.delete');

if (!canDelete) {
  return res.status(403).json({ error: 'Insufficient permissions' });
}
```

## Migration and Updates

When updating the roles system:

1. **Adding new permissions**: Update role permissions using the API or directly in the database
2. **Creating new roles**: Use the API to create roles with appropriate permissions
3. **Modifying existing roles**: Use the update role API endpoint

## Troubleshooting

### Common Issues

1. **Cannot assign admin role**: Ensure you have `user.write` permission
2. **Last admin deletion**: System prevents removing the last administrator
3. **Permission denied**: Check user's role assignments and role permissions
4. **Expired roles**: Run cleanup script or check role expiration dates

### Debug Queries

```sql
-- Check user's current roles and permissions
SELECT u.username, r.name as role_name, r.permissions, ur.expires_at
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.id = :user_id AND ur.is_active = true;

-- Find users with specific permission
SELECT DISTINCT u.username
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE r.permissions ? 'specific.permission'
AND ur.is_active = true;
```
