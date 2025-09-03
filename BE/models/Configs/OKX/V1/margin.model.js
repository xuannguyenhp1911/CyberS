const mongoose = require('../../../../mongo');

const childrenStrategiesSchema = new mongoose.Schema({
  PositionSide: String,
  Amount: Number,
  OrderChange: Number,
  TimeTemp: String,
  AmountAutoPercent: Number,
  AmountExpire: Number,
  AmountIncreaseOC: Number,
  Limit: Number,
  Expire: Number,
  IsActive: Boolean,
  Reverse: Boolean,
  Adaptive: Boolean,
  Remember: Boolean,
  IsBeta: Boolean,
  botID: {
    type: mongoose.Types.ObjectId,
    ref: 'Bot',
  },
  userID: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
  },
  // Other
  symbol: String,
  value: String,
  scannerID: {
    type: mongoose.Types.ObjectId,
    ref: 'ScannerOKX',
  },
  XOCPump:Number,

});

const strategiesSchema = new mongoose.Schema({
  label: {
    type: String,
    unique: true,
  },
  value: {
    type: String,
    unique: true,
  },
  volume24h: Number,
  bookmarkList: [String],
  children: [childrenStrategiesSchema],
})


const MarginOKX = mongoose.model('MarginOKX', strategiesSchema);


module.exports = MarginOKX;
