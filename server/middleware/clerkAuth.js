import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

export const clerkAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Token is the Clerk user ID
    const user = await User.findOne({ clerkId: token });
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (err) {
    console.error('Clerk auth error:', err);
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

export default clerkAuth;
