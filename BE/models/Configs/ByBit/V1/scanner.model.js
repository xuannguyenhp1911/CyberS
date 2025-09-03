const mongoose = require('../../../../mongo');

const strategiesSchema = new mongoose.Schema({
  Label: String,
  Market: String,
  PositionSide: String,
  TimeTemp: String,
  OrderChange: Number,
  Elastic: Number,
  Turnover: Number,
  Numbs: Number,
  Amount: Number,
  Limit: Number,
  Expire: Number,
  IsActive: Boolean,
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
})


const BigBabol = mongoose.model('BigBabol', strategiesSchema);


module.exports = BigBabol;
