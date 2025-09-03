
const mongoose = require("../../../../mongo");

const childrenStrategiesSchema = new mongoose.Schema({
  PositionSide: String,
  Amount: Number,
  Candlestick: String,
  IsActive: Boolean,
  TakeProfit: Number,
  ReduceTakeProfit: Number,
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
  // Other
  symbol: String,
  value: String,
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


const WaveByBitV3 = mongoose.model('WaveByBitV3', strategiesSchema);


module.exports = WaveByBitV3;
