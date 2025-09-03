const mongoose = require('../../../../mongo');

const botTypeSchema = new mongoose.Schema({
  scanQty:Number,
  scanPercent:Number,
  botQty:Number,
  botPercent:Number,
});


const BotType = mongoose.model('ConfigOKXV3V', botTypeSchema);

module.exports = BotType;
