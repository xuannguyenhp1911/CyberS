const mongoose = require('../../../mongo');

const CoinOKXV1Schema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    unique: true,
  },
  minOrderQty: Number,
  basePrecision: Number,   // lotSz
  market: String,
  tickSize: Number,
  volume24h: Number,
  lastPrice: Number,
  price24hPcnt: Number,
  lever:Number,
});


const CoinOKXV1 = mongoose.model('CoinOKXV1', CoinOKXV1Schema);

module.exports = CoinOKXV1;
