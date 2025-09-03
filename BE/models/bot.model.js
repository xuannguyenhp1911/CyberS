const mongoose = require('../mongo');

const botSchema = new mongoose.Schema({
  botName: String,
  Balance: Number,
  botType: String,
  Status: String,
  Server: String,
  Version: String,
  note: String,
  telegramID: String,
  telegramToken: String,
  spotSavings: Number,
  Created: Date,
  // Bot Api
  ApiKey: String,
  SecretKey: String,
  Password: String,
  Demo: Boolean,
  // 
  userID: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
  },
  BotTypeID: {
    type: mongoose.Types.ObjectId,
    ref: 'BotType',
  },
  serverIP: {
    type: mongoose.Types.ObjectId,
    ref: 'Servers',

  },
  futureBalancePercent: Number,
  timeBalanceLoop: Number,

  botIDCopy: {
    type: mongoose.Types.ObjectId,
    ref: 'Bot',
  },
  botIDBeCopyList:[
    {
      type: mongoose.Types.ObjectId,
      ref: 'Bot',
    }
  ],
  volAutoOff: Number,
  maxSymbol: Number,
});


const Bot = mongoose.model('Bot', botSchema);

module.exports = Bot;
