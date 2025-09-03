const mongoose = require('mongoose');
require('dotenv').config();

const mongodbServerIP = process.env.SERVER_WEB

mongoose.connect(`mongodb://${mongodbServerIP}:27017/crypto-bot`, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('[V] Connected to MongoDB successful');
}).catch((err) => {
  console.error('Error connecting to MongoDB:', err);
});

module.exports = mongoose;