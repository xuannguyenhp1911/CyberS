const mongoose = require('../../../../mongo');

const positionV1Schema = new mongoose.Schema({
  Symbol: {
    type: String,
    required: true,
  },
  Side: String,
  Market: String,
  Quantity: Number,
  usdValue: Number,
  Pnl: Number,
  Time: Date,
  TimeUpdated: Date,
  Miss: Boolean,
  instType:String,
  mgnMode:String,
  ccy:String,
  botID: {
    type: mongoose.Types.ObjectId,
    ref: 'Bot',
    required: true,
  },
});


const positionOKXV1 = mongoose.model('positionOKXV1', positionV1Schema);
positionV1Schema.index({ Symbol: 1, botID: 1 }, { unique: true });

module.exports = positionOKXV1;
