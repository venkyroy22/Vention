import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function seedUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    
    // Clear existing users
    await User.deleteMany({});
    console.log('Cleared existing users');
    
    // Create test users
    const users = [
      {
        clerkId: 'user_test_1',
        name: 'Alice',
        email: 'alice@test.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
        status: 'online',
      },
      {
        clerkId: 'user_test_2',
        name: 'Bob',
        email: 'bob@test.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
        status: 'online',
      },
      {
        clerkId: 'user_test_3',
        name: 'Charlie',
        email: 'charlie@test.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie',
        status: 'online',
      },
    ];
    
    const createdUsers = await User.insertMany(users);
    console.log(`Created ${createdUsers.length} test users:`);
    createdUsers.forEach(u => console.log(`  - ${u.name} (${u.clerkId})`));
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error seeding users:', err);
    process.exit(1);
  }
}

seedUsers();
