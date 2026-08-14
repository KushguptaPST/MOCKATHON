const mongoose = require('mongoose');

const connectDB = async () => {
  const primaryURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tourist-safety-db';
  try {
    const conn = await mongoose.connect(primaryURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`⚠️ Primary Database connection failed: ${err.message}`);
    const localURI = 'mongodb://localhost:27017/tourist-safety-db';
    if (primaryURI !== localURI) {
      try {
        console.log('🔄 Attempting connection to local MongoDB fallback...');
        const conn = await mongoose.connect(localURI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 3000,
        });
        console.log(`✅ MongoDB Connected to Local Fallback: ${conn.connection.host}`);
        return;
      } catch (fallbackErr) {
        console.error(`⚠️ Local fallback MongoDB connection failed: ${fallbackErr.message}`);
      }
    }
    console.error('⚠️ Server continuing execution. Database functionality will be active when MongoDB is available.');
  }
};

module.exports = connectDB;
