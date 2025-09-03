const mongoose = require('../../../../mongo');

const strategiesSchema = new mongoose.Schema({
  botID: {
    type: mongoose.Types.ObjectId,
    ref: 'Bot',
  },
  Label: String,

  Frame: String,
  Range:String,
  OCLength: Number,
  
  Candle: String,
  OnlyPairs	: [String],
  Blacklist	: [String],

  OrderChange: Number,
  Adjust: Number,
  
  Longest: String,
  Elastic: String,
  Ratio: String,

  Amount: Number,
  TP: Number,
  ReTP: Number,
  Entry: Number,
  PositionSide: String,
  Expire: Number,
  Limit: Number,

  TimeTemp: String,
  Turnover: Number,
  IsActive: Boolean,
  IsBeta: Boolean,
 
  userID: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
  },
  groupCoinOnlyPairsID: {
    type: mongoose.Types.ObjectId,
    ref: 'GroupCoinOKXV3',
  },
  groupCoinBlacklistID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupCoinOKXV3',
    required: false, 
  },
  
  // Other
  value: String,
  IsBookmark: Boolean,
  Mode: String,

})


const ScannerOKXV3 = mongoose.model('ScannerOKXV3', strategiesSchema);


module.exports = ScannerOKXV3;
