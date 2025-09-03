
const mongoose = require("../../../../mongo");

const childrenStrategiesSchema = new mongoose.Schema({
  PositionSide: String,
  Amount: Number,
  OrderChange: Number,
  Candlestick: String,
  TakeProfit: Number,
  ReduceTakeProfit: Number,
  ExtendedOCPercent: Number,
  Ignore: Number,
  EntryTrailing: Number,
  StopLose: Number,
  IsActive: Boolean,
  IsBeta: Boolean,
  Remember: Boolean,
  TimeTemp: String,
  botID: {
    type: mongoose.Types.ObjectId,
    ref: 'Bot',
  },
  userID: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
  },
  scannerID: {
    type: mongoose.Types.ObjectId,
    ref: 'ScannerOKXV3',
  },
  // Other
  symbol: String,
  value: String,
  Expire: Number,
  Mode: String,

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
  children: [childrenStrategiesSchema]
})


const ConfigOKXV3 = mongoose.model('ConfigOKXV3', strategiesSchema);


module.exports = ConfigOKXV3;
