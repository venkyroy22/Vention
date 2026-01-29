import express from 'express';
import Message from '../models/Message.js';
import User from '../models/User.js';
import clerkAuth from '../middleware/clerkAuth.js';

const router = express.Router();
let io; // Socket.io instance

export const setSocketIO = (socketIO) => {
  io = socketIO;
};

const mapMessage = (m) => ({
  id: m._id,
  senderId: m.sender?.toString?.() || m.sender,
  recipientId: m.recipient?.toString?.() || m.recipient,
  text: m.text,
  type: m.type,
  attachmentId: m.attachmentId,
  imageUrl: m.imageUrl,
  isViewed: m.isViewed || false,
  status: m.status,
  statusUpdatedAt: m.updatedAt?.getTime?.() || m.createdAt?.getTime?.() || Date.now(),
  reactions: (m.reactions || []).map(r => ({ emoji: r.emoji, count: r.count, userIds: r.userIds.map(String) })),
  timestamp: m.createdAt?.getTime?.() || Date.now(),
  isEdited: m.isEdited || false,
  editedAt: m.editedAt?.getTime?.() || null,
  replyTo: m.replyTo?.message ? {
    id: m.replyTo.message?.toString?.() || m.replyTo.message,
    text: m.replyTo.text || '',
    senderId: m.replyTo.sender?.toString?.() || m.replyTo.sender,
  } : undefined,
});

router.get('/:userId', clerkAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const me = req.user._id;
    const messages = await Message.find({
      $or: [
        { sender: me, recipient: userId },
        { sender: userId, recipient: me },
      ],
    }).sort({ createdAt: 1 });
    res.json({ messages: messages.map(mapMessage) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch messages', error: err.message });
  }
});

// Mark messages from :userId to me as read
router.post('/:userId/read', clerkAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const me = String(req.user._id);
    const toUpdate = await Message.find({ sender: userId, recipient: me, status: { $ne: 'read' } });
    if (toUpdate.length === 0) return res.json({ updated: 0 });
    const ids = toUpdate.map(m => m._id);
    const now = new Date();
    await Message.updateMany({ _id: { $in: ids } }, { $set: { status: 'read', updatedAt: now } });
    const io = req.app.get('io');
    
    // Get clerkIds for Socket.io room emission
    const sender = await User.findById(userId);
    const senderClerkId = sender?.clerkId;
    const meClerkId = req.user.clerkId;
    
    ids.forEach(id => {
      if (senderClerkId) {
        io.to(senderClerkId).emit('message:status', { messageId: String(id), status: 'read', statusUpdatedAt: now.getTime() });
      }
      if (meClerkId) {
        io.to(meClerkId).emit('message:status', { messageId: String(id), status: 'read', statusUpdatedAt: now.getTime() });
      }
    });
    res.json({ updated: ids.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark read', error: err.message });
  }
});

router.post('/', clerkAuth, async (req, res) => {
  try {
    const { to, text, type = 'text', attachmentId, replyToId, imageUrl } = req.body;
    if (!to || !text) return res.status(400).json({ message: 'Recipient and text are required' });

    let replyTo = undefined;
    if (replyToId) {
      const original = await Message.findById(replyToId);
      if (original) {
        replyTo = { message: original._id, text: original.text, sender: original.sender };
      }
    }

    const msg = await Message.create({
      sender: req.user._id,
      recipient: to,
      text,
      type,
      attachmentId,
      imageUrl,
      status: 'sent',
      replyTo,
    });

    const shaped = mapMessage(msg);
    const io = req.app.get('io');
    
    // Get recipient's clerkId for Socket.io room emission
    const recipient = await User.findById(to);
    const recipientClerkId = recipient?.clerkId;
    const senderClerkId = req.user.clerkId;
    
    // emit to recipient
    if (recipientClerkId) {
      console.log(`Emitting message:new to recipient room ${recipientClerkId}:`, shaped.id);
      io.to(String(recipientClerkId)).emit('message:new', shaped);
    }
    // emit to sender
    if (senderClerkId) {
      console.log(`Emitting message:new to sender room ${senderClerkId}:`, shaped.id);
      io.to(String(senderClerkId)).emit('message:new', shaped);
    }

    // Mark delivered after emission
    try {
      msg.status = 'delivered';
      await msg.save();
      if (recipientClerkId) {
        console.log(`Emitting message:status for ${msg._id} to ${recipientClerkId}`);
        io.to(String(recipientClerkId)).emit('message:status', { messageId: String(msg._id), status: 'delivered', statusUpdatedAt: msg.updatedAt?.getTime?.() || Date.now() });
      }
      if (senderClerkId) {
        console.log(`Emitting message:status for ${msg._id} to ${senderClerkId}`);
        io.to(String(senderClerkId)).emit('message:status', { messageId: String(msg._id), status: 'delivered', statusUpdatedAt: msg.updatedAt?.getTime?.() || Date.now() });
      }
    } catch {}

    res.status(201).json({ message: shaped });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send message', error: err.message });
  }
});

router.post('/:messageId/reaction', clerkAuth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const { messageId } = req.params;
    if (!emoji) return res.status(400).json({ message: 'Emoji is required' });

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    const userIdStr = String(req.user._id);
    const existingIdx = msg.reactions.findIndex(r => r.emoji === emoji);

    if (existingIdx > -1) {
      const hasReacted = msg.reactions[existingIdx].userIds.map(String).includes(userIdStr);
      if (hasReacted) {
        msg.reactions[existingIdx].userIds = msg.reactions[existingIdx].userIds.filter(id => String(id) !== userIdStr);
      } else {
        msg.reactions[existingIdx].userIds.push(req.user._id);
      }
      msg.reactions[existingIdx].count = msg.reactions[existingIdx].userIds.length;
      if (msg.reactions[existingIdx].count === 0) msg.reactions.splice(existingIdx, 1);
    } else {
      msg.reactions.push({ emoji, userIds: [req.user._id], count: 1 });
    }

    await msg.save();
    const shaped = mapMessage(msg);
    const io = req.app.get('io');
    
    // Get clerkIds for Socket.io room emission
    const sender = await User.findById(msg.sender);
    const recipient = await User.findById(msg.recipient);
    const senderClerkId = sender?.clerkId;
    const recipientClerkId = recipient?.clerkId;
    
    if (recipientClerkId) {
      io.to(String(recipientClerkId)).emit('message:new', shaped);
    }
    if (senderClerkId) {
      io.to(String(senderClerkId)).emit('message:new', shaped);
    }
    res.json({ message: shaped });
  } catch (err) {
    res.status(500).json({ message: 'Failed to react to message', error: err.message });
  }
});

router.put('/:messageId', clerkAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Text is required' });

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    // Only the sender can edit their message
    const userIdStr = String(req.user._id);
    if (String(msg.sender) !== userIdStr) {
      return res.status(403).json({ message: 'Not authorized to edit this message' });
    }

    msg.text = text;
    msg.isEdited = true;
    msg.editedAt = new Date();
    await msg.save();

    const shaped = mapMessage(msg);
    const io = req.app.get('io');
    
    // Get clerkIds for Socket.io room emission
    const sender = await User.findById(msg.sender);
    const recipient = await User.findById(msg.recipient);
    const senderClerkId = sender?.clerkId;
    const recipientClerkId = recipient?.clerkId;
    
    if (recipientClerkId) {
      io.to(String(recipientClerkId)).emit('message:edited', shaped);
    }
    if (senderClerkId) {
      io.to(String(senderClerkId)).emit('message:edited', shaped);
    }

    res.json({ message: shaped });
  } catch (err) {
    res.status(500).json({ message: 'Failed to edit message', error: err.message });
  }
});

router.delete('/:messageId', clerkAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const msg = await Message.findById(messageId);
    
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    
    // Allow both sender and recipient to delete messages
    const userIdStr = String(req.user._id);
    if (String(msg.sender) !== userIdStr && String(msg.recipient) !== userIdStr) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    await Message.findByIdAndDelete(messageId);
    
    const io = req.app.get('io');
    
    // Get clerkIds for Socket.io room emission
    const sender = await User.findById(msg.sender);
    const recipient = await User.findById(msg.recipient);
    const senderClerkId = sender?.clerkId;
    const recipientClerkId = recipient?.clerkId;
    
    if (recipientClerkId) {
      io.to(String(recipientClerkId)).emit('message:deleted', { messageId });
    }
    if (senderClerkId) {
      io.to(String(senderClerkId)).emit('message:deleted', { messageId });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete message', error: err.message });
  }
});

// Mark view-once image as viewed and delete it
router.post('/:messageId/view-once', clerkAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.type !== 'view-once-image') {
      return res.status(400).json({ message: 'Not a view-once message' });
    }

    // Only recipient can view
    if (String(message.recipient) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (message.isViewed) {
      return res.status(410).json({ message: 'Already viewed' });
    }

    // Mark as viewed
    message.isViewed = true;
    await message.save();

    // Get sender and recipient clerkIds for Socket.io emission
    const sender = await User.findById(message.sender);
    const recipient = await User.findById(message.recipient);

    // Emit to both users that message was viewed
    if (sender?.clerkId) {
      io.to(String(sender.clerkId)).emit('message:viewed', { messageId: String(message._id) });
    }
    if (recipient?.clerkId) {
      io.to(String(recipient.clerkId)).emit('message:viewed', { messageId: String(message._id) });
    }

    // Schedule deletion after 5 seconds
    setTimeout(async () => {
      try {
        await Message.findByIdAndDelete(messageId);
        
        // Emit deletion to both users
        if (sender?.clerkId) {
          io.to(String(sender.clerkId)).emit('message:deleted', { messageId: String(messageId) });
        }
        if (recipient?.clerkId) {
          io.to(String(recipient.clerkId)).emit('message:deleted', { messageId: String(messageId) });
        }
      } catch (err) {
        console.error('Failed to delete view-once message:', err);
      }
    }, 5000);

    res.json({ success: true, imageUrl: message.imageUrl });
  } catch (err) {
    res.status(500).json({ message: 'Failed to process view-once', error: err.message });
  }
});

export default router;
