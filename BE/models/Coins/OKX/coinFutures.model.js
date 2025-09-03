const mongoose = require('../../../mongo');

const InstrumentOKXV1Schema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    unique: true,
  },
  minOrderQty: Number,
  basePrecision: Number,  
  ctVal: Number,   
  tickSize: Number,
  volume24h: Number,
  lastPrice: Number,
  price24hPcnt: Number,
  lever:Number,
});


const CoinOKXV1Futures = mongoose.model('CoinOKXV1Futures', InstrumentOKXV1Schema);

module.exports = CoinOKXV1Futures;
