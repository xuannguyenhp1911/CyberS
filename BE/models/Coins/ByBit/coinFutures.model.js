const { mongoose } = require("../../../mongo");

const coinSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    unique: true,
  },
  lastPrice: Number,
  price24hPcnt: Number,
  volume24h: Number,
  deliveryTime: Number,
});


const Coin = mongoose.model('Coin', coinSchema);

module.exports = Coin;
