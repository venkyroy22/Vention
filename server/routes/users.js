import express from 'express';
import bcryptjs from 'bcryptjs';
import User from '../models/User.js';
import FriendRequest from '../models/FriendRequest.js';
import clerkAuth from '../middleware/clerkAuth.js';

const router = express.Router();

router.get('/', clerkAuth, async (req, res) => {
  try {
    const me = req.user._id;
    console.log('GET /api/users - Current user:', me);
    const users = await User.find({ _id: { $ne: me } }).select('name email avatar status lastSeen').limit(100);
    console.log('Found users count:', users.length);
    
    // Get existing friend requests
    const existingRequests = await FriendRequest.find({
      $or: [
        { from: me, to: { $in: users.map(u => u._id) } },
        { to: me, from: { $in: users.map(u => u._id) } }
      ]
    });
    
    const requestMap = {};
    existingRequests.forEach(fr => {
      const otherId = String(fr.from) === String(me) ? String(fr.to) : String(fr.from);
      requestMap[otherId] = {
        status: fr.status,
        requestId: fr._id,
        isSentByMe: String(fr.from) === String(me)
      };
    });
    
    res.json({ 
      users: users.map(u => ({
        id: u._id,
        clerkId: u.clerkId,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        status: u.status,
        lastSeen: u.lastSeen,
        friendRequest: requestMap[String(u._id)] || null
      })) 
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to list users', error: err.message });
  }
});

// Update avatar
router.put('/update-avatar', clerkAuth, async (req, res) => {
  try {
    const { avatar } = req.body;
    if (!avatar) {
      return res.status(400).json({ message: 'Avatar URL is required' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar },
      { new: true }
    ).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ 
      message: 'Avatar updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Avatar update error:', err);
    res.status(500).json({ message: 'Failed to update avatar', error: err.message });
  }
});

// Update name
router.put('/update-name', clerkAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim() },
      { new: true }
    ).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ 
      message: 'Name updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Name update error:', err);
    res.status(500).json({ message: 'Failed to update name', error: err.message });
  }
});

// Change password
router.put('/change-password', clerkAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both passwords are required' });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isValid = await bcryptjs.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await bcryptjs.hash(newPassword, 10);
    user.passwordHash = hashedPassword;
    await user.save();
    
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ message: 'Failed to change password', error: err.message });
  }
});

// Sync Clerk user to database (create or update)
router.post('/sync-clerk-user', async (req, res) => {
  try {
    const { clerkId, email, name, avatar } = req.body;
    
    if (!clerkId) {
      return res.status(400).json({ message: 'clerkId is required' });
    }
    
    // Try to find existing user by clerkId or email
    let user = await User.findOne({
      $or: [
        { clerkId },
        { email }
      ]
    });
    
    if (user) {
      // Update existing user - preserve custom name and avatar if already set
      user.clerkId = clerkId;
      user.email = email;
      // Only update name if user didn't have one yet (first sync)
      if (!user.name) {
        user.name = name;
      }
      // Only update avatar if user didn't have one yet (first sync)
      if (!user.avatar) {
        user.avatar = avatar;
      }
      await user.save();
    } else {
      // Create new user
      user = await User.create({
        clerkId,
        email,
        name,
        avatar,
        status: 'online',
      });
    }
    
    res.json({
      message: 'User synced successfully',
      user: {
        id: user._id,
        clerkId: user.clerkId,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      }
    });
  } catch (err) {
    console.error('Sync Clerk user error:', err);
    res.status(500).json({ message: 'Failed to sync Clerk user', error: err.message });
  }
});

export default router;
