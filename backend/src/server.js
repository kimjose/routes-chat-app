const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Database configuration and initialization
const { pool } = require('./config/database');
const { initializeAllTables } = require('./database/init');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const routesRoutes = require('./routes/routes');
const { router: rolesRoutes } = require('./routes/roles');
const usersRoutes = require('./routes/users');

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/routes', routesRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/users', usersRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a room (for group chats or location-based chat)
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Handle chat messages
  socket.on('send_message', (data) => {
    const { roomId, message, userId, username } = data;
    const messageData = {
      id: Date.now(),
      message,
      userId,
      username,
      timestamp: new Date().toISOString()
    };
    
    // Emit to room
    io.to(roomId).emit('receive_message', messageData);
    
    // TODO: Save message to database
    console.log('Message sent to room', roomId, messageData);
  });

  // Handle location sharing
  socket.on('share_location', (data) => {
    const { roomId, location, userId } = data;
    socket.to(roomId).emit('location_update', {
      userId,
      location,
      timestamp: new Date().toISOString()
    });
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const { roomId, userId, isTyping } = data;
    socket.to(roomId).emit('user_typing', { userId, isTyping });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

// Initialize database tables
const initializeDatabase = async () => {
  try {
    await initializeAllTables();
    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    await initializeDatabase();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT. Shutting down gracefully...');
  
  // Close database connections
  await pool.end();
  console.log('Database connections closed');
  
  // Close server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

startServer();

module.exports = { app, server, io };

