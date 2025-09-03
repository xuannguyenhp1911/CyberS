const { mongoose } = require("../../../mongo");

const groupCoinSchema = new mongoose.Schema({
  name: String,
  symbolList: [String],
  auto:Boolean,
  selectedMode:String,
  Platform: [String],
  forType:String,
  size: Number,
  userID: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
  },
});


const GroupCoinBinance = mongoose.model('GroupCoinBinance', groupCoinSchema);

module.exports = GroupCoinBinance;
