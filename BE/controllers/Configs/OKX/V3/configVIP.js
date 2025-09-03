// const { ObjectId } = require('mongodb');
const BotTypeModel = require('../../../../models/Configs/OKX/V3/conFigV.model')

const BotTypeController = {
    sendDataRealtime: ({
        type,
        data,
    }) => {
        const { socketServer } = require('../../../../serverConfig');
        socketServer.to("OKX_V3").emit(type, data)
    },
    getAll: async (req, res) => {
        try {
            const data = await BotTypeModel.findOne()
            res.customResponse(res.statusCode, "Get All Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    create: async (req, res) => {
        try {

            const data = req.body
            const result = await BotTypeModel.updateOne({}, { $set: data }, { upsert: true })

            if (result.acknowledged && result.matchedCount !== 0) {
                res.customResponse(200, "Update Successful", "");
                BotTypeController.sendDataRealtime({
                    data,
                    type: "set-clearV"
                })

            }
            else {
                res.customResponse(400, "Update failed", "");
            }

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
    clearV: async (req, res) => {
        try {

            await BotTypeController.sendDataRealtime({
                data: "",
                type: "clearV"
            })
            res.customResponse(200, "Send TK Successful", "");

        } catch (error) {
            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Send TK Error" });
        }
    },
    getClearVDataBE: async (req, res) => {
        try {
            const data = await BotTypeModel.findOne()
            return data

        } catch (err) {
            return {}
        }
    },

}

module.exports = BotTypeController 