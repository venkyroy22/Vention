import express from 'express';
import { Webhook } from 'svix';
import User from '../models/User.js';

const router = express.Router();

export const clerkWebhookHandler = async (req, res) => {
  const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!CLERK_WEBHOOK_SECRET) {
    throw new Error('CLERK_WEBHOOK_SECRET not set');
  }

  const payload = req.body;
  const headers = req.headers;

  const wh = new Webhook(CLERK_WEBHOOK_SECRET);
  
  try {
    const evt = wh.verify(payload, headers);
    
    if (evt.type === 'user.created') {
      const user = await User.create({
        clerkId: evt.data.id,
        email: evt.data.email_addresses[0]?.email_address,
        name: evt.data.first_name || 'User',
        avatar: evt.data.image_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + evt.data.id,
        status: 'online',
      });
      res.json({ message: 'User created', user });
    } else if (evt.type === 'user.updated') {
      const user = await User.findOneAndUpdate(
        { clerkId: evt.data.id },
        {
          email: evt.data.email_addresses[0]?.email_address,
          name: evt.data.first_name || 'User',
          avatar: evt.data.image_url,
        },
        { new: true }
      );
      res.json({ message: 'User updated', user });
    } else if (evt.type === 'user.deleted') {
      await User.deleteOne({ clerkId: evt.data.id });
      res.json({ message: 'User deleted' });
    } else {
      res.json({ message: 'Event received' });
    }
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).json({ message: 'Webhook error', error: err.message });
  }
};

router.post('/webhook', express.raw({ type: 'application/json' }), clerkWebhookHandler);

export default router;
