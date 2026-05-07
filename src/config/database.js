require('dotenv').config();

module.exports = {
  // If USE_MONGODB is true, the entire bot will default to MongoDB
  // If false, it will fall back to the legacy SQLite structure
  useMongoDB: process.env.USE_MONGODB === 'true',
  
  // The MongoDB URI string to connect to
  mongoURI: process.env.MONGODB_URI || 'mongodb://localhost:27017/multibot'
};
