import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixFriendRequests = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('friendrequests');

    // Drop all indexes except _id
    console.log('Dropping old indexes...');
    const indexes = await collection.indexes();
    for (const index of indexes) {
      if (index.name !== '_id_') {
        console.log(`  Dropping index: ${index.name}`);
        await collection.dropIndex(index.name);
      }
    }

    // Clear all friend requests to start fresh
    console.log('Clearing all friend requests...');
    const result = await collection.deleteMany({});
    console.log(`  Deleted ${result.deletedCount} documents`);

    // Create the correct index
    console.log('Creating new index...');
    await collection.createIndex({ from: 1, to: 1 }, { unique: true });
    console.log('  Index created: from_1_to_1');

    await mongoose.disconnect();
    console.log('Done! Friend requests collection is now clean.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

fixFriendRequests();
