const { mongoose } = require("../../../mongo");

const groupCoinSchema = new mongoose.Schema({
  name: String,
  symbolList: [String],
  auto:Boolean,
  selectedMode:String,
  forType:String,
  market:String,
  size: Number,
  userID: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
  },
});


const GroupCoin = mongoose.model('GroupCoin', groupCoinSchema);

module.exports = GroupCoin;
