// const { ObjectId } = require('mongodb');
const groupCoinModel = require('../../../models/Coins/ByBit/groupCoinV3.model');
const ScannerByBitV3Model = require('../../../models/Configs/ByBit/V3/scanner.model');
const StrategiesModel = require('../../../models/Configs/ByBit/V3/config.model');
const ServerModel = require('../../../models/servers.model');

const GroupCoinController = {
    sendDataRealtime: ({
        type,
        data,
        serverIP
    }) => {
        const { socketServer } = require('../../../serverConfig');
        socketServer.to(serverIP).emit(type, data)
    },
    handleSendDataRealtime: ({
        type,
        data = []
    }) => {
        const groupedByBotID = data.reduce((acc, item) => {
            const serverIP = item.botID.serverIP

            if (!acc[serverIP]) {
                acc[serverIP] = [];
            }

            acc[serverIP].push(item);

            return acc;
        }, {});

        const list = Object.keys(groupedByBotID)
        list?.length > 0 && Promise.allSettled(list.map(async serverIPID => {
            
            const resData = await ServerModel.findOne({_id: serverIPID})

            if (!resData) return
            const serverIP = resData.IP
            
            const dataToSend = groupedByBotID[serverIPID];


            dataToSend?.length > 0 && GroupCoinController.sendDataRealtime({
                type,
                serverIP,
                data: dataToSend
            });
        }))
    },
    getAll: async (req, res) => {
        try {
            const userID = req.user._id
            const data = await groupCoinModel.find({ userID }).sort({ _id: -1 })
            res.customResponse(res.statusCode, "Get All Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    create: async (req, res) => {
        try {
            const userID = req.user._id

            const newBot = new groupCoinModel({ ...req.body, userID });

            const savedBot = await newBot.save();

            res.customResponse(res.statusCode, "Add Successful", savedBot);

        } catch (error) {
            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Add Error" });
        }
    },
    update: async (req, res) => {
        try {

            const newData = req.body
            const groupID = req.params.id;

            const result = await groupCoinModel.updateOne({ _id: groupID }, { $set: newData })

            if (result.acknowledged && result.matchedCount !== 0) {
                const groupCoinConditionID = newData.forType === "OnlyPairs" ? { groupCoinOnlyPairsID: groupID } : { groupCoinBlacklistID: groupID }
                const scannerFilter = await ScannerByBitV3Model.find({
                    ...groupCoinConditionID,
                    IsActive: true
                }).populate(['botID', "groupCoinOnlyPairsID", 'groupCoinBlacklistID'])

                const listIDScanner = scannerFilter.map(item=>item._id)
                const resultFilterSpot = await StrategiesModel.aggregate([
                    {
                        $match: {
                            "children.scannerID": { $in: listIDScanner }
                        }
                    },
                    {
                        $project: {
                            label: 1,
                            value: 1,
                            volume24h: 1,
                            children: {
                                $filter: {
                                    input: "$children",
                                    as: "child",
                                    cond: {
                                        $in: ["$$child.scannerID", listIDScanner]
                                    }
                                }
                            }
                        }
                    }
                ]);

                const resultGetSpot = await StrategiesModel.populate(resultFilterSpot, {
                    path: 'children.botID',
                }) || []


                const handleResultDelete = resultGetSpot.flatMap((data) => data.children.map(child => {
                    child.symbol = data.value
                    child.value = `${data._id}-${child._id}`
                    return child
                })) || []

                await StrategiesModel.updateMany(
                    { "children.scannerID": { $in: listIDScanner } },
                    { $pull: { children: { scannerID: { $in: listIDScanner } } } }
                );

                handleResultDelete.length > 0 && GroupCoinController.handleSendDataRealtime({
                    type: "cancel-all-config-by-scanner",
                    data: handleResultDelete
                })

                scannerFilter?.length > 0 && GroupCoinController.handleSendDataRealtime({
                    type: "scanner-update",
                    data: scannerFilter
                })
                res.customResponse(200, "Update Successful", "");
            }
            else {
                res.customResponse(400, "Update failed", "");
            }

        } catch (error) {
            console.log(error);

            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Update Error" });
        }
    },

    delete: async (req, res) => {
        try {
            const { id, forType } = req.body

            const result = await groupCoinModel.deleteOne({ _id: id })

            if (result.deletedCount !== 0) {
                const groupCoinCondition = forType === "OnlyPairs" ? "groupCoinOnlyPairsID" : "groupCoinBlacklistID"

                const getAllScannerIsDeleted = await ScannerByBitV3Model.find({
                    [groupCoinCondition]: id
                }).populate(['botID', "groupCoinOnlyPairsID", 'groupCoinBlacklistID'])

                await ScannerByBitV3Model.updateMany({
                    [groupCoinCondition]: id
                }, {
                    [groupCoinCondition]: null
                })

                const listIDScanner = getAllScannerIsDeleted.map(item=>item._id)
                const resultFilterSpot = await StrategiesModel.aggregate([
                    {
                        $match: {
                            "children.scannerID": { $in: listIDScanner }
                        }
                    },
                    {
                        $project: {
                            label: 1,
                            value: 1,
                            volume24h: 1,
                            children: {
                                $filter: {
                                    input: "$children",
                                    as: "child",
                                    cond: {
                                        $in: ["$$child.scannerID", listIDScanner]
                                    }
                                }
                            }
                        }
                    }
                ]);

                const resultGetSpot = await StrategiesModel.populate(resultFilterSpot, {
                    path: 'children.botID',
                }) || []


                const handleResultDelete = resultGetSpot.flatMap((data) => data.children.map(child => {
                    child.symbol = data.value
                    child.value = `${data._id}-${child._id}`
                    return child
                })) || []

                await StrategiesModel.updateMany(
                    { "children.scannerID": { $in: listIDScanner } },
                    { $pull: { children: { scannerID: { $in: listIDScanner } } } }
                );

                handleResultDelete.length > 0 && GroupCoinController.handleSendDataRealtime({
                    type: "cancel-all-config-by-scanner",
                    data: handleResultDelete
                })

                getAllScannerIsDeleted?.length > 0 && GroupCoinController.handleSendDataRealtime({
                    type: "scanner-update",
                    data: getAllScannerIsDeleted
                })

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

module.exports = GroupCoinController 