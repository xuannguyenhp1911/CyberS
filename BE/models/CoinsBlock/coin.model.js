
const mongoose = require('../../mongo');

const strategiesSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
  },
  botType: String,
  Market: String,
  SymbolList: [String],
});


const CoinsBlock = mongoose.model('CoinsBlock', strategiesSchema);


module.exports = CoinsBlock;
