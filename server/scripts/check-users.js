import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

mongoose.connect(process.env.MONGO_URL).then(async () => {
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}).toArray();
  console.log('Total users in database:', users.length);
  users.forEach(u => {
    console.log(`- ${u.name} (${u.email}) | clerkId: ${u.clerkId} | _id: ${u._id}`);
  });
  await mongoose.disconnect();
  process.exit(0);
}).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
