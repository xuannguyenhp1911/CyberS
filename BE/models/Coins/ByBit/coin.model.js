const mongoose = require('../../../mongo');

const instrumentsInfoSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    unique: true,
  },
  minOrderQty: Number,
  basePrecision: Number,
  market: String,
  tickSize: Number,
  volume24h: Number,
  lastPrice: Number,
  price24hPcnt: Number,
});


const CoinByBitV1 = mongoose.model('CoinByBitV1', instrumentsInfoSchema);

module.exports = CoinByBitV1;
