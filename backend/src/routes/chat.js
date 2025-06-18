const express = require('express');
const router = express.Router();

// Get chat history for a room
router.get('/history/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // TODO: Implement database query
    // For now, return mock data
    const mockMessages = [
      {
        id: 1,
        userId: 'user1',
        username: 'John',
        message: 'Hey, anyone know the best route to downtown?',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        roomId
      },
      {
        id: 2,
        userId: 'user2',
        username: 'Alice',
        message: 'I usually take the highway, it\'s faster',
        timestamp: new Date(Date.now() - 3300000).toISOString(),
        roomId
      }
    ];

    res.json({
      success: true,
      messages: mockMessages.slice(offset, offset + parseInt(limit)),
      total: mockMessages.length
    });

  } catch (error) {
    console.error('Chat history error:', error.message);
    res.status(500).json({
      error: 'Failed to get chat history'
    });
  }
});

// Get active rooms
router.get('/rooms', async (req, res) => {
  try {
    // TODO: Implement database query
    const mockRooms = [
      {
        id: 'general',
        name: 'General Chat',
        description: 'General discussion',
        memberCount: 45,
        lastActivity: new Date().toISOString()
      },
      {
        id: 'routes-help',
        name: 'Routes & Directions',
        description: 'Get help with routes and directions',
        memberCount: 23,
        lastActivity: new Date(Date.now() - 1800000).toISOString()
      },
      {
        id: 'local-nyc',
        name: 'New York City',
        description: 'Local chat for NYC area',
        memberCount: 67,
        lastActivity: new Date(Date.now() - 900000).toISOString()
      }
    ];

    res.json({
      success: true,
      rooms: mockRooms
    });

  } catch (error) {
    console.error('Rooms error:', error.message);
    res.status(500).json({
      error: 'Failed to get chat rooms'
    });
  }
});

// Create a new room
router.post('/rooms', async (req, res) => {
  try {
    const { name, description, isPrivate = false } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Room name is required'
      });
    }

    // TODO: Implement database creation
    const newRoom = {
      id: `room_${Date.now()}`,
      name,
      description: description || '',
      isPrivate,
      memberCount: 1,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      room: newRoom
    });

  } catch (error) {
    console.error('Create room error:', error.message);
    res.status(500).json({
      error: 'Failed to create chat room'
    });
  }
});

// Join a room
router.post('/rooms/:roomId/join', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required'
      });
    }

    // TODO: Implement database logic
    res.json({
      success: true,
      message: `Joined room ${roomId}`
    });

  } catch (error) {
    console.error('Join room error:', error.message);
    res.status(500).json({
      error: 'Failed to join chat room'
    });
  }
});

// Leave a room
router.post('/rooms/:roomId/leave', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required'
      });
    }

    // TODO: Implement database logic
    res.json({
      success: true,
      message: `Left room ${roomId}`
    });

  } catch (error) {
    console.error('Leave room error:', error.message);
    res.status(500).json({
      error: 'Failed to leave chat room'
    });
  }
});

module.exports = router;

