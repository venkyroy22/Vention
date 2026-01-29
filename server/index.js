import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import messageRoutes, { setSocketIO } from './routes/messages.js';
import noteRoutes from './routes/notes.js';
import taskRoutes from './routes/tasks.js';
import friendRoutes from './routes/friends.js';
import clerkRoutes from './routes/clerk.js';
import User from './models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

console.log('Allowed origins:', allowedOrigins);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Set Socket.io instance for message routes
setSocketIO(io);

app.set('io', io);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.options('*', cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/', (req, res) => res.json({ message: 'Welcome to the Vention API' }));

// Debug endpoint to manually create a test user (for development only)
app.post('/api/debug/create-test-user', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Not available in production' });
  }
  try {
    const { clerkId, name, email, avatar } = req.body;
    const user = await User.create({
      clerkId,
      name: name || 'Test User',
      email: email || `${clerkId}@test.com`,
      avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${clerkId}`,
      status: 'online',
    });
    res.status(201).json({ message: 'Test user created', user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create test user', error: err.message });
  }
});

// Debug endpoint to list all users
app.get('/api/debug/users', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Not available in production' });
  }
  try {
    const users = await User.find({}).select('-passwordHash');
    res.json({ users, count: users.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
});

// Debug endpoint to login as a test user (for development only)
app.post('/api/debug/login', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Not available in production' });
  }
  try {
    const { clerkId } = req.body;
    const user = await User.findOne({ clerkId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Return the Clerk ID as the token
    res.json({ 
      message: 'Login successful',
      token: user.clerkId,
      user: {
        id: user._id,
        clerkId: user.clerkId,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// Clerk webhook (no auth needed)
app.use('/api/clerk', clerkRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/friends', friendRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    console.log('Socket.io connection attempt with token:', token);
    if (!token) return next(new Error('No token'));
    // Token is now the Clerk user ID, not a JWT
    socket.userId = token;
    return next();
  } catch (err) {
    console.error('Socket.io auth error:', err);
    return next(new Error('Unauthorized'));
  }
});

io.on('connection', async (socket) => {
  const clerkId = socket.userId;
  console.log('User connected via Socket.io:', clerkId);
  if (clerkId) {
    socket.join(String(clerkId));
    console.log(`User ${clerkId} joined room ${clerkId}`);
    await User.findOneAndUpdate({ clerkId }, { status: 'online', lastSeen: new Date() });
    // Notify all connected users about this user being online
    io.emit('user:status', { userId: String(clerkId), status: 'online' });
  }

  socket.on('disconnect', async () => {
    console.log('User disconnected:', clerkId);
    if (clerkId) {
      await User.findOneAndUpdate({ clerkId }, { status: 'offline', lastSeen: new Date() });
      // Notify all connected users about this user being offline
      io.emit('user:status', { userId: String(clerkId), status: 'offline' });
    }
  });

  socket.on('typing', async ({ recipientId, isTyping }) => {
    console.log(`Typing event: ${clerkId} -> ${recipientId} (${isTyping ? 'typing' : 'stopped'})`);
    // recipientId is now clerkId, emit directly to that room
    io.to(String(recipientId)).emit('user:typing', { userId: String(clerkId), isTyping });
  });
});

const start = async () => {
  await connectDB(process.env.MONGO_URL);
  const port = process.env.PORT || 5000;
  server.listen(port, () => console.log(`Server listening on ${port}`));
};

start();
