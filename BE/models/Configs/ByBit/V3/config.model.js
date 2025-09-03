
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
    ref: 'ScannerV3',
  },
  // Other
  symbol: String,
  value: String,
  Expire: Number,

  IsOCWait: Boolean,
  IsDev: Boolean,

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


const Strategies = mongoose.model('Strategies', strategiesSchema);


module.exports = Strategies;
