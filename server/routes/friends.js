import express from 'express';
import FriendRequest from '../models/FriendRequest.js';
import User from '../models/User.js';
import clerkAuth from '../middleware/clerkAuth.js';

const router = express.Router();

const shapeUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  avatar: u.avatar,
  status: u.status,
  lastSeen: u.lastSeen,
  clerkId: u.clerkId,
});

router.get('/accepted', clerkAuth, async (req, res) => {
  try {
    const me = req.user._id;
    const accepted = await FriendRequest.find({
      status: 'accepted',
      $or: [{ from: me }, { to: me }],
    });
    const ids = accepted.map(fr => String(fr.from) === String(me) ? fr.to : fr.from);
    const users = await User.find({ _id: { $in: ids } }).select('name email avatar status lastSeen clerkId');
    res.json({ friends: users.map(shapeUser) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load friends', error: err.message });
  }
});

router.get('/requests', clerkAuth, async (req, res) => {
  try {
    const me = req.user._id;
    const incoming = await FriendRequest.find({ to: me, status: 'pending' }).populate('from', 'name email avatar status lastSeen clerkId');
    const outgoing = await FriendRequest.find({ from: me, status: 'pending' }).populate('to', 'name email avatar status lastSeen clerkId');
    res.json({
      incoming: incoming.map(fr => ({ id: fr._id, from: shapeUser(fr.from), createdAt: fr.createdAt })),
      outgoing: outgoing.map(fr => ({ id: fr._id, to: shapeUser(fr.to), createdAt: fr.createdAt })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load requests', error: err.message });
  }
});

router.post('/request', clerkAuth, async (req, res) => {
  try {
    const me = req.user._id;
    const { to } = req.body;
    console.log('Friend request attempt:', { from: me, to, user: req.user });
    if (!to) return res.status(400).json({ message: 'Target user required' });
    if (String(to) === String(me)) return res.status(400).json({ message: 'Cannot friend yourself' });
    const exists = await FriendRequest.findOne({
      $or: [
        { from: me, to },
        { from: to, to: me },
      ],
    });
    if (exists) return res.status(400).json({ message: 'Request already exists' });
    const fr = await FriendRequest.create({ from: me, to, status: 'pending' });
    const io = req.app.get('io');
    io.to(String(to)).emit('friend:request', { id: fr._id, from: shapeUser(req.user) });
    res.status(201).json({ request: { id: fr._id, to } });
  } catch (err) {
    console.error('Friend request error:', err);
    res.status(500).json({ message: 'Failed to send request', error: err.message });
  }
});

router.post('/accept', clerkAuth, async (req, res) => {
  try {
    const me = req.user._id;
    const { requestId } = req.body;
    const fr = await FriendRequest.findOne({ _id: requestId, to: me, status: 'pending' }).populate('from', 'name email avatar status lastSeen');
    if (!fr) return res.status(404).json({ message: 'Request not found' });
    fr.status = 'accepted';
    await fr.save();
    const io = req.app.get('io');
    io.to(String(fr.from._id)).emit('friend:accepted', { id: fr._id, user: shapeUser(req.user) });
    res.json({ friend: shapeUser(fr.from) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to accept request', error: err.message });
  }
});

router.post('/decline', clerkAuth, async (req, res) => {
  try {
    const me = req.user._id;
    const { requestId } = req.body;
    const fr = await FriendRequest.findOne({ _id: requestId, to: me, status: 'pending' }).populate('from', 'name email avatar');
    if (!fr) return res.status(404).json({ message: 'Request not found' });
    fr.status = 'declined';
    await fr.save();
    const io = req.app.get('io');
    io.to(String(fr.from._id)).emit('friend:declined', { id: fr._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to decline request', error: err.message });
  }
});

export default router;
