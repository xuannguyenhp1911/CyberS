// const { ObjectId } = require('mongodb');
const BotTypeModel = require('../models/botType.model');

const BotTypeController = {
    getAll: async (req, res) => {
        try {
            const data = await BotTypeModel.find().sort({ name: -1 })
            res.customResponse(res.statusCode, "Get All Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    create: async (req, res) => {
        try {

            const newBot = new BotTypeModel(req.body);

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

            const result = await BotTypeModel.updateOne({ _id: groupID }, { $set: req.body })

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

    deleteMultiple: async (req, res) => {
        try {
            const groupIDList = req.body

            const result = await BotTypeModel.deleteMany({ _id: { $in: groupIDList } })

            if (result.deletedCount !== 0) {
                res.customResponse(200, "Delete Successful");
            }
            else {
                res.customResponse(400, "Delete failed", "");
            }

        } catch (error) {
            res.status(500).json({ message: "Delete Error" });
        }
    },


}

module.exports = BotTypeController 