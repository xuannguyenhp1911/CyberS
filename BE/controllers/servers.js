// const { ObjectId } = require('mongodb');
const serversModel = require('../models/servers.model');
const BotModel = require('../models/bot.model');
const ScannerByBitV3Model = require('../models/Configs/ByBit/V3/scanner.model');
const StrategiesModel = require('../models/Configs/ByBit/V3/config.model');

const BotTypeController = {
    closeAllBotForUpCodeByServerIP: async (req, res) => {
        const serverIP = req.params.id
        const { socketServer } = require('../serverConfig');
        socketServer.to(serverIP).emit("close-upcode", "")
        res.customResponse(200, "Send Successful", "");
    },
    restartByServerIP: async (req, res) => {
        const serverIP = req.params.id
        const { socketServer } = require('../serverConfig');
        socketServer.to(serverIP).emit("restart-code", "")
        res.customResponse(200, "Send Successful", "");
    },
    getAll: async (req, res) => {
        try {
            const userName = req.user.userName
            if (userName === "SuperAdmin") {
                const data = await serversModel.find().sort({ _id: -1 })
                res.customResponse(res.statusCode, "Get All Successful", data);
            }
            else {
                res.customResponse(400, "Permission Denied", "");
            }

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    getAllServerByBotType: async (req, res) => {
        try {
            const { botType } = req.body

            const data = await serversModel.find({
                botType,
                $expr: {
                    $and: [
                        { $isArray: "$botList" },
                        { $lt: [{ $size: "$botList" }, "$limit"] }
                    ]
                }
            }).select({ IP: 0 })
            res.customResponse(res.statusCode, "Get All Successful", data);


        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    create: async (req, res) => {
        try {

            const newBot = new serversModel(req.body);

            const savedBot = await newBot.save();

            res.customResponse(res.statusCode, "Add New Successful", savedBot);

        } catch (error) {
            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Add New Error" });
        }
    },
    addBotToServer: async (req, res) => {
        try {

            const { botID, serverID } = req.body;
            const addToServer = serversModel.updateOne(
                {
                    _id: serverID
                },
                {
                    $addToSet: { botList: botID }
                });
            const updateBot = BotModel.updateOne({ _id: botID }, {
                serverIP: serverID,
                Status: "Stopped"
            });
            await Promise.all([addToServer, updateBot]);
            res.customResponse(res.statusCode, "Set Server Successful", "");

        } catch (error) {
            console.log(error);
            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Set Server Error" });
        }
    },
    editServerBot: async (req, res) => {
        try {

            const { botID, serverID, serverIDOld } = req.body;

            await serversModel.updateOne(
                {
                    _id: serverIDOld
                },
                {
                    $pull: { botList: { $in: botID } }
                });
            const addToServer = serversModel.updateOne(
                {
                    _id: serverID
                },
                {
                    $addToSet: { botList: botID }
                });

            const updateBot = BotModel.updateMany({ _id: { $in: botID } }, {
                serverIP: serverID,
            });

            await Promise.all([addToServer, updateBot]);
            res.customResponse(res.statusCode, "Change Server Successful", "");

        } catch (error) {
            console.log(error);
            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Set Server Error" });
        }
    },
    update: async (req, res) => {
        try {

            const groupID = req.params.id;

            const result = await serversModel.updateOne({ _id: groupID }, { $set: req.body })

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
    delete: async (req, res) => {
        try {
            const serverID = req.params.id

            const result = await serversModel.deleteOne({ _id: serverID })

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

    setAuto: async () => {
        try {
            const allBot = await BotModel.find({
                $or: [
                    { serverIP: { $exists: false } },
                    { serverIP: null }
                ]
            });

            const allServers = await serversModel.find({
                $expr: {
                    $and: [
                        { $isArray: "$botList" },
                        { $lt: [{ $size: "$botList" }, "$limit"] }
                    ]
                }
            });

            const botAdded = []
            for (const server of allServers) {
                let botCount = server.botList.length; // Khởi tạo botCount cho mỗi server

                for (const botData of allBot) {
                    const botID = botData._id;

                    // Kiểm tra botType
                    if (botData.botType !== server.botType) {
                        continue; // Bỏ qua nếu botType không khớp
                    }

                    if (botCount < server.limit && !botAdded.includes(botID)) {
                        // Thêm bot vào botList
                        server.botList.push({ botID: botID });
                        botCount++;
                        botAdded.push(botID)
                        // Cập nhật serverIP cho bot
                        await BotModel.updateOne({ _id: botID }, { serverIP: server._id });
                    }
                }

                // Cập nhật server với botList mới
                await serversModel.updateOne({ _id: server._id }, { botList: server.botList });
            }

            // Kiểm tra các bot chưa được thêm
            const botsNotAdded = await BotModel.find({ serverIP: { $exists: false } });

            // Log ra các bot chưa được thêm
            if (botsNotAdded.length > 0) {
                console.log("[V] Bots not added:", botsNotAdded.length);
            } else {
                console.log(`[V] ${botAdded.length} have been added successfully`);
            }

            console.log("[V] Set Auto All Bot To Server Successful");

        } catch (error) {
            console.log("[!] Set Auto All Bot To Server Error:", error.message);
        }
    },

    removeAllServerIP: async () => {
        try {
            const updateBot = BotModel.updateMany({}, { serverIP: null, Status: "NotServer" });

            const deActiveScanner = ScannerByBitV3Model.updateMany({}, { IsActive: false })
            const deActiveStrategies = StrategiesModel.updateMany(
                {},
                {
                    $set: {
                        "children.$[].IsActive": false,
                    }
                },
            );

            await Promise.allSettled([updateBot, deActiveScanner, deActiveStrategies])
            console.log("[V] Remove All ServerIP Successful");

        } catch (error) {
            console.log("[!] Remove All ServerIP Error:", error.message);
        }
    },

    getAllBotIDByServerIP: async (serverIP) => {
        const data = await serversModel.findOne({ IP: serverIP })
        return data ? data.botList : []
    }


}

module.exports = BotTypeController 