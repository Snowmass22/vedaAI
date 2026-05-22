import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/veda-ai';
  
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri);
    console.log('MongoDB successfully connected.');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};
