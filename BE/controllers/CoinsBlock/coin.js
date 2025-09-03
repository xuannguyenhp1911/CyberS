const BotModel = require('../../models/bot.model')
const CoinsBlockModel = require('../../models/CoinsBlock/coin.model')
const ScannerByBitV3Model = require('../../models/Configs/ByBit/V3/scanner.model')
const ScannerOKXV1Model = require('../../models/Configs/OKX/V1/scanner.model')
const ScannerOKXV3Model = require('../../models/Configs/OKX/V3/scanner.model')

const InstrumentOKXV1Controller = {
    getAll: async (req, res) => {
        try {
            const data = await CoinsBlockModel.find({
                userID: req.user._id,
            }).sort({ _id: -1 })
            res.customResponse(res.statusCode, "Get All Successful", data);
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    create: async (req, res) => {
        try {

            const newBot = new CoinsBlockModel({
                ...req.body,
                userID: req.user._id,
            });

            const savedBot = await newBot.save();

            res.customResponse(res.statusCode, "Add New Successful", savedBot);

        } catch (error) {
            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Add New Error" });
        }
    },
    update: async (req, res) => {
        try {

            const groupID = req.params.id;

            const result = await CoinsBlockModel.updateOne({ _id: groupID }, { $set: req.body })

            if (result.acknowledged && result.matchedCount !== 0) {
                res.customResponse(200, "Update Successful", "");
            }
            else {
                res.customResponse(400, "Update failed", "");
            }

        } catch (error) {
            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Update Error" });
        }
    },
    getAllIDScannerForBlack: async (req, res) => {
        try {

            const data = req.body
            const userID = req.user._id
            const Market = data.Market
            const botType = data.botType
            let result
            const listBotByUserIDRes = await BotModel.find({
                userID,
                botType
            }, "_id")
            const listBotByUserID = listBotByUserIDRes.map(item => item._id)
            switch (botType) {
                case "ByBit_V3": {
                    result = await ScannerByBitV3Model.find({
                        botID: { $in: listBotByUserID },
                    })
                    break
                }
                case "OKX_V1": {
                    result = await ScannerOKXV1Model.find(
                        {
                            botID: { $in: listBotByUserID },
                            Market
                        },
                    );
                    break
                }
                case "OKX_V3": {
                    result = await ScannerOKXV3Model.find(
                        {
                            botID: { $in: listBotByUserID },
                        },
                    );
                    break
                }
            }
            res.customResponse(200, "Get Successful", result);

        } catch (error) {
            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Update Error" });
        }
    },
    getAllByMarket: async (req, res) => {
        try {
            const { Market, botType } = req.body
            
            const data = await CoinsBlockModel.find({
                userID: req.user._id,
                Market,
                botType
            })
            res.customResponse(res.statusCode, "Get Successful", data);
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
}
module.exports = InstrumentOKXV1Controller 