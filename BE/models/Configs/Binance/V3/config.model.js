const mongoose = require('../../../../mongo');

const strategiesSchema = new mongoose.Schema({
  
  OnlyPairs	: [String],
  Blacklist	: [String],

  Label: String,
  OrderChange: Number,
  PositionSide: String,
  Amount: Number,
  TP: Number,
  ReTP: Number,
  TimeTemp: String,
  IsActive: Boolean,
  IsBeta: Boolean,
  OCBonus: Number,
  TimeOCBonusExpire: Number,
  Numbs: Number,
  userID: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
  },
  groupCoinOnlyPairsID: {
    type: mongoose.Types.ObjectId, 
    ref: 'GroupCoinBinance',
  },
  groupCoinBlacklistID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupCoinBinance',
    required: false, 
  },
  botID: {
    type: mongoose.Types.ObjectId,
    ref: 'Bot',
  },

  // Other
  value: String,
  IsBookmark: Boolean,


})




const ConfigBinanceV3 = mongoose.model('ConfigBinanceV3', strategiesSchema);


module.exports = ConfigBinanceV3;
