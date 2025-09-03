const mongoose = require('../mongo');

const botTypeSchema = new mongoose.Schema({
  botType: String,
  name: String,
  IP: String,
  limit: Number,
  botList: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bot'
  }],
});


const Servers = mongoose.model('Servers', botTypeSchema);

module.exports = Servers;
