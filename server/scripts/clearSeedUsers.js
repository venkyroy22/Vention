import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const seedEmails = [
  'elena@example.com',
  'marcus@example.com',
  'sarah@example.com',
];

const run = async () => {
  if (!process.env.MONGO_URL) {
    console.error('MONGO_URL not set');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 15000 });
  const res = await User.deleteMany({ email: { $in: seedEmails } });
  console.log(`Deleted ${res.deletedCount} seed users`);
  await mongoose.disconnect();
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
