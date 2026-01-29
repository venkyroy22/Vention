import mongoose from 'mongoose';

const connectDB = async (mongoUrl) => {
  if (!mongoUrl) throw new Error('MONGO_URL not provided');
  try {
    await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

export default connectDB;
