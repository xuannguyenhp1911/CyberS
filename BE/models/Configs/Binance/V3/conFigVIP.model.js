const mongoose = require('../../../../mongo');

const botTypeSchema = new mongoose.Schema({
  scanQty:Number,
  scanPercent:Number,
  botQty:Number,
  botPercent:Number,
});


const BotType = mongoose.model('ConFigByBinanceV3VIP', botTypeSchema);

module.exports = BotType;
