const mongoose = require('../../../../mongo');

const botTypeSchema = new mongoose.Schema({
  scanQty:Number,
  scanPercent:Number,
});


const BotType = mongoose.model('ScannerByBitV', botTypeSchema);

module.exports = BotType;
