import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const fixUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Find users without passwordHash
    const brokenUsers = await User.find({ passwordHash: { $exists: false } });
    console.log(`Found ${brokenUsers.length} users without passwordHash`);

    if (brokenUsers.length > 0) {
      console.log('Users to delete:');
      brokenUsers.forEach(u => console.log(`  - ${u.email} (${u.name})`));
      
      // Delete broken users so they can re-register
      const result = await User.deleteMany({ passwordHash: { $exists: false } });
      console.log(`Deleted ${result.deletedCount} broken user accounts`);
      console.log('These users need to sign up again with a proper password.');
    } else {
      console.log('All users have valid passwordHash fields.');
    }

    await mongoose.disconnect();
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

fixUsers();
