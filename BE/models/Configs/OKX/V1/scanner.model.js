const mongoose = require('../../../../mongo');

const strategiesSchema = new mongoose.Schema({
  Label: String,
  Market: String,
  PositionSide: String,
  TimeTemp: String,
  OrderChange: Number,
  Elastic: Number,
  Turnover: Number,
  MaxTurnover: Number,
  Numbs: Number,
  Amount: Number,
  AmountAutoPercent: Number,
  AmountExpire: Number,
  Limit: Number,
  Expire: Number,
  IsActive: Boolean,
  Reverse: Boolean,
  Adaptive: Boolean,
  OnlyPairs	: [String],
  Blacklist	: [String],
  botID: {
    type: mongoose.Types.ObjectId,
    ref: 'Bot',
  },
  userID: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
  },
  // Other
  value: String,
  IsBookmark: Boolean,
  XOCPump:Number,
  IsBeta: Boolean,
  Raceme: Boolean,
  FourB: Boolean,
  Alpha: Number,
})


const ScannerOKX = mongoose.model('ScannerOKX', strategiesSchema);


module.exports = ScannerOKX;
